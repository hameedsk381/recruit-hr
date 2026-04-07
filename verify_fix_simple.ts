import { file } from "bun";

const API_URL = "http://localhost:3001/match-multiple";

async function testFix() {
    const formData = new FormData();

    // 1. Add Resume File
    const resumeFile = file("dummy_resume.txt");
    formData.append("resumes", resumeFile);

    // 2. Add Job Description Data (JSON)
    const jdData = {
        title: "Senior Software Engineer",
        company: "Test Company",
        location: "Remote",
        skills: ["TypeScript", "React", "Node.js"],
        requirements: ["3+ years of experience", "Strong TypeScript skills"],
        responsibilities: ["Build web apps"],
        requiredIndustrialExperienceYears: 3,
        requiredDomainExperienceYears: 2,
        employmentType: "Full-Time",
        description: "Looking for a senior engineer."
    };

    formData.append("job_description_data", JSON.stringify(jdData));

    console.log("Sending request to", API_URL);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData,
        });

        const text = await response.text();
        console.log("Status:", response.status);

        if (response.ok) {
            console.log("Success! Response preview:", text.substring(0, 500));
            try {
                const json = JSON.parse(text);
                console.log("Matches found:", json["POST Response"]?.length);
            } catch (e) {
                console.error("Failed to parse JSON response");
            }
        } else {
            console.error("Failed! Response:", text);
        }

    } catch (error) {
        console.error("Error sending request:", error);
    }
}

testFix();
