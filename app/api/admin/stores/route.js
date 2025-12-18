import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Store from '@/models/Store.js';
import User from '@/models/User.js';
import { authenticate } from '@/middleware/auth.js';

export async function GET(request) {
  try {
    const authResult = await authenticate(request, ['ADMIN']);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    await connectDB();
    
    const stores = await Store.find()
      .populate('ownerId', 'name email username isBlocked')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ stores });
  } catch (error) {
    console.error('Get stores error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const authResult = await authenticate(request, ['ADMIN']);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    await connectDB();
    
    const { storeId, isBlocked } = await request.json();
    
    if (!storeId || typeof isBlocked !== 'boolean') {
      return NextResponse.json(
        { error: 'storeId and isBlocked are required' },
        { status: 400 }
      );
    }
    
    const store = await Store.findById(storeId).populate('ownerId');
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }
    
    const user = await User.findByIdAndUpdate(
      store.ownerId._id,
      { isBlocked },
      { new: true }
    ).select('-password');
    
    return NextResponse.json({
      message: `Store ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      store: await Store.findById(storeId).populate('ownerId', 'name email username isBlocked')
    });
  } catch (error) {
    console.error('Update store error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

