
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../utils/mongoClient";
import { AuthContext } from "../../middleware/authMiddleware";
import { ROLES } from "../../utils/permissions";

export async function listWorkflowsHandler(req: Request, context: AuthContext) {
    const db = getMongoDb();
    const workflows = await db.collection('workflows').find({ tenantId: context.tenantId }).toArray();
    return new Response(JSON.stringify({ success: true, workflows }), { status: 200 });
}

export async function createWorkflowHandler(req: Request, context: AuthContext) {
    if (!context.roles.includes(ROLES.ADMIN)) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 403 });
    }

    const body = await req.json();
    const db = getMongoDb();
    
    const workflow = {
        tenantId: context.tenantId,
        name: body.name,
        trigger: body.trigger,
        nodes: body.nodes || [],
        edges: body.edges || [],
        isActive: body.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const result = await db.collection('workflows').insertOne(workflow);
    return new Response(JSON.stringify({ success: true, id: result.insertedId }), { status: 201 });
}

export async function updateWorkflowHandler(req: Request, context: AuthContext, id: string) {
    if (!context.roles.includes(ROLES.ADMIN)) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 403 });
    }

    const body = await req.json();
    const db = getMongoDb();
    
    const update = {
        ...body,
        updatedAt: new Date()
    };
    delete update._id;
    delete update.tenantId;

    await db.collection('workflows').updateOne(
        { _id: new ObjectId(id), tenantId: context.tenantId },
        { $set: update }
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
}

export async function deleteWorkflowHandler(req: Request, context: AuthContext, id: string) {
    if (!context.roles.includes(ROLES.ADMIN)) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 403 });
    }

    const db = getMongoDb();
    await db.collection('workflows').deleteOne({ _id: new ObjectId(id), tenantId: context.tenantId });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
}
