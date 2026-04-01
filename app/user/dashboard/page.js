'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  BookOpen, Search, Bell, Book, Store,
  CheckCircle, XCircle, Loader2, MapPin,
  Sparkles, Navigation, Star, Globe
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

// Dynamically import MapView — prevents SSR / Leaflet window errors
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStatusBadge(status) {
  const config = {
    ISSUED:   { color: 'bg-blue-100 text-blue-800',   Icon: Book },
    OVERDUE:  { color: 'bg-red-100 text-red-800',     Icon: XCircle },
    RETURNED: { color: 'bg-green-100 text-green-800', Icon: CheckCircle },
  };
  const { color, Icon } = config[status] || config.ISSUED;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />{status}
    </span>
  );
}

// ── BookCard ──────────────────────────────────────────────────────────────────
function BookCard({ book, onIssue, badge }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover relative"
    >
      {badge && (
        <div className="absolute top-3 left-3 z-10 bg-indigo-600 text-white text-xs font-semibold
          px-2.5 py-1 rounded-full flex items-center gap-1">
          {badge}
        </div>
      )}
      <img
        src={book.bookImage || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80'}
        alt={book.title}
        className="w-full h-44 object-cover"
        onError={(e) => {
          e.target.src = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80';
        }}
      />
      <div className="p-5">
        <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{book.title}</h3>
        <p className="text-sm text-slate-600 mb-0.5">By {book.author}</p>
        <p className="text-xs text-slate-400 mb-3">{book.category}</p>
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-slate-600 flex items-center gap-1">
            <Store className="h-3 w-3" />
            {book.storeId?.storeName || '—'}
          </span>
          <span className={`px-2 py-0.5 rounded-full font-medium ${
            book.storeId?.isOpenToday ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {book.storeId?.isOpenToday ? 'Open' : 'Closed'}
          </span>
        </div>
        {book.relevanceScore !== undefined && (
          <p className="text-xs text-indigo-500 mb-2 flex items-center gap-1">
            <Star className="h-3 w-3" />
            {Math.round(book.relevanceScore * 100)}% match
          </p>
        )}
        <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
          <span>Copies: {book.availableCopies}/{book.totalCopies}</span>
          <span className={book.availableCopies > 0 ? 'text-green-600 font-medium' : 'text-red-500'}>
            {book.availableCopies > 0 ? `${book.availableCopies} avail.` : 'Unavailable'}
          </span>
        </div>
        <button
          onClick={() => onIssue(book)}
          disabled={book.availableCopies === 0 || !book.storeId?.isOpenToday}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-xl font-medium
            hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {book.availableCopies === 0 ? 'Unavailable' : 'Issue Book'}
        </button>
      </div>
    </motion.div>
  );
}

// ── Nearby Store Card ─────────────────────────────────────────────────────────
function NearbyStoreCard({ store, onViewBooks }) {
  const isReal = store.isReal === true;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-4 bg-slate-50
        rounded-xl border border-slate-200 hover:bg-white transition group"
    >
      <div className="flex items-start gap-3">
        {/* Icon — amber for DB stores, green for real libraries */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg
          ${isReal ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {isReal ? '🏛️' : '🏪'}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-slate-900">{store.storeName}</p>
            {/* Source badge */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isReal
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isReal ? 'Public Library' : 'Library Store'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {[store.address, store.city].filter(Boolean).join(', ')}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
            {!isReal && (
              <span className={store.isOpenToday ? 'text-green-600' : 'text-red-500'}>
                {store.isOpenToday ? '● Open' : '● Closed'}
              </span>
            )}
            {store.bookCount != null && (
              <span className="text-indigo-600">{store.bookCount} books available</span>
            )}
            {store.website && (
              <a
                href={store.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:underline flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-4 space-y-1.5">
        {store.distanceKm != null && (
          <span className="inline-flex items-center gap-1 px-3 py-1
            bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
            <MapPin className="h-3 w-3" />
            {store.distanceKm} km
          </span>
        )}
        {!isReal && (
          <button
            onClick={() => onViewBooks(store)}
            className="block text-xs text-indigo-600 hover:underline"
          >
            View books →
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Map Legend ────────────────────────────────────────────────────────────────
function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-white border border-slate-200 rounded-xl
      text-xs text-slate-600 mb-4">
      <span className="font-medium text-slate-700">Map Legend:</span>
      <span className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-amber-400 border-2 border-white shadow text-xs
          flex items-center justify-center">🏪</span>
        Library Store (platform)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-emerald-400 border-2 border-white shadow text-xs
          flex items-center justify-center">🏛️</span>
        Public Library (OSM)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow"></span>
        You
      </span>
    </div>
  );
}

// ── Root export with Suspense (required for useSearchParams) ──────────────────
export default function UserDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <UserDashboardInner />
    </Suspense>
  );
}

// ── Inner dashboard component ─────────────────────────────────────────────────
function UserDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser]               = useState(null);
  const [stores, setStores]           = useState([]);
  const [books, setBooks]             = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab]     = useState(searchParams.get('tab') || 'books');
  const [searchTerm, setSearchTerm]   = useState(searchParams.get('search') || '');
  const [selectedStore, setSelectedStore] = useState('');
  const [myIssues, setMyIssues]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBook, setSelectedBook]    = useState(null);
  const [issueDays, setIssueDays]     = useState('14');
  const [toasts, setToasts]           = useState([]);
  const [searchMode, setSearchMode]   = useState('regex');
  const [searchLoading, setSearchLoading] = useState(false);

  // Map / Nearby state
  const [userLocation, setUserLocation]   = useState(null);
  const [nearbyStores, setNearbyStores]   = useState([]);
  const [mapLoading, setMapLoading]       = useState(false);
  const [locationError, setLocationError] = useState('');
  const [nearbyFilter, setNearbyFilter]   = useState('all'); // 'all' | 'db' | 'real'

  // Recommendations
  const [recommendations, setRecommendations] = useState([]);
  const [recoLoading, setRecoLoading] = useState(false);
  const [recoMode, setRecoMode]       = useState('');

  const addToast = useCallback((type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message, autoClose: true, duration: 3000 }]);
  }, []);
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) { router.push('/user/login'); return; }
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch { router.push('/user/login'); }
  };

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/user/stores', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setStores(data.stores || []);
    } catch (err) { console.error('Fetch stores:', err); }
  };

  const fetchBooks = async () => {
    setLoading(true);
    setSearchLoading(true);
    try {
      if (searchTerm && searchMode === 'semantic') {
        const params = new URLSearchParams({ q: searchTerm });
        if (selectedStore) params.set('storeId', selectedStore);
        const res = await fetch(`/api/books/search?${params}`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) setBooks(data.books || []);
      } else {
        let url = '/api/user/books';
        const params = new URLSearchParams();
        if (searchTerm)   params.append('search', searchTerm);
        if (selectedStore) params.append('storeId', selectedStore);
        if (params.toString()) url += '?' + params.toString();
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) setBooks(data.books || []);
      }
    } catch (err) { console.error('Fetch books:', err); }
    finally { setLoading(false); setSearchLoading(false); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) { setNotifications(data.notifications || []); setUnreadCount(data.unreadCount || 0); }
    } catch (err) { console.error('Fetch notifs:', err); }
  };

  const fetchMyIssues = async () => {
    try {
      const res = await fetch('/api/user/my-issues', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setMyIssues(data.issues || []);
    } catch (err) { console.error('Fetch issues:', err); }
  };

  const fetchRecommendations = async () => {
    setRecoLoading(true);
    try {
      const res = await fetch('/api/books/recommendations', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) { setRecommendations(data.recommendations || []); setRecoMode(data.mode); }
    } catch (err) { console.error('Fetch reco:', err); }
    finally { setRecoLoading(false); }
  };

  const fetchNearbyStores = async (lat, lng) => {
    setMapLoading(true);
    try {
      // The /api/stores/nearby endpoint now merges DB + Overpass internally
      const res = await fetch(`/api/stores/nearby?lat=${lat}&lng=${lng}&maxDistance=25000`);
      const data = await res.json();
      if (res.ok) {
        setNearbyStores(data.stores || []);
      }
    } catch (err) { console.error('Fetch nearby:', err); }
    finally { setMapLoading(false); }
  };

  // ── Location ──────────────────────────────────────────────────────────────
  const requestLocation = () => {
    setLocationError('');
    setMapLoading(true);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setMapLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        fetchNearbyStores(coords.lat, coords.lng);
      },
      (err) => {
        setLocationError(`Could not get your location: ${err.message}`);
        setMapLoading(false);
      }
    );
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUserData();
    fetchStores();
    fetchBooks();
    fetchNotifications();
    fetchMyIssues();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchBooks(); }, [searchTerm, selectedStore, searchMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'recommendations') fetchRecommendations();
    if (activeTab === 'nearby' && !userLocation) requestLocation();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Issue book ────────────────────────────────────────────────────────────
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
        addToast('success', 'Book issued! Waiting for store confirmation.');
        setShowIssueModal(false);
        fetchBooks(); fetchMyIssues(); fetchNotifications();
      } else {
        addToast('error', data.error || 'Failed to issue book');
      }
    } catch { addToast('error', 'Something went wrong'); }
  };

  const markNotificationRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationId: id, isRead: true })
      });
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  const openIssueModal = (book) => { setSelectedBook(book); setShowIssueModal(true); };

  // ── Nearby filter ─────────────────────────────────────────────────────────
  const filteredNearby = nearbyStores.filter((s) => {
    if (nearbyFilter === 'db')   return !s.isReal;
    if (nearbyFilter === 'real') return s.isReal;
    return true;
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const TABS = [
    { id: 'books',           label: 'Browse Books',  icon: BookOpen },
    { id: 'recommendations', label: 'For You',       icon: Sparkles },
    { id: 'nearby',          label: 'Nearby',        icon: MapPin   },
    { id: 'my-issues',       label: 'My Issues',     icon: Book     },
    { id: 'notifications',   label: 'Notifications', icon: Bell     },
  ];

  const dbCount   = nearbyStores.filter((s) => !s.isReal).length;
  const realCount = nearbyStores.filter((s) => s.isReal).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome back, {user.name}</h1>
            <p className="text-slate-600">Discover books, find nearby libraries, and get AI-powered picks.</p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Reading',   value: myIssues.filter(i => i.status === 'ISSUED').length,  icon: Book,   color: 'indigo' },
              { label: 'Overdue',   value: myIssues.filter(i => i.status === 'OVERDUE').length, icon: XCircle, color: 'red'   },
              { label: 'Alerts',    value: unreadCount,                                         icon: Bell,   color: 'amber'  },
              { label: 'Stores',    value: stores.length,                                       icon: Store,  color: 'green'  },
            ].map(({ label, value, icon: Icon, color }, i) => (
              <motion.div key={label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm card-hover"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{label}</p>
                    <p className="text-3xl font-bold text-slate-900">{value}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl bg-${color}-100 flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 text-${color}-600`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tab Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 overflow-x-auto">
              <nav className="flex min-w-max px-4">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} id={`tab-${id}`} onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                      activeTab === id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {id === 'notifications' && unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full leading-none">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">

              {/* ── Browse Books ─────────────────────────────────────────── */}
              {activeTab === 'books' && (
                <div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="flex-1 relative">
                      {searchLoading
                        ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-indigo-400" />
                        : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      }
                      <input id="book-search-input" type="text"
                        placeholder="Search books, authors, categories..."
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl
                          focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                      {[['regex', 'Normal'], ['semantic', '✨ AI Search']].map(([mode, label]) => (
                        <button key={mode} id={`search-mode-${mode}`} onClick={() => setSearchMode(mode)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            searchMode === mode ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                          }`}
                        >{label}</button>
                      ))}
                    </div>
                    <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}
                      className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                      <option value="">All Stores</option>
                      {stores.map((s) => <option key={s._id} value={s._id}>{s.storeName}</option>)}
                    </select>
                  </div>
                  {searchMode === 'semantic' && searchTerm && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-indigo-600
                      bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                      <Sparkles className="h-4 w-4" />
                      AI semantic results for "{searchTerm}"
                    </div>
                  )}
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                  ) : books.length === 0 ? (
                    <div className="text-center py-16">
                      <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">No books found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {books.map((book) => <BookCard key={book._id} book={book} onIssue={openIssueModal} />)}
                    </div>
                  )}
                </div>
              )}

              {/* ── Recommendations ──────────────────────────────────────── */}
              {activeTab === 'recommendations' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {recoMode === 'personalized' ? 'Recommended for You' : 'Popular Books'}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {recoMode === 'personalized' ? 'Based on your reading history' : 'Issue some books to get personalised picks!'}
                      </p>
                    </div>
                  </div>
                  {recoLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="text-center py-16">
                      <Sparkles className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">No recommendations yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {recommendations.map((book, i) => (
                        <BookCard key={book._id} book={book} onIssue={openIssueModal}
                          badge={i === 0 ? <><Star className="h-3 w-3" /> Top Pick</> : null}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Nearby Stores (Hybrid Map) ────────────────────────────── */}
              {activeTab === 'nearby' && (
                <div>
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Libraries Near You</h2>
                      {userLocation && (
                        <p className="text-sm text-slate-500">
                          {nearbyStores.length} found — {dbCount} platform store{dbCount !== 1 ? 's' : ''} · {realCount} public librar{realCount !== 1 ? 'ies' : 'y'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Filter toggle */}
                      {userLocation && nearbyStores.length > 0 && (
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                          {[['all', 'All'], ['db', '🏪 Stores'], ['real', '🏛️ Libraries']].map(([f, label]) => (
                            <button key={f} onClick={() => setNearbyFilter(f)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                nearbyFilter === f ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                              }`}
                            >{label}</button>
                          ))}
                        </div>
                      )}
                      {!userLocation && !mapLoading && (
                        <button id="request-location-btn" onClick={requestLocation}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white
                            rounded-xl hover:bg-indigo-700 transition text-sm font-medium">
                          <Navigation className="h-4 w-4" />Share Location
                        </button>
                      )}
                    </div>
                  </div>

                  {locationError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {locationError}
                    </div>
                  )}

                  {mapLoading ? (
                    <div className="flex items-center justify-center py-16 bg-slate-50 rounded-xl">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">Finding libraries near you…</p>
                      </div>
                    </div>
                  ) : userLocation ? (
                    <>
                      {/* Legend */}
                      <MapLegend />

                      {/* Map */}
                      <div className="rounded-2xl overflow-hidden border border-slate-200 mb-6">
                        <MapView
                          userLocation={userLocation}
                          stores={filteredNearby}
                          height="420px"
                          onStoreClick={(store) => {
                            if (!store.isReal) {
                              setSelectedStore(store._id);
                              setActiveTab('books');
                            }
                          }}
                        />
                      </div>

                      {/* Store list */}
                      {filteredNearby.length > 0 ? (
                        <div className="space-y-3">
                          {filteredNearby.map((store) => (
                            <NearbyStoreCard key={store._id} store={store}
                              onViewBooks={(s) => {
                                if (!s.isReal) {
                                  setSelectedStore(s._id);
                                  setActiveTab('books');
                                }
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-slate-500">
                          No libraries found for the selected filter.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <MapPin className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600 font-medium mb-1">Location access required</p>
                      <p className="text-slate-400 text-sm mb-6">
                        Allow location access to discover platform stores and real public libraries nearby
                      </p>
                      <button onClick={requestLocation}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl
                          hover:bg-indigo-700 transition text-sm font-medium inline-flex items-center gap-2">
                        <Navigation className="h-4 w-4" />Get My Location
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── My Issues ─────────────────────────────────────────────── */}
              {activeTab === 'my-issues' && (
                <div>
                  {myIssues.length === 0 ? (
                    <div className="text-center py-16">
                      <Book className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">No books issued yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myIssues.map((issue) => (
                        <motion.div key={issue._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-slate-900">{issue.bookId?.title}</h3>
                              <p className="text-sm text-slate-600">By {issue.bookId?.author}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{issue.storeId?.storeName}</p>
                            </div>
                            {getStatusBadge(issue.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-sm">
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Issued</p>
                              <p className="font-medium">{new Date(issue.issueDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Due</p>
                              <p className="font-medium">{new Date(issue.dueDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {issue.fine > 0 && (
                            <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm font-semibold text-red-700">Fine: ₹{issue.fine}</p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Notifications ─────────────────────────────────────────── */}
              {activeTab === 'notifications' && (
                <div>
                  {notifications.length === 0 ? (
                    <div className="text-center py-16">
                      <Bell className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notif) => (
                        <motion.div key={notif._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          onClick={() => !notif.isRead && markNotificationRead(notif._id)}
                          className={`p-4 rounded-xl border cursor-pointer transition ${
                            !notif.isRead ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
                          }`}
                        >
                          <p className="text-slate-900 text-sm">{notif.message}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
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

      {/* Issue Modal */}
      <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)} title="Issue Book">
        {selectedBook && (
          <div>
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">{selectedBook.title}</h3>
              <p className="text-slate-600 text-sm">By {selectedBook.author}</p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">Number of Days (1–30)</label>
              <input type="number" min="1" max="30" value={issueDays}
                onChange={(e) => setIssueDays(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl
                  focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowIssueModal(false)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition font-medium">
                Cancel
              </button>
              <button id="confirm-issue-btn" onClick={handleIssueBook}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">
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
