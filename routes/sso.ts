import { generateToken } from "../utils/auth";
import { getMongoDb } from "../utils/mongoClient";

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
    // For this demonstration, we'll simulate a redirect to a mock SSO page
    const mockSsoUrl = `https://sso.mock-enterprise.com/login?tenant=${tenantId}&callback=${encodeURIComponent('http://localhost:3000/sso-callback')}`;

    return new Response(JSON.stringify({
        success: true,
        redirectUrl: mockSsoUrl,
        message: "SSO redirection metadata prepared"
    }), { status: 200 });
}

/**
 * SSO CALLBACK HANDLER
 * Receives the SAML/OIDC response from the IdP.
 */
export async function ssoCallbackHandler(req: Request): Promise<Response> {
    try {
        const body = await req.json();
        // In reality, you'd verify a SAML assertion or OIDC ID Token here.
        const { ssoToken, tenantId } = body;

        if (!ssoToken || !tenantId) {
            return new Response(JSON.stringify({
                success: false,
                error: "Invalid SSO callback payload"
            }), { status: 400 });
        }

        // Mock verification logic: if token is "valid_enterprise_user", we log them in.
        if (ssoToken !== 'valid_enterprise_user') {
            return new Response(JSON.stringify({
                success: false,
                error: "SSO authentication failed"
            }), { status: 401 });
        }

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({ error: "DB Unavailable" }), { status: 503 });

        // Auto-provision or find user
        const email = "enterprise-user@company.com";
        const usersDb = db.collection('users');
        let user = await usersDb.findOne({ email, tenantId });

        if (!user) {
            const newUser = {
                email,
                tenantId,
                name: "Enterprise User",
                roles: ["recruiter"], // Default role for SSO users
                ssoFederated: true,
                createdAt: new Date().toISOString()
            };
            const result = await usersDb.insertOne(newUser);
            user = { _id: result.insertedId, ...newUser };
        }

        const token = generateToken({
            userId: user._id.toString(),
            tenantId: user.tenantId,
            email: user.email,
            roles: user.roles || ["recruiter"]
        });

        return new Response(JSON.stringify({
            success: true,
            token,
            user: { email: user.email, tenantId: user.tenantId, roles: user.roles, id: user._id }
        }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: "SSO processing failed" }), { status: 500 });
    }
}
