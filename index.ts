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
import { getTenantSettingsHandler, updateTenantSettingsHandler } from "./routes/tenantSettings";
import { getPublicJobsHandler, publishJobHandler } from "./routes/publicJobs";
import { publicApplyHandler, getApplicationStatusHandler } from "./routes/candidatePortal";
import { candidateChatHandler } from "./routes/candidateChat";
import { ssoInitHandler, ssoCallbackHandler } from "./routes/sso";
import { rateLimitMiddleware } from "./middleware/rateLimiter";
import { ROLES } from "./utils/permissions";
import { initializeWorkflow } from "./services/workflowService";

// Load environment variables
config();

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

        // Public Routes
        const PUBLIC_ROUTES = [
          "/", "/health", "/mongo-info", "/auth/login", "/auth/register",
          "/auth/sso/init", "/auth/sso/callback", "/public/jobs",
          "/public/apply", "/public/track", "/public/chat"
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

          if (req.method === "GET" && url.pathname === "/health") {
            const db = getMongoDb();
            const health = {
              status: "UP",
              timestamp: new Date().toISOString(),
              services: {
                database: db ? "CONNECTED" : "DISCONNECTED",
                redis: "CONNECTED",
                uptime: Math.round(process.uptime())
              }
            };
            const status = health.services.database === "CONNECTED" ? 200 : 503;
            const response = new Response(JSON.stringify(health), { status, headers: { "Content-Type": "application/json" } });
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