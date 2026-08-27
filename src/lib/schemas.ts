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

/** A child (FQ or subsidiary) at any depth under a top-level entity — a
 * subsidiary can itself have subsidiaries and FQs, expanded recursively by
 * expanding its own row in turn. FQs are terminal: `children` is always []. */
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
  subsidiaryCount: number;
  fqCount: number;
  children: ChildEntity[];
  /** Whether this row's own entityName matched the active search term
   * (false when no search is active). Used to auto-expand the path down to
   * a matching descendant — the match itself is decided by the database,
   * not by re-testing the string client-side. */
  matchesSearch: boolean;
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
  matchesSearch: boolean;
}

export interface EntityListResponse {
  data: TopLevelEntity[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface EntityListFilters {
  search?: string;
  entityStatus?: EntityStatus;
  complianceStatus?: ComplianceStatus;
  jurisdiction?: string;
  page?: number;
  pageSize?: PageSize;
}

export interface JurisdictionsResponse {
  jurisdictions: string[];
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

/** pct is this child's total ownership allocated across ALL of its parents
 * (not just the selected one); unallocatedPct is that child's own remainder
 * (100 - pct). Each child gets its own two-segment bar — there's no shared
 * "whole" across children to stack into a single bar. */
export interface OwnershipChildShare {
  entityName: string;
  pct: number;
  unallocatedPct: number;
}

export interface OwnershipByParent {
  parents: OwnershipParentOption[];
  selectedParentId: string | null;
  children: OwnershipChildShare[];
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
  entities: 'Entities',
  ownership: 'Ownership',
  filings: 'Filings',
};

/** The backend groups validation errors under these fixed logical dataset
 * names (see coverpin-backend's SLOT_SCHEMAS) regardless of what the user
 * actually named their file — this maps back to the upload slot so the UI
 * can show the real filename instead. */
export const UPLOAD_SLOT_BY_FILE: Record<string, UploadSlot> = {
  'entities.csv': 'entities',
  'ownership.csv': 'ownership',
  'filings.csv': 'filings',
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
