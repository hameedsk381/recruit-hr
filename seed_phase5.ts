
import { APIKeyService } from "./services/apiKeyService";
import { initializeMongoClient, closeMongoConnection } from "./utils/mongoClient";

async function seedPhase5() {
    try {
        await initializeMongoClient();
        console.log("Seeding Phase 5 data...");

        const tenantId = "reckruit-demo";
        const userId = "admin-id";

        // Seed API Keys
        await APIKeyService.generateKey(tenantId, "Main Website Integration", userId, ["all"]);
        await APIKeyService.generateKey(tenantId, "Slack Bot", userId, ["notifications"]);
        await APIKeyService.generateKey(tenantId, "Reporting Service", userId, ["analytics"]);

        // Seed Agency relationship
        const db = (await import("./utils/mongoClient")).getMongoDb();
        await db.collection("tenants").updateOne(
            { tenantId: "agency-reckruit" },
            { $set: { name: "Reckruit Global RPO", isAgency: true, createdAt: new Date() } },
            { upsert: true }
        );
        await db.collection("tenants").updateOne(
            { tenantId: "reckruit-demo" },
            { $set: { parentId: "agency-reckruit" } }
        );

        console.log("Phase 5 seeding completed!");
    } catch (e) {
        console.error(e);
    } finally {
        await closeMongoConnection();
    }
}

seedPhase5();
