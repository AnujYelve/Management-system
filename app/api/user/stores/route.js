import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Store from '@/models/Store.js';
import User from '@/models/User.js';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const search = searchParams.get('search');
    
    let query = {};
    
    // Filter by city
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    
    // Search by store name
    if (search) {
      query.storeName = { $regex: search, $options: 'i' };
    }
    
    const stores = await Store.find(query)
      .populate('ownerId', 'name email username isBlocked')
      .sort({ createdAt: -1 });
    
    // Filter out stores with blocked owners
    const activeStores = stores.filter(store => !store.ownerId.isBlocked);
    
    return NextResponse.json({ stores: activeStores });
  } catch (error) {
    console.error('Get stores error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

