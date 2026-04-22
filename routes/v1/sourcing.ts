import { getMongoDb } from "../../utils/mongoClient";
import { AuthContext } from "../../middleware/authMiddleware";
import { jdExtractTextHandler } from "../jdExtractText";
import { OutreachService } from "../../services/outreachService";

/**
 * Handles 1-click ingestion from the Chrome Extension.
 * Accepts structured data or a raw HTML snippet from LinkedIn/GitHub.
 */
export async function ingestPassiveCandidateHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const body = await req.json();
        const { source, externalUrl, profileData, rawHtml } = body;

        if (!externalUrl && !profileData) {
            return Response.json({ success: false, error: "Missing candidate data" }, { status: 400 });
        }

        const db = getMongoDb();
        
        // 1. Process & Store in Talent Pool
        const candidateDoc = {
            tenantId: context.tenantId,
            userId: context.userId,
            source: source || 'chrome_extension',
            externalUrl,
            profile: profileData || { name: 'New Prospect', email: 'pending@reckruit.ai' },
            status: 'sourced',
            ingestedAt: new Date(),
            rawHtml: rawHtml ? 'preserved' : undefined // We don't store huge HTML blocks in the main doc
        };

        const result = await db.collection('talent_pool').insertOne(candidateDoc);

        // 2. Optional: Trigger AI enrichment (In a real app, this would be a background job)
        // For the MVP, we just return success
        
        return Response.json({ 
            success: true, 
            candidateId: result.insertedId,
            message: "Candidate successfully ingested into Talent Pool"
        });

    } catch (error) {
        console.error('[Sourcing] Ingestion error:', error);
        return Response.json({ success: false, error: "Ingestion failed" }, { status: 500 });
    }
}

export async function listPassiveCandidatesHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const db = getMongoDb();
        const prospects = await db.collection('talent_pool')
            .find({ tenantId: context.tenantId })
            .sort({ ingestedAt: -1 })
            .toArray();

        return Response.json({ success: true, prospects });
    } catch (error) {
        return Response.json({ success: false, error: "Failed to fetch prospects" }, { status: 500 });
    }
}
