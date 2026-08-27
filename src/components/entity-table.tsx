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
import { CATEGORICAL_SLOTS } from '@/lib/chart-colors';
import { formatDate, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ChildEntity, Relation, TopLevelEntity } from '@/lib/schemas';

type EntityNode = TopLevelEntity | ChildEntity;

// Reserved for search-match highlighting only (never a categorical series on
// this page, so reusing this slot can't collide with a chart's own legend).
const SEARCH_HIGHLIGHT_COLOR = CATEGORICAL_SLOTS[3]; // yellow

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Wraps every case-insensitive occurrence of `term` inside `text` in a
 * <mark>. Only ever called for a node the backend already flagged as
 * `matchesSearch` — this re-finds *where* the match is for rendering, it
 * doesn't decide *whether* one exists (the database already did). */
function HighlightedName({ text, term }: { text: string; term: string }) {
  const trimmed = term.trim();
  if (!trimmed) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-sm px-0.5 text-inherit"
            style={{ backgroundColor: `color-mix(in oklab, ${SEARCH_HIGHLIGHT_COLOR} 55%, transparent)` }}
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** True if this node, or any descendant at any depth, matched the active
 * search term — `matchesSearch` itself comes straight from the database, so
 * this is just walking the already-fetched tree, not re-testing strings. */
function subtreeHasMatch(node: EntityNode): boolean {
  return node.matchesSearch || node.children.some(subtreeHasMatch);
}

/** Collects the path of every node whose subtree contains a search match —
 * i.e. every row that needs to be expanded, from the top-level entity down
 * to (and including) the matching row(s), so the match is visible without
 * the user manually drilling in. */
function collectAutoExpandPaths(nodes: EntityNode[], parentPath: string | undefined): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.id}` : node.id;
    if (node.children.length > 0 && subtreeHasMatch(node)) paths.push(path);
    paths.push(...collectAutoExpandPaths(node.children, path));
  }
  return paths;
}

export function EntityTable({
  entities,
  searchTerm = '',
}: {
  entities: TopLevelEntity[];
  /** The active search term — used only to render the highlight (full row
   * tint + matched substring) on rows the backend already flagged via
   * `matchesSearch`, never to decide which rows match. */
  searchTerm?: string;
}) {
  // Keyed by a path (not a bare entity id) — the same entity can legitimately
  // appear more than once in the tree (co-owned by two parents), and each
  // occurrence expands independently of the others.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Whenever a new tree arrives (e.g. a search result), auto-expand every
  // ancestor path leading to a match — additively, so it never collapses a
  // row the user opened by hand. When there's no active search, every
  // `matchesSearch` flag is false and this is a no-op. Adjusted during
  // render (React's documented pattern for deriving state from a prop
  // change) rather than in an effect, so it doesn't cost an extra commit.
  const [prevEntities, setPrevEntities] = useState(entities);
  if (entities !== prevEntities) {
    setPrevEntities(entities);
    const autoOpen = collectAutoExpandPaths(entities, undefined);
    if (autoOpen.length > 0) {
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const path of autoOpen) next.add(path);
        return next;
      });
    }
  }

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
        <TableHeader className="bg-black/5 dark:bg-white/10">
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
              searchTerm={searchTerm}
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
  searchTerm,
}: {
  path: string;
  depth: number;
  relation: Relation | null;
  node: EntityNode;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  searchTerm: string;
}) {
  const isOpen = expanded.has(path);
  const hasChildren = node.children.length > 0;
  const ownershipPct = 'ownershipPct' in node ? node.ownershipPct : null;
  const isMatch = Boolean(searchTerm) && node.matchesSearch;

  return (
    <Fragment>
      <TableRow
        aria-expanded={hasChildren ? isOpen : undefined}
        className={cn(hasChildren && 'cursor-pointer', depth > 0 && !isMatch && 'bg-muted/30 hover:bg-muted/50')}
        style={
          isMatch
            ? { backgroundColor: `color-mix(in oklab, ${SEARCH_HIGHLIGHT_COLOR} 20%, transparent)` }
            : undefined
        }
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
          {node.matchesSearch && searchTerm ? (
            <HighlightedName text={node.entityName} term={searchTerm} />
          ) : (
            node.entityName
          )}
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
            searchTerm={searchTerm}
          />
        ))}
    </Fragment>
  );
}
