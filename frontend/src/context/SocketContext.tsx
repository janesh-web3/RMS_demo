import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { socketService } from '../services/socket';
import { Order } from '../types';

interface SocketContextType {
  socket: typeof socketService | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user) {
      const socket = socketService.connect(user.role);
      
      socket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket disconnected');
      });

      socket.on('newOrder', (order: Order) => {
        console.log('New order received:', order);
      });

      socket.on('orderStatusUpdate', (order: Order) => {
        console.log('Order status updated:', order);
      });

      socket.on('tableStatusUpdate', (update: { tableId: string; status: string }) => {
        console.log('Table status updated:', update);
      });

      return () => {
        socketService.disconnect();
        setIsConnected(false);
      };
    }
  }, [user]);

  const value = {
    socket: socketService,
    isConnected,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};