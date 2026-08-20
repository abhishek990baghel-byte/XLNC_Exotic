import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, ShoppingCart, ShoppingBag, Settings as SettingsIcon, ScanLine, ArrowRightLeft, LogOut, Shield, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Settings } from '../types';
import GlobalSearch from './GlobalSearch';
import { motion } from 'motion/react';
import ErrorBoundary from './ErrorBoundary';
import XLNCLogo from './XLNCLogo';
import { useAuth } from '../context/AuthContext';

import { parseResponseJson } from '../utils/safeFetch';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const { user, role, logout } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            navigate('/sales');
            break;
          case 'm':
            e.preventDefault();
            navigate('/materials');
            break;
          case 'd':
            e.preventDefault();
            navigate('/');
            break;
          case 'p':
            e.preventDefault();
            navigate('/purchases');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => parseResponseJson<any>(res, null))
      .then(data => setSettings(data))
      .catch(() => setSettings(null));
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home, show: role === 'admin', shortcut: 'Ctrl+D' },
    { name: 'Materials', path: '/materials', icon: Package, show: true, shortcut: 'Ctrl+M' },
    { name: 'Scan & Cart', path: '/scan', icon: ScanLine, show: true },
    { name: 'Sales', path: '/sales', icon: ShoppingCart, show: role === 'admin', shortcut: 'Ctrl+S' },
    { name: 'Purchases', path: '/purchases', icon: ShoppingBag, show: role === 'admin', shortcut: 'Ctrl+P' },
    { name: 'Stock Ledger', path: '/ledger', icon: ArrowRightLeft, show: role === 'admin' },
    { name: 'Staff & Users', path: '/users', icon: Users, show: role === 'admin' },
    { name: 'Audit Log', path: '/audit', icon: Shield, show: role === 'admin' },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, show: role === 'admin' },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const userInitial = user?.displayName ? user.displayName.charAt(0) : (user?.email ? user.email.charAt(0) : 'U');

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-64 bg-[#0a0a0a] border-r border-zinc-900 flex flex-col text-white">
        <div className="p-4 border-b border-zinc-900 flex items-center justify-center flex-col gap-2">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="max-h-24 object-contain" />
          ) : (
            <XLNCLogo className="w-16 h-16" />
          )}
          <h1 className="font-bold text-white text-center uppercase text-xs tracking-widest mt-1">
            {settings?.business_name || 'XLNC Exotic Homes'}
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300 ease-in-out group ${
                  isActive 
                    ? 'text-black shadow-sm' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 bg-[#D4AF37] rounded-lg"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                {!isActive && (
                  <div className="absolute inset-0 bg-zinc-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                )}
                <div className="relative flex items-center gap-3 z-10">
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${!isActive && 'group-hover:scale-110'}`} />
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
                {item.shortcut && (
                  <span className={`relative z-10 text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors duration-300 ${isActive ? 'border-[#b8952b] bg-[#c29e30] text-black' : 'border-zinc-800 bg-zinc-900 text-zinc-500'}`}>
                    {item.shortcut}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Session Info in Sidebar */}
        <div className="p-4 border-t border-zinc-900 space-y-2">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-[#D4AF37] uppercase border border-zinc-700">
                {userInitial}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.displayName || (role === 'admin' ? 'Administrator' : 'Staff Member')}</p>
              <p className="text-[11px] text-zinc-400 truncate">{user?.email || 'user@xlncexotic.com'}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-colors text-zinc-400 hover:text-red-400 hover:bg-red-400/10 cursor-pointer text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between z-10">
          <div className="flex-1 flex justify-center">
            <GlobalSearch />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="w-full">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
