import { AgencyService } from "../../services/agencyService";
import { getMongoDb } from "../../utils/mongoClient";

interface AuthContext {
  tenantId: string;
  userId: string;
  roles?: string[];
}

async function assertAgency(tenantId: string): Promise<Response | null> {
  const db = getMongoDb();
  const tenant = await db.collection("tenants").findOne({ tenantId });
  if (!tenant?.isAgency) {
    return Response.json(
      { success: false, error: "This endpoint requires an agency account" },
      { status: 403 }
    );
  }
  return null;
}

export async function listClientsHandler(req: Request, context: AuthContext): Promise<Response> {
  const forbidden = await assertAgency(context.tenantId);
  if (forbidden) return forbidden;

  const clients = await AgencyService.listClients(context.tenantId);
  return Response.json({ success: true, clients });
}

export async function addClientHandler(req: Request, context: AuthContext): Promise<Response> {
  const forbidden = await assertAgency(context.tenantId);
  if (forbidden) return forbidden;

  let body: { tenantId?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.tenantId || !body.name) {
    return Response.json({ success: false, error: "tenantId and name are required" }, { status: 400 });
  }

  try {
    const db = getMongoDb();
    await db.collection("tenants").updateOne(
      { tenantId: body.tenantId },
      { $set: { tenantId: body.tenantId, name: body.name } },
      { upsert: true }
    );
    await AgencyService.addClient(context.tenantId, body.tenantId);
    return Response.json({ success: true });
  } catch (err: any) {
    console.error("[Agency] addClient error:", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function removeClientHandler(
  req: Request,
  context: AuthContext,
  clientTenantId: string
): Promise<Response> {
  const forbidden = await assertAgency(context.tenantId);
  if (forbidden) return forbidden;

  const db = getMongoDb();
  const result = await db.collection("tenants").updateOne(
    { tenantId: clientTenantId, parentId: context.tenantId },
    { $unset: { parentId: "" } }
  );

  if (result.matchedCount === 0) {
    return Response.json({ success: false, error: "Client not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
