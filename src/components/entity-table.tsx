'use client';

import { Fragment, useState } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ComplianceStatusBadge, EntityStatusBadge, RelationChip } from '@/components/entity-badges';
import { formatDate, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ChildEntity, Relation, TopLevelEntity } from '@/lib/schemas';

type EntityNode = TopLevelEntity | ChildEntity;

export function EntityTable({ entities }: { entities: TopLevelEntity[] }) {
  // Keyed by a path (not a bare entity id) — the same entity can legitimately
  // appear more than once in the tree (co-owned by two parents), and each
  // occurrence expands independently of the others.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Entity</TableHead>
            <TableHead>Jurisdiction</TableHead>
            <TableHead>Entity type</TableHead>
            <TableHead>Entity status</TableHead>
            <TableHead>Compliance status</TableHead>
            <TableHead>Next due date</TableHead>
            <TableHead>Subsidiaries</TableHead>
            <TableHead>FQs</TableHead>
            <TableHead>Relation</TableHead>
            <TableHead>Ownership %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => (
            <EntityRow
              key={entity.id}
              path={entity.id}
              depth={0}
              relation={null}
              node={entity}
              expanded={expanded}
              onToggle={toggle}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EntityRow({
  path,
  depth,
  relation,
  node,
  expanded,
  onToggle,
}: {
  path: string;
  depth: number;
  relation: Relation | null;
  node: EntityNode;
  expanded: Set<string>;
  onToggle: (path: string) => void;
}) {
  const isOpen = expanded.has(path);
  const hasChildren = node.children.length > 0;
  const ownershipPct = 'ownershipPct' in node ? node.ownershipPct : null;

  return (
    <Fragment>
      <TableRow
        aria-expanded={hasChildren ? isOpen : undefined}
        className={cn(hasChildren && 'cursor-pointer', depth > 0 && 'bg-muted/30 hover:bg-muted/50')}
        onClick={hasChildren ? () => onToggle(path) : undefined}
      >
        <TableCell>
          {hasChildren && (
            <ChevronRightIcon
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-90',
              )}
              aria-hidden
            />
          )}
        </TableCell>
        <TableCell
          className="font-medium"
          style={depth > 0 ? { paddingLeft: `${1.5 * depth + 1}rem` } : undefined}
        >
          {depth > 0 && <span className="text-muted-foreground">↳ </span>}
          {node.entityName}
        </TableCell>
        <TableCell className="text-muted-foreground">{node.jurisdiction}</TableCell>
        <TableCell className="text-muted-foreground">{node.entityType}</TableCell>
        <TableCell>
          <EntityStatusBadge status={node.entityStatus} />
        </TableCell>
        <TableCell>
          <ComplianceStatusBadge status={node.complianceStatus} />
        </TableCell>
        <TableCell className="text-muted-foreground">{formatDate(node.nextDueDate)}</TableCell>
        <TableCell className="text-muted-foreground">{node.subsidiaryCount}</TableCell>
        <TableCell className="text-muted-foreground">{node.fqCount}</TableCell>
        <TableCell>{relation && <RelationChip relation={relation} />}</TableCell>
        <TableCell className="text-muted-foreground">
          {relation === 'subsidiary' ? formatPercent(ownershipPct) : null}
        </TableCell>
      </TableRow>
      {isOpen &&
        node.children.map((child) => (
          <EntityRow
            key={`${path}/${child.id}`}
            path={`${path}/${child.id}`}
            depth={depth + 1}
            relation={child.relation}
            node={child}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
    </Fragment>
  );
}
