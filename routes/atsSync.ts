import { ATSIntegrationService } from "../services/atsIntegrationService";
import { getMongoDb } from "../utils/mongoClient";
import { ObjectId } from "mongodb";

export async function atsSyncHandler(req: Request, context: any): Promise<Response> {
    try {
        const body = await req.json();
        const { batchResultId, provider, externalCandidateId } = body;

        if (!batchResultId || !provider || !externalCandidateId) {
            return new Response(JSON.stringify({ success: false, error: "Missing required sync fields" }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        // 1. Fetch the AI result for this specific candidate (Enforce tenant isolation)
        const assessmentResult = await db.collection('assessment_results').findOne({ 
            _id: new ObjectId(batchResultId),
            tenantId: context.tenantId 
        });

        if (!assessmentResult || !assessmentResult.matchResult) {
            return new Response(JSON.stringify({ success: false, error: "Assessment result not found or unauthorized" }), { status: 404 });
        }

        const assessment = assessmentResult.matchResult;

        // 2. Translate based on provider
        let translation;
        if (provider.toUpperCase() === 'ZOHO') {
            translation = ATSIntegrationService.mapToZohoRecruit(assessment, externalCandidateId);
        } else if (provider.toUpperCase() === 'DARWINBOX') {
            translation = ATSIntegrationService.mapToDarwinbox(assessment, externalCandidateId);
        } else {
            return new Response(JSON.stringify({ success: false, error: "Unsupported ATS Provider" }), { status: 400 });
        }

        // 3. Logic to actually PUSH to the 3rd party API
        const atsBaseUrl = process.env.ATS_WEBHOOK_URL || 'https://api.mock-ats.com/v1';
        let syncSuccess = false;
        let responsePayload: any = null;

        try {
            console.log(`[ATSSync] Syncing to ${provider} via endpoint: ${atsBaseUrl}${translation.endpoint_suggested}`);
            const atsResponse = await fetch(`${atsBaseUrl}${translation.endpoint_suggested}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.ATS_API_KEY || 'mock_key'}`
                },
                body: JSON.stringify(translation.payload)
            });
            syncSuccess = atsResponse.ok;
            try { 
                responsePayload = await atsResponse.json(); 
            } catch(e) {}
        } catch (error) {
            console.error(`[ATSSync] Failed to fetch external ATS webhook.`, error);
        }

        // 4. Log the sync attempt for auditing and retry queues
        await db.collection('ats_sync_logs').insertOne({
            batchResultId: new ObjectId(batchResultId),
            tenantId: context.tenantId,
            provider,
            externalCandidateId,
            payloadSent: translation.payload,
            success: syncSuccess,
            response: responsePayload,
            syncedAt: new Date().toISOString()
        });

        if (!syncSuccess && process.env.ATS_WEBHOOK_URL) {
            // If we actually tried a real webhook and it failed, throw a 502 Bad Gateway
            return new Response(JSON.stringify({ success: false, error: "ATS Sync rejected by provider" }), { status: 502 });
        }

        return new Response(JSON.stringify({
            success: true,
            provider: provider,
            synced_payload: translation.payload,
            message: "Assessment successfully formatted and routed for ATS ingestion."
        }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "ATS Sync failed" }), { status: 500 });
    }
}
