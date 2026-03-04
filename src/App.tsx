import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Layout } from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute'; // Import ProtectedRoute

// Public pages
import Index from '@/pages/Index';
import { Landing } from '@/pages/Landing';
import { PublicProfile } from '@/pages/PublicProfile';
import NotFound from '@/pages/NotFound';
import { Blog } from '@/pages/Blog';
import { BlogPost } from '@/pages/BlogPost';
import { MarketplaceInfo } from '@/pages/MarketplaceInfo';

// Auth pages
import { Login } from '@/pages/auth/Login';
import { Signup } from '@/pages/auth/Signup';
import { EmailConfirmation } from '@/pages/auth/EmailConfirmation';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { ResetPassword } from '@/pages/auth/ResetPassword';
import { Onboarding } from '@/pages/auth/Onboarding';

// Protected pages
import { Dashboard } from '@/pages/Dashboard';
import { Chat } from '@/pages/Chat';
import { Profile } from '@/pages/Profile';
import { Settings } from '@/pages/Settings';

import { Scrims } from '@/pages/Scrims';
import { WeaponLoadouts } from '@/pages/WeaponLoadouts';
import { Loadouts } from '@/pages/Loadouts';
import { Announcements } from '@/pages/Announcements';
import Statistics from '@/pages/Statistics';
import { Marketplace } from '@/pages/Marketplace';
import { ListAccount } from '@/pages/ListAccount';
import { ListingDetails } from '@/pages/ListingDetails';
import { BuyerDashboard } from '@/pages/BuyerDashboard';
import { MyPurchases } from '@/pages/MyPurchases';
import { PurchaseDetails } from '@/pages/PurchaseDetails';

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
import { MarketplaceManagement } from '@/pages/admin/MarketplaceManagement';
import { Feedback } from '@/pages/admin/Feedback';
import Activities from '@/pages/admin/Activities';
import Wallet from '@/pages/Wallet';
import Transfer from '@/pages/wallet/Transfer';
import Withdraw from '@/pages/wallet/Withdraw';
import FundWallet from '@/pages/wallet/FundWallet';
import Airtime from '@/pages/wallet/Airtime';
import Data from '@/pages/wallet/Data';
import Giveaway from '@/pages/wallet/Giveaway';
import PaymentSuccess from '@/pages/payment/success';
import Earnings from '@/pages/Earnings';
import { MoreTransactionsScreen } from '@/components/wallet/MoreTransactionsScreen';
import { MyListingsScreen } from '@/components/marketplace/MyListingsScreen';

import InstallPrompt from '@/components/InstallPrompt';
import { UpdatePrompt } from '@/components/UpdatePrompt';

import { EventEditor } from '@/pages/admin/EventEditor';
import { EventDetails } from '@/pages/EventDetails';
import { Health } from '@/pages/Health';

import { SnowEffect } from '@/components/effects/SnowEffect';
import { FestiveLights } from '@/components/effects/FestiveLights';
import { RamadanEffects } from '@/components/effects/RamadanEffects';
import { useCapacitor } from '@/hooks/useCapacitor';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <SnowEffect />
          <FestiveLights />
          <RamadanEffects />
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

function AppRoutes() {
  const { loading } = useAuth();
  useCapacitor();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/profile/:userId" element={<PublicProfile />} />
        <Route path="/public-profile/:userId" element={<PublicProfile />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/marketplace-info" element={<MarketplaceInfo />} />
        <Route path="/events/:eventId" element={<ProtectedRoute><Layout showSidebar pageScroll><EventDetails /></Layout></ProtectedRoute>} />

        {/* Auth routes */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/onboarding" element={<Onboarding />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Layout showSidebar pageScroll><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout showSidebar><Profile /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout showSidebar><Settings /></Layout></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Layout showSidebar><Chat /></Layout></ProtectedRoute>} />
        <Route path="/chat/:conversationId" element={<ProtectedRoute><Layout showSidebar><Chat /></Layout></ProtectedRoute>} />
        <Route path="/scrims" element={<ProtectedRoute><Layout showSidebar><Scrims /></Layout></ProtectedRoute>} />
        <Route path="/weapon-layouts" element={<ProtectedRoute><Layout showSidebar><WeaponLoadouts /></Layout></ProtectedRoute>} />
        <Route path="/loadouts" element={<ProtectedRoute><Layout showSidebar><Loadouts /></Layout></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><Layout showSidebar><Announcements /></Layout></ProtectedRoute>} />
        <Route path="/statistics" element={<ProtectedRoute><Layout showSidebar><Statistics /></Layout></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><Layout showSidebar><Wallet /></Layout></ProtectedRoute>} />
        <Route path="/wallet/transfer" element={<ProtectedRoute><Layout showSidebar><Transfer /></Layout></ProtectedRoute>} />
        <Route path="/wallet/withdraw" element={<ProtectedRoute><Layout showSidebar><Withdraw /></Layout></ProtectedRoute>} />
        <Route path="/wallet/fund" element={<ProtectedRoute><Layout showSidebar><FundWallet /></Layout></ProtectedRoute>} />
        <Route path="/wallet/airtime" element={<ProtectedRoute><Layout showSidebar><Airtime /></Layout></ProtectedRoute>} />
        <Route path="/wallet/data" element={<ProtectedRoute><Layout showSidebar><Data /></Layout></ProtectedRoute>} />
        <Route path="/wallet/giveaway" element={<ProtectedRoute><Layout showSidebar><Giveaway /></Layout></ProtectedRoute>} />
        <Route path="/wallet/more-transactions" element={<ProtectedRoute><Layout showSidebar><MoreTransactionsScreen /></Layout></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute><Layout showSidebar><Marketplace /></Layout></ProtectedRoute>} />
        <Route path="/marketplace/my-listings" element={<ProtectedRoute><Layout showSidebar><MyListingsScreen /></Layout></ProtectedRoute>} />
        <Route path="/marketplace/list" element={<ProtectedRoute><Layout showSidebar><ListAccount /></Layout></ProtectedRoute>} />
        <Route path="/marketplace/listing/:listingId" element={<ProtectedRoute><Layout showSidebar><ListingDetails /></Layout></ProtectedRoute>} />
        <Route path="/marketplace/purchases" element={<ProtectedRoute><Layout showSidebar><MyPurchases /></Layout></ProtectedRoute>} />
        <Route path="/marketplace/purchases/:transactionId" element={<ProtectedRoute><Layout showSidebar><PurchaseDetails /></Layout></ProtectedRoute>} />
        <Route path="/marketplace/orders" element={<ProtectedRoute><Layout showSidebar><BuyerDashboard /></Layout></ProtectedRoute>} />
        <Route path="/payment-success" element={<ProtectedRoute><Layout showSidebar><PaymentSuccess /></Layout></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute><Layout showSidebar><AdminDashboard /></Layout></ProtectedRoute>} />
        <Route path="/admin/marketplace" element={<ProtectedRoute><Layout showSidebar><MarketplaceManagement /></Layout></ProtectedRoute>} />
        <Route path="/admin/players" element={<ProtectedRoute><Layout showSidebar><AdminPlayers /></Layout></ProtectedRoute>} />
        <Route path="/admin/loadouts" element={<ProtectedRoute><Layout showSidebar><AdminLoadouts /></Layout></ProtectedRoute>} />
        <Route path="/admin/weapon-layouts" element={<ProtectedRoute><Layout showSidebar><AdminWeaponLayouts /></Layout></ProtectedRoute>} />
        <Route path="/admin/scrims" element={<ProtectedRoute><Layout showSidebar><AdminScrimsManagement /></Layout></ProtectedRoute>} />
        <Route path="/admin/events" element={<ProtectedRoute><Layout showSidebar><AdminEventsManagement /></Layout></ProtectedRoute>} />
        <Route path="/admin/events/new" element={<ProtectedRoute><Layout showSidebar><EventEditor /></Layout></ProtectedRoute>} />
        <Route path="/admin/events/:eventId/edit" element={<ProtectedRoute><Layout showSidebar><EventEditor /></Layout></ProtectedRoute>} />
        <Route path="/admin/events/:eventId/assign" element={<ProtectedRoute><Layout showSidebar><EventAssignment /></Layout></ProtectedRoute>} />
        <Route path="/admin/event-assignment" element={<ProtectedRoute><Layout showSidebar><EventAssignment /></Layout></ProtectedRoute>} />
        <Route path="/admin/attendance" element={<ProtectedRoute><Layout showSidebar><AdminAttendance /></Layout></ProtectedRoute>} />
        <Route path="/admin/announcements" element={<ProtectedRoute><Layout showSidebar><AdminAnnouncementsManagement /></Layout></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute><Layout showSidebar><AdminNotifications /></Layout></ProtectedRoute>} />
        <Route path="/admin/activities" element={<ProtectedRoute><Layout showSidebar><Activities /></Layout></ProtectedRoute>} />
        <Route path="/admin/config" element={<ProtectedRoute allowedRoles={['clan_master']}><Layout showSidebar><AdminConfig /></Layout></ProtectedRoute>} />
        <Route path="/admin/feedback" element={<ProtectedRoute><Layout showSidebar><Feedback /></Layout></ProtectedRoute>} />
        <Route path="/admin/earnings" element={<ProtectedRoute><Layout showSidebar><Earnings /></Layout></ProtectedRoute>} />
        <Route path="/admin/seasons" element={<ProtectedRoute><Layout showSidebar><AdminSeasons /></Layout></ProtectedRoute>} />
        <Route path="/health" element={<ProtectedRoute allowedRoles={['clan_master']}><Layout showSidebar><Health /></Layout></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
      <InstallPrompt />
      <UpdatePrompt />
    </>
  );
}

export default App;
