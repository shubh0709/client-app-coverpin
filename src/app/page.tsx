'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { ComplianceEntity } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EntityStatusBadge } from '@/components/status-badge';

export default function DashboardPage() {
  const [entities, setEntities] = useState<ComplianceEntity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listEntities()
      .then(setEntities)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load entities.');
      });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Entities</h1>
          <p className="text-sm text-muted-foreground">
            Compliance entities and their filing status across jurisdictions.
          </p>
        </div>
        <Button asChild>
          <Link href="/entities/new">New entity</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error} Make sure the backend is running at{' '}
          <code>{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}</code>.
        </div>
      )}

      {!error && entities === null && (
        <p className="text-sm text-muted-foreground">Loading entities…</p>
      )}

      {entities !== null && entities.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No entities yet. Create one, or run <code>npm run seed</code> in coverpin-backend.
        </div>
      )}

      {entities !== null && entities.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Filings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities.map((entity) => (
                <TableRow key={entity.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/entities/${entity.id}`} className="hover:underline">
                      {entity.name}
                    </Link>
                  </TableCell>
                  <TableCell>{entity.entityType.replace('_', ' ')}</TableCell>
                  <TableCell>{entity.jurisdiction}</TableCell>
                  <TableCell>
                    <EntityStatusBadge status={entity.status} />
                  </TableCell>
                  <TableCell>{entity.filings?.length ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
