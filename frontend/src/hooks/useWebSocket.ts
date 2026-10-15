/**
 * useWebSocket Hook
 * 统一的 WebSocket 连接管理 Hook
 * 支持心跳、断线重连、消息队列
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  payload?: any;
  request_id?: string;
  timestamp?: number;
}

export interface UseWebSocketOptions {
  /** WebSocket URL */
  url: string;
  /** 连接成功回调 */
  onConnect?: () => void;
  /** 断开连接回调 */
  onDisconnect?: () => void;
  /** 收到消息回调 */
  onMessage?: (message: WebSocketMessage) => void;
  /** 错误回调 */
  onError?: (error: Event) => void;
  /** 最大重连次数 */
  reconnectAttempts?: number;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
  /** 是否自动连接 */
  autoConnect?: boolean;
}

export interface UseWebSocketReturn {
  /** 是否已连接 */
  isConnected: boolean;
  /** 是否正在连接 */
  isConnecting: boolean;
  /** 最后收到的消息 */
  lastMessage: WebSocketMessage | null;
  /** 发送消息 */
  sendMessage: (data: any) => boolean;
  /** 连接 */
  connect: () => void;
  /** 断开连接 */
  disconnect: () => void;
}

/**
 * 统一的 WebSocket Hook
 * @param options - WebSocket 配置选项
 * @returns WebSocket 状态和操作方法
 */
export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    url,
    onConnect,
    onDisconnect,
    onMessage,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    autoConnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(() => {});

  // 使用 ref 存储回调函数，避免依赖变化导致重连
  const callbacksRef = useRef({
    onConnect,
    onDisconnect,
    onMessage,
    onError,
  });

  // 更新回调函数 ref
  useEffect(() => {
    callbacksRef.current = {
      onConnect,
      onDisconnect,
      onMessage,
      onError,
    };
  }, [onConnect, onDisconnect, onMessage, onError]);

  // 清理函数
  const cleanup = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
    setIsConnecting(false);
    callbacksRef.current.onDisconnect?.();
  }, [cleanup]);

  // 发送消息
  const sendMessage = useCallback((data: any): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  // 发送心跳
  const sendHeartbeat = useCallback(() => {
    sendMessage({ type: 'ping', timestamp: Date.now() });
  }, [sendMessage]);

  // 连接 WebSocket
  const connect = useCallback(() => {
    // 如果已连接，先断开
    if (wsRef.current) {
      cleanup();
    }

    setIsConnecting(true);
    console.log('[WebSocket] Connecting to:', url);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectCountRef.current = 0;
        callbacksRef.current.onConnect?.();

        // 启动心跳
        heartbeatTimerRef.current = setInterval(sendHeartbeat, heartbeatInterval);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(data);
          callbacksRef.current.onMessage?.(data);
        } catch (e) {
          console.error('[WebSocket] Parse error:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setIsConnecting(false);
        callbacksRef.current.onError?.(error);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);

        // 清除心跳
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }

        // 尝试重连
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          const delay = reconnectInterval * Math.pow(2, reconnectCountRef.current - 1);
          console.log(
            `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current})`
          );

          reconnectTimerRef.current = setTimeout(() => {
            connectRef.current();
          }, delay);
        } else {
          console.warn('[WebSocket] Max reconnection attempts reached');
          callbacksRef.current.onDisconnect?.();
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setIsConnecting(false);
    }
  }, [url, cleanup, heartbeatInterval, reconnectAttempts, reconnectInterval, sendHeartbeat]);

  // 更新 connectRef
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [autoConnect, connect, cleanup]);

  return {
    isConnected,
    isConnecting,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
};

export default useWebSocket;
