'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { createEntitySchema, ENTITY_TYPES, type CreateEntityInput } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewEntityPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateEntityInput>({
    resolver: zodResolver(createEntitySchema),
    defaultValues: { name: '', jurisdiction: '', formationDate: '', registeredAgent: '' },
  });

  const entityType = watch('entityType');

  const onSubmit = async (values: CreateEntityInput) => {
    try {
      const entity = await api.createEntity(values);
      toast.success(`${entity.name} created`);
      router.push(`/entities/${entity.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create entity.');
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Register a new entity</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Entity name</Label>
              <Input id="name" placeholder="Acme Robotics LLC" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entityType">Entity type</Label>
              <Select
                value={entityType}
                onValueChange={(value) =>
                  setValue('entityType', value as CreateEntityInput['entityType'], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="entityType" className="w-full">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.entityType && (
                <p className="text-xs text-destructive">{errors.entityType.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Input id="jurisdiction" placeholder="US-DE" {...register('jurisdiction')} />
              {errors.jurisdiction && (
                <p className="text-xs text-destructive">{errors.jurisdiction.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                COUNTRY-SUBDIVISION code, e.g. US-DE, US-CA, CA-ON.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="formationDate">Formation date (optional)</Label>
              <Input id="formationDate" type="date" {...register('formationDate')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="registeredAgent">Registered agent (optional)</Label>
              <Input
                id="registeredAgent"
                placeholder="Northwest Registered Agent"
                {...register('registeredAgent')}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Creating…' : 'Create entity'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
