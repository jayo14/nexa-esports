import React, { useState, useEffect } from 'react';
import { X, Moon, Star } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export const RamadanBanner: React.FC = () => {
  const { currentTheme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hidden = localStorage.getItem('ramadan-banner-hidden');
    if (currentTheme === 'ramadan' && !hidden) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [currentTheme]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('ramadan-banner-hidden', 'true');
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="w-full bg-gradient-to-r from-amber-900/40 via-amber-600/20 to-amber-900/40 border-b border-amber-500/20 backdrop-blur-md relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-4 text-amber-200">
          <Moon className="w-5 h-5 fill-amber-200/20" />
          <p className="text-sm md:text-base font-orbitron font-medium tracking-wide">
            Ramadan Mubarak to all our Warriors! May this month bring peace and prosperity.
          </p>
          <Star className="w-4 h-4 fill-amber-200/20 animate-pulse" />

          <button
            onClick={handleDismiss}
            className="absolute right-4 p-1 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Animated glow line */}
        <motion.div
          className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent w-full"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    </AnimatePresence>
  );
};
