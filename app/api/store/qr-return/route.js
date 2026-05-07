export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import IssueRecord from '@/models/IssueRecord.js';
import Book from '@/models/Book.js';
import Store from '@/models/Store.js';
import User from '@/models/User.js';
import { authenticate } from '@/middleware/auth.js';
import { createNotification } from '@/lib/notifications.js';

/**
 * POST /api/store/qr-return
 *
 * Processes a book return triggered by a QR code scan.
 * Body: { issueId: string }
 *
 * Auth: STORE role required.
 * The issue must belong to the authenticated store.
 */
export async function POST(request) {
  try {
    const authResult = await authenticate(request, ['STORE']);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const body = await request.json().catch(() => ({}));
    const { issueId } = body;

    if (!issueId || typeof issueId !== 'string' || issueId.trim().length === 0) {
      return NextResponse.json(
        { error: 'issueId is required' },
        { status: 400 }
      );
    }

    // ── Verify the store belongs to the authenticated owner ─────────────────
    const store = await Store.findOne({ ownerId: authResult.user._id });
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // ── Find the issue record — must belong to this store ───────────────────
    const issue = await IssueRecord.findOne({
      _id:     issueId.trim(),
      storeId: store._id,
    })
      .populate('bookId')
      .populate('userId');

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue record not found or does not belong to this store' },
        { status: 404 }
      );
    }

    if (issue.status === 'RETURNED') {
      return NextResponse.json(
        { error: 'This book has already been returned' },
        { status: 400 }
      );
    }

    const fine = issue.fine || 0;

    // ── 1. Increment available copies atomically ─────────────────────────────
    await Book.findByIdAndUpdate(issue.bookId._id, {
      $inc: { availableCopies: 1 },
    });

    // ── 2. Mark issue as RETURNED ────────────────────────────────────────────
    issue.status     = 'RETURNED';
    issue.returnDate = new Date();
    await issue.save();

    // ── 3. Update user's readingHistory for recommendations ─────────────────
    const category = issue.bookId?.category;
    if (category) {
      const user = await User.findById(issue.userId._id);
      if (user) {
        const entry = user.readingHistory.find((h) => h.category === category);
        if (entry) {
          entry.count += 1;
        } else {
          user.readingHistory.push({ category, count: 1 });
        }
        await user.save();
      }
    }

    // ── 4. Fire notification + realtime events (non-blocking) ───────────────
    const fineMsg = fine > 0 ? ` A fine of ₹${fine} has been recorded.` : '';
    createNotification(
      issue.userId._id,
      store._id,
      `✅ "${issue.bookId.title}" returned to ${store.storeName} via QR scan.${fineMsg}`,
      'RETURN'
    ).catch((err) => console.error('[QR Return] Notification failed:', err.message));

    return NextResponse.json({
      message: 'Book returned successfully via QR scan',
      issue: {
        _id:        issue._id,
        status:     issue.status,
        returnDate: issue.returnDate,
        fine,
        bookTitle:  issue.bookId?.title,
        userName:   issue.userId?.name,
      },
    });
  } catch (error) {
    // Handle invalid ObjectId format gracefully
    if (error.name === 'CastError') {
      return NextResponse.json(
        { error: 'Invalid QR code — issue ID format is incorrect' },
        { status: 400 }
      );
    }
    console.error('[QR Return] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
