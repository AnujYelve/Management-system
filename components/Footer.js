'use client';

import { BookOpen, Users, Store, Shield, Mail, Github, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <span className="text-lg font-bold text-slate-900">LibraryHub</span>
            </div>
            <p className="text-sm text-slate-600">
              Your neighborhood library, now digital. Connect with multiple stores, browse books, and manage your reading journey.
            </p>
          </div>

          {/* For Users */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>For Users</span>
            </h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/user/login" className="text-slate-600 hover:text-indigo-600 transition">Login</a></li>
              <li><a href="/user/register" className="text-slate-600 hover:text-indigo-600 transition">Register</a></li>
              <li><a href="/user/dashboard" className="text-slate-600 hover:text-indigo-600 transition">Dashboard</a></li>
            </ul>
          </div>

          {/* For Stores */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center space-x-2">
              <Store className="h-4 w-4" />
              <span>For Stores</span>
            </h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/store/login" className="text-slate-600 hover:text-indigo-600 transition">Login</a></li>
              <li><a href="/store/register" className="text-slate-600 hover:text-indigo-600 transition">Register</a></li>
              <li><a href="/store/dashboard" className="text-slate-600 hover:text-indigo-600 transition">Dashboard</a></li>
            </ul>
          </div>

          {/* For Admin */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>For Admin</span>
            </h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/admin/login" className="text-slate-600 hover:text-indigo-600 transition">Admin Login</a></li>
              <li><a href="/admin/dashboard" className="text-slate-600 hover:text-indigo-600 transition">Dashboard</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Support</span>
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2 text-slate-600">
                <Mail className="h-4 w-4" />
                <span>support@libraryhub.com</span>
              </li>
              <li className="flex items-center space-x-4 mt-4">
                <a href="#" className="text-slate-400 hover:text-indigo-600 transition">
                  <Github className="h-5 w-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-indigo-600 transition">
                  <Twitter className="h-5 w-5" />
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} LibraryHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

