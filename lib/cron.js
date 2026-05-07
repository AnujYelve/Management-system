/**
 * lib/cron.js
 *
 * Called by GET /api/cron which is triggered daily at 09:00 UTC
 * via Vercel Cron (vercel.json).  No node-cron — no persistent process needed.
 *
 * Responsibilities:
 *  1. Mark overdue IssueRecords + update fine amount
 *  2. Send overdue FINE notifications (day 1, then every 3 days)
 *  3. Send 5-day return REMINDER notifications
 */

import connectDB from '@/lib/db.js';
import IssueRecord from '@/models/IssueRecord.js';
import { createNotification } from '@/lib/notifications.js';

// ₹5 per day after due date
export function calculateFine(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  if (now <= due) return 0;
  const diffDays = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
  return diffDays * 5;
}

/**
 * Core daily job — invoked by /api/cron GET handler.
 */
export async function processDailyNotifications() {
  await connectDB();

  const issuedBooks = await IssueRecord.find({
    status: { $in: ['ISSUED', 'OVERDUE'] },
  })
    .populate('bookId', 'title')
    .populate('storeId', 'storeName _id')
    .populate('userId', '_id');

  const now = new Date();
  let processed = 0;

  for (const record of issuedBooks) {
    const dueDate = new Date(record.dueDate);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (now > dueDate) {
      // ── Book is overdue ──────────────────────────────────────────────────
      const fine = calculateFine(record.dueDate);
      const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));

      // Batch-update status + fine in one write
      const needsStatusChange = record.status !== 'OVERDUE';
      if (needsStatusChange || record.fine !== fine) {
        await IssueRecord.findByIdAndUpdate(record._id, {
          status: 'OVERDUE',
          fine,
        });
      }

      // Notify on day 1 of overdue, then every 3 days (day 4, 7, 10 …)
      // Fix: (daysOverdue - 1) % 3 === 0 hits 1, 4, 7, 10 correctly.
      // The old `daysOverdue % 3 === 0` was hitting 3, 6, 9 — wrong.
      const shouldNotify = (daysOverdue - 1) % 3 === 0;
      if (shouldNotify) {
        const bookTitle = record.bookId?.title || 'your book';
        const storeName = record.storeId?.storeName || 'the library';
        await createNotification(
          record.userId._id,
          record.storeId?._id || null,
          `"${bookTitle}" from ${storeName} is ${daysOverdue} day(s) overdue. ` +
            `Current fine: ₹${fine}. Please return it as soon as possible.`,
          'FINE'
        );
        processed++;
      }
    } else if (daysUntilDue === 5) {
      // ── 5-day reminder ───────────────────────────────────────────────────
      const bookTitle = record.bookId?.title || 'your book';
      await createNotification(
        record.userId._id,
        record.storeId?._id || null,
        `Reminder: "${bookTitle}" is due in 5 days. Please return it on time to avoid fines.`,
        'REMINDER'
      );
      processed++;
    }
  }

  console.log(
    `[Cron] processDailyNotifications complete — ${issuedBooks.length} records scanned, ${processed} notifications sent.`
  );
}
