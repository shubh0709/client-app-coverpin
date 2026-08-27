'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { FILING_TRANSITIONS, type ComplianceEntity, type FilingStatus } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EntityStatusBadge, FilingStatusBadge, PriorityBadge } from '@/components/status-badge';
import { AddFilingDialog } from '@/components/add-filing-dialog';

export default function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [entity, setEntity] = useState<ComplianceEntity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  const load = () => {
    api
      .getEntity(id)
      .then(setEntity)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load entity.');
      });
  };

  useEffect(load, [id]);

  const handleGenerateChecklist = async () => {
    setChecklistLoading(true);
    try {
      const updated = await api.generateComplianceChecklist(id);
      setEntity(updated);
      toast.success('Compliance checklist generated');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to generate compliance checklist.',
      );
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleTransition = async (filingId: string, status: FilingStatus) => {
    setTransitioning(filingId);
    try {
      const filing = await api.transitionFiling(id, filingId, status);
      setEntity((prev) =>
        prev
          ? { ...prev, filings: prev.filings.map((f) => (f.id === filingId ? filing : f)) }
          : prev,
      );
      toast.success(`Filing moved to ${status.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Transition failed.');
    } finally {
      setTransitioning(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this entity? This cannot be undone.')) return;
    try {
      await api.deleteEntity(id);
      toast.success('Entity deleted');
      router.push('/');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete entity.');
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!entity) {
    return <p className="text-sm text-muted-foreground">Loading entity…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">{entity.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {entity.entityType.replace('_', ' ')} · {entity.jurisdiction}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EntityStatusBadge status={entity.status} />
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Formation date</p>
            <p>{entity.formationDate ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Registered agent</p>
            <p>{entity.registeredAgent ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">AI compliance checklist</CardTitle>
          <Button onClick={handleGenerateChecklist} disabled={checklistLoading} size="sm">
            {checklistLoading ? 'Generating…' : 'Generate checklist'}
          </Button>
        </CardHeader>
        <CardContent>
          {!entity.lastComplianceCheck && (
            <p className="text-sm text-muted-foreground">
              No checklist generated yet. This calls the backend&apos;s ChatGPT-backed endpoint,
              which returns a schema-validated list of likely upcoming filings.
            </p>
          )}
          {entity.lastComplianceCheck && (
            <div className="flex flex-col gap-3">
              <p className="text-sm">{entity.lastComplianceCheck.summary}</p>
              {entity.lastCheckedAt && (
                <p className="text-xs text-muted-foreground">
                  Last checked {new Date(entity.lastCheckedAt).toLocaleString()}
                </p>
              )}
              <Separator />
              <ul className="flex flex-col gap-3">
                {entity.lastComplianceCheck.items.map((item, i) => (
                  <li key={i} className="flex flex-col gap-1 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.filingType}</span>
                      <PriorityBadge priority={item.priority} />
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    {item.suggestedDueDate && (
                      <p className="text-xs text-muted-foreground">
                        Suggested due: {item.suggestedDueDate}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Filings</CardTitle>
          <AddFilingDialog
            entityId={id}
            onCreated={(filing) =>
              setEntity((prev) => (prev ? { ...prev, filings: [filing, ...prev.filings] } : prev))
            }
          />
        </CardHeader>
        <CardContent>
          {entity.filings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No filings yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Next step</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entity.filings.map((filing) => {
                  const nextStates = FILING_TRANSITIONS[filing.status];
                  return (
                    <TableRow key={filing.id}>
                      <TableCell>{filing.filingType.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <FilingStatusBadge status={filing.status} />
                      </TableCell>
                      <TableCell>{filing.dueDate ?? '—'}</TableCell>
                      <TableCell>
                        {nextStates.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Terminal</span>
                        ) : (
                          <div className="flex gap-2">
                            {nextStates.map((next) => (
                              <Button
                                key={next}
                                size="sm"
                                variant="outline"
                                disabled={transitioning === filing.id}
                                onClick={() => handleTransition(filing.id, next)}
                              >
                                {next.replace('_', ' ')}
                              </Button>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
