/**
 * lib/notifications.js
 *
 * Single source of truth for all notification + email events.
 * All API routes and the cron job import from HERE — not from cron.js.
 *
 * Order of operations (guaranteed):
 *  1. Write Notification document to MongoDB  ← must succeed first
 *  2. Emit via WebSocket to user room          ← non-fatal if it fails
 *  3. Emit store_update to store room          ← non-fatal, if storeId given
 *  4. Send email to user                       ← non-fatal if it fails
 */

import Notification from '@/models/Notification.js';
import User from '@/models/User.js';
import { sendEmail, generateEmailHTML } from '@/lib/email.js';

const SUBJECTS = {
  ISSUE:    'Book Issued — LibraryHub',
  REMINDER: 'Return Reminder — LibraryHub',
  FINE:     'Overdue Notice — LibraryHub',
  RETURN:   'Book Returned — LibraryHub',
};

/**
 * createNotification
 *
 * 1. Writes a Notification document to MongoDB.
 * 2. Emits a 'notification' socket event to the user's personal room.
 * 3. Emits a 'store_update' socket event to the store's room (if storeId provided).
 * 4. Sends an email to the user (non-fatal if it fails).
 *
 * @param {string|ObjectId} userId
 * @param {string|ObjectId|null} storeId
 * @param {string} message
 * @param {'ISSUE'|'REMINDER'|'FINE'|'RETURN'} type
 */
export async function createNotification(userId, storeId, message, type) {
  // ── 1. Persist in-app notification ────────────────────────────────────────
  // This MUST succeed before we emit anything over sockets.
  let notification;
  try {
    notification = await Notification.create({
      userId,
      storeId: storeId || null,
      message,
      type,
      isRead: false,
    });
  } catch (dbErr) {
    // Notification failure must never crash the caller
    console.error('[Notification] DB write failed:', dbErr.message);
    return;
  }

  // Build the payload once — reused for both socket emits
  const socketPayload = {
    _id:       notification._id.toString(),
    message,
    type,
    storeId:   storeId ? storeId.toString() : null,
    isRead:    false,
    createdAt: notification.createdAt,
  };

  // ── 2. Emit to user's personal room ───────────────────────────────────────
  try {
    if (global._io) {
      global._io
        .to(`user:${userId.toString()}`)
        .emit('notification', socketPayload);
    }
  } catch (socketErr) {
    console.error('[Notification] User socket emit failed:', socketErr.message);
  }

  // ── 3. Emit store_update to the store's room (if applicable) ──────────────
  // This triggers the store dashboard to refresh its issues/books lists.
  if (storeId) {
    try {
      if (global._io) {
        global._io
          .to(`store:${storeId.toString()}`)
          .emit('store_update', {
            type,    // 'ISSUE' | 'RETURN' | 'FINE' | 'REMINDER'
            message,
            userId:  userId.toString(),
            storeId: storeId.toString(),
          });
      }
    } catch (socketErr) {
      console.error('[Notification] Store socket emit failed:', socketErr.message);
    }
  }

  // ── 4. Send email (non-fatal) ─────────────────────────────────────────────
  try {
    const user = await User.findById(userId).select('email').lean();
    if (user?.email) {
      await sendEmail({
        to:      user.email,
        subject: SUBJECTS[type] || 'LibraryHub Notification',
        html:    generateEmailHTML(message, type),
      });
    }
  } catch (emailErr) {
    console.error('[Notification] Email failed:', emailErr.message);
  }
}
