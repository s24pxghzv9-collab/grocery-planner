// GET  /api/household  -> the shared plan and shopping list
// POST /api/household  -> { ops: Op[] } apply a batch of edits
import { handle } from './_lib/household.js';
import { upstashStore } from './_lib/upstash.js';

export function GET(request: Request) {
  return handle(request, upstashStore());
}

export function POST(request: Request) {
  return handle(request, upstashStore());
}
