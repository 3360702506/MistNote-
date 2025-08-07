// Socket.IO客户端服务
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
  }

  // 连接Socket.IO服务器
  connect(token) {
    if (this.socket && this.isConnected) {
      return;
    }

    this.socket = io('http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    // 连接成功
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO连接成功');
      this.isConnected = true;
      this.emit('connected');
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO连接断开:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO连接错误:', error);
      this.emit('connect_error', error);
    });

    // 监听服务器事件
    this.setupServerEventListeners();
  }

  // 设置服务器事件监听器
  setupServerEventListeners() {
    if (!this.socket) return;

    // 新消息
    this.socket.on('new_message', (data) => {
      this.emit('new_message', data);
    });

    // 消息发送确认
    this.socket.on('message_sent', (data) => {
      this.emit('message_sent', data);
    });

    // 消息已读通知
    this.socket.on('message_read', (data) => {
      this.emit('message_read', data);
    });

    // 用户上线
    this.socket.on('user_online', (data) => {
      this.emit('user_online', data);
    });

    // 用户离线
    this.socket.on('user_offline', (data) => {
      this.emit('user_offline', data);
    });

    // 用户状态变更
    this.socket.on('user_status_changed', (data) => {
      this.emit('user_status_changed', data);
    });

    // 用户正在输入
    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    // 收到点赞
    this.socket.on('received_like', (data) => {
      this.emit('received_like', data);
    });

    // 在线用户列表
    this.socket.on('online_users_list', (data) => {
      this.emit('online_users_list', data);
    });

    // 好友相关事件
    this.socket.on('friendRequestReceived', (data) => {
      this.emit('friendRequestReceived', data);
    });

    this.socket.on('friendRequestAccepted', (data) => {
      this.emit('friendRequestAccepted', data);
    });

    this.socket.on('friendAdded', (data) => {
      this.emit('friendAdded', data);
    });

    this.socket.on('friendRequestRejected', (data) => {
      this.emit('friendRequestRejected', data);
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // 发送消息
  sendMessage(receiverId, content, messageType = 'text', fileInfo = null) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket未连接');
    }

    this.socket.emit('send_message', {
      receiverId,
      content,
      messageType,
      fileInfo
    });
  }

  // 标记消息已读
  markAsRead(messageIds) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('mark_as_read', { messageIds });
  }

  // 更新用户状态
  updateStatus(status, statusText) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('update_status', { status, statusText });
  }

  // 发送正在输入状态
  sendTyping(receiverId, isTyping) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('typing', { receiverId, isTyping });
  }

  // 发送点赞
  sendLike(targetUserId) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('send_like', { targetUserId });
  }

  // 获取在线用户列表
  getOnlineUsers() {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('get_online_users');
  }

  // 事件监听
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  // 移除事件监听
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`事件处理器错误 (${event}):`, error);
        }
      });
    }
  }
}

// 创建单例实例
const socketService = new SocketService();

export default socketService;
