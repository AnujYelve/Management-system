'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Store, BookOpen, Clock, MapPin, Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

export default function StoreDashboard() {
  const router = useRouter();
  const [store, setStore] = useState(null);
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [activeTab, setActiveTab] = useState('books');
  const [loading, setLoading] = useState(true);
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueAction, setIssueAction] = useState('');
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category: '',
    ISBN: '',
    totalCopies: '',
    description: ''
  });
  const [bookImageFile, setBookImageFile] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    fetchStore();
    fetchBooks();
    fetchIssues();
  }, []);

  const addToast = (type, message) => {
    const id = Date.now();
    setToasts([...toasts, { id, type, message, autoClose: true, duration: 3000 }]);
  };

  const removeToast = (id) => {
    setToasts(toasts.filter(t => t.id !== id));
  };

  const fetchStore = async () => {
    try {
      const res = await fetch('/api/store/my-store', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setStore(data.store);
        setShowStoreForm(false);
      } else if (res.status === 404) {
        setShowStoreForm(true);
      } else if (res.status === 401) {
        router.push('/store/login');
      }
    } catch (err) {
      console.error('Error fetching store:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/store/books', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setBooks(data.books || []);
    } catch (err) {
      console.error('Error fetching books:', err);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await fetch('/api/store/issues', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setIssues(data.issues || []);
    } catch (err) {
      console.error('Error fetching issues:', err);
    }
  };

  const handleStoreRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const uploadData = new FormData();
    uploadData.append('storeName', formData.get('storeName'));
    uploadData.append('address', formData.get('address'));
    uploadData.append('city', formData.get('city'));
    uploadData.append('timings', formData.get('timings') || '9:00 AM - 6:00 PM');
    uploadData.append('isOpenToday', formData.get('isOpenToday') === 'on' ? 'true' : 'false');
    
    const imageFile = formData.get('storeImage');
    if (imageFile && imageFile.size > 0) {
      uploadData.append('storeImage', imageFile);
    }

    try {
      const res = await fetch('/api/store/register', {
        method: 'POST',
        credentials: 'include',
        body: uploadData
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Store registered successfully!');
        fetchStore();
      } else {
        addToast('error', data.error || 'Failed to register store');
      }
    } catch (err) {
      addToast('error', 'Something went wrong');
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', bookForm.title);
    formData.append('author', bookForm.author);
    formData.append('category', bookForm.category);
    formData.append('ISBN', bookForm.ISBN);
    formData.append('totalCopies', bookForm.totalCopies);
    formData.append('description', bookForm.description || '');
    
    if (bookImageFile) {
      formData.append('bookImage', bookImageFile);
    }

    try {
      const res = await fetch('/api/store/books', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Book added successfully!');
        setShowBookForm(false);
        setBookForm({ title: '', author: '', category: '', ISBN: '', totalCopies: '', description: '' });
        setBookImageFile(null);
        fetchBooks();
      } else {
        addToast('error', data.error || 'Failed to add book');
      }
    } catch (err) {
      addToast('error', 'Something went wrong');
    }
  };

  const handleConfirmIssue = async (issueId, action) => {
    setSelectedIssue(issues.find(i => i._id === issueId));
    setIssueAction(action);
    setShowIssueModal(true);
  };

  const confirmIssueAction = async () => {
    if (!selectedIssue) return;

    try {
      const res = await fetch(`/api/store/issues/${selectedIssue._id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: issueAction })
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', data.message || 'Action completed successfully');
        setShowIssueModal(false);
        fetchIssues();
        fetchBooks();
      } else {
        addToast('error', data.error || 'Failed to complete action');
      }
    } catch (err) {
      addToast('error', 'Something went wrong');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!store && showStoreForm ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 md:p-10 max-w-2xl mx-auto"
            >
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Store className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">Register your store</h1>
                    <p className="text-slate-600 mt-1">Get started by setting up your library store</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleStoreRegister} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2.5">Store name</label>
                    <input
                      type="text"
                      name="storeName"
                      required
                      className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                      placeholder="Central Library"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2.5">City</label>
                    <input
                      type="text"
                      name="city"
                      required
                      className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                      placeholder="New York"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2.5">Address</label>
                  <input
                    type="text"
                    name="address"
                    required
                    className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2.5">Store hours</label>
                  <input
                    type="text"
                    name="timings"
                    defaultValue="9:00 AM - 6:00 PM"
                    className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2.5">Store image</label>
                  <input
                    type="file"
                    name="storeImage"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                  />
                  <p className="text-xs text-slate-500 mt-2">JPEG, PNG, or WebP (max 5MB)</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isOpenToday"
                    defaultChecked
                    className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label className="ml-3 text-sm text-slate-700">Store is open today</label>
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white py-3.5 px-4 rounded-xl hover:bg-green-700 transition font-semibold shadow-lg shadow-green-500/30"
                >
                  Register Store
                </button>
              </form>
            </motion.div>
          ) : (
            <>
              {/* Store Overview - Natural layout */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10"
              >
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {store?.storeImage && (
                    <div className="h-48 md:h-64 overflow-hidden">
                      <img
                        src={store.storeImage}
                        alt={store.storeName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-6 md:p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{store?.storeName}</h1>
                        <div className="flex items-center text-slate-600 mb-2">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{store?.address}, {store?.city}</span>
                        </div>
                        <div className="flex items-center text-slate-500 text-sm">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{store?.timings}</span>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        store?.isOpenToday
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {store?.isOpenToday ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Tabs */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8">
                <div className="border-b border-slate-200">
                  <nav className="flex space-x-6 px-6">
                    {[
                      { id: 'books', label: 'Books', icon: BookOpen },
                      { id: 'issues', label: 'Issue Requests', icon: Clock }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                            activeTab === tab.id
                              ? 'border-green-500 text-green-600'
                              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'books' ? (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900">Your books</h2>
                          <p className="text-slate-600 mt-1">Manage your library catalog</p>
                        </div>
                        <button
                          onClick={() => setShowBookForm(!showBookForm)}
                          className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium"
                        >
                          <Plus className="h-5 w-5" />
                          <span>{showBookForm ? 'Cancel' : 'Add Book'}</span>
                        </button>
                      </div>

                      {showBookForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200"
                        >
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Add a new book</h3>
                          <form onSubmit={handleAddBook} className="space-y-5">
                            <div className="grid md:grid-cols-2 gap-5">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2.5">Title</label>
                                <input
                                  type="text"
                                  required
                                  value={bookForm.title}
                                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                                  className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                                  placeholder="Book title"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2.5">Author</label>
                                <input
                                  type="text"
                                  required
                                  value={bookForm.author}
                                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                                  className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                                  placeholder="Author name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2.5">Category</label>
                                <input
                                  type="text"
                                  required
                                  value={bookForm.category}
                                  onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                                  className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                                  placeholder="Fiction, Non-fiction, etc."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2.5">ISBN</label>
                                <input
                                  type="text"
                                  required
                                  value={bookForm.ISBN}
                                  onChange={(e) => setBookForm({ ...bookForm, ISBN: e.target.value })}
                                  className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                                  placeholder="978-0-123456-78-9"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2.5">Total copies</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={bookForm.totalCopies}
                                  onChange={(e) => setBookForm({ ...bookForm, totalCopies: e.target.value })}
                                  className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                                  placeholder="5"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2.5">Book cover image</label>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png,image/webp"
                                  onChange={(e) => setBookImageFile(e.target.files[0])}
                                  className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                                />
                                <p className="text-xs text-slate-500 mt-2">JPEG, PNG, or WebP (max 5MB)</p>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2.5">Description (optional)</label>
                              <textarea
                                value={bookForm.description}
                                onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                                rows="3"
                                className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition bg-white"
                                placeholder="Brief description of the book..."
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full bg-green-600 text-white py-3.5 px-4 rounded-xl hover:bg-green-700 transition font-semibold shadow-lg shadow-green-500/30"
                            >
                              Add Book
                            </button>
                          </form>
                        </motion.div>
                      )}

                      {books.length === 0 ? (
                        <div className="text-center py-16">
                          <img
                            src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0ea?auto=format&fit=crop&w=400&q=80"
                            alt="No books"
                            className="w-64 h-64 mx-auto mb-6 rounded-2xl object-cover"
                          />
                          <p className="text-slate-600 text-lg mb-2">No books here yet</p>
                          <p className="text-slate-500">Add your first book to get started</p>
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
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-600">
                                    Available: {book.availableCopies}/{book.totalCopies}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Issue requests</h2>
                        <p className="text-slate-600 mt-1">Manage book issues and returns</p>
                      </div>

                      {issues.filter(i => i.status === 'ISSUED' || i.status === 'OVERDUE').length === 0 && issues.filter(i => i.status === 'RETURNED').length === 0 ? (
                        <div className="text-center py-16">
                          <img
                            src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0ea?auto=format&fit=crop&w=400&q=80"
                            alt="No issues"
                            className="w-64 h-64 mx-auto mb-6 rounded-2xl object-cover"
                          />
                          <p className="text-slate-600 text-lg mb-2">No issue requests yet</p>
                          <p className="text-slate-500">When users request books, they'll appear here</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {issues.filter(i => i.status === 'ISSUED' || i.status === 'OVERDUE').map((issue) => (
                            <motion.div
                              key={issue._id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="bg-white rounded-xl p-6 border border-slate-200"
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{issue.bookId?.title}</h3>
                                  <p className="text-slate-600 text-sm mb-2">By {issue.bookId?.author}</p>
                                  <p className="text-slate-500 text-sm">Requested by: {issue.userId?.name}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  issue.status === 'OVERDUE'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {issue.status}
                                </span>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-slate-200">
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Issue date</p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {new Date(issue.issueDate).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Due date</p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {new Date(issue.dueDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              {issue.fine > 0 && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-sm font-semibold text-red-800">Fine: ₹{issue.fine}</p>
                                </div>
                              )}
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleConfirmIssue(issue._id, 'issue')}
                                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium flex items-center justify-center space-x-2"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Confirm Issue</span>
                                </button>
                                <button
                                  onClick={() => handleConfirmIssue(issue._id, 'return')}
                                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center justify-center space-x-2"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Confirm Return</span>
                                </button>
                              </div>
                            </motion.div>
                          ))}
                          {issues.filter(i => i.status === 'RETURNED').map((issue) => (
                            <motion.div
                              key={issue._id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="bg-slate-50 rounded-xl p-6 border border-slate-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{issue.bookId?.title}</h3>
                                  <p className="text-slate-500 text-sm">Returned by: {issue.userId?.name}</p>
                                  <p className="text-slate-500 text-sm">Returned: {new Date(issue.returnDate).toLocaleDateString()}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Returned
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Issue Confirmation Modal */}
      <Modal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title={issueAction === 'issue' ? 'Confirm Book Issue' : 'Confirm Book Return'}
      >
        {selectedIssue && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{selectedIssue.bookId?.title}</h3>
              <p className="text-slate-600">By {selectedIssue.bookId?.author}</p>
              <p className="text-slate-500 text-sm mt-2">User: {selectedIssue.userId?.name}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowIssueModal(false)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmIssueAction}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
