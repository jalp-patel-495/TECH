import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Gavel, 
  Search, 
  Clock, 
  Trash2, 
  Edit3, 
  Eye, 
  PlusCircle, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  Tag
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const MyAuctionsPage = () => {
  const { user } = useAuth();

  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [deletingId, setDeletingId] = useState(null);

  const fetchMyAuctions = async () => {
    setLoading(true);
    try {
      const params = {
        status: selectedStatus,
      };
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await api.get('/auctions/seller/my-auctions', { params });
      if (res.data.success) {
        setAuctions(res.data.myAuctions);
      }
    } catch (err) {
      console.error('Error fetching my auctions:', err);
      setError(err.response?.data?.message || 'Failed to load your auctions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAuctions();
  }, [selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMyAuctions();
  };

  // Delete/Cancel Action
  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/auctions/${id}`);
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Auction updated.');
        setDeletingId(null);
        fetchMyAuctions();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete auction.');
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold text-white">My Auction Catalog</h1>
            <p className="text-xs text-slate-400 mt-1">
              Complete inventory of auction lots created under your seller account.
            </p>
          </div>

          <Link
            to="/auctions/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            + Create New Auction
          </Link>
        </div>

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

        {/* Filters & Status Tabs */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'All Lots', value: 'all' },
              { label: 'Live Now', value: 'live' },
              { label: 'Upcoming', value: 'upcoming' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedStatus(tab.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedStatus === tab.value
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search within my auctions */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search my auctions..."
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </form>

        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800"></div>
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-3xl border border-slate-800 space-y-4">
            <p className="text-sm text-slate-400">No auctions found in this category.</p>
            <Link
              to="/auctions/create"
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold inline-block"
            >
              List an Item Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div className="relative aspect-[16/10] bg-slate-950">
                  <img
                    src={item.image_url || item.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase backdrop-blur-md ${
                      (item.computed_status || item.status) === 'live' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' :
                      (item.computed_status || item.status) === 'upcoming' ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40' :
                      (item.computed_status || item.status) === 'completed' ? 'bg-slate-950/80 text-slate-300 border border-slate-700' : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                    }`}>
                      {item.computed_status || item.status}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{item.category}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Current Bid:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ${parseFloat(item.current_bid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Total Bids:</span>
                      <span className="text-slate-200 font-semibold">{item.total_bids || 0}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        Ends {new Date(item.end_time).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <Link
                        to={`/auctions/${item.id}`}
                        className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Link>
                      <Link
                        to={`/auctions/${item.id}/edit`}
                        className="py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-rose-500/30 space-y-4">
            <h3 className="text-lg font-bold text-white">Confirm Removal</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to remove auction #{deletingId}?
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyAuctionsPage;
