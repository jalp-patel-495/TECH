import React, { useState } from 'react';
import { 
  Lock, 
  Key, 
  Bell, 
  DollarSign, 
  Moon, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Save 
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SettingsSection = () => {
  const { user } = useAuth();

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Preferences state
  const [preferences, setPreferences] = useState(
    user?.preferences || {
      emailNotifications: true,
      bidAlerts: true,
      outbidAlerts: true,
      theme: 'dark',
      currency: 'USD',
    }
  );
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState('');

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.put('/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res.data.success) {
        setPasswordSuccess(res.data.message || 'Password changed successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePreferencesSave = async () => {
    setPrefLoading(true);
    setPrefSuccess('');
    try {
      const res = await api.put('/users/settings', { preferences });
      if (res.data.success) {
        setPrefSuccess('Platform preferences saved successfully!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPrefLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Change Password Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-400" />
            Security & Change Password
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Ensure your account is protected with a resilient, bcrypt-hashed master key.
          </p>
        </div>

        {passwordSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}
        {passwordError && (
          <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase">Current Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="At least 6 chars"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {passwordLoading ? 'Updating Key...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Account Preferences Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            Notification & Platform Preferences
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Configure how and when the auction engine alerts you.
          </p>
        </div>

        {prefSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{prefSuccess}</span>
          </div>
        )}

        <div className="space-y-4 max-w-xl">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div>
              <p className="text-xs font-bold text-white">Outbid Alert Notifications</p>
              <p className="text-[11px] text-slate-400">Receive instant push notification when someone tops your bid</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.outbidAlerts}
              onChange={(e) => setPreferences({ ...preferences, outbidAlerts: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div>
              <p className="text-xs font-bold text-white">Live Bidding Activity</p>
              <p className="text-[11px] text-slate-400">Sound and visual alerts when lots in your watchlist receive bids</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.bidAlerts}
              onChange={(e) => setPreferences({ ...preferences, bidAlerts: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div>
              <p className="text-xs font-bold text-white">Display Currency</p>
              <p className="text-[11px] text-slate-400">Default valuation currency across auction listings</p>
            </div>
            <select
              value={preferences.currency}
              onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <button
            onClick={handlePreferencesSave}
            disabled={prefLoading}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all border border-slate-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            {prefLoading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
