export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Book from '@/models/Book.js';
import Store from '@/models/Store.js';
import IssueRecord from '@/models/IssueRecord.js';
import User from '@/models/User.js';
import { authenticate } from '@/middleware/auth.js';

export async function POST(request) {
  try {
    const authResult = await authenticate(request, ['USER']);

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const { bookId, days } = await request.json();

    if (!bookId || !days) {
      return NextResponse.json(
        { error: 'bookId and days are required' },
        { status: 400 }
      );
    }

    const book = await Book.findById(bookId).populate('storeId');

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Check if store is open
    if (!book.storeId.isOpenToday) {
      return NextResponse.json(
        { error: 'Store is closed today' },
        { status: 400 }
      );
    }

    // Check if store owner is blocked
    const storeOwner = await User.findById(book.storeId.ownerId);
    if (storeOwner && storeOwner.isBlocked) {
      return NextResponse.json(
        { error: 'Store is currently unavailable' },
        { status: 400 }
      );
    }

    // Check availability
    if (book.availableCopies <= 0) {
      return NextResponse.json(
        { error: 'Book is not available' },
        { status: 400 }
      );
    }

    // Check if user already has this book issued
    const existingIssue = await IssueRecord.findOne({
      userId: authResult.user._id,
      bookId: book._id,
      status: { $in: ['ISSUED', 'OVERDUE'] }
    });

    if (existingIssue) {
      return NextResponse.json(
        { error: 'You already have this book issued' },
        { status: 400 }
      );
    }

    // Calculate due date
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(days));

    // Create issue record (pending confirmation from store)
    const issueRecord = await IssueRecord.create({
      userId: authResult.user._id,
      bookId: book._id,
      storeId: book.storeId._id,
      issueDate,
      dueDate,
      status: 'ISSUED'
    });

    const populatedIssue = await IssueRecord.findById(issueRecord._id)
      .populate('userId', 'name email username')
      .populate('bookId', 'title author ISBN')
      .populate('storeId', 'storeName');

    return NextResponse.json({
      message: 'Book issue request created. Waiting for store confirmation.',
      issue: populatedIssue
    }, { status: 201 });
  } catch (error) {
    console.error('Issue book error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

