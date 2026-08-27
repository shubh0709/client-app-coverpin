'use client';

import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  ListIcon,
  Loader2Icon,
  TriangleAlertIcon,
  UploadCloudIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { api, ApiError, UploadValidationError } from '@/lib/api';
import {
  UPLOAD_FILE_NAMES,
  UPLOAD_SLOT_BY_FILE,
  UPLOAD_SLOTS,
  uploadFormSchema,
  type UploadFieldError,
  type UploadSlot,
  type UploadSuccess,
} from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SLOT_DESCRIPTIONS: Record<UploadSlot, string> = {
  entities: 'One row per Entity or FQ registration.',
  ownership: 'Parent → child ownership edges with percentages.',
  filings: 'Filing obligations and their due dates, per registration.',
};

type Files = Partial<Record<UploadSlot, File>>;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [files, setFiles] = useState<Files>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<UploadSlot, string>>>({});
  // Bumped per-slot to force the underlying <input type="file"> to remount —
  // that's the only way to clear its browser-displayed filename, since the
  // DOM element ignores React state resets (it's uncontrolled).
  const [inputKeys, setInputKeys] = useState<Record<UploadSlot, number>>({
    entities: 0,
    ownership: 0,
    filings: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const [validationErrors, setValidationErrors] = useState<UploadFieldError[] | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);

  const selectedCount = UPLOAD_SLOTS.filter((slot) => files[slot]).length;
  const allSelected = selectedCount === UPLOAD_SLOTS.length;

  function onFileChange(slot: UploadSlot, file: File | null) {
    setFiles((prev) => ({ ...prev, [slot]: file ?? undefined }));
    setFieldErrors((prev) => ({ ...prev, [slot]: undefined }));
    if (!file) {
      setInputKeys((prev) => ({ ...prev, [slot]: prev[slot] + 1 }));
    }
    // A change to the file set starts a new attempt — the last attempt's
    // result no longer describes what's in the form.
    setSuccess(null);
    setValidationErrors(null);
    setGenericError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setValidationErrors(null);
    setGenericError(null);

    const parsed = uploadFormSchema.safeParse(files);
    if (!parsed.success) {
      const next: Partial<Record<UploadSlot, string>> = {};
      for (const issue of parsed.error.issues) {
        const slot = issue.path[0] as UploadSlot;
        next[slot] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.upload(parsed.data);
      setSuccess(result);
      setFiles({});
      setInputKeys((prev) => ({
        entities: prev.entities + 1,
        ownership: prev.ownership + 1,
        filings: prev.filings + 1,
      }));
      toast.success('Upload succeeded');
    } catch (err) {
      if (err instanceof UploadValidationError) {
        setValidationErrors(err.errors);
        toast.error(`Upload rejected — ${err.errors.length} error(s) found`);
      } else if (err instanceof ApiError) {
        setGenericError(err.message);
        toast.error(err.message);
      } else {
        setGenericError('Something went wrong uploading these files.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const groupedErrors = useMemo(() => groupAndSortErrors(validationErrors ?? []), [validationErrors]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Upload data</h1>
        <p className="text-sm text-muted-foreground">
          Upload entities, ownership, and filings together — the whole batch is validated and
          written atomically. Re-uploading the same files is safe (rows are upserted by natural
          key).
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Select files</CardTitle>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {selectedCount} of {UPLOAD_SLOTS.length} selected
            </span>
          </div>
          <CardDescription>Each slot accepts a .csv or single-sheet .xlsx file.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {UPLOAD_SLOTS.map((slot) => (
              <FileDropzone
                key={slot}
                slot={slot}
                inputKey={inputKeys[slot]}
                file={files[slot]}
                error={fieldErrors[slot]}
                onFileChange={(file) => onFileChange(slot, file)}
              />
            ))}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting || !allSelected}>
                {submitting ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
                {submitting ? 'Uploading…' : 'Upload'}
              </Button>
              {!allSelected && (
                <span className="text-xs text-muted-foreground">
                  Select all {UPLOAD_SLOTS.length} files to continue.
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {genericError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {genericError}
        </div>
      )}

      {success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2Icon className="size-5 text-[var(--viz-status-good)]" aria-hidden />
              Upload succeeded
            </CardTitle>
            <CardDescription>Rows were validated and upserted by natural key.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Entities</dt>
                <dd className="text-lg font-semibold tabular-nums">{success.entities}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ownership edges</dt>
                <dd className="text-lg font-semibold tabular-nums">{success.ownershipEdges}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Filings</dt>
                <dd className="text-lg font-semibold tabular-nums">{success.filings}</dd>
              </div>
            </dl>
            <Button asChild className="mt-4">
              <Link href="/">
                <ListIcon /> View entities
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {validationErrors && validationErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlertIcon className="size-5 text-[var(--viz-status-critical)]" aria-hidden />
              {validationErrors.length} error{validationErrors.length === 1 ? '' : 's'} found — nothing
              was written
            </CardTitle>
            <CardDescription>
              Fix every row below and re-upload the full set. Line numbers match what you&apos;d see
              with the file open in a spreadsheet (header = line 1).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {groupedErrors.map(([file, errors]) => {
              const slot = UPLOAD_SLOT_BY_FILE[file];
              const uploadedName = slot ? files[slot]?.name : undefined;
              return (
                <div key={file}>
                  <h3 className="mb-2 text-sm font-semibold">
                    {slot ? UPLOAD_FILE_NAMES[slot] : file}
                    {uploadedName && (
                      <span className="font-normal text-muted-foreground"> — {uploadedName}</span>
                    )}
                  </h3>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="w-16 px-2 py-1.5 font-medium">Line</th>
                          <th className="w-40 px-2 py-1.5 font-medium">Column</th>
                          <th className="px-2 py-1.5 font-medium">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errors.map((err, i) => (
                          <tr key={`${err.line}-${err.column}-${i}`} className="border-t">
                            <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{err.line}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{err.column}</td>
                            <td className="px-2 py-1.5">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FileDropzone({
  slot,
  inputKey,
  file,
  error,
  onFileChange,
}: {
  slot: UploadSlot;
  inputKey: number;
  file: File | undefined;
  error: string | undefined;
  onFileChange: (file: File | null) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputId = `file-${slot}`;

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFileChange(dropped);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{UPLOAD_FILE_NAMES[slot]}</span>
        <span className="text-xs text-muted-foreground">{SLOT_DESCRIPTIONS[slot]}</span>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          'flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 transition-colors',
          dragActive && 'border-primary bg-primary/5',
          !dragActive && (error ? 'border-destructive/40 bg-destructive/5' : 'border-input'),
          file && !error && 'border-solid bg-muted/30'
        )}
      >
        {file ? (
          <>
            <CheckCircle2Icon
              className="size-4 shrink-0 text-[var(--viz-status-good)]"
              aria-hidden
            />
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="truncate text-sm">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${file.name}`}
              onClick={() => onFileChange(null)}
            >
              <XIcon />
            </Button>
          </>
        ) : (
          <>
            <UploadCloudIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex-1 text-sm text-muted-foreground">
              Drag & drop, or{' '}
              <label htmlFor={inputId} className="cursor-pointer font-medium text-foreground underline underline-offset-2">
                browse
              </label>
            </span>
            <FileSpreadsheetIcon className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
          </>
        )}
        <input
          key={inputKey}
          id={inputId}
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function groupAndSortErrors(errors: UploadFieldError[]): [string, UploadFieldError[]][] {
  const byFile = new Map<string, UploadFieldError[]>();
  for (const err of errors) {
    if (!byFile.has(err.file)) byFile.set(err.file, []);
    byFile.get(err.file)!.push(err);
  }
  for (const list of byFile.values()) {
    list.sort((a, b) => a.line - b.line);
  }
  // Stable file order: entities.csv, ownership.csv, filings.csv, then anything else.
  const order = ['entities.csv', 'ownership.csv', 'filings.csv'];
  return [...byFile.entries()].sort((a, b) => {
    const ai = order.indexOf(a[0]);
    const bi = order.indexOf(b[0]);
    return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
  });
}
