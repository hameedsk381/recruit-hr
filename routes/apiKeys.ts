
import { APIKeyService } from "../services/apiKeyService";

export async function listAPIKeysHandler(req: Request, context: any) {
    try {
        const keys = await APIKeyService.listKeys(context.tenantId);
        return new Response(JSON.stringify({ success: true, keys }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
}

export async function createAPIKeyHandler(req: Request, context: any) {
    try {
        const { name, scopes } = await req.json();
        if (!name) {
            return new Response(JSON.stringify({ success: false, error: "Name is required" }), { status: 400 });
        }
        const result = await APIKeyService.generateKey(context.tenantId, name, context.userId, scopes);
        return new Response(JSON.stringify({ success: true, ...result }), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
}

export async function revokeAPIKeyHandler(req: Request, context: any, id: string) {
    try {
        const success = await APIKeyService.revokeKey(context.tenantId, id);
        return new Response(JSON.stringify({ success }), {
            status: success ? 200 : 404,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
}
