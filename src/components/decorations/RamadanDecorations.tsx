import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const RamadanDecorations: React.FC = () => {
  const { currentTheme } = useTheme();

  if (currentTheme !== 'ramadan') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[45] overflow-hidden opacity-40">
      {/* Top Left Crescent */}
      <div className="absolute top-10 left-10 w-24 h-24 text-amber-400/20 rotate-[-15deg]">
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </div>

      {/* Geometric Overlay for main sections - will be applied via CSS classes mainly, but here are some floaters */}
      <div className="absolute top-1/4 right-[-50px] w-64 h-64 border border-amber-500/5 rounded-full rotate-45 flex items-center justify-center">
        <div className="w-48 h-48 border border-amber-500/5 rounded-full flex items-center justify-center">
          <div className="w-32 h-32 border border-amber-500/5 rotate-45" />
        </div>
      </div>

      <div className="absolute bottom-1/4 left-[-50px] w-64 h-64 border border-amber-500/5 rounded-full -rotate-12 flex items-center justify-center">
         <div className="w-48 h-48 border border-amber-500/5 rounded-full" />
      </div>
    </div>
  );
};
