import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

interface NotificationSettings {
  soundEnabled: boolean;
  volume: number;
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  playNotificationSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    soundEnabled: true,
    volume: 70,
  });

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio('/sounds/new-order.mp3');
    audioRef.current.volume = settings.volume / 100;
    
    // Fallback to a simple beep sound if file doesn't exist
    audioRef.current.onerror = () => {
      // Create a simple beep sound using Web Audio API
      const createBeepSound = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3 * (settings.volume / 100), audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };
      
      audioRef.current = {
        play: createBeepSound,
        volume: settings.volume / 100
      } as any;
    };
  }, []);

  // Load user's notification settings
  useEffect(() => {
    if (user?.notificationSettings) {
      setSettings(user.notificationSettings);
    }
  }, [user]);

  // Update audio volume when settings change
  useEffect(() => {
    if (audioRef.current && 'volume' in audioRef.current) {
      audioRef.current.volume = settings.volume / 100;
    }
  }, [settings.volume]);

  // Listen for new order notifications
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewOrder = (orderData: any) => {
      // Show toast notification
      toast.success(`New order #${orderData.orderNumber} from Table ${orderData.tableNumber}`, {
        duration: 5000,
        icon: '🔔',
      });

      // Play sound if enabled
      if (settings.soundEnabled) {
        playNotificationSound();
      }
    };

    const handleOrderStatusUpdate = (data: any) => {
      if (user.role === 'Waiter' || user.role === 'Admin') {
        toast(`Order #${data.orderNumber} is now ${data.status}`, {
          icon: data.status === 'Ready' ? '✅' : '🍳',
          duration: 4000,
        });
      }
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('orderStatusUpdate', handleOrderStatusUpdate);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('orderStatusUpdate', handleOrderStatusUpdate);
    };
  }, [socket, user, settings.soundEnabled]);

  const playNotificationSound = () => {
    if (settings.soundEnabled && audioRef.current) {
      try {
        audioRef.current.play();
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      // Update user settings in backend
      const response = await fetch('/api/users/notification-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification settings');
      }

      toast.success('Notification settings updated');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification settings');
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        settings,
        updateSettings,
        playNotificationSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};