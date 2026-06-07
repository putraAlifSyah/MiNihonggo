import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Layers,
  ClipboardCheck,
  PenTool,
  BarChart3,
  Trophy,
  Settings,
  Upload,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Flame,
  Bot,
  SlidersHorizontal,
} from 'lucide-react';

import { useAuth } from '../../lib/auth';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/flashcard',  icon: Layers,          label: 'Flashcard' },
  { to: '/test',       icon: ClipboardCheck,  label: 'Test' },
  { to: '/kanji',      icon: PenTool,         label: 'Kanji Practice' },
  { to: '/analytics',  icon: BarChart3,       label: 'Analytics' },
  { to: '/leaderboard',icon: Trophy,          label: 'Leaderboard' },
  { to: '/ai-tutor',   icon: Bot,             label: 'AI Tutor', aiOnly: false },
];


const adminItems = [
  { to: '/admin', icon: Settings, label: 'Admin Dashboard' },
  { to: '/admin/content', icon: Upload, label: 'Content Mgmt' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));

    return (
      <NavLink to={to} className="block">
        <div
          className={`
            relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group
            ${isActive
              ? 'bg-sakura/10 text-sakura'
              : 'text-text-muted hover:text-text-primary hover:bg-white/5'
            }
          `}
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sakura rounded-r-full"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <Icon size={20} className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-sakura' : 'group-hover:text-text-primary'}`} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </NavLink>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sakura to-purple flex items-center justify-center shrink-0">
          <span className="jp-text text-white font-bold text-lg">語</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <h1 className="jp-text font-bold text-lg text-text-primary leading-tight">日本語</h1>
              <p className="text-[11px] text-text-muted leading-tight">Nihongo Vocab</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Streak Badge */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-4 mb-4 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-jp/10 border border-orange-500/20"
        >
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-400" />
            <div>
              <span className="text-sm font-bold text-orange-400">{user?.streak || 0}</span>
              <span className="text-[11px] text-text-muted ml-1">hari streak 🔥</span>
            </div>
          </div>
        </motion.div>
      )}
      {collapsed && (
        <div className="mx-auto mb-4 w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <span className="text-sm">🔥</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="mb-2">
          {!collapsed && (
            <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-muted/60 font-semibold">Menu</p>
          )}
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        {/* Admin Section */}
        {user?.role === 'admin' && (
          <div className="pt-3 mt-3 border-t border-white/5">
            {!collapsed && (
              <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-muted/60 font-semibold">Admin</p>
            )}
            {adminItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        )}
      </nav>

      {/* Settings AI link */}
      <div className="px-3 pb-2">
        <NavItem to="/settings/ai" icon={SlidersHorizontal} label="Pengaturan AI" />
      </div>

      {/* User Section */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2'}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sakura/30 to-purple/30 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-sakura">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-[11px] text-text-muted truncate">{user?.email || ''}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-danger transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={logout}
            className="mt-2 w-full p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-danger transition-colors flex justify-center"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>

      {/* Collapse Toggle (desktop only) */}
      <div className="hidden lg:block px-3 pb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-text-primary transition-all flex items-center justify-center gap-2"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl glass text-text-primary hover:bg-white/10 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="lg:hidden fixed left-0 top-0 w-[260px] h-full z-50 sidebar"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-text-muted"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:block sidebar ${sidebarWidth}`}>
        <SidebarContent />
      </div>
    </>
  );
}
