#!/usr/bin/env node

/**
 * Expense Policy MCP Server
 *
 * Provides expense management tools for Claude via the Model Context Protocol.
 * This server exposes the submitExpense tool for expense policy validation and submission.
 *
 * Supports both stdio and HTTP transports:
 * - stdio: node dist/index.js
 * - HTTP:  node dist/index.js --http [--port 3000]
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { submitExpense } from './tools/submitExpense.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';

// Create MCP server instance
const server = new Server(
  {
    name: 'expense-policy-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'expense-policy_submitExpense',
        description: 'Submits an expense for reimbursement after policy validation and PII redaction',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Expense amount in dollars',
            },
            category: {
              type: 'string',
              enum: ['meals', 'travel', 'office_supplies', 'other'],
              description: 'Category of the expense',
            },
            date: {
              type: 'string',
              description: 'Date of expense in YYYY-MM-DD format',
            },
            description: {
              type: 'string',
              description: 'Description of the expense (with sensitive information redacted)',
            },
          },
          required: ['amount', 'category', 'date', 'description'],
        },
      },
    ],
  };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'expense-policy_submitExpense') {
    const args = request.params.arguments as any;

    try {
      const result = submitExpense({
        amount: args.amount,
        category: args.category,
        date: args.date,
        description: args.description,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start the server
async function main() {
  const args = process.argv.slice(2);
  const useHttp = args.includes('--http');
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1]) : 3000;

  if (useHttp) {
    // HTTP mode with REST-like endpoints for testing
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        server: 'expense-policy-mcp-server',
        version: '1.0.0',
        transport: 'http'
      });
    });

    // List available tools endpoint
    app.get('/tools', (_req: Request, res: Response) => {
      res.json({
        tools: [
          {
            name: 'expense-policy_submitExpense',
            description: 'Submits an expense for reimbursement after policy validation and PII redaction',
            inputSchema: {
              type: 'object',
              properties: {
                amount: {
                  type: 'number',
                  description: 'Expense amount in dollars',
                },
                category: {
                  type: 'string',
                  enum: ['meals', 'travel', 'office_supplies', 'other'],
                  description: 'Category of the expense',
                },
                date: {
                  type: 'string',
                  description: 'Date of expense in YYYY-MM-DD format',
                },
                description: {
                  type: 'string',
                  description: 'Description of the expense (with sensitive information redacted)',
                },
              },
              required: ['amount', 'category', 'date', 'description'],
            },
          },
        ],
      });
    });

    // Call tool endpoint
    app.post('/tool/call', async (req: Request, res: Response) => {
      const { name, arguments: args } = req.body;

      if (!name || !args) {
        return res.status(400).json({
          error: 'Missing required fields: name and arguments'
        });
      }

      if (name === 'expense-policy_submitExpense') {
        try {
          const result = submitExpense({
            amount: args.amount,
            category: args.category,
            date: args.date,
            description: args.description,
          });

          return res.json({ success: true, result });
        } catch (error: any) {
          return res.status(400).json({
            success: false,
            error: error.message
          });
        }
      }

      return res.status(404).json({
        error: `Unknown tool: ${name}`
      });
    });

    const httpServer = http.createServer(app);

    httpServer.listen(port, () => {
      console.error(`Expense Policy MCP Server running on http://localhost:${port}`);
      console.error(`Endpoints:`);
      console.error(`  - Health check: http://localhost:${port}/health`);
      console.error(`  - List tools:    http://localhost:${port}/tools`);
      console.error(`  - Call tool:     http://localhost:${port}/tool/call`);
    });
  } else {
    // Stdio mode (default)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Expense Policy MCP Server running on stdio');
  }
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
