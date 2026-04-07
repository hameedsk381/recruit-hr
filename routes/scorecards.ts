import { ScorecardService } from "../services/scorecardService";
import { AuthContext } from "../middleware/authMiddleware";

/**
 * Submit a scorecard for an interview
 */
export async function submitScorecardHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const body = await req.json();
        const {
            interviewId,
            candidateId,
            candidateName,
            jobId,
            jobTitle,
            ratings,
            overallScore,
            recommendation,
            strengths,
            areasForImprovement,
            additionalNotes
        } = body;

        const scorecard = await ScorecardService.submitScorecard({
            interviewId,
            candidateId,
            candidateName,
            jobId,
            jobTitle,
            evaluatorId: context.userId,
            evaluatorName: body.evaluatorName || 'Hiring Manager',
            ratings,
            overallScore,
            recommendation,
            strengths,
            areasForImprovement,
            additionalNotes
        });

        return new Response(JSON.stringify({ success: true, scorecard }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to submit scorecard', error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to submit scorecard' }), { status: 500 });
    }
}

/**
 * Get scorecard for an interview
 */
export async function getScorecardHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const url = new URL(req.url);
        const interviewId = url.searchParams.get('interviewId');

        if (!interviewId) {
            return new Response(JSON.stringify({ success: false, error: 'Missing interviewId' }), { status: 400 });
        }

        const scorecard = await ScorecardService.getScorecardByInterview(interviewId);

        return new Response(JSON.stringify({ success: true, scorecard }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to get scorecard', error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to get scorecard' }), { status: 500 });
    }
}

/**
 * Get all scorecards for a candidate
 */
export async function getCandidateScorecardsHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const url = new URL(req.url);
        const candidateId = url.searchParams.get('candidateId');

        if (!candidateId) {
            return new Response(JSON.stringify({ success: false, error: 'Missing candidateId' }), { status: 400 });
        }

        const scorecards = await ScorecardService.getCandidateScorecards(candidateId);

        return new Response(JSON.stringify({ success: true, scorecards }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to get candidate scorecards', error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to get scorecards' }), { status: 500 });
    }
}

/**
 * Synthesize all scorecards for a candidate using AI
 */
export async function synthesizeScorecardsHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const url = new URL(req.url);
        const candidateId = url.searchParams.get('candidateId');

        if (!candidateId) {
            return new Response(JSON.stringify({ success: false, error: 'Missing candidateId' }), { status: 400 });
        }

        const synthesis = await ScorecardService.synthesizeScorecards(candidateId);

        return new Response(JSON.stringify({ success: true, synthesis }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to synthesize scorecards', error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to synthesize scorecards' }), { status: 500 });
    }
}
