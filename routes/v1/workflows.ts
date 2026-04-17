
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

// ─── Activate Workflow ────────────────────────────────────────────────────────

export async function activateWorkflowHandler(
  req: Request,
  context: { tenantId: string }
): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /v1/workflows/:id/activate → id is second-to-last segment
  const id = pathParts[pathParts.length - 2];

  if (!id) {
    return Response.json({ success: false, error: "Workflow ID required" }, { status: 400 });
  }

  let body: { active?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.active !== "boolean") {
    return Response.json({ success: false, error: "active (boolean) required in body" }, { status: 400 });
  }

  const db = getMongoDb();
  const result = await db.collection("workflows").updateOne(
    { _id: new ObjectId(id), tenantId: context.tenantId },
    { $set: { isActive: body.active, updatedAt: new Date() }, $inc: { version: 1 } }
  );

  if (result.matchedCount === 0) {
    return Response.json({ success: false, error: "Workflow not found" }, { status: 404 });
  }

  return Response.json({ success: true, isActive: body.active });
}

// ─── Workflow History ─────────────────────────────────────────────────────────

export async function getWorkflowHistoryHandler(
  req: Request,
  context: { tenantId: string }
): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /v1/workflows/:id/history → id is second-to-last segment
  const id = pathParts[pathParts.length - 2];

  if (!id) {
    return Response.json({ success: false, error: "Workflow ID required" }, { status: 400 });
  }

  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
  const statusFilter = url.searchParams.get("status");

  const db = getMongoDb();
  const filter: Record<string, unknown> = {
    tenantId: context.tenantId,
    workflowId: new ObjectId(id),
  };
  if (statusFilter) filter.status = statusFilter;

  const runs = await db
    .collection("workflow_runs")
    .find(filter)
    .sort({ startedAt: -1 })
    .limit(limit)
    .toArray();

  return Response.json({ success: true, runs });
}

// ─── Single Run Detail ────────────────────────────────────────────────────────

export async function getWorkflowRunHandler(
  req: Request,
  context: { tenantId: string }
): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /v1/workflows/runs/:runId → runId is last segment
  const runId = pathParts[pathParts.length - 1];

  if (!runId) {
    return Response.json({ success: false, error: "Run ID required" }, { status: 400 });
  }

  const db = getMongoDb();
  const run = await db
    .collection("workflow_runs")
    .findOne({ _id: new ObjectId(runId), tenantId: context.tenantId });

  if (!run) {
    return Response.json({ success: false, error: "Run not found" }, { status: 404 });
  }

  return Response.json({ success: true, run });
}
