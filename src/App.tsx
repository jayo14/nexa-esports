import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Layout } from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute'; // Import ProtectedRoute

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
import { Airtime } from '@/pages/Airtime';

// Admin pages
import { AdminPlayers } from '@/pages/admin/Players';

// Note: AdminProfiles is not used, but keeping it commented in case it's needed later
// import { AdminProfiles } from '@/pages/admin/Profiles';
import { AdminLoadouts } from '@/pages/admin/Loadouts';
import { AdminWeaponLayouts } from '@/pages/admin/WeaponLayouts';
import { AdminScrimsManagement } from '@/pages/admin/ScrimsManagement';
import { AdminEventsManagement } from '@/pages/admin/EventsManagement';
import { EventAssignment } from '@/pages/admin/EventAssignment';
import { AdminAttendance } from '@/pages/admin/Attendance';
import { AdminAnnouncementsManagement } from '@/pages/admin/AnnouncementsManagement';
import { AdminNotifications } from '@/pages/admin/Notifications';
import { AdminConfig } from '@/pages/admin/Config';
import { AdminSeasons } from '@/pages/admin/Seasons';
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
        <Route path="/dashboard" element={<ProtectedRoute><Layout showSidebar><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout showSidebar><Profile /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout showSidebar><Settings /></Layout></ProtectedRoute>} />
        <Route path="/scrims" element={<ProtectedRoute><Layout showSidebar><Scrims /></Layout></ProtectedRoute>} />
        <Route path="/weapon-layouts" element={<ProtectedRoute><Layout showSidebar><WeaponLoadouts /></Layout></ProtectedRoute>} />
        <Route path="/loadouts" element={<ProtectedRoute><Layout showSidebar><Loadouts /></Layout></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><Layout showSidebar><Announcements /></Layout></ProtectedRoute>} />
        <Route path="/statistics" element={<ProtectedRoute><Layout showSidebar><Statistics /></Layout></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><Layout showSidebar><Wallet /></Layout></ProtectedRoute>} />
        <Route path="/airtime" element={<ProtectedRoute><Layout showSidebar><Airtime /></Layout></ProtectedRoute>} />
        <Route path="/payment-success" element={<ProtectedRoute><Layout showSidebar><PaymentSuccess /></Layout></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute><Layout showSidebar><AdminDashboard /></Layout></ProtectedRoute>} />
        <Route path="/admin/players" element={<ProtectedRoute><Layout showSidebar><AdminPlayers /></Layout></ProtectedRoute>} />
        <Route path="/admin/loadouts" element={<ProtectedRoute><Layout showSidebar><AdminLoadouts /></Layout></ProtectedRoute>} />
        <Route path="/admin/weapon-layouts" element={<ProtectedRoute><Layout showSidebar><AdminWeaponLayouts /></Layout></ProtectedRoute>} />
        <Route path="/admin/scrims" element={<ProtectedRoute><Layout showSidebar><AdminScrimsManagement /></Layout></ProtectedRoute>} />
        <Route path="/admin/events" element={<ProtectedRoute><Layout showSidebar><AdminEventsManagement /></Layout></ProtectedRoute>} />
        <Route path="/admin/events/:eventId/assign" element={<ProtectedRoute><Layout showSidebar><EventAssignment /></Layout></ProtectedRoute>} />
        <Route path="/admin/event-assignment" element={<ProtectedRoute><Layout showSidebar><EventAssignment /></Layout></ProtectedRoute>} />
        <Route path="/admin/attendance" element={<ProtectedRoute><Layout showSidebar><AdminAttendance /></Layout></ProtectedRoute>} />
        <Route path="/admin/announcements" element={<ProtectedRoute><Layout showSidebar><AdminAnnouncementsManagement /></Layout></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute><Layout showSidebar><AdminNotifications /></Layout></ProtectedRoute>} />
        <Route path="/admin/activities" element={<ProtectedRoute><Layout showSidebar><Activities /></Layout></ProtectedRoute>} />
        <Route path="/admin/config" element={<ProtectedRoute><Layout showSidebar><AdminConfig /></Layout></ProtectedRoute>} />
        <Route path="/admin/feedback" element={<ProtectedRoute><Layout showSidebar><Feedback /></Layout></ProtectedRoute>} />
        <Route path="/admin/earnings" element={<ProtectedRoute><Layout showSidebar><Earnings /></Layout></ProtectedRoute>} />
        <Route path="/admin/seasons" element={<ProtectedRoute><Layout showSidebar><AdminSeasons /></Layout></ProtectedRoute>} />

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