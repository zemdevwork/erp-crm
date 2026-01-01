'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Phone, PhoneCall, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { getCallLogs } from '@/server/actions/call-log';
import { CALL_OUTCOME_OPTIONS } from '@/constants/enquiry';
import Link from 'next/link';
import { toast } from 'sonner';
import { CallLog } from '@/types/enquiry';

export default function CallRegisterPage() {
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState('all');

  // Fetch call logs
  const loadCallLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: { page: number; limit: number; outcome?: string; startDate?: string } = {
        page: 1,
        limit: 100,
      };

      if (outcomeFilter !== 'all') {
        filters.outcome = outcomeFilter;
      }

      if (dateRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filters.startDate = today.toISOString();
      } else if (dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filters.startDate = weekAgo.toISOString();
      } else if (dateRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filters.startDate = monthAgo.toISOString();
      }

      const result = await getCallLogs(filters);
      if (result.success) {
        setCallLogs((result.data as CallLog[]) || []);
      } else {
        toast.error(result.message || 'Failed to fetch call logs');
      }
    } catch {
      toast.error('Failed to fetch call logs');
    } finally {
      setIsLoading(false);
    }
  }, [outcomeFilter, dateRange]);

  useEffect(() => {
    loadCallLogs();
  }, [loadCallLogs]);

  // Filter call logs by search term
  const filteredCallLogs = callLogs.filter(
    (callLog) =>
      callLog.enquiry.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      callLog.enquiry.phone.includes(searchTerm) ||
      callLog.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCallTypeIcon = (outcome: string) => {
    switch (outcome) {
      case 'ANSWERED':
        return <PhoneCall className="h-4 w-4 text-green-500" />;
      case 'NOT_ANSWERED':
        return <PhoneMissed className="h-4 w-4 text-red-500" />;
      case 'BUSY':
        return <Phone className="h-4 w-4 text-yellow-500" />;
      case 'SWITCHED_OFF':
        return <PhoneOutgoing className="h-4 w-4 text-gray-500" />;
      case 'INVALID_NUMBER':
        return <PhoneIncoming className="h-4 w-4 text-red-500" />;
      default:
        return <Phone className="h-4 w-4 text-gray-500" />;
    }
  };

  const getOutcomeColor = (outcome: string) => {
    const outcomeOption = CALL_OUTCOME_OPTIONS.find((option) => option.value === outcome);
    return outcomeOption
      ? `bg-${outcomeOption.color}-100 text-${outcomeOption.color}-800`
      : 'bg-gray-100 text-gray-800';
  };

  const formatDuration = (duration: number) => {
    if (!duration) return '-';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalCalls = () => filteredCallLogs.length;
  const getAnsweredCalls = () =>
    filteredCallLogs.filter((call) => call.outcome === 'ANSWERED').length;
  const getTotalDuration = () =>
    filteredCallLogs.reduce((total, call) => total + (call.duration || 0), 0);

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Call Register</h1>
          <p className="text-gray-600">View and analyze all call logs</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalCalls()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Answered</CardTitle>
            <PhoneCall className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getAnsweredCalls()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <PhoneCall className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {getTotalCalls() > 0 ? Math.round((getAnsweredCalls() / getTotalCalls()) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Phone className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatDuration(getTotalDuration())}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 flex-wrap gap-2">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            {CALL_OUTCOME_OPTIONS.map((outcome) => (
              <SelectItem key={outcome.value} value={outcome.value}>
                {outcome.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search by name, phone, or agent..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        <Button onClick={loadCallLogs} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Call Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Call Logs ({filteredCallLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCallLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {isLoading ? 'Loading...' : 'No call logs found.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCallLogs.map((callLog) => (
                  <TableRow key={callLog.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(callLog.callDate).toLocaleDateString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(callLog.callDate).toLocaleTimeString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/enquiries/${callLog.enquiry.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {callLog.enquiry.candidateName}
                      </Link>
                    </TableCell>
                    <TableCell>{callLog.enquiry.phone}</TableCell>
                    <TableCell>{callLog.createdBy.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getCallTypeIcon(callLog.outcome || '')}
                        <Badge className={getOutcomeColor(callLog.outcome || '')}>
                          {CALL_OUTCOME_OPTIONS.find((opt) => opt.value === callLog.outcome)
                            ?.label || callLog.outcome}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(callLog.duration || 0)}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{callLog.notes || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/enquiries/${callLog.enquiry.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
