import { generateToken } from "../utils/auth";
import { getMongoDb } from "../utils/mongoClient";
import { SsoService } from "../services/ssoService";

/**
 * SSO INITIATION HANDLER
 * In a real enterprise app, this would redirect to the IdP (Azure AD, Okta, etc.)
 */
export async function ssoInitHandler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
        return new Response(JSON.stringify({
            success: false,
            error: "tenantId is required to determine the Identity Provider"
        }), { status: 400 });
    }

    // Enterprise Logic: Lookup tenant settings for SSO provider
    const config = await SsoService.getTenantConfig(tenantId);
    
    if (!config) {
        // Fallback or Inform that SSO is not configured for this tenant
        return new Response(JSON.stringify({
            success: false,
            error: "SSO is not configured for this organization. Please contact your administrator."
        }), { status: 404 });
    }

    const redirectUrl = `${config.entryPoint}?tenant=${tenantId}&callback=${encodeURIComponent('https://api.reckruit.ai/v1/auth/sso/callback')}`;

    return new Response(JSON.stringify({
        success: true,
        redirectUrl,
        message: `Redirecting to ${config.provider}...`
    }), { status: 200 });
}

/**
 * SSO CALLBACK HANDLER
 * Receives the SAML/OIDC response from the IdP.
 */
export async function ssoCallbackHandler(req: Request): Promise<Response> {
    try {
        let ssoToken: string | null = null;
        let tenantId: string | null = null;

        const contentType = req.headers.get("content-type") || "";
        
        if (contentType.includes("application/json")) {
            const body = await req.json();
            ssoToken = body.ssoToken || body.SAMLResponse;
            tenantId = body.tenantId;
        } else {
            const formData = await req.formData();
            ssoToken = (formData.get("ssoToken") || formData.get("SAMLResponse")) as string;
            tenantId = formData.get("tenantId") as string;
        }

        if (!ssoToken || !tenantId) {
            return new Response(JSON.stringify({ success: false, error: "Missing ssoToken or tenantId" }), { status: 400 });
        }

        // 1. Verify Assertion
        const userData = await SsoService.verifyAssertion(tenantId, ssoToken);

        // 2. Provision User
        const user = await SsoService.provisionUser(tenantId, userData);
        if (!user) throw new Error("Failed to provision user");

        const token = generateToken({
            userId: user._id.toString(),
            tenantId: user.tenantId,
            email: user.email,
            roles: user.roles || ["recruiter"]
        });

        // 🟢 Enterprise Redirect 🟢
        // Redirect back to the frontend dashboard with the token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = `${frontendUrl}/auth/callback?token=${token}`;

        return Response.redirect(redirectUrl, 302);

    } catch (error: any) {
        console.error('[SSO Callback] Authentication failed:', error.message);
        return new Response(JSON.stringify({ success: false, error: "SSO authentication failed" }), { status: 401 });
    }
}
