# Expense Manager Feature Implementation Tasks

Comprehensive task list for implementing expense management functionality in the CRM application. Follow existing patterns and maintain consistency with invoice and fee collection features.

## Prerequisites & Standards

- [ ] Use PNPM package manager and Prisma MCP for database operations
- [ ] Place types in `@/types/`, schemas in `@/schema/`, follow existing folder structure
- [ ] Use `authActionClient` from `@/lib/safe-action.ts` for authenticated server actions
- [ ] Reuse existing utilities: `formatCurrency()`, `formatDate()`, `truncateText()` from `@/lib/utils.ts`
- [ ] Follow patterns from invoice and fee collection features for consistency
- [ ] Use shadcn UI components and next-safe-action patterns throughout

## Implementation Tasks

### **Task 1: Database Schema & Types** ✅

- [x] **Database Schema Setup**

  - [x] Add `Expense` model to `prisma/schema.prisma` with required fields (id, title, description, amount, category, expenseDate, notes, createdBy, timestamps)
  - [x] The createdBy field should store user id @db.ObjectId and foreign key to User model
  - [x] Add `ExpenseCategory` enum with values: OFFICE_SUPPLIES, TRAVEL, UTILITIES, MARKETING, MEALS, EQUIPMENT, SOFTWARE, OTHER
  - [x] Update User model to include expenses relation
  - [x] Generate Prisma client and verify schema

- [x] **TypeScript Types**
  - [x] Create `@/types/expense.ts` following invoice patterns
  - [x] Define interfaces: Expense, ExpenseWithRelations, CreateExpenseInput, UpdateExpenseInput, ExpenseFormData
  - [x] Add types for filtering, pagination, and table display

```prisma
model Expense {
  id          String          @id @default(auto()) @map("_id") @db.ObjectId
  title       String
  description String?
  amount      Float
  category    ExpenseCategory
  expenseDate DateTime
  notes       String?
  createdBy   User            @relation(fields: [createdById], references: [id])
  createdById String          @db.ObjectId
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}
```

### **Task 2: Validation Schemas** ✅

- [x] **Zod Schemas**
  - [x] Create `src/schema/expense-schema.ts` following user-schema patterns
  - [x] Define createExpenseSchema with required fields and validation rules
  - [x] Define updateExpenseSchema for partial updates
  - [x] Add deleteExpenseSchema and getExpenseSchema for other operations

### **Task 3: Server Actions** ✅

- [x] **Expense Server Actions**

  - [x] Create `src/server/actions/expense-actions.ts` using `authActionClient`
  - [x] Implement CRUD operations: createExpense, updateExpense, deleteExpense, getExpenses, getExpenseById
  - [x] Add filtering actions: getExpensesByUser, getExpensesByDateRange, getExpensesByCategory
  - [x] Use authActionClient patterns with userId in context for authentication
  - [x] Include proper authorization checks (creator or admin can modify)
  - [x] Include `revalidatePath()` calls for cache management

  Code Sample:

  ```typescript
  export const createExpenseAction = authActionClient
    .inputSchema(createExpenseSchema)
    .action(async ({ parsedInput: { name }, ctx }) => {
      const expense = await prisma.expense.create({
        data: {
          ...parsedInput,
          createdBy: ctx.userId,
        },
      });
      return expense;
    });
  ```

### **Task 4: Data Table & List View** ✅

- [x] **Expense List Page**

  - [x] Create `src/app/(sidebar)/expenses/page.tsx` following invoice page patterns
  - [x] Create expense table with proper column definitions inline
  - [x] Create expense table with proper table configuration inline
  - [x] Implement shadcn data-table with columns: Title, Amount, Category, Date, Created By, Actions
  - [x] Add search, filtering (date range, category), pagination, and sorting functionality

- [x] **Table Configuration**
  - [x] Create expense table with proper column definitions inline
  - [x] Create expense table with proper table configuration inline
  - [x] Use existing utilities for currency formatting, date formatting, and text truncation
  - [x] Implement actions dropdown with View, Edit, Delete, Duplicate options
  - [x] Apply permission-based action visibility (creator/admin only for edit/delete)

### **Task 5: Form Components** ✅

- [x] **Expense Form Dialog**
  - [x] Create `src/components/expense/expense-form-dialog.tsx` following existing dialog patterns
  - [x] Support create/edit modes with proper form state management
  - [x] Use react-hook-form with Zod validation and shadcn form components
  - [x] Implement form fields: Title, Description, Amount, Category, Expense Date, Notes
  - [x] Use direct async action calls for form submission
  - [x] Handle loading states, validation errors, and success feedback

### **Task 6: Detail Page & Delete Dialog** ✅

- [x] **Expense Detail Page**

  - [x] Create `src/app/(sidebar)/expenses/[id]/page.tsx` following invoice detail patterns
  - [x] Display expense information in organized sections with proper formatting
  - [x] Include edit/delete action buttons with permission checks
  - [x] Show timestamps and category badges with consistent styling

- [x] **Delete Confirmation Dialog**
  - [x] Create `src/components/expense/delete-expense-dialog.tsx`
  - [x] Use shadcn alert-dialog with expense details display
  - [x] Implement direct async calls for delete operation with loading states
  - [x] Handle success/error feedback and data refresh

### **Task 7: Utilities & Integration** ✅

- [x] **Expense Utilities**

  - [x] Create `src/lib/expense-utils.ts` with calculation functions
  - [x] Implement: calculateTotalExpenses, calculateExpensesByCategory, calculateExpensesByMonth
  - [x] Reuse existing formatCurrency and formatDate utilities

- [ ] **Dashboard Integration**
  - [ ] Add expense summary cards to dashboard with total amounts and category breakdown
  - [ ] Include quick create expense action button

### **Task 8: Permissions & Security** ✅

- [x] **Access Control**
  - [x] Implement role-based permissions (users: own expenses, admins: all expenses)
  - [x] Add permission checks in server actions and UI components
  - [x] Use authActionClient for automatic authorization handling

### **Task 9: Testing & Validation**

- [ ] **Functionality Testing**
  - [ ] Test CRUD operations with different user roles and permissions
  - [ ] Verify form validation, data table functionality, and responsive design
  - [ ] Test server action error handling and loading states

### **Task 10: Database Seeding**

- [ ] **Sample Data**
  - [ ] Update `prisma/seed.ts` with sample expense data
  - [ ] Include various categories, amounts, dates, and different user creators

## Implementation Guidelines

### **Technical Standards**

- Use `authActionClient.inputSchema().action()` pattern for server actions
- Follow existing patterns from invoice and fee collection features
- Implement proper error handling and loading states with useAction hook
- Use shadcn UI components and existing utility functions
- Maintain consistent styling and responsive design

### **Key Patterns to Follow**

- Server actions: Use authActionClient with userId in context for authentication
- Client components: Use useAction hook for action execution and state management
- Form validation: Combine react-hook-form with Zod schemas
- Data display: Use existing formatCurrency, formatDate utilities
- Permissions: Implement role-based access (creator/admin permissions)

### **File Organization**

- Types: `@/types/expense.ts`
- Schemas: `@/schema/expense-schema.ts`
- Server Actions: `@/server/actions/expense-actions.ts`
- Utilities: `@/lib/expense-utils.ts`
- Components: `@/components/expense/`
- Pages: `@/app/(sidebar)/expenses/`

---

This task list provides a complete roadmap for implementing expense management functionality while maintaining consistency with existing application patterns and ensuring high-quality output.
