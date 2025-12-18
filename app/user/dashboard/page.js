'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Search, Bell, LogOut, Book, Calendar, Store, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [books, setBooks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('books');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [issueDays, setIssueDays] = useState('14');
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    fetchUserData();
    fetchStores();
    fetchBooks();
    fetchNotifications();
    fetchMyIssues();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [searchTerm, selectedStore]);

  const addToast = (type, message, title = '') => {
    const id = Date.now();
    setToasts([...toasts, { id, type, message, title, autoClose: true, duration: 3000 }]);
  };

  const removeToast = (id) => {
    setToasts(toasts.filter(t => t.id !== id));
  };

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        router.push('/user/login');
        return;
      }
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch (err) {
      router.push('/user/login');
    }
  };

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/user/stores', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setStores(data.stores || []);
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  const fetchBooks = async () => {
    try {
      let url = '/api/user/books';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStore) params.append('storeId', selectedStore);
      if (params.toString()) url += '?' + params.toString();

      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setBooks(data.books || []);
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchMyIssues = async () => {
    try {
      const res = await fetch('/api/user/my-issues', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setMyIssues(data.issues || []);
    } catch (err) {
      console.error('Error fetching my issues:', err);
    }
  };

  const handleIssueBook = async () => {
    if (!selectedBook || !issueDays) return;

    try {
      const res = await fetch('/api/user/books/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookId: selectedBook._id, days: parseInt(issueDays) })
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Book issue request created! Waiting for store confirmation.');
        setShowIssueModal(false);
        fetchBooks();
        fetchNotifications();
        fetchMyIssues();
      } else {
        addToast('error', data.error || 'Failed to issue book');
      }
    } catch (err) {
      addToast('error', 'Something went wrong');
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationId, isRead: true })
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ISSUED: { color: 'bg-blue-100 text-blue-800', icon: Book },
      OVERDUE: { color: 'bg-red-100 text-red-800', icon: XCircle },
      RETURNED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    };
    const badge = badges[status] || badges.ISSUED;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        <span>{status}</span>
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Header - Left aligned, natural spacing */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h1 className="text-4xl font-bold text-slate-900 mb-3 leading-tight">
              Welcome back, {user.name}
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl">
              Here's what's happening with your books and reading journey.
            </p>
          </motion.div>

          {/* Stats Cards - Natural spacing, not perfectly aligned */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm card-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-2">Books you're reading</p>
                  <p className="text-4xl font-bold text-slate-900 mb-1">
                    {myIssues.filter(i => i.status === 'ISSUED').length}
                  </p>
                  <p className="text-xs text-slate-500">Currently issued</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center ml-4">
                  <Book className="h-7 w-7 text-indigo-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm card-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-2">New notifications</p>
                  <p className="text-4xl font-bold text-slate-900 mb-1">{unreadCount}</p>
                  <p className="text-xs text-slate-500">Unread messages</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center ml-4">
                  <Bell className="h-7 w-7 text-amber-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm card-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-2">Library stores</p>
                  <p className="text-4xl font-bold text-slate-900 mb-1">{stores.length}</p>
                  <p className="text-xs text-slate-500">Available near you</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-green-100 flex items-center justify-center ml-4">
                  <Store className="h-7 w-7 text-green-600" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Tabs - Natural spacing */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8">
            <div className="border-b border-slate-200">
              <nav className="flex space-x-6 px-6" aria-label="Tabs">
                {[
                  { id: 'books', label: 'Browse Books', icon: BookOpen },
                  { id: 'my-issues', label: 'My Issues', icon: Book },
                  { id: 'notifications', label: 'Notifications', icon: Bell }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                        activeTab === tab.id
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                      {tab.id === 'notifications' && unreadCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {/* Books Tab */}
              {activeTab === 'books' && (
                <div>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search books, authors, categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                      <option value="">All Stores</option>
                      {stores.map((store) => (
                        <option key={store._id} value={store._id}>
                          {store.storeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                  ) : books.length === 0 ? (
                    <div className="text-center py-12">
                      <img
                        src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0ea?auto=format&fit=crop&w=400&q=80"
                        alt="No books"
                        className="w-64 h-64 mx-auto mb-6 rounded-2xl object-cover"
                      />
                      <p className="text-slate-600 text-lg mb-2">No books found</p>
                      <p className="text-slate-500">Try adjusting your search or browse all stores</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {books.map((book) => (
                        <motion.div
                          key={book._id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover"
                        >
                          {book.bookImage ? (
                            <img
                              src={book.bookImage}
                              alt={book.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                          ) : (
                            <img
                              src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80"
                              alt="Book cover placeholder"
                              className="w-full h-48 object-cover"
                            />
                          )}
                          <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{book.title}</h3>
                            <p className="text-slate-600 mb-1">By {book.author}</p>
                            <p className="text-sm text-slate-500 mb-4">{book.category}</p>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm text-slate-600">
                                {book.storeId?.storeName}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                book.storeId?.isOpenToday
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {book.storeId?.isOpenToday ? 'Open' : 'Closed'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm text-slate-600">
                                Available: {book.availableCopies}/{book.totalCopies}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedBook(book);
                                setShowIssueModal(true);
                              }}
                              disabled={book.availableCopies === 0 || !book.storeId?.isOpenToday}
                              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-xl hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {book.availableCopies === 0 ? 'Not Available' : 'Issue Book'}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* My Issues Tab */}
              {activeTab === 'my-issues' && (
                <div>
                  {myIssues.length === 0 ? (
                    <div className="text-center py-12">
                      <img
                        src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0ea?auto=format&fit=crop&w=400&q=80"
                        alt="No books issued"
                        className="w-64 h-64 mx-auto mb-6 rounded-2xl object-cover"
                      />
                      <p className="text-slate-600 text-lg mb-2">You haven't issued any books yet</p>
                      <p className="text-slate-500">Browse the catalog to find something interesting</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myIssues.map((issue) => (
                        <motion.div
                          key={issue._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-slate-50 rounded-xl p-6 border border-slate-200"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                                {issue.bookId?.title}
                              </h3>
                              <p className="text-slate-600 text-sm mb-2">By {issue.bookId?.author}</p>
                              <p className="text-slate-500 text-sm">{issue.storeId?.storeName}</p>
                            </div>
                            {getStatusBadge(issue.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Issue Date</p>
                              <p className="text-sm font-medium text-slate-900">
                                {new Date(issue.issueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Due Date</p>
                              <p className="text-sm font-medium text-slate-900">
                                {new Date(issue.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {issue.fine > 0 && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm font-semibold text-red-800">
                                Fine: ₹{issue.fine}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  {notifications.length === 0 ? (
                    <div className="text-center py-12">
                      <img
                        src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0ea?auto=format&fit=crop&w=400&q=80"
                        alt="No notifications"
                        className="w-64 h-64 mx-auto mb-6 rounded-2xl object-cover"
                      />
                      <p className="text-slate-600 text-lg mb-2">No notifications yet</p>
                      <p className="text-slate-500">We'll let you know when something important happens</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notif) => (
                        <motion.div
                          key={notif._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => !notif.isRead && markNotificationRead(notif._id)}
                          className={`p-4 rounded-xl border cursor-pointer transition ${
                            !notif.isRead
                              ? 'bg-indigo-50 border-indigo-200'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <p className="text-slate-900 mb-1">{notif.message}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Issue Book Modal */}
      <Modal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title="Issue Book"
      >
        {selectedBook && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{selectedBook.title}</h3>
              <p className="text-slate-600">By {selectedBook.author}</p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Number of Days
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={issueDays}
                onChange={(e) => setIssueDays(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowIssueModal(false)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueBook}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium"
              >
                Confirm Issue
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
