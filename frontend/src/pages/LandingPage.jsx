import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Gavel, 
  Flame, 
  Clock, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Zap, 
  DollarSign, 
  Eye, 
  CheckCircle,
  Radio
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const [auctions, setAuctions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVolume: '0.00',
    liveAuctions: 0,
    totalAuctions: 0,
    totalBids: 0,
    totalUsers: 0,
    dbLatencyMs: 15,
  });

  const { connected, viewerCount } = useSocket();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [auctionsRes, statsRes] = await Promise.all([
          api.get('/public/auctions'),
          api.get('/public/stats').catch(() => ({ data: { success: false } })),
        ]);

        if (auctionsRes.data.success) {
          setAuctions(auctionsRes.data.auctions);
          setCategories(['All', ...auctionsRes.data.categories.map(c => c.category)]);
        }

        if (statsRes.data?.success) {
          setStats(statsRes.data.stats);
        }
      } catch (err) {
        console.error('Error fetching live data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredAuctions = selectedCategory === 'All' 
    ? auctions 
    : auctions.filter(a => a.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 border-b border-slate-800/80">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-600/20 to-cyan-500/10 blur-[130px] pointer-events-none rounded-full"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Live Indicator Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-400 text-xs font-semibold shadow-inner">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>Next-Gen Live Bidding Engine • Sub-50ms Socket.IO</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Bid in Real-Time. <br />
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
                Win Rare Treasures.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-normal">
              Live auctions with PostgreSQL row-level transaction safety, instant price synchronization, anti-sniping protection, and authentic seller catalog.
            </p>

            {/* CTA Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/auctions"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 transition-all transform hover:-translate-y-0.5"
              >
                <Gavel className="w-5 h-5" />
                Browse Live Floor
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-slate-200 bg-slate-900/90 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-all"
                >
                  Enter User Dashboard
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-slate-200 bg-slate-900/90 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Create Free Account
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              )}
            </div>

            {/* Live Database Metrics (From PostgreSQL directly) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 border-t border-slate-800/80 mt-10">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-2xl font-bold text-white font-mono">
                  ${parseFloat(stats.totalVolume).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Live Database Volume</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-2xl font-bold text-emerald-400 font-mono">
                  {stats.dbLatencyMs}ms
                </p>
                <p className="text-xs text-slate-400 mt-0.5">PostgreSQL Query Latency</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-2xl font-bold text-blue-400 font-mono">{stats.totalBids}</p>
                <p className="text-xs text-slate-400 mt-0.5">Recorded Bids</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-2xl font-bold text-cyan-400 font-mono">{viewerCount}</p>
                <p className="text-xs text-slate-400 mt-0.5">Live Online Viewers</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Featured Live Auctions */}
      <section id="featured" className="py-20 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold tracking-wider uppercase mb-1">
                <Flame className="w-4 h-4 fill-rose-500 text-rose-500 animate-bounce" />
                Live Auctions • Real-Time Floor
              </div>
              <h2 className="text-3xl font-extrabold text-white">Featured Live Lots</h2>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-96 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredAuctions.map((auction) => (
                <div
                  key={auction.id}
                  className="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-blue-500/10"
                >
                  {/* Image & Badges */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                    <img
                      src={auction.image_url || auction.images?.[0] || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80'}
                      alt={auction.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs font-medium text-white">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>LIVE</span>
                    </div>
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-blue-900/80 backdrop-blur-md border border-blue-500/30 text-xs font-semibold text-blue-300">
                      {auction.category}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {auction.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {auction.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-slate-400 font-medium uppercase">Current High Bid</p>
                          <p className="text-2xl font-black text-white font-mono">
                            ${parseFloat(auction.current_bid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-slate-400 font-medium uppercase">Min Increment</p>
                          <p className="text-xs font-bold text-blue-400 font-mono">
                            +${parseFloat(auction.bid_increment || 10).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          Ends {new Date(auction.end_time).toLocaleDateString()}
                        </span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {auction.bid_count || 0} bids
                        </span>
                      </div>

                      <Link
                        to={`/auctions/${auction.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all"
                      >
                        <Gavel className="w-4 h-4" />
                        Enter Bidding Room
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link
              to="/auctions"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition-all"
            >
              <span>Explore All Live Auctions ({stats.totalAuctions} Total Lots)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-950/60 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white">Live Bidding & Anti-Sniping Architecture</h2>
            <p className="text-slate-400 text-sm mt-2">
              Row-level transaction locking guarantees fairness across concurrent bids.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-500/30">
                01
              </div>
              <h3 className="text-xl font-bold text-white">PostgreSQL Row Lock</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every bid executes with <code className="text-blue-400 font-mono text-xs">FOR UPDATE</code>. Simultaneous bids are serialized in order, eliminating race conditions.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/30">
                02
              </div>
              <h3 className="text-xl font-bold text-white">30s Anti-Sniping Rule</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                If a valid bid arrives in the final 30 seconds, the auction timer automatically extends by 30 seconds for all viewers.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/30">
                03
              </div>
              <h3 className="text-xl font-bold text-white">Single Winner Selection</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                When the countdown strikes zero, the background worker automatically locks the lot and awards it to the highest bidder or records "No Winner".
              </p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default LandingPage;
