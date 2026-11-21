import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { 
  ShieldCheck, 
  Layers, 
  Award, 
  Gavel, 
  TrendingUp, 
  Users, 
  Database, 
  Server, 
  Activity, 
  LogOut, 
  PlusCircle, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  Key,
  RefreshCw,
  Eye
} from 'lucide-react';

const DashboardPage = () => {
  const { user, role, token, logout, refreshProfile } = useAuth();
  const { socket, connected, viewerCount } = useSocket();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Bid form state for buyer
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [biddingLoading, setBiddingLoading] = useState(false);

  // RBAC test state
  const [rbacTestResult, setRbacTestResult] = useState(null);

  // Load dashboard based on user role
  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      if (role === 'admin') {
        const res = await api.get('/admin/overview');
        setData(res.data.adminOverview);
      } else if (role === 'seller') {
        const res = await api.get('/users/seller/dashboard');
        setData(res.data.dashboard);
      } else {
        // buyer
        const res = await api.get('/users/buyer/dashboard');
        setData(res.data.dashboard);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.response?.data?.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [role]);

  // Socket listener for real-time bid updates
  useEffect(() => {
    if (!socket) return;

    socket.on('bid_update', (update) => {
      // Reload dashboard if bid changes
      loadDashboardData();
    });

    return () => {
      socket.off('bid_update');
    };
  }, [socket]);

  // Handle Placing a Real-time Bid
  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!selectedAuction || !bidAmount) return;

    setBiddingLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.post('/users/bid', {
        auctionId: selectedAuction.id,
        amount: parseFloat(bidAmount),
      });

      if (res.data.success) {
        setSuccessMsg(`Bid of $${bidAmount} accepted successfully!`);
        setSelectedAuction(null);
        setBidAmount('');
        await loadDashboardData();
        await refreshProfile();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place bid.');
    } finally {
      setBiddingLoading(false);
    }
  };

  // Test Role-Based Authorization against Admin Endpoint
  const testAdminAccess = async () => {
    setRbacTestResult({ testing: true, endpoint: '/api/admin/overview' });
    try {
      const res = await api.get('/admin/overview');
      setRbacTestResult({
        success: true,
        status: 200,
        message: `Authorized! Role '${role}' has granted access.`,
      });
    } catch (err) {
      setRbacTestResult({
        success: false,
        status: err.response?.status || 403,
        message: err.response?.data?.message || 'Access Denied: 403 Forbidden.',
      });
    }
  };

  const renderRoleBadge = () => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
          <ShieldCheck className="w-3.5 h-3.5" />
          ADMINISTRATOR
        </span>
      );
    }
    if (role === 'seller') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          <Layers className="w-3.5 h-3.5" />
          VERIFIED SELLER
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
        <Award className="w-3.5 h-3.5" />
        ACTIVE BUYER
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Dashboard Top Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            
            {/* User Greeting */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/20">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Welcome, {user?.name}!
                  </h1>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {renderRoleBadge()}
                <span className="text-xs text-slate-400 font-mono">
                  Wallet Balance: <strong className="text-emerald-400">${parseFloat(user?.balance || 0).toFixed(2)}</strong>
                </span>
              </div>
            </div>

            {/* Architecture Health Status Pill */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span>PostgreSQL: <strong className="text-emerald-400">Port 5433</strong></span>
              </div>
              <div className="hidden sm:block text-slate-600">|</div>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Redis: <strong className="text-emerald-400">Operational</strong></span>
              </div>
              <div className="hidden sm:block text-slate-600">|</div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Socket.IO: <strong className="text-emerald-400">Active</strong></span>
              </div>
            </div>

          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-t border-slate-800/80 pt-6 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Role Workspace
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              RBAC & JWT Security
            </button>
            <button
              onClick={loadDashboardData}
              className="ml-auto p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white text-xs">Dismiss</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white text-xs">Dismiss</button>
          </div>
        )}

        {/* TAB 1: ROLE WORKSPACE */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* 1. ADMIN VIEW */}
            {role === 'admin' && (
              <div className="space-y-8">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <p className="text-xs text-slate-400 font-medium uppercase">Total Registered Users</p>
                    <p className="text-3xl font-black text-white font-mono">{data?.userMetrics?.totalUsers || 0}</p>
                    <p className="text-[11px] text-slate-500">PostgreSQL Users Table</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <p className="text-xs text-slate-400 font-medium uppercase">Active Auctions</p>
                    <p className="text-3xl font-black text-blue-400 font-mono">{data?.auctionMetrics?.activeAuctions || 0}</p>
                    <p className="text-[11px] text-slate-500">Real-Time Bidding Live</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <p className="text-xs text-slate-400 font-medium uppercase">Gross Volume</p>
                    <p className="text-3xl font-black text-emerald-400 font-mono">${data?.auctionMetrics?.totalVolume || '0.00'}</p>
                    <p className="text-[11px] text-slate-500">Cumulative Current Bids</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <p className="text-xs text-slate-400 font-medium uppercase">Roles Breakdown</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-bold">{data?.userMetrics?.admins || 0} Admins</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">{data?.userMetrics?.sellers || 0} Sellers</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-bold">{data?.userMetrics?.buyers || 0} Buyers</span>
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">System User Directory</h3>
                      <p className="text-xs text-slate-400">Direct query from PostgreSQL users database</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                      Role: ADMIN ONLY
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">User</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Escrow Balance</th>
                          <th className="py-3 px-4">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {data?.recentUsers?.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4 font-sans font-medium text-white flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              {u.name}
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
                            <td className="py-3.5 px-4 text-emerald-400">${parseFloat(u.balance || 0).toFixed(2)}</td>
                            <td className="py-3.5 px-4 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SELLER VIEW */}
            {role === 'seller' && (
              <div className="space-y-8">
                {/* Seller Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <p className="text-xs text-slate-400 font-medium uppercase">Total Listings</p>
                    <p className="text-3xl font-black text-white font-mono">{data?.stats?.totalListings || 0}</p>
                    <p className="text-[11px] text-slate-500">Items Cataloged</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <p className="text-xs text-slate-400 font-medium uppercase">Active Auctions</p>
                    <p className="text-3xl font-black text-emerald-400 font-mono">{data?.stats?.activeListings || 0}</p>
                    <p className="text-[11px] text-slate-500">Currently Receiving Bids</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <p className="text-xs text-slate-400 font-medium uppercase">Projected Revenue</p>
                    <p className="text-3xl font-black text-blue-400 font-mono">${data?.stats?.estimatedRevenue || '0.00'}</p>
                    <p className="text-[11px] text-slate-500">Based on highest bids</p>
                  </div>
                </div>

                {/* Seller Listings */}
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Your Listed Lots</h3>
                      <p className="text-xs text-slate-400">Track incoming live bids on your inventory</p>
                    </div>
                  </div>

                  {data?.listings?.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">
                      No active listings found for your seller account.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {data?.listings?.map((item) => (
                        <div key={item.id} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                          <h4 className="font-bold text-white text-sm line-clamp-1">{item.title}</h4>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Current Bid:</span>
                            <span className="font-bold text-emerald-400 font-mono">${parseFloat(item.current_bid).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Total Bids:</span>
                            <span className="font-semibold text-white">{item.bid_count || 0}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold uppercase">{item.status}</span>
                            <span>{new Date(item.end_time).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. BUYER VIEW */}
            {role === 'buyer' && (
              <div className="space-y-8">
                
                {/* Live Auctions To Bid On */}
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                        Live Bidding Floor
                      </h3>
                      <p className="text-xs text-slate-400">Place instantaneous real-time bids with live broadcast</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data?.activeAuctions?.map((auction) => (
                      <div key={auction.id} className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 space-y-4 hover:border-blue-500/40 transition-all flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-medium">{auction.category}</span>
                            <span className="flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3" /> Live</span>
                          </div>
                          <h4 className="font-bold text-white text-base line-clamp-1">{auction.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2">{auction.description}</p>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase">Current High Bid</p>
                              <p className="text-xl font-black text-white font-mono">${parseFloat(auction.current_bid).toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 uppercase">Total Bids</p>
                              <p className="text-xs font-bold text-emerald-400">{auction.total_bids || 1} bids placed</p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedAuction(auction);
                              setBidAmount((parseFloat(auction.current_bid) + 50).toFixed(2));
                            }}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                          >
                            <Gavel className="w-4 h-4" />
                            Place Live Bid
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* My Recent Bids Table */}
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
                  <h3 className="text-lg font-bold text-white">Your Bidding Activity</h3>
                  {data?.myBids?.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      You have not placed any bids yet. Choose an auction above to enter the arena!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-4">Auction Item</th>
                            <th className="py-3 px-4">Your Bid</th>
                            <th className="py-3 px-4">Current High</th>
                            <th className="py-3 px-4">Time Placed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {data?.myBids?.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-800/30">
                              <td className="py-3.5 px-4 font-sans font-medium text-white">{b.auction_title}</td>
                              <td className="py-3.5 px-4 text-blue-400 font-bold">${parseFloat(b.amount).toFixed(2)}</td>
                              <td className="py-3.5 px-4 text-emerald-400">${parseFloat(b.current_bid).toFixed(2)}</td>
                              <td className="py-3.5 px-4 text-slate-400">{new Date(b.created_at).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 2: RBAC & SECURITY VERIFICATION */}
        {activeTab === 'security' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                Role-Based Access Control (RBAC) & Token Diagnostics
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Verify that your JWT token strictly enforces backend role authorization rules.
              </p>
            </div>

            {/* Token details card */}
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Authenticated Identity:</span>
                <span className="text-white font-bold">{user?.name} ({user?.email})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Role:</span>
                <span className="text-blue-400 font-bold uppercase">{role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Algorithm:</span>
                <span className="text-emerald-400 font-bold">HMAC-SHA256 (JWT)</span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">Bearer Token Preview:</span>
                <div className="p-2.5 rounded bg-slate-900 text-slate-300 break-all select-all text-[11px]">
                  {token}
                </div>
              </div>
            </div>

            {/* Live RBAC Probe Action */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white">Live Role Authorization Probe</h4>
              <p className="text-xs text-slate-400">
                Click below to send an authenticated request with your current JWT to <code className="text-blue-400">GET /api/admin/overview</code>. 
                If you are an <strong>Admin</strong>, it will return HTTP 200. If you are a <strong>Buyer</strong> or <strong>Seller</strong>, the backend RBAC middleware will intercept and return HTTP 403 Forbidden!
              </p>

              <button
                onClick={testAdminAccess}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Test Admin Endpoint Access
              </button>

              {rbacTestResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-1 ${
                  rbacTestResult.success 
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                }`}>
                  <p className="font-bold">HTTP Status: {rbacTestResult.status}</p>
                  <p>{rbacTestResult.message}</p>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="px-6 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Invalidate Token & Logout
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Place Bid Modal */}
      {selectedAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-slate-700 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-blue-400" />
                Live Bid Submission
              </h3>
              <button
                onClick={() => setSelectedAuction(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <p className="text-xs text-slate-400">Auction Lot:</p>
              <p className="text-sm font-bold text-white">{selectedAuction.title}</p>
              <p className="text-xs text-slate-400 mt-1">
                Current Bid: <strong className="text-emerald-400">${parseFloat(selectedAuction.current_bid).toFixed(2)}</strong>
              </p>
            </div>

            <form onSubmit={handlePlaceBid} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase">Your Bid ($ USD)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    min={parseFloat(selectedAuction.current_bid) + 1}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Must be higher than current bid of ${parseFloat(selectedAuction.current_bid).toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAuction(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={biddingLoading}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5"
                >
                  {biddingLoading ? 'Submitting...' : 'Confirm Live Bid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
