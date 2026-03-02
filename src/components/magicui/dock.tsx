import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DockProps {
  className?: string;
  children: React.ReactNode;
}

interface DockIconProps {
  className?: string;
  children: React.ReactNode;
}

export const Dock: React.FC<DockProps> = ({ className, children }) => {
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'mx-auto flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-2xl backdrop-blur-xl',
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const DockIcon: React.FC<DockIconProps> = ({ className, children }) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={cn('relative', className)}
    >
      {children}
    </motion.div>
  );
};
