import { z } from 'zod';

export const ENTITY_TYPES = ['LLC', 'C_CORP', 'S_CORP', 'PARTNERSHIP', 'NONPROFIT'] as const;
export const ENTITY_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DISSOLVED'] as const;
export const FILING_TYPES = [
  'ANNUAL_REPORT',
  'BOI_REPORT',
  'REGISTERED_AGENT_RENEWAL',
  'FRANCHISE_TAX',
  'OTHER',
] as const;
export const FILING_STATUSES = ['PENDING', 'AI_PROCESSING', 'FILED', 'CONFIRMED'] as const;

/** Mirrors CreateEntityDto on the backend (see coverpin-backend/src/entities/dto). */
export const createEntitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  entityType: z.enum(ENTITY_TYPES),
  jurisdiction: z
    .string()
    .regex(/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/, 'Use a code like US-DE, US-CA or SG'),
  formationDate: z.string().optional().or(z.literal('')),
  registeredAgent: z.string().max(255).optional().or(z.literal('')),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;

/** Mirrors CreateFilingDto on the backend. */
export const createFilingSchema = z.object({
  filingType: z.enum(FILING_TYPES),
  dueDate: z.string().optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type CreateFilingInput = z.infer<typeof createFilingSchema>;

export type EntityType = (typeof ENTITY_TYPES)[number];
export type EntityStatus = (typeof ENTITY_STATUSES)[number];
export type FilingType = (typeof FILING_TYPES)[number];
export type FilingStatus = (typeof FILING_STATUSES)[number];

export interface Filing {
  id: string;
  entityId: string;
  filingType: FilingType;
  status: FilingStatus;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceEntity {
  id: string;
  name: string;
  entityType: EntityType;
  jurisdiction: string;
  status: EntityStatus;
  formationDate: string | null;
  registeredAgent: string | null;
  lastComplianceCheck: ComplianceChecklistResult | null;
  lastCheckedAt: string | null;
  filings: Filing[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceChecklistItem {
  filingType: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedDueDate?: string;
}

export interface ComplianceChecklistResult {
  summary: string;
  items: ComplianceChecklistItem[];
}

/** Forward-only lifecycle, mirrors FILING_TRANSITIONS in entities.service.ts. */
export const FILING_TRANSITIONS: Record<FilingStatus, FilingStatus[]> = {
  PENDING: ['AI_PROCESSING'],
  AI_PROCESSING: ['FILED', 'PENDING'],
  FILED: ['CONFIRMED'],
  CONFIRMED: [],
};
