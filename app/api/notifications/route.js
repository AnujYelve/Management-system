import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Notification from '@/models/Notification.js';
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
    
    const notifications = await Notification.find({ userId: authResult.user._id })
      .populate('storeId', 'storeName')
      .sort({ createdAt: -1 })
      .limit(50);
    
    const unreadCount = await Notification.countDocuments({
      userId: authResult.user._id,
      isRead: false
    });
    
    return NextResponse.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const authResult = await authenticate(request, ['USER']);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    await connectDB();
    
    const { notificationId, isRead } = await request.json();
    
    if (!notificationId || typeof isRead !== 'boolean') {
      return NextResponse.json(
        { error: 'notificationId and isRead are required' },
        { status: 400 }
      );
    }
    
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: authResult.user._id },
      { isRead },
      { new: true }
    );
    
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Notification updated successfully',
      notification
    });
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const authResult = await authenticate(request, ['USER']);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    await connectDB();
    
    await Notification.updateMany(
      { userId: authResult.user._id },
      { isRead: true }
    );
    
    return NextResponse.json({
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

