import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AuctionListingPage from './pages/AuctionListingPage';
import AuctionDetailsPage from './pages/AuctionDetailsPage';
import CreateAuctionPage from './pages/CreateAuctionPage';
import EditAuctionPage from './pages/EditAuctionPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import MyAuctionsPage from './pages/MyAuctionsPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="flex flex-col min-h-screen bg-[#0a0f1d] text-slate-100">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public Pages */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* Auction Exploration */}
                <Route path="/auctions" element={<AuctionListingPage />} />
                <Route path="/auctions/:id" element={<AuctionDetailsPage />} />

                {/* Common Protected Dashboard for all roles */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Seller & Admin Protected Routes */}
                <Route
                  path="/auctions/create"
                  element={
                    <ProtectedRoute allowedRoles={['seller', 'admin']}>
                      <CreateAuctionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/auctions/:id/edit"
                  element={
                    <ProtectedRoute allowedRoles={['seller', 'admin']}>
                      <EditAuctionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/seller/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['seller', 'admin']}>
                      <SellerDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-auctions"
                  element={
                    <ProtectedRoute allowedRoles={['seller', 'admin']}>
                      <MyAuctionsPage />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Fallback */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
