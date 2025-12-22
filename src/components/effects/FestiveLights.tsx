
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const FestiveLights: React.FC = () => {
  const { currentTheme } = useTheme();

  if (currentTheme !== 'christmas') return null;

  return (
    <div className="fixed top-0 left-0 w-full h-4 z-[60] pointer-events-none overflow-hidden flex justify-between items-start px-2">
      {/* Light Cord */}
      <div className="absolute top-[-2px] left-0 w-full h-[2px] bg-gray-600/50"></div>
      
      {Array.from({ length: 20 }).map((_, i) => {
        const colors = ['bg-red-500', 'bg-green-500', 'bg-yellow-400', 'bg-blue-500'];
        const color = colors[i % colors.length];
        const delay = (i * 0.1) + 's';
        
        return (
          <div
            key={i}
            className={`
              relative w-2 h-3 rounded-full ${color} shadow-lg 
              animate-pulse origin-top
            `}
            style={{
              animationDuration: '2s',
              animationDelay: delay,
              boxShadow: `0 2px 10px ${color === 'bg-yellow-400' ? '#facc15' : color.replace('bg-', '')}`
            }}
          >
            {/* Socket */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gray-700 rounded-sm"></div>
          </div>
        );
      })}
    </div>
  );
};
