/**
 * Test script to verify the summary field in match results
 * This script tests both single and multiple job matching with summary fields
 */

import { JobDescriptionData } from './services/jdExtractor';
import { ResumeData } from './services/resumeExtractor';
import { matchJobWithResume } from './services/jobMatcher';
import { matchMultipleJDsWithMultipleResumes } from './services/multipleJobMatcher';

// Sample job description
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

// Sample resume
const sampleResume: ResumeData = {
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

async function testSummaryField() {
  console.log("=== Testing Summary Field in Match Results ===\n");
  
  // Test single job matching
  console.log("1. Testing single job matching with summary field:");
  try {
    const singleMatchResult = await matchJobWithResume(sampleJD, sampleResume);
    console.log(`Match Score: ${singleMatchResult.matchScore}`);
    console.log(`Summary: ${singleMatchResult.summary}`);
    console.log("");
  } catch (error) {
    console.error("Error in single job matching:", error.message);
  }
  
  // Test multiple job matching
  console.log("2. Testing multiple job matching with summary field:");
  try {
    // Create mock file objects for testing
    const mockJdFile = new File([JSON.stringify(sampleJD)], 'sample_jd.pdf', { type: 'application/pdf' });
    const mockResumeFile = new File([JSON.stringify(sampleResume)], 'sample_resume.pdf', { type: 'application/pdf' });
    
    const multipleMatchResults = await matchMultipleJDsWithMultipleResumes({
      jdFiles: [mockJdFile],
      resumeFiles: [mockResumeFile]
    });
    
    if (multipleMatchResults.length > 0) {
      console.log(`Match Score: ${multipleMatchResults[0].matchScore}`);
      console.log(`Summary: ${multipleMatchResults[0].summary}`);
    } else {
      console.log("No matches found");
    }
    console.log("");
  } catch (error) {
    console.error("Error in multiple job matching:", error.message);
  }
  
  console.log("=== Test Complete ===");
}

// Run the test
testSummaryField().catch(console.error);