import { z } from "zod"

export const createOrgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  websiteUrl: z.string().url().optional().or(z.literal("")),
})

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
})

export type CreateOrgInput = z.infer<typeof createOrgSchema>
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>
