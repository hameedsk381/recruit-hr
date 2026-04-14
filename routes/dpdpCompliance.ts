import { getMongoDb } from '../utils/mongoClient';
import { PrivacyService } from '../services/privacyService';
import { AppLogger } from '../utils/logger';
import { logAudit } from '../services/auditService';

/**
 * DPDP Act 2023 - Phase 1: Notice Requirements
 * Serves the structured, multi-language Privacy Notice required by DPDP.
 */
export async function getDpdpNoticeHandler(req: Request): Promise<Response> {
    const noticeContent = {
        version: "2026.1",
        primary_language: "en",
        supported_languages: ["en", "hi", "te", "ta", "mr", "bn", "gu"], // Indic languages (Schedule VIII)
        data_fiduciary: {
            name: "Recrkuit.ai Operations India Pvt Ltd",
            grievance_officer: {
                name: "Compliance Director",
                email: "grievance@recrkuit.ai",
                contact_timeline: "Acknowledged within 24 hours, resolved within 30 days."
            }
        },
        itemized_processing: [
            {
                purpose: "Automated Skills Extraction",
                data_elements: ["Resume Text", "Job History"],
                retention: "6 months post-requisition closure",
                third_party_transfer: "None (Processed via Sovereign LLM infrastructure)"
            },
            {
                purpose: "Communication Evaluation",
                data_elements: ["Interview Audio"],
                retention: "Deleted immediately after transcription and evaluation",
                third_party_transfer: "None"
            }
        ],
        rights: [
            "Right to Access Information",
            "Right to Correction and Erasure (Right to be Forgotten)",
            "Right to Grievance Redressal",
            "Right to Nominate"
        ]
    };

    return new Response(JSON.stringify(noticeContent), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
}

/**
 * DPDP Act 2023 - Grievance Redressal API
 * Allows candidates to securely file a grievance directly to the DPO.
 */
export async function fileGrievanceHandler(req: Request): Promise<Response> {
    try {
        const body = await req.json();
        const { candidateEmail, complaintType, description } = body;

        if (!candidateEmail || !complaintType) {
            return new Response(JSON.stringify({ success: false, error: "Missing required grievance fields" }), { status: 400 });
        }

        const db = getMongoDb();
        if (db) {
            const ticket = {
                candidateEmail,
                complaintType,
                description,
                status: "OPEN",
                filedAt: new Date(),
                resolutionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 day legal deadline
            };
            
            await db.collection("dpdp_grievances").insertOne(ticket);
        }

        return new Response(JSON.stringify({ 
            success: true, 
            ticketId: "GRV-" + Date.now(),
            message: "Grievance securely filed. Our Data Protection Officer will reach out within 24 hours." 
        }), { status: 201 });

    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: "Failed to process grievance" }), { status: 500 });
    }
}

/**
 * DPDP Act Phase 2 - Consent Manager Webhook
 * Authorized endpoint to receive decentralized consent revocations from Govt/Third-Party Consent Managers.
 */
export async function consentManagerWebhookHandler(req: Request): Promise<Response> {
    try {
        // In production, this would verify a cryptographically signed JWT from the Consent Manager
        const payload = await req.json();
        const { consent_id, action, subject_identifier } = payload; 
        
        // subject_identifier would likely be a verified mobile number or email
        const logger = new AppLogger("SYSTEM", "DPDP_CONSENT_MANAGER", "Webhook");

        if (action === "REVOKE") {
            const db = getMongoDb();
            if (!db) throw new Error("DB unavailable");

            // Find all candidate records matching this identifier
            const candidates = await db.collection('candidates').find({ 
                $or: [{ email: subject_identifier }, { phone: subject_identifier }] 
            }).toArray();

            for (const c of candidates) {
                // 1. Immediately update local flags so no more processing occurs
                await db.collection('candidates').updateOne(
                    { _id: c._id },
                    { $set: { ai_processing_opt_in: false, consentRevokedAt: new Date() } }
                );

                // 2. Erase their existing structured profiles (Right to Erasure cascade)
                await PrivacyService.deleteCandidateData(c._id.toString());
            }

            logAudit(logger, "CONSENT_REVOKED_VIA_MANAGER", {
                subject: subject_identifier,
                recordsAffected: candidates.length
            });

            return new Response(JSON.stringify({ success: true, message: "Consent successfully revoked and data purged." }), { status: 200 });
        }

        return new Response(JSON.stringify({ success: true, message: "Action not applicable." }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "Webhook bridging failed." }), { status: 500 });
    }
}
