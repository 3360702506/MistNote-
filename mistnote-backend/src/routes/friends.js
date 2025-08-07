const express = require('express');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Message = require('../models/Message');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取好友列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contacts.user', 'userId username profile status isOnline lastSeen');

    const friends = user.contacts
      .filter(contact => !contact.isBlocked)
      .map(contact => ({
        _id: contact._id,
        userId: contact.user.userId,
        username: contact.user.username,
        displayName: contact.user.profile?.displayName || contact.user.username,
        nickname: contact.nickname,
        avatar: contact.user.profile?.avatar,
        isOnline: contact.user.isOnline,
        lastSeen: contact.user.lastSeen,
        addedAt: contact.addedAt
      }));

    res.json({
      success: true,
      data: friends
    });
  } catch (error) {
    logger.error('获取好友列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取好友列表失败'
    });
  }
});

// 发送好友请求
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { targetUserId, nickname, message } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空'
      });
    }

    // 验证用户ID格式（5位数字）
    if (!/^\d{5}$/.test(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确，应为5位数字'
      });
    }

    if (targetUserId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: '不能添加自己为好友'
      });
    }

    // 检查目标用户是否存在
    const targetUser = await User.findOne({ userId: targetUserId });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查是否已经是好友
    const currentUser = await User.findById(req.user._id);
    const isAlreadyFriend = currentUser.contacts.some(
      contact => contact.user.toString() === targetUser._id.toString()
    );
    
    if (isAlreadyFriend) {
      return res.status(400).json({
        success: false,
        message: '该用户已经是您的好友'
      });
    }

    // 检查是否已有待处理的好友请求
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: targetUser._id, status: 'pending' },
        { sender: targetUser._id, receiver: req.user._id, status: 'pending' }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: '已有待处理的好友请求'
      });
    }

    // 创建好友请求记录
    const friendRequest = new FriendRequest({
      sender: req.user._id,
      receiver: targetUser._id,
      message: message || ''
    });
    await friendRequest.save();

    // 实时通知目标用户收到好友请求
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${targetUser._id}`).emit('friendRequestReceived', {
        requestId: friendRequest._id,
        sender: {
          _id: req.user._id,
          userId: req.user.userId,
          profile: {
            displayName: req.user.profile?.displayName || req.user.username,
            avatar: req.user.profile?.avatar
          }
        },
        message: friendRequest.message,
        createdAt: friendRequest.createdAt
      });
    }

    logger.info(`好友请求发送: ${req.user.userId} -> ${targetUserId}`);

    res.json({
      success: true,
      message: '好友请求已发送',
      data: {
        requestId: friendRequest._id
      }
    });
  } catch (error) {
    logger.error('发送好友请求失败:', error);
    res.status(500).json({
      success: false,
      message: '发送好友请求失败'
    });
  }
});

// 获取收到的好友请求
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    // 获取收到的好友请求
    const receivedRequests = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending'
    })
    .populate('sender', 'userId profile.displayName profile.avatar')
    .sort({ createdAt: -1 });

    // 获取发送的好友请求
    const sentRequests = await FriendRequest.find({
      sender: req.user._id,
      status: 'pending'
    })
    .populate('receiver', 'userId profile.displayName profile.avatar')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        received: receivedRequests,
        sent: sentRequests
      }
    });
  } catch (error) {
    logger.error('获取好友请求失败:', error);
    res.status(500).json({
      success: false,
      message: '获取好友请求失败'
    });
  }
});

// 处理好友请求（接受/拒绝）
router.post('/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' 或 'reject'
    

    
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的操作类型'
      });
    }
    
    // 查找好友请求
    const friendRequest = await FriendRequest.findById(requestId)
      .populate('sender', 'userId profile.displayName profile.avatar');
    
    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: '好友请求不存在'
      });
    }
    

    
    // 验证请求接收者是当前用户
    if (friendRequest.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权处理此好友请求'
      });
    }
    
    // 检查请求状态
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该好友请求已被处理'
      });
    }
    
    // 更新请求状态
    friendRequest.status = action === 'accept' ? 'accepted' : 'rejected';
    friendRequest.processedAt = new Date();
    await friendRequest.save();
    
    // 如果接受请求，添加到双方的联系人列表
    if (action === 'accept') {
      const [currentUser, senderUser] = await Promise.all([
        User.findById(req.user._id),
        User.findById(friendRequest.sender._id)
      ]);
      
      // 添加到当前用户的联系人列表
      currentUser.contacts.push({
        user: friendRequest.sender._id,
        addedAt: new Date()
      });
      
      // 添加到发送者的联系人列表
      senderUser.contacts.push({
        user: req.user._id,
        addedAt: new Date()
      });
      
      await Promise.all([currentUser.save(), senderUser.save()]);

      // 创建系统欢迎消息（使用当前用户作为sender）
      const welcomeMessage = new Message({
        sender: req.user._id, // 使用当前用户作为发送者
        receiver: friendRequest.sender._id,
        receiverType: 'User',
        content: `我们已经成为好友了，快来聊天吧~`,
        messageType: 'text', // 使用text类型而不是system
        createdAt: new Date()
      });
      await welcomeMessage.save();

      // 实时通知双方好友请求被接受
      const io = req.app.get('io');
      if (io) {
        // 通知请求发送者
        io.to(`user_${friendRequest.sender._id}`).emit('friendRequestAccepted', {
          requestId: friendRequest._id,
          friend: {
            _id: currentUser._id,
            userId: currentUser.userId,
            profile: {
              displayName: currentUser.profile?.displayName || currentUser.username,
              avatar: currentUser.profile?.avatar
            }
          },
          welcomeMessage: {
            _id: welcomeMessage._id,
            content: welcomeMessage.content,
            createdAt: welcomeMessage.createdAt
          }
        });

        // 通知当前用户（接受者）
        io.to(`user_${req.user._id}`).emit('friendAdded', {
          friend: {
            _id: senderUser._id,
            userId: senderUser.userId,
            profile: {
              displayName: senderUser.profile?.displayName || senderUser.username,
              avatar: senderUser.profile?.avatar
            }
          }
        });
      }
    } else {
      // 如果拒绝请求，通知发送者
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${friendRequest.sender._id}`).emit('friendRequestRejected', {
          requestId: friendRequest._id,
          rejectedBy: {
            _id: req.user._id,
            userId: req.user.userId,
            profile: {
              displayName: req.user.profile?.displayName || req.user.username
            }
          }
        });
      }
    }

    logger.info(`好友请求${action === 'accept' ? '接受' : '拒绝'}: ${req.user.userId} <- ${friendRequest.sender._id}`);

    res.json({
      success: true,
      message: action === 'accept' ? '已接受好友请求' : '已拒绝好友请求',
      data: {
        request: friendRequest
      }
    });
  } catch (error) {
    logger.error('处理好友请求失败:', error);
    res.status(500).json({
      success: false,
      message: '处理好友请求失败'
    });
  }
});

module.exports = router;
