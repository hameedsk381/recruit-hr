import { initializeMongoClient, getMongoDb, closeMongoConnection } from "./utils/mongoClient";

async function generateKey() {
    try {
        await initializeMongoClient();
        const db = getMongoDb();
        
        const apiKey = "rk_dev_reckruit_2026_master_key";
        const tenantId = "reckruit-demo";
        const userId = "admin-id";

        await db.collection("api_keys").updateOne(
            { key: apiKey },
            { 
                $set: { 
                    key: apiKey,
                    tenantId,
                    userId,
                    name: "Master Dev Key",
                    status: "active",
                    createdAt: new Date()
                } 
            },
            { upsert: true }
        );

        console.log("------------------------------------------");
        console.log("MASTER API KEY GENERATED SUCCESSFULLY");
        console.log("KEY: " + apiKey);
        console.log("------------------------------------------");

    } catch (error) {
        console.error("Failed to generate key:", error);
    } finally {
        await closeMongoConnection();
    }
}

generateKey();
