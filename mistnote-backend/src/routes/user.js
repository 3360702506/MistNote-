const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 更新用户资料验证规则
const updateProfileSchema = Joi.object({
  profile: Joi.object({
    nickname: Joi.string().max(30).allow(''),
    signature: Joi.string().max(100).allow(''),
    gender: Joi.string().valid('male', 'female', 'other', '').allow(''),
    birthday: Joi.date().allow(null),
    country: Joi.string().allow(''),
    province: Joi.string().allow(''),
    city: Joi.string().allow(''),
    phone: Joi.string().allow('')
  })
});

// 获取用户资料
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.getPublicProfile()
      }
    });
  } catch (error) {
    logger.error('获取用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户资料失败'
    });
  }
});

// 更新用户资料
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    // 验证输入数据
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { profile } = value;
    
    // 更新用户资料
    Object.keys(profile).forEach(key => {
      if (profile[key] !== undefined) {
        req.user.profile[key] = profile[key];
      }
    });

    await req.user.save();

    logger.info(`用户资料更新: ${req.user.username}`);

    res.json({
      success: true,
      message: '资料更新成功',
      data: {
        user: req.user.getPublicProfile()
      }
    });
  } catch (error) {
    logger.error('更新用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: '更新资料失败'
    });
  }
});

// 更新用户状态
router.put('/status', authenticateToken, async (req, res) => {
  try {
    const { status, statusText } = req.body;
    
    const validStatuses = ['online', 'busy', 'away', 'invisible', 'offline'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }

    await req.user.updateOnlineStatus(status, statusText || '');

    res.json({
      success: true,
      message: '状态更新成功',
      data: {
        status: req.user.status,
        statusText: req.user.statusText,
        isOnline: req.user.isOnline
      }
    });
  } catch (error) {
    logger.error('更新用户状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新状态失败'
    });
  }
});

// 搜索用户
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, type = 'username' } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词至少需要2个字符'
      });
    }

    let searchQuery = {};
    
    switch (type) {
      case 'username':
        searchQuery = {
          username: { $regex: q, $options: 'i' }
        };
        break;
      case 'email':
        searchQuery = {
          email: { $regex: q, $options: 'i' },
          'settings.privacy.allowSearchByEmail': true
        };
        break;
      case 'phone':
        searchQuery = {
          'profile.phone': q,
          'settings.privacy.allowSearchByPhone': true
        };
        break;
      default:
        searchQuery = {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { 'profile.nickname': { $regex: q, $options: 'i' } }
          ]
        };
    }

    // 排除自己
    searchQuery._id = { $ne: req.user._id };

    const users = await User.find(searchQuery)
      .select('username profile.nickname profile.avatar profile.signature status isOnline')
      .limit(20);

    res.json({
      success: true,
      data: {
        users: users.map(user => user.getPublicProfile())
      }
    });
  } catch (error) {
    logger.error('搜索用户失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败'
    });
  }
});

// 获取用户详情
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查是否为联系人
    const isContact = req.user.contacts.some(
      contact => contact.user.toString() === userId
    );

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        isContact
      }
    });
  } catch (error) {
    logger.error('获取用户详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户详情失败'
    });
  }
});

// 增加点赞数
router.post('/:userId/like', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: '不能给自己点赞'
      });
    }

    const targetUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '点赞成功',
      data: {
        likes: targetUser.likes
      }
    });
  } catch (error) {
    logger.error('点赞失败:', error);
    res.status(500).json({
      success: false,
      message: '点赞失败'
    });
  }
});

// 根据用户ID搜索用户
router.get('/search/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 验证用户ID格式
    if (!/^\d{5}$/.test(userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确，应为5位数字'
      });
    }
    
    // 查找用户
    const user = await User.findOne({ userId })
      .select('userId username profile.displayName profile.avatar profile.bio isOnline lastSeen');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 返回用户公开信息
    res.json({
      success: true,
      data: {
        _id: user._id,
        userId: user.userId,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatar: user.profile?.avatar,
        bio: user.profile?.bio,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    logger.error('搜索用户失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索用户失败'
    });
  }
});

module.exports = router;
