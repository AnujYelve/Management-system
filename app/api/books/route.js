import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Book from '@/models/Book.js';
import Store from '@/models/Store.js';
import User from '@/models/User.js';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    let query = {};
    
    if (storeId) {
      query.storeId = storeId;
    }
    
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { ISBN: { $regex: search, $options: 'i' } }
      ];
    }
    
    const books = await Book.find(query)
      .populate('storeId', 'storeName city address isOpenToday')
      .sort({ createdAt: -1 });
    
    // Filter out books from blocked stores
    const activeBooks = books.filter(book => {
      const store = book.storeId;
      return store && store.ownerId && !store.ownerId.isBlocked;
    });
    
    return NextResponse.json({ books: activeBooks });
  } catch (error) {
    console.error('Get books error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

