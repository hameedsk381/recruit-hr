# JD Validator Service

## Overview

The JD Validator service analyzes job descriptions to determine their suitability for candidate matching. It validates the completeness of job description documents and identifies missing information that could impact matching accuracy.

## Features

1. **Document Validation**: Determines if a document is a valid job description
2. **Completeness Assessment**: Evaluates how complete the job description is for matching purposes
3. **Missing Information Detection**: Identifies critical and recommended missing fields
4. **Suitability Scoring**: Provides a 0-100 score indicating how suitable the JD is for matching
5. **Detailed Reporting**: Generates comprehensive validation reports

## API Endpoint

### Validate Job Description

**Endpoint**: `POST /validate-jd`

**Description**: Validates a job description for matching suitability and identifies missing information.

### Request Format

#### File Upload (multipart/form-data)
```bash
curl -X POST http://localhost:3001/validate-jd \
  -F "job_description=@job_description.pdf"
```

#### URL Input (application/json)
```bash
curl -X POST http://localhost:3001/validate-jd \
  -H "Content-Type: application/json" \
  -d '{
    "job_description_url": "https://example.com/job_description.pdf"
  }'
```

### Response Format

```json
{
  "success": true,
  "data": {
    "validation": {
      "isValid": true,
      "isComplete": true,
      "errors": [],
      "warnings": [],
      "missingCriticalFields": [],
      "missingRecommendedFields": [],
      "documentType": "job_description",
      "suitabilityScore": 95
    },
    "extractedData": {
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "skillsCount": 6,
      "requirementsCount": 3
    },
    "detailedReport": "Job Description Validation Report\n================================\n\nDocument Type: job_description\nValidity: VALID\nCompleteness: COMPLETE\nSuitability Score: 95/100\n\nCritical Missing Information:\n  Title: Present\n  Company: Present\n  Skills: Present (6 skills listed)\n  Requirements: Present (3 requirements listed)\n\nRecommended Information:\n  Location: Present\n  Salary: Present\n  Responsibilities: Present\n  Industrial Experience: Present\n  Domain Experience: Present\n  Industrial Experience Years: Present\n  Domain Experience Years: Present\n  Employment Type: Present\n  Department: Present\n\nMatching Suitability: 95%\nAssessment: Excellent for matching\n"
  }
}
```

## Validation Criteria

### Critical Fields (Required for Validity)
- **Job Title**: The position title
- **Company Name**: The hiring company
- **Required Skills**: List of skills needed for the role
- **Job Requirements**: List of requirements for the position

### Recommended Fields (Affects Suitability Score)
- **Location**: Job location
- **Salary**: Compensation information
- **Responsibilities**: Job responsibilities and duties
- **Industrial Experience**: Required industry experience
- **Domain Experience**: Required domain-specific experience
- **Industrial Experience Years**: Minimum years of industrial experience
- **Domain Experience Years**: Minimum years of domain experience
- **Employment Type**: Type of employment (Full-Time, Part-Time, etc.)
- **Department**: Department or team information

## Suitability Scoring

The service calculates a suitability score (0-100) based on:

- **Critical Fields**: -20 points for each missing critical field
- **Recommended Fields**: -5 points for each missing recommended field
- **Warnings**: -2 points for each warning

### Score Interpretation
- **80-100**: Excellent for matching
- **60-79**: Good for matching with some limitations
- **40-59**: Fair for matching, significant information missing
- **0-39**: Poor for matching, critical information missing

## Document Type Detection

The validator attempts to determine if the provided document is:
- A valid job description
- A resume (incorrect document type)
- An invalid document (insufficient data)

## Error Handling

### Common Errors
1. **Invalid Content Type**: Request must use either `multipart/form-data` or `application/json`
2. **Missing File**: No job description file provided
3. **Invalid File**: Provided file is not a valid File object
4. **Invalid URL**: URL format is incorrect or inaccessible
5. **Download Failure**: Unable to download file from provided URL

### Response Format for Errors
```json
{
  "success": false,
  "error": "Descriptive error message",
  "details": "Additional error details (when applicable)"
}
```

## Integration Examples

### JavaScript/TypeScript
```typescript
const response = await fetch('http://localhost:3001/validate-jd', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    job_description_url: 'https://example.com/job_description.pdf'
  })
});

const result = await response.json();
if (result.success) {
  console.log(`Suitability Score: ${result.data.validation.suitabilityScore}/100`);
  console.log(`Valid for matching: ${result.data.validation.isValid}`);
  console.log(`Complete information: ${result.data.validation.isComplete}`);
} else {
  console.error('Validation failed:', result.error);
}
```

### Python
```python
import requests
import json

# URL-based validation
response = requests.post(
    'http://localhost:3001/validate-jd',
    headers={'Content-Type': 'application/json'},
    json={'job_description_url': 'https://example.com/job_description.pdf'}
)

result = response.json()
if result['success']:
    print(f"Suitability Score: {result['data']['validation']['suitabilityScore']}/100")
    print(f"Valid for matching: {result['data']['validation']['isValid']}")
else:
    print(f"Validation failed: {result['error']}")
```

## Testing

Run the test suite:
```bash
bun run testJdValidator.ts
```

This will validate various job description scenarios and display detailed results.