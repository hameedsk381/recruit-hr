// Validation utilities for file uploads and inputs

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedExtensions?: string[];
  minSize?: number; // in bytes
}

export const DEFAULT_FILE_OPTIONS: FileValidationOptions = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedExtensions: ['.pdf', '.txt', '.docx'],
  minSize: 100 // 100 bytes minimum
};

/**
 * Validates a file upload
 */
export function validateFile(
  file: unknown,
  options: FileValidationOptions = DEFAULT_FILE_OPTIONS
): ValidationResult {
  const opts = { ...DEFAULT_FILE_OPTIONS, ...options };

  if (!(file instanceof File)) {
    return { valid: false, error: 'Invalid file type. Expected a File object.' };
  }

  // Check file extension
  if (opts.allowedExtensions && opts.allowedExtensions.length > 0) {
    const fileExt = file.name.toLowerCase().match(/\.\w+$/)?.[0];
    if (!fileExt || !opts.allowedExtensions.includes(fileExt)) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed: ${opts.allowedExtensions.join(', ')}`
      };
    }
  }

  // Check minimum size
  if (opts.minSize && file.size < opts.minSize) {
    return {
      valid: false,
      error: `File too small. Minimum size: ${opts.minSize} bytes`
    };
  }

  // Check maximum size
  if (opts.maxSize && file.size > opts.maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${opts.maxSize / 1024 / 1024}MB`
    };
  }

  return { valid: true };
}

/**
 * Validates multiple files
 */
export function validateFiles(
  files: unknown[],
  options: FileValidationOptions = DEFAULT_FILE_OPTIONS
): ValidationResult {
  if (!Array.isArray(files) || files.length === 0) {
    return { valid: false, error: 'No files provided' };
  }

  for (let i = 0; i < files.length; i++) {
    const result = validateFile(files[i], options);
    if (!result.valid) {
      return { valid: false, error: `File ${i + 1}: ${result.error}` };
    }
  }

  return { valid: true };
}

/**
 * Validates batch processing limits
 */
export interface BatchLimits {
  maxJDs?: number;
  maxResumes?: number;
  maxCombinations?: number;
}

export const DEFAULT_BATCH_LIMITS: BatchLimits = {
  maxJDs: 10,
  maxResumes: 10,
  maxCombinations: 50
};

export function validateBatchLimits(
  jdCount: number,
  resumeCount: number,
  limits: BatchLimits = DEFAULT_BATCH_LIMITS
): ValidationResult {
  const opts = { ...DEFAULT_BATCH_LIMITS, ...limits };

  if (opts.maxJDs && jdCount > opts.maxJDs) {
    return {
      valid: false,
      error: `Too many job descriptions. Maximum: ${opts.maxJDs}, provided: ${jdCount}`
    };
  }

  if (opts.maxResumes && resumeCount > opts.maxResumes) {
    return {
      valid: false,
      error: `Too many resumes. Maximum: ${opts.maxResumes}, provided: ${resumeCount}`
    };
  }

  const totalCombinations = jdCount * resumeCount;
  if (opts.maxCombinations && totalCombinations > opts.maxCombinations) {
    return {
      valid: false,
      error: `Too many combinations. Maximum: ${opts.maxCombinations}, requested: ${totalCombinations} (${jdCount} JDs × ${resumeCount} resumes)`
    };
  }

  return { valid: true };
}
