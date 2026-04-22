import { file } from "bun";

const API_BASE = "http://localhost:3005";
const JD_FILENAME = "JD_DevOps_Engineer_1753941369483_21481870-1b30-46ba-8fa5-c3cf2d839412.pdf";
const RESUME_FILENAME = "dummy_resume.txt";

async function runTest() {
    console.log("=== STARTING END-TO-END TEST ===");

    // 1. Extract Job Description
    console.log(`\n[1] Extracting JD from ${JD_FILENAME}...`);
    try {
        const jdFile = file(JD_FILENAME);
        const exists = await jdFile.exists();
        if (!exists) {
            throw new Error(`JD File not found: ${JD_FILENAME}`);
        }

        const fd = new FormData();
        fd.append("jobDescription", jdFile); // Correct key for /extract-jd endpoint

        // Attempting to hit extract-jd or equivalent if it exists, 
        // but based on index.ts viewed earlier:
        // "POST ... /extract-jd ... jdExtractHandler"

        const extractResp = await fetch(`${API_BASE}/extract-jd`, {
            method: "POST",
            body: fd
        });

        if (!extractResp.ok) {
            const errText = await extractResp.text();
            throw new Error(`JD Extraction failed (${extractResp.status}): ${errText}`);
        }

        const jdJson = await extractResp.json();
        console.log("JD Extraction Successful!");
        console.log(`Title: ${jdJson.title}`);
        console.log(`Skills found: ${jdJson.skills?.length}`);

        // 2. Perform Match with Extracted Data
        console.log("\n[2] Matching Resume against Extracted JD Data...");

        const resumeFile = file(RESUME_FILENAME);
        const matchFd = new FormData();
        matchFd.append("resumes", resumeFile);
        matchFd.append("job_description_data", JSON.stringify(jdJson));

        const matchResp = await fetch(`${API_BASE}/match-multiple`, {
            method: "POST",
            body: matchFd
        });

        if (!matchResp.ok) {
            const errText = await matchResp.text();
            throw new Error(`Matching failed (${matchResp.status}): ${errText}`);
        }

        const matchResult = await matchResp.json();
        console.log("Matching Successful!");

        const resultList = matchResult["POST Response"];
        if (Array.isArray(resultList) && resultList.length > 0) {
            const firstMatch = resultList[0];
            console.log("\n--- Match Result ---");
            console.log(`Candidate: ${firstMatch["Resume Data"]?.name}`);
            console.log(`Match Score: ${firstMatch["Analysis"]?.["Matching Score"]}`);
            console.log(`Matched Skills: ${firstMatch["Analysis"]?.["Matched Skills"]?.join(", ")}`);
            console.log(`Analysis Summary: ${firstMatch["Analysis Summary"] || "N/A"}`);
        } else {
            console.log("Warning: No matches returned in the list.");
            console.log(JSON.stringify(matchResult, null, 2));
        }

    } catch (error) {
        console.error("TEST FAILED:", error);
    }
}

runTest();
