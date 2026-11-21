import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  const [liveTicker, setLiveTicker] = useState([]);

  useEffect(() => {
    const s = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    s.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected to Live Auction Engine');
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('viewer_count', ({ count }) => {
      setViewerCount(count);
    });

    s.on('live_ticker', (item) => {
      setLiveTicker((prev) => [item, ...prev].slice(0, 5));
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, viewerCount, liveTicker }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
