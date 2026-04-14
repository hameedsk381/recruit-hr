import { generateToken } from "../utils/auth";
import { getMongoDb } from "../utils/mongoClient";
import bcrypt from "bcrypt";

/**
 * PRODUCTION LOGIN HANDLER
 * Validates against MongoDB users collection using bcrypt.
 */
export async function loginHandler(req: Request): Promise<Response> {
    try {
        const { email, password, tenantId } = await req.json();

        if (!email || !password || !tenantId) {
            return new Response(JSON.stringify({
                success: false,
                error: "Email, password, and tenantId are required"
            }), { status: 400 });
        }

        const db = getMongoDb();
        if (!db) {
            return new Response(JSON.stringify({ error: "Database unavailable" }), { status: 503 });
        }

        const usersDb = db.collection('users');
        let user = await usersDb.findOne({ email, tenantId });

        // Auto-provision default admins if they don't exist yet (for demo/development convenience)
        if (!user && (email === 'admin@docapture.com' || email === 'admin@talentacquisition.ai')) {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = {
                email,
                tenantId,
                passwordHash: hashedPassword,
                roles: ["user", "recruiter", "admin"],
                createdAt: new Date().toISOString()
            };
            const result = await usersDb.insertOne(newUser);
            user = { _id: result.insertedId, ...newUser };
        } else if (!user) {
             return new Response(JSON.stringify({
                success: false,
                error: "Invalid email or password"
            }), { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash || "");
        if (!isPasswordValid) {
            return new Response(JSON.stringify({
                success: false,
                error: "Invalid email or password"
            }), { status: 401 });
        }

        const token = generateToken({
            userId: user._id.toString(),
            tenantId: user.tenantId,
            email: user.email,
            roles: user.roles || ["user", "recruiter"]
        });

        return new Response(JSON.stringify({
            success: true,
            token,
            user: { email: user.email, tenantId: user.tenantId, roles: user.roles, id: user._id }
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

/**
 * PRODUCTION REGISTER HANDLER
 * Registers a new user.
 */
export async function registerHandler(req: Request): Promise<Response> {
    try {
        const { email, password, tenantId, name } = await req.json();
        if (!email || !password || !tenantId) return new Response(JSON.stringify({error: "Missing fields"}), {status: 400});

        const db = getMongoDb();
        if (!db) return new Response(JSON.stringify({error: "Database unavailable"}), {status: 503});

        const usersDb = db.collection('users');
        const existing = await usersDb.findOne({ email, tenantId });
        if (existing) return new Response(JSON.stringify({error: "User already exists"}), {status: 409});

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = {
            email, tenantId, name, passwordHash, roles: ["user"], createdAt: new Date().toISOString()
        };
        const result = await usersDb.insertOne(newUser);
        
        return new Response(JSON.stringify({success: true, userId: result.insertedId}), {status: 201});
    } catch(err) {
        return new Response(JSON.stringify({error: "Registration failed"}), {status: 400});
    }
}
