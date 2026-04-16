import { z } from "zod";

/**
 * Enterprise Schema Definitions
 * Centrally managed schemas for strictly typed production API
 */

export const JobPostSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  location: z.string().optional(),
  employmentType: z.enum(["full-time", "part-time", "contract", "internship"]).default("full-time"),
  skills: z.array(z.string()).min(1),
  isPublic: z.boolean().default(true),
});

export const CandidateApplicationSchema = z.object({
  jobId: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  // resume handled separately via FormData
});

export const TenantSettingsSchema = z.object({
  webhookUrl: z.string().url().optional(),
  slackEnabled: z.boolean().default(false),
  teamsEnabled: z.boolean().default(false),
  autoScreen: z.boolean().default(true),
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    logoUrl: z.string().url().optional()
  }).optional()
});

/**
 * Utility to safely parse and return typed data or throw standardized error
 */
export function validateRequest<T>(schema: z.Schema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation Error: ${result.error.issues.map(item => item.message).join(", ")}`);
  }
  return result.data;
}
