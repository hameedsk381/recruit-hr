import { JobDescriptionData } from "./services/jdExtractor";
import { ResumeData } from "./services/resumeExtractor";
import { matchJobWithResume } from "./services/jobMatcher";

// Sample job description data
const sampleJD: JobDescriptionData = {
  title: "Senior Software Engineer",
  company: "Tech Corp",
  location: "San Francisco, CA",
  salary: "$120,000 - $140,000",
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

// Sample resume data
const sampleResume: ResumeData = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1-555-123-4567",
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Git",
    "Python"
  ],
  experience: [
    "Senior Software Engineer at Previous Company Inc. (2018-2023): Developed web applications using React and Node.js",
    "Software Engineer at Startup Co (2015-2018): Worked on full-stack development projects"
  ],
  education: [
    "B.S. Computer Science, University of Technology"
  ],
  certifications: [
    "AWS Certified Developer",
    "Google Cloud Professional"
  ],
  totalIndustrialExperienceYears: 6,
  totalDomainExperienceYears: 4,
  industrialExperience: [
    "Web development",
    "Agile methodologies"
  ],
  domainExperience: [
    "Frontend development",
    "Backend development"
  ]
};

async function testJobMatchWithSummary() {
  console.log("=== Job Match Summary Test ===\n");
  
  try {
    const matchResult = await matchJobWithResume(sampleJD, sampleResume);
    
    console.log("Match Result:");
    console.log("=============");
    console.log("ID:", matchResult.Id);
    console.log("Match Score:", matchResult.matchScore);
    console.log("Summary:", matchResult.summary);
    
    console.log("\nAnalysis Details:");
    console.log("=================");
    console.log("Matched Skills:", matchResult.matchedSkills?.join(", "));
    console.log("Unmatched Skills:", matchResult.unmatchedSkills?.join(", "));
    console.log("Strengths:", matchResult.strengths?.join(", "));
    console.log("Experience Threshold Compliance:", matchResult.Analysis?.["Experience Threshold Compliance"]);
    
    console.log("\nFull Result Structure:");
    console.log("=====================");
    console.log(JSON.stringify({
      Id: matchResult.Id,
      matchScore: matchResult.matchScore,
      summary: matchResult.summary,
      matchedSkillsCount: matchResult.matchedSkills?.length,
      unmatchedSkillsCount: matchResult.unmatchedSkills?.length
    }, null, 2));
    
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the test
testJobMatchWithSummary();