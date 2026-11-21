import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Gavel, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Clock, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  Sparkles,
  Layers,
  Radio,
  Tag,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

const AuctionListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization
  const initialCategory = searchParams.get('category') || 'All';
  const initialStatus = searchParams.get('status') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [auctions, setAuctions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting state
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [sortBy, setSortBy] = useState('endingSoon');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 9 });

  const { socket, connected, viewerCount } = useSocket();

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success) {
          setCategories([{ name: 'All', id: 0 }, ...res.data.categories]);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch auctions whenever filters, sorting, or pagination change
  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 9,
        sortBy,
        category: selectedCategory,
        status: selectedStatus,
      };
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await api.get('/auctions', { params });
      if (res.data.success) {
        setAuctions(res.data.auctions);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error loading auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [page, sortBy, selectedCategory, selectedStatus]);

  // Handle Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAuctions();
  };

  // Socket listener for new bids or status changes
  useEffect(() => {
    if (!socket) return;

    socket.on('bid_update', () => {
      fetchAuctions();
    });

    socket.on('new_auction', () => {
      fetchAuctions();
    });

    return () => {
      socket.off('bid_update');
      socket.off('new_auction');
    };
  }, [socket]);

  // Helper for Status Badge styling
  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'live':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            LIVE
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            UPCOMING
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700/60 text-slate-300 border border-slate-600">
            COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header & Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Real-Time Auction Floor • {viewerCount} Online</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              Explore Live Auctions
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Browse authentic verified items, filter by status, and place competitive bids in real time.
            </p>
          </div>

          <Link
            to="/auctions/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/25 self-start md:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            + List New Auction
          </Link>
        </div>

        {/* Filter & Search Bar Controls */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name or description..."
                className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
              >
                Search
              </button>
            </form>

            {/* Category Dropdown */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    Category: {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="md:col-span-4 flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="endingSoon">Sort: Ending Soonest</option>
                <option value="newest">Sort: Newly Listed</option>
                <option value="priceAsc">Sort: Price (Low to High)</option>
                <option value="priceDesc">Sort: Price (High to Low)</option>
                <option value="popular">Sort: Most Active / Most Bids</option>
              </select>
            </div>

          </div>

          {/* Status Tabs Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium mr-2">Status:</span>
              {[
                { label: 'All Statuses', value: 'all' },
                { label: 'Live Now', value: 'live' },
                { label: 'Upcoming', value: 'upcoming' },
                { label: 'Completed', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setSelectedStatus(tab.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedStatus === tab.value
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Found <strong className="text-white">{pagination.total}</strong> matching auction(s)
            </p>
          </div>

        </div>

        {/* Auctions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-96 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800"></div>
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-3xl border border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">No Auctions Found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              No auction listings matched your search criteria. Try modifying your filters or status tab.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
                setSelectedStatus('all');
                setSortBy('endingSoon');
                setPage(1);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <div
                key={auction.id}
                className="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-blue-500/10"
              >
                {/* Image & Status Overlay */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                  <img
                    src={auction.image_url || auction.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'}
                    alt={auction.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    {renderStatusBadge(auction.computed_status || auction.status)}
                  </div>
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-blue-300">
                    {auction.category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                      {auction.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {auction.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Current Bid</p>
                        <p className="text-2xl font-black text-white font-mono">
                          ${parseFloat(auction.current_bid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Min Increment</p>
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
                        {auction.total_bids || 0} bids
                      </span>
                    </div>

                    <Link
                      to={`/auctions/${auction.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all shadow-md shadow-blue-600/20"
                    >
                      <Gavel className="w-4 h-4" />
                      View Details & Bid
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-400">
              Page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{pagination.totalPages}</strong>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                    p === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AuctionListingPage;
