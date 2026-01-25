import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useNavigate, useLocation } from 'react-router-dom';

export const useCapacitor = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Handle back button for Android
    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      if (location.pathname === '/' || location.pathname === '/dashboard') {
        App.exitApp();
      } else if (canGoBack) {
        window.history.back();
      } else {
        navigate('/');
      }
    });

    // Configure Status Bar
    const setupStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#18181b' });
      } catch (e) {
        console.warn('StatusBar not available', e);
      }
    };

    setupStatusBar();

    return () => {
      backButtonListener.then(l => l.remove());
    };
  }, [navigate, location]);
};
