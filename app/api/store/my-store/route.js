export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Store from '@/models/Store.js';
import { authenticate } from '@/middleware/auth.js';

export async function GET(request) {
  try {
    const authResult = await authenticate(request, ['STORE']);

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const store = await Store.findOne({ ownerId: authResult.user._id })
      .populate('ownerId', 'name email username');

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found. Please register your store first.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ store });
  } catch (error) {
    console.error('Get store error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const authResult = await authenticate(request, ['STORE']);

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const updateData = await request.json();

    const store = await Store.findOneAndUpdate(
      { ownerId: authResult.user._id },
      updateData,
      { new: true }
    ).populate('ownerId', 'name email username');

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Store updated successfully',
      store
    });
  } catch (error) {
    console.error('Update store error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

