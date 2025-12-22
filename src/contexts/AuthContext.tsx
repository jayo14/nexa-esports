import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { arrayBufferToBase64, urlBase64ToUint8Array } from "@/lib/pushUtils";

interface UserProfile {
  id: string;
  username: string;
  ign: string;
  player_uid: string;
  role: "admin" | "player" | "moderator" | "clan_master";
  avatar_url?: string;
  tiktok_handle?: string;
  preferred_mode?: string;
  device?: string;
  kills: number;
  br_kills?: number;
  mp_kills?: number;
  attendance: number;
  tier: string;
  grade: string;
  date_joined: string;
  updated_at?: string;
  social_links?: Record<string, string> | null;
  banking_info?: Record<string, string> | null;
  br_class?: string;
  mp_class?: string;
  best_gun?: string;
  status?: string;
  is_banned?: boolean;
  ban_reason?: string;
  ban_expires_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  displayRole: string;
}

interface SignupData {
  username: string;
  email: string;
  password: string;
  ign?: string;
  role?: "admin" | "player" | "moderator" | "clan_master";
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Profile fetch error:", error);
        return;
      }

      // Check for ban
      if (data.is_banned) {
        const banExpiresAt = data.ban_expires_at ? new Date(data.ban_expires_at) : null;
        const now = new Date();

        if (banExpiresAt && now > banExpiresAt) {
          // Ban expired, unban user
          console.log("Ban expired, unbanning user...");
          await supabase
            .from("profiles")
            .update({ 
              is_banned: false, 
              ban_reason: null, 
              banned_at: null, 
              ban_expires_at: null 
            } as any)
            .eq("id", userId);
            
          data.is_banned = false;
        } else {
          // Active ban
          console.log("User is banned");
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          
          let description = `Reason: ${data.ban_reason || 'Violation of rules'}.`;
          if (banExpiresAt) {
            const diffTime = Math.abs(banExpiresAt.getTime() - now.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            description += ` Ban expires in ${diffDays} day(s).`;
          } else {
            description += " This ban is permanent.";
          }

          toast({
            title: "Account Banned",
            description: description,
            variant: "destructive",
            duration: 10000,
          });
          return;
        }
      }

      setProfile({
        ...data,
        player_uid: (data as any).player_uid || "",
        social_links: data.social_links as Record<string, string> | null,
        banking_info: data.banking_info as Record<string, string> | null,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn("Auth loading timeout - forcing completion");
        setLoading(false);
      }
    }, 3000);

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session fetch error:", error);
          return;
        }

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) {
          clearTimeout(loadingTimeout);
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log("Auth event:", event);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchProfile(session.user.id);
          
          // Handle push notifications in background
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              handlePushNotificationSetup(session.user.id);
            }, 100);
          }
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Handle push notification setup on login
   * This function:
   * 1. Shows a welcome notification if permission is granted
   * 2. Creates or updates the push subscription in the database
   * 3. Subscribes to VAPID-based web push if not already subscribed
   * 
   * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
   */
  const handlePushNotificationSetup = async (userId: string) => {
    try {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("Notification" in window)
      ) {
        console.log("[Push] Browser does not support push notifications");
        return;
      }

      // Check notification permission
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Notification/permission
      if (Notification.permission !== "granted") {
        console.log("[Push] Notification permission not granted, skipping setup");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      console.log("[Push] Service worker ready for push notifications");
      
      // Show immediate local notification as greeting
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
      try {
        await registration.showNotification("Welcome Soldier! 🎮", {
          body: "Onward to the frontline! Push notifications are working.",
          icon: "/nexa-logo.jpg",
          badge: "/pwa-192x192.png",
          tag: "login-greeting",
          vibrate: [100, 50, 100],
          requireInteraction: false,
          data: {
            url: "/dashboard",
            timestamp: Date.now(),
          },
        });
        console.log("[Push] Welcome notification shown successfully");
      } catch (notifError) {
        console.error("[Push] Failed to show welcome notification:", notifError);
      }

      // Handle push subscription for VAPID-based web push
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/PushManager
      if ("PushManager" in window) {
        let subscription = await registration.pushManager.getSubscription();
        
        // If no subscription exists, create one using VAPID key
        if (!subscription) {
          const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          
          if (vapidKey) {
            console.log("[Push] No existing subscription, creating new one with VAPID");
            try {
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
              });
              console.log("[Push] New subscription created successfully");
            } catch (subscribeError) {
              console.error("[Push] Failed to create subscription:", subscribeError);
            }
          } else {
            console.warn("[Push] VAPID key not configured, cannot create subscription");
          }
        }
        
        // Save subscription to database if we have one
        if (subscription) {
          const p256dh = subscription.getKey?.("p256dh") ?? null;
          const auth = subscription.getKey?.("auth") ?? null;

          if (p256dh && auth) {
            const subscriptionData = {
              user_id: userId,
              endpoint: subscription.endpoint,
              p256dh_key: arrayBufferToBase64(p256dh),
              auth_key: arrayBufferToBase64(auth),
            };

            const { error } = await supabase
              .from("push_subscriptions")
              .upsert(subscriptionData, { onConflict: "user_id" });
            
            if (error) {
              console.error("[Push] Failed to save subscription to database:", error);
            } else {
              console.log("[Push] Subscription saved to database successfully");
            }
          } else {
            console.warn("[Push] Subscription keys not available");
          }
        }
      } else {
        console.log("[Push] PushManager not available in this browser");
      }
    } catch (err) {
      console.error("[Push] Push notification setup error:", err);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("Attempting login for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      console.log("Login successful for:", data.user?.email);
      return true;
    } catch (error: any) {
      console.error("Login exception:", error);
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const signup = async (signupData: SignupData): Promise<boolean> => {
    try {
      console.log("Attempting signup for:", signupData.email);
      const redirectUrl = `${window.location.origin}/auth/email-confirmation`;

      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: signupData.username,
            ign: signupData.ign || signupData.username,
            role: signupData.role || "player",
          },
        },
      });

      if (error) {
        console.error("Signup error:", error);
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      console.log("Signup successful for:", data.user?.email);

      if (data.user && !data.session) {
        toast({
          title: "Check Your Email",
          description: "Please check your email to confirm your account.",
        });
      }

      return true;
    } catch (error: any) {
      console.error("Signup exception:", error);
      toast({
        title: "Signup Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      console.log("Attempting logout");
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        throw error;
      }
      setUser(null);
      setSession(null);
      setProfile(null);
      console.log("Logout successful");
    } catch (error: any) {
      console.error("Logout exception:", error);
      toast({
        title: "Logout Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      console.log("Attempting password reset for:", email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error("Reset password error:", error);
        toast({
          title: "Password Reset Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for password reset instructions.",
      });
      return true;
    } catch (error: any) {
      console.error("Reset password exception:", error);
      toast({
        title: "Password Reset Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateProfile = async (
    updates: Partial<UserProfile>
  ): Promise<boolean> => {
    try {
      if (!user) {
        console.error("No user logged in");
        return false;
      }

      console.log("Updating profile for:", user.email, updates);
      const { error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("id", user.id);

      if (error) {
        console.error("Update profile error:", error);
        toast({
          title: "Profile Update Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      await fetchProfile(user.id);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      return true;
    } catch (error: any) {
      console.error("Update profile exception:", error);
      toast({
        title: "Profile Update Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const displayRole =
    profile?.role === "clan_master"
      ? "Clan Master"
      : profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1) || "";

  const value = {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    resetPassword,
    updateProfile,
    displayRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
