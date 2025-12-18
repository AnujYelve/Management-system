import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import User from '@/models/User.js';
import { authenticate } from '@/middleware/auth.js';

/**
 * Get current authenticated user
 * Used by frontend to check auth status
 */
export async function GET(request) {
  try {
    const authResult = await authenticate(request, []);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    return NextResponse.json({
      user: {
        id: authResult.user._id,
        name: authResult.user.name,
        username: authResult.user.username,
        email: authResult.user.email,
        role: authResult.user.role
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

