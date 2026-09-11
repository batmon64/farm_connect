import { z } from "zod";

export const createJobSchema = z.object({
  serviceId: z.string().uuid("Choose a service"),
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(2000).optional(),
  quantity: z.coerce.number().positive().optional(),
  unit: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),

  needsWorkers: z.boolean(),
  workerCount: z.coerce.number().int().positive().optional(),
  skillRequirement: z.string().trim().max(200).optional(),

  needsMachine: z.boolean(),
  machineType: z.string().trim().max(80).optional(),
  machineQuantity: z.coerce.number().int().positive().optional(),
  operatorRequired: z.boolean().optional(),

  scheduledDate: z.string().min(1, "Pick a date"),
  startTime: z.string().min(1, "Pick a start time"),
  durationHours: z.coerce.number().positive("Duration must be more than 0"),

  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),

  budgetAmount: z.coerce.number().positive().optional(),
  budgetFlexible: z.boolean(),
  budgetType: z.string().trim().max(40).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
