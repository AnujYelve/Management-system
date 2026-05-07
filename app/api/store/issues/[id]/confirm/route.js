export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import IssueRecord from '@/models/IssueRecord.js';
import Book from '@/models/Book.js';
import Store from '@/models/Store.js';
import User from '@/models/User.js';
import { authenticate } from '@/middleware/auth.js';
import { createNotification } from '@/lib/notifications.js';

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
    const { action } = await request.json(); // 'return' only — 'issue' now happens at user request time

    const store = await Store.findOne({ ownerId: authResult.user._id });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const issue = await IssueRecord.findOne({ _id: id, storeId: store._id })
      .populate('bookId')
      .populate('userId');

    if (!issue) {
      return NextResponse.json({ error: 'Issue record not found' }, { status: 404 });
    }

    // ── RETURN action ──────────────────────────────────────────────────────────
    if (action === 'return') {
      if (issue.status === 'RETURNED') {
        return NextResponse.json({ error: 'Book is already returned' }, { status: 400 });
      }

      // Calculate fine before marking as returned
      const fine = issue.fine || 0;

      // Increment available copies atomically
      await Book.findByIdAndUpdate(issue.bookId._id, {
        $inc: { availableCopies: 1 },
      });

      // Mark as returned
      issue.status = 'RETURNED';
      issue.returnDate = new Date();
      await issue.save();

      // ── Update user's readingHistory ────────────────────────────────────────
      // Upsert the category count so recommendations work correctly
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
      // ─────────────────────────────────────────────────────────────────────────

      // ── EVENT: fire return notification + email immediately ────────────────
      const fineMsg = fine > 0 ? ` A fine of ₹${fine} has been recorded.` : '';
      createNotification(
        issue.userId._id,
        store._id,
        `You have successfully returned "${issue.bookId.title}" to ${store.storeName}.${fineMsg}`,
        'RETURN'
      ).catch((err) => console.error('[Return] Notification failed:', err.message));
      // ─────────────────────────────────────────────────────────────────────────

      return NextResponse.json({ message: 'Book returned successfully', issue });
    }

    // ── LEGACY 'issue' action — kept for backward compatibility ───────────────
    // NOTE: availableCopies is now decremented at issue-request time (user route).
    // This action only re-sends the confirmation notification.
    if (action === 'issue') {
      if (issue.status !== 'ISSUED') {
        return NextResponse.json(
          { error: 'Book is already confirmed or returned' },
          { status: 400 }
        );
      }

      // Re-send confirmation notification
      createNotification(
        issue.userId._id,
        store._id,
        `Store "${store.storeName}" confirmed your issue of "${issue.bookId.title}". ` +
          `Return by ${new Date(issue.dueDate).toLocaleDateString('en-IN')}.`,
        'ISSUE'
      ).catch((err) => console.error('[Confirm] Notification failed:', err.message));

      return NextResponse.json({ message: 'Issue confirmed', issue });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "return"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Confirm issue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
