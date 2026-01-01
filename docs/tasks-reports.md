# Reports Feature Implementation Tasks

This document outlines comprehensive tasks for implementing advanced reporting functionality in the CRM application, replacing basic reports with detailed analytical reports supporting multiple report types and CSV export capabilities.

## Prerequisites & Standards

- [ ] **Package Management**: Always use PNPM as package manager (`pnpm add`, `pnpm dlx`)
- [ ] **Database Operations**: Use Prisma MCP for all database-related operations
- [ ] **TypeScript Types**: Follow project rule - ALL interfaces/types MUST be in `@/types/` folder
- [ ] **Server Actions**: Use `authActionClient` from `@/lib/safe-action.ts` for authenticated server actions
- [ ] **Utilities**: Reuse existing utilities: `formatCurrency()`, `formatDate()`, `truncateText()` from `@/lib/utils.ts`
- [ ] **UI Components**: Use shadcn UI components and maintain responsive design throughout
- [ ] **Export Format**: All reports must support CSV export functionality only (no PDF requirements)

## Story Point: Advanced Reports System Implementation

### **Task 1: Enhanced Types & Schema** ⏳

- [ ] **Create Enhanced Report Types**

  - [ ] Extend `@/types/reports.ts` with new report interfaces
  - [ ] Add `TelecallerReport`, `BranchReport`, `AdmissionPaymentReport`, `ExpenseReport`, `InvoiceReport`, `IncomeReport`, `PendingPaymentReport`
  - [ ] Define common interfaces: `ReportFilters`, `DateRangeFilter`, `CSVExportData`
  - [ ] Add comprehensive filter types for each report category

- [ ] **CSV Export Types**
  - [ ] Create `CSVRow` type for consistent export formatting
  - [ ] Define `ExportableReport` interface with CSV-specific methods
  - [ ] Add `ReportExportOptions` for customizable export settings

### **Task 2: Report Server Actions** 🔄

- [ ] **Create Report Actions File**

  - [ ] Create `src/server/actions/report-actions.ts` using `authActionClient`
  - [ ] Implement base report generation with role-based access control
  - [ ] Add common filtering and pagination logic for all reports

- [ ] **Telecaller Report Actions**

  - [ ] `getTelecallerPerformanceReport()` - Performance metrics per telecaller
  - [ ] `getTelecallerEnquiryStats()` - Enquiry statistics by telecaller
  - [ ] `getTelecallerConversionRates()` - Conversion and follow-up metrics
  - [ ] `exportTelecallerReportCSV()` - CSV export functionality

- [ ] **Branch Report Actions**

  - [ ] `getBranchPerformanceReport()` - Performance metrics per branch
  - [ ] `getBranchEnquiryDistribution()` - Enquiry distribution across branches
  - [ ] `getBranchAdmissionStats()` - Admission statistics by branch
  - [ ] `exportBranchReportCSV()` - CSV export functionality

- [ ] **Financial Report Actions**
  - [ ] `getAdmissionPaymentReport()` - Payment tracking and outstanding balances
  - [ ] `getExpenseReport()` - Expense analysis with category breakdown
  - [ ] `getInvoiceReport()` - Invoice status and payment tracking
  - [ ] `getIncomeReport()` - Income from invoices and other non-CRM sources
  - [ ] `getPendingPaymentReport()` - Students with outstanding dues
  - [ ] `exportFinancialReportCSV()` - CSV export for all financial reports

### **Task 3: Replace Existing Reports Page** 🔄

- [ ] **Enhanced Reports Dashboard**

  - [ ] Completely update `src/app/(sidebar)/admin/reports/page.tsx`
  - [ ] Create tabbed interface for different report categories
  - [ ] Add report type selection with filters and date range pickers
  - [ ] Include summary cards with key metrics for each report type
  - [ ] Implement role-based report access (admin sees all, telecaller sees assigned data)

- [ ] **Report Navigation & Filtering**
  - [ ] Create comprehensive filter panel for each report type
  - [ ] Add date range selection (predefined and custom ranges)
  - [ ] Include branch, course, status, and user-based filtering
  - [ ] Implement search functionality within reports

### **Task 4: Report Components** 🎨

- [ ] **Individual Report Components**

  - [ ] Create `src/components/reports/telecaller-report.tsx`
  - [ ] Create `src/components/reports/branch-report.tsx`
  - [ ] Create `src/components/reports/admission-payment-report.tsx`
  - [ ] Create `src/components/reports/expense-report.tsx`
  - [ ] Create `src/components/reports/invoice-report.tsx`
  - [ ] Create `src/components/reports/income-report.tsx`
  - [ ] Create `src/components/reports/pending-payment-report.tsx`

- [ ] **Common Report Components**
  - [ ] Create `src/components/reports/report-filters.tsx` - Reusable filter component
  - [ ] Create `src/components/reports/export-button.tsx` - CSV export functionality
  - [ ] Create `src/components/reports/report-summary-card.tsx` - Summary statistics display
  - [ ] Create `src/components/reports/date-range-picker.tsx` - Date range selection

### **Task 5: CSV Export Implementation** 📊

- [ ] **CSV Export Service**

  - [ ] Create `src/lib/csv-export-service.ts` for generating CSV files
  - [ ] Implement functions: `generateCSV()`, `downloadCSV()`, `formatDataForCSV()`
  - [ ] Add proper escaping and formatting for CSV data
  - [ ] Include proper file naming conventions with timestamps

- [ ] **Export Functionality per Report Type**
  - [ ] Telecaller reports: performance metrics, enquiry counts, conversion rates
  - [ ] Branch reports: branch statistics, enquiry distribution, performance comparisons
  - [ ] Financial reports: payment history, outstanding balances, expense details, invoice data

### **Task 6: Specific Report Implementations** 📈

- [ ] **Telecaller-wise Report**

  - [ ] Display telecaller performance metrics (enquiries handled, calls made, conversions)
  - [ ] Show enquiry status distribution per telecaller
  - [ ] Include follow-up completion rates and average response times
  - [ ] Add comparison functionality between telecallers

- [ ] **Branch-wise Report**

  - [ ] Show enquiry volume and conversion rates per branch
  - [ ] Display course preference distribution by branch
  - [ ] Include admission statistics and revenue per branch
  - [ ] Add branch performance comparison features

- [ ] **Admission Payment Report**

  - [ ] Track all admission-related payments and receipts
  - [ ] Display payment history with receipt details
  - [ ] Show outstanding balances and next due dates
  - [ ] Include payment mode analysis (cash, online, cheque)

- [ ] **Expense Report**

  - [ ] Category-wise expense breakdown with totals
  - [ ] Monthly/quarterly expense trends and comparisons
  - [ ] User-wise expense tracking (who created expenses)
  - [ ] Top expense categories and cost center analysis

- [ ] **Invoice Report**

  - [ ] Invoice status tracking (draft, sent, paid, overdue)
  - [ ] Revenue analysis from invoices
  - [ ] Payment timeline and collection efficiency
  - [ ] Outstanding invoice tracking with aging analysis

- [ ] **Income Report (Non-CRM)**

  - [ ] Track income from invoices and other business sources
  - [ ] Revenue categorization (services, products, consulting)
  - [ ] Monthly revenue trends and growth analysis
  - [ ] Payment method distribution for income

- [ ] **Pending Payment Report**
  - [ ] Students with outstanding fee balances
  - [ ] Due date tracking and overdue alerts
  - [ ] Aging analysis of outstanding amounts
  - [ ] Collection efficiency metrics

### **Task 7: Security & Permissions** 🔒

- [ ] **Role-based Report Access**
  - [ ] Admin: Access to all reports across all branches and users
  - [ ] Executive: Access to branch-specific and assigned user reports
  - [ ] Telecaller: Access only to personal performance reports
  - [ ] Implement data filtering based on user permissions

### **Task 8: Testing & Validation** ✅

- [ ] **Functionality Testing**

  - [ ] Test all report generation with various filter combinations
  - [ ] Verify CSV export functionality across all report types
  - [ ] Test role-based access control and data filtering
  - [ ] Validate report accuracy against database queries

- [ ] **Performance Testing**
  - [ ] Test report generation with large datasets
  - [ ] Verify CSV export performance with extensive data
  - [ ] Test concurrent report generation by multiple users

### **Task 9: Documentation** 📋

- [ ] **User Documentation**

  - [ ] Create user guide for accessing and using reports
  - [ ] Document CSV export functionality and file formats
  - [ ] Create help documentation for report filters and options

- [ ] **Technical Documentation**
  - [ ] Document report generation logic and database queries
  - [ ] Document CSV export formats and data structures

## Report Type Details

### 📊 **Report Types Overview**

| Report Type           | Description                       | Key Metrics                               |
| --------------------- | --------------------------------- | ----------------------------------------- |
| **Telecaller-wise**   | Individual telecaller performance | Enquiries, Calls, Conversions, Follow-ups |
| **Branch-wise**       | Branch performance comparison     | Enquiry Volume, Admissions, Revenue       |
| **Admission Payment** | Student payment tracking          | Payments Collected, Outstanding, Overdue  |
| **Expense**           | Business expense analysis         | Category Totals, Monthly Trends           |
| **Invoice**           | Invoice and billing tracking      | Revenue, Collection Rate, Outstanding     |
| **Income (Non-CRM)**  | Non-course fee income             | Total Revenue, Payment Sources            |
| **Pending Payment**   | Outstanding student dues          | Overdue Amounts, Collection Targets       |

## Implementation Guidelines

### **Technical Standards**

- Use `authActionClient.inputSchema().action()` pattern for server actions
- Follow existing patterns from expense and invoice features
- Implement proper error handling and loading states
- Use shadcn UI components and maintain design consistency
- Ensure responsive design for all report interfaces

### **Key Patterns to Follow**

- Database queries: Use efficient Prisma queries with proper relations and filtering
- CSV exports: Generate clean, Excel-compatible CSV files with proper headers
- Permission checks: Implement role-based access control for all reports
- Date handling: Use consistent date formatting and timezone handling
- Error handling: Provide meaningful error messages and fallback states

### **File Organization**

- Types: `@/types/reports.ts`
- Server Actions: `@/server/actions/report-actions.ts`
- CSV Service: `@/lib/csv-export-service.ts`
- Components: `@/components/reports/`
- Page: `@/app/(sidebar)/admin/reports/page.tsx`

---

This comprehensive task list provides a complete roadmap for implementing advanced reporting functionality while maintaining consistency with existing application patterns and ensuring high-quality, exportable reports for business intelligence and decision-making.

---
