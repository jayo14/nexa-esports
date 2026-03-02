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

interface DockItemProps {
  active?: boolean;
  className?: string;
  onClick?: () => void;
  title?: string;
  ariaLabel?: string;
  ariaCurrent?: 'page' | undefined;
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

export const DockItem: React.FC<DockItemProps> = ({
  active = false,
  className,
  onClick,
  title,
  ariaLabel,
  ariaCurrent,
  children,
}) => {
  return (
    <DockIcon>
      <button
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
        aria-current={ariaCurrent}
        className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300',
          active
            ? 'bg-[rgba(236,19,30,0.28)] border border-[rgba(236,19,30,0.45)] text-[#ec131e]'
            : 'text-slate-400 hover:text-white hover:bg-white/5',
          className
        )}
      >
        {children}
      </button>
    </DockIcon>
  );
};
