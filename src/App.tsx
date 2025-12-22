
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Layout } from '@/components/Layout';

// Public pages
import Index from '@/pages/Index';
import { Landing } from '@/pages/Landing';
import { PublicProfile } from '@/pages/PublicProfile';
import NotFound from '@/pages/NotFound';

// Auth pages
import { Login } from '@/pages/auth/Login';
import { Signup } from '@/pages/auth/Signup';
import { EmailConfirmation } from '@/pages/auth/EmailConfirmation';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { ResetPassword } from '@/pages/auth/ResetPassword';
import { Onboarding } from '@/pages/auth/Onboarding';

// Protected pages
import { Dashboard } from '@/pages/Dashboard';
import { Profile } from '@/pages/Profile';
import { Settings } from '@/pages/Settings';

import { Scrims } from '@/pages/Scrims';
import { WeaponLoadouts } from '@/pages/WeaponLoadouts';
import { Loadouts } from '@/pages/Loadouts';
import { Announcements } from '@/pages/Announcements';
import Statistics from '@/pages/Statistics';

// Admin pages
import { AdminPlayers } from '@/pages/admin/Players';

import { AdminProfiles } from '@/pages/admin/Profiles';
import { AdminLoadouts } from '@/pages/admin/Loadouts';
import { AdminWeaponLayouts } from '@/pages/admin/WeaponLayouts';
import { AdminScrimsManagement } from '@/pages/admin/ScrimsManagement';
import { AdminEventsManagement } from '@/pages/admin/EventsManagement';
import { EventAssignment } from '@/pages/admin/EventAssignment';
import { AdminAttendance } from '@/pages/admin/Attendance';
import { AdminAnnouncementsManagement } from '@/pages/admin/AnnouncementsManagement';
import { AdminNotifications } from '@/pages/admin/Notifications';
import { AdminConfig } from '@/pages/admin/Config';
import AdminDashboard from '@/pages/AdminDashboard';
import { Feedback } from '@/pages/admin/Feedback';
import Activities from '@/pages/admin/Activities';
import Wallet from '@/pages/Wallet';
import PaymentSuccess from '@/pages/payment/success';
import Earnings from '@/pages/Earnings';

import InstallPrompt from '@/components/InstallPrompt';
import { UpdatePrompt } from '@/components/UpdatePrompt';

import { SnowEffect } from '@/components/effects/SnowEffect';
import { FestiveLights } from '@/components/effects/FestiveLights';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SnowEffect />
        <FestiveLights />
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/profile/:userId" element={<PublicProfile />} />

        {/* Auth routes */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/onboarding" element={<Onboarding />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<Layout showSidebar><Dashboard /></Layout>} />
        <Route path="/profile" element={<Layout showSidebar><Profile /></Layout>} />
        <Route path="/settings" element={<Layout showSidebar><Settings /></Layout>} />

        <Route path="/scrims" element={<Layout showSidebar><Scrims /></Layout>} />
        <Route path="/weapon-layouts" element={<Layout showSidebar><WeaponLoadouts /></Layout>} />
        <Route path="/loadouts" element={<Layout showSidebar><Loadouts /></Layout>} />
        <Route path="/announcements" element={<Layout showSidebar><Announcements /></Layout>} />
        <Route path="/statistics" element={<Layout showSidebar><Statistics /></Layout>} />

        {/* Wallet route with feature flag and role-based access */}
        <Route
          path="/wallet"
          element={
            <Layout showSidebar>
              <Wallet />
            </Layout>
          }
        />
        <Route
          path="/payment-success"
          element={
            <Layout showSidebar>
              <PaymentSuccess />
            </Layout>
          }
        />

        {/* Admin routes */}
        <Route path="/admin" element={<Layout showSidebar><AdminDashboard /></Layout>} />
        <Route path="/admin/players" element={<Layout showSidebar><AdminPlayers /></Layout>} />

        <Route path="/admin/profiles" element={<Layout showSidebar><AdminProfiles /></Layout>} />
        <Route path="/admin/loadouts" element={<Layout showSidebar><AdminLoadouts /></Layout>} />
        <Route path="/admin/weapon-layouts" element={<Layout showSidebar><AdminWeaponLayouts /></Layout>} />
        <Route path="/admin/scrims" element={<Layout showSidebar><AdminScrimsManagement /></Layout>} />
        <Route path="/admin/events" element={<Layout showSidebar><AdminEventsManagement /></Layout>} />
        <Route path="/admin/events/:eventId/assign" element={<Layout showSidebar><EventAssignment /></Layout>} />
        <Route path="/admin/event-assignment" element={<Layout showSidebar><EventAssignment /></Layout>} />
        <Route path="/admin/attendance" element={<Layout showSidebar><AdminAttendance /></Layout>} />
        <Route path="/admin/announcements" element={<Layout showSidebar><AdminAnnouncementsManagement /></Layout>} />
        <Route path="/admin/notifications" element={<Layout showSidebar><AdminNotifications /></Layout>} />
        <Route path="/admin/activities" element={<Layout showSidebar><Activities /></Layout>} />
        <Route path="/admin/config" element={<Layout showSidebar><AdminConfig /></Layout>} />
        <Route path="/admin/feedback" element={<Layout showSidebar><Feedback /></Layout>} />
        <Route path="/admin/earnings" element={<Layout showSidebar><Earnings /></Layout>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
      <InstallPrompt />
      <UpdatePrompt />
    </Router>
  );
}

export default App;
