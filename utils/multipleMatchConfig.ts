/**
 * Configuration for Multiple Job Matching
 * 
 * This file centralizes all configuration options for the multiple job matching feature.
 * Adjust these values based on your infrastructure and requirements.
 */

export interface MultipleMatchConfig {
  // Batch processing limits
  limits: {
    maxJDFiles: number;
    maxResumeFiles: number;
    maxCombinations: number;
  };
  
  // File validation
  files: {
    maxSize: number; // in bytes
    minSize: number; // in bytes
    allowedExtensions: string[];
  };
  
  // Processing configuration
  processing: {
    concurrency: number; // Number of parallel operations
    processRowByRow: boolean; // Process all resumes for one JD before moving to next
  };
  
  // Matching criteria
  matching: {
    minimumScore: number; // Minimum score to be considered relevant
    filterLowScores: boolean; // Filter out matches below minimum score
  };
  
  // Logging
  logging: {
    enableDebug: boolean;
    enableProgress: boolean;
    progressInterval: number; // Log progress every N items
  };
}

// Default configuration
export const DEFAULT_MULTIPLE_MATCH_CONFIG: MultipleMatchConfig = {
  limits: {
    maxJDFiles: parseInt(process.env.MAX_JD_FILES || '10'),
    maxResumeFiles: parseInt(process.env.MAX_RESUME_FILES || '10'),
    maxCombinations: parseInt(process.env.MAX_COMBINATIONS || '100')
  },
  
  files: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || String(50 * 1024 * 1024)), // 50MB default
    minSize: parseInt(process.env.MIN_FILE_SIZE || '100'), // 100 bytes minimum
    allowedExtensions: (process.env.ALLOWED_FILE_EXTENSIONS || '.pdf').split(',')
  },
  
  processing: {
    concurrency: parseInt(process.env.MATCH_CONCURRENCY || '3'),
    processRowByRow: process.env.PROCESS_ROW_BY_ROW === 'true'
  },
  
  matching: {
    minimumScore: parseInt(process.env.MINIMUM_MATCH_SCORE || '60'),
    filterLowScores: process.env.FILTER_LOW_SCORES !== 'false' // Default true
  },
  
  logging: {
    enableDebug: process.env.LOG_LEVEL === 'debug',
    enableProgress: process.env.ENABLE_PROGRESS_LOGGING !== 'false', // Default true
    progressInterval: parseInt(process.env.PROGRESS_LOG_INTERVAL || '5')
  }
};

/**
 * Get the current configuration
 * Can be extended to support runtime configuration changes
 */
export function getMultipleMatchConfig(): MultipleMatchConfig {
  return DEFAULT_MULTIPLE_MATCH_CONFIG;
}

/**
 * Validate configuration values
 */
export function validateConfig(config: MultipleMatchConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate limits
  if (config.limits.maxJDFiles < 1) {
    errors.push('maxJDFiles must be at least 1');
  }
  
  if (config.limits.maxResumeFiles < 1) {
    errors.push('maxResumeFiles must be at least 1');
  }
  
  if (config.limits.maxCombinations < config.limits.maxJDFiles * config.limits.maxResumeFiles) {
    errors.push('maxCombinations should be >= maxJDFiles × maxResumeFiles');
  }
  
  // Validate file settings
  if (config.files.maxSize < config.files.minSize) {
    errors.push('maxSize must be greater than minSize');
  }
  
  if (config.files.allowedExtensions.length === 0) {
    errors.push('At least one file extension must be allowed');
  }
  
  // Validate processing
  if (config.processing.concurrency < 1) {
    errors.push('Concurrency must be at least 1');
  }
  
  if (config.processing.concurrency > 10) {
    errors.push('Concurrency should not exceed 10 to prevent API rate limits');
  }
  
  // Validate matching
  if (config.matching.minimumScore < 0 || config.matching.minimumScore > 100) {
    errors.push('minimumScore must be between 0 and 100');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Log current configuration (for debugging)
 */
export function logConfig(config: MultipleMatchConfig): void {
  console.log('='.repeat(60));
  console.log('Multiple Job Match Configuration');
  console.log('='.repeat(60));
  console.log('\nLimits:');
  console.log(`  Max JD Files: ${config.limits.maxJDFiles}`);
  console.log(`  Max Resume Files: ${config.limits.maxResumeFiles}`);
  console.log(`  Max Combinations: ${config.limits.maxCombinations}`);
  console.log('\nFile Validation:');
  console.log(`  Max Size: ${(config.files.maxSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Min Size: ${config.files.minSize} bytes`);
  console.log(`  Allowed Extensions: ${config.files.allowedExtensions.join(', ')}`);
  console.log('\nProcessing:');
  console.log(`  Concurrency: ${config.processing.concurrency}`);
  console.log(`  Process Row by Row: ${config.processing.processRowByRow}`);
  console.log('\nMatching:');
  console.log(`  Minimum Score: ${config.matching.minimumScore}`);
  console.log(`  Filter Low Scores: ${config.matching.filterLowScores}`);
  console.log('\nLogging:');
  console.log(`  Debug Enabled: ${config.logging.enableDebug}`);
  console.log(`  Progress Enabled: ${config.logging.enableProgress}`);
  console.log(`  Progress Interval: ${config.logging.progressInterval} items`);
  console.log('='.repeat(60) + '\n');
}

// Validate and log configuration on module load
const config = getMultipleMatchConfig();
const validation = validateConfig(config);

if (!validation.valid) {
  console.error('⚠️  Configuration validation failed:');
  validation.errors.forEach(error => console.error(`   - ${error}`));
  console.error('\nPlease check your environment variables.\n');
}

// Log configuration in debug mode
if (process.env.LOG_LEVEL === 'debug' || process.env.LOG_CONFIG === 'true') {
  logConfig(config);
}

export default config;
