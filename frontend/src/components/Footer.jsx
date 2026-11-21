import React from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Shield, Zap, Globe, Heart, CheckCircle2 } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070b16] text-slate-400 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <Gavel className="w-5 h-5 -rotate-12" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-mono">
                LIVE<span className="text-blue-500">BID</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time enterprise auction platform. Powered by PostgreSQL, Redis, Socket.IO, and secure JWT authentication.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1.5 rounded-lg w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>All Systems Operational (PostgreSQL + Redis)</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Marketplace</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/#featured" className="hover:text-blue-400 transition-colors">Featured Watches & Tech</a></li>
              <li><a href="/#categories" className="hover:text-blue-400 transition-colors">All Categories</a></li>
              <li><a href="/#live" className="hover:text-blue-400 transition-colors">Live Bidding Arena</a></li>
              <li><Link to="/register" className="hover:text-blue-400 transition-colors">Join as Verified Seller</Link></li>
            </ul>
          </div>

          {/* Solutions & Roles */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Role Ecosystem</h4>
            <ul className="space-y-2.5 text-sm">
              <li><span className="text-slate-300 font-medium">Buyer:</span> Real-time bidding & wallet escrow</li>
              <li><span className="text-slate-300 font-medium">Seller:</span> Inventory listing & instant payouts</li>
              <li><span className="text-slate-300 font-medium">Admin:</span> Platform analytics & governance</li>
              <li><span className="text-slate-300 font-medium">RBAC:</span> JWT role-enforced endpoints</li>
            </ul>
          </div>

          {/* Security & Tech */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Architecture</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Node.js + Express REST API</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>PostgreSQL 18 Transaction DB</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Redis In-Memory Session Cache</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Socket.IO Sub-50ms Bids</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Bcrypt + Signed JWT Auth</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} LiveBid Auction Platform. Built for Senior Full-Stack Architecture.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-300 cursor-pointer">Security Protocol</span>
            <span className="hover:text-slate-300 cursor-pointer">API Status</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
