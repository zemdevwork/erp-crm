'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, Eye, Edit, Trash2, MoreVertical, Plus, FileText } from 'lucide-react';
import { Proposal, ProposalStatus } from '@/types/proposal';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { getProposals, deleteProposal } from '@/server/actions/proposal/proposal-actions';

export default function ProposalsPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProposals = async () => {
        setIsLoading(true);
        const result = await getProposals();
        if (result?.data?.success && Array.isArray(result.data.data)) {
            // Note: Adjusting for potential API response wrapper structure if needed
            // The action returns { success: true, data: API_RESPONSE }
            // If the API returns direct array: result.data
            // If API returns { proposals: [...] }: result.data.proposals
            // Based on typical express res.json(proposals) it should be an array.
            setProposals(result.data.data);
        } else if (Array.isArray(result.data)) {
            setProposals(result.data);
        } else {
            console.error("Failed to fetch proposals", result);
            // toast.error("Failed to fetch proposals"); // Optional: don't spam on load
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchProposals();
    }, []);

    const filteredProposals = proposals.filter(p => {
        if (!search) return true;
        const lower = search.toLowerCase();
        return (
            p.proposalNo.toLowerCase().includes(lower) ||
            p.clientName.toLowerCase().includes(lower)
        );
    });

    const getStatusColor = (status: ProposalStatus) => {
        switch (status) {
            case ProposalStatus.DRAFT:
                return 'bg-gray-100 text-gray-800';
            case ProposalStatus.SENT:
                return 'bg-blue-100 text-blue-800';
            case ProposalStatus.ACCEPTED:
                return 'bg-green-100 text-green-800';
            case ProposalStatus.REJECTED:
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (date: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleDelete = async (id: string) => {
        const confirm = window.confirm("Are you sure you want to delete this proposal?");
        if (!confirm) return;

        const res = await deleteProposal({ id });
        if (res?.data?.success) {
            toast.success("Proposal deleted");
            fetchProposals(); // Refresh
        } else {
            toast.error(res?.data?.message || "Failed to delete proposal");
        }
    };

    return (
        <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
                    <p className="text-gray-600">Manage and track proposals</p>
                </div>
                <Button onClick={() => router.push('/proposals/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Proposal
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>
                        Search proposals by number or client name
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* List */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proposal No</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Loading proposals...
                                    </TableCell>
                                </TableRow>
                            ) : filteredProposals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No proposals found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProposals.map((proposal) => (
                                    <TableRow key={proposal.id}>
                                        <TableCell className="font-medium">{proposal.proposalNo}</TableCell>
                                        <TableCell>{proposal.clientName}</TableCell>
                                        <TableCell>{formatDate(proposal.createdAt)}</TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(proposal.status)}>
                                                {proposal.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(proposal.totalAmount || 0)}</TableCell>
                                        <TableCell>{proposal.createdByUser || 'System'}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => router.push(`/proposals/${proposal.id}`)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </DropdownMenuItem>
                                                    {proposal.status === ProposalStatus.DRAFT && (
                                                        <DropdownMenuItem onClick={() => router.push(`/proposals/${proposal.id}/edit`)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => toast.info('Preview PDF (Not implemented remote)')}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        Preview PDF
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {proposal.status === ProposalStatus.DRAFT && (
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(proposal.id)}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
