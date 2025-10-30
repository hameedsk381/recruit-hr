import { JobDescriptionData } from "./services/jdExtractor";
import { validateJobDescription, generateValidationReport } from "./services/jdValidator";

// Example job description that demonstrates the JD validation criteria (without salary)
const exampleJD: JobDescriptionData = {
  title: "Senior Software Engineer",
  company: "Tech Innovations Inc.",
  location: "San Francisco, CA",
  salary: "", // Salary is not required for validation
  requirements: [
    "5+ years of experience in software development",
    "Strong proficiency in JavaScript, Python, and Go",
    "Experience with cloud platforms (AWS, GCP)",
    "Bachelor's degree in Computer Science or related field"
  ],
  responsibilities: [
    "Design and implement scalable software solutions",
    "Collaborate with cross-functional teams to define and deliver new features",
    "Mentor junior developers and conduct code reviews",
    "Participate in architectural decisions and technical planning"
  ],
  skills: [
    "JavaScript",
    "Python",
    "Go",
    "React",
    "Node.js",
    "AWS",
    "Docker",
    "Kubernetes"
  ],
  industrialExperience: [
    "Software development in agile environments",
    "Full-stack development experience"
  ],
  domainExperience: [
    "Cloud computing and distributed systems",
    "Microservices architecture"
  ],
  requiredIndustrialExperienceYears: 5,
  requiredDomainExperienceYears: 3,
  employmentType: "Full-Time",
  department: "Engineering",
  description: "We are looking for an experienced Senior Software Engineer to join our team."
};

// Example of an incomplete JD that doesn't meet all validation criteria
const incompleteJD: JobDescriptionData = {
  title: "",
  company: "Startup Co",
  location: "",
  salary: "", // Salary is not required for validation
  requirements: [],
  responsibilities: [],
  skills: ["JavaScript"],
  industrialExperience: [],
  domainExperience: [],
  requiredIndustrialExperienceYears: 0,
  requiredDomainExperienceYears: 0
};

function testJdValidationCriteria() {
  console.log("=== JD Validation Criteria Test ===\n");
  
  // Test complete JD
  console.log("1. Testing Complete Job Description (without salary):");
  console.log("===================================================");
  const completeValidation = validateJobDescription(exampleJD);
  console.log("Validation Result:");
  console.log(JSON.stringify({
    isValid: completeValidation.isValid,
    isComplete: completeValidation.isComplete,
    suitabilityScore: completeValidation.suitabilityScore,
    jdQualityAssessment: completeValidation.jdQualityAssessment,
    validationCriteria: completeValidation.validationCriteria
  }, null, 2));
  
  console.log("\nDetailed Report:");
  console.log(generateValidationReport(exampleJD));
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test incomplete JD
  console.log("2. Testing Incomplete Job Description:");
  console.log("=======================================");
  const incompleteValidation = validateJobDescription(incompleteJD);
  console.log("Validation Result:");
  console.log(JSON.stringify({
    isValid: incompleteValidation.isValid,
    isComplete: incompleteValidation.isComplete,
    suitabilityScore: incompleteValidation.suitabilityScore,
    jdQualityAssessment: incompleteValidation.jdQualityAssessment,
    validationCriteria: incompleteValidation.validationCriteria
  }, null, 2));
  
  console.log("\nDetailed Report:");
  console.log(generateValidationReport(incompleteJD));
}

// Run the test
testJdValidationCriteria();