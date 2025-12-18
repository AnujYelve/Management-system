'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Search, Store, Bell, Clock, ArrowRight, CheckCircle, Users, Library, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role === 'ADMIN') {
            router.push('/admin/dashboard');
          } else if (data.user?.role === 'STORE') {
            router.push('/store/dashboard');
          } else if (data.user?.role === 'USER') {
            router.push('/user/dashboard');
          }
        }
      } catch (err) {
        // Not authenticated, show landing page
      }
    };
    checkAuth();
  }, [router]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/user/dashboard?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                Your Neighborhood Library,{' '}
                <span className="text-indigo-600">Now Digital</span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Discover, issue, and manage books across multiple local stores — all from one simple platform.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="mb-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for books, authors, or categories..."
                    className="w-full pl-12 pr-32 py-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-lg bg-white shadow-sm"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <motion.a
                  href="/user/register"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold shadow-lg shadow-indigo-500/30 flex items-center space-x-2"
                >
                  <span>Browse Books</span>
                  <ArrowRight className="h-5 w-5" />
                </motion.a>
                <motion.a
                  href="/store/register"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-white text-indigo-600 border-2 border-indigo-600 rounded-xl hover:bg-indigo-50 transition font-semibold flex items-center space-x-2"
                >
                  <Store className="h-5 w-5" />
                  <span>Register Store</span>
                </motion.a>
              </div>
            </motion.div>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80"
                  alt="Library bookshelf"
                  className="w-full h-[500px] object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything you need</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Simple tools to help you find and manage books from local stores.
            </p>
          </motion.div>

          <div className="space-y-24">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div className="order-2 md:order-1">
                <img
                  src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80"
                  alt="Multiple library stores"
                  className="rounded-2xl shadow-xl w-full"
                />
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-100 mb-6">
                  <Store className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">Multi-Store Access</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Browse and borrow from multiple library stores in your area. One account gives you access to all of them.
                </p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div>
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-amber-100 mb-6">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">Real-Time Availability</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  See which books are available right now. No more wasted trips to empty shelves.
                </p>
              </div>
              <div>
                <img
                  src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80"
                  alt="Real-time book availability"
                  className="rounded-2xl shadow-xl w-full"
                />
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div className="order-2 md:order-1">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80"
                  alt="Automated notifications"
                  className="rounded-2xl shadow-xl w-full"
                />
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-green-100 mb-6">
                  <Bell className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">Automated Reminders</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Get reminders before due dates and stay on top of your reading schedule. We'll handle the notifications so you don't have to.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Getting started is simple. Here's what you need to know.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Register', description: 'Create your account as a user or store owner', icon: Users },
              { step: '2', title: 'Browse', description: 'Search and explore books from multiple stores', icon: Search },
              { step: '3', title: 'Issue', description: 'Request books and get instant confirmations', icon: BookOpen },
              { step: '4', title: 'Get Reminders', description: 'Receive automated notifications for due dates', icon: Bell }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center card-hover">
                  <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Finding the right book shouldn't feel complicated.
            </h2>
            <p className="text-xl text-indigo-100 mb-8 leading-relaxed">
              Let's make it simpler. Join thousands of readers and library stores already using LibraryHub.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="/user/register"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-white text-indigo-600 rounded-xl hover:bg-slate-50 transition font-semibold shadow-lg"
              >
                Get Started Free
              </motion.a>
              <motion.a
                href="/user/login"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition font-semibold border-2 border-white/20"
              >
                Sign In
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
