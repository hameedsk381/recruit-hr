import { autoRoutedChatCompletion } from "./llmRouter";
import {
    RecruiterAssessmentInput,
    RecruiterAssessmentResult,
    RecruiterAssessmentOutput,
    WeightedSkill,
    SkillEvidence,
} from "../types/recruiterCopilot";
import { getLLMCache, setLLMCache } from "../utils/llmCache";
import { createHash } from "crypto";
import { executeEnhancedNLQuery } from "./enhancedMongoService";
import { KpiService } from "./kpiService";

// System prompt defining the AI Recruiter Copilot behavior
const RECRUITER_COPILOT_SYSTEM_PROMPT = `You are an AI Recruiter Copilot.

Your job is NOT to score or judge candidates autonomously.
Your job is to help a human recruiter make faster, defensible hiring decisions.

You must prioritize:
- Clarity over cleverness
- Evidence over claims
- Explanation over scoring

If a conclusion cannot be traced to extracted data, you must explicitly say "Insufficient evidence."

DECISION RULES (NON-NEGOTIABLE):
- If a skill appears only in keywords with no supporting context, mark it as "claimed".
- If experience duration is unclear, state uncertainty explicitly.
- If mandatory skills are missing, highlight them in gaps_and_risks even if overall fit is high.
- Do not inflate confidence to improve match perception.

LANGUAGE RULES:
- Use concise, professional language.
- No adjectives without evidence.
- No percentages or numeric scores.
- No emojis.
- No marketing tone.
- Never use vague praise like "strong candidate" or "excellent fit" without specific evidence.

You must never:
- Hide reasoning behind a single score
- Use vague praise
- Infer personality, culture, or attitude
- Use emotional or subjective language

Your output must allow a recruiter to confidently answer:
"Why should I interview this person, and what should I be careful about?"

If you cannot support that with evidence, do not fabricate confidence.`;

// User prompt template for generating assessments
function buildUserPrompt(input: RecruiterAssessmentInput): string {
    const { job_description, candidate_profile, matching_signals } = input;

    // Format core skills with weights
    const formattedSkills = job_description.core_skills
        .map((s: WeightedSkill) => `- ${s.skill} (${s.weight}${s.mandatory ? ", MANDATORY" : ""})`)
        .join("\n");

    // Format skill evidence
    const formattedEvidence = candidate_profile.skill_evidence
        .map((e: SkillEvidence) => {
            let evidenceStr = `- ${e.skill}: ${e.evidence_type}`;
            if (e.context) evidenceStr += ` | Context: ${e.context}`;
            if (e.project) evidenceStr += ` | Project: ${e.project}`;
            if (e.outcome) evidenceStr += ` | Outcome: ${e.outcome}`;
            return evidenceStr;
        })
        .join("\n");

    // Format red flags and gaps
    const redFlags = candidate_profile.red_flags?.length
        ? candidate_profile.red_flags.map((r: string) => `- ${r}`).join("\n")
        : "None identified";

    const gaps = candidate_profile.gaps?.length
        ? candidate_profile.gaps.map((g: string) => `- ${g}`).join("\n")
        : "None identified";

    return `
## JOB DESCRIPTION

Title: ${job_description.title}
${job_description.company ? `Company: ${job_description.company}` : ""}
${job_description.role_context ? `Context: ${job_description.role_context}` : ""}

### Core Skills (with weights):
${formattedSkills}

### Experience Expectations:
${job_description.experience_expectations.min_years ? `Minimum Years: ${job_description.experience_expectations.min_years}` : "Not specified"}
${job_description.experience_expectations.max_years ? `Maximum Years: ${job_description.experience_expectations.max_years}` : ""}
${job_description.experience_expectations.domain_specific ? `Domain-Specific: ${job_description.experience_expectations.domain_specific}` : ""}
${job_description.experience_expectations.notes ? `Notes: ${job_description.experience_expectations.notes}` : ""}

---

## CANDIDATE PROFILE

Name: ${candidate_profile.name}
${candidate_profile.email ? `Email: ${candidate_profile.email}` : ""}

### Extracted Skills:
${candidate_profile.extracted_skills.map((s: string) => `- ${s}`).join("\n")}

### Skill Evidence:
${formattedEvidence || "No structured evidence provided"}

### Experience Estimate:
${candidate_profile.experience_estimate.total_years ? `Total Years: ${candidate_profile.experience_estimate.total_years}` : "Unknown"}
${candidate_profile.experience_estimate.relevant_years ? `Relevant Years: ${candidate_profile.experience_estimate.relevant_years}` : "Unknown"}
${candidate_profile.experience_estimate.uncertainty ? `Uncertainty: ${candidate_profile.experience_estimate.uncertainty}` : ""}

### Recent Role:
${candidate_profile.recent_role ? `${candidate_profile.recent_role.title} at ${candidate_profile.recent_role.company} (${candidate_profile.recent_role.duration})` : "Not specified"}

### Education:
${candidate_profile.education?.join(", ") || "Not specified"}

### Certifications:
${candidate_profile.certifications?.join(", ") || "None"}

### Red Flags:
${redFlags}

### Gaps:
${gaps}

---

## MATCHING SIGNALS

Experience Alignment: ${matching_signals.experience_alignment}
Role Relevance: ${matching_signals.role_relevance}
Mandatory Skills Met: ${matching_signals.mandatory_skills_met ? "Yes" : "No"}
${matching_signals.missing_mandatory_skills?.length ? `Missing Mandatory Skills: ${matching_signals.missing_mandatory_skills.join(", ")}` : ""}

---

## TASK

Analyze the above information and produce a recruiter-readable assessment.
Focus on helping the recruiter understand:
1. Why they should or should not interview this candidate
2. What specific strengths are backed by evidence
3. What risks or gaps need attention
4. What to probe during the interview

Return your response as a single JSON object with this exact structure:

{
  "one_line_summary": "A single sentence summarizing the candidate's fit for this specific role",
  "fit_assessment": {
    "overall_fit": "high | medium | low",
    "reasoning": "Clear explanation of why this fit level was determined, citing specific evidence"
  },
  "strengths": [
    {
      "skill": "The skill or competency",
      "evidence_level": "production | demonstrated | claimed",
      "evidence": "Specific evidence from the profile supporting this strength"
    }
  ],
  "gaps_and_risks": [
    {
      "area": "The area of concern",
      "risk_level": "low | medium | high",
      "explanation": "Why this is a risk and what evidence (or lack thereof) supports it"
    }
  ],
  "skill_match_breakdown": [
    {
      "required_skill": "Skill from job requirements",
      "candidate_coverage": "strong | partial | none",
      "notes": "Explanation of how the candidate covers or doesn't cover this skill"
    }
  ],
  "interview_focus_areas": [
    {
      "topic": "What to probe",
      "why": "Why this needs investigation",
      "sample_probe_question": "A specific question the recruiter could ask"
    }
  ],
  "recruiter_notes": {
    "override_suggestions": "Situations where a recruiter might reasonably override the assessment",
    "confidence_level": "high | medium | low - based on quality of available evidence"
  }
}

If there is insufficient evidence to make a defensible assessment, return:
{
  "error": "Insufficient structured evidence to support a defensible hiring decision."
}

Respond ONLY with the JSON object. No additional text.`;
}

// Validate the output structure
function validateOutput(output: any): output is RecruiterAssessmentOutput {
    if (output.error) return false;

    const requiredFields = [
        "one_line_summary",
        "fit_assessment",
        "strengths",
        "gaps_and_risks",
        "skill_match_breakdown",
        "interview_focus_areas",
        "recruiter_notes",
    ];

    for (const field of requiredFields) {
        if (!(field in output)) {
            console.error(`[RecruiterCopilot] Missing required field: ${field}`);
            return false;
        }
    }

    // Validate fit_assessment structure
    if (!output.fit_assessment.overall_fit || !output.fit_assessment.reasoning) {
        console.error("[RecruiterCopilot] Invalid fit_assessment structure");
        return false;
    }

    // Validate overall_fit value
    if (!["high", "medium", "low"].includes(output.fit_assessment.overall_fit)) {
        console.error("[RecruiterCopilot] Invalid overall_fit value");
        return false;
    }

    return true;
}

// Extract JSON from potentially messy AI response
function extractJsonFromResponse(response: string): any {
    // First try direct parse
    try {
        return JSON.parse(response);
    } catch (e) {
        // Clean markdown code blocks
        let clean = response.trim();
        if (clean.startsWith("```json")) clean = clean.slice(7);
        if (clean.startsWith("```")) clean = clean.slice(3);
        if (clean.endsWith("```")) clean = clean.slice(0, -3);
        clean = clean.trim();

        // Find JSON object boundaries
        const start = clean.indexOf("{");
        const end = clean.lastIndexOf("}");

        if (start !== -1 && end > start) {
            try {
                return JSON.parse(clean.slice(start, end + 1));
            } catch (e2) {
                throw new Error("Failed to parse JSON from response");
            }
        }

        throw new Error("No valid JSON found in response");
    }
}

// Main assessment function
export async function generateRecruiterAssessment(
    input: RecruiterAssessmentInput
): Promise<RecruiterAssessmentResult> {
    console.log("[RecruiterCopilot] Starting assessment generation");

    // Validate input has minimum required data
    if (!input.job_description?.core_skills?.length) {
        return { error: "Job description must include core skills with weights." };
    }

    if (!input.candidate_profile?.extracted_skills?.length) {
        return { error: "Candidate profile must include extracted skills." };
    }

    // Generate cache key
    const cacheKey = `recruiter_assessment_${createHash("md5")
        .update(JSON.stringify(input))
        .digest("hex")}`;

    // Check cache
    const cached = await getLLMCache(cacheKey);
    if (cached) {
        console.log("[RecruiterCopilot] Returning cached assessment");
        return cached as RecruiterAssessmentResult;
    }

    try {
        const userPrompt = buildUserPrompt(input);

        console.log("[RecruiterCopilot] Sending request to LLM Router");
        const response = await autoRoutedChatCompletion(
            RECRUITER_COPILOT_SYSTEM_PROMPT,
            userPrompt,
            {
                temperature: 0.3,
                max_tokens: 2048,
                containsPII: true // Strong assumption of candidate data
            }
        );

        console.log("[RecruiterCopilot] Received response, parsing...");

        const parsed = extractJsonFromResponse(response);

        // Check for error response
        if (parsed.error) {
            console.log("[RecruiterCopilot] LLM returned insufficient evidence error");
            return { error: parsed.error };
        }

        // Validate structure
        if (!validateOutput(parsed)) {
            console.error("[RecruiterCopilot] Invalid output structure, attempting repair");

            // Attempt to construct a valid response with available data
            const repairedOutput = repairOutput(parsed, input);
            if (repairedOutput) {
                await setLLMCache(cacheKey, repairedOutput, 1000 * 60 * 60 * 24);
                return repairedOutput;
            }

            return { error: "Failed to generate valid assessment structure." };
        }

        // Cache and return
        await setLLMCache(cacheKey, parsed, 1000 * 60 * 60 * 24);
        console.log("[RecruiterCopilot] Assessment generated successfully");

        return parsed as RecruiterAssessmentOutput;
    } catch (error) {
        console.error("[RecruiterCopilot] Error generating assessment:", error);
        return {
            error: `Assessment generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
}

// Attempt to repair a partially valid output
function repairOutput(
    partial: any,
    input: RecruiterAssessmentInput
): RecruiterAssessmentOutput | null {
    try {
        const repaired: RecruiterAssessmentOutput = {
            one_line_summary:
                partial.one_line_summary ||
                `Candidate for ${input.job_description.title} position requires further evaluation.`,
            fit_assessment: {
                overall_fit: partial.fit_assessment?.overall_fit || "medium",
                reasoning:
                    partial.fit_assessment?.reasoning ||
                    "Insufficient evidence for definitive fit assessment.",
            },
            strengths: Array.isArray(partial.strengths) ? partial.strengths : [],
            gaps_and_risks: Array.isArray(partial.gaps_and_risks)
                ? partial.gaps_and_risks
                : [],
            skill_match_breakdown: Array.isArray(partial.skill_match_breakdown)
                ? partial.skill_match_breakdown
                : generateSkillBreakdown(input),
            interview_focus_areas: Array.isArray(partial.interview_focus_areas)
                ? partial.interview_focus_areas
                : [],
            recruiter_notes: {
                override_suggestions:
                    partial.recruiter_notes?.override_suggestions ||
                    "Review raw profile data for context not captured in this assessment.",
                confidence_level: partial.recruiter_notes?.confidence_level || "low",
            },
        };

        return repaired;
    } catch (e) {
        console.error("[RecruiterCopilot] Failed to repair output:", e);
        return null;
    }
}

// Generate skill breakdown from input when LLM fails
function generateSkillBreakdown(
    input: RecruiterAssessmentInput
): Array<{ required_skill: string; candidate_coverage: string; notes: string }> {
    const candidateSkillsLower = input.candidate_profile.extracted_skills.map((s: string) =>
        s.toLowerCase()
    );

    return input.job_description.core_skills.map((skill) => {
        const hasSkill = candidateSkillsLower.some(
            (cs: string) =>
                cs.includes(skill.skill.toLowerCase()) ||
                skill.skill.toLowerCase().includes(cs)
        );

        const hasEvidence = input.candidate_profile.skill_evidence.some(
            (e) => e.skill.toLowerCase() === skill.skill.toLowerCase()
        );

        let coverage: "strong" | "partial" | "none";
        let notes: string;

        if (hasSkill && hasEvidence) {
            coverage = "strong";
            notes = "Skill claimed with supporting evidence.";
        } else if (hasSkill) {
            coverage = "partial";
            notes = "Skill listed but lacks detailed evidence.";
        } else {
            coverage = "none";
            notes = skill.mandatory
                ? "MANDATORY skill not found in profile."
                : "Skill not found in profile.";
        }

        return {
            required_skill: skill.skill,
            candidate_coverage: coverage,
            notes,
        };
    });
}

// Helper to convert legacy resume/JD data to new input format
export function convertLegacyToRecruiterInput(
    jobDescription: any,
    resume: any,
    matchingResult?: any
): RecruiterAssessmentInput {
    // Convert job description
    const coreSkills: Array<{
        skill: string;
        weight: "critical" | "important" | "nice_to_have";
        mandatory: boolean;
    }> = (jobDescription.skills || []).map((skill: string, index: number) => ({
        skill,
        weight: index < 3 ? "critical" : index < 6 ? "important" : "nice_to_have",
        mandatory: index < 3,
    }));

    // Extract skill evidence from resume experience
    const skillEvidence: SkillEvidence[] = [];
    if (Array.isArray(resume.experience)) {
        resume.experience.forEach((exp: any) => {
            if (typeof exp === "object" && exp.skills) {
                exp.skills.forEach((skill: string) => {
                    skillEvidence.push({
                        skill,
                        evidence_type: "demonstrated",
                        context: exp.role || exp.title,
                        project: exp.company,
                        duration: exp.duration,
                    });
                });
            }
        });
    }

    // Add claimed skills (those in skills list but not in evidence)
    const evidencedSkills = new Set(skillEvidence.map((e) => e.skill.toLowerCase()));
    (resume.skills || []).forEach((skill: string) => {
        if (!evidencedSkills.has(skill.toLowerCase())) {
            skillEvidence.push({
                skill,
                evidence_type: "claimed",
            });
        }
    });

    // Determine matching signals
    const mandatorySkills = coreSkills.filter((s) => s.mandatory).map((s) => s.skill);
    const candidateSkillsLower = (resume.skills || []).map((s: string) => s.toLowerCase());
    const missingMandatory = mandatorySkills.filter(
        (s) => !candidateSkillsLower.some((cs: string) => cs.includes(s.toLowerCase()))
    );

    let experienceAlignment: "exceeds" | "meets" | "below" | "unclear" = "unclear";
    if (
        jobDescription.requiredIndustrialExperienceYears &&
        resume.totalIndustrialExperienceYears
    ) {
        if (
            resume.totalIndustrialExperienceYears >
            jobDescription.requiredIndustrialExperienceYears
        ) {
            experienceAlignment = "exceeds";
        } else if (
            resume.totalIndustrialExperienceYears >=
            jobDescription.requiredIndustrialExperienceYears
        ) {
            experienceAlignment = "meets";
        } else {
            experienceAlignment = "below";
        }
    }

    return {
        job_description: {
            title: jobDescription.title || "Not specified",
            company: jobDescription.company,
            core_skills: coreSkills,
            experience_expectations: {
                min_years: jobDescription.requiredIndustrialExperienceYears,
                domain_specific: jobDescription.requiredDomainExperienceYears
                    ? `${jobDescription.requiredDomainExperienceYears} years domain experience`
                    : undefined,
            },
            role_context: jobDescription.responsibilities?.slice(0, 3).join("; "),
        },
        candidate_profile: {
            name: resume.name || "Unknown",
            email: resume.email,
            phone: resume.phone,
            extracted_skills: resume.skills || [],
            skill_evidence: skillEvidence,
            experience_estimate: {
                total_years: resume.totalIndustrialExperienceYears,
                relevant_years: resume.totalDomainExperienceYears,
                uncertainty:
                    resume.totalIndustrialExperienceYears === undefined
                        ? "Experience duration could not be determined from profile"
                        : undefined,
            },
            education: resume.education,
            certifications: resume.certifications,
            red_flags: [],
            gaps: missingMandatory.length
                ? [`Missing mandatory skills: ${missingMandatory.join(", ")}`]
                : [],
            recent_role:
                Array.isArray(resume.experience) && resume.experience[0]
                    ? {
                        title: resume.experience[0].role || resume.experience[0].title || "Unknown",
                        company: resume.experience[0].company || "Unknown",
                        duration: resume.experience[0].duration || "Unknown",
                    }
                    : undefined,
        },
        matching_signals: {
            experience_alignment: experienceAlignment,
            role_relevance:
                matchingResult?.matchScore > 70
                    ? "high"
                    : matchingResult?.matchScore > 40
                        ? "medium"
                        : "low",
            mandatory_skills_met: missingMandatory.length === 0,
            missing_mandatory_skills: missingMandatory,
        },
    };
}

/**
 * Unified Chat Interface for Recruiter Copilot
 */
export async function chatWithCopilot(params: {
    query: string;
    tenantId: string;
    candidateId?: string;
    context?: any;
}): Promise<{ response: string; data?: any }> {
    const { query, tenantId, candidateId, context } = params;

    // 1. Intent Detection
    const intentPrompt = `Analyze the user query and determine if it is:
1. ANALYTICS: Qualitative or quantitative questions about recruitment data, funnel, or performance.
2. CANDIDATE: Specific questions about a single candidate's profile or assessment.
3. GENERAL: General recruiting advice or miscellaneous.

Query: "${query}"

Respond with ONLY the category name.`;

    const intent = await autoRoutedChatCompletion(
        "You are a query classifier.",
        intentPrompt,
        { temperature: 0, max_tokens: 100 }
    );
    const category = intent.toUpperCase().trim();

    if (category.includes("ANALYTICS")) {
        // Handle Analytics via NL-to-Mongo
        const result = await executeEnhancedNLQuery(query, {
            tenantId,
            readOnly: true,
            maxResults: 5
        });

        if (result.success && result.results) {
            const answerPrompt = `Based on these database results, answer the user's question: "${query}"
            
Data: ${JSON.stringify(result.results, null, 2)}
Explanation: ${result.query.explanation}

Provide a concise, professional answer. Use markdown tables if comparing multiple data points.`;
            const answer = await autoRoutedChatCompletion(
                "You are a helpful recruitment data analyst.",
                answerPrompt,
                { temperature: 0.3, max_tokens: 1024 }
            );
            return { response: answer, data: result.results };
        }
    }

    if (category.includes("CANDIDATE") && context) {
        // Handle Candidate specific Chat
        const candidateContext = context.candidate || {};
        const jobContext = context.job || {};

        const candidatePrompt = `You are discussing candidate ${candidateContext.profile?.name || 'this person'} for the role ${jobContext.title || 'the position'}.
        
Candidate Assessment Summary: ${JSON.stringify(candidateContext.assessment || {}, null, 2)}
Job Requirements: ${JSON.stringify(jobContext.core_skills || [], null, 2)}

User Question: "${query}"

Provide a professional, evidence-based answer. If the information isn't in the context, say "I don't have enough information on that specific detail."`;

        const answer = await autoRoutedChatCompletion(
            RECRUITER_COPILOT_SYSTEM_PROMPT,
            candidatePrompt,
            { temperature: 0.5, max_tokens: 1024, containsPII: true }
        );
        return { response: answer };
    }

    // Default Fallback / General
    const generalPrompt = `You are a helpful AI Recruiter Copilot. Answer the user question: "${query}"
    
Provide actionable, modern recruiting advice where applicable. Keep it concise.`;

    const answer = await autoRoutedChatCompletion(
        RECRUITER_COPILOT_SYSTEM_PROMPT,
        generalPrompt,
        { temperature: 0.7, max_tokens: 1024 }
    );
    return { response: answer };
}
