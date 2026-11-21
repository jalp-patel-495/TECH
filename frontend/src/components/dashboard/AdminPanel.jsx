import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  UserX, 
  Gavel, 
  Radio, 
  Clock, 
  Trophy, 
  ListFilter, 
  Tag, 
  Bell, 
  BarChart2, 
  User, 
  Settings, 
  LogOut, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  ExternalLink,
  DollarSign,
  TrendingUp,
  Activity,
  Layers,
  Award,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ProfileSection from './ProfileSection';
import SettingsSection from './SettingsSection';
import NotificationsSection from './NotificationsSection';

const AdminPanel = ({ activeTab, setActiveTab, handleLogout }) => {
  const navigate = useNavigate();

  // Overview data
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Users data
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  // Auctions data
  const [auctions, setAuctions] = useState([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [auctionSearch, setAuctionSearch] = useState('');

  // Bids data (Accepted & Rejected)
  const [bids, setBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidStatusFilter, setBidStatusFilter] = useState('all');

  // Winners data
  const [winners, setWinners] = useState([]);
  const [winnersLoading, setWinnersLoading] = useState(false);

  // Categories data
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);

  // Reports data
  const [reports, setReports] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Feedback messages
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg({ type: '', text: '' }), 5000);
  };

  // 1. Fetch Overview
  const fetchOverview = async () => {
    setOverviewLoading(true);
    try {
      const res = await api.get('/admin/overview');
      if (res.data.success) {
        setOverview(res.data.adminOverview);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOverviewLoading(false);
    }
  };

  // 2. Fetch Users
  const fetchUsers = async (roleOverride) => {
    setUsersLoading(true);
    try {
      const r = roleOverride !== undefined ? roleOverride : userRoleFilter;
      const res = await api.get(`/admin/users?role=${r}&search=${encodeURIComponent(userSearch)}`);
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  // 3. Fetch Auctions
  const fetchAuctions = async (statusOverride) => {
    setAuctionsLoading(true);
    try {
      const s = statusOverride !== undefined ? statusOverride : 'all';
      const res = await api.get(`/admin/auctions?status=${s}&search=${encodeURIComponent(auctionSearch)}`);
      if (res.data.success) {
        setAuctions(res.data.auctions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuctionsLoading(false);
    }
  };

  // 4. Fetch Bids
  const fetchBids = async (statusOverride) => {
    setBidsLoading(true);
    try {
      const s = statusOverride !== undefined ? statusOverride : bidStatusFilter;
      const res = await api.get(`/admin/bids?status=${s}`);
      if (res.data.success) {
        setBids(res.data.bids);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBidsLoading(false);
    }
  };

  // 5. Fetch Winners
  const fetchWinners = async () => {
    setWinnersLoading(true);
    try {
      const res = await api.get('/admin/winners');
      if (res.data.success) {
        setWinners(res.data.winners);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWinnersLoading(false);
    }
  };

  // 6. Fetch Categories
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // 7. Fetch Reports
  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await api.get('/admin/reports');
      if (res.data.success) {
        setReports(res.data.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  // Effect to load relevant tab data on tab switch
  useEffect(() => {
    if (activeTab === 'dashboard') fetchOverview();
    if (activeTab === 'manage-users') { setUserRoleFilter('all'); fetchUsers('all'); }
    if (activeTab === 'manage-buyers') { setUserRoleFilter('buyer'); fetchUsers('buyer'); }
    if (activeTab === 'manage-sellers') { setUserRoleFilter('seller'); fetchUsers('seller'); }
    if (activeTab === 'all-auctions') fetchAuctions('all');
    if (activeTab === 'live-auctions') fetchAuctions('live');
    if (activeTab === 'upcoming-auctions') fetchAuctions('upcoming');
    if (activeTab === 'completed-auctions') fetchAuctions('completed');
    if (activeTab === 'bid-history') fetchBids();
    if (activeTab === 'winner-management') fetchWinners();
    if (activeTab === 'categories') fetchCategories();
    if (activeTab === 'reports') fetchReports();
  }, [activeTab]);

  // Activate / Deactivate User
  const handleToggleUserStatus = async (userObj) => {
    try {
      const nextStatus = !userObj.is_active;
      const res = await api.put(`/admin/users/${userObj.id}/status`, { isActive: nextStatus });
      if (res.data.success) {
        showAlert('success', res.data.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === userObj.id ? { ...u, is_active: nextStatus } : u))
        );
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to update user status.');
    }
  };

  // Create Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await api.post('/admin/categories', {
        name: newCatName.trim(),
        description: newCatDesc.trim(),
      });
      if (res.data.success) {
        showAlert('success', 'New category created successfully!');
        setNewCatName('');
        setNewCatDesc('');
        fetchCategories();
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to create category.');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await api.delete(`/admin/categories/${id}`);
      if (res.data.success) {
        showAlert('success', res.data.message);
        setCategories((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alertMsg.text && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
          alertMsg.type === 'success'
            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {alertMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg({ type: '', text: '' })} className="hover:text-white">✕</button>
        </div>
      )}

      {/* 1. DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-3xl font-black text-white font-mono">{overview?.userMetrics?.totalUsers || 0}</p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                <span className="text-rose-400">{overview?.userMetrics?.admins || 0} Admins</span> • 
                <span className="text-emerald-400">{overview?.userMetrics?.sellers || 0} Sellers</span> • 
                <span className="text-blue-400">{overview?.userMetrics?.buyers || 0} Buyers</span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Active Auctions</span>
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <p className="text-3xl font-black text-emerald-400 font-mono">{overview?.auctionMetrics?.activeAuctions || 0}</p>
              <p className="text-[11px] text-slate-400">{overview?.auctionMetrics?.upcomingAuctions || 0} Upcoming lots queued</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Gross Platform Volume</span>
                <DollarSign className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-3xl font-black text-cyan-400 font-mono">${overview?.auctionMetrics?.totalVolume || '0.00'}</p>
              <p className="text-[11px] text-slate-400">${overview?.auctionMetrics?.totalSales || '0.00'} Concluded Sales</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Live Bids</span>
                <Gavel className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl font-black text-amber-400 font-mono">{overview?.bidMetrics?.totalBids || 0}</p>
              <div className="flex items-center gap-2 pt-1 text-[11px]">
                <span className="text-emerald-400">{overview?.bidMetrics?.acceptedBids || 0} accepted</span> • 
                <span className="text-rose-400">{overview?.bidMetrics?.rejectedBids || 0} rejected</span>
              </div>
            </div>
          </div>

          {/* Infrastructure Health Status */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="font-semibold text-white">System Infrastructure Live</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-300 font-mono">
              <span>PostgreSQL: <strong className="text-emerald-400">Port 5433 (Healthy)</strong></span>
              <span>Redis: <strong className="text-emerald-400">Operational</strong></span>
              <span>Socket.IO: <strong className="text-emerald-400">Active</strong></span>
              <span>Server Uptime: <strong className="text-white">{Math.floor((overview?.infrastructure?.serverUptime || 0) / 60)} min</strong></span>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('manage-users')}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-left transition-all group"
            >
              <Users className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-white">Manage Users</p>
              <p className="text-[11px] text-slate-400">Inspect & toggle account access</p>
            </button>
            <button
              onClick={() => setActiveTab('live-auctions')}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group"
            >
              <Radio className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-white">Monitor Live Bidding</p>
              <p className="text-[11px] text-slate-400">Inspect concurrent active lots</p>
            </button>
            <button
              onClick={() => setActiveTab('bid-history')}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
            >
              <Gavel className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-white">Audit Bids</p>
              <p className="text-[11px] text-slate-400">Review accepted & rejected logs</p>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group"
            >
              <BarChart2 className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-white">Analytics & Reports</p>
              <p className="text-[11px] text-slate-400">Platform performance & volume</p>
            </button>
          </div>
        </div>
      )}

      {/* 2, 3, 4. MANAGE USERS / BUYERS / SELLERS */}
      {(activeTab === 'manage-users' || activeTab === 'manage-buyers' || activeTab === 'manage-sellers') && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                {activeTab === 'manage-buyers' ? 'Manage Buyers' : activeTab === 'manage-sellers' ? 'Manage Sellers' : 'Manage All Registered Users'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect accounts, wallet escrow balances, and toggle active status.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(); }}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => fetchUsers()}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Wallet Balance</th>
                  <th className="py-3 px-4">Activity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500 font-sans">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-medium text-white flex items-center gap-2">
                        <img
                          src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                          alt={u.name}
                          className="w-7 h-7 rounded-lg object-cover border border-slate-700"
                        />
                        <span>{u.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-rose-500/20 text-rose-400' :
                          u.role === 'seller' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">
                        ${parseFloat(u.balance || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-sans text-[11px]">
                        {u.role === 'seller' ? `${u.listings_count || 0} Lots` : `${u.bids_count || 0} Bids`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.is_active !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active !== false ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          {u.is_active !== false ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              u.is_active !== false
                                ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                            }`}
                          >
                            {u.is_active !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5, 6, 7, 8. ALL / LIVE / UPCOMING / COMPLETED AUCTIONS */}
      {(activeTab === 'all-auctions' || activeTab === 'live-auctions' || activeTab === 'upcoming-auctions' || activeTab === 'completed-auctions') && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-blue-400" />
                {activeTab === 'live-auctions' ? 'Live Bidding Auctions' : activeTab === 'upcoming-auctions' ? 'Upcoming Scheduled Auctions' : activeTab === 'completed-auctions' ? 'Concluded / Completed Lots' : 'All Platform Auctions'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Full administrative monitoring of lots across the platform.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search lot..."
                  value={auctionSearch}
                  onChange={(e) => setAuctionSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchAuctions(); }}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => fetchAuctions()}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${auctionsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Lot Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Seller</th>
                  <th className="py-3 px-4">High Bid</th>
                  <th className="py-3 px-4">Bids</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auctions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500 font-sans">
                      No auctions found.
                    </td>
                  </tr>
                ) : (
                  auctions.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-medium text-white flex items-center gap-2.5">
                        <img
                          src={a.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80'}
                          alt={a.title}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                        />
                        <span className="line-clamp-1 max-w-[200px]">{a.title}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-sans">{a.category}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-sans">{a.seller_name}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">${parseFloat(a.current_bid).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-slate-300">{a.total_bids || 0}</td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.computed_status === 'live' ? 'bg-emerald-500/20 text-emerald-400' :
                          a.computed_status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                          a.computed_status === 'completed' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {a.computed_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <Link
                          to={`/auctions/${a.id}`}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          View Lot <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. BID HISTORY (ACCEPTED & REJECTED) */}
      {activeTab === 'bid-history' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-amber-400" />
                Comprehensive Bid History & Audit Log
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every bid submitted to the PostgreSQL engine with accepted/rejected status and rationales.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={bidStatusFilter}
                onChange={(e) => {
                  setBidStatusFilter(e.target.value);
                  fetchBids(e.target.value);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none"
              >
                <option value="all">All Bids</option>
                <option value="accepted">Accepted Only</option>
                <option value="rejected">Rejected Only</option>
              </select>
              <button
                onClick={() => fetchBids()}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${bidsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Auction Lot</th>
                  <th className="py-3 px-4">Bidder</th>
                  <th className="py-3 px-4">Bid Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {bids.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 font-sans">
                      No bid records found.
                    </td>
                  </tr>
                ) : (
                  bids.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-medium text-white max-w-[200px] truncate">
                        {b.auction_title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-sans">
                        {b.bidder_name} ({b.bidder_email})
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        ${parseFloat(b.amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          b.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-400 max-w-[250px] truncate text-[11px]">
                        {b.reason || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 10. WINNER MANAGEMENT */}
      {activeTab === 'winner-management' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Winner Management & Finalized Sales
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Auctions that have officially closed with verified winning bidders and realized purchase prices.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Auction Lot</th>
                  <th className="py-3 px-4">Seller</th>
                  <th className="py-3 px-4">Winner</th>
                  <th className="py-3 px-4">Starting Bid</th>
                  <th className="py-3 px-4">Winning Final Price</th>
                  <th className="py-3 px-4">Concluded Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {winners.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 font-sans">
                      No concluded auctions with winners yet.
                    </td>
                  </tr>
                ) : (
                  winners.map((w) => (
                    <tr key={w.auction_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-medium text-white max-w-[200px] truncate">
                        {w.auction_title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-sans">{w.seller_name}</td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="font-bold text-amber-300">{w.winner_name}</span>
                        <span className="block text-[11px] text-slate-400">{w.winner_email}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">${parseFloat(w.starting_bid).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-black text-sm">
                        ${parseFloat(w.winning_price).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(w.end_time).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="space-y-6 animate-fade-in">
          {/* Create Category Form */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-400" />
              Create Auction Category
            </h3>
            <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Category Name (e.g. Fine Wine & Spirits)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Short Description"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Add Category
              </button>
            </form>
          </div>

          {/* Categories Grid */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Active Categories Directory</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{c.name}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{c.description || 'No description'}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(c.id)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 12. NOTIFICATIONS */}
      {activeTab === 'notifications' && <NotificationsSection />}

      {/* 13. REPORTS & ANALYTICS */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-cyan-400" />
                Platform Intelligence & Reports
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Real-time financial aggregation, category popularity, and top trader rankings.
              </p>
            </div>

            {/* Category Performance Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">Category Volume Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-sans">
                    <tr>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Total Lots</th>
                      <th className="py-2.5 px-4">Total Bids</th>
                      <th className="py-2.5 px-4">Gross Volume ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reports?.categoryPerformance?.map((cp, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-sans font-medium text-white">{cp.category}</td>
                        <td className="py-3 px-4 text-slate-300">{cp.total_auctions}</td>
                        <td className="py-3 px-4 text-blue-400">{cp.total_bids}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">${parseFloat(cp.gross_volume).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Traders Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Top Verified Sellers by Volume
                </h4>
                <div className="space-y-2">
                  {reports?.topSellers?.map((s) => (
                    <div key={s.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{s.name}</p>
                        <p className="text-[10px] text-slate-400">{s.listings_count} lots created</p>
                      </div>
                      <span className="font-bold text-emerald-400 font-mono">${parseFloat(s.sales_volume).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Top Active Buyers by Spend
                </h4>
                <div className="space-y-2">
                  {reports?.topBuyers?.map((b) => (
                    <div key={b.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{b.name}</p>
                        <p className="text-[10px] text-slate-400">{b.won_count} lots won</p>
                      </div>
                      <span className="font-bold text-amber-400 font-mono">${parseFloat(b.spent_volume).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 14. PROFILE */}
      {activeTab === 'profile' && <ProfileSection />}

      {/* 15. SETTINGS */}
      {activeTab === 'settings' && <SettingsSection />}
    </div>
  );
};

export default AdminPanel;
