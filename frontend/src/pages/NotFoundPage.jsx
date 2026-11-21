import React from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 text-center">
      <div className="glass-panel p-10 rounded-3xl border border-slate-800 max-w-md w-full space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
          <Gavel className="w-8 h-8 -rotate-12" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-white">404</h1>
          <p className="text-lg font-semibold text-slate-200 mt-2">Auction Lot Not Found</p>
          <p className="text-xs text-slate-400 mt-1">
            The page or auction listing you are looking for does not exist or has closed.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all"
        >
          <Home className="w-4 h-4" />
          Back to Live Arena
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
