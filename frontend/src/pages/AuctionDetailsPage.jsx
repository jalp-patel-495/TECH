import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Gavel, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  Trophy,
  Zap,
  Radio,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const AuctionDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, role, refreshProfile } = useAuth();
  const { socket } = useSocket();

  const [auction, setAuction] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [biddingLoading, setBiddingLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [extensionAlert, setExtensionAlert] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false });

  // Fetch auction details
  const fetchAuction = async () => {
    try {
      const res = await api.get(`/auctions/${id}`);
      if (res.data.success) {
        const item = res.data.auction;
        setAuction(item);
        const images = item.images && item.images.length > 0 ? item.images : [item.image_url];
        setSelectedImage(images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80');
        
        // Suggest next minimum bid
        const nextMin = parseFloat(item.current_bid) + parseFloat(item.bid_increment || 10);
        setBidAmount(nextMin.toFixed(2));
      }
    } catch (err) {
      console.error('Error fetching auction details:', err);
      setError(err.response?.data?.message || 'Auction lot not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuction();
  }, [id]);

  // Join Socket.IO auction room for real-time bid events & timer sync
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join_auction', { auctionId: id });

    // Listener: Real-time Bid Updates
    socket.on('bid_update', (data) => {
      if (data.auctionId == id) {
        setAuction((prev) => {
          if (!prev) return prev;
          const nextMin = (parseFloat(data.newBid) + parseFloat(prev.bid_increment || 10)).toFixed(2);
          setBidAmount(nextMin);
          return {
            ...prev,
            current_bid: data.newBid,
            end_time: data.newEndTime || prev.end_time,
          };
        });

        setSuccessMsg(`⚡ High Bid of $${parseFloat(data.newBid).toFixed(2)} placed by ${data.bidderName}!`);
        // Refresh full bid ledger
        fetchAuction();
      }
    });

    // Listener: 30-Second Anti-Sniping Extension
    socket.on('auction_extended', (data) => {
      if (data.auctionId == id) {
        setExtensionAlert(data.message || '⚡ Anti-Sniping: Bid placed in final 30s! Auction extended by 30 seconds.');
        setAuction((prev) => prev ? { ...prev, end_time: data.newEndTime } : prev);
        setTimeout(() => setExtensionAlert(''), 8000);
      }
    });

    // Listener: Auction Closed & Winner Decided
    socket.on('auction_closed', (data) => {
      if (data.auctionId == id) {
        setAuction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: 'completed',
            computed_status: 'completed',
            winner_id: data.winnerId,
            winner_name: data.winnerName,
            winning_price: data.finalPrice,
            hasWinner: data.hasWinner,
          };
        });
        setTimeLeft((prev) => ({ ...prev, isEnded: true }));
      }
    });

    socket.on('auction_updated', (data) => {
      if (data.id == id) {
        fetchAuction();
      }
    });

    return () => {
      socket.emit('leave_auction', { auctionId: id });
      socket.off('bid_update');
      socket.off('auction_extended');
      socket.off('auction_closed');
      socket.off('auction_updated');
    };
  }, [socket, id]);

  // Countdown Timer Calculation
  useEffect(() => {
    if (!auction?.end_time) return;

    const calculateTime = () => {
      const diff = new Date(auction.end_time).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true });
        // If client detects expiration and status was live, request fresh winner resolution
        if (auction.status === 'live' || auction.computed_status === 'live') {
          fetchAuction();
        }
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isEnded: false });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [auction?.end_time, auction?.status]);

  // Submit Bid
  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const minRequired = parseFloat(auction.current_bid) + parseFloat(auction.bid_increment || 10);
    const amountNum = parseFloat(bidAmount);

    if (amountNum < minRequired) {
      setError(`Bid must be at least $${minRequired.toFixed(2)} (Current: $${auction.current_bid} + Increment: $${auction.bid_increment}).`);
      return;
    }

    setBiddingLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.post('/users/bid', {
        auctionId: auction.id,
        amount: amountNum,
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || `Your bid of $${amountNum.toFixed(2)} was accepted!`);
        await fetchAuction();
        await refreshProfile();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place bid.');
    } finally {
      setBiddingLoading(false);
    }
  };

  // Delete Auction Action
  const handleDeleteAuction = async () => {
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/auctions/${auction.id}`);
      if (res.data.success) {
        navigate('/my-auctions');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete auction.');
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const addIncrement = (inc) => {
    const current = parseFloat(bidAmount) || (parseFloat(auction.current_bid) + parseFloat(auction.bid_increment || 10));
    setBidAmount((current + inc).toFixed(2));
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-mono">Loading real-time auction lot #{id}...</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-4 max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Auction Not Found</h2>
          <p className="text-xs text-slate-400">This auction lot does not exist or has been removed.</p>
          <Link to="/auctions" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold inline-block">
            Browse Live Auctions
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === auction.seller_id;
  const canManage = isOwner || role === 'admin';
  const computedStatus = auction.computed_status || auction.status;
  const isCompleted = computedStatus === 'completed' || timeLeft.isEnded;
  const isLive = computedStatus === 'live' && !timeLeft.isEnded;

  const images = auction.images && auction.images.length > 0 ? auction.images : [auction.image_url];

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Navigation Breadcrumb & Back */}
        <div className="flex items-center justify-between">
          <Link
            to="/auctions"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Auctions
          </Link>

          {canManage && (
            <div className="flex items-center gap-2.5">
              <Link
                to={`/auctions/${auction.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors border border-slate-700"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                Edit Auction
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors border border-rose-500/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Lot
              </button>
            </div>
          )}
        </div>

        {/* 30-Second Anti-Sniping Extension Banner */}
        {extensionAlert && (
          <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs font-bold flex items-center justify-between animate-bounce shadow-xl">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>{extensionAlert}</span>
            </div>
            <button onClick={() => setExtensionAlert('')} className="text-amber-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* WINNER OR NO-WINNER RESOLUTION BANNER (When Auction is Completed) */}
        {isCompleted && (
          <div className={`p-6 rounded-3xl border shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 ${
            auction.winner_id || auction.winner?.name
              ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-emerald-950/60 border-amber-500/40 text-amber-300'
              : 'bg-slate-900/90 border-slate-700 text-slate-300'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shrink-0 ${
                auction.winner_id || auction.winner?.name
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {auction.winner_id || auction.winner?.name ? <Trophy className="w-7 h-7 text-amber-400" /> : <Clock className="w-7 h-7 text-slate-400" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Official Auction Result</span>
                {auction.winner_id || auction.winner?.name ? (
                  <div>
                    <h3 className="text-xl font-extrabold text-white">
                      Winner: {auction.winner?.name || auction.winner_name || 'Highest Bidder'}
                    </h3>
                    <p className="text-xs text-emerald-400 font-mono mt-0.5">
                      Winning Price: ${parseFloat(auction.winning_price || auction.winner?.price || auction.current_bid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold text-white">Auction Ended — No Winner</h3>
                    <p className="text-xs text-slate-400 mt-0.5">No bids were placed on this lot before the deadline expired.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono">
              Status: <strong className="text-rose-400 uppercase">CLOSED</strong>
            </div>
          </div>
        )}

        {/* Main Grid: Gallery + Bidding Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Image Gallery (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Main Image Stage */}
            <div className="relative aspect-[16/11] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
              <img
                src={selectedImage}
                alt={auction.title}
                className="w-full h-full object-cover transition-all duration-300"
              />
              <div className="absolute top-4 left-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-md border ${
                  computedStatus === 'live' && !timeLeft.isEnded
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                    : computedStatus === 'upcoming'
                    ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                    : 'bg-slate-950/80 text-slate-300 border-slate-700'
                }`}>
                  {computedStatus === 'live' && !timeLeft.isEnded && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  )}
                  {computedStatus === 'live' && timeLeft.isEnded ? 'COMPLETED' : computedStatus}
                </span>
              </div>
              <div className="absolute top-4 right-4 px-3 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-blue-300">
                {auction.category}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImage === img
                        ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                        : 'border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description Box */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-3">
              <h3 className="text-base font-bold text-white">Product Description</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {auction.description}
              </p>
            </div>

            {/* Seller Information Card */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-lg shadow-md">
                  {auction.seller_name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {auction.seller_name}
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </h4>
                  <p className="text-xs text-slate-400">Verified Marketplace Seller</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <span>Member since {new Date(auction.seller_joined || auction.created_at).getFullYear()}</span>
              </div>
            </div>

          </div>

          {/* Right Column: Pricing & Live Bidding Engine (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Title & Metadata */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Live Auction Lot #{auction.id}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {auction.title}
              </h1>
            </div>

            {/* Live Countdown Timer Block with Anti-Sniping Alert */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-blue-400" />
                  {timeLeft.isEnded ? 'Auction Ended' : 'Live Countdown'}
                </span>
                <span className="font-mono text-emerald-400 font-semibold">
                  Ends {new Date(auction.end_time).toLocaleDateString()} {new Date(auction.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {!timeLeft.isEnded ? (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-2xl font-black text-white font-mono">{timeLeft.days}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Days</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-2xl font-black text-white font-mono">{timeLeft.hours}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Hours</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-2xl font-black text-white font-mono">{timeLeft.minutes}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Mins</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className={`text-2xl font-black font-mono ${timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds <= 30 ? 'text-rose-400 animate-ping' : 'text-emerald-400 animate-pulse'}`}>
                      {timeLeft.seconds}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">Secs</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-950 text-center text-xs font-bold text-slate-400">
                  Countdown concluded. Winning selection finalized in PostgreSQL.
                </div>
              )}
            </div>

            {/* Price Panel */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Current High Bid</p>
                  <p className="text-3xl sm:text-4xl font-black text-white font-mono mt-0.5">
                    ${parseFloat(auction.current_bid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 uppercase">Starting Price</p>
                  <p className="text-sm font-bold text-slate-300 font-mono">${parseFloat(auction.starting_bid).toFixed(2)}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Minimum Bid Increment:</span>
                <span className="font-bold text-blue-400 font-mono">+${parseFloat(auction.bid_increment || 10).toFixed(2)}</span>
              </div>

              {/* Real-Time Bidding Form */}
              {isLive ? (
                <form onSubmit={handlePlaceBid} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase block">
                      Place Instant Bid ($ USD)
                    </label>
                    <div className="relative">
                      <DollarSign className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        step="0.01"
                        min={parseFloat(auction.current_bid) + parseFloat(auction.bid_increment || 10)}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-base font-bold focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Quick Increment Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 50, 100].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => addIncrement(inc)}
                        className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors"
                      >
                        +${inc}
                      </button>
                    ))}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={biddingLoading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Gavel className="w-4 h-4" />
                    {biddingLoading ? 'Acquiring Lock & Validating...' : 'Place Official Real-Time Bid'}
                  </button>

                  {!isAuthenticated && (
                    <p className="text-[11px] text-center text-slate-500">
                      Sign in to authenticate your bid.
                    </p>
                  )}
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900 text-center text-xs text-slate-400">
                  {computedStatus === 'upcoming' 
                    ? `Bidding opens on ${new Date(auction.start_time).toLocaleString()}`
                    : 'Bidding is closed for this lot.'}
                </div>
              )}
            </div>

            {/* Real-time Bid History Table */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Live Bid Ledger ({auction.bids?.length || 0})
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">Row-Level Safe</span>
              </div>

              {auction.bids?.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No bids placed yet. Be the first to place an opening bid!
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 max-h-64 overflow-y-auto pr-1">
                  {auction.bids.map((b, idx) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
                        <span className="font-medium text-white">{b.bidder_masked_name}</span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">HIGH BID</span>
                        )}
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-white font-bold">${parseFloat(b.amount).toFixed(2)}</span>
                        <span className="text-[10px] text-slate-500 block">{new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-rose-500/30 space-y-4">
            <h3 className="text-lg font-bold text-white">Delete Auction Lot?</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to remove <strong>"{auction.title}"</strong>? If bids exist, it will be marked as Cancelled.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAuction}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
              >
                {deleteLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuctionDetailsPage;
