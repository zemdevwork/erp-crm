import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getReportDashboardData } from '@/server/actions/report-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconUsers,
  IconBuilding,
  IconCash,
  IconReceipt,
  IconChartBar,
  IconTrendingUp,
  IconAlertTriangle,
  IconArrowRight, IconFileText
} from '@tabler/icons-react';

export default async function ReportsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  // Get dashboard data
  const dashboardResult = await getReportDashboardData({});

  if (!dashboardResult?.data) {
    throw new Error('Failed to load dashboard data');
  }

  const dashboardData = dashboardResult.data;
  const userRole = session.user.role || 'telecaller';

  // Define all available reports with their details
  const allReports = [
    {
      id: 'telecaller',
      title: 'Telecaller Performance',
      description:
        'Individual telecaller metrics, conversion rates, call analytics, and performance KPIs',
      icon: IconUsers,
      color: 'bg-blue-500',
      href: '/reports/telecaller',
      features: [
        'Performance Metrics',
        'Conversion Analysis',
        'Call Statistics',
        'Follow-up Tracking',
      ],
      accessRoles: ['admin', 'executive', 'telecaller'],
    },
    {
      id: 'branch',
      title: 'Branch Analytics',
      description:
        'Branch-wise performance comparison, enquiry distribution, and regional insights',
      icon: IconBuilding,
      color: 'bg-green-500',
      href: '/reports/branch',
      features: [
        'Branch Comparison',
        'Regional Performance',
        'Enquiry Distribution',
        'Revenue Analysis',
      ],
      accessRoles: ['admin', 'executive'],
    },
    {
      id: 'admission-payment',
      title: 'Admission Payments',
      description:
        'Student course fee payments, admission fee collection status, and outstanding balance management',
      icon: IconCash,
      color: 'bg-purple-500',
      href: '/reports/admission-payment',
      features: [
        'Course Fee Tracking',
        'Outstanding Balances',
        'Collection Reports',
        'Payment History',
      ],
      accessRoles: ['admin', 'executive'],
    },
    {
      id: 'expense',
      title: 'Expense Analysis',
      description:
        'Comprehensive expense tracking, category breakdown, and cost optimization insights',
      icon: IconReceipt,
      color: 'bg-orange-500',
      href: '/reports/expense',
      features: ['Category Breakdown', 'Cost Analysis', 'Budget Tracking', 'Trend Analysis'],
      accessRoles: ['admin', 'executive'],
    },
    {
      id: 'invoice',
      title: 'Invoice Reports',
      description:
        'Invoice status tracking, payment timelines, aging analysis, and revenue insights',
      icon: IconChartBar,
      color: 'bg-indigo-500',
      href: '/reports/invoice',
      features: ['Status Tracking', 'Payment Timeline', 'Aging Analysis', 'Revenue Reports'],
      accessRoles: ['admin', 'executive'],
    },
    {
      id: 'income',
      title: 'Income Analysis',
      description:
        'Revenue tracking from invoices and other sources (excluding course fees), growth trends, and income distribution',
      icon: IconTrendingUp,
      color: 'bg-emerald-500',
      href: '/reports/income',
      features: ['Invoice Revenue', 'Growth Analysis', 'Source Distribution', 'Trend Forecasting'],
      accessRoles: ['admin', 'executive'],
    },
    {
      id: 'pending-payment',
      title: 'Pending Payments',
      description:
        'Outstanding dues tracking, aging analysis, collection targets, and follow-up management',
      icon: IconAlertTriangle,
      color: 'bg-red-500',
      href: '/reports/pending-payment',
      features: [
        'Outstanding Tracking',
        'Aging Analysis',
        'Collection Targets',
        'Priority Management',
      ],
      accessRoles: ['admin', 'executive', 'telecaller'],
    },
  ];

  // Filter reports based on user role
  const accessibleReports = allReports.filter((report) => report.accessRoles.includes(userRole));

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-8 p-6">
        {/* Header Section */}

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive business intelligence and performance insights for data-driven decisions
          </p>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {dashboardData.summaryCards.map((card, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="font-medium">{card.title}</CardDescription>
                <div className="h-5 w-5 text-muted-foreground">
                  {card.icon === 'Users' && <IconUsers />}
                  {card.icon === 'UserCheck' && <IconUsers />}
                  {card.icon === 'TrendingUp' && <IconTrendingUp />}
                  {card.icon === 'TrendingDown' && <IconTrendingUp />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                {card.trend && (
                  <div className="flex items-center space-x-1 text-sm mt-2">
                    {card.trend.type === 'up' ? (
                      <IconTrendingUp className="h-4 w-4 text-green-600" />
                    ) : card.trend.type === 'down' ? (
                      <IconTrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                    ) : null}
                    <span
                      className={
                        card.trend.type === 'up'
                          ? 'text-green-600 font-medium'
                          : card.trend.type === 'down'
                            ? 'text-red-600 font-medium'
                            : 'text-muted-foreground'
                      }
                    >
                      {card.trend.value}
                    </span>
                    <span className="text-muted-foreground">vs last period</span>
                  </div>
                )}
              </CardContent>
              <div
                className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${card.color === 'blue'
                    ? 'from-blue-500 to-blue-600'
                    : card.color === 'green'
                      ? 'from-green-500 to-green-600'
                      : card.color === 'emerald'
                        ? 'from-emerald-500 to-emerald-600'
                        : 'from-red-500 to-red-600'
                  }`}
              />
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconFileText className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Generate reports, export data, and access frequently used analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="h-auto py-2 justify-start sm:w-auto w-full" asChild>
                <Link href="/reports/telecaller">
                  <IconUsers className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Telecaller Report</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-2 justify-start sm:w-auto w-full" asChild>
                <Link href="/reports/branch">
                  <IconBuilding className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Branch Analytics</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-2 justify-start sm:w-auto w-full" asChild>
                <Link href="/reports/admission-payment">
                  <IconCash className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Payments</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-2 justify-start sm:w-auto w-full" asChild>
                <Link href="/reports/expense">
                  <IconReceipt className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Expenses</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-2 justify-start sm:w-auto w-full" asChild>
                <Link href="/reports/income">
                  <IconTrendingUp className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Income</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-2 justify-start sm:w-auto w-full" asChild>
                <Link href="/reports/pending-payment">
                  <IconAlertTriangle className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Pending</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Reports Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Available Reports</h2>
              <p className="text-muted-foreground">
                Comprehensive analytics and insights tailored to your role and requirements
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {accessibleReports.length} reports available
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accessibleReports.map((report) => {
              const IconComponent = report.icon;
              return (
                <Card
                  key={report.id}
                  className="group"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${report.color} text-white`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {report.id}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {report.title}
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {report.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Key Features:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {report.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-end pt-2">
                      <Button
                        asChild
                        size="sm"
                        className="group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        <Link href={report.href} className="flex items-center gap-2">
                          View Report
                          <IconArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

