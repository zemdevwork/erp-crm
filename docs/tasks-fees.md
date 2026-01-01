# Fee Collection Feature Implementation

This document outlines the comprehensive tasks required to implement a fee collection feature within the existing Next.js CRM application. The tasks follow established patterns from the invoice and admission features and are presented in a story point view with checkboxes for easy tracking and completion by an AI coding agent.

## Prerequisites (Fee Collection Feature)

- [x] **pdfme Documentation Reference**: Use Context7 MCP for latest pdfme documentation: `/pdfme/pdfme` (If PDF generation is required for receipts)
- [x] **Package Management**: Always use PNPM as package manager (`pnpm add`, `pnpm dlx`)
- [x] **Database Operations**: Use Prisma MCP for all database-related operations (e.g., `prisma db push`, `prisma generate`)
- [x] **TypeScript Types**: Follow project rule - ALL interfaces/types MUST be in `@/types/` folder
- [x] **Follow Existing Patterns**: Use patterns from invoice and admission features (e.g., server actions, UI components, data fetching)
- [x] **UI Components**: Utilize shadcn/ui components for consistency.

## Story Point: Add Fee Collection Feature

### **Task 1: Database Schema Updates (Prisma)**

- [x] **Define New Enums in `prisma/schema.prisma`**

  - [x] Add enum `CollectedTowards { ADMISSION_FEE COURSE_FEE SEMESTER_FEE }`

- [x] **Define `Receipt` Model in `prisma/schema.prisma`**

  - [x] Add `Receipt` model with the following fields:
    ```prisma
    model Receipt {
      id               String           @id @default(auto()) @map("_id") @db.ObjectId
      receiptNumber    String           @unique // Auto-generated or sequential
      amountCollected  Decimal          @db.Decimal
      collectedTowards CollectedTowards
      paymentDate      DateTime         @default(now())
      paymentMode      String?          // e.g., Cash, Online, Cheque
      transactionId    String?          // For online/cheque payments
      notes            String?
      admissionId      String           @db.ObjectId
      admission        Admission        @relation(fields: [admissionId], references: [id])
      courseId         String           @db.ObjectId
      course           Course           @relation(fields: [courseId], references: [id])
      studentId        String?          @db.ObjectId // Optional: if student user model exists
      // student          User?            @relation(fields: [studentId], references: [id]) // Uncomment if User model is used for students
      createdById      String?          @db.ObjectId // Optional: if tracking who created the receipt
      // createdBy        User?            @relation(name: "CreatedReceipts", fields: [createdById], references: [id]) // Uncomment if User model is used
      createdAt        DateTime         @default(now())
      updatedAt        DateTime         @updatedAt
    }
    ```

- [x] **Extend Existing Models in `prisma/schema.prisma`**

  - [x] Extend `Course` model:
    - `courseFee Decimal? @db.Decimal`
    - `admissionFee Decimal? @db.Decimal`
    - `semesterFee Decimal? @db.Decimal` (Consider if fees are per semester or a total course fee)
  - [x] Extend `Admission` model:
    - `totalFee Decimal? @db.Decimal` // Calculated or set at admission time
    - `balance Decimal @default(0) @db.Decimal`
    - `nextDueDate DateTime?`
    - `receipts Receipt[]` // Add relation to Receipt model

- [x] **Run Prisma Commands**
  - [x] Run `pnpm dlx prisma migrate dev --name add_fee_collection_schema` (or `pnpm dlx prisma db push` if not using migrations yet, but `migrate dev` is preferred)
  - [x] Run `pnpm dlx prisma generate`

### **Task 2: TypeScript Types Setup (`@/types/`)**

- [x] **Create TypeScript Types for Fee Collection in `@/types/fee-collection.ts`**

  - [x] `CollectedTowards` enum (can be imported from Prisma generated types if preferred)
  - [x] `Receipt` interface (extending Prisma's `Receipt` type, potentially with populated relations like `admission` and `course`)
  - [x] `AdmissionWithReceiptsAndCourse` interface extending Prisma's `Admission` with `receipts` and `course` relations.
  - [x] `CreateReceiptInput` type for form submission (matching server action input).
  - [x] `UpdateReceiptInput` type for updates (matching server action input).
  - [x] `ReceiptFormData` type for the `PaymentFormDialog` component (using Zod for schema definition is recommended).

    ```typescript
    // Example using Zod
    import { z } from "zod";
    import { CollectedTowards } from "@prisma/client"; // Assuming prisma client is generated

    export const ReceiptFormSchema = z.object({
      amountCollected: z.coerce
        .number()
        .positive({ message: "Amount must be positive" }),
      collectedTowards: z.nativeEnum(CollectedTowards),
      paymentDate: z.date(),
      paymentMode: z.string().optional(),
      transactionId: z.string().optional(),
      notes: z.string().optional(),
      admissionId: z.string(), // Will be passed to the form
      courseId: z.string(), // Will be passed to the form
    });

    export type ReceiptFormData = z.infer<typeof ReceiptFormSchema>;
    ```

  - [x] `FeeCalculationResult` type for balance calculations (e.g., `{ totalPaid: Decimal, remainingBalance: Decimal, nextDueDate?: Date }`).

### **Task 3: Server Actions Setup (`src/app/actions/fee-collection-actions.ts`)**

- [x] **Create Fee Collection Server Actions File**
  - [x] Create `src/app/actions/fee-collection-actions.ts` following existing patterns (e.g., error handling, authentication/authorization checks).
- [x] **Implement Server Actions:**

  - [x] `createReceipt(data: CreateReceiptInput)`:
    - [x] Validate input using Zod schema.
    - [x] Use `prisma.$transaction` to create the receipt and update the admission balance.
    - [x] Recalculate `Admission.balance` based on `Admission.totalFee` and sum of `Receipt.amountCollected` for that admission.
    - [x] Implement `revalidatePath('/admissions/[id]/payments')` and potentially `revalidateTag` for relevant tags.
  - [x] `updateReceipt(id: string, data: UpdateReceiptInput)`:
    - [x] Validate input.
    - [x] Use `prisma.$transaction` to update the receipt and adjust the admission balance differentially.
    - [x] Recalculate `Admission.balance`.
    - [x] Implement `revalidatePath`.
  - [x] `deleteReceipt(id: string)`:
    - [x] Use `prisma.$transaction` to delete the receipt and update the admission balance.
    - [x] Recalculate `Admission.balance`.
    - [x] Implement `revalidatePath`.
  - [x] `getReceiptsByAdmissionId(admissionId: string, options?: { sortBy?: string, sortOrder?: 'asc' | 'desc', filterBy?: string, filterValue?: string })`:
    - [x] Fetch receipts for a specific admission.
    - [x] Include relations like `course`.
    - [x] Implement server-side sorting and filtering capabilities (Prisma `orderBy` and `where` clauses).
  - [x] `getAdmissionWithFeeDetails(admissionId: string)`:

    - [x] Fetch admission details including `course`, `receipts`, `totalFee`, and `balance`.
    - [x] This will be used by the payments page.

    ```typescript
    // Example structure for getAdmissionWithFeeDetails
    // import prisma from '@/lib/prisma'; // Assuming prisma client instance
    // import { AdmissionWithReceiptsAndCourse } from '@/types/fee-collection';

    // export async function getAdmissionWithFeeDetails(admissionId: string): Promise<AdmissionWithReceiptsAndCourse | null> {
    //   return prisma.admission.findUnique({
    //     where: { id: admissionId },
    //     include: {
    //       course: true,
    //       receipts: {
    //         orderBy: { paymentDate: 'desc' },
    //       },
    //     },
    //   });
    // }
    ```

### **Task 4: Page Architecture & Data Fetching (`/app/admissions/[id]/payments/page.tsx`)**

- [x] **Enhance Fee Collection Page (`/app/admissions/[id]/payments/page.tsx`)**
  - [x] Use server component pattern.
  - [x] Fetch admission details (including course info, total fee, balance) and receipts using `getAdmissionWithFeeDetails` server action.
  - [x] Display admission summary: Candidate Name, Course Name, Total Fee, Amount Paid, Balance Due.
  - [x] Pass fetched receipts to the `PaymentsTable` component.
  - [x] Pass necessary props (e.g., `admissionId`, `courseId`, `currentBalance`, `totalFee`) to `PaymentFormDialog`.
  - [x] Implement error handling (e.g., `notFound()` if admission ID is invalid or data fetching fails).
  - [x] Ensure proper TypeScript types are used for props and fetched data.

### **Task 5: Advanced DataTable Implementation (`@/components/payments/payments-table.tsx`)**

- [x] **Create/Enhance `PaymentsTable` Component**
  - [x] If not existing, create `src/components/payments/payments-table.tsx`.
  - [x] Implement DataTable using `shadcn/ui/table` and patterns from `@tanstack/react-table`.
  - [x] Define columns: Receipt Number, Payment Date, Amount Collected (formatted currency), Collected Towards (Fee Type), Payment Mode, Notes, Actions (Edit, Delete, Print Receipt).
  - [x] Use `Decimal.js` for accurate monetary value formatting (e.g., `new Decimal(amount).toFixed(2)`).
  - [x] Implement client-side sorting and filtering initially. Consider server-side if performance becomes an issue with large datasets.
  - [x] Add an empty state component (e.g., `No payments recorded yet.`) when no receipts exist.
  - [x] Implement row actions (Edit, Delete) that trigger respective dialogs/confirmations.
  - [x] (Future Enhancement) Implement row selection for bulk operations.

### **Task 6: Smart Form Dialog Component (`/app/admissions/[id]/payments/payment-form-dialog.tsx`)**

- [x] **Enhance `PaymentFormDialog` Component**
  - [x] Implement mode discrimination (`create` | `edit`). The dialog title and submit button text should change accordingly.
  - [x] Use `react-hook-form` with Zod schema (`ReceiptFormSchema`) for validation.
  - [x] Form fields: Amount Collected, Collected Towards (Dropdown), Payment Date (DatePicker), Payment Mode (Input/Select), Transaction ID (Input, conditional on Payment Mode), Notes (Textarea).
  - [x] Pre-fill form for `edit` mode.
  - [x] **Dynamic Fee Validation**:
    - When `collectedTowards` is `ADMISSION_FEE`, validate `amountCollected` against `Course.admissionFee` (minus already paid towards admission).
    - When `collectedTowards` is `COURSE_FEE` or `SEMESTER_FEE`, validate `amountCollected` against remaining `Admission.balance`.
  - [x] **Real-time Balance Preview**: Show how the current payment will affect the `Admission.balance`.
  - [x] Handle form submission by calling `createReceipt` or `updateReceipt` server actions.
  - [x] Show loading state during submission and provide feedback (success/error toasts using `sonner`).
  - [x] Close dialog on successful submission and refresh data on the page.

### **Task 7: Enhanced Delete Flow (`@/components/payments/delete-payment-confirmation-dialog.tsx`)**

- [x] **Create `DeletePaymentConfirmationDialog` Component**
  - [x] Create `src/components/payments/delete-payment-confirmation-dialog.tsx`.
  - [x] Use `shadcn/ui/alert-dialog`.
  - [x] Display receipt details (Receipt Number, Amount, Date) to be deleted.
  - [x] Show impact preview: "Deleting this payment will increase the balance due by [amount]."
  - [x] Handle asynchronous deletion process by calling `deleteReceipt` server action.
  - [x] Show loading state and provide feedback.
  - [x] (Optional) Implement optimistic updates with rollback on failure if desired for UX.

### **Task 8: Business Logic & Utilities (`@/lib/fee-utils.ts`)**

- [x] **Create Fee Calculation Utilities**
  - [x] Create `src/lib/fee-utils.ts`.
  - [x] `calculateAdmissionBalance(admission: AdmissionWithReceiptsAndCourse): { totalPaid: Decimal, balanceDue: Decimal }`:
    - [x] Takes an admission object with its receipts and course details.
    - [x] Calculates `totalPaid` by summing `amountCollected` from all receipts.
    - [x] Calculates `balanceDue` as `admission.totalFee - totalPaid`.
    - [x] Ensure all calculations use `Decimal.js` for precision.
  - [x] `formatCurrency(amount: Decimal | number | string): string`:
    - [x] Utility to format numbers/Decimals as currency (e.g., ₹1,234.56).
  - [x] (Future Enhancement) Logic for payment plans, due date calculations, late fees, etc.
  - [x] (Future Enhancement) Audit trail for balance changes (could be a separate Prisma model `BalanceAuditLog`).

### **Task 9: UI/UX Refinements and Production Readiness**

- [ ] **Component Composition and Styling**
  - [ ] Ensure components like `PaymentsTable` and `PaymentFormDialog` are well-composed and reusable.
  - [ ] Use Tailwind CSS for styling, adhering to project's design system.
  - [ ] Implement loading skeletons for the payments table and summary section while data is fetching.
- [ ] **Responsiveness**
  - [ ] Ensure the payments page, table, and dialogs are responsive on mobile devices.
  - [ ] Consider adaptive layouts for the table on smaller screens (e.g., card view per payment).
- [ ] **Accessibility (ARIA)**
  - [ ] Add proper ARIA labels and attributes to interactive elements (buttons, form fields, dialogs).
  - [ ] Ensure keyboard navigability.
- [ ] **Error Handling and User Feedback**
  - [ ] Consistent use of toasts (`sonner`) for operations (create, update, delete).
  - [ ] Clear error messages for form validation and server action failures.

### **Task 10: Database Seeding (Optional but Recommended)**

- [ ] **Update Database Seeding in `prisma/seed.ts`**
  - [ ] Add sample `Receipt` data linked to existing sample `Admission` and `Course` records.
  - [ ] Include receipts with different `collectedTowards` types.
  - [ ] Ensure seeded data helps in testing the fee calculation and display logic.
  - [ ] Run `pnpm prisma db seed` after updating the seed script.

### **Task 11: Documentation**

- [ ] **Code Documentation (JSDoc)**
  - [ ] Add JSDoc comments to new server actions, utility functions, and complex components.
- [ ] **Update Project README or Feature Documentation**
  - [ ] Briefly document the new Fee Collection feature, its capabilities, and how to manage payments.

This structured task list should provide a clear path for implementing the fee collection feature. Remember to commit changes frequently and test each part thoroughly.
