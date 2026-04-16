
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../utils/mongoClient";
import { OnboardingService } from "../../services/onboardingService";
import { AuthContext } from "../../middleware/authMiddleware";

export async function initiateOnboardingHandler(req: Request, context: AuthContext) {
    const body = await req.json();
    const { candidateId, offerId, startDate } = body;

    const result = await OnboardingService.initiate(
        context.tenantId, 
        candidateId, 
        offerId, 
        new Date(startDate)
    );
    return new Response(JSON.stringify(result), { status: 201 });
}

export async function listOnboardingHandler(req: Request, context: AuthContext) {
    const db = getMongoDb();
    const records = await db.collection('onboarding').find({ tenantId: context.tenantId }).toArray();
    return new Response(JSON.stringify({ success: true, records }), { status: 200 });
}

export async function updateOnboardingTaskHandler(req: Request, context: AuthContext, recordId: string) {
    const body = await req.json();
    const { taskId, status } = body;

    await OnboardingService.updateTaskStatus(context.tenantId, recordId, taskId, status);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
}
