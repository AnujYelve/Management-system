/**
 * GET /api/cron
 *
 * Entry point for the daily scheduled job.
 * Triggered at 09:00 UTC by Vercel Cron (vercel.json).
 * Can also be hit manually for testing.
 *
 * No node-cron, no persistent process — stateless by design.
 */

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { processDailyNotifications } from '@/lib/cron.js';

export async function GET(request) {
  try {
    await processDailyNotifications();
    return NextResponse.json({ message: 'Cron job executed successfully' });
  } catch (error) {
    console.error('[Cron Route] Error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    );
  }
}

// POST kept for manual curl triggers during development
export async function POST(request) {
  return GET(request);
}
