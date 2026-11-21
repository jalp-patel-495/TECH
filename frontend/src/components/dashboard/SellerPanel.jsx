import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Package, 
  Radio, 
  Clock, 
  CheckCircle2, 
  Gavel, 
  BarChart2, 
  Trophy, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  DollarSign,
  TrendingUp,
  Mail,
  Phone
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ProfileSection from './ProfileSection';
import SettingsSection from './SettingsSection';
import NotificationsSection from './NotificationsSection';

const SellerPanel = ({ activeTab, setActiveTab, handleLogout }) => {
  const navigate = useNavigate();

  // Dashboard overview data
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auctions data
  const [auctions, setAuctions] = useState([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);

  // Bids data
  const [bids, setBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);

  // Winners data
  const [winners, setWinners] = useState([]);
  const [winnersLoading, setWinnersLoading] = useState(false);

  // 1. Fetch Dashboard Overview
  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/seller/dashboard');
      if (res.data.success) {
        setDashboardData(res.data.dashboard);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Seller Auctions
  const fetchAuctions = async (statusOverride) => {
    setAuctionsLoading(true);
    try {
      const s = statusOverride !== undefined ? statusOverride : 'all';
      const res = await api.get(`/users/seller/auctions?status=${s}`);
      if (res.data.success) {
        setAuctions(res.data.auctions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuctionsLoading(false);
    }
  };

  // 3. Fetch Bids on Seller Items
  const fetchBids = async () => {
    setBidsLoading(true);
    try {
      const res = await api.get('/users/seller/bids');
      if (res.data.success) {
        setBids(res.data.bids);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBidsLoading(false);
    }
  };

  // 4. Fetch Winner Details
  const fetchWinners = async () => {
    setWinnersLoading(true);
    try {
      const res = await api.get('/users/seller/winners');
      if (res.data.success) {
        setWinners(res.data.winners);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWinnersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'create-auction') navigate('/auctions/create');
    if (activeTab === 'my-auctions') fetchAuctions('all');
    if (activeTab === 'active-auctions') fetchAuctions('active');
    if (activeTab === 'upcoming-auctions') fetchAuctions('upcoming');
    if (activeTab === 'completed-auctions' || activeTab === 'auction-results') fetchAuctions('completed');
    if (activeTab === 'bid-history') fetchBids();
    if (activeTab === 'winner-details') fetchWinners();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* 1. SELLER DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Catalog Lots</span>
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-3xl font-black text-white font-mono">{dashboardData?.stats?.totalListings || 0}</p>
              <p className="text-[11px] text-slate-400">Total items cataloged</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Live Active Lots</span>
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <p className="text-3xl font-black text-emerald-400 font-mono">{dashboardData?.stats?.activeListings || 0}</p>
              <p className="text-[11px] text-slate-400">Receiving competitive bids</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Realized Sales Volume</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-emerald-400 font-mono">${dashboardData?.stats?.realizedRevenue || '0.00'}</p>
              <p className="text-[11px] text-slate-400">Completed lot settlements</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Scheduled Upcoming</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-3xl font-black text-cyan-400 font-mono">{dashboardData?.stats?.upcomingListings || 0}</p>
              <p className="text-[11px] text-slate-400">Opening soon</p>
            </div>
          </div>

          {/* Quick Action Banner */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">Ready to list a new collector lot?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload product photos, configure minimum increments, and launch competitive live bidding.
              </p>
            </div>
            <Link
              to="/auctions/create"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              + Create Auction Lot
            </Link>
          </div>

          {/* Recent Inventory Preview */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Your Listed Lots</h3>
              <button
                onClick={() => setActiveTab('my-auctions')}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View All Lots →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dashboardData?.listings?.slice(0, 6).map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80'}
                      alt={item.title}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-xs truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-400">{item.category}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Current Bid</p>
                      <p className="font-black text-emerald-400 font-mono">${parseFloat(item.current_bid).toFixed(2)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.computed_status === 'live' ? 'bg-emerald-500/20 text-emerald-400' :
                      item.computed_status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {item.computed_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3, 4, 5, 6, 8. MY AUCTIONS / ACTIVE / UPCOMING / COMPLETED / RESULTS */}
      {(activeTab === 'my-auctions' || activeTab === 'active-auctions' || activeTab === 'upcoming-auctions' || activeTab === 'completed-auctions' || activeTab === 'auction-results') && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                {activeTab === 'active-auctions' ? 'Your Live Active Auctions' :
                 activeTab === 'upcoming-auctions' ? 'Your Upcoming Auctions' :
                 activeTab === 'completed-auctions' || activeTab === 'auction-results' ? 'Your Concluded Auction Results' :
                 'Your Complete Inventory Catalog'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor bidding traction, edit lot specs, or view final purchase prices.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/auctions/create"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                List New Lot
              </Link>
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
                  <th className="py-3 px-4">Starting Bid</th>
                  <th className="py-3 px-4">Current High Bid</th>
                  <th className="py-3 px-4">Total Bids</th>
                  <th className="py-3 px-4">Winner Details</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auctions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500 font-sans">
                      No auctions found in this category.
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
                      <td className="py-3.5 px-4 text-slate-400">${parseFloat(a.starting_bid).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">${parseFloat(a.current_bid).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-slate-300">{a.total_bids || 0}</td>
                      <td className="py-3.5 px-4 font-sans">
                        {a.winner_name ? (
                          <span className="font-bold text-amber-300">{a.winner_name}</span>
                        ) : (
                          <span className="text-slate-500">None yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans space-x-2">
                        <Link
                          to={`/auctions/${a.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs inline-flex items-center gap-1"
                        >
                          View
                        </Link>
                        <Link
                          to={`/auctions/${a.id}/edit`}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs inline-flex items-center gap-1"
                        >
                          Edit
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

      {/* 7. BID HISTORY ON SELLER ITEMS */}
      {activeTab === 'bid-history' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-blue-400" />
                Live Bidding Activity On Your Lots
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Full chronological ledger of incoming bids across your catalog.
              </p>
            </div>
            <button
              onClick={() => fetchBids()}
              className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${bidsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Auction Lot</th>
                  <th className="py-3 px-4">Bidder</th>
                  <th className="py-3 px-4">Bid Amount</th>
                  <th className="py-3 px-4">Time Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {bids.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500 font-sans">
                      No bids recorded on your listings yet.
                    </td>
                  </tr>
                ) : (
                  bids.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-medium text-white">{b.auction_title}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-sans">{b.bidder_name} ({b.bidder_email})</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">${parseFloat(b.amount).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">{new Date(b.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. WINNER DETAILS */}
      {activeTab === 'winner-details' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Winning Buyer Profiles & Settlements
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct contact coordinates for buyers who won your concluded auctions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {winners.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-500 text-xs">
                No concluded auctions with winners yet.
              </div>
            ) : (
              winners.map((w) => (
                <div key={w.auction_id} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      Concluded Lot
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(w.end_time).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm line-clamp-1">{w.auction_title}</h4>
                  
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Winning Buyer:</span>
                      <strong className="text-white font-sans">{w.winner_name}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Buyer Email:</span>
                      <span className="text-slate-300 font-mono text-[11px] flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {w.winner_email}
                      </span>
                    </div>
                    {w.winner_phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="text-slate-300 font-mono text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {w.winner_phone}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Final Realized Price:</span>
                      <strong className="text-emerald-400 font-mono text-sm">${parseFloat(w.winning_price).toFixed(2)}</strong>
                    </div>
                  </div>

                  <Link
                    to={`/auctions/${w.auction_id}`}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    View Completed Lot <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 10. NOTIFICATIONS */}
      {activeTab === 'notifications' && <NotificationsSection />}

      {/* 11. PROFILE */}
      {activeTab === 'profile' && <ProfileSection />}

      {/* 12. SETTINGS */}
      {activeTab === 'settings' && <SettingsSection />}
    </div>
  );
};

export default SellerPanel;
