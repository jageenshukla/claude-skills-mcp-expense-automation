---
name: expense-policy
description: Validates and submits expense reimbursements against company policy rules with automatic PII redaction
version: 1.0.0
---

# Expense Policy Skill

Handles expense reimbursement requests by validating them against company policy, redacting sensitive information, and submitting approved expenses automatically.

## Policy Rules

### Expense Limits
- **Meals**: Maximum $75 per person
- **Travel**: Maximum $500 per trip
- **Office Supplies**: Maximum $200 per order
- **Other**: Maximum $100 per expense

### Required Information
- Expense amount (dollars)
- Expense category (meals, travel, office_supplies, other)
- Date of expense (YYYY-MM-DD format)
- Description of the expense

## Workflow

When a user submits an expense request:

1. **Parse the Request**: Extract expense details from the user's message
2. **Validate Against Policy**: Check if the expense amount is within the allowed limit for its category
3. **Redact Sensitive Data**: Use the `redact.py` script to remove PII from descriptions
4. **Decision**:
   - If within policy limits: Submit the expense using `submitExpense` MCP tool
   - If exceeds limits: Inform the user and explain the policy violation

## Data Redaction with Python Script

This skill includes a Python script for automatic PII redaction. Use it before submitting expenses:

**Script Location**: `scripts/redact.py`

**Usage**:
```bash
python ${baseDir}/scripts/redact.py "Expense description with PII"
```

**What it redacts**:
- Credit card numbers (16 digits, may have spaces or dashes, or "ending in XXXX")
- Phone numbers (US and international formats)
- Social Security Numbers (XXX-XX-XXXX)
- Personal email addresses (keeps business emails)

**Output**: Returns JSON with `redacted_text` field

**Example**:
```bash
# Input: "Lunch $50, card ending in 4532, call 555-1234"
# Output: {"redacted_text": "Lunch $50, [REDACTED], call [REDACTED]", "has_pii": true}
```

Always run this script on expense descriptions before calling expense-policy_submitExpense.

## Available Tools

### expense-policy_submitExpense (MCP Tool)

Provided by the `expense-policy` MCP server. Submits an expense for reimbursement after validation and redaction.

**Input**:
- `amount` (number): Expense amount in dollars
- `category` (string): One of: meals, travel, office_supplies, other
- `date` (string): Date of expense in YYYY-MM-DD format
- `description` (string): Description with sensitive information redacted

**Output**:
- `expense_id` (string): Unique ID for the submitted expense
- `status` (string): Submission status (submitted, pending_review, rejected)
- `message` (string): Confirmation message with next steps

## Reasoning Instructions

You must:
1. Always validate expenses against the policy limits before submission
2. Never submit an expense that exceeds the category limit
3. Always redact sensitive information (credit cards, SSNs, etc.) from descriptions
4. Provide clear feedback when expenses are rejected with the reason
5. If missing required information (date, category), ask the user before proceeding

## Examples

### Example 1: Valid Expense
```
User: "I had a business lunch for $60 at Olive Garden on 2024-01-15"

Steps:
1. Parse: amount=$60, category=meals, date=2024-01-15, description="Business lunch at Olive Garden"
2. Validate: $60 <= $75 (meals limit) ✓
3. Redact: No sensitive data found
4. Submit: Use expense-policy_submitExpense tool
5. Response: "✓ Your meal expense of $60 has been submitted successfully! Expense ID: EXP-xxx"
```

### Example 2: Exceeds Limit
```
User: "I need to expense a $600 flight for the conference"

Steps:
1. Parse: amount=$600, category=travel
2. Validate: $600 > $500 (travel limit) ✗
3. Response: "I cannot submit this expense. The travel limit is $500, but your flight costs $600 (exceeds by $100). Please contact your manager for approval."
```

### Example 3: With PII Redaction (Using Script + MCP)
```
User: "Office supplies from Amazon for $150 on 2024-01-20. I used my card ending in 4532."

Steps:
1. Parse: amount=$150, category=office_supplies, date=2024-01-20, description="Office supplies from Amazon. I used my card ending in 4532."
2. Validate: $150 <= $200 ✓
3. Redact using script:
   ```bash
   python ${baseDir}/scripts/redact.py "Office supplies from Amazon. I used my card ending in 4532."
   # Returns: {"redacted_text": "Office supplies from Amazon. I used my [REDACTED].", "has_pii": true}
   ```
4. Submit: Use expense-policy_submitExpense MCP tool with redacted description
5. Response: "✓ Your office supplies expense of $150 has been submitted! Expense ID: EXP-xxx. Note: PII was automatically redacted."
```

**This example demonstrates BOTH patterns:**
- ✅ **Python Script** (in skill) for PII redaction
- ✅ **MCP Tool** for expense submission

### Example 4: Missing Information
```
User: "I had a team dinner for $120"

Steps:
1. Parse: amount=$120, category=meals, date=missing
2. Response: "I need the date of the expense to submit it. When was the team dinner? Please provide the date in YYYY-MM-DD format."
```

## Error Handling

- If required information is missing, ask the user to provide it
- If the category is unclear, ask for clarification
- If expense exceeds limit, clearly state the policy violation
- Always be transparent about why an expense cannot be submitted
