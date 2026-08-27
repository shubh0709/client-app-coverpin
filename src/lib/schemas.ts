import { z } from 'zod';

/**
 * Domain types for the Entity Registry, mirroring the API contract implemented
 * by coverpin-backend (see entity-registry-requirements-analysis.md §3-§7 and
 * entity-registry-db-design.md §4 in the repo root for the source of truth).
 */

export const REGISTRATION_TYPES = ['Entity', 'FQ'] as const;
export type RegistrationType = (typeof REGISTRATION_TYPES)[number];

export const ENTITY_TYPES = [
  'Corporation',
  'Limited Liability Company',
  'Limited Partnership',
  'General Partnership',
  'Nonprofit',
  'Trust',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_STATUSES = [
  'In Formation',
  'Active',
  'Revoked/Terminated',
  'Merged/Acquired',
  'Divested/Sold',
  'Dormant',
  'Dissolved',
] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

/** Entity statuses that make a registration's compliance status NOT_APPLICABLE. */
export const TERMINAL_ENTITY_STATUSES: readonly EntityStatus[] = [
  'Dissolved',
  'Divested/Sold',
  'Dormant',
  'Merged/Acquired',
  'Revoked/Terminated',
];

export const GLOBAL_REGIONS = [
  'North America',
  'Asia Pacific',
  'Europe Middle East Africa',
  'Latin America',
  'European Economic Area',
] as const;
export type GlobalRegion = (typeof GLOBAL_REGIONS)[number];

export const COMPLIANCE_STATUSES = [
  'NOT_APPLICABLE',
  'TBD',
  'GOOD_STANDING',
  'FILING_DUE',
  'OVERDUE',
  'SUSPENDED',
] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export const RELATIONS = ['fq', 'subsidiary'] as const;
export type Relation = (typeof RELATIONS)[number];

/** A direct child (FQ or subsidiary) of a top-level entity — one level deep only. */
export interface ChildEntity {
  id: string;
  entityName: string;
  registrationType: RegistrationType;
  relation: Relation;
  jurisdiction: string;
  entityType: EntityType;
  entityStatus: EntityStatus;
  complianceStatus: ComplianceStatus;
  nextDueDate: string | null;
  ownershipPct: number | null;
}

/** A top-level entity row: an `Entity`-type row with no incoming ownership edge. */
export interface TopLevelEntity {
  id: string;
  entityName: string;
  registrationType: RegistrationType;
  jurisdiction: string;
  entityType: EntityType;
  entityStatus: EntityStatus;
  complianceStatus: ComplianceStatus;
  nextDueDate: string | null;
  subsidiaryCount: number;
  fqCount: number;
  children: ChildEntity[];
}

export interface EntityListResponse {
  data: TopLevelEntity[];
}

export interface EntityListFilters {
  search?: string;
  entityStatus?: EntityStatus;
  complianceStatus?: ComplianceStatus;
  jurisdiction?: string;
}

/** Analytics response shapes (GET /api/analytics). */
export interface ComplianceBreakdownPoint {
  status: ComplianceStatus;
  count: number;
}

export interface EntityStatusByRegionPoint {
  region: string;
  entityStatus: EntityStatus;
  count: number;
}

export interface SubsidiaryFqCountPoint {
  entityName: string;
  subsidiaries: number;
  fqs: number;
}

export interface OwnershipParentOption {
  id: string;
  entityName: string;
}

export interface OwnershipChildShare {
  entityName: string;
  pct: number;
}

export interface OwnershipByParent {
  parents: OwnershipParentOption[];
  selectedParentId: string | null;
  children: OwnershipChildShare[];
  unallocatedPct: number;
}

export interface AnalyticsResponse {
  complianceBreakdown: ComplianceBreakdownPoint[];
  entityStatusByRegion: EntityStatusByRegionPoint[];
  subsidiaryFqCountByTopLevel: SubsidiaryFqCountPoint[];
  ownershipByParent: OwnershipByParent;
}

export interface AnalyticsFilters {
  jurisdiction?: string;
  entityStatus?: EntityStatus;
  parentEntityId?: string;
}

/** Upload response shapes (POST /api/upload). */
export interface UploadSuccess {
  entities: number;
  ownershipEdges: number;
  filings: number;
}

export const UPLOAD_SLOTS = ['entities', 'ownership', 'filings'] as const;
export type UploadSlot = (typeof UPLOAD_SLOTS)[number];

export const UPLOAD_FILE_NAMES: Record<UploadSlot, string> = {
  entities: 'entities.csv',
  ownership: 'ownership.csv',
  filings: 'filings.csv',
};

export interface UploadFieldError {
  file: string;
  line: number;
  column: string;
  message: string;
}

/** Shape of every non-2xx JSON body the backend returns. */
export interface ApiErrorBody {
  statusCode: number;
  path?: string;
  timestamp?: string;
  message?: string;
  errors?: UploadFieldError[];
}

/** react-hook-form + zod isn't a great fit for raw <input type="file"> state,
 * but we still validate that all three slots are filled and are .csv/.xlsx
 * before hitting the network — mirrors the backend's accepted extensions. */
export const uploadFormSchema = z.object({
  entities: z
    .instanceof(File, { message: 'Select entities.csv (or .xlsx)' })
    .refine((f) => /\.(csv|xlsx)$/i.test(f.name), 'Must be a .csv or .xlsx file'),
  ownership: z
    .instanceof(File, { message: 'Select ownership.csv (or .xlsx)' })
    .refine((f) => /\.(csv|xlsx)$/i.test(f.name), 'Must be a .csv or .xlsx file'),
  filings: z
    .instanceof(File, { message: 'Select filings.csv (or .xlsx)' })
    .refine((f) => /\.(csv|xlsx)$/i.test(f.name), 'Must be a .csv or .xlsx file'),
});
export type UploadFormInput = z.infer<typeof uploadFormSchema>;
