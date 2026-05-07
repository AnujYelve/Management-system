'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, BookOpen, LogOut, User, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    if (user) {
      fetchNotifications();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      // Not authenticated
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    router.push('/');
  };

  const getDashboardPath = () => {
    if (!user) return null;
    if (user.role === 'ADMIN') return '/admin/dashboard';
    if (user.role === 'STORE') return '/store/dashboard';
    if (user.role === 'USER') return '/user/dashboard';
    return null;
  };

  const isPublicPage = pathname === '/' || pathname?.includes('/login') || pathname?.includes('/register');

  if (isPublicPage && !user) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-indigo-600" />
              <span className="text-xl font-bold text-slate-900">LibraryHub</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="/user/login" className="text-slate-600 hover:text-indigo-600 transition">User Login</a>
              <a href="/store/login" className="text-slate-600 hover:text-indigo-600 transition">Store Login</a>
              <a href="/admin/login" className="text-slate-600 hover:text-indigo-600 transition">Admin Login</a>
              <a href="/user/register" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                Get Started
              </a>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200/50"
            >
              <div className="px-4 py-4 space-y-3">
                <a href="/user/login" className="block text-slate-600 hover:text-indigo-600">User Login</a>
                <a href="/store/login" className="block text-slate-600 hover:text-indigo-600">Store Login</a>
                <a href="/admin/login" className="block text-slate-600 hover:text-indigo-600">Admin Login</a>
                <a href="/user/register" className="block px-4 py-2 bg-indigo-600 text-white rounded-lg text-center">
                  Get Started
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    );
  }

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push(getDashboardPath() || '/')}>
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <span className="text-xl font-bold text-slate-900">LibraryHub</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => router.push('/user/dashboard')}
              className="text-slate-600 hover:text-indigo-600 transition relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 text-slate-700 hover:text-indigo-600 transition"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="hidden lg:block">{user.name}</span>
              </button>
              
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2"
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.role}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-indigo-600 transition relative"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            {!mobileMenuOpen && unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-3 w-3 bg-amber-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-200/50 bg-white shadow-lg overflow-hidden"
          >
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{user.name}</p>
                  <p className="text-sm text-slate-500">{user.role}</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push(getDashboardPath() || '/');
                }}
                className="flex items-center justify-between w-full text-slate-600 hover:text-indigo-600 transition py-2"
              >
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Dashboard & Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 w-full text-red-600 hover:text-red-700 transition py-2 font-medium"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

