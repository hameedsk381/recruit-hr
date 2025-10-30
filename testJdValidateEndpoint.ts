/**
 * Test script for the JD Validator endpoint
 * This script demonstrates how to use the /validate-jd endpoint
 */

// Example using a public PDF URL (you would replace this with an actual JD URL)
const testUrl = "https://www.example.com/job_description.pdf";

async function testJdValidateEndpoint() {
  console.log("Testing JD Validator Endpoint\n");
  
  // Example 1: URL-based request
  console.log("1. Testing with URL input:");
  try {
    const urlResponse = await fetch("http://localhost:3001/validate-jd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        job_description_url: testUrl
      })
    });
    
    const urlResult = await urlResponse.json();
    console.log("URL Request Status:", urlResponse.status);
    console.log("URL Response:", JSON.stringify(urlResult, null, 2));
  } catch (error) {
    console.log("URL Request Error:", error.message);
  }
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 2: Show how to use with file upload (commented out since we don't have a file)
  console.log("2. Example file upload request (not executed):");
  console.log(`
curl -X POST http://localhost:3001/validate-jd \\
  -F "job_description=@path/to/your/job_description.pdf"
  `);
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Example 3: Error case - missing URL
  console.log("3. Testing error case (missing URL):");
  try {
    const errorResponse = await fetch("http://localhost:3001/validate-jd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    
    const errorResult = await errorResponse.json();
    console.log("Error Request Status:", errorResponse.status);
    console.log("Error Response:", JSON.stringify(errorResult, null, 2));
  } catch (error) {
    console.log("Error Request Error:", error.message);
  }
}

// Run the test
testJdValidateEndpoint().catch(console.error);