import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDashboardData } from '@/lib/actions/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import prisma from '@/lib/prisma';

import { Button } from '@/components/ui/button';
import {
  IconUsers,
  IconUserPlus,
  IconClock,
  IconPhone,
  IconAlertCircle,
  IconCalendar,
  IconTarget,
  IconTrendingUp,
  IconPhoneCall,
  IconUserCheck,
  IconEye,
  IconCalendarClock,
  IconUserSearch,
  IconClockExclamation,
  IconReceipt,
} from '@tabler/icons-react';
import Link from 'next/link';

export default async function Dashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  // Get branch name if user is executive
  let branchName: string | undefined;
  if (session.user.role === 'executive' && session.user.branch) {
    const branch = await prisma.branch.findUnique({
      where: { id: session.user.branch },
      select: { name: true },
    });
    branchName = branch?.name;
  }

  // Get dashboard data - for telecallers, filter by their assigned enquiries
  const isTelecaller = session.user.role === 'telecaller';
  const isExecutive = session.user.role === 'executive';
  const dashboardData = await getDashboardData(
    isTelecaller ? session.user.id : undefined,
    session.user.role || undefined,
    isExecutive ? session.user.branch || undefined : undefined
  );

  const { stats, followUpStats, recentActivity, performanceMetrics } = dashboardData;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* User welcome section */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>
              Role: {session.user.role?.toUpperCase() || 'TELECALLER'}
              {session.user.role === 'executive' && session.user.branch && (
                <> • Branch: {branchName || session.user.branch}</>
              )}
              {' • '}Last login: {new Date(session.session.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Total Enquiries</CardDescription>
              <IconUsers className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEnquiries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>New Enquiries</CardDescription>
              <IconUserPlus className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.newEnquiries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Pending Follow-ups</CardDescription>
              <IconClock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingFollowUps}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Total Calls</CardDescription>
              <IconPhone className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
            </CardContent>
          </Card>
        </div>

        {/* Follow-up Status Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconAlertCircle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-800">Overdue Follow-ups</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-red-600">{followUpStats.overdueCount}</div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/follow-ups?filter=overdue">View All</Link>
                </Button>
              </div>
              <p className="text-sm text-red-600 mt-2">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconCalendar className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-yellow-800">Today&apos;s Follow-ups</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-yellow-600">{followUpStats.todayCount}</div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/follow-ups?filter=today">View All</Link>
                </Button>
              </div>
              <p className="text-sm text-yellow-600 mt-2">Scheduled for today</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconTarget className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-800">Interested Leads</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-600">
                  {followUpStats.interestedLeadsCount}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/my-enquiries?status=interested">View All</Link>
                </Button>
              </div>
              <p className="text-sm text-green-600 mt-2">Ready for conversion</p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconTrendingUp className="h-5 w-5" />
                <CardTitle>Recent Activity (Last 7 Days)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <IconUserPlus className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">New Enquiries</p>
                    <p className="text-sm text-muted-foreground">
                      {recentActivity.newEnquiries.count} new leads
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{recentActivity.newEnquiries.count}</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <IconPhoneCall className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">Calls Made</p>
                    <p className="text-sm text-muted-foreground">
                      {recentActivity.callsMade.count} calls completed
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{recentActivity.callsMade.count}</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <IconUserCheck className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="font-medium">Enrollments</p>
                    <p className="text-sm text-muted-foreground">
                      {recentActivity.enrollments.count} successful conversions
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{recentActivity.enrollments.count}</div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {session.user.role === 'telecaller' ? (
                <>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/my-enquiries">
                      <IconEye className="mr-2 h-4 w-4" />
                      View My Enquiries
                    </Link>
                  </Button>

                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/follow-ups?filter=today">
                      <IconCalendarClock className="mr-2 h-4 w-4" />
                      Today&apos;s Follow-ups
                    </Link>
                  </Button>

                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/call-register">
                      <IconPhoneCall className="mr-2 h-4 w-4" />
                      Call Register
                    </Link>
                  </Button>

                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/my-enquiries?tab=new">
                      <IconUserSearch className="mr-2 h-4 w-4" />
                      New Enquiries
                    </Link>
                  </Button>

                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/follow-ups?filter=overdue">
                      <IconClockExclamation className="mr-2 h-4 w-4" />
                      Overdue Follow-ups
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/enquiries">
                      <IconEye className="mr-2 h-4 w-4" />
                      View Enquiries
                    </Link>
                  </Button>

                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/follow-ups">
                      <IconCalendarClock className="mr-2 h-4 w-4" />
                      Follow-ups
                    </Link>
                  </Button>

                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/reports">
                      <IconTrendingUp className="mr-2 h-4 w-4" />
                      Reports
                    </Link>
                  </Button>

                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/admissions">
                      <IconUserCheck className="mr-2 h-4 w-4" />
                      Admissions
                    </Link>
                  </Button>

                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/expenses">
                      <IconReceipt className="mr-2 h-4 w-4" />
                      Expenses
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Your key metrics overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {performanceMetrics.totalEnquiries}
                </div>
                <p className="text-sm text-muted-foreground">Total Enquiries</p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {performanceMetrics.interestRate}%
                </div>
                <p className="text-sm text-muted-foreground">Interest Rate</p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {performanceMetrics.conversionRate}%
                </div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {performanceMetrics.totalCalls}
                </div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
