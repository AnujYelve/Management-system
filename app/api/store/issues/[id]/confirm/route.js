import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import IssueRecord from '@/models/IssueRecord.js';
import Book from '@/models/Book.js';
import Store from '@/models/Store.js';
import { authenticate } from '@/middleware/auth.js';
import { createNotification } from '@/lib/cron.js';

export async function POST(request, { params }) {
  try {
    const authResult = await authenticate(request, ['STORE']);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    await connectDB();
    
    const { id } = params;
    const { action } = await request.json(); // 'issue' or 'return'
    
    const store = await Store.findOne({ ownerId: authResult.user._id });
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }
    
    const issue = await IssueRecord.findOne({ _id: id, storeId: store._id })
      .populate('bookId')
      .populate('userId');
    
    if (!issue) {
      return NextResponse.json(
        { error: 'Issue record not found' },
        { status: 404 }
      );
    }
    
    if (action === 'issue') {
      if (issue.status !== 'ISSUED') {
        return NextResponse.json(
          { error: 'Book is already issued or returned' },
          { status: 400 }
        );
      }
      
      // Check availability
      if (issue.bookId.availableCopies <= 0) {
        return NextResponse.json(
          { error: 'Book is not available' },
          { status: 400 }
        );
      }
      
      // Decrease available copies
      await Book.findByIdAndUpdate(issue.bookId._id, {
        $inc: { availableCopies: -1 }
      });
      
      // Create notification (this will also send email)
      await createNotification(
        issue.userId._id,
        store._id,
        `You issued "${issue.bookId.title}" from ${store.storeName} on ${new Date(issue.issueDate).toLocaleDateString()}. Return before ${new Date(issue.dueDate).toLocaleDateString()}.`,
        'ISSUE'
      );
      
      return NextResponse.json({
        message: 'Book issued successfully',
        issue
      });
    } else if (action === 'return') {
      if (issue.status === 'RETURNED') {
        return NextResponse.json(
          { error: 'Book is already returned' },
          { status: 400 }
        );
      }
      
      // Increase available copies
      await Book.findByIdAndUpdate(issue.bookId._id, {
        $inc: { availableCopies: 1 }
      });
      
      // Update issue record
      issue.status = 'RETURNED';
      issue.returnDate = new Date();
      await issue.save();
      
      return NextResponse.json({
        message: 'Book returned successfully',
        issue
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "issue" or "return"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Confirm issue error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

