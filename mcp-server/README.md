# Expense Policy MCP Server

A Model Context Protocol (MCP) server that provides expense management tools for Claude.

## What is This?

This MCP server exposes the `expense-policy_submitExpense` tool that allows Claude to submit expense reimbursement requests. It's designed to work with the Expense Policy skill in Claude Code.

**Note**: Policy validation and PII redaction are handled by the Claude Skill before calling this tool. This server only handles the expense submission.

## Features

- **expense-policy_submitExpense Tool**: Submits expenses for reimbursement after validation
- **Dual Transport Support**: Runs via stdio (for Claude Code) or HTTP (for testing)
- **MCP Protocol**: Standard interface for Claude integration
- **Local Execution**: Runs on your machine for privacy and control

## Installation

```bash
# Install dependencies
npm install

# Build the server
npm run build
```

## Running the Server

### With Claude Code (stdio mode)

Configure in your project's `mcp.json` or global `~/.claude.json`:

```json
{
  "mcpServers": {
    "expense-policy": {
      "type": "stdio",
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "cwd": "/absolute/path/to/project"
    }
  }
}
```

Restart Claude Code and the server will start automatically.

### HTTP Mode (for testing)

```bash
# Run with default port (3000)
node dist/index.js --http

# Run with custom port
node dist/index.js --http --port 8080
```

Available endpoints:
- `GET /health` - Health check
- `GET /tools` - List available tools
- `POST /tool/call` - Call a tool with JSON body: `{"name": "expense-policy_submitExpense", "arguments": {...}}`

### Development

```bash
npm run dev
```

## Tool Schema

### expense-policy_submitExpense

Submits an expense for reimbursement after policy validation and PII redaction (performed by the Claude Skill).

**Input:**
```json
{
  "amount": 60.0,
  "category": "meals",
  "date": "2024-01-20",
  "description": "Business lunch at Olive Garden"
}
```

**Parameters:**
- `amount` (number, required): Expense amount in dollars
- `category` (string, required): One of: `meals`, `travel`, `office_supplies`, `other`
- `date` (string, required): Date in YYYY-MM-DD format
- `description` (string, required): Description with PII already redacted

**Output:**
```json
{
  "expense_id": "EXP-1234567890-ABC123",
  "status": "submitted",
  "message": "Expense successfully submitted! Your expense ID is EXP-1234567890-ABC123. You will receive reimbursement within 5-7 business days.",
  "submitted_at": "2024-01-20T10:30:00.000Z"
}
```

## Development

### Project Structure

```
mcp-server/
├── src/
│   ├── index.ts              # MCP server implementation
│   └── tools/
│       └── submitExpense.ts  # Tool logic
├── dist/                     # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Adding New Tools

1. Create tool implementation in `src/tools/yourTool.ts`
2. Register tool in `src/index.ts`:

```typescript
// Import your tool
import { yourTool } from './tools/yourTool.js';

// Add to ListToolsRequestSchema handler
{
  name: 'expense-policy_yourTool',
  description: 'What your tool does',
  inputSchema: {
    type: 'object',
    properties: {
      // Your parameters
    },
    required: ['param1', 'param2']
  }
}

// Add to CallToolRequestSchema handler
if (request.params.name === 'expense-policy_yourTool') {
  const result = yourTool(request.params.arguments);
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}
```

3. Rebuild: `npm run build`

**Note**: Tool names should be prefixed with `expense-policy_` to avoid conflicts with other MCP servers.

### Customization

Replace the mock implementation in `src/tools/submitExpense.ts` with your actual expense system integration:

```typescript
import { ExpenseAPI } from './your-expense-api';

export async function submitExpense(input: ExpenseSubmission) {
  const api = new ExpenseAPI();
  return await api.submitExpense(input);
}
```

## Debugging

### Check Server Logs

Server logs go to stderr:

```typescript
console.error('[MCP Tool] Your debug message');
```

In stdio mode, logs appear in Claude Code's output. In HTTP mode, logs appear in the terminal.

### Test with HTTP Mode

Easiest way to test the server without Claude Code:

```bash
# Start server
node dist/index.js --http

# Test in another terminal
curl http://localhost:3000/health
curl http://localhost:3000/tools

# Call the tool
curl -X POST http://localhost:3000/tool/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "expense-policy_submitExpense",
    "arguments": {
      "amount": 60,
      "category": "meals",
      "date": "2024-01-20",
      "description": "Business lunch"
    }
  }'
```

### Test MCP Protocol

Use the MCP inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### Common Issues

**Server Not Starting:**
- Ensure `dist/index.js` exists (`npm run build`)
- Check paths in `mcp.json` are correct
- Verify Node.js is installed

**Tool Not Found:**
- Verify tool name is `expense-policy_submitExpense` (with prefix)
- Check ListToolsRequestSchema returns correct schema
- Restart Claude Code after configuration changes

## Learn More

- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Claude Code Documentation](https://code.claude.com/docs/en/mcp.md)
- [Claude Skills Documentation](https://code.claude.com/docs/en/skills.md)

## License

MIT
