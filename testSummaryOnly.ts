/**
 * Test script to verify the summary field in match results
 * This script tests the summary field functionality directly
 */

import { MatchResult } from './services/jobMatcher';

// Test the summary field generation with a mock match result
function testSummaryGeneration() {
  console.log("=== Testing Summary Field Generation ===\n");
  
  // Mock match result with Analysis data
  const mockMatchResult: any = {
    matchScore: 85,
    Analysis: {
      "Matching Score": 85,
      "Experience Threshold Compliance": "Meets the minimum required years of industrial experience (5 years) and exceeds the required domain experience (4 years > 3 years)."
    },
    candidateIndustrialExperienceYears: 5,
    candidateDomainExperienceYears: 4,
    matchedSkillsPercentage: 87,
    unmatchedSkillsPercentage: 13
  };
  
  // Test summary generation for single job match
  console.log("1. Testing summary generation for single job match:");
  if (mockMatchResult.Analysis) {
    mockMatchResult.summary = `This match has a score of ${mockMatchResult.Analysis["Matching Score"] || 0}%. `;
    mockMatchResult.summary += `The candidate has ${mockMatchResult.candidateIndustrialExperienceYears || 0} years of industrial experience `;
    mockMatchResult.summary += `and ${mockMatchResult.candidateDomainExperienceYears || 0} years of domain experience. `;
    mockMatchResult.summary += `They match ${mockMatchResult.matchedSkillsPercentage || 0}% of the required skills. `;
    mockMatchResult.summary += `Experience threshold compliance: ${mockMatchResult.Analysis["Experience Threshold Compliance"] || 'not evaluated'}.`;
  } else {
    mockMatchResult.summary = `This match has a score of ${mockMatchResult.matchScore || 0}%. Detailed criteria evaluation is not available.`;
  }
  
  console.log(`Generated Summary: ${mockMatchResult.summary}`);
  console.log("");
  
  // Test fallback summary generation
  console.log("2. Testing fallback summary generation:");
  const fallbackMatchResult: any = {
    matchScore: 45,
    candidateIndustrialExperienceYears: 2,
    candidateDomainExperienceYears: 1,
    matchedSkillsPercentage: 30
  };
  
  fallbackMatchResult.summary = `This match has a score of ${fallbackMatchResult.matchScore || 0}%. `;
  fallbackMatchResult.summary += `The candidate has ${fallbackMatchResult.candidateIndustrialExperienceYears || 0} years of industrial experience `;
  fallbackMatchResult.summary += `and ${fallbackMatchResult.candidateDomainExperienceYears || 0} years of domain experience. `;
  fallbackMatchResult.summary += `They match ${fallbackMatchResult.matchedSkillsPercentage || 0}% of the required skills. `;
  fallbackMatchResult.summary += `Experience threshold compliance: not evaluated.`;
  
  console.log(`Fallback Summary: ${fallbackMatchResult.summary}`);
  console.log("");
  
  console.log("=== Test Complete ===");
}

// Run the test
testSummaryGeneration();