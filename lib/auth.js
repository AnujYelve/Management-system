import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Hash password
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password
 */
export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Middleware to verify JWT from request
 */
export async function getTokenFromRequest(req) {
  // Handle Next.js Request object - check Authorization header
  if (req.headers) {
    const authHeader = req.headers.get ? req.headers.get('authorization') : req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }
  
  // Check cookies (for Next.js App Router)
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      return token;
    }
  } catch (e) {
    // If cookies() fails, try direct access
    if (req.cookies) {
      const token = req.cookies.get ? req.cookies.get('token')?.value : req.cookies.token;
      if (token) {
        return token;
      }
    }
  }
  
  return null;
}

