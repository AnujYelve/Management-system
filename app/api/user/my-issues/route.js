import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import IssueRecord from '@/models/IssueRecord.js';
import { authenticate } from '@/middleware/auth.js';

export async function GET(request) {
  try {
    const authResult = await authenticate(request, ['USER']);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    await connectDB();
    
    const issues = await IssueRecord.find({ userId: authResult.user._id })
      .populate('bookId', 'title author ISBN category')
      .populate('storeId', 'storeName city')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ issues });
  } catch (error) {
    console.error('Get my issues error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

