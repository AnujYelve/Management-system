import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Book from '@/models/Book.js';
import Store from '@/models/Store.js';
import { authenticate } from '@/middleware/auth.js';

export async function PATCH(request, { params }) {
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
    const updateData = await request.json();
    
    const store = await Store.findOne({ ownerId: authResult.user._id });
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }
    
    const book = await Book.findOne({ _id: id, storeId: store._id });
    
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    
    // If totalCopies is updated, adjust availableCopies
    if (updateData.totalCopies !== undefined) {
      const diff = updateData.totalCopies - book.totalCopies;
      updateData.availableCopies = Math.max(0, book.availableCopies + diff);
    }
    
    const updatedBook = await Book.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('storeId', 'storeName');
    
    return NextResponse.json({
      message: 'Book updated successfully',
      book: updatedBook
    });
  } catch (error) {
    console.error('Update book error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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
    
    const store = await Store.findOne({ ownerId: authResult.user._id });
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }
    
    const book = await Book.findOne({ _id: id, storeId: store._id });
    
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    
    await Book.findByIdAndDelete(id);
    
    return NextResponse.json({
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Delete book error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

