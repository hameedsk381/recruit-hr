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
import { initializeMongoClient } from "./utils/mongoClient";
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
  getActiveStateHandler, 
  updateCandidateHandler, 
  getRecruiterHistoryHandler 
} from "./routes/recruiterState";

// Load environment variables
config();

const PORT = process.env.HR_TOOLS_PORT || 3001;

// Initialize Redis client
initializeRedisClient().catch(error => {
  console.error('[Index] Failed to initialize Redis client:', error);
});

// Initialize MongoDB client
initializeMongoClient().catch(error => {
  console.error('[Index] Failed to initialize MongoDB client:', error);
  console.warn('[Index] MongoDB features will be unavailable');
});

// Simple request logging
function logRequest(req: Request, startTime: number, status: number) {
  const duration = Date.now() - startTime;
  const url = new URL(req.url);
  console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname} ${status} ${duration}ms`);
}

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // Adjust as needed

function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
  }

  const rateData = rateLimitMap.get(ip)!;

  // Reset counter if window has passed
  if (now >= rateData.resetTime) {
    rateData.count = 0;
    rateData.resetTime = now + RATE_LIMIT_WINDOW;
  }

  // Check if we're within limits
  if (rateData.count < MAX_REQUESTS_PER_WINDOW) {
    rateData.count++;
    return { allowed: true };
  }

  return { allowed: false, resetTime: rateData.resetTime };
}

const server = serve({
  fetch: async (req) => {
    const startTime = Date.now();
    const url = new URL(req.url);
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // Handle CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Apply rate limiting
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000);
      logRequest(req, startTime, 429);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded",
          retryAfter: `${retryAfter} seconds`
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": retryAfter.toString(),
            ...corsHeaders
          }
        }
      );
    }

    // Helper to add CORS headers to a response
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

    // Public Routes (No Auth Required)
    const PUBLIC_ROUTES = [
      "/",
      "/health",
      "/mongo-info",
      "/auth/login",
      "/auth/register"
    ];

    // Auth check (Enterprise Isolation)
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
      // Route handling
      if (req.method === "POST" && url.pathname === "/auth/login") {
        const response = await loginHandler(req);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      if (req.method === "POST" && url.pathname === "/auth/register") {
        const response = await registerHandler(req);
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
        // Special handling for SSE: no cors helper if it messes up streams, 
        // but addCors just wraps headers, so it should be fine if headers are preserved.
        // Actually addCors creates a NEW Response with body, which works for streams too in standard Fetch API.
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

      if (req.method === "POST" && url.pathname === "/evaluate") {
        const response = await answerEvaluateHandler(req);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      if (req.method === "POST" && url.pathname === "/evaluate-audio") {
        const response = await audioEvaluateHandler(req);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }



      if (req.method === "POST" && url.pathname === "/match-multiple") {
        const response = await multipleJobMatchHandler(req);
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



      // Interview Scheduling Routes
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

      if (req.method === "POST" && url.pathname === "/interviews/suggest-times") {
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

      // Calendar Sync Routes
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

      // AI Recruiter Copilot routes
      if (req.method === "POST" && url.pathname === "/assess-candidate") {
        const response = await recruiterAssessHandler(req);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      if (req.method === "POST" && url.pathname === "/assess-batch") {
        const response = await recruiterBatchAssessHandler(req);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      // High-Volume Processing Queue
      if (req.method === "POST" && url.pathname === "/batch/start") {
        const response = await bulkProcessUploadHandler(req, context);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }
      
      if (req.method === "GET" && url.pathname.startsWith("/batch/status/")) {
        const response = await getBatchStatusHandler(req, context);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      // ATS Integration Routes
      if (req.method === "POST" && url.pathname === "/ats/sync") {
        const response = await atsSyncHandler(req, context);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      // Recruiter State & History
      if (req.method === "GET" && url.pathname === "/recruiter/active-state") {
        const response = await getActiveStateHandler(req, context);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      if (req.method === "POST" && url.pathname === "/recruiter/update-candidate") {
        const response = await updateCandidateHandler(req, context);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      if (req.method === "GET" && url.pathname === "/recruiter/history") {
        const response = await getRecruiterHistoryHandler(req, context);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      // Scorecard Routes
      if (req.method === "POST" && url.pathname === "/scorecards") {
        const response = await submitScorecardHandler(req, context);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      if (req.method === "GET" && url.pathname === "/scorecards") {
        const response = await getScorecardHandler(req, context);
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

      // Privacy & GDPR Routes
      if (req.method === "DELETE" && url.pathname.startsWith("/privacy/candidate/")) {
        const response = await deleteCandidateGdprHandler(req, context);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      if (req.method === "POST" && url.pathname === "/privacy/retention-cron") {
        const response = await runRetentionPolicyHandler(req, context);
        logRequest(req, startTime, response.status);
        return addCors(response);
      }

      // India DPDP 2023 Compliance Routes
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

      const notFoundResponse = new Response(
        JSON.stringify({
          success: false,
          error: "Route not found",
          availableRoutes: [
            "POST /extract-resume - Extract data from a resume PDF",
            "POST /extract-jd - Extract data from a job description PDF",
            "POST /extract-jd-new - Extract job description data in job posting format",
            "POST /extract-jd-streaming - Extract job description data with streaming responses",
            "POST /validate-jd - Validate job description for matching suitability",
            "POST /generate-mcq - Generate MCQ questions based on a job description and resume",
            "POST /generate-voice-questions - Generate voice interview questions based on a job description (JD-only)",
            "POST /match - Match a job description with one or more resumes (supports both 'resume' for single file and 'resumes' for multiple files)",
            "POST /evaluate - Evaluate a text answer for career-related questions",
            "POST /evaluate-audio - Evaluate audio files for emotion and tone analysis",
            "POST /match-multiple - Match multiple job descriptions with multiple resumes with caching support",
            "POST /query-mongo - Execute natural language queries against MongoDB via MCP",
            "GET /mongo-info - Get MongoDB database information and available collections",
            "POST /assess-candidate - AI Recruiter Copilot: Generate evidence-based candidate assessment for a single candidate",
            "POST /assess-batch - AI Recruiter Copilot: Batch assessment for multiple candidates against a job description"
          ]
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );

      logRequest(req, startTime, 404);
      return notFoundResponse;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Unhandled error for ${req.method} ${url.pathname}:`, error);

      const errorResponse = new Response(
        JSON.stringify({
          success: false,
          error: "Internal server error"
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );

      logRequest(req, startTime, 500);
      return errorResponse;
    }
  },
  port: Number(PORT),
});

console.log(`HR Tools server running at http://localhost:${server.port}`);

// Background Job: Process Interview Reminders every minute
setInterval(async () => {
  try {
    await InterviewService.processPendingReminders();
  } catch (error) {
    console.error('[BackgroundJob] Failed to process reminders:', error);
  }
}, 60 * 1000); // 1 minute interval

// Background Job: GDPR Data Retention Scrubber (Runs every 24 hours)
setInterval(async () => {
    try {
      console.log('[BackgroundJob] Running GDPR Data Retention Protocol...');
      await PrivacyService.enforceDataRetention(6); // Scrub profiles older than 6 months
    } catch (error) {
      console.error('[BackgroundJob] Failed to run retention policy:', error);
    }
}, 1000 * 60 * 60 * 24); // 24 hours