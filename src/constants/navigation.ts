import {
  IconCash,
  IconDashboard,
  IconDatabase,
  IconFileInvoice,
  IconFilePlus,
  IconFileText,
  IconListDetails,
  IconPhoneCall,
  IconUserPlus,
  IconUsers,
  IconFileDollar,
  IconBriefcase
} from '@tabler/icons-react';
import type { SidebarData } from '@/types/navigation';
import { APP_CONFIG } from '@/config/app';

export const SIDEBAR_DATA: SidebarData = {
  user: {
    id: '1',
    name: 'John Doe',
    email: 'john@company.com',
    image: '/avatars/default.jpg',
  },
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Enquiries',
      url: '/enquiries',
      icon: IconUsers,
    },
    {
      title: 'Job Orders',
      url: '#',
      icon: IconBriefcase,
      isActive: true, // Default open for visibility or logic based
      items: [
        {
          title: 'Job List',
          url: '/enquiries/job-orders',
        },
        {
          title: 'Pending Jobs',
          url: '/enquiries/job-orders/pending',
        },
        {
          title: 'Completed Jobs',
          url: '/enquiries/job-orders/completed',
        },
        {
          title: 'Due Job Orders',
          url: '/enquiries/job-orders/due',
        },
      ],
    },
    {
      title: 'Follow-ups',
      url: '/follow-ups',
      icon: IconListDetails,
    },
    {
      title: 'Call Register',
      url: '/call-register',
      icon: IconPhoneCall,
    },
    {
      title: 'Admissions',
      url: '/admissions',
      icon: IconFilePlus,
    },
    {
      title: 'Service Billing',
      url: '/services',
      icon: IconFileDollar,
    },
  ],
  admin: [
    {
      title: 'Data Management',
      url: '/admin/data-management',
      icon: IconDatabase,
    },
    {
      title: 'Reports',
      url: '/reports',
      icon: IconFileText,
    },
    {
      title: 'Users',
      url: '/admin/users',
      icon: IconUserPlus,
    },
  ],
  navSecondary: [
    {
      title: 'Invoices',
      url: '/invoices',
      icon: IconFileInvoice,
    },
    {
      title: 'Expenses',
      url: '/expenses',
      icon: IconCash,
    },
  ],
};

export const COMPANY_INFO = {
  name: APP_CONFIG.name,
  description: APP_CONFIG.description,
} as const;
