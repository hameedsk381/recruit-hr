import { JobDescriptionData } from "./services/jdExtractor";
import { validateJobDescription, getMissingInfoDetails, generateValidationReport } from "./services/jdValidator";

// Test data for a complete job description
const completeJD: JobDescriptionData = {
  title: "Senior Software Engineer",
  company: "Tech Corp",
  location: "San Francisco, CA",
  salary: "", // Salary is not required for validation
  requirements: [
    "5+ years of experience in JavaScript/TypeScript",
    "Experience with React and Node.js",
    "Knowledge of cloud platforms (AWS/GCP)"
  ],
  responsibilities: [
    "Develop and maintain web applications",
    "Collaborate with cross-functional teams",
    "Mentor junior developers"
  ],
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "AWS",
    "Git"
  ],
  industrialExperience: [
    "Software development in agile environments"
  ],
  domainExperience: [
    "Web application development"
  ],
  requiredIndustrialExperienceYears: 5,
  requiredDomainExperienceYears: 3,
  employmentType: "Full-Time",
  department: "Engineering",
  description: "We are looking for an experienced software engineer to join our team."
};

// Test data for an incomplete job description
const incompleteJD: JobDescriptionData = {
  title: "",
  company: "Startup Inc",
  location: "",
  salary: "", // Salary is not required for validation
  requirements: [],
  responsibilities: [],
  skills: ["Python"],
  industrialExperience: [],
  domainExperience: [],
  requiredIndustrialExperienceYears: 0,
  requiredDomainExperienceYears: 0
};

// Test data for a minimal job description
const minimalJD: JobDescriptionData = {
  title: "Data Analyst",
  company: "Analytics Co",
  location: "New York, NY",
  salary: "", // Salary is not required for validation
  requirements: ["Experience with SQL and Python"],
  responsibilities: ["Analyze data and create reports"],
  skills: ["SQL", "Python", "Excel"],
  industrialExperience: [],
  domainExperience: [],
  requiredIndustrialExperienceYears: 2,
  requiredDomainExperienceYears: 0
};

async function testJDValidator() {
  console.log("=== JD Validator Service Tests ===\n");
  
  // Test 1: Complete JD
  console.log("1. Testing Complete Job Description:");
  const completeValidation = validateJobDescription(completeJD);
  console.log("Validation Result:", JSON.stringify(completeValidation, null, 2));
  console.log("Detailed Report:\n", generateValidationReport(completeJD));
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 2: Incomplete JD
  console.log("2. Testing Incomplete Job Description:");
  const incompleteValidation = validateJobDescription(incompleteJD);
  console.log("Validation Result:", JSON.stringify(incompleteValidation, null, 2));
  console.log("Detailed Report:\n", generateValidationReport(incompleteJD));
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 3: Minimal JD
  console.log("3. Testing Minimal Job Description:");
  const minimalValidation = validateJobDescription(minimalJD);
  console.log("Validation Result:", JSON.stringify(minimalValidation, null, 2));
  console.log("Detailed Report:\n", generateValidationReport(minimalJD));
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 4: Missing Info Details
  console.log("4. Missing Info Details for Incomplete JD:");
  const missingInfo = getMissingInfoDetails(incompleteJD);
  console.log("Missing Info:", JSON.stringify(missingInfo, null, 2));
}

// Run the tests
testJDValidator().catch(console.error);