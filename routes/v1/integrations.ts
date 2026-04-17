import { getAllIntegrations, getIntegration } from "../../services/integrationRegistry";
import {
  listTenantIntegrations,
  connectIntegration,
  disconnectIntegration,
  getIntegrationStatus,
} from "../../services/integrationService";

interface AuthContext {
  tenantId: string;
  userId: string;
}

export async function listIntegrationsHandler(req: Request, context: AuthContext): Promise<Response> {
  const allDefs = getAllIntegrations();
  const tenantRecords = await listTenantIntegrations(context.tenantId);

  const recordMap = new Map(tenantRecords.map((r) => [r.integrationId, r]));

  const result = allDefs.map((def) => {
    const record = recordMap.get(def.id);
    const status = record?.status === "connected" ? "connected" : "not_connected";
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      docsUrl: def.docsUrl,
      credentialFields: def.credentialFields,
      status,
      connectedAt: record?.status === "connected" ? record.connectedAt : undefined,
    };
  });

  return Response.json({ success: true, integrations: result });
}

export async function connectIntegrationHandler(
  req: Request,
  context: AuthContext,
  integrationId: string
): Promise<Response> {
  const def = getIntegration(integrationId);
  if (!def) {
    return Response.json({ success: false, error: "Integration not found" }, { status: 404 });
  }

  let body: { credentials?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.credentials || typeof body.credentials !== "object") {
    return Response.json({ success: false, error: "credentials object required" }, { status: 400 });
  }

  try {
    const record = await connectIntegration(
      context.tenantId,
      integrationId,
      body.credentials,
      context.userId
    );
    return Response.json({
      success: true,
      integration: { id: integrationId, status: record.status, connectedAt: record.connectedAt },
    });
  } catch (err: any) {
    const status = err.status ?? 500;
    const message = err.message ?? "Internal error";
    console.error("[Integrations] Connect error:", message);
    return Response.json({ success: false, error: message, field: err.field }, { status });
  }
}

export async function disconnectIntegrationHandler(
  req: Request,
  context: AuthContext,
  integrationId: string
): Promise<Response> {
  try {
    await disconnectIntegration(context.tenantId, integrationId);
    return Response.json({ success: true });
  } catch (err: any) {
    const status = err.status ?? 500;
    console.error("[Integrations] Disconnect error:", err.message);
    return Response.json({ success: false, error: err.message }, { status });
  }
}

export async function getIntegrationStatusHandler(
  req: Request,
  context: AuthContext,
  integrationId: string
): Promise<Response> {
  try {
    const statusData = await getIntegrationStatus(context.tenantId, integrationId);
    return Response.json({ success: true, ...statusData });
  } catch (err: any) {
    const status = err.status ?? 500;
    return Response.json({ success: false, error: err.message }, { status });
  }
}
