import type {
  ComplianceEntity,
  CreateEntityInput,
  CreateFilingInput,
  Filing,
  FilingStatus,
} from './schemas';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Shape produced by the backend's global HttpExceptionFilter. */
interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  path?: string;
  timestamp?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'Could not reach the API. Is the backend running?');
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as ApiErrorBody;
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      // response wasn't JSON; fall back to the generic message above
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>('/api/health'),

  listEntities: () => request<ComplianceEntity[]>('/api/entities'),

  getEntity: (id: string) => request<ComplianceEntity>(`/api/entities/${id}`),

  createEntity: (input: CreateEntityInput) =>
    request<ComplianceEntity>('/api/entities', {
      method: 'POST',
      body: JSON.stringify(cleanPayload(input)),
    }),

  deleteEntity: (id: string) =>
    request<void>(`/api/entities/${id}`, { method: 'DELETE' }),

  createFiling: (entityId: string, input: CreateFilingInput) =>
    request<Filing>(`/api/entities/${entityId}/filings`, {
      method: 'POST',
      body: JSON.stringify(cleanPayload(input)),
    }),

  transitionFiling: (entityId: string, filingId: string, status: FilingStatus) =>
    request<Filing>(`/api/entities/${entityId}/filings/${filingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  generateComplianceChecklist: (entityId: string) =>
    request<ComplianceEntity>(`/api/entities/${entityId}/compliance-checklist`, {
      method: 'POST',
    }),
};

/** Drops empty-string optional fields so the backend doesn't see "" for optional DTO fields. */
function cleanPayload<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== '' && value !== undefined) {
      out[key as keyof T] = value as T[keyof T];
    }
  }
  return out;
}
