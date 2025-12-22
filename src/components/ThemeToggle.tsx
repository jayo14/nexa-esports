
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { mode, toggleMode } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleMode}
      className="relative overflow-hidden transition-all duration-300 hover:bg-primary/10 hover:text-primary"
    >
      <Sun className={`h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 ${mode === 'dark' ? 'rotate-90 scale-0' : ''}`} />
      <Moon className={`absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 ${mode === 'dark' ? 'rotate-0 scale-100' : ''}`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

