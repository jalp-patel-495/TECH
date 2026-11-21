import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Radio, 
  Clock, 
  Gavel, 
  Trophy, 
  XCircle, 
  Heart, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  ExternalLink, 
  RefreshCw, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2,
  Trash2,
  TrendingUp,
  Award
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ProfileSection from './ProfileSection';
import SettingsSection from './SettingsSection';
import NotificationsSection from './NotificationsSection';

const BuyerPanel = ({ activeTab, setActiveTab, handleLogout }) => {
  const navigate = useNavigate();

  // Dashboard overview
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auctions (live / upcoming)
  const [auctions, setAuctions] = useState([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);

  // Bids
  const [bids, setBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);

  // Won / Lost
  const [wonAuctions, setWonAuctions] = useState([]);
  const [lostAuctions, setLostAuctions] = useState([]);

  // Watchlist
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Quick Bid Modal State
  const [quickBidItem, setQuickBidItem] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [biddingLoading, setBiddingLoading] = useState(false);
  const [bidFeedback, setBidFeedback] = useState({ type: '', text: '' });

  // 1. Fetch Buyer Dashboard
  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/buyer/dashboard');
      if (res.data.success) {
        setDashboardData(res.data.dashboard);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Auctions (Live or Upcoming)
  const fetchAuctions = async (status) => {
    setAuctionsLoading(true);
    try {
      const res = await api.get(`/auctions?status=${status}&limit=20`);
      if (res.data.success) {
        setAuctions(res.data.auctions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuctionsLoading(false);
    }
  };

  // 3. Fetch Buyer Bids
  const fetchBids = async () => {
    setBidsLoading(true);
    try {
      const res = await api.get('/users/buyer/bids');
      if (res.data.success) {
        setBids(res.data.bids);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBidsLoading(false);
    }
  };

  // 4. Fetch Won
  const fetchWon = async () => {
    try {
      const res = await api.get('/users/buyer/won');
      if (res.data.success) {
        setWonAuctions(res.data.wonAuctions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Fetch Lost
  const fetchLost = async () => {
    try {
      const res = await api.get('/users/buyer/lost');
      if (res.data.success) {
        setLostAuctions(res.data.lostAuctions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 6. Fetch Watchlist
  const fetchWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const res = await api.get('/watchlist');
      if (res.data.success) {
        setWatchlist(res.data.watchlist);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  // Remove from watchlist
  const handleRemoveWatchlist = async (auctionId) => {
    try {
      await api.post(`/watchlist/${auctionId}`);
      setWatchlist((prev) => prev.filter((item) => item.id !== auctionId));
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Quick Bid
  const handlePlaceQuickBid = async (e) => {
    e.preventDefault();
    if (!quickBidItem || !bidAmount) return;
    setBiddingLoading(true);
    setBidFeedback({ type: '', text: '' });

    try {
      const res = await api.post('/users/bid', {
        auctionId: quickBidItem.id,
        amount: parseFloat(bidAmount),
      });

      if (res.data.success) {
        setBidFeedback({ type: 'success', text: res.data.message || 'Bid accepted successfully!' });
        setTimeout(() => {
          setQuickBidItem(null);
          setBidFeedback({ type: '', text: '' });
          fetchDashboard();
          if (activeTab === 'my-active-bids') fetchBids();
        }, 1500);
      }
    } catch (err) {
      setBidFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to submit bid.' });
    } finally {
      setBiddingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'browse-auctions') navigate('/auctions');
    if (activeTab === 'live-auctions') fetchAuctions('live');
    if (activeTab === 'upcoming-auctions') fetchAuctions('upcoming');
    if (activeTab === 'my-active-bids' || activeTab === 'bid-history') fetchBids();
    if (activeTab === 'my-won-auctions') fetchWon();
    if (activeTab === 'my-lost-auctions') fetchLost();
    if (activeTab === 'watchlist') fetchWatchlist();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* 1. BUYER DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Active Bids Placed</span>
                <Gavel className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-3xl font-black text-white font-mono">{dashboardData?.stats?.totalBidsPlaced || 0}</p>
              <p className="text-[11px] text-slate-400">Total competitive bids placed</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Auctions Won</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl font-black text-amber-400 font-mono">{dashboardData?.stats?.auctionsWon || 0}</p>
              <p className="text-[11px] text-slate-400">${dashboardData?.stats?.totalWonValue || '0.00'} Realized value</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Auctions Lost</span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-3xl font-black text-rose-400 font-mono">{dashboardData?.stats?.auctionsLost || 0}</p>
              <p className="text-[11px] text-slate-400">Outbid on finalized lots</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Watchlist Lots</span>
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
              </div>
              <p className="text-3xl font-black text-white font-mono">{dashboardData?.stats?.activeWatchedAuctions || 0}</p>
              <p className="text-[11px] text-slate-400">Items saved for tracking</p>
            </div>
          </div>

          {/* Live Floor Lots */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  Live Bidding Floor
                </h3>
                <p className="text-xs text-slate-400">Browse live lots and submit instant bids</p>
              </div>
              <Link to="/auctions" className="text-xs text-blue-400 hover:text-blue-300">
                Browse Full Catalog →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dashboardData?.activeAuctions?.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 font-medium">{a.category}</span>
                      <span className="text-slate-400">by {a.seller_name}</span>
                    </div>
                    <h4 className="font-bold text-white text-sm line-clamp-1">{a.title}</h4>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">High Bid</p>
                      <p className="text-base font-black text-emerald-400 font-mono">${parseFloat(a.current_bid).toFixed(2)}</p>
                    </div>
                    <Link
                      to={`/auctions/${a.id}`}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-blue-600/20"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      Place Bid
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3, 4. LIVE / UPCOMING AUCTIONS */}
      {(activeTab === 'live-auctions' || activeTab === 'upcoming-auctions') && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {activeTab === 'live-auctions' ? <Radio className="w-5 h-5 text-emerald-400 animate-pulse" /> : <Clock className="w-5 h-5 text-cyan-400" />}
                {activeTab === 'live-auctions' ? 'Live Bidding Arena' : 'Upcoming Scheduled Auctions'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'live-auctions' ? 'Live auctions actively accepting competitive bids.' : 'Auctions opening soon for bidding.'}
              </p>
            </div>
            <button
              onClick={() => fetchAuctions(activeTab === 'live-auctions' ? 'live' : 'upcoming')}
              className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auctionsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {auctions.map((a) => (
              <div key={a.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
                <img
                  src={a.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80'}
                  alt={a.title}
                  className="w-full h-36 rounded-xl object-cover border border-slate-800"
                />
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-400">{a.category}</span>
                  <h4 className="font-bold text-white text-sm line-clamp-1">{a.title}</h4>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Current Bid</p>
                    <p className="font-black text-emerald-400 font-mono">${parseFloat(a.current_bid).toFixed(2)}</p>
                  </div>
                  <Link
                    to={`/auctions/${a.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    View Lot <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5, 8. MY ACTIVE BIDS / BID HISTORY */}
      {(activeTab === 'my-active-bids' || activeTab === 'bid-history') && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-blue-400" />
                {activeTab === 'my-active-bids' ? 'Your Active Bids & Standing' : 'Complete Bidding History'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Track whether you are in the lead or have been outbid.
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
                  <th className="py-3 px-4">Your Bid</th>
                  <th className="py-3 px-4">Current High</th>
                  <th className="py-3 px-4">Your Standing</th>
                  <th className="py-3 px-4">Time Placed</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {bids.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 font-sans">
                      You haven't placed any bids yet.
                    </td>
                  </tr>
                ) : (
                  bids.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-medium text-white max-w-[200px] truncate">
                        {b.auction_title}
                      </td>
                      <td className="py-3.5 px-4 text-blue-400 font-bold">${parseFloat(b.amount).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-emerald-400">${parseFloat(b.current_bid).toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-sans">
                        {b.is_winner ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400">
                            Won Lot 🏆
                          </span>
                        ) : b.is_high_bidder ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                            In The Lead ⚡
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400">
                            Outbid ⚠️
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">{new Date(b.created_at).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <Link
                          to={`/auctions/${b.auction_id}`}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1"
                        >
                          Bid Again
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

      {/* 6. MY WON AUCTIONS */}
      {activeTab === 'my-won-auctions' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Your Won Auction Lots
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Congratulations! These lots were concluded with your bid officially confirmed as the highest.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wonAuctions.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-500 text-xs">
                No won auctions recorded yet. Enter a live auction to place winning bids!
              </div>
            ) : (
              wonAuctions.map((w) => (
                <div key={w.id} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={w.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80'}
                      alt={w.title}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400">
                        Official Winner
                      </span>
                      <h4 className="font-bold text-white text-sm line-clamp-1 mt-1">{w.title}</h4>
                      <p className="text-[11px] text-slate-400">Sold by {w.seller_name}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Your Winning Price</p>
                      <p className="text-base font-black text-emerald-400 font-mono">
                        ${parseFloat(w.winning_price || w.current_bid).toFixed(2)}
                      </p>
                    </div>
                    <Link
                      to={`/auctions/${w.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 border border-slate-800"
                    >
                      View Lot Certificate
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 7. MY LOST AUCTIONS */}
      {activeTab === 'my-lost-auctions' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              Concluded Lots Where You Were Outbid
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Auctions you participated in that closed with another collector's bid winning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lostAuctions.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-500 text-xs">
                No lost auctions found.
              </div>
            ) : (
              lostAuctions.map((l) => (
                <div key={l.id} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-sm line-clamp-1">{l.title}</h4>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Winning Collector:</span>
                      <strong className="text-amber-300 font-sans">{l.winner_name || 'Anonymous'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Final Settled Price:</span>
                      <strong className="text-white font-mono">${parseFloat(l.winning_price || l.current_bid).toFixed(2)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Your Last Bid:</span>
                      <span className="text-blue-400 font-mono">${parseFloat(l.my_highest_bid).toFixed(2)}</span>
                    </div>
                  </div>
                  <Link
                    to={`/auctions/${l.id}`}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    View Closed Lot
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 9. WATCHLIST */}
      {activeTab === 'watchlist' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-400 fill-rose-500/20" />
                Your Saved Watchlist
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Lots you've bookmarked for live bidding notifications.
              </p>
            </div>
            <button
              onClick={() => fetchWatchlist()}
              className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${watchlistLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {watchlist.length === 0 ? (
              <div className="col-span-3 py-16 text-center text-slate-500 space-y-2">
                <Heart className="w-8 h-8 mx-auto opacity-30 text-rose-400" />
                <p className="text-xs">Your watchlist is empty.</p>
                <Link to="/auctions" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold inline-block">
                  Explore Live Auctions
                </Link>
              </div>
            ) : (
              watchlist.map((w) => (
                <div key={w.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <img
                      src={w.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80'}
                      alt={w.title}
                      className="w-full h-36 rounded-xl object-cover border border-slate-800"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-blue-400 font-bold uppercase">{w.category}</span>
                      <button
                        onClick={() => handleRemoveWatchlist(w.id)}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                    <h4 className="font-bold text-white text-sm line-clamp-1">{w.title}</h4>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">High Bid</p>
                      <p className="text-base font-black text-emerald-400 font-mono">${parseFloat(w.current_bid).toFixed(2)}</p>
                    </div>
                    <Link
                      to={`/auctions/${w.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Gavel className="w-3.5 h-3.5" /> Enter Arena
                    </Link>
                  </div>
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

export default BuyerPanel;
