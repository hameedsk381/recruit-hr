import { RecruiterAssessmentOutput } from "../types/recruiterCopilot";
import { GreenhouseConnector } from "./ats/greenhouse";
import { LeverConnector } from "./ats/lever";
import { WorkdayConnector } from "./ats/workday";
import { BambooHRConnector } from "./ats/bamboohr";
import { ATSConnector } from "./ats/types";

export { GreenhouseConnector, LeverConnector, WorkdayConnector, BambooHRConnector };
export type { ATSConnector };

/**
 * Factory to get an ATS connector for a tenant's configured platform.
 */
export function getATSConnector(platform: string, credentials: Record<string, string>): ATSConnector {
  switch (platform.toLowerCase()) {
    case 'greenhouse':
      return new GreenhouseConnector(credentials.apiKey);
    case 'lever':
      return new LeverConnector(credentials.apiKey);
    case 'workday':
      return new WorkdayConnector(credentials.tenantUrl, credentials.accessToken);
    case 'bamboohr':
      return new BambooHRConnector(credentials.subdomain, credentials.apiKey);
    default:
      throw new Error(`Unsupported ATS platform: ${platform}`);
  }
}

/**
 * Universal ATS Integration Service
 * 
 * Specifically built for the Indian SaaS ecosystem (Zoho, Darwinbox).
 * Handles the "Normalization Nightmare" by translating our rich AI signals
 * into the legacy field structures of major Indian ATS platforms.
 */

export interface ATSTranslationResult {
    provider: 'ZOHO' | 'DARWINBOX';
    payload: any;
    endpoint_suggested: string;
}

export class ATSIntegrationService {

    /**
     * Maps our rich "Explainable AI" assessment into Zoho Recruit's standard 'Notes' format.
     * Zoho often requires multi-line strings for interview feedback.
     */
    static mapToZohoRecruit(
        assessment: RecruiterAssessmentOutput, 
        candidateZohoId: string
    ): ATSTranslationResult {
        
        // Construct a structured text block for Zoho's Notes/Comments section
        const structuredNote = `
--- RECKRUIT.AI ASSESSMENT SUMMARY ---
OVERALL FIT: ${assessment.fit_assessment.overall_fit.toUpperCase()}
SUMMARY: ${assessment.one_line_summary}

STRENGTHS:
${assessment.strengths.map(s => `- ${s.skill}: ${s.evidence} (${s.evidence_level})`).join('\n')}

GAPS & RISKS:
${assessment.gaps_and_risks.map(g => `- ${g.area}: ${g.explanation}`).join('\n')}

INTERVIEW FOCUS:
${assessment.interview_focus_areas.map(i => `- ${i.topic}: ${i.sample_probe_question}`).join('\n')}

CONFIDENCE: ${assessment.recruiter_notes.confidence_level}
---------------------------------------
        `.trim();

        return {
            provider: 'ZOHO',
            payload: {
                "data": [
                    {
                        "Parent_Id": candidateZohoId,
                        "Note_Content": structuredNote,
                        "Note_Title": "AI Evidence Assessment"
                    }
                ]
            },
            endpoint_suggested: "/crm/v2/Notes"
        };
    }

    /**
     * Maps assessment results to Darwinbox's recruitment module format.
     * Darwinbox often prefers object-based evaluation triggers.
     */
    static mapToDarwinbox(
        assessment: RecruiterAssessmentOutput,
        candidateDarwinId: string
    ): ATSTranslationResult {
        
        // Darwinbox often uses a 'Remark' or 'Feedback' field in their scorecards
        return {
            provider: 'DARWINBOX',
            payload: {
                "candidate_id": candidateDarwinId,
                "feedback_type": "AI_SCREENING",
                "hiring_manager_rating": assessment.fit_assessment.overall_fit === 'high' ? 5 : assessment.fit_assessment.overall_fit === 'medium' ? 3 : 1,
                "comments": assessment.one_line_summary,
                "detailed_analysis": {
                    "strengths": assessment.strengths,
                    "risks": assessment.gaps_and_risks
                }
            },
            endpoint_suggested: "/recruitment/v1/updateFeedback"
        };
    }
}
