import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import NotificationBell from './NotificationBell';
import { 
  Gavel, 
  User, 
  LogOut, 
  LayoutDashboard, 
  ShieldCheck, 
  Radio, 
  Menu, 
  X,
  ChevronDown,
  Sparkles,
  Layers,
  Award,
  PlusCircle,
  Package
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, role, logout } = useAuth();
  const { connected, viewerCount } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    setProfileDropdownOpen(false);
    navigate('/', { replace: true });
  };

  const getRoleBadge = (roleName) => {
    switch (roleName) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldCheck className="w-3 h-3" />
            ADMIN
          </span>
        );
      case 'seller':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Layers className="w-3 h-3" />
            SELLER
          </span>
        );
      case 'buyer':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Award className="w-3 h-3" />
            BUYER
          </span>
        );
    }
  };

  const isSellerOrAdmin = role === 'seller' || role === 'admin';

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-[#0a0f1d]/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <Gavel className="w-6 h-6 text-white transform -rotate-12 group-hover:rotate-0 transition-transform duration-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white font-mono">
                  LIVE<span className="text-blue-500">BID</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide font-medium">Enterprise Auction Matrix</p>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/auctions" 
              className={`text-sm font-medium transition-colors ${
                location.pathname.startsWith('/auctions') && location.pathname !== '/auctions/create'
                  ? 'text-blue-400' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Auctions
            </Link>

            {isSellerOrAdmin && (
              <>
                <Link
                  to="/seller/dashboard"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === '/seller/dashboard' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Seller Hub
                </Link>
                <Link
                  to="/my-auctions"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === '/my-auctions' ? 'text-blue-400' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  My Lots
                </Link>
              </>
            )}

            <Link 
              to="/dashboard" 
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/dashboard' ? 'text-blue-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              Dashboard
            </Link>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
              <Radio className={`w-3.5 h-3.5 ${connected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span>{viewerCount} Online</span>
            </div>
          </nav>

          {/* Auth State & Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isSellerOrAdmin && (
              <Link
                to="/auctions/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/25 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                List Auction
              </Link>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-slate-600 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white leading-tight">{user?.name}</p>
                    <div className="mt-0.5">{getRoleBadge(role)}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                    </div>
                    
                    <Link
                      to="/dashboard"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-blue-400" />
                      Main Dashboard
                    </Link>

                    {isSellerOrAdmin && (
                      <>
                        <Link
                          to="/seller/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                        >
                          <Layers className="w-4 h-4 text-emerald-400" />
                          Seller Dashboard
                        </Link>
                        <Link
                          to="/my-auctions"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                        >
                          <Package className="w-4 h-4 text-blue-400" />
                          My Auctions
                        </Link>
                        <Link
                          to="/auctions/create"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                        >
                          <PlusCircle className="w-4 h-4 text-cyan-400" />
                          Create New Auction
                        </Link>
                      </>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl shadow-lg shadow-blue-600/25 transition-all transform hover:-translate-y-0.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-slate-800 px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/auctions"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-white rounded-md"
          >
            Live Auctions
          </Link>

          {isSellerOrAdmin && (
            <>
              <Link
                to="/seller/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-emerald-400 hover:text-white rounded-md"
              >
                Seller Hub
              </Link>
              <Link
                to="/my-auctions"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-blue-400 hover:text-white rounded-md"
              >
                My Auctions
              </Link>
              <Link
                to="/auctions/create"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-cyan-400 hover:text-white rounded-md"
              >
                + Create Auction
              </Link>
            </>
          )}

          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-white rounded-md"
          >
            User Dashboard
          </Link>

          {isAuthenticated ? (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-sm font-semibold text-white">{user?.name}</span>
                {getRoleBadge(role)}
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-base font-medium text-rose-400 rounded-md"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-medium text-slate-200 bg-slate-800 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
