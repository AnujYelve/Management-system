import { verifyToken } from '@/lib/auth.js';
import User from '@/models/User.js';
import connectDB from '@/lib/db.js';

/**
 * Get token from Next.js request
 * In Next.js App Router, cookies are accessed via request.cookies
 */
async function getTokenFromRequest(request) {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookies - Next.js passes cookies in request
  // For App Router, we need to get cookies from the request
  // The cookie is set by the browser, so we need to parse it from headers
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    if (cookies.token) {
      return cookies.token;
    }
  }
  
  return null;
}

/**
 * Middleware to verify authentication
 */
async function authenticate(request, allowedRoles = []) {
  try {
    await connectDB();
    
    // Get token from request headers or cookies
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      return { error: 'Authentication required', status: 401 };
    }
    
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return { error: 'Invalid or expired token', status: 401 };
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return { error: 'User not found', status: 404 };
    }
    
    if (user.isBlocked) {
      return { error: 'Account is blocked', status: 403 };
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return { error: 'Access denied', status: 403 };
    }
    
    return { user, decoded };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Authentication failed', status: 500 };
  }
}

export { authenticate };

