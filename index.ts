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
import { jdExtractorNewHandler } from "./routes/jdExtractorNew";
import { jdExtractorStreamingHandler } from "./routes/jdExtractorStreaming";
import { jdValidateHandler } from "./routes/jdValidate";
import { mcqGenerateHandler } from "./routes/mcqGenerate";
import { voiceInterviewHandler } from "./routes/voiceInterview";
import { audioEvaluateHandler } from "./routes/audioEvaluate";
import { deleteCandidateGdprHandler, runRetentionPolicyHandler } from "./routes/privacy";
import { PrivacyService } from "./services/privacyService";
import { getDpdpNoticeHandler, fileGrievanceHandler, consentManagerWebhookHandler } from "./routes/dpdpCompliance";
import { bulkProcessUploadHandler, getBatchStatusHandler } from "./routes/batchProcessing";
import { getRoiAnalyticsHandler } from "./routes/roiAnalytics";
import { atsSyncHandler } from "./routes/atsSync";
import { 
  getRecruiterHistoryHandler,
  getActiveStateHandler,
  updateCandidateHandler
} from "./routes/recruiterState";
import { getTenantSettingsHandler, updateTenantSettingsHandler, updateBlindScreeningHandler } from "./routes/tenantSettings";
import { getPublicJobsHandler, publishJobHandler } from "./routes/publicJobs";
import { publicApplyHandler, getApplicationStatusHandler } from "./routes/candidatePortal";
import { candidateChatHandler } from "./routes/candidateChat";
import { ssoInitHandler, ssoCallbackHandler } from "./routes/sso";
import { rateLimitMiddleware } from "./middleware/rateLimiter";
import { ROLES } from "./utils/permissions";
import { initializeWorkflow } from "./services/workflowService";

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

// Phase 2 — v1 routes
import {
  listJobPostingsHandler, publishJobPostingHandler, getJobPostingMetricsHandler,
  unpublishJobPostingHandler, syncApplicationsHandler
} from "./routes/v1/jobPostings";
import {
  searchTalentPoolHandler, addToTalentPoolHandler, getTalentProfileHandler,
  updateTalentProfileHandler, enrollNurtureHandler, bulkImportHandler
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

// Load environment variables
config();

import { listAPIKeysHandler, createAPIKeyHandler, revokeAPIKeyHandler } from "./routes/apiKeys";

const PORT = Number(process.env.HR_TOOLS_PORT) || 3001;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-id",
};

// Simple request logging
function logRequest(req: Request, startTime: number, status: number) {
  const duration = Date.now() - startTime;
  const url = new URL(req.url);
  console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname} ${status} ${duration}ms`);
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
      fetch: async (req) => {
        const startTime = Date.now();
        const url = new URL(req.url);
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

        // 1. Rate Limiting
        const rateLimitResponse = await rateLimitMiddleware(req, ip);
        if (rateLimitResponse) {
            logRequest(req, startTime, rateLimitResponse.status);
            return rateLimitResponse;
        }

        // Helper for CORS
        const addCors = (res: Response) => {
          const newHeaders = new Headers(res.headers);
          Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: newHeaders,
          });
        };

        if (req.method === "OPTIONS") {
          logRequest(req, startTime, 204);
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        // Phase 1 & 2: Unversioned health + public webhook endpoints
        if (url.pathname === "/ready")   return addCors(await readyHandler(req));
        if (url.pathname === "/metrics") return addCors(await metricsHandler(req));
        if (req.method === "POST" && url.pathname === "/webhooks/esign") return addCors(await esignWebhookHandler(req));
        if (req.method === "POST" && url.pathname === "/webhooks/bgv")   return addCors(await bgvWebhookHandler(req));
        if (req.method === "POST" && url.pathname === "/webhooks/outreach/tracking") return addCors(await outreachTrackingWebhook(req));
        if (req.method === "POST" && url.pathname === "/webhooks/video") return addCors(await videoWebhookHandler(req));

        // Public Routes
        const PUBLIC_ROUTES = [
          "/", "/health", "/ready", "/metrics", "/mongo-info", "/auth/login", "/auth/register",
          "/auth/sso/init", "/auth/sso/callback", "/public/jobs",
          "/public/apply", "/public/track", "/public/chat",
          "/webhooks/esign", "/webhooks/bgv", "/v1/bgv/webhook",
          "/webhooks/outreach/tracking",
          "/webhooks/video",
        ];

        // Auth Context
        let context: any = null;
        if (!PUBLIC_ROUTES.includes(url.pathname)) {
          const authResult = await validateRequestAuth(req);
          if (!authResult.valid) {
            logRequest(req, startTime, 401);
            return addCors(authResult.response!);
          }
          context = authResult.context;
        }

        try {
          // ROUTE HANDLERS
          if (req.method === "POST" && url.pathname === "/auth/login") {
            const response = await loginHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/v1/health")) {
            const response = await healthHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/auth/register") {
            const response = await registerHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/auth/sso/init") {
            const response = await ssoInitHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/auth/sso/callback") {
            const response = await ssoCallbackHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/extract-resume") {
            const response = await resumeExtractHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/extract-jd") {
            const response = await jdExtractHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/extract-jd-new") {
            const response = await jdExtractorNewHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/extract-jd-streaming") {
            const response = await jdExtractorStreamingHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/validate-jd") {
            const response = await jdValidateHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/generate-mcq") {
            const response = await mcqGenerateHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/generate-voice-questions") {
            const response = await voiceInterviewHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/copilot/chat") {
            const response = await copilotChatHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/match") {
            const response = await jobMatchHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/match-multiple") {
            const response = await multipleJobMatchHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/cancel-batch") {
            const response = await cancelBatchHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/job-status") {
            const response = await jobStatusHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/evaluate") {
            const response = await answerEvaluateHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/evaluate-audio") {
            const response = await audioEvaluateHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/query-mongo") {
            const response = await mongoNLQueryHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/mongo-info") {
            const response = await mongoDatabaseInfoHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/analytics") {
            const response = await analyticsHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/analytics/roi") {
            const response = await getRoiAnalyticsHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/assess-candidate") {
            const response = await recruiterAssessHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/assess-batch") {
            const response = await recruiterBatchAssessHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/interviews") {
            const response = await listInterviewsHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/interviews/schedule") {
            const response = await scheduleInterviewHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/interviews/suggest-times") {
            const response = await suggestTimesHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/interviews/cancel") {
            const response = await cancelInterviewHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/interviews/reschedule") {
            const response = await rescheduleInterviewHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/calendar/status") {
            const response = await getCalendarStatusHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/calendar/connect") {
            const response = await connectCalendarHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/scorecards/submit") {
            const response = await submitScorecardHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/scorecards/candidate") {
            const response = await getCandidateScorecardsHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/scorecards/synthesis") {
            const response = await synthesizeScorecardsHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/batch/upload") {
            const response = await bulkProcessUploadHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname.startsWith("/batch/status/")) {
            const response = await getBatchStatusHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/ats/sync") {
            const response = await atsSyncHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/recruiter/active-state") {
            const response = await getActiveStateHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/recruiter/history") {
            const response = await getRecruiterHistoryHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/recruiter/update-candidate") {
            const response = await updateCandidateHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/tenant/settings") {
            const response = await getTenantSettingsHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/tenant/settings") {
            const response = await updateTenantSettingsHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "PATCH" && url.pathname === "/v1/settings/blind-screening") {
            const response = await updateBlindScreeningHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/public/jobs") {
            const response = await getPublicJobsHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/public/jobs/publish") {
            const response = await publishJobHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/public/apply") {
            const response = await publicApplyHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/public/track") {
            const response = await getApplicationStatusHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/public/chat") {
            const response = await candidateChatHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "DELETE" && url.pathname.startsWith("/privacy/candidate/")) {
            const response = await deleteCandidateGdprHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/privacy/retention-cron") {
            if (!context.roles.includes(ROLES.ADMIN)) {
              return addCors(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 }));
            }
            const response = await runRetentionPolicyHandler(req, context);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "GET" && url.pathname === "/dpdp/notice") {
            const response = await getDpdpNoticeHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/dpdp/grievance") {
            const response = await fileGrievanceHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          if (req.method === "POST" && url.pathname === "/webhooks/dpdp/consent-manager") {
            const response = await consentManagerWebhookHandler(req);
            logRequest(req, startTime, response.status);
            return addCors(response);
          }

          // ─── Phase 1 v1 Routes ───────────────────────────────────────────

          // Requisitions
          if (req.method === "GET" && url.pathname === "/v1/requisitions") {
            const response = await listRequisitionsHandler(req, context);
            logRequest(req, startTime, response.status); return addCors(response);
          }
          if (req.method === "POST" && url.pathname === "/v1/requisitions") {
            const response = await createRequisitionHandler(req, context);
            logRequest(req, startTime, response.status); return addCors(response);
          }
          const reqMatch = url.pathname.match(/^\/v1\/requisitions\/([^/]+)$/);
          if (reqMatch) {
            const id = reqMatch[1];
            if (req.method === "GET")    { const r = await getRequisitionHandler(req, context, id); logRequest(req, startTime, r.status); return addCors(r); }
            if (req.method === "PATCH")  { const r = await updateRequisitionHandler(req, context, id); logRequest(req, startTime, r.status); return addCors(r); }
            if (req.method === "DELETE") { const r = await deleteRequisitionHandler(req, context, id); logRequest(req, startTime, r.status); return addCors(r); }
          }
          const reqApprove = url.pathname.match(/^\/v1\/requisitions\/([^/]+)\/approve$/);
          if (reqApprove && req.method === "POST") {
            const r = await approveRequisitionHandler(req, context, reqApprove[1]); logRequest(req, startTime, r.status); return addCors(r);
          }
          const reqPublish = url.pathname.match(/^\/v1\/requisitions\/([^/]+)\/publish$/);
          if (reqPublish && req.method === "POST") {
            const r = await publishRequisitionHandler(req, context, reqPublish[1]); logRequest(req, startTime, r.status); return addCors(r);
          }

          // Offers
          if (req.method === "POST" && url.pathname === "/v1/offers") {
            const response = await createOfferHandler(req, context);
            logRequest(req, startTime, response.status); return addCors(response);
          }
          if (req.method === "GET" && url.pathname === "/v1/offers/templates") {
            const r = await listOfferTemplatesHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/offers/templates") {
            const r = await createOfferTemplateHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          const offerMatch = url.pathname.match(/^\/v1\/offers\/([^/]+)$/);
          if (offerMatch) {
            const id = offerMatch[1];
            if (req.method === "GET")   { const r = await getOfferHandler(req, context, id); logRequest(req, startTime, r.status); return addCors(r); }
            if (req.method === "PATCH") { const r = await updateOfferHandler(req, context, id); logRequest(req, startTime, r.status); return addCors(r); }
          }
          const offerSend = url.pathname.match(/^\/v1\/offers\/([^/]+)\/send$/);
          if (offerSend && req.method === "POST") {
            const r = await sendOfferHandler(req, context, offerSend[1]); logRequest(req, startTime, r.status); return addCors(r);
          }
          const offerApprove = url.pathname.match(/^\/v1\/offers\/([^/]+)\/approve$/);
          if (offerApprove && req.method === "POST") {
            const r = await approveOfferHandler(req, context, offerApprove[1]); logRequest(req, startTime, r.status); return addCors(r);
          }
          const offerWithdraw = url.pathname.match(/^\/v1\/offers\/([^/]+)\/withdraw$/);
          if (offerWithdraw && req.method === "POST") {
            const r = await withdrawOfferHandler(req, context, offerWithdraw[1]); logRequest(req, startTime, r.status); return addCors(r);
          }

          // BGV
          if (req.method === "POST" && url.pathname === "/v1/bgv") {
            const r = await initiateBGVHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/bgv/webhook") {
            const r = await bgvWebhookHandler(req); logRequest(req, startTime, r.status); return addCors(r);
          }
          const bgvMatch = url.pathname.match(/^\/v1\/bgv\/([^/]+)$/);
          if (bgvMatch) {
            const id = bgvMatch[1];
            if (req.method === "GET") { const r = await getBGVHandler(req, context, id); logRequest(req, startTime, r.status); return addCors(r); }
          }
          const bgvDecide = url.pathname.match(/^\/v1\/bgv\/([^/]+)\/decide$/);
          if (bgvDecide && req.method === "POST") {
            const r = await decideBGVHandler(req, context, bgvDecide[1]); logRequest(req, startTime, r.status); return addCors(r);
          }

          // ─── Phase 2 v1 Routes ───────────────────────────────────────────

          // Job Postings
          if (req.method === "GET" && url.pathname === "/v1/job-postings") {
            const r = await listJobPostingsHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/job-postings") {
            const r = await publishJobPostingHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          const jpMatch = url.pathname.match(/^\/v1\/job-postings\/([^/]+)$/);
          if (jpMatch) {
            const id = jpMatch[1];
            if (req.method === "GET")    { const r = await getJobPostingMetricsHandler(req, context, id); logRequest(req, startTime, r.status); return addCors(r); }
            if (req.method === "DELETE") { const r = await unpublishJobPostingHandler(req, context, id); logRequest(req, startTime, r.status); return addCors(r); }
          }
          const jpSync = url.pathname.match(/^\/v1\/job-postings\/([^/]+)\/sync$/);
          if (jpSync && req.method === "POST") {
            const r = await syncApplicationsHandler(req, context, jpSync[1]); logRequest(req, startTime, r.status); return addCors(r);
          }

          // Talent Pool
          if (req.method === "GET" && url.pathname === "/v1/talent-pool") {
            const r = await searchTalentPoolHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/talent-pool") {
            const r = await addToTalentPoolHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/talent-pool/bulk-import") {
            const r = await bulkImportHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          const tpMatch = url.pathname.match(/^\/v1\/talent-pool\/([^/]+)$/);
          if (tpMatch) {
            const id = tpMatch[1];
            if (req.method === "GET")   { const r = await getTalentProfileHandler(req, context, id); logRequest(req, startTime, r.status); return addCors(r); }
            if (req.method === "PATCH") { const r = await updateTalentProfileHandler(req, context, id); logRequest(req, startTime, r.status); return addCors(r); }
          }
          const tpNurture = url.pathname.match(/^\/v1\/talent-pool\/([^/]+)\/nurture$/);
          if (tpNurture && req.method === "POST") {
            const r = await enrollNurtureHandler(req, context, tpNurture[1]); logRequest(req, startTime, r.status); return addCors(r);
          }

          // Referrals
          if (req.method === "POST" && url.pathname === "/v1/referrals") {
            const r = await submitReferralHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "GET" && url.pathname === "/v1/referrals") {
            const r = await listReferralsHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          const refMatch = url.pathname.match(/^\/v1\/referrals\/([^/]+)\/status$/);
          if (refMatch && req.method === "PATCH") {
            const r = await updateReferralStatusHandler(req, context, refMatch[1]); logRequest(req, startTime, r.status); return addCors(r);
          }
          const refBonus = url.pathname.match(/^\/v1\/referrals\/([^/]+)\/bonus$/);
          if (refBonus && req.method === "POST") {
            const r = await payReferralBonusHandler(req, context, refBonus[1]); logRequest(req, startTime, r.status); return addCors(r);
          }

          // Nurture Sequences & Outreach
          if (req.method === "GET" && url.pathname === "/v1/nurture/sequences") {
            const r = await listSequencesHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/nurture/sequences") {
            const r = await createSequenceHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/outreach/send-email") {
            const r = await sendOutreachEmailHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "GET" && url.pathname === "/v1/outreach") {
            const r = await listOutreachHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }

          // ─── Phase 3 v1 Routes ───────────────────────────────────────────

          // Video Interviews
          if (req.method === "GET" && url.pathname === "/v1/video-sessions") {
            const r = await listVideoSessionsHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/video-sessions") {
            const r = await createVideoSessionHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          const videoMatch = url.pathname.match(/^\/v1\/video-sessions\/([^/]+)$/);
          if (videoMatch) {
            if (req.method === "GET") { const r = await getVideoSessionHandler(req, context, videoMatch[1]); logRequest(req, startTime, r.status); return addCors(r); }
          }

          // Knowledge / RAG
          if (req.method === "GET" && url.pathname === "/v1/knowledge") {
            const r = await listDocumentsHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/knowledge/ingest") {
            const r = await ingestDocumentHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/knowledge/query") {
            const r = await queryKnowledgeHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          const knowledgeMatch = url.pathname.match(/^\/v1\/knowledge\/([^/]+)$/);
          if (knowledgeMatch && req.method === "DELETE") {
            const r = await deleteDocumentHandler(req, context, knowledgeMatch[1]); logRequest(req, startTime, r.status); return addCors(r);
          }

          // Fairness / Bias Detection
          if (req.method === "POST" && url.pathname === "/v1/fairness/scan-jd") {
            const r = await scanJDHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/fairness/report") {
            const r = await generateBiasReportHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }

          // Predictive Models
          if (req.method === "POST" && url.pathname === "/v1/predictions/offer-acceptance") {
            const r = await predictOfferAcceptanceHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/predictions/time-to-fill") {
            const r = await predictTimeToFillHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/predictions/retention-risk") {
            const r = await predictRetentionRiskHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/predictions/outcomes") {
            const r = await recordOutcomeHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "GET" && url.pathname === "/v1/predictions/weights") {
            const r = await getAIWeightsHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }

          // ─── Phase 5 v1 Routes ───────────────────────────────────────────
          if (req.method === "GET" && url.pathname === "/v1/auth/api-keys") {
            const r = await listAPIKeysHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          if (req.method === "POST" && url.pathname === "/v1/auth/api-keys") {
            const r = await createAPIKeyHandler(req, context); logRequest(req, startTime, r.status); return addCors(r);
          }
          const apiKeyMatch = url.pathname.match(/^\/v1\/auth\/api-keys\/([^/]+)$/);
          if (apiKeyMatch && req.method === "DELETE") {
            const r = await revokeAPIKeyHandler(req, context, apiKeyMatch[1]); logRequest(req, startTime, r.status); return addCors(r);
          }

          // ─────────────────────────────────────────────────────────────────

          logRequest(req, startTime, 404);
          return addCors(new Response(JSON.stringify({ error: "Route not found" }), { status: 404 }));

        } catch (error) {
          console.error(`[Index] Unhandled error:`, error);
          logRequest(req, startTime, 500);
          return addCors(new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 }));
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