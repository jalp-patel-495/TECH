import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  UserX, 
  Gavel, 
  Radio, 
  Clock, 
  Trophy, 
  ListFilter, 
  Tag, 
  Bell, 
  BarChart2, 
  User, 
  Settings, 
  LogOut, 
  Package, 
  PlusCircle, 
  Heart, 
  XCircle, 
  ShieldCheck, 
  Layers, 
  Award,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

import AdminPanel from '../components/dashboard/AdminPanel';
import SellerPanel from '../components/dashboard/SellerPanel';
import BuyerPanel from '../components/dashboard/BuyerPanel';

const DashboardPage = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(tabParam);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const current = searchParams.get('tab');
    if (current && current !== activeTab) {
      setActiveTab(current);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
    setMobileSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  // 16 Admin Sidebar Options
  const adminMenuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'manage-users', label: 'Manage Users', icon: Users },
    { key: 'manage-buyers', label: 'Manage Buyers', icon: UserCheck },
    { key: 'manage-sellers', label: 'Manage Sellers', icon: UserX },
    { key: 'all-auctions', label: 'All Auctions', icon: Package },
    { key: 'live-auctions', label: 'Live Auctions', icon: Radio },
    { key: 'upcoming-auctions', label: 'Upcoming Auctions', icon: Clock },
    { key: 'completed-auctions', label: 'Completed Auctions', icon: Trophy },
    { key: 'bid-history', label: 'Bid History', icon: Gavel },
    { key: 'winner-management', label: 'Winner Management', icon: Award },
    { key: 'categories', label: 'Categories', icon: Tag },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'reports', label: 'Reports & Analytics', icon: BarChart2 },
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  // 13 Seller Sidebar Options
  const sellerMenuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'create-auction', label: 'Create Auction', icon: PlusCircle },
    { key: 'my-auctions', label: 'My Auctions', icon: Package },
    { key: 'active-auctions', label: 'Active Auctions', icon: Radio },
    { key: 'upcoming-auctions', label: 'Upcoming Auctions', icon: Clock },
    { key: 'completed-auctions', label: 'Completed Auctions', icon: Trophy },
    { key: 'bid-history', label: 'Bid History', icon: Gavel },
    { key: 'auction-results', label: 'Auction Results', icon: BarChart2 },
    { key: 'winner-details', label: 'Winner Details', icon: Award },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  // 13 Buyer Sidebar Options
  const buyerMenuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'browse-auctions', label: 'Browse Auctions', icon: Package },
    { key: 'live-auctions', label: 'Live Auctions', icon: Radio },
    { key: 'upcoming-auctions', label: 'Upcoming Auctions', icon: Clock },
    { key: 'my-active-bids', label: 'My Active Bids', icon: Gavel },
    { key: 'my-won-auctions', label: 'My Won Auctions', icon: Trophy },
    { key: 'my-lost-auctions', label: 'My Lost Auctions', icon: XCircle },
    { key: 'bid-history', label: 'Bid History', icon: BarChart2 },
    { key: 'watchlist', label: 'Watchlist', icon: Heart },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  const menuItems = role === 'admin' ? adminMenuItems : role === 'seller' ? sellerMenuItems : buyerMenuItems;

  const renderRoleBadge = () => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          ADMINISTRATOR
        </span>
      );
    }
    if (role === 'seller') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Layers className="w-3.5 h-3.5" />
          VERIFIED SELLER
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
        <Award className="w-3.5 h-3.5" />
        ACTIVE BUYER
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col">
      {/* Mobile Sidebar Toggle Bar */}
      <div className="lg:hidden p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
        >
          {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>{menuItems.find((m) => m.key === activeTab)?.label || 'Dashboard Menu'}</span>
        </button>
        {renderRoleBadge()}
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* SIDEBAR NAVIGATION */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950/95 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none p-5 lg:p-0 border-r lg:border-r-0 border-slate-800 transform lg:transform-none transition-transform duration-200 lg:static lg:block shrink-0 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-4">
            {/* User Quick Info */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt={user?.name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-700"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <div className="mt-0.5">{renderRoleBadge()}</div>
              </div>
            </div>

            {/* Nav Menu Items */}
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleTabChange(item.key)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                  </button>
                );
              })}

              {/* Logout Option */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors pt-3 border-t border-slate-800/80 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 min-w-0">
          {role === 'admin' && (
            <AdminPanel
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              handleLogout={handleLogout}
            />
          )}

          {role === 'seller' && (
            <SellerPanel
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              handleLogout={handleLogout}
            />
          )}

          {role === 'buyer' && (
            <BuyerPanel
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              handleLogout={handleLogout}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
