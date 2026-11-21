import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Gavel, 
  Upload, 
  Image as ImageIcon, 
  DollarSign, 
  Calendar, 
  Tag, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Trash2,
  Clock,
  Save
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const EditAuctionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [bidIncrement, setBidIncrement] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState('live');
  const [imageUrls, setImageUrls] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch auction details & categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [auctionRes, catRes] = await Promise.all([
          api.get(`/auctions/${id}`),
          api.get('/categories')
        ]);

        if (auctionRes.data.success) {
          const a = auctionRes.data.auction;
          
          // Verify ownership: seller or admin
          if (a.seller_id !== user?.id && role !== 'admin') {
            setError('You are not authorized to edit this auction lot.');
            setLoading(false);
            return;
          }

          setTitle(a.title);
          setDescription(a.description);
          setCategory(a.category);
          setBidIncrement(String(a.bid_increment));
          setStatus(a.status || 'live');
          setEndTime(new Date(a.end_time).toISOString().slice(0, 16));
          setImageUrls(a.images && a.images.length > 0 ? a.images : [a.image_url]);
        }

        if (catRes.data.success) {
          setCategories(catRes.data.categories);
        }
      } catch (err) {
        console.error('Error fetching auction for edit:', err);
        setError(err.response?.data?.message || 'Failed to load auction.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, role]);

  // Handle Image Upload
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    setUploading(true);
    try {
      const res = await api.post('/auctions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setImageUrls((prev) => [...prev, ...res.data.images]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = () => {
    if (newImageUrl.trim()) {
      setImageUrls((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const removeImage = (index) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Update
  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        bid_increment: parseFloat(bidIncrement),
        end_time: new Date(endTime).toISOString(),
        status,
        images: imageUrls,
        image_url: imageUrls[0],
      };

      const res = await api.put(`/auctions/${id}`, payload);
      if (res.data.success) {
        setSuccessMsg('Auction updated successfully!');
        setTimeout(() => {
          navigate(`/auctions/${id}`);
        }, 800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update auction.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div>
            <Link
              to={`/auctions/${id}`}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel and Return
            </Link>
            <h1 className="text-3xl font-extrabold text-white">Edit Auction Lot #{id}</h1>
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

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase">Product Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              required
            ></textarea>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Auction Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="live">Live</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Min Increment & End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Minimum Bid Increment ($)</label>
              <input
                type="number"
                step="0.01"
                value={bidIncrement}
                onChange={(e) => setBidIncrement(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">End Time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Image Management */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold text-slate-300 uppercase block">Product Images</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {imageUrls.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 group">
                  <img src={img} alt="Product" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Add image URL..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              to={`/auctions/${id}`}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save Updates'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default EditAuctionPage;
