'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createProposal } from '@/server/actions/proposal/proposal-actions';

const proposalItemSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price must be positive'),
});

const createProposalSchema = z.object({
    clientName: z.string().min(1, 'Client Name is required'),
    clientEmail: z.string().email().optional().or(z.literal('')),
    clientPhone: z.string().optional(),
    items: z.array(proposalItemSchema),
});

type ProposalFormValues = z.infer<typeof createProposalSchema>;

export default function CreateProposalPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ProposalFormValues>({
        resolver: zodResolver(createProposalSchema),
        defaultValues: {
            clientName: '',
            clientEmail: '',
            clientPhone: '',
            items: [{ description: '', quantity: 1, unitPrice: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    // Watch items for total calculation
    const items = form.watch('items');
    const totalAmount = items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;

    const onSubmit = async (data: ProposalFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await createProposal(data);
            if (res?.data?.success) {
                toast.success('Proposal created successfully!');
                router.push('/proposals');
            } else {
                toast.error(res?.data?.message || 'Failed to create proposal');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Proposal</h1>
                    <p className="text-gray-600">Draft a new proposal for a client</p>
                </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Details</CardTitle>
                            <CardDescription>Enter the client's information</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="clientName">Client Name *</Label>
                                <Input
                                    id="clientName"
                                    placeholder="e.g. Acme Corp"
                                    {...form.register('clientName')}
                                />
                                {form.formState.errors.clientName && (
                                    <p className="text-sm text-red-500">{form.formState.errors.clientName.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="clientEmail">Email</Label>
                                <Input
                                    id="clientEmail"
                                    type="email"
                                    placeholder="client@example.com"
                                    {...form.register('clientEmail')}
                                />
                                {form.formState.errors.clientEmail && (
                                    <p className="text-sm text-red-500">{form.formState.errors.clientEmail.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="clientPhone">Phone</Label>
                                <Input
                                    id="clientPhone"
                                    placeholder="e.g. +1 234 567 890"
                                    {...form.register('clientPhone')}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Items</CardTitle>
                                    <CardDescription>Add services or products to the proposal</CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Item
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-4 items-start">
                                    <div className="flex-1 grid gap-2">
                                        <Label className={index !== 0 ? 'sr-only' : ''}>Description</Label>
                                        <Input
                                            placeholder="Item description"
                                            {...form.register(`items.${index}.description`)}
                                        />
                                        {form.formState.errors.items?.[index]?.description && (
                                            <p className="text-sm text-red-500">{form.formState.errors.items[index]?.description?.message}</p>
                                        )}
                                    </div>
                                    <div className="w-24 grid gap-2">
                                        <Label className={index !== 0 ? 'sr-only' : ''}>Qty</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                                        />
                                    </div>
                                    <div className="w-32 grid gap-2">
                                        <Label className={index !== 0 ? 'sr-only' : ''}>Unit Price</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                                        />
                                    </div>
                                    <div className="w-32 grid gap-2 text-right">
                                        <Label className={index !== 0 ? 'sr-only' : ''}>Total</Label>
                                        <div className="h-10 flex items-center justify-end font-medium">
                                            {(items[index]?.quantity || 0) * (items[index]?.unitPrice || 0)}
                                        </div>
                                    </div>
                                    <div className={index === 0 ? 'pt-8' : ''}>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                                    No items added. Click "Add Item" to start.
                                </div>
                            )}

                            <Separator className="my-4" />

                            <div className="flex justify-end items-center gap-4 text-lg font-semibold">
                                <span>Total Amount:</span>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Create Proposal'}
                                {!isSubmitting && <Save className="ml-2 h-4 w-4" />}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </form>
        </div>
    );
}
