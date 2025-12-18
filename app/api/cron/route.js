import { NextResponse } from 'next/server';
import { processDailyNotifications, initializeCron } from '@/lib/cron.js';

// Initialize cron on module load (only once)
let cronInitialized = false;

if (!cronInitialized) {
  initializeCron();
  cronInitialized = true;
}

export async function GET(request) {
  try {
    // Manual trigger for testing
    await processDailyNotifications();
    
    return NextResponse.json({
      message: 'Cron job executed successfully'
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Manual trigger
    await processDailyNotifications();
    
    return NextResponse.json({
      message: 'Cron job executed successfully'
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    );
  }
}

