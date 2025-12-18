import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Store from '@/models/Store.js';
import User from '@/models/User.js';
import { authenticate } from '@/middleware/auth.js';
import { parseFormData, fileToBuffer } from '@/utils/parseFormData.js';
import { uploadImage, isConfigured } from '@/lib/cloudinary.js';

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
    let storeName, address, city, storeImage, timings, isOpenToday;
    let imageFile = null;

    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const { fields, files } = await parseFormData(request);
      storeName = fields.storeName;
      address = fields.address;
      city = fields.city;
      timings = fields.timings;
      isOpenToday = fields.isOpenToday === 'true' || fields.isOpenToday === 'on';
      imageFile = files.storeImage;
      storeImage = fields.storeImage; // Fallback to URL if provided
    } else {
      // Handle JSON request (backward compatibility)
      const body = await request.json();
      storeName = body.storeName;
      address = body.address;
      city = body.city;
      storeImage = body.storeImage;
      timings = body.timings;
      isOpenToday = body.isOpenToday;
    }
    
    if (!storeName || !address || !city) {
      return NextResponse.json(
        { error: 'Store name, address, and city are required' },
        { status: 400 }
      );
    }
    
    // Check if store already exists for this owner
    const existingStore = await Store.findOne({ ownerId: authResult.user._id });
    
    if (existingStore) {
      return NextResponse.json(
        { error: 'Store already registered for this account' },
        { status: 400 }
      );
    }
    
    // Handle image upload if file is provided
    let imageUrl = storeImage || '';
    
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
          const uploadResult = await uploadImage(fileBuffer, 'stores');
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
    
    const store = await Store.create({
      ownerId: authResult.user._id,
      storeName,
      address,
      city,
      storeImage: imageUrl,
      timings: timings || '9:00 AM - 6:00 PM',
      isOpenToday: isOpenToday !== undefined ? isOpenToday : true
    });
    
    const populatedStore = await Store.findById(store._id)
      .populate('ownerId', 'name email username');
    
    return NextResponse.json({
      message: 'Store registered successfully',
      store: populatedStore
    });
  } catch (error) {
    console.error('Store registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

