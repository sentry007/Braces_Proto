#!/usr/bin/env node

import { runServer } from '../dist/index.js';

runServer().catch((err) => {
  console.error('Failed to start Bracer MCP server:', err);
  process.exit(1);
});
