import { JobDescriptionData } from "./jdExtractor";

export interface JDValidationResult {
  isValid: boolean;
  isComplete: boolean;
  errors: string[];
  warnings: string[];
  missingCriticalFields: string[];
  missingRecommendedFields: string[];
  documentType: 'job_description' | 'resume' | 'other' | 'invalid';
  suitabilityScore: number; // 0-100 score for matching suitability
  // Added fields for JD validation criteria
  validationCriteria: {
    roleClarity: boolean;
    skillsClarity: boolean;
    responsibilitiesClarity: boolean;
    experienceClarity: boolean;
    workContextClarity: boolean;
  };
  jdQualityAssessment: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface JDMissingInfo {
  critical: {
    title: boolean;
    company: boolean;
    skills: boolean;
    requirements: boolean;
  };
  recommended: {
    location: boolean;
    salary: boolean;
    responsibilities: boolean;
    industrialExperience: boolean;
    domainExperience: boolean;
    requiredIndustrialExperienceYears: boolean;
    requiredDomainExperienceYears: boolean;
    employmentType: boolean;
    department: boolean;
  };
}

/**
 * Validates if a job description document is suitable for matching
 * @param jdData The extracted job description data
 * @returns Validation result with missing info details
 */
export function validateJobDescription(jdData: JobDescriptionData): JDValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingCriticalFields: string[] = [];
  const missingRecommendedFields: string[] = [];
  
  // Check if this looks like a job description
  const documentType = determineDocumentType(jdData);
  
  if (documentType === 'invalid') {
    return {
      isValid: false,
      isComplete: false,
      errors: ['Document does not appear to be a valid job description'],
      warnings: [],
      missingCriticalFields: [],
      missingRecommendedFields: [],
      documentType: 'invalid',
      suitabilityScore: 0,
      validationCriteria: {
        roleClarity: false,
        skillsClarity: false,
        responsibilitiesClarity: false,
        experienceClarity: false,
        workContextClarity: false
      },
      jdQualityAssessment: 'Poor'
    };
  }
  
  if (documentType === 'resume') {
    return {
      isValid: false,
      isComplete: false,
      errors: ['Document appears to be a resume, not a job description'],
      warnings: [],
      missingCriticalFields: [],
      missingRecommendedFields: [],
      documentType: 'resume',
      suitabilityScore: 0,
      validationCriteria: {
        roleClarity: false,
        skillsClarity: false,
        responsibilitiesClarity: false,
        experienceClarity: false,
        workContextClarity: false
      },
      jdQualityAssessment: 'Poor'
    };
  }
  
  // Check critical fields for matching
  if (!jdData.title || jdData.title.trim() === '') {
    errors.push('Job title is missing');
    missingCriticalFields.push('title');
  }
  
  if (!jdData.company || jdData.company.trim() === '') {
    errors.push('Company name is missing');
    missingCriticalFields.push('company');
  }
  
  if (!jdData.skills || jdData.skills.length === 0) {
    errors.push('Required skills are missing');
    missingCriticalFields.push('skills');
  } else if (jdData.skills.length < 3) {
    warnings.push('Only a few skills specified, matching accuracy may be limited');
  }
  
  if (!jdData.requirements || jdData.requirements.length === 0) {
    errors.push('Job requirements are missing');
    missingCriticalFields.push('requirements');
  }
  
  // Check recommended fields
  if (!jdData.location || jdData.location.trim() === '') {
    warnings.push('Job location is not specified');
    missingRecommendedFields.push('location');
  }
  
  if (!jdData.responsibilities || jdData.responsibilities.length === 0) {
    warnings.push('Job responsibilities are not specified');
    missingRecommendedFields.push('responsibilities');
  }
  
  if (!jdData.industrialExperience || jdData.industrialExperience.length === 0) {
    warnings.push('Industrial experience requirements are not specified');
    missingRecommendedFields.push('industrialExperience');
  }
  
  if (!jdData.domainExperience || jdData.domainExperience.length === 0) {
    warnings.push('Domain experience requirements are not specified');
    missingRecommendedFields.push('domainExperience');
  }
  
  if (jdData.requiredIndustrialExperienceYears === undefined || jdData.requiredIndustrialExperienceYears === null) {
    warnings.push('Required industrial experience years are not specified');
    missingRecommendedFields.push('requiredIndustrialExperienceYears');
  }
  
  if (jdData.requiredDomainExperienceYears === undefined || jdData.requiredDomainExperienceYears === null) {
    warnings.push('Required domain experience years are not specified');
    missingRecommendedFields.push('requiredDomainExperienceYears');
  }
  
  // Check optional fields
  if (!jdData.employmentType || jdData.employmentType.trim() === '') {
    warnings.push('Employment type is not specified');
    missingRecommendedFields.push('employmentType');
  }
  
  if (!jdData.department || jdData.department.trim() === '') {
    warnings.push('Department information is not specified');
    missingRecommendedFields.push('department');
  }
  
  // Calculate suitability score
  let suitabilityScore = 100;
  
  // Deduct for critical missing fields
  suitabilityScore -= missingCriticalFields.length * 20;
  
  // Deduct for recommended missing fields
  suitabilityScore -= missingRecommendedFields.length * 5;
  
  // Deduct for warnings
  suitabilityScore -= warnings.length * 2;
  
  // Ensure score is between 0 and 100
  suitabilityScore = Math.max(0, Math.min(100, suitabilityScore));
  
  // Determine if valid and complete
  const isValid = errors.length === 0;
  const isComplete = isValid && warnings.length === 0;
  
  // JD Validation Criteria Assessment
  const roleClarity = !missingCriticalFields.includes('title') && !!jdData.title && jdData.title.trim() !== '';
  const skillsClarity = !missingCriticalFields.includes('skills') && jdData.skills && jdData.skills.length > 0;
  const responsibilitiesClarity = !missingRecommendedFields.includes('responsibilities') && jdData.responsibilities && jdData.responsibilities.length > 0;
  const experienceClarity = !missingCriticalFields.includes('requirements') && jdData.requirements && jdData.requirements.length > 0;
  const workContextClarity = (!missingRecommendedFields.includes('location') || !missingRecommendedFields.includes('employmentType')) && 
                            ((jdData.location && jdData.location.trim() !== '') || (jdData.employmentType && jdData.employmentType.trim() !== ''));
  
  // Determine JD Quality Assessment based on the JD Validation Criteria
  let jdQualityAssessment: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Poor';
  const criteriaMet = [roleClarity, skillsClarity, responsibilitiesClarity, experienceClarity, workContextClarity].filter(Boolean).length;
  
  if (criteriaMet === 5 && suitabilityScore >= 80) {
    jdQualityAssessment = 'Excellent';
  } else if (criteriaMet >= 4 && suitabilityScore >= 60) {
    jdQualityAssessment = 'Good';
  } else if (criteriaMet >= 3 && suitabilityScore >= 40) {
    jdQualityAssessment = 'Fair';
  }
  
  return {
    isValid,
    isComplete,
    errors,
    warnings,
    missingCriticalFields,
    missingRecommendedFields,
    documentType: 'job_description',
    suitabilityScore,
    validationCriteria: {
      roleClarity: !!roleClarity,
      skillsClarity: !!skillsClarity,
      responsibilitiesClarity: !!responsibilitiesClarity,
      experienceClarity: !!experienceClarity,
      workContextClarity: !!workContextClarity
    },
    jdQualityAssessment
  };
}

/**
 * Determines if the document is a job description, resume, or other type
 * @param jdData The extracted data
 * @returns Document type classification
 */
function determineDocumentType(jdData: JobDescriptionData): 'job_description' | 'resume' | 'other' | 'invalid' {
  // Check for typical job description fields
  const hasJDFields = !!(jdData.title && jdData.company && jdData.skills && jdData.requirements);
  
  // Check for typical resume fields (heuristic approach)
  // This is a simplified check - a real implementation would be more sophisticated
  const hasResumeIndicators = (
    (jdData as any).name || 
    (jdData as any).email || 
    (jdData as any).phone ||
    (jdData as any).education
  );
  
  // If very few fields are populated, it might be invalid
  const keyFields = [
    jdData.title,
    jdData.company,
    jdData.skills?.length,
    jdData.requirements?.length
  ];
  
  const populatedFields = keyFields.filter(field => 
    field !== undefined && field !== null && 
    (typeof field === 'string' ? field.trim() !== '' : field > 0)
  ).length;
  
  // If very few fields are populated, it might be invalid
  if (populatedFields < 2) {
    return 'invalid';
  }
  
  // If it has resume indicators but not JD fields, it might be a resume
  if (hasResumeIndicators && !hasJDFields) {
    return 'resume';
  }
  
  // If it has the key job description fields, classify as job description
  if (hasJDFields) {
    return 'job_description';
  }
  
  // Default to other if we can't determine
  return 'other';
}

/**
 * Gets detailed information about what's missing in a job description
 * @param jdData The extracted job description data
 * @returns Object detailing missing information
 */
export function getMissingInfoDetails(jdData: JobDescriptionData): JDMissingInfo {
  return {
    critical: {
      title: !jdData.title || jdData.title.trim() === '',
      company: !jdData.company || jdData.company.trim() === '',
      skills: !jdData.skills || jdData.skills.length === 0,
      requirements: !jdData.requirements || jdData.requirements.length === 0
    },
    recommended: {
      location: !jdData.location || jdData.location.trim() === '',
      salary: !jdData.salary || jdData.salary.trim() === '',
      responsibilities: !jdData.responsibilities || jdData.responsibilities.length === 0,
      industrialExperience: !jdData.industrialExperience || jdData.industrialExperience.length === 0,
      domainExperience: !jdData.domainExperience || jdData.domainExperience.length === 0,
      requiredIndustrialExperienceYears: jdData.requiredIndustrialExperienceYears === undefined || jdData.requiredIndustrialExperienceYears === null,
      requiredDomainExperienceYears: jdData.requiredDomainExperienceYears === undefined || jdData.requiredDomainExperienceYears === null,
      employmentType: !jdData.employmentType || jdData.employmentType.trim() === '',
      department: !jdData.department || jdData.department.trim() === ''
    }
  };
}

/**
 * Generates a detailed report of JD validation
 * @param jdData The extracted job description data
 * @returns Human-readable validation report
 */
export function generateValidationReport(jdData: JobDescriptionData): string {
  const validation = validateJobDescription(jdData);
  const missingInfo = getMissingInfoDetails(jdData);
  
  let report = `Job Description Validation Report\n`;
  report += `================================\n\n`;
  
  report += `Document Type: ${validation.documentType}\n`;
  report += `Validity: ${validation.isValid ? 'VALID' : 'INVALID'}\n`;
  report += `Completeness: ${validation.isComplete ? 'COMPLETE' : 'INCOMPLETE'}\n`;
  report += `Suitability Score: ${validation.suitabilityScore}/100\n`;
  report += `JD Quality Assessment: ${validation.jdQualityAssessment}\n\n`;
  
  // Add JD Validation Criteria assessment
  report += `JD Validation Criteria Assessment:\n`;
  report += `  1. Role Clarity (Title, Summary): ${validation.validationCriteria.roleClarity ? 'MET' : 'NOT MET'}\n`;
  report += `  2. Skills Clarity (Key Skills): ${validation.validationCriteria.skillsClarity ? 'MET' : 'NOT MET'}\n`;
  report += `  3. Responsibilities Clarity: ${validation.validationCriteria.responsibilitiesClarity ? 'MET' : 'NOT MET'}\n`;
  report += `  4. Experience Clarity (Requirements): ${validation.validationCriteria.experienceClarity ? 'MET' : 'NOT MET'}\n`;
  report += `  5. Work Context Clarity (Location, Employment Type): ${validation.validationCriteria.workContextClarity ? 'MET' : 'NOT MET'}\n\n`;
  
  if (validation.errors.length > 0) {
    report += `Critical Errors:\n`;
    validation.errors.forEach(error => {
      report += `  - ${error}\n`;
    });
    report += `\n`;
  }
  
  if (validation.warnings.length > 0) {
    report += `Warnings:\n`;
    validation.warnings.forEach(warning => {
      report += `  - ${warning}\n`;
    });
    report += `\n`;
  }
  
  report += `Critical Missing Information:\n`;
  report += `  Title: ${missingInfo.critical.title ? 'MISSING' : 'Present'}\n`;
  report += `  Company: ${missingInfo.critical.company ? 'MISSING' : 'Present'}\n`;
  report += `  Skills: ${missingInfo.critical.skills ? 'MISSING' : 'Present'} (${jdData.skills?.length || 0} skills listed)\n`;
  report += `  Requirements: ${missingInfo.critical.requirements ? 'MISSING' : 'Present'} (${jdData.requirements?.length || 0} requirements listed)\n\n`;
  
  report += `Recommended Information:\n`;
  report += `  Location: ${missingInfo.recommended.location ? 'MISSING' : 'Present'}\n`;
  report += `  Salary: ${missingInfo.recommended.salary ? 'MISSING' : 'Present'}\n`;
  report += `  Responsibilities: ${missingInfo.recommended.responsibilities ? `MISSING (${jdData.responsibilities?.length || 0} listed)` : 'Present'}\n`;
  report += `  Industrial Experience: ${missingInfo.recommended.industrialExperience ? `MISSING (${jdData.industrialExperience?.length || 0} listed)` : 'Present'}\n`;
  report += `  Domain Experience: ${missingInfo.recommended.domainExperience ? `MISSING (${jdData.domainExperience?.length || 0} listed)` : 'Present'}\n`;
  report += `  Industrial Experience Years: ${missingInfo.recommended.requiredIndustrialExperienceYears ? 'MISSING' : 'Present'}\n`;
  report += `  Domain Experience Years: ${missingInfo.recommended.requiredDomainExperienceYears ? 'MISSING' : 'Present'}\n`;
  report += `  Employment Type: ${missingInfo.recommended.employmentType ? 'MISSING' : 'Present'}\n`;
  report += `  Department: ${missingInfo.recommended.department ? 'MISSING' : 'Present'}\n\n`;
  
  report += `Matching Suitability: ${validation.suitabilityScore}%\n`;
  if (validation.suitabilityScore >= 80) {
    report += `Assessment: Excellent for matching\n`;
  } else if (validation.suitabilityScore >= 60) {
    report += `Assessment: Good for matching with some limitations\n`;
  } else if (validation.suitabilityScore >= 40) {
    report += `Assessment: Fair for matching, significant information missing\n`;
  } else {
    report += `Assessment: Poor for matching, critical information missing\n`;
  }
  
  // Add recommendation based on JD Validation Criteria
  const criteriaMet = Object.values(validation.validationCriteria).filter(Boolean).length;
  if (criteriaMet < 5) {
    report += `\nRecommendations for Improvement:\n`;
    if (!validation.validationCriteria.roleClarity) {
      report += `  - Provide a clear job title that accurately describes the role\n`;
    }
    if (!validation.validationCriteria.skillsClarity) {
      report += `  - List the key skills required for this position\n`;
    }
    if (!validation.validationCriteria.responsibilitiesClarity) {
      report += `  - Clearly define the main responsibilities of the role\n`;
    }
    if (!validation.validationCriteria.experienceClarity) {
      report += `  - Specify the experience requirements for candidates\n`;
    }
    if (!validation.validationCriteria.workContextClarity) {
      report += `  - Include information about work location and employment type\n`;
    }
  }
  
  return report;
}