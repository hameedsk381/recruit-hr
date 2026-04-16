import { InterviewService } from "../services/interviewService";
import { AuthContext } from "../middleware/authMiddleware";
import { createLogger } from "../utils/logger";
import { WorkflowService } from "../services/workflowService";
import { MeetingService } from "../services/meetingService";
import { z } from "zod";
import type { MeetingPlatform } from "../types/interview";

const InterviewSchema = z.object({
    candidateId: z.string().min(1),
    candidateName: z.string().min(1),
    candidateEmail: z.string().email(),
    jobId: z.string().min(1),
    jobTitle: z.string().min(1),
    startTime: z.string().datetime(),
    type: z.string().optional(),
    platform: z.enum(['google_meet', 'zoom', 'teams', 'slack', 'other']).optional(),
    notes: z.string().optional(),
    focusAreas: z.array(z.string()).optional()
});

/**
 * Handle listing and scheduling interviews
 */
export async function listInterviewsHandler(req: Request, context: AuthContext): Promise<Response> {
    const logger = createLogger(crypto.randomUUID(), 'InterviewHandler', context.tenantId, context.userId);

    try {
        const interviews = await InterviewService.getTenantInterviews(context.tenantId);
        return new Response(JSON.stringify({ success: true, interviews }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        logger.error('Failed to list interviews', error as Error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to list interviews' }), { status: 500 });
    }
}

export async function scheduleInterviewHandler(req: Request, context: AuthContext): Promise<Response> {
    const logger = createLogger(crypto.randomUUID(), 'InterviewHandler', context.tenantId, context.userId);

    try {
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        // PRODUCTION READINESS: Strict validation and tenant enforcement
        let validatedData;
        try {
            validatedData = InterviewSchema.parse(body);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return new Response(JSON.stringify({ success: false, error: 'Validation failed', details: error.issues }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            throw error;
        }
        const { candidateId, candidateName, candidateEmail, jobId, jobTitle, startTime, type, platform, notes, focusAreas } = validatedData;

        const startTimeDate = new Date(startTime);
        const endTimeDate = new Date(startTimeDate.getTime() + 60 * 60 * 1000); // Default 1 hour

        const meetingPlatform: MeetingPlatform = platform || 'google_meet';
        const meetingResult = await MeetingService.createMeeting({
            platform: meetingPlatform,
            title: `Interview: ${candidateName} for ${jobTitle}`,
            startTime: startTimeDate.toISOString(),
            endTime: endTimeDate.toISOString(),
            tenantId: context.tenantId
        });

        const interview = await InterviewService.scheduleInterview({
            candidateId,
            candidateName,
            candidateEmail,
            jobId,
            jobTitle,
            tenantId: context.tenantId,
            startTime: startTimeDate.toISOString(),
            endTime: endTimeDate.toISOString(),
            status: 'scheduled',
            type,
            meetingPlatform: meetingPlatform,
            meetingLink: meetingResult.meetingLink,
            meetingId: meetingResult.meetingId,
            notes,
            recruiterId: context.userId,
            focusAreas
        });

        // Trigger Workflow Event
        await WorkflowService.triggerEvent({
            type: 'INTERVIEW_CONFIRMED',
            tenantId: context.tenantId,
            payload: {
                candidateName,
                startTime: startTimeDate.toLocaleString(),
                recruiterEmail: context.email
            }
        });

        return new Response(JSON.stringify({ success: true, interview }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        logger.error('Failed to schedule interview', error as Error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to schedule interview' }), { status: 500 });
    }
}

export async function suggestTimesHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const { candidateId } = body;
        const suggestions = await InterviewService.suggestInterviewTimes(candidateId, context.tenantId, context.userId);
        return new Response(JSON.stringify({ success: true, suggestions }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: 'Failed to suggest times' }), { status: 500 });
    }
}

export async function cancelInterviewHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const { id } = body;
        const success = await InterviewService.cancelInterview(id, context.tenantId);
        return new Response(JSON.stringify({ success }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: 'Failed to cancel interview' }), { status: 500 });
    }
}

export async function rescheduleInterviewHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const { id, startTime } = body;
        const startTimeDate = new Date(startTime);
        const endTimeDate = new Date(startTimeDate.getTime() + 60 * 60 * 1000);

        const success = await InterviewService.rescheduleInterview(
            id,
            context.tenantId,
            startTimeDate.toISOString(),
            endTimeDate.toISOString()
        );

        return new Response(JSON.stringify({ success }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: 'Failed to reschedule interview' }), { status: 500 });
    }
}
