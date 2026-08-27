import { BarChart3Icon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReactNode } from 'react';

export function ChartCard({
  title,
  description,
  isEmpty,
  emptyMessage,
  children,
}: {
  title: string;
  description?: string;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1">
        {isEmpty ? <EmptyChartState message={emptyMessage} /> : children}
      </CardContent>
    </Card>
  );
}

export function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <BarChart3Icon className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
