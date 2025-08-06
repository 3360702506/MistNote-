const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取聊天记录
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const skip = (page - 1) * limit;
    
    // 获取与指定用户的聊天记录
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId, receiverType: 'User' },
        { sender: userId, receiver: req.user._id, receiverType: 'User' }
      ],
      isDeleted: false
    })
    .populate('sender', 'username profile.nickname profile.avatar')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // 标记消息为已读
    await Message.updateMany(
      { 
        sender: userId, 
        receiver: req.user._id, 
        receiverType: 'User',
        status: { $ne: 'read' }
      },
      { status: 'read' }
    );

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // 按时间正序返回
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取聊天记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取聊天记录失败'
    });
  }
});

// 发送消息
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text', fileInfo, replyTo } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: '接收者和消息内容不能为空'
      });
    }

    // 检查接收者是否存在
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: '接收者不存在'
      });
    }

    // 检查是否被屏蔽
    const isBlocked = receiver.contacts.some(
      contact => contact.user.toString() === req.user._id.toString() && contact.isBlocked
    );

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: '消息发送失败：您已被对方屏蔽'
      });
    }

    // 创建消息
    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      receiverType: 'User',
      content,
      messageType,
      fileInfo,
      replyTo
    });

    await message.save();
    await message.populate('sender', 'username profile.nickname profile.avatar');

    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    logger.info(`消息发送: ${req.user.username} -> ${receiver.username}`);

    res.json({
      success: true,
      message: '消息发送成功',
      data: {
        message
      }
    });
  } catch (error) {
    logger.error('发送消息失败:', error);
    res.status(500).json({
      success: false,
      message: '发送消息失败'
    });
  }
});

// 撤回消息
router.put('/:messageId/recall', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在'
      });
    }

    // 只能撤回自己发送的消息
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '只能撤回自己发送的消息'
      });
    }

    // 检查撤回时间限制（2分钟内）
    const timeDiff = Date.now() - message.createdAt.getTime();
    if (timeDiff > 2 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: '消息发送超过2分钟，无法撤回'
      });
    }

    message.isRecalled = true;
    message.recalledAt = new Date();
    message.content = '消息已撤回';
    await message.save();

    res.json({
      success: true,
      message: '消息撤回成功'
    });
  } catch (error) {
    logger.error('撤回消息失败:', error);
    res.status(500).json({
      success: false,
      message: '撤回消息失败'
    });
  }
});

// 删除消息
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在'
      });
    }

    // 只能删除自己发送的消息或发送给自己的消息
    const canDelete = message.sender.toString() === req.user._id.toString() ||
                     message.receiver.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: '无权删除此消息'
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: '消息删除成功'
    });
  } catch (error) {
    logger.error('删除消息失败:', error);
    res.status(500).json({
      success: false,
      message: '删除消息失败'
    });
  }
});

// 获取聊天列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 获取最近的聊天记录
    const recentChats = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id, receiverType: 'User' },
            { receiver: req.user._id, receiverType: 'User' }
          ],
          isDeleted: false
        }
      },
      {
        $addFields: {
          chatPartner: {
            $cond: {
              if: { $eq: ['$sender', req.user._id] },
              then: '$receiver',
              else: '$sender'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$chatPartner',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ['$receiver', req.user._id] },
                    { $ne: ['$status', 'read'] }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'partner'
        }
      },
      {
        $unwind: '$partner'
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    const chatList = recentChats.map(chat => ({
      partner: {
        _id: chat.partner._id,
        username: chat.partner.username,
        profile: chat.partner.profile,
        status: chat.partner.status,
        isOnline: chat.partner.isOnline
      },
      lastMessage: {
        content: chat.lastMessage.getSummary ? chat.lastMessage.getSummary() : chat.lastMessage.content,
        messageType: chat.lastMessage.messageType,
        createdAt: chat.lastMessage.createdAt,
        sender: chat.lastMessage.sender
      },
      unreadCount: chat.unreadCount
    }));

    res.json({
      success: true,
      data: {
        chats: chatList
      }
    });
  } catch (error) {
    logger.error('获取聊天列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取聊天列表失败'
    });
  }
});

module.exports = router;
