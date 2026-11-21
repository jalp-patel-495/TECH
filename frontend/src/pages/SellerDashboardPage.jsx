import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Layers, 
  PlusCircle, 
  Gavel, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Edit3, 
  Trash2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const SellerDashboardPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState([]);
  const [summary, setSummary] = useState({
    total_count: 0,
    live_count: 0,
    upcoming_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    total_revenue: 0,
  });
  const [error, setError] = useState('');

  const fetchSellerData = async () => {
    try {
      const res = await api.get('/auctions/seller/my-auctions');
      if (res.data.success) {
        setAuctions(res.data.myAuctions);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      console.error('Error fetching seller dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load seller metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerData();
  }, []);

  // Real-time update on bid placement
  useEffect(() => {
    if (!socket) return;
    socket.on('bid_update', () => {
      fetchSellerData();
    });
    return () => {
      socket.off('bid_update');
    };
  }, [socket]);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 mb-2">
              <Layers className="w-3.5 h-3.5" />
              VERIFIED SELLER PORTAL
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              Seller Command Center
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your live inventory, monitor active bids, and launch new auction lots.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/my-auctions"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
            >
              View My Auctions List
            </Link>
            <Link
              to="/auctions/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              Create Auction
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-medium uppercase">Total Listed Lots</p>
            <p className="text-3xl font-black text-white font-mono">{summary.total_count || 0}</p>
            <p className="text-[11px] text-slate-500">All-time listings</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-medium uppercase">Active Live Auctions</p>
            <p className="text-3xl font-black text-emerald-400 font-mono flex items-center gap-2">
              {summary.live_count || 0}
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            </p>
            <p className="text-[11px] text-slate-500">Currently taking bids</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-medium uppercase">Upcoming Auctions</p>
            <p className="text-3xl font-black text-amber-400 font-mono">{summary.upcoming_count || 0}</p>
            <p className="text-[11px] text-slate-500">Scheduled to launch</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-medium uppercase">Projected Revenue</p>
            <p className="text-3xl font-black text-blue-400 font-mono">
              ${parseFloat(summary.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500">Cumulative high bids</p>
          </div>

        </div>

        {/* Recent Listings Management Table */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Your Listed Lots</h3>
              <p className="text-xs text-slate-400">Real-time status tracking and lot maintenance</p>
            </div>
            <Link
              to="/auctions/create"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              + Add New Listing
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading seller listings...</div>
          ) : auctions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-slate-400">You haven't listed any auction lots yet.</p>
              <Link
                to="/auctions/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                <PlusCircle className="w-4 h-4" />
                List Your First Item
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Current High Bid</th>
                    <th className="py-3 px-4">Total Bids</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Closing Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auctions.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white flex items-center gap-3">
                        <img
                          src={item.image_url || item.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80'}
                          alt={item.title}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-800 shrink-0"
                        />
                        <div className="max-w-xs">
                          <Link to={`/auctions/${item.id}`} className="font-bold hover:text-blue-400 truncate block">
                            {item.title}
                          </Link>
                          <span className="text-[10px] text-slate-500 font-mono">Lot #{item.id}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">{item.category}</td>
                      
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        ${parseFloat(item.current_bid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {item.total_bids || 0}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          (item.computed_status || item.status) === 'live' ? 'bg-emerald-500/20 text-emerald-400' :
                          (item.computed_status || item.status) === 'upcoming' ? 'bg-amber-500/20 text-amber-400' :
                          (item.computed_status || item.status) === 'completed' ? 'bg-slate-700/60 text-slate-300' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {item.computed_status || item.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(item.end_time).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Link
                          to={`/auctions/${item.id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white inline-block"
                          title="View Auction"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          to={`/auctions/${item.id}/edit`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 inline-block"
                          title="Edit Auction"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SellerDashboardPage;
