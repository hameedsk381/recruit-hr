import { JobDescriptionData } from "./services/jdExtractor";
import { ResumeData } from "./services/resumeExtractor";
import { matchJobWithResume } from "./services/jobMatcher";

// Sample job description that requires domain experience
const pythonJd: JobDescriptionData = {
  title: "Senior Python Developer",
  company: "Tech Corp",
  location: "San Francisco, CA",
  salary: "$120,000 - $140,000",
  requirements: [
    "5+ years of experience in Python development",
    "Experience with Django and Flask frameworks",
    "Knowledge of cloud platforms (AWS/GCP)"
  ],
  responsibilities: [
    "Develop and maintain Python applications",
    "Collaborate with cross-functional teams",
    "Mentor junior developers"
  ],
  skills: [
    "Python",
    "Django",
    "Flask",
    "AWS",
    "Git"
  ],
  industrialExperience: [
    "Software development in agile environments"
  ],
  domainExperience: [
    "Python development",
    "Web application development"
  ],
  requiredIndustrialExperienceYears: 5,
  requiredDomainExperienceYears: 5, // Requires 5 years of Python/domain experience
  employmentType: "Full-Time",
  department: "Engineering",
  description: "We are looking for an experienced Python developer with 5+ years of domain experience."
};

// Sample resume with insufficient domain experience
const insufficientExperienceResume: ResumeData = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1-555-123-4567",
  skills: [
    "Python",
    "Django",
    "Flask",
    "AWS",
    "Git"
  ],
  experience: [
    "Senior Software Engineer at Previous Company Inc. (2020-2023): Developed web applications using Python and Django",
    "Software Engineer at Startup Co (2018-2020): Worked on full-stack development projects"
  ],
  education: [
    "B.S. Computer Science, University of Technology"
  ],
  certifications: [
    "AWS Certified Developer"
  ],
  totalIndustrialExperienceYears: 5, // Meets industrial experience requirement
  totalDomainExperienceYears: 3, // Does NOT meet domain experience requirement (needs 5)
  industrialExperience: [
    "Web development",
    "Agile methodologies"
  ],
  domainExperience: [
    "Python development",
    "Web application development"
  ]
};

// Sample resume with sufficient domain experience
const sufficientExperienceResume: ResumeData = {
  name: "Jane Smith",
  email: "jane.smith@example.com",
  phone: "+1-555-987-6543",
  skills: [
    "Python",
    "Django",
    "Flask",
    "AWS",
    "Git",
    "FastAPI"
  ],
  experience: [
    "Senior Python Developer at Python Specialist Inc. (2019-2024): Developed Python applications using Django and Flask",
    "Python Developer at Tech Startup (2017-2019): Built web applications with Python frameworks",
    "Software Engineer at Previous Company (2015-2017): Worked on Python projects"
  ],
  education: [
    "M.S. Computer Science, University of Technology"
  ],
  certifications: [
    "AWS Certified Developer",
    "Python Institute Certification"
  ],
  totalIndustrialExperienceYears: 9, // Exceeds industrial experience requirement
  totalDomainExperienceYears: 7, // Exceeds domain experience requirement
  industrialExperience: [
    "Software development",
    "Web development",
    "Agile methodologies"
  ],
  domainExperience: [
    "Python development",
    "Web application development",
    "API development"
  ]
};

async function testDomainExperienceMatching() {
  console.log("=== Domain Experience Matching Test ===\n");
  
  try {
    // Test 1: Resume with insufficient domain experience
    console.log("1. Testing resume with INSUFFICIENT domain experience:");
    console.log("====================================================");
    const matchResult1 = await matchJobWithResume(pythonJd, insufficientExperienceResume);
    
    console.log("Match Result:");
    console.log("- Match Score:", matchResult1.matchScore);
    console.log("- Required Domain Experience:", pythonJd.requiredDomainExperienceYears, "years");
    console.log("- Candidate Domain Experience:", insufficientExperienceResume.totalDomainExperienceYears, "years");
    console.log("- Matched Skills:", matchResult1.matchedSkills?.join(", "));
    console.log("- Unmatched Skills:", matchResult1.unmatchedSkills?.join(", "));
    console.log("- Summary:", matchResult1.summary);
    
    // Test 2: Resume with sufficient domain experience
    console.log("\n2. Testing resume with SUFFICIENT domain experience:");
    console.log("===================================================");
    const matchResult2 = await matchJobWithResume(pythonJd, sufficientExperienceResume);
    
    console.log("Match Result:");
    console.log("- Match Score:", matchResult2.matchScore);
    console.log("- Required Domain Experience:", pythonJd.requiredDomainExperienceYears, "years");
    console.log("- Candidate Domain Experience:", sufficientExperienceResume.totalDomainExperienceYears, "years");
    console.log("- Matched Skills:", matchResult2.matchedSkills?.join(", "));
    console.log("- Unmatched Skills:", matchResult2.unmatchedSkills?.join(", "));
    console.log("- Summary:", matchResult2.summary);
    
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the test
testDomainExperienceMatching();