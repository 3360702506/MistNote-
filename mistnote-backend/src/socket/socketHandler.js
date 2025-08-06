const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const logger = require('../utils/logger');

// 存储在线用户
const onlineUsers = new Map();

const socketHandler = (io) => {
  // Socket认证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('认证失败：缺少token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mistnote_secret_key');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('认证失败：用户不存在'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket认证失败:', error);
      next(new Error('认证失败：无效token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    const user = socket.user;
    
    logger.info(`用户连接: ${user.username} (${userId})`);
    
    // 添加到在线用户列表
    onlineUsers.set(userId, {
      socketId: socket.id,
      user: user.getPublicProfile(),
      lastSeen: new Date()
    });

    // 更新用户在线状态
    await user.updateOnlineStatus('online', '在线');
    
    // 加入个人房间
    socket.join(userId);
    
    // 通知联系人用户上线
    const contacts = user.contacts.map(contact => contact.user.toString());
    contacts.forEach(contactId => {
      socket.to(contactId).emit('user_online', {
        userId: userId,
        status: 'online',
        statusText: '在线'
      });
    });

    // 处理发送消息
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, messageType = 'text', fileInfo } = data;
        
        // 创建消息
        const message = new Message({
          sender: userId,
          receiver: receiverId,
          receiverType: 'User',
          content,
          messageType,
          fileInfo
        });
        
        await message.save();
        await message.populate('sender', 'username profile.nickname profile.avatar');
        
        // 发送给接收者
        io.to(receiverId).emit('new_message', {
          messageId: message._id,
          sender: message.sender,
          content: message.content,
          messageType: message.messageType,
          fileInfo: message.fileInfo,
          timestamp: message.createdAt
        });
        
        // 确认发送成功
        socket.emit('message_sent', {
          messageId: message._id,
          status: 'sent',
          timestamp: message.createdAt
        });
        
        logger.info(`消息发送: ${userId} -> ${receiverId}`);
      } catch (error) {
        logger.error('发送消息失败:', error);
        socket.emit('message_error', {
          error: '消息发送失败'
        });
      }
    });

    // 处理消息已读
    socket.on('mark_as_read', async (data) => {
      try {
        const { messageIds } = data;
        
        await Message.updateMany(
          { _id: { $in: messageIds }, receiver: userId },
          { status: 'read' }
        );
        
        // 通知发送者消息已读
        const messages = await Message.find({ _id: { $in: messageIds } }).populate('sender');
        messages.forEach(message => {
          io.to(message.sender._id.toString()).emit('message_read', {
            messageId: message._id,
            readBy: userId,
            readAt: new Date()
          });
        });
      } catch (error) {
        logger.error('标记消息已读失败:', error);
      }
    });

    // 处理状态更新
    socket.on('update_status', async (data) => {
      try {
        const { status, statusText } = data;
        
        await user.updateOnlineStatus(status, statusText);
        
        // 通知联系人状态变更
        contacts.forEach(contactId => {
          socket.to(contactId).emit('user_status_changed', {
            userId: userId,
            status: status,
            statusText: statusText,
            isOnline: status !== 'offline'
          });
        });
        
        // 更新在线用户列表
        if (onlineUsers.has(userId)) {
          onlineUsers.get(userId).user.status = status;
          onlineUsers.get(userId).user.statusText = statusText;
          onlineUsers.get(userId).user.isOnline = status !== 'offline';
        }
        
        socket.emit('status_updated', { status, statusText });
      } catch (error) {
        logger.error('更新状态失败:', error);
      }
    });

    // 处理正在输入
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      socket.to(receiverId).emit('user_typing', {
        userId: userId,
        isTyping: isTyping
      });
    });

    // 处理点赞
    socket.on('send_like', async (data) => {
      try {
        const { targetUserId } = data;
        
        // 增加被点赞用户的点赞数
        await User.findByIdAndUpdate(targetUserId, { $inc: { likes: 1 } });
        
        // 通知被点赞用户
        io.to(targetUserId).emit('received_like', {
          fromUserId: userId,
          fromUser: user.getPublicProfile(),
          timestamp: new Date()
        });
        
        socket.emit('like_sent', { targetUserId });
      } catch (error) {
        logger.error('发送点赞失败:', error);
      }
    });

    // 处理断开连接
    socket.on('disconnect', async () => {
      logger.info(`用户断开连接: ${user.username} (${userId})`);
      
      // 从在线用户列表移除
      onlineUsers.delete(userId);
      
      // 更新用户离线状态
      await user.updateOnlineStatus('offline', '离线');
      
      // 通知联系人用户离线
      contacts.forEach(contactId => {
        socket.to(contactId).emit('user_offline', {
          userId: userId,
          lastSeen: new Date()
        });
      });
    });

    // 处理获取在线用户列表
    socket.on('get_online_users', () => {
      const onlineUsersList = Array.from(onlineUsers.values()).map(item => item.user);
      socket.emit('online_users_list', onlineUsersList);
    });
  });
};

// 获取在线用户数量
const getOnlineUsersCount = () => {
  return onlineUsers.size;
};

// 获取特定用户是否在线
const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

module.exports = socketHandler;
module.exports.getOnlineUsersCount = getOnlineUsersCount;
module.exports.isUserOnline = isUserOnline;
