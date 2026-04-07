import { generateToken } from "../utils/auth";

/**
 * MOCK LOGIN HANDLER
 * In a production app, verify email/password against a DB first.
 */
export async function loginHandler(req: Request): Promise<Response> {
    try {
        const { email, password, tenantId } = await req.json();

        // MOCK VALIDATION: Any password works for 'admin@docapture.com'
        // This is just to facilitate the transition to JWT.
        if (!email || !tenantId) {
            return new Response(JSON.stringify({
                success: false,
                error: "Email and tenantId are required"
            }), { status: 400 });
        }

        const token = generateToken({
            userId: "user_" + Math.random().toString(36).substr(2, 9),
            tenantId: tenantId,
            email: email,
            roles: ["user", "recruiter"]
        });

        return new Response(JSON.stringify({
            success: true,
            token,
            user: { email, tenantId }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: "Invalid request body"
        }), { status: 400 });
    }
}
