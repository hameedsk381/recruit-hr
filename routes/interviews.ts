import { InterviewService } from "../services/interviewService";
import { AuthContext } from "../middleware/authMiddleware";
import { createLogger } from "../utils/logger";

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
        const body = await req.json();
        const { candidateId, candidateName, candidateEmail, jobId, jobTitle, startTime, type, notes, focusAreas } = body;

        const startTimeDate = new Date(startTime);
        const endTimeDate = new Date(startTimeDate.getTime() + 60 * 60 * 1000); // Default 1 hour

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
            notes,
            recruiterId: context.userId,
            focusAreas,
            meetingLink: `https://meet.talentacquisition.ai/${crypto.randomUUID().slice(0, 8)}`
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
        const { candidateId } = await req.json();
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
        const { id } = await req.json();
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
        const { id, startTime } = await req.json();
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
