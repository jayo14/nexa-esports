import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MobileMenu } from "@/components/MobileMenu";
import { ReportBugButton } from "@/components/ReportBugButton";

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showSidebar = false,
}) => {
  const { user, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const isMobileSize = width < 768; // md breakpoint
      
      setIsMobile(isMobileSize);
      
      if (isMobileSize) {
        setIsCollapsed(true); // Completely collapsed on mobile
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleSidebarToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!showSidebar) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed}
          isMobile={isMobile}
        />
      </div>
      
      {/* Mobile Menu - Hamburger menu for secondary pages */}
      {isMobile && <MobileMenu />}
      
      <div className={`
        min-h-screen transition-all duration-300
        ${showSidebar 
          ? (isMobile 
            ? 'ml-0 pb-20' // Add padding bottom for mobile dock
            : (isCollapsed ? 'ml-16' : 'ml-64'))
          : 'ml-0'
        }
      `}>
        <div className="sticky top-0 z-40">
          <Header onSidebarToggle={handleSidebarToggle} />
        </div>
        <main className="p-4 md:p-6 overflow-auto">{children}</main>
        <ReportBugButton />
      </div>
      
      {/* Bottom Dock Navigation - Only on mobile */}
      {isMobile && <BottomNavigation />}
    </div>
  );
};
