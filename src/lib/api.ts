import type {
  AnalyticsFilters,
  AnalyticsResponse,
  ApiErrorBody,
  EntityListFilters,
  EntityListResponse,
  JurisdictionsResponse,
  SuggestionsResponse,
  UploadFieldError,
  UploadFormInput,
  UploadSuccess,
} from './schemas';
import { UPLOAD_FILE_NAMES } from './schemas';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Generic API failure — anything that isn't the 422 upload-validation shape. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public path?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The 422 upload-validation shape: every row/column error in one batch. */
export class UploadValidationError extends Error {
  constructor(public errors: UploadFieldError[]) {
    super(`Upload failed validation with ${errors.length} error(s)`);
    this.name = 'UploadValidationError';
  }
}

async function parseErrorBody(res: Response): Promise<ApiErrorBody | null> {
  try {
    return (await res.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (err) {
    // A caller-initiated abort (a newer request superseded this one) isn't a
    // real failure — let it propagate as-is so callers can tell the two
    // apart (`err.name === 'AbortError'`) instead of surfacing "could not
    // reach the API" for a request nobody's waiting on anymore.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Could not reach the API. Is the backend running?');
  }

  if (!res.ok) {
    const body = await parseErrorBody(res);
    if (res.status === 422 && body?.errors) {
      throw new UploadValidationError(body.errors);
    }
    const message = body?.message ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, body?.path);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  /** POST /api/upload — multipart/form-data with the three CSV/XLSX slots. */
  upload: (files: UploadFormInput) => {
    const form = new FormData();
    for (const slot of Object.keys(UPLOAD_FILE_NAMES) as (keyof UploadFormInput)[]) {
      form.append(slot, files[slot]);
    }
    return requestJson<UploadSuccess>('/api/upload', {
      method: 'POST',
      body: form,
    });
  },

  /** GET /api/entities — one page of top-level entities with recursively nested children.
   * Pass `signal` so an in-flight request can be aborted if it's superseded
   * (a filter/page change, or the component unmounting) before it resolves. */
  listEntities: (filters: EntityListFilters = {}, signal?: AbortSignal) =>
    requestJson<EntityListResponse>(
      `/api/entities${buildQuery({
        search: filters.search,
        entityStatus: filters.entityStatus,
        complianceStatus: filters.complianceStatus,
        jurisdiction: filters.jurisdiction,
        page: filters.page ? String(filters.page) : undefined,
        pageSize: filters.pageSize ? String(filters.pageSize) : undefined,
      })}`,
      { signal },
    ),

  /** GET /api/entities/jurisdictions — distinct jurisdictions for filter dropdowns. */
  getJurisdictions: (signal?: AbortSignal) =>
    requestJson<JurisdictionsResponse>('/api/entities/jurisdictions', { signal }),

  /** GET /api/entities/suggestions — typo-tolerant Entity Name suggestions
   * for the search bar's autocomplete dropdown, closest match first. */
  getSuggestions: (q: string, signal?: AbortSignal) =>
    requestJson<SuggestionsResponse>(
      `/api/entities/suggestions${buildQuery({ q })}`,
      { signal },
    ),

  /** GET /api/analytics — the four analytics-page charts. */
  getAnalytics: (filters: AnalyticsFilters = {}, signal?: AbortSignal) =>
    requestJson<AnalyticsResponse>(
      `/api/analytics${buildQuery({
        jurisdiction: filters.jurisdiction,
        entityStatus: filters.entityStatus,
        parentEntityId: filters.parentEntityId,
      })}`,
      { signal },
    ),
};
