/**
 * Expense submission tool for MCP server
 * Simulates submitting an expense to a reimbursement system
 */

export interface ExpenseSubmission {
  amount: number;
  category: 'meals' | 'travel' | 'office_supplies' | 'other';
  date: string;
  description: string;
}

export interface ExpenseSubmissionResult {
  expense_id: string;
  status: 'submitted' | 'pending_review' | 'rejected';
  message: string;
  submitted_at: string;
}

export function submitExpense(input: ExpenseSubmission): ExpenseSubmissionResult {
  console.error(`[MCP Tool] Submitting expense: ${JSON.stringify(input, null, 2)}`);

  // Generate a mock expense ID
  const expenseId = `EXP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Mock submission logic
  const result: ExpenseSubmissionResult = {
    expense_id: expenseId,
    status: 'submitted',
    message: `Expense successfully submitted! Your expense ID is ${expenseId}. You will receive reimbursement within 5-7 business days.`,
    submitted_at: new Date().toISOString()
  };

  // Log the submission
  console.error(`[MCP Tool] ✓ Expense ${expenseId} submitted successfully`);
  console.error(`[MCP Tool]   Amount: $${input.amount}`);
  console.error(`[MCP Tool]   Category: ${input.category}`);
  console.error(`[MCP Tool]   Date: ${input.date}`);

  return result;
}
