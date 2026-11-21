import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Gavel, 
  Upload, 
  Image as ImageIcon, 
  DollarSign, 
  Calendar, 
  Tag, 
  Sparkles, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Trash2,
  Clock
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreateAuctionPage = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Luxury Watches');
  const [startingBid, setStartingBid] = useState('500');
  const [bidIncrement, setBidIncrement] = useState('25');
  
  // Default start: now, default end: 3 days from now
  const nowStr = new Date().toISOString().slice(0, 16);
  const defaultEnd = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 16);
  const [startTime, setStartTime] = useState(nowStr);
  const [endTime, setEndTime] = useState(defaultEnd);

  // Images state
  const [imageUrls, setImageUrls] = useState([
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success && res.data.categories.length > 0) {
          setCategories(res.data.categories);
          setCategory(res.data.categories[0].name);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCats();
  }, []);

  // Handle File Upload via Multer
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    setUploading(true);
    setError('');

    try {
      const res = await api.post('/auctions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.images) {
        setImageUrls((prev) => [...prev, ...res.data.images]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload product images.');
    } finally {
      setUploading(false);
    }
  };

  // Add custom URL
  const handleAddUrl = () => {
    if (newImageUrl.trim()) {
      setImageUrls((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  // Remove image
  const removeImage = (index) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim()) {
      setError('Please provide product name and description.');
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setError('Auction end time must occur after the start time.');
      return;
    }

    if (imageUrls.length === 0) {
      setError('Please provide at least one product image.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        starting_bid: parseFloat(startingBid),
        bid_increment: parseFloat(bidIncrement),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        images: imageUrls,
        image_url: imageUrls[0],
      };

      const res = await api.post('/auctions', payload);
      if (res.data.success) {
        navigate(`/auctions/${res.data.auction.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create auction lot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div>
            <Link
              to="/seller/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Seller Hub
            </Link>
            <h1 className="text-3xl font-extrabold text-white">Create New Live Auction</h1>
            <p className="text-xs text-slate-400 mt-1">
              List a verified product lot with automated real-time bidding rules.
            </p>
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

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Form Fields (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Basic Details Card */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-400" />
                Product Details
              </h3>

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 1982 Vintage Rolex Submariner Date"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Product Description *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail condition, authenticity certificates, provenance, and special specifications..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                ></textarea>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Product Images Card */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  Product Images
                </h3>
                <span className="text-[11px] text-slate-400">Up to 5 images</span>
              </div>

              {/* Drag/Drop & File Input */}
              <div className="p-6 border-2 border-dashed border-slate-700 rounded-2xl text-center bg-slate-950/40 hover:border-blue-500 transition-colors">
                <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-white">Upload High-Resolution Product Images</p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">PNG, JPG, WEBP up to 10MB each</p>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-all">
                  <span>Browse Device Files</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {uploading && <p className="text-xs text-blue-400 mt-2 animate-pulse">Uploading images to server...</p>}
              </div>

              {/* Or Add Via URL */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Or Paste Image URL:</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddUrl}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                  {imageUrls.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={img} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Pricing & Timing Card */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Pricing & Timing Rules
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Starting Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Starting Price ($ USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={startingBid}
                      onChange={(e) => setStartingBid(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Min Increment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Minimum Bid Increment ($) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={bidIncrement}
                      onChange={(e) => setBidIncrement(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Start Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    Auction Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* End Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    Auction End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Live Card Preview & Actions (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 sticky top-28">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Live Card Preview
              </h3>

              {/* Preview Card */}
              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-xl">
                <div className="relative aspect-[16/10] bg-slate-900">
                  <img
                    src={imageUrls[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    PREVIEW
                  </div>
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 text-[10px] text-blue-300">
                    {category}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <h4 className="font-bold text-white text-sm line-clamp-1">{title || 'Your Product Title'}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{description || 'Product description will appear here...'}</p>
                  
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Starting Bid</p>
                      <p className="text-base font-black text-white font-mono">${parseFloat(startingBid || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase">Increment</p>
                      <p className="text-xs font-bold text-blue-400 font-mono">+${parseFloat(bidIncrement || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Gavel className="w-4 h-4" />
                  {loading ? 'Publishing Lot...' : 'Publish Live Auction'}
                </button>
                <Link
                  to="/seller/dashboard"
                  className="w-full py-2.5 text-center text-xs text-slate-400 hover:text-white block"
                >
                  Cancel and Return
                </Link>
              </div>

            </div>

          </div>

        </form>

      </div>
    </div>
  );
};

export default CreateAuctionPage;
