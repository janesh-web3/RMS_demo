import { useEffect, useState } from 'react';
import { socketService } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { Socket } from 'socket.io-client';

export const useSocket = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (user) {
      const socketInstance = socketService.connect(user.role);
      setSocket(socketInstance);
      
      return () => {
        socketService.disconnect();
        setSocket(null);
      };
    }
  }, [user]);

  return socket;
};