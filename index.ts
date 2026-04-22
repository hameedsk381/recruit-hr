import { serve } from "bun";
import { config } from "dotenv";
import { resumeExtractHandler } from "./routes/resumeExtract";
import { jobMatchHandler, cancelBatchHandler } from "./routes/jobMatch";
import { answerEvaluateHandler } from "./routes/answerEvaluate";
import { multipleJobMatchHandler } from "./routes/multipleJobMatch";
import { mongoNLQueryHandler, mongoDatabaseInfoHandler } from "./routes/mongoNLQuery";
import { jobStatusHandler } from "./routes/jobStatus";
import { analyticsHandler } from "./routes/analytics";
import { copilotChatHandler } from "./routes/copilotChat";
import { recruiterAssessHandler, recruiterBatchAssessHandler } from "./routes/recruiterAssess";
import { draftOutreachHandler } from "./routes/outreachDraft";
import { InterviewService } from "./services/interviewService";
import {
  listInterviewsHandler,
  scheduleInterviewHandler,
  suggestTimesHandler,
  cancelInterviewHandler,
  rescheduleInterviewHandler
} from "./routes/interviews";
import { getCalendarStatusHandler, connectCalendarHandler } from "./routes/calendar";
import { initializeRedisClient } from "./utils/redisClient";
import { initializeMongoClient, getMongoDb } from "./utils/mongoClient";
import { validateRequestAuth } from "./middleware/authMiddleware";
import { loginHandler, registerHandler } from "./routes/auth";
import {
  submitScorecardHandler,
  getScorecardHandler,
  getCandidateScorecardsHandler,
  synthesizeScorecardsHandler
} from "./routes/scorecards";
import { jdExtractHandler } from "./routes/jdExtract";
import { jdExtractTextHandler } from "./routes/jdExtractText";
import { jdExtractorNewHandler } from "./routes/jdExtractorNew";
import { jdExtractorStreamingHandler } from "./routes/jdExtractorStreaming";
import { jdValidateHandler } from "./routes/jdValidate";
import { mcqGenerateHandler } from "./routes/mcqGenerate";
import { voiceInterviewHandler } from "./routes/voiceInterview";
import { audioEvaluateHandler } from "./routes/audioEvaluate";
import { deleteCandidateGdprHandler as privacyDeleteHandler, runRetentionPolicyHandler } from "./routes/privacy";
import { PrivacyService } from "./services/privacyService";
import { getDpdpNoticeHandler, fileGrievanceHandler, consentManagerWebhookHandler } from "./routes/dpdpCompliance";
import { bulkProcessUploadHandler, getBatchStatusHandler } from "./routes/batchProcessing";
import { getRoiAnalyticsHandler } from "./routes/roiAnalytics";
import { atsSyncHandler } from "./routes/atsSync";
import {
  getRecruiterHistoryHandler,
  getActiveStateHandler,
  updateCandidateHandler,
  listBatchesHandler
} from "./routes/recruiterState";
import { getTenantSettingsHandler, updateTenantSettingsHandler, updateBlindScreeningHandler } from "./routes/tenantSettings";
import { getPublicJobsHandler, publishJobHandler } from "./routes/publicJobs";
import { publicApplyHandler, getApplicationStatusHandler, matchMyResumeHandler } from "./routes/candidatePortal";
import { candidateChatHandler } from "./routes/candidateChat";
import { ssoInitHandler, ssoCallbackHandler } from "./routes/sso";
import { rateLimitMiddleware } from "./middleware/rateLimiter";
import { ROLES } from "./utils/permissions";
import { initializeWorkflow } from "./services/workflowService";
import { auditMiddleware } from "./middleware/auditMiddleware";
import { resolveAllowedOrigin, applyCorsHeaders, buildCorsHeaders } from "./middleware/corsMiddleware";
import { addSecurityHeaders } from "./middleware/securityHeaders";
import { verifyWebhookSignature, reconstructRequest } from "./middleware/webhookAuth";

// Phase 1 — v1 routes
import { healthHandler, readyHandler, metricsHandler } from "./routes/health";

// Phase 3 — v1 routes
import {
  createVideoSessionHandler, getVideoSessionHandler,
  listVideoSessionsHandler, videoWebhookHandler
} from "./routes/v1/videoInterviews";
import {
  ingestDocumentHandler, queryKnowledgeHandler,
  listDocumentsHandler, deleteDocumentHandler
} from "./routes/v1/knowledge";
import { scanJDHandler, generateBiasReportHandler } from "./routes/v1/fairness";
import {
  predictOfferAcceptanceHandler, predictTimeToFillHandler,
  predictRetentionRiskHandler, recordOutcomeHandler, getAIWeightsHandler
} from "./routes/v1/predictions";

import {
  listIntegrationsHandler, connectIntegrationHandler,
  disconnectIntegrationHandler, getIntegrationStatusHandler,
  listATSJobsHandler, pushATSScoreHandler,
} from "./routes/v1/integrations";
import { listClientsHandler, addClientHandler, removeClientHandler } from "./routes/v1/agency";
import { ingestPassiveCandidateHandler, listPassiveCandidatesHandler } from "./routes/v1/sourcing";
import { getDynamicAssessmentHandler, submitAssessmentHandler } from "./routes/v1/assessments";
import { getHiringForecastHandler } from "./routes/v1/analytics";

// Phase 2 — v1 routes
import {
  listJobPostingsHandler, publishJobPostingHandler, getJobPostingMetricsHandler,
  unpublishJobPostingHandler, syncApplicationsHandler
} from "./routes/v1/jobPostings";
import {
  searchTalentPoolHandler, addToTalentPoolHandler, getTalentProfileHandler,
  updateTalentProfileHandler, enrollNurtureHandler, bulkImportHandler, semanticSearchHandler
} from "./routes/v1/talentPool";
import {
  submitReferralHandler, listReferralsHandler, updateReferralStatusHandler, payReferralBonusHandler
} from "./routes/v1/referrals";
import {
  listSequencesHandler, createSequenceHandler,
  sendOutreachEmailHandler, listOutreachHandler, outreachTrackingWebhook
} from "./routes/v1/nurture";
import {
  listRequisitionsHandler, createRequisitionHandler, getRequisitionHandler,
  updateRequisitionHandler, approveRequisitionHandler, publishRequisitionHandler,
  deleteRequisitionHandler
} from "./routes/v1/requisitions";
import {
  createOfferHandler, getOfferHandler, updateOfferHandler, sendOfferHandler,
  approveOfferHandler, withdrawOfferHandler, listOfferTemplatesHandler,
  createOfferTemplateHandler, esignWebhookHandler
} from "./routes/v1/offers";
import {
  initiateBGVHandler, getBGVHandler, bgvWebhookHandler, decideBGVHandler
} from "./routes/v1/bgv";
import {
  listWorkflowsHandler, createWorkflowHandler, updateWorkflowHandler, deleteWorkflowHandler,
  activateWorkflowHandler, getWorkflowHistoryHandler, getWorkflowRunHandler
} from "./routes/v1/workflows";
import { generateReportHandler } from "./routes/v1/reports";
import {
  initiateOnboardingHandler, listOnboardingHandler, updateOnboardingTaskHandler
} from "./routes/v1/onboarding";
import { getEeoReportHandler, deleteCandidateGdprHandler as complianceGdprPurgeHandler } from "./routes/v1/compliance";
import { SequenceEngine } from "./services/nurture/sequenceEngine";
import { JobBoardService } from "./services/jobBoardService";


// Load environment variables
config();

import { listAPIKeysHandler, createAPIKeyHandler, revokeAPIKeyHandler } from "./routes/apiKeys";

const PORT = Number(process.env.HR_TOOLS_PORT) || 3005;


// Simple request logging
function logRequest(req: Request, startTime: number, status: number) {
  const duration = Date.now() - startTime;
  const url = new URL(req.url);
  console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname} ${status} ${duration}ms`);
}

/**
 * Returns a 413 Response if Content-Length exceeds the allowed limit, otherwise null.
 * File-upload endpoints allow 10 MB; all others allow 1 MB.
 */
function checkRequestSize(req: Request, normalizedPath: string): Response | null {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return null;

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (!contentLength) return null;

  const FILE_UPLOAD_PATHS = [
    "/extract-resume",
    "/extract-jd",
    "/extract-jd-new",
    "/extract-jd-streaming",
    "/knowledge/ingest",
  ];

  const isFileUpload = FILE_UPLOAD_PATHS.includes(normalizedPath);
  const maxBytes = isFileUpload ? 10 * 1024 * 1024 : 1 * 1024 * 1024;

  if (contentLength > maxBytes) {
    const limit = isFileUpload ? "10MB" : "1MB";
    return Response.json(
      {
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: `Request body exceeds the ${limit} limit for this endpoint.`,
          requestId: crypto.randomUUID(),
        },
      },
      { status: 413 }
    );
  }

  return null;
}

// Initialize Infrastructure in Sequence
async function startServer() {
  try {
    console.log('[Index] Bootstrapping Infrastructure...');

    // 1. Redis
    await initializeRedisClient();

    // 2. MongoDB
    await initializeMongoClient();

    // 3. Background Workers (Wait for DB)
    initializeWorkflow();

    // 4. Start HTTP Server
    serve({
      port: PORT,
      hostname: "0.0.0.0",
      fetch: async (req) => {
        const startTime = Date.now();
        const url = new URL(req.url);
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

        // 1. Rate Limiting
        const rateLimitResponse = await rateLimitMiddleware(req, ip);
        // We define addCors and addVersionHeaders earlier to use them here if needed,
        // but finalHandler is defined later. Let's move them up.


        if (req.method === "OPTIONS") {
          const origin = req.headers.get("origin");
          const allowedOrigin = await resolveAllowedOrigin(origin);
          const headers = buildCorsHeaders(allowedOrigin);
          logRequest(req, startTime, 204);
          return new Response(null, { status: 204, headers });
        }

        // Request size guard (before body is read)
        const sizeError = checkRequestSize(req, url.pathname.startsWith("/v1/") ? url.pathname.slice(3) : url.pathname);
        if (sizeError) {
          logRequest(req, startTime, 413);
          return sizeError;
        }

        // Phase 1: API Versioning Support
        const isVersioned = url.pathname.startsWith("/v1/");
        const normalizedPath = isVersioned ? url.pathname.slice(3) : url.pathname;

        const PUBLIC_ROUTES = [
          "/", "/health", "/ready", "/metrics", "/mongo-info", "/auth/login", "/auth/register",
          "/auth/sso/init", "/auth/sso/callback",
          "/public/apply", "/public/track", "/public/chat",
          "/webhooks/esign", "/webhooks/bgv",
          "/webhooks/outreach",
          "/webhooks/video",
        ];

        // 🟢 Method-Aware Public Check 🟢
        const isPublicRequest = PUBLIC_ROUTES.includes(normalizedPath) || (req.method === "GET" && normalizedPath === "/public/jobs");

        // 🟢 Centralized Response Wrapper 🟢
        const requestOrigin = req.headers.get("origin");

        const addVersionHeaders = (res: Response) => {
          const newHeaders = new Headers(res.headers);
          if (!isVersioned && normalizedPath !== "/") {
            newHeaders.set("Deprecation", "true");
            newHeaders.set("Link", `<${url.origin}/v1${normalizedPath}>; rel="alternate"`);
          }
          newHeaders.set("X-API-Version", "v1.0.0");
          return new Response(res.body, { status: res.status, statusText: res.statusText, headers: newHeaders });
        };

        // finalHandler resolves CORS at call time so it has access to context.tenantId
        // (context is a let declared below; closures capture the binding, not the value)
        const finalHandler = async (res: Response) => {
          const resolvedOrigin = await resolveAllowedOrigin(requestOrigin, context?.tenantId);
          const finishedRes = addSecurityHeaders(addVersionHeaders(applyCorsHeaders(res, resolvedOrigin)));
          if (context) {
            // Background audit logging
            auditMiddleware(req, context, finishedRes.status).catch(e => console.error('[Audit] Logging error:', e));
          }
          return finishedRes;
        };

        // 1. Rate Limiting (re-applied with headers)
        if (rateLimitResponse) {
          logRequest(req, startTime, rateLimitResponse.status);
          return finalHandler(rateLimitResponse);
        }

        // 2. Auth Context
        let context: any = null;
        if (!isPublicRequest) {
          const authResult = await validateRequestAuth(req);
          if (!authResult.valid) {
            logRequest(req, startTime, 401);
            return finalHandler(authResult.response!);
          }
          context = authResult.context;
        }

        try {
          // Phase 1 & 2: Infrastructure Endpoints
          if (normalizedPath === "/ready") return finalHandler(await readyHandler(req));
          if (normalizedPath === "/metrics") return finalHandler(await metricsHandler(req));

          // ROUTE HANDLERS
          if (req.method === "POST" && normalizedPath === "/auth/register") {
            const response = await registerHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/auth/sso/init") {
            const response = await ssoInitHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/auth/login") {
            const response = await loginHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/health") {
            const response = await healthHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/auth/sso/callback") {
            const response = await ssoCallbackHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/extract-resume") {
            const response = await resumeExtractHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/extract-jd") {
            const response = await jdExtractHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }
          if (req.method === "POST" && normalizedPath === "/extract-jd-text") {
            const response = await jdExtractTextHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/extract-jd-new") {
            const response = await jdExtractorNewHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/extract-jd-streaming") {
            const response = await jdExtractorStreamingHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/validate-jd") {
            const response = await jdValidateHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/generate-mcq") {
            const response = await mcqGenerateHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/generate-voice-questions") {
            const response = await voiceInterviewHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/copilot/chat") {
            const response = await copilotChatHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/match") {
            const response = await jobMatchHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/draft-outreach") {
            const response = await draftOutreachHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/match-multiple") {
            const response = await multipleJobMatchHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/cancel-batch") {
            const response = await cancelBatchHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/job-status") {
            const response = await jobStatusHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/evaluate") {
            const response = await answerEvaluateHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/evaluate-audio") {
            const response = await audioEvaluateHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/query-mongo") {
            const response = await mongoNLQueryHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/mongo-info") {
            const response = await mongoDatabaseInfoHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/analytics") {
            const response = await analyticsHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/analytics/roi") {
            const response = await getRoiAnalyticsHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/campaigns") {
            const response = await listBatchesHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/assess-candidate") {
            const response = await recruiterAssessHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/assess-batch") {
            const response = await recruiterBatchAssessHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/interviews") {
            const response = await listInterviewsHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/interviews/schedule") {
            const response = await scheduleInterviewHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/interviews/suggest-times") {
            const response = await suggestTimesHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/interviews/cancel") {
            const response = await cancelInterviewHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/interviews/reschedule") {
            const response = await rescheduleInterviewHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/calendar/status") {
            const response = await getCalendarStatusHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/calendar/connect") {
            const response = await connectCalendarHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/scorecards/submit") {
            const response = await submitScorecardHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/scorecards/candidate") {
            const response = await getCandidateScorecardsHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/scorecards/synthesis") {
            const response = await synthesizeScorecardsHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/batch/upload") {
            const response = await bulkProcessUploadHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath.startsWith("/batch/status/")) {
            const response = await getBatchStatusHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/ats/sync") {
            const response = await atsSyncHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/recruiter/active-state") {
            const response = await getActiveStateHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/recruiter/history") {
            const response = await getRecruiterHistoryHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/recruiter/update-candidate") {
            const response = await updateCandidateHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/tenant/settings") {
            const response = await getTenantSettingsHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/tenant/settings") {
            const response = await updateTenantSettingsHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "PATCH" && normalizedPath === "/settings/blind-screening") {
            const response = await updateBlindScreeningHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/public/jobs") {
            const response = await getPublicJobsHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/public/jobs/publish") {
            const response = await publishJobHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/public/match-my-resume") {
            const response = await matchMyResumeHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/public/apply") {
            const response = await publicApplyHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }
          if (req.method === "GET" && (normalizedPath === "/public/track" || normalizedPath === "/getApplicationStatus")) {
            const response = await getApplicationStatusHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }


          if (req.method === "POST" && normalizedPath === "/public/chat") {
            const response = await candidateChatHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "DELETE" && normalizedPath.startsWith("/privacy/candidate/")) {
            const response = await privacyDeleteHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/privacy/retention-cron") {
            if (!context.roles.includes(ROLES.ADMIN)) {
              return finalHandler(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 }));
            }
            const response = await runRetentionPolicyHandler(req, context);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "GET" && normalizedPath === "/dpdp/notice") {
            const response = await getDpdpNoticeHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/dpdp/grievance") {
            const response = await fileGrievanceHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          if (req.method === "POST" && normalizedPath === "/webhooks/dpdp/consent-manager") {
            const response = await consentManagerWebhookHandler(req);
            logRequest(req, startTime, response.status);
            return finalHandler(response);
          }

          // ─── Phase 1 v1 Routes ───────────────────────────────────────────

          // Requisitions
          if (req.method === "GET" && normalizedPath === "/requisitions") {
            const response = await listRequisitionsHandler(req, context);
            logRequest(req, startTime, response.status); return finalHandler(response);
          }
          if (req.method === "POST" && normalizedPath === "/requisitions") {
            const response = await createRequisitionHandler(req, context);
            logRequest(req, startTime, response.status); return finalHandler(response);
          }
          const reqMatch = normalizedPath.match(/^\/requisitions\/([^/]+)$/);
          if (reqMatch) {
            const id = reqMatch[1];
            if (req.method === "GET") { const r = await getRequisitionHandler(req, context, id); logRequest(req, startTime, r.status); return finalHandler(r); }
            if (req.method === "PATCH") { const r = await updateRequisitionHandler(req, context, id); logRequest(req, startTime, r.status); return finalHandler(r); }
            if (req.method === "DELETE") { const r = await deleteRequisitionHandler(req, context, id); logRequest(req, startTime, r.status); return finalHandler(r); }
          }
          const reqApprove = normalizedPath.match(/^\/requisitions\/([^/]+)\/approve$/);
          if (reqApprove && req.method === "POST") {
            const r = await approveRequisitionHandler(req, context, reqApprove[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const reqPublish = normalizedPath.match(/^\/requisitions\/([^/]+)\/publish$/);
          if (reqPublish && req.method === "POST") {
            const r = await publishRequisitionHandler(req, context, reqPublish[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // Offers
          if (req.method === "POST" && normalizedPath === "/offers") {
            const response = await createOfferHandler(req, context);
            logRequest(req, startTime, response.status); return finalHandler(response);
          }
          if (req.method === "GET" && normalizedPath === "/offers/templates") {
            const r = await listOfferTemplatesHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/offers/templates") {
            const r = await createOfferTemplateHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const offerMatch = normalizedPath.match(/^\/offers\/([^/]+)$/);
          if (offerMatch) {
            const id = offerMatch[1];
            if (req.method === "GET") { const r = await getOfferHandler(req, context, id); logRequest(req, startTime, r.status); return finalHandler(r); }
            if (req.method === "PATCH") { const r = await updateOfferHandler(req, context, id); logRequest(req, startTime, r.status); return finalHandler(r); }
          }
          const offerSend = normalizedPath.match(/^\/offers\/([^/]+)\/send$/);
          if (offerSend && req.method === "POST") {
            const r = await sendOfferHandler(req, context, offerSend[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const offerApprove = normalizedPath.match(/^\/offers\/([^/]+)\/approve$/);
          if (offerApprove && req.method === "POST") {
            const r = await approveOfferHandler(req, context, offerApprove[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const offerWithdraw = normalizedPath.match(/^\/offers\/([^/]+)\/withdraw$/);
          if (offerWithdraw && req.method === "POST") {
            const r = await withdrawOfferHandler(req, context, offerWithdraw[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // BGV
          if (req.method === "POST" && normalizedPath === "/bgv") {
            const r = await initiateBGVHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && (normalizedPath === "/bgv/webhook" || normalizedPath === "/webhooks/bgv")) {
            const { valid, rawBody } = await verifyWebhookSignature(req, "bgv");
            if (!valid) { logRequest(req, startTime, 401); return finalHandler(Response.json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed", requestId: crypto.randomUUID() } }, { status: 401 })); }
            const r = await bgvWebhookHandler(reconstructRequest(req, rawBody)); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const bgvMatch = normalizedPath.match(/^\/bgv\/([^/]+)$/);
          if (bgvMatch) {
            const id = bgvMatch[1];
            if (req.method === "GET") { const r = await getBGVHandler(req, context, id); logRequest(req, startTime, r.status); return finalHandler(r); }
          }
          const bgvDecide = normalizedPath.match(/^\/bgv\/([^/]+)\/decide$/);
          if (bgvDecide && req.method === "POST") {
            const r = await decideBGVHandler(req, context, bgvDecide[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // ─── Phase 2 v1 Routes ───────────────────────────────────────────

          // Job Postings
          if (req.method === "GET" && normalizedPath === "/job-postings") {
            const r = await listJobPostingsHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/job-postings") {
            const r = await publishJobPostingHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const jpMatch = normalizedPath.match(/^\/job-postings\/([^/]+)$/);
          if (jpMatch) {
            const id = jpMatch[1];
            if (req.method === "GET") { const r = await getJobPostingMetricsHandler(req, context, id); logRequest(req, startTime, r.status); return finalHandler(r); }
            if (req.method === "DELETE") { const r = await unpublishJobPostingHandler(req, context, id); logRequest(req, startTime, r.status); return finalHandler(r); }
          }
          const jpSync = normalizedPath.match(/^\/job-postings\/([^/]+)\/sync$/);
          if (jpSync && req.method === "POST") {
            const r = await syncApplicationsHandler(req, context, jpSync[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // Talent Pool
          if (req.method === "GET" && normalizedPath === "/talent-pool") {
            const r = await searchTalentPoolHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/talent-pool") {
            const r = await addToTalentPoolHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/talent-pool/search") {
            const r = await semanticSearchHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/talent-pool/bulk-import") {
            const r = await bulkImportHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const tpMatch = normalizedPath.match(/^\/talent-pool\/([^/]+)$/);
          if (tpMatch) {
            const id = tpMatch[1];
            if (req.method === "GET") { const r = await getTalentProfileHandler(req, context, id); logRequest(req, startTime, r.status); return finalHandler(r); }
            if (req.method === "PATCH") { const r = await updateTalentProfileHandler(req, context, id); logRequest(req, startTime, r.status); return finalHandler(r); }
          }
          const tpNurture = normalizedPath.match(/^\/talent-pool\/([^/]+)\/nurture$/);
          if (tpNurture && req.method === "POST") {
            const r = await enrollNurtureHandler(req, context, tpNurture[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // Referrals
          if (req.method === "POST" && normalizedPath === "/referrals") {
            const r = await submitReferralHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "GET" && normalizedPath === "/referrals") {
            const r = await listReferralsHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const refMatch = normalizedPath.match(/^\/referrals\/([^/]+)\/status$/);
          if (refMatch && req.method === "PATCH") {
            const r = await updateReferralStatusHandler(req, context, refMatch[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const refBonus = normalizedPath.match(/^\/referrals\/([^/]+)\/bonus$/);
          if (refBonus && req.method === "POST") {
            const r = await payReferralBonusHandler(req, context, refBonus[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // Nurture Sequences & Outreach
          if (req.method === "GET" && normalizedPath === "/nurture/sequences") {
            const r = await listSequencesHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/nurture/sequences") {
            const r = await createSequenceHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/outreach/send-email") {
            const r = await sendOutreachEmailHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "GET" && normalizedPath === "/outreach") {
            const r = await listOutreachHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // ─── Phase 3 v1 Routes ───────────────────────────────────────────

          // Video Interviews
          if (req.method === "GET" && normalizedPath === "/video-sessions") {
            const r = await listVideoSessionsHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/video-sessions") {
            const r = await createVideoSessionHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const videoMatch = normalizedPath.match(/^\/video-sessions\/([^/]+)$/);
          if (videoMatch) {
            if (req.method === "GET") { const r = await getVideoSessionHandler(req, context, videoMatch[1]); logRequest(req, startTime, r.status); return finalHandler(r); }
          }

          // Knowledge / RAG
          if (req.method === "GET" && normalizedPath === "/knowledge") {
            const r = await listDocumentsHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/knowledge/ingest") {
            const r = await ingestDocumentHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/knowledge/query") {
            const r = await queryKnowledgeHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const knowledgeMatch = normalizedPath.match(/^\/knowledge\/([^/]+)$/);
          if (knowledgeMatch && req.method === "DELETE") {
            const r = await deleteDocumentHandler(req, context, knowledgeMatch[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // ─── Webhooks (Unified) ──────────────────────────────────────────

          if (req.method === "POST" && normalizedPath === "/webhooks/video") {
            const { valid, rawBody } = await verifyWebhookSignature(req, "video");
            if (!valid) { logRequest(req, startTime, 401); return finalHandler(Response.json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed", requestId: crypto.randomUUID() } }, { status: 401 })); }
            const r = await videoWebhookHandler(reconstructRequest(req, rawBody)); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && (normalizedPath === "/webhooks/outreach" || normalizedPath === "/webhooks/outreach/tracking")) {
            const { valid, rawBody } = await verifyWebhookSignature(req, "outreach");
            if (!valid) { logRequest(req, startTime, 401); return finalHandler(Response.json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed", requestId: crypto.randomUUID() } }, { status: 401 })); }
            const r = await outreachTrackingWebhook(reconstructRequest(req, rawBody)); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/webhooks/esign") {
            const { valid, rawBody } = await verifyWebhookSignature(req, "docusign");
            if (!valid) { logRequest(req, startTime, 401); return finalHandler(Response.json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed", requestId: crypto.randomUUID() } }, { status: 401 })); }
            const r = await esignWebhookHandler(reconstructRequest(req, rawBody)); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // Fairness / Bias Detection
          if (req.method === "POST" && normalizedPath === "/fairness/scan-jd") {
            const r = await scanJDHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/fairness/report") {
            const r = await generateBiasReportHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // Predictive Models
          if (req.method === "POST" && normalizedPath === "/predictions/offer-acceptance") {
            const r = await predictOfferAcceptanceHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/predictions/time-to-fill") {
            const r = await predictTimeToFillHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/predictions/retention-risk") {
            const r = await predictRetentionRiskHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // Compliance
          if (req.method === "GET" && normalizedPath === "/compliance/eeo-report") {
            const r = await getEeoReportHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/compliance/gdpr-purge") {
            const r = await complianceGdprPurgeHandler(req, context);
 logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/predictions/outcomes") {
            const r = await recordOutcomeHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "GET" && normalizedPath === "/predictions/weights") {
            const r = await getAIWeightsHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // ─── Phase 5 v1 Routes ───────────────────────────────────────────
          if (req.method === "GET" && normalizedPath === "/auth/api-keys") {
            const r = await listAPIKeysHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/auth/api-keys") {
            const r = await createAPIKeyHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const apiKeyMatch = normalizedPath.match(/^\/auth\/api-keys\/([^/]+)$/);
          if (apiKeyMatch && req.method === "DELETE") {
            const r = await revokeAPIKeyHandler(req, context, apiKeyMatch[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          // ─── Phase 4 v1 Routes ───────────────────────────────────────────
          if (req.method === "GET" && normalizedPath === "/workflows") {
            const r = await listWorkflowsHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/workflows") {
            const r = await createWorkflowHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const workflowMatch = normalizedPath.match(/^\/workflows\/([^/]+)$/);
          if (workflowMatch) {
            if (req.method === "PATCH") {
              const r = await updateWorkflowHandler(req, context, workflowMatch[1]); logRequest(req, startTime, r.status); return finalHandler(r);
            }
            if (req.method === "DELETE") {
              const r = await deleteWorkflowHandler(req, context, workflowMatch[1]); logRequest(req, startTime, r.status); return finalHandler(r);
            }
          }
          if (req.method === "POST" && normalizedPath.match(/^\/workflows\/[^/]+\/activate$/))
            return finalHandler(await activateWorkflowHandler(req, context));
          if (req.method === "GET" && normalizedPath.match(/^\/workflows\/[^/]+\/history$/))
            return finalHandler(await getWorkflowHistoryHandler(req, context));
          if (req.method === "GET" && normalizedPath.match(/^\/workflows\/runs\/[^/]+$/))
            return finalHandler(await getWorkflowRunHandler(req, context));

          // Integration marketplace routes
          if (req.method === "GET" && normalizedPath === "/integrations")
            return finalHandler(await listIntegrationsHandler(req, context));
          if (req.method === "POST" && normalizedPath.match(/^\/integrations\/[^/]+\/connect$/)) {
            const integrationId = normalizedPath.split("/")[2];
            return finalHandler(await connectIntegrationHandler(req, context, integrationId));
          }
          if (req.method === "DELETE" && normalizedPath.match(/^\/integrations\/[^/]+$/)) {
            const integrationId = normalizedPath.split("/")[2];
            return finalHandler(await disconnectIntegrationHandler(req, context, integrationId));
          }
          if (req.method === "GET" && normalizedPath.match(/^\/integrations\/[^/]+\/status$/)) {
            const integrationId = normalizedPath.split("/")[2];
            return finalHandler(await getIntegrationStatusHandler(req, context, integrationId));
          }
          if (req.method === "GET" && normalizedPath.match(/^\/integrations\/[^/]+\/jobs$/)) {
            const integrationId = normalizedPath.split("/")[2];
            return finalHandler(await listATSJobsHandler(req, context, integrationId));
          }
          if (req.method === "POST" && normalizedPath.match(/^\/integrations\/[^/]+\/push-score$/)) {
            const integrationId = normalizedPath.split("/")[2];
            return finalHandler(await pushATSScoreHandler(req, context, integrationId));
          }

          // Sourcing routes
          if (req.method === "POST" && normalizedPath === "/sourcing/ingest") {
            return finalHandler(await ingestPassiveCandidateHandler(req, context));
          }
          if (req.method === "GET" && normalizedPath === "/sourcing/list") {
            return finalHandler(await listPassiveCandidatesHandler(req, context));
          }

          // Assessment routes
          if (req.method === "GET" && normalizedPath === "/assessments/dynamic") {
            return finalHandler(await getDynamicAssessmentHandler(req, context));
          }
          if (req.method === "POST" && normalizedPath === "/assessments/submit") {
            return finalHandler(await submitAssessmentHandler(req, context));
          }

          // Analytics & Predictions
          if (req.method === "GET" && normalizedPath === "/analytics/forecast") {
            return finalHandler(await getHiringForecastHandler(req, context));
          }

          // Agency routes
          if (req.method === "GET" && normalizedPath === "/agency/clients")
            return finalHandler(await listClientsHandler(req, context));
          if (req.method === "POST" && normalizedPath === "/agency/clients")
            return finalHandler(await addClientHandler(req, context));
          if (req.method === "DELETE" && normalizedPath.match(/^\/agency\/clients\/[^/]+$/)) {
            const clientTenantId = normalizedPath.split("/")[3];
            return finalHandler(await removeClientHandler(req, context, clientTenantId));
          }

          if (req.method === "POST" && normalizedPath === "/reports/generate") {
            const r = await generateReportHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          if (req.method === "GET" && normalizedPath === "/onboarding") {
            const r = await listOnboardingHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          if (req.method === "POST" && normalizedPath === "/onboarding/initiate") {
            const r = await initiateOnboardingHandler(req, context); logRequest(req, startTime, r.status); return finalHandler(r);
          }
          const onboardingMatch = normalizedPath.match(/^\/onboarding\/([^/]+)\/tasks$/);
          if (onboardingMatch && req.method === "PATCH") {
            const r = await updateOnboardingTaskHandler(req, context, onboardingMatch[1]); logRequest(req, startTime, r.status); return finalHandler(r);
          }

          logRequest(req, startTime, 404);
          return finalHandler(new Response(JSON.stringify({ error: "Route not found" }), { status: 404 }));

        } catch (error) {
          console.error(`[Index] Unhandled error:`, error);
          logRequest(req, startTime, 500);
          return finalHandler(new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 }));
        }
      }
    });

    console.log(`[Index] Platform Ready. Serving on port ${PORT}`);
  } catch (error) {
    console.error('[Index] Critical Startup Failure:', error);
    process.exit(1);
  }
}

// Start sequence
startServer();

// Global Maintenance Jobs
setInterval(async () => {
  try {
    await InterviewService.processPendingReminders();
  } catch (e) {
    console.error('[Maintenance] Reminder check failed:', e);
  }
}, 60 * 1000);

setInterval(async () => {
  try {
    await PrivacyService.enforceDataRetention(6);
  } catch (e) {
    console.error('[Maintenance] Retention check failed:', e);
  }
}, 1000 * 60 * 60 * 24);

setInterval(async () => {
  try {
    await SequenceEngine.processDueSteps();
  } catch (e) {
    console.error('[Maintenance] Nurture processing failed:', e);
  }
}, 1000 * 60 * 60); // Check every hour