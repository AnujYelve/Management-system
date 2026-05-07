export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Book from '@/models/Book.js';
import IssueRecord from '@/models/IssueRecord.js';
import User from '@/models/User.js';
import { authenticate } from '@/middleware/auth.js';
import { createNotification } from '@/lib/notifications.js';

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

    // Fetch book with store details
    const book = await Book.findById(bookId).populate('storeId');

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check if store is open
    if (!book.storeId.isOpenToday) {
      return NextResponse.json({ error: 'Store is closed today' }, { status: 400 });
    }

    // Check if store owner is blocked
    const storeOwner = await User.findById(book.storeId.ownerId).select('isBlocked').lean();
    if (storeOwner?.isBlocked) {
      return NextResponse.json({ error: 'Store is currently unavailable' }, { status: 400 });
    }

    // Prevent duplicate issue for same user + book
    const existingIssue = await IssueRecord.findOne({
      userId: authResult.user._id,
      bookId: book._id,
      status: { $in: ['ISSUED', 'OVERDUE'] },
    }).lean();

    if (existingIssue) {
      return NextResponse.json(
        { error: 'You already have this book issued' },
        { status: 400 }
      );
    }

    // ── ATOMIC decrement ──────────────────────────────────────────────────────
    // The guard `availableCopies: { $gt: 0 }` inside the query makes this
    // a single atomic operation. If two requests race, only ONE will match;
    // the second gets null and we return 409 Conflict.
    const updatedBook = await Book.findOneAndUpdate(
      { _id: book._id, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );

    if (!updatedBook) {
      return NextResponse.json(
        { error: 'Book is no longer available' },
        { status: 409 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(days));

    const issueRecord = await IssueRecord.create({
      userId: authResult.user._id,
      bookId: book._id,
      storeId: book.storeId._id,
      issueDate,
      dueDate,
      status: 'ISSUED',
    });

    const populatedIssue = await IssueRecord.findById(issueRecord._id)
      .populate('userId', 'name email username')
      .populate('bookId', 'title author ISBN')
      .populate('storeId', 'storeName');

    // ── EVENT: fire notification + email immediately (non-blocking) ───────────
    createNotification(
      authResult.user._id,
      book.storeId._id,
      `You have issued "${book.title}" from ${book.storeId.storeName}. ` +
        `Please return it by ${dueDate.toLocaleDateString('en-IN')}.`,
      'ISSUE'
    ).catch((err) => console.error('[Issue] Notification failed:', err.message));
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json(
      { message: 'Book issued successfully.', issue: populatedIssue },
      { status: 201 }
    );
  } catch (error) {
    console.error('Issue book error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
