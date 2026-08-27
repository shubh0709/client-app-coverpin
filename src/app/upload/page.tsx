'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  ListIcon,
  Loader2Icon,
  TriangleAlertIcon,
  UploadIcon,
} from 'lucide-react';
import { api, ApiError, UploadValidationError } from '@/lib/api';
import { UPLOAD_FILE_NAMES, uploadFormSchema, type UploadFieldError, type UploadSlot, type UploadSuccess } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const SLOT_DESCRIPTIONS: Record<UploadSlot, string> = {
  entities: 'One row per Entity or FQ registration.',
  ownership: 'Parent → child ownership edges with percentages.',
  filings: 'Filing obligations and their due dates, per registration.',
};

type Files = Partial<Record<UploadSlot, File>>;

export default function UploadPage() {
  const [files, setFiles] = useState<Files>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<UploadSlot, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const [validationErrors, setValidationErrors] = useState<UploadFieldError[] | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);

  function onFileChange(slot: UploadSlot, file: File | null) {
    setFiles((prev) => ({ ...prev, [slot]: file ?? undefined }));
    setFieldErrors((prev) => ({ ...prev, [slot]: undefined }));
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
          <CardTitle>Select files</CardTitle>
          <CardDescription>Each slot accepts a .csv or single-sheet .xlsx file.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {(Object.keys(UPLOAD_FILE_NAMES) as UploadSlot[]).map((slot) => (
              <div key={slot} className="flex flex-col gap-1.5">
                <Label htmlFor={`file-${slot}`}>
                  {UPLOAD_FILE_NAMES[slot]}
                  <span className="font-normal text-muted-foreground"> — {SLOT_DESCRIPTIONS[slot]}</span>
                </Label>
                <div className="flex items-center gap-2">
                  <FileSpreadsheetIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <input
                    id={`file-${slot}`}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => onFileChange(slot, e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-foreground file:mr-3 file:h-8 file:rounded-lg file:border file:border-input file:bg-background file:px-2.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
                  />
                </div>
                {fieldErrors[slot] && (
                  <p className="text-xs text-destructive">{fieldErrors[slot]}</p>
                )}
              </div>
            ))}

            <div>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
                {submitting ? 'Uploading…' : 'Upload'}
              </Button>
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
            {groupedErrors.map(([file, errors]) => (
              <div key={file}>
                <h3 className="mb-2 text-sm font-semibold">{file}</h3>
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
            ))}
          </CardContent>
        </Card>
      )}
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
