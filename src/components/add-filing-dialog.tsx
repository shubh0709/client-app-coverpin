'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { createFilingSchema, FILING_TYPES, type CreateFilingInput, type Filing } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function AddFilingDialog({
  entityId,
  onCreated,
}: {
  entityId: string;
  onCreated: (filing: Filing) => void;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFilingInput>({
    resolver: zodResolver(createFilingSchema),
    defaultValues: { dueDate: '', notes: '' },
  });

  const filingType = watch('filingType');

  const onSubmit = async (values: CreateFilingInput) => {
    try {
      const filing = await api.createFiling(entityId, values);
      toast.success('Filing added');
      onCreated(filing);
      reset({ dueDate: '', notes: '' });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create filing.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add filing</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a filing</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filingType">Filing type</Label>
            <Select
              value={filingType}
              onValueChange={(value) =>
                setValue('filingType', value as CreateFilingInput['filingType'], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="filingType" className="w-full">
                <SelectValue placeholder="Select filing type" />
              </SelectTrigger>
              <SelectContent>
                {FILING_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.filingType && (
              <p className="text-xs text-destructive">{errors.filingType.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueDate">Due date (optional)</Label>
            <Input id="dueDate" type="date" {...register('dueDate')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add filing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
