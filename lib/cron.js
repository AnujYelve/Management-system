const cron = require('node-cron');
const connectDB = require('./db');
const IssueRecord = require('../models/IssueRecord');
const Notification = require('../models/Notification');
const Book = require('../models/Book');
const Store = require('../models/Store');
const User = require('../models/User');
const { sendEmail, generateEmailHTML } = require('./email');

/**
 * Calculate fine for overdue books
 * Fine = ₹5 per day after due date
 */
function calculateFine(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  
  if (now <= due) {
    return 0;
  }
  
  const diffTime = now - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays * 5; // ₹5 per day
}

/**
 * Send notification to user (both in-app and email)
 */
async function createNotification(userId, storeId, message, type) {
  try {
    // Create in-app notification
    await Notification.create({
      userId,
      storeId,
      message,
      type,
      isRead: false
    });

    // Also send email notification
    try {
      const user = await User.findById(userId);
      if (user && user.email) {
        let subject = '';
        switch (type) {
          case 'ISSUE':
            subject = 'Book Issued Confirmation';
            break;
          case 'REMINDER':
            subject = 'Book Return Reminder';
            break;
          case 'FINE':
            subject = 'Book Overdue Notice';
            break;
          default:
            subject = 'Library Management Notification';
        }

        const html = generateEmailHTML(message, type);
        await sendEmail({
          to: user.email,
          subject: subject,
          html: html
        });
      }
    } catch (emailError) {
      // Log email error but don't fail the notification creation
      console.error('Error sending email notification:', emailError.message);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Process daily cron job for notifications
 * Runs every day at 9:00 AM
 */
async function processDailyNotifications() {
  try {
    await connectDB();
    
    // Get all issued books (not returned)
    const issuedBooks = await IssueRecord.find({
      status: { $in: ['ISSUED', 'OVERDUE'] }
    }).populate('bookId').populate('storeId').populate('userId');
    
    const now = new Date();
    
    for (const record of issuedBooks) {
      const dueDate = new Date(record.dueDate);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      // Check if book is overdue
      if (now > dueDate) {
        // Update status to OVERDUE if not already
        if (record.status !== 'OVERDUE') {
          record.status = 'OVERDUE';
          await record.save();
        }
        
        // Calculate fine
        const fine = calculateFine(record.dueDate);
        record.fine = fine;
        await record.save();
        
        // Send fine notification every 10 days
        const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
        if (daysOverdue % 10 === 0) {
          const bookTitle = record.bookId?.title || 'Book';
          const storeName = record.storeId?.storeName || 'Store';
          await createNotification(
            record.userId._id,
            record.storeId._id,
            `Your book "${bookTitle}" from ${storeName} is overdue. Current fine: ₹${fine}`,
            'FINE'
          );
        }
      }
      // Send reminder 5 days before due date
      else if (daysUntilDue === 5) {
        const bookTitle = record.bookId?.title || 'Book';
        await createNotification(
          record.userId._id,
          record.storeId._id,
          `Reminder: Return "${bookTitle}" within 5 days.`,
          'REMINDER'
        );
      }
    }
    
    console.log('Daily notifications processed successfully');
  } catch (error) {
    console.error('Error processing daily notifications:', error);
  }
}

/**
 * Initialize cron job
 * This will be called from API route
 */
function initializeCron() {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily notification cron job...');
    await processDailyNotifications();
  });
  
  console.log('Cron job initialized - will run daily at 9:00 AM');
}

module.exports = {
  processDailyNotifications,
  initializeCron,
  calculateFine,
  createNotification
};

