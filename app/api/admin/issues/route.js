import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import IssueRecord from '@/models/IssueRecord.js';
import { authenticate } from '@/middleware/auth.js';

export async function GET(request) {
  try {
    const authResult = await authenticate(request, ['ADMIN']);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const issues = await IssueRecord.find(query)
      .populate('userId', 'name email username')
      .populate('bookId', 'title author ISBN')
      .populate('storeId', 'storeName city')
      .sort({ createdAt: -1 });
    
    const overdue = await IssueRecord.find({ status: 'OVERDUE' })
      .populate('userId', 'name email username')
      .populate('bookId', 'title author ISBN')
      .populate('storeId', 'storeName city');
    
    return NextResponse.json({
      issues,
      overdue,
      stats: {
        total: issues.length,
        issued: issues.filter(i => i.status === 'ISSUED').length,
        returned: issues.filter(i => i.status === 'RETURNED').length,
        overdue: overdue.length
      }
    });
  } catch (error) {
    console.error('Get issues error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

