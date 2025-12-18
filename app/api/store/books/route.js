import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Book from '@/models/Book.js';
import Store from '@/models/Store.js';
import { authenticate } from '@/middleware/auth.js';
import { parseFormData, fileToBuffer } from '@/utils/parseFormData.js';
import { uploadImage, isConfigured } from '@/lib/cloudinary.js';

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
    
    const store = await Store.findOne({ ownerId: authResult.user._id });
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }
    
    const books = await Book.find({ storeId: store._id })
      .populate('storeId', 'storeName')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ books });
  } catch (error) {
    console.error('Get books error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    
    // Parse form data (supports both JSON and multipart/form-data)
    let title, author, category, ISBN, totalCopies, description, bookImage;
    let imageFile = null;

    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const { fields, files } = await parseFormData(request);
      title = fields.title;
      author = fields.author;
      category = fields.category;
      ISBN = fields.ISBN;
      totalCopies = fields.totalCopies;
      description = fields.description;
      imageFile = files.bookImage;
      bookImage = fields.bookImage; // Fallback to URL if provided
    } else {
      // Handle JSON request (backward compatibility)
      const body = await request.json();
      title = body.title;
      author = body.author;
      category = body.category;
      ISBN = body.ISBN;
      totalCopies = body.totalCopies;
      description = body.description;
      bookImage = body.bookImage;
    }
    
    if (!title || !author || !category || !ISBN || !totalCopies) {
      return NextResponse.json(
        { error: 'Title, author, category, ISBN, and totalCopies are required' },
        { status: 400 }
      );
    }
    
    const store = await Store.findOne({ ownerId: authResult.user._id });
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found. Please register your store first.' },
        { status: 404 }
      );
    }
    
    // Check if book with same ISBN exists
    const existingBook = await Book.findOne({ ISBN });
    
    if (existingBook) {
      return NextResponse.json(
        { error: 'Book with this ISBN already exists' },
        { status: 400 }
      );
    }
    
    // Handle image upload if file is provided
    let imageUrl = bookImage || '';
    
    if (imageFile) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(imageFile.type)) {
        return NextResponse.json(
          { error: 'Invalid image type. Only JPEG, PNG, and WebP are allowed.' },
          { status: 400 }
        );
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imageFile.size > maxSize) {
        return NextResponse.json(
          { error: 'Image size too large. Maximum size is 5MB.' },
          { status: 400 }
        );
      }
      
      // Upload to Cloudinary if configured
      if (isConfigured()) {
        try {
          const fileBuffer = await fileToBuffer(imageFile);
          const uploadResult = await uploadImage(fileBuffer, 'books');
          imageUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return NextResponse.json(
            { error: 'Failed to upload image. Please try again.' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Image upload is not configured. Please set Cloudinary credentials.' },
          { status: 500 }
        );
      }
    }
    
    const book = await Book.create({
      title,
      author,
      category,
      ISBN,
      storeId: store._id,
      totalCopies: parseInt(totalCopies),
      availableCopies: parseInt(totalCopies),
      description: description || '',
      bookImage: imageUrl
    });
    
    const populatedBook = await Book.findById(book._id)
      .populate('storeId', 'storeName');
    
    return NextResponse.json({
      message: 'Book added successfully',
      book: populatedBook
    }, { status: 201 });
  } catch (error) {
    console.error('Add book error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

