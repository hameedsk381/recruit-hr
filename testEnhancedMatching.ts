/**
 * Test script to demonstrate the enhanced matching criteria
 * This script shows how the updated matching algorithms evaluate candidates
 * based on recent experience and domain experience requirements
 */

import { JobDescriptionData } from './services/jdExtractor';
import { ResumeData } from './services/resumeExtractor';
import { matchJobWithResume } from './services/jobMatcher';

// Sample job description with domain experience requirements
const sampleJD: JobDescriptionData = {
  title: "Senior Software Engineer",
  company: "TechCorp",
  location: "San Francisco, CA",
  salary: "$120,000 - $150,000",
  requirements: [
    "5+ years of software development experience",
    "Strong proficiency in JavaScript, TypeScript, and Node.js",
    "Experience with cloud platforms (AWS, Azure, or GCP)",
    "Bachelor's degree in Computer Science or related field"
  ],
  responsibilities: [
    "Design and implement scalable backend services",
    "Collaborate with cross-functional teams to deliver high-quality software",
    "Mentor junior developers and contribute to team growth",
    "Participate in code reviews and technical design discussions"
  ],
  skills: [
    "JavaScript",
    "TypeScript",
    "Node.js",
    "AWS",
    "React",
    "MongoDB",
    "Docker",
    "Kubernetes"
  ],
  industrialExperience: [
    "Software development in enterprise environments",
    "Agile/Scrum methodologies",
    "CI/CD pipelines"
  ],
  domainExperience: [
    "Cloud-native application development",
    "Microservices architecture",
    "Distributed systems"
  ],
  requiredIndustrialExperienceYears: 5,
  requiredDomainExperienceYears: 3,
  employmentType: "Full-Time",
  department: "Engineering",
  description: "We are looking for a Senior Software Engineer to join our engineering team..."
};

// Sample resume with sufficient experience
const sufficientExperienceResume: ResumeData = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1 (555) 123-4567",
  skills: [
    "JavaScript",
    "TypeScript",
    "Node.js",
    "AWS",
    "React",
    "MongoDB",
    "Docker"
  ],
  experience: [
    {
      role: "Senior Software Engineer",
      company: "InnovateTech",
      duration: "2022 - Present (2 years)",
      responsibilities: [
        "Led development of microservices architecture on AWS",
        "Implemented CI/CD pipelines reducing deployment time by 60%",
        "Mentored 3 junior developers"
      ]
    },
    {
      role: "Software Engineer",
      company: "CloudSystems",
      duration: "2020 - 2022 (2 years)",
      responsibilities: [
        "Developed cloud-native applications using Node.js and AWS",
        "Optimized database queries improving performance by 40%"
      ]
    },
    {
      role: "Junior Developer",
      company: "StartUpXYZ",
      duration: "2019 - 2020 (1 year)",
      responsibilities: [
        "Built REST APIs using Node.js",
        "Participated in Agile development processes"
      ]
    }
  ],
  education: [
    "B.S. Computer Science, University of Technology (2015-2019)"
  ],
  certifications: [
    "AWS Certified Solutions Architect",
    "MongoDB Certified Developer"
  ],
  industrialExperience: [
    "Software development in enterprise environments",
    "Agile/Scrum methodologies"
  ],
  domainExperience: [
    "Cloud-native application development",
    "Microservices architecture"
  ],
  totalIndustrialExperienceYears: 5,
  totalDomainExperienceYears: 4
};

// Sample resume with insufficient experience
const insufficientExperienceResume: ResumeData = {
  name: "Jane Smith",
  email: "jane.smith@example.com",
  phone: "+1 (555) 987-6543",
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "HTML",
    "CSS"
  ],
  experience: [
    {
      role: "Frontend Developer",
      company: "WebDesign Co.",
      duration: "2023 - Present (1 year)",
      responsibilities: [
        "Developed responsive web applications using React",
        "Collaborated with design team to implement UI/UX"
      ]
    },
    {
      role: "Junior Web Developer",
      company: "SmallBusiness Inc.",
      duration: "2022 - 2023 (1 year)",
      responsibilities: [
        "Created static websites using HTML, CSS, and JavaScript",
        "Maintained existing websites and fixed bugs"
      ]
    }
  ],
  education: [
    "B.S. Computer Science, State University (2018-2022)"
  ],
  certifications: [
    "React Certification"
  ],
  industrialExperience: [
    "Web development in small business environments"
  ],
  domainExperience: [
    "Frontend web development"
  ],
  totalIndustrialExperienceYears: 2,
  totalDomainExperienceYears: 1
};

async function testEnhancedMatching() {
  console.log("=== Enhanced Matching Criteria Test ===\n");
  
  console.log("1. Testing candidate with sufficient experience:");
  try {
    const result1 = await matchJobWithResume(sampleJD, sufficientExperienceResume);
    console.log(`Match Score: ${result1.Analysis["Matching Score"]}`);
    console.log(`Experience Threshold Compliance: ${result1.Analysis["Experience Threshold Compliance"]}`);
    console.log(`Recent Experience Relevance: ${result1.Analysis["Recent Experience Relevance"]}`);
    console.log(`Matched Skills: ${result1.Analysis["Matched Skills"].length}/${sampleJD.skills.length}`);
    console.log("");
  } catch (error) {
    console.error("Error testing sufficient experience candidate:", error.message);
  }
  
  console.log("2. Testing candidate with insufficient experience:");
  try {
    const result2 = await matchJobWithResume(sampleJD, insufficientExperienceResume);
    console.log(`Match Score: ${result2.Analysis["Matching Score"]}`);
    console.log(`Experience Threshold Compliance: ${result2.Analysis["Experience Threshold Compliance"]}`);
    console.log(`Recent Experience Relevance: ${result2.Analysis["Recent Experience Relevance"]}`);
    console.log(`Matched Skills: ${result2.Analysis["Matched Skills"].length}/${sampleJD.skills.length}`);
    console.log("");
  } catch (error) {
    console.error("Error testing insufficient experience candidate:", error.message);
  }
  
  console.log("=== Test Complete ===");
}

// Run the test
testEnhancedMatching().catch(console.error);