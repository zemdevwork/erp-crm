import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create roles
  const roles = [
    {
      name: 'admin',
      description: 'Administrator with full access to all features',
    },
    {
      name: 'executive',
      description: 'Executive with access to management features',
    },
    {
      name: 'telecaller',
      description: 'Telecaller with access to calling and basic CRM features',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    console.log(`Created/Updated role: ${role.name}`);
  }

  // Create sample enquiry sources
  const enquirySources = [
    { name: 'Website' },
    { name: 'Instagram' },
    { name: 'Facebook' },
    { name: 'Referral' },
    { name: 'Walk-in' },
    { name: 'Phone Call' },
    { name: 'Google Ads' },
  ];

  for (const source of enquirySources) {
    await prisma.enquirySource.upsert({
      where: { name: source.name },
      update: {},
      create: source,
    });
    console.log(`Created/Updated enquiry source: ${source.name}`);
  }

  // Create sample branches
  const branches = [
    {
      name: 'Main Branch',
      address: '123 Main Street, City Center',
      phone: '+91 9876543210',
      email: 'main@institute.com',
    },
    {
      name: 'East Branch',
      address: '456 East Avenue, East District',
      phone: '+91 9876543211',
      email: 'east@institute.com',
    },
  ];

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { name: branch.name },
      update: {},
      create: branch,
    });
    console.log(`Created/Updated branch: ${branch.name}`);
  }

  // Create sample courses
  const courses = [
    {
      name: 'Web Development',
      description:
        'Full-stack web development course covering HTML, CSS, JavaScript, React, and Node.js',
      duration: '6 months',
    },
    {
      name: 'Digital Marketing',
      description:
        'Comprehensive digital marketing course including SEO, SEM, Social Media Marketing',
      duration: '4 months',
    },
    {
      name: 'Data Science',
      description: 'Data science and machine learning course with Python, R, and ML algorithms',
      duration: '8 months',
    },
    {
      name: 'Graphic Design',
      description: 'Creative graphic design course with Adobe Creative Suite',
      duration: '3 months',
    },
    {
      name: 'Mobile App Development',
      description: 'Native and cross-platform mobile app development with React Native and Flutter',
      duration: '5 months',
    },
    {
      name: 'UI/UX Design',
      description: 'User interface and user experience design course with Figma and Adobe XD',
      duration: '4 months',
    },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { name: course.name },
      update: {},
      create: course,
    });
    console.log(`Created/Updated course: ${course.name}`);
  }

  // Create sample required services
  const requiredServices = [
    { name: 'Career Guidance' },
    { name: 'Placement Assistance' },
    { name: 'Certification' },
    { name: 'Internship Support' },
    { name: 'Project Mentoring' },
  ];

  for (const service of requiredServices) {
    await prisma.requiredService.upsert({
      where: { name: service.name },
      update: {},
      create: service,
    });
    console.log(`Created/Updated required service: ${service.name}`);
  }

  // Get created data for relationships
  const createdCourses = await prisma.course.findMany();
  const createdBranches = await prisma.branch.findMany();
  const createdEnquirySources = await prisma.enquirySource.findMany();
  const createdRequiredServices = await prisma.requiredService.findMany();

  // Get existing admin user for enquiry relationships
  let adminUser = await prisma.user.findFirst({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' }, // Get the first admin user created
  });

  // If no admin user exists, create one
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        id: 'sample-user-id',
        name: 'Admin User',
        email: 'admin@crm.com',
        emailVerified: true,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`Created new admin user: ${adminUser.email}`);
  } else {
    console.log(`Using existing admin user: ${adminUser.email}`);
  }

  // Create sample enquiries
  const sampleEnquiries = [
    {
      candidateName: 'Rahul Sharma',
      phone: '+91 9876543210',
      contact2: '+91 9876543211',
      email: 'rahul.sharma@email.com',
      address: '123 MG Road, Bangalore, Karnataka 560001',
      status: 'NEW' as const,
      notes: 'Interested in web development course. Has basic HTML/CSS knowledge.',
      feedback: 'Very enthusiastic about learning',
      lastContactDate: new Date('2024-01-15'),
      branchId: createdBranches[0]?.id,
      preferredCourseId: createdCourses.find(c => c.name === 'Web Development')?.id,
      enquirySourceId: createdEnquirySources.find(s => s.name === 'Website')?.id,
      requiredServiceId: createdRequiredServices.find(s => s.name === 'Placement Assistance')?.id,
      createdByUserId: adminUser.id,
    },
    {
      candidateName: 'Priya Patel',
      phone: '+91 9876543212',
      email: 'priya.patel@email.com',
      address: '456 Park Street, Mumbai, Maharashtra 400001',
      status: 'CONTACTED' as const,
      notes: 'Looking for digital marketing course. Has marketing background.',
      feedback: 'Wants to upgrade skills for better opportunities',
      lastContactDate: new Date('2024-01-16'),
      branchId: createdBranches[1]?.id || createdBranches[0]?.id,
      preferredCourseId: createdCourses.find(c => c.name === 'Digital Marketing')?.id,
      enquirySourceId: createdEnquirySources.find(s => s.name === 'Instagram')?.id,
      requiredServiceId: createdRequiredServices.find(s => s.name === 'Certification')?.id,
      createdByUserId: adminUser.id,
    },
    {
      candidateName: 'Amit Kumar',
      phone: '+91 9876543213',
      contact2: '+91 9876543214',
      email: 'amit.kumar@email.com',
      address: '789 Sector 15, Noida, Uttar Pradesh 201301',
      status: 'INTERESTED' as const,
      notes: 'Engineering graduate interested in data science. Has Python experience.',
      feedback: 'Wants to transition to data science field',
      lastContactDate: new Date('2024-01-17'),
      branchId: createdBranches[0]?.id,
      preferredCourseId: createdCourses.find(c => c.name === 'Data Science')?.id,
      enquirySourceId: createdEnquirySources.find(s => s.name === 'Google Ads')?.id,
      requiredServiceId: createdRequiredServices.find(s => s.name === 'Career Guidance')?.id,
      createdByUserId: adminUser.id,
    },
    {
      candidateName: 'Sneha Reddy',
      phone: '+91 9876543215',
      email: 'sneha.reddy@email.com',
      address: '321 Jubilee Hills, Hyderabad, Telangana 500033',
      status: 'FOLLOW_UP' as const,
      notes: 'Graphic design student looking to enhance skills.',
      feedback: 'Interested in portfolio development',
      lastContactDate: new Date('2024-01-18'),
      branchId: createdBranches[0]?.id,
      preferredCourseId: createdCourses.find(c => c.name === 'Graphic Design')?.id,
      enquirySourceId: createdEnquirySources.find(s => s.name === 'Referral')?.id,
      requiredServiceId: createdRequiredServices.find(s => s.name === 'Project Mentoring')?.id,
      createdByUserId: adminUser.id,
    },
    {
      candidateName: 'Vikash Singh',
      phone: '+91 9876543216',
      contact2: '+91 9876543217',
      email: 'vikash.singh@email.com',
      address: '654 Civil Lines, Delhi 110054',
      status: 'NOT_INTERESTED' as const,
      notes: 'Initially interested in mobile app development but changed mind.',
      feedback: 'Found course duration too long',
      lastContactDate: new Date('2024-01-19'),
      branchId: createdBranches[1]?.id || createdBranches[0]?.id,
      preferredCourseId: createdCourses.find(c => c.name === 'Mobile App Development')?.id,
      enquirySourceId: createdEnquirySources.find(s => s.name === 'Facebook')?.id,
      requiredServiceId: createdRequiredServices.find(s => s.name === 'Internship Support')?.id,
      createdByUserId: adminUser.id,
    },
    {
      candidateName: 'Anita Joshi',
      phone: '+91 9876543218',
      email: 'anita.joshi@email.com',
      address: '987 Koregaon Park, Pune, Maharashtra 411001',
      status: 'ENROLLED' as const,
      notes: 'Successfully enrolled in UI/UX Design course.',
      feedback: 'Very satisfied with course structure',
      lastContactDate: new Date('2024-01-20'),
      branchId: createdBranches[0]?.id,
      preferredCourseId: createdCourses.find(c => c.name === 'UI/UX Design')?.id,
      enquirySourceId: createdEnquirySources.find(s => s.name === 'Walk-in')?.id,
      requiredServiceId: createdRequiredServices.find(s => s.name === 'Career Guidance')?.id,
      createdByUserId: adminUser.id,
    },
    {
      candidateName: 'Rajesh Gupta',
      phone: '+91 9876543219',
      contact2: '+91 9876543220',
      address: '147 Anna Nagar, Chennai, Tamil Nadu 600040',
      status: 'NEW' as const,
      notes: 'Fresh graduate looking for web development training.',
      lastContactDate: new Date('2024-01-21'),
      branchId: createdBranches[1]?.id || createdBranches[0]?.id,
      preferredCourseId: createdCourses.find(c => c.name === 'Web Development')?.id,
      enquirySourceId: createdEnquirySources.find(s => s.name === 'Phone Call')?.id,
      requiredServiceId: createdRequiredServices.find(s => s.name === 'Placement Assistance')?.id,
      createdByUserId: adminUser.id,
    },
    {
      candidateName: 'Kavya Nair',
      phone: '+91 9876543221',
      email: 'kavya.nair@email.com',
      address: '258 MG Road, Kochi, Kerala 682016',
      status: 'CONTACTED' as const,
      notes: 'Working professional looking to upskill in digital marketing.',
      feedback: 'Prefers weekend batches',
      lastContactDate: new Date('2024-01-22'),
      branchId: createdBranches[0]?.id,
      preferredCourseId: createdCourses.find(c => c.name === 'Digital Marketing')?.id,
      enquirySourceId: createdEnquirySources.find(s => s.name === 'Website')?.id,
      requiredServiceId: createdRequiredServices.find(s => s.name === 'Certification')?.id,
      createdByUserId: adminUser.id,
    },
  ];

  for (const enquiry of sampleEnquiries) {
    try {
      const createdEnquiry = await prisma.enquiry.create({
        data: enquiry,
      });
      console.log(`Created enquiry for: ${createdEnquiry.candidateName}`);
    } catch (error) {
      console.error(`Error creating enquiry for ${enquiry.candidateName}:`, error);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
