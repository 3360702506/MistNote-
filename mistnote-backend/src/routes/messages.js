// 消息路由
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticateToken: auth } = require('../middleware/auth');

/**
 * 发送消息
 * POST /api/messages/send
 */
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text' } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: '接收者ID和消息内容不能为空'
      });
    }
    
    // 验证接收者是否存在（通过userId查找）
    const receiver = await User.findOne({
      userId: receiverId
    });
    
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: '接收者不存在'
      });
    }
    
    // 创建消息
    const message = new Message({
      sender: req.user._id,
      receiver: receiver._id,
      receiverType: 'User',
      content: content.trim(),
      messageType: messageType,
      createdAt: new Date()
    });
    
    await message.save();
    
    // 填充发送者信息
    await message.populate('sender', 'userId username profile');
    
    // 生成会话ID（使用数字userId确保与前端一致）
    const generateConversationId = (userId1, userId2) => {
      const ids = [userId1.toString(), userId2.toString()].sort();
      return `${ids[0]}_${ids[1]}`;
    };
    
    const conversationId = generateConversationId(req.user.userId, receiver.userId);
    
    // 实时推送消息给接收者
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiver._id}`).emit('new_message', {
        messageId: message._id,
        senderId: req.user._id,
        senderUserId: req.user.userId,
        senderName: req.user.profile?.displayName || req.user.username,
        senderAvatar: req.user.profile?.avatar || '/uploads/avatars/default.png',
        receiverId: receiver._id,
        receiverUserId: receiver.userId,
        receiverName: receiver.profile?.displayName || receiver.username,
        receiverAvatar: receiver.profile?.avatar || '/uploads/avatars/default.png',
        content: message.content,
        messageType: message.messageType,
        timestamp: message.createdAt,
        conversationId: conversationId
      });
      
      // 同时推送给发送者（用于多端同步）
      io.to(`user_${req.user._id}`).emit('message_sent', {
        messageId: message._id,
        senderId: req.user._id,
        senderUserId: req.user.userId,
        receiverId: receiver._id,
        receiverUserId: receiver.userId,
        receiverName: receiver.profile?.displayName || receiver.username,
        receiverAvatar: receiver.profile?.avatar || '/uploads/avatars/default.png',
        content: message.content,
        messageType: message.messageType,
        timestamp: message.createdAt,
        conversationId: conversationId
      });
    }
    
    res.json({
      success: true,
      data: {
        messageId: message._id,
        senderId: req.user._id,
        senderUserId: req.user.userId,
        receiverId: receiver._id,
        receiverUserId: receiver.userId,
        content: message.content,
        messageType: message.messageType,
        timestamp: message.createdAt,
        conversationId: conversationId
      }
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取聊天历史
 * GET /api/messages/history/:userId?page=1&limit=50
 */
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // 最大100条
    const skip = (page - 1) * limit;
    
    // 查找对方用户（通过userId查找）
    const otherUser = await User.findOne({
      userId: userId
    });
    
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 查询聊天记录
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: req.user._id }
      ]
    })
    .populate('sender', 'userId username profile')
    .populate('receiver', 'userId username profile')
    .sort({ createdAt: -1 }) // 按时间倒序
    .skip(skip)
    .limit(limit);
    
    // 格式化消息数据
    const formattedMessages = messages.map(message => ({
      id: message._id,
      senderId: message.sender._id,
      senderUserId: message.sender.userId,
      senderName: message.sender.profile?.displayName || message.sender.username,
      senderAvatar: message.sender.profile?.avatar || '/uploads/avatars/default.png',
      receiverId: message.receiver._id,
      receiverUserId: message.receiver.userId,
      receiverName: message.receiver.profile?.displayName || message.receiver.username,
      receiverAvatar: message.receiver.profile?.avatar || '/uploads/avatars/default.png',
      content: message.content,
      messageType: message.messageType,
      timestamp: message.createdAt,
      isSent: message.sender._id.toString() === req.user._id.toString(),
      status: 'read' // 简化状态，后续可以扩展
    })).reverse(); // 反转为时间正序
    
    // 获取总消息数
    const total = await Message.countDocuments({
      $or: [
        { sender: req.user._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: req.user._id }
      ]
    });
    
    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + formattedMessages.length < total
        },
        conversationId: `${Math.min(req.user._id.toString(), otherUser._id.toString())}_${Math.max(req.user._id.toString(), otherUser._id.toString())}`
      }
    });
  } catch (error) {
    console.error('获取聊天历史失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 标记消息为已读
 * POST /api/messages/mark-read
 */
router.post('/mark-read', auth, async (req, res) => {
  try {
    const { senderId, messageIds } = req.body;
    
    if (!senderId) {
      return res.status(400).json({
        success: false,
        message: '发送者ID不能为空'
      });
    }
    
    // 查找发送者（通过userId查找）
    const sender = await User.findOne({
      userId: senderId
    });
    
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: '发送者不存在'
      });
    }
    
    let updateQuery = {
      sender: sender._id,
      receiver: req.user._id,
      isRead: false
    };
    
    // 如果指定了消息ID，只标记这些消息
    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      updateQuery._id = { $in: messageIds };
    }
    
    // 标记消息为已读
    const result = await Message.updateMany(updateQuery, {
      isRead: true,
      readAt: new Date()
    });
    
    // 通知发送者消息已被读取
    const io = req.app.get('io');
    if (io && result.modifiedCount > 0) {
      io.to(`user_${sender._id}`).emit('messages_read', {
        readerId: req.user._id,
        readerUserId: req.user.userId,
        readerName: req.user.profile?.displayName || req.user.username,
        messageIds: messageIds,
        readAt: new Date(),
        conversationId: `${Math.min(req.user._id.toString(), sender._id.toString())}_${Math.max(req.user._id.toString(), sender._id.toString())}`
      });
    }
    
    res.json({
      success: true,
      data: {
        markedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('标记消息已读失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取未读消息数
 * GET /api/messages/unread-count/:userId?
 */
router.get('/unread-count/:userId?', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    let query = {
      receiver: req.user._id,
      isRead: false
    };
    
    // 如果指定了用户ID，只统计来自该用户的未读消息
    if (userId) {
      const sender = await User.findOne({
        userId: userId
      });
      
      if (sender) {
        query.sender = sender._id;
      }
    }
    
    const unreadCount = await Message.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        unreadCount,
        userId: userId || null
      }
    });
  } catch (error) {
    console.error('获取未读消息数失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
