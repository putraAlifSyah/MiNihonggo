import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

export default function Layout({ children }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Detect sidebar width for content offset
  useEffect(() => {
    const checkSidebar = () => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar && window.innerWidth >= 1024) {
        setSidebarCollapsed(sidebar.classList.contains('w-[72px]'));
      }
    };

    const observer = new MutationObserver(checkSidebar);
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    checkSidebar();
    window.addEventListener('resize', checkSidebar);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkSidebar);
    };
  }, []);

  return (
    <div className="min-h-screen bg-grid">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="orb w-[400px] h-[400px] bg-sakura/20"
          style={{ top: '10%', right: '10%', animationDelay: '0s' }}
        />
        <div
          className="orb w-[300px] h-[300px] bg-purple/20"
          style={{ bottom: '20%', left: '5%', animationDelay: '-7s' }}
        />
        <div
          className="orb w-[250px] h-[250px] bg-red-jp/15"
          style={{ top: '50%', left: '40%', animationDelay: '-14s' }}
        />
      </div>

      <Sidebar />

      {/* Main Content */}
      <main
        className="relative z-10 transition-all duration-350 ease-in-out min-h-screen"
        style={{
          marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024
            ? (sidebarCollapsed ? '72px' : '260px')
            : '0',
        }}
      >
        <div className="p-4 pt-16 lg:p-8 lg:pt-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
