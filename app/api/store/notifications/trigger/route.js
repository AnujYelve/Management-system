import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Notification from '@/models/Notification.js';
import Store from '@/models/Store.js';
import { authenticate } from '@/middleware/auth.js';

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
    
    const { userId, message, type } = await request.json();
    
    if (!userId || !message || !type) {
      return NextResponse.json(
        { error: 'userId, message, and type are required' },
        { status: 400 }
      );
    }
    
    const store = await Store.findOne({ ownerId: authResult.user._id });
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }
    
    const notification = await Notification.create({
      userId,
      storeId: store._id,
      message,
      type: type.toUpperCase(),
      isRead: false
    });
    
    return NextResponse.json({
      message: 'Notification sent successfully',
      notification
    }, { status: 201 });
  } catch (error) {
    console.error('Trigger notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

