'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Users, Store, BookOpen, AlertTriangle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [issues, setIssues] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionType, setActionType] = useState('');
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const addToast = (type, message) => {
    const id = Date.now();
    setToasts([...toasts, { id, type, message, autoClose: true, duration: 3000 }]);
  };

  const removeToast = (id) => {
    setToasts(toasts.filter(t => t.id !== id));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users' || activeTab === 'overview') {
        const usersRes = await fetch('/api/admin/users', { credentials: 'include' });
        const usersData = await usersRes.json();
        if (usersRes.ok) {
          setUsers(usersData.users || []);
        } else if (usersRes.status === 401) {
          router.push('/admin/login');
        }
      }
      if (activeTab === 'stores' || activeTab === 'overview') {
        const storesRes = await fetch('/api/admin/stores', { credentials: 'include' });
        const storesData = await storesRes.json();
        if (storesRes.ok) {
          setStores(storesData.stores || []);
        } else if (storesRes.status === 401) {
          router.push('/admin/login');
        }
      }
      if (activeTab === 'issues' || activeTab === 'overview') {
        const issuesRes = await fetch('/api/admin/issues', { credentials: 'include' });
        const issuesData = await issuesRes.json();
        if (issuesRes.ok) {
          setIssues(issuesData.issues || []);
          setOverdue(issuesData.overdue || []);
          setStats(issuesData.stats || {});
        } else if (issuesRes.status === 401) {
          router.push('/admin/login');
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId, isBlocked) => {
    setSelectedItem({ id: userId, type: 'user', isBlocked });
    setActionType(isBlocked ? 'unblock' : 'block');
    setShowBlockModal(true);
  };

  const handleBlockStore = async (storeId, isBlocked) => {
    setSelectedItem({ id: storeId, type: 'store', isBlocked });
    setActionType(isBlocked ? 'unblock' : 'block');
    setShowBlockModal(true);
  };

  const confirmBlockAction = async () => {
    if (!selectedItem) return;

    try {
      const endpoint = selectedItem.type === 'user' ? '/api/admin/users' : '/api/admin/stores';
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          [selectedItem.type === 'user' ? 'userId' : 'storeId']: selectedItem.id,
          isBlocked: !selectedItem.isBlocked
        })
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', data.message || 'Action completed successfully');
        setShowBlockModal(false);
        fetchData();
      } else {
        addToast('error', data.error || 'Failed to complete action');
      }
    } catch (err) {
      addToast('error', 'Something went wrong');
    }
  };

  if (loading && activeTab === 'overview') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">System overview</h1>
                <p className="text-slate-600 mt-1">Manage users, stores, and monitor system activity</p>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8">
            <div className="border-b border-slate-200">
              <nav className="flex space-x-6 px-6">
                {[
                  { id: 'overview', label: 'Overview', icon: Shield },
                  { id: 'users', label: 'Users', icon: Users },
                  { id: 'stores', label: 'Stores', icon: Store },
                  { id: 'issues', label: 'Issues', icon: BookOpen }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600'
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
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <>
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-slate-500 mb-2">Total users</p>
                              <p className="text-4xl font-bold text-slate-900">{users.length}</p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                              <Users className="h-7 w-7 text-indigo-600" />
                            </div>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-slate-500 mb-2">Total stores</p>
                              <p className="text-4xl font-bold text-slate-900">{stores.length}</p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-green-100 flex items-center justify-center">
                              <Store className="h-7 w-7 text-green-600" />
                            </div>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-slate-500 mb-2">Total issues</p>
                              <p className="text-4xl font-bold text-slate-900">{stats.total || 0}</p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                              <BookOpen className="h-7 w-7 text-blue-600" />
                            </div>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-slate-500 mb-2">Overdue books</p>
                              <p className="text-4xl font-bold text-red-600">{stats.overdue || 0}</p>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center">
                              <AlertTriangle className="h-7 w-7 text-red-600" />
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Overdue Books */}
                      {overdue.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                          <h2 className="text-2xl font-bold text-slate-900 mb-6">Overdue books</h2>
                          <div className="space-y-3">
                            {overdue.slice(0, 5).map((issue) => (
                              <motion.div
                                key={issue._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-red-50 border border-red-200 rounded-xl p-4"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 mb-1">{issue.bookId?.title}</h3>
                                    <p className="text-sm text-slate-600 mb-1">User: {issue.userId?.name}</p>
                                    <p className="text-sm text-slate-600">Store: {issue.storeId?.storeName}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-red-800">Fine: ₹{issue.fine || 0}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Due: {new Date(issue.dueDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">All users</h2>
                        <p className="text-slate-600 mt-1">Manage user accounts and permissions</p>
                      </div>

                      {users.length === 0 ? (
                        <div className="text-center py-16">
                          <img
                            src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0ea?auto=format&fit=crop&w=400&q=80"
                            alt="No users"
                            className="w-64 h-64 mx-auto mb-6 rounded-2xl object-cover"
                          />
                          <p className="text-slate-600 text-lg mb-2">No users found</p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Name</th>
                                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Email</th>
                                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Username</th>
                                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Role</th>
                                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
                                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {users.map((user) => (
                                  <tr key={user._id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 text-sm text-slate-900">{user.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{user.username}</td>
                                    <td className="px-6 py-4">
                                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                        {user.role}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      {user.isBlocked ? (
                                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          <XCircle className="h-3 w-3" />
                                          <span>Blocked</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <CheckCircle className="h-3 w-3" />
                                          <span>Active</span>
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4">
                                      <button
                                        onClick={() => handleBlockUser(user._id, user.isBlocked)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                                          user.isBlocked
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                      >
                                        {user.isBlocked ? 'Unblock' : 'Block'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'stores' && (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">All stores</h2>
                        <p className="text-slate-600 mt-1">Manage library stores and their owners</p>
                      </div>

                      {stores.length === 0 ? (
                        <div className="text-center py-16">
                          <img
                            src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0ea?auto=format&fit=crop&w=400&q=80"
                            alt="No stores"
                            className="w-64 h-64 mx-auto mb-6 rounded-2xl object-cover"
                          />
                          <p className="text-slate-600 text-lg mb-2">No stores found</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {stores.map((store) => (
                            <motion.div
                              key={store._id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-white rounded-xl border border-slate-200 p-6 card-hover"
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{store.storeName}</h3>
                                  <p className="text-slate-600 text-sm mb-1">{store.address}, {store.city}</p>
                                  <p className="text-slate-500 text-sm">Owner: {store.ownerId?.name}</p>
                                </div>
                                {store.ownerId?.isBlocked ? (
                                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XCircle className="h-3 w-3" />
                                    <span>Blocked</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Active</span>
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleBlockStore(store._id, store.ownerId?.isBlocked)}
                                className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                                  store.ownerId?.isBlocked
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                              >
                                {store.ownerId?.isBlocked ? 'Unblock Store' : 'Block Store'}
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'issues' && (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">All issues</h2>
                        <p className="text-slate-600 mt-1">Monitor all book issues across the system</p>
                      </div>

                      {issues.length === 0 ? (
                        <div className="text-center py-16">
                          <img
                            src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0ea?auto=format&fit=crop&w=400&q=80"
                            alt="No issues"
                            className="w-64 h-64 mx-auto mb-6 rounded-2xl object-cover"
                          />
                          <p className="text-slate-600 text-lg mb-2">No issues found</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {issues.map((issue) => (
                            <motion.div
                              key={issue._id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`rounded-xl p-6 border ${
                                issue.status === 'OVERDUE'
                                  ? 'bg-red-50 border-red-200'
                                  : issue.status === 'RETURNED'
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{issue.bookId?.title}</h3>
                                  <p className="text-slate-600 text-sm mb-2">By {issue.bookId?.author}</p>
                                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                                    <span>User: {issue.userId?.name}</span>
                                    <span>Store: {issue.storeId?.storeName}</span>
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  issue.status === 'OVERDUE'
                                    ? 'bg-red-100 text-red-800'
                                    : issue.status === 'RETURNED'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {issue.status}
                                </span>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
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
                                <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                                  <p className="text-sm font-semibold text-red-800">Fine: ₹{issue.fine}</p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Block/Unblock Modal */}
      <Modal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        title={actionType === 'block' ? 'Confirm Block' : 'Confirm Unblock'}
      >
        {selectedItem && (
          <div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to {actionType} this {selectedItem.type}? 
              {actionType === 'block' && ' This action will prevent them from accessing the system.'}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmBlockAction}
                className={`flex-1 px-4 py-3 rounded-xl text-white transition font-medium ${
                  actionType === 'block'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionType === 'block' ? 'Block' : 'Unblock'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
