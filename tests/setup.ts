import { afterAll, beforeAll } from "bun:test";
import { getMongoDb, initializeMongoClient } from "../utils/mongoClient";

/**
 * Global Test Setup
 * Ensures environment variables are set and DB is ready
 */
beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.MONGODB_DB_NAME = "reckruit_test";
    
    // Ensure DB connection is initialized
    await initializeMongoClient();
    
    const db = getMongoDb();
    if (!db) {
        console.warn("[TestSetup] Database not connected. Tests may fail.");
    }
});

afterAll(async () => {
    // Teardown logic if needed (e.g., dropping test database)
    const db = getMongoDb();
    if (db && process.env.DB_NAME === "reckruit_test") {
        // await db.dropDatabase();
        console.log("[TestSetup] Test database preserved for debugging or cleanup manual.");
    }
});
