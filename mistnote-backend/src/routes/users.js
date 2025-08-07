// 用户信息路由
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * 获取用户信息
 * GET /api/users/:userId
 */
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 查找用户
    const user = await User.findOne({ 
      $or: [
        { _id: userId },
        { userId: userId }
      ]
    }).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 返回用户信息
    res.json({
      success: true,
      data: {
        _id: user._id,
        userId: user.userId,
        username: user.username,
        profile: {
          displayName: user.profile?.displayName || user.username,
          signature: user.profile?.signature || '',
          avatar: user.profile?.avatar || '/uploads/avatars/default.png',
          location: user.profile?.location || ''
        },
        status: user.status || 'offline',
        lastSeen: user.lastSeen || new Date(),
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 批量获取用户信息
 * POST /api/users/batch
 */
router.post('/batch', auth, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '用户ID列表不能为空'
      });
    }
    
    // 限制批量查询数量
    if (userIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: '批量查询用户数量不能超过50个'
      });
    }
    
    // 查找用户
    const users = await User.find({
      $or: [
        { _id: { $in: userIds } },
        { userId: { $in: userIds } }
      ]
    }).select('-password -__v');
    
    // 格式化用户数据
    const userData = {};
    users.forEach(user => {
      const key = user.userId || user._id.toString();
      userData[key] = {
        _id: user._id,
        userId: user.userId,
        username: user.username,
        profile: {
          displayName: user.profile?.displayName || user.username,
          signature: user.profile?.signature || '',
          avatar: user.profile?.avatar || '/uploads/avatars/default.png',
          location: user.profile?.location || ''
        },
        status: user.status || 'offline',
        lastSeen: user.lastSeen || new Date(),
        createdAt: user.createdAt
      };
    });
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('批量获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 搜索用户
 * GET /api/users/search?q=keyword
 */
router.get('/search', auth, async (req, res) => {
  try {
    const { q: keyword } = req.query;
    
    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }
    
    // 搜索用户（按用户ID、用户名、显示名称）
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // 排除当前用户
        {
          $or: [
            { userId: { $regex: keyword, $options: 'i' } },
            { username: { $regex: keyword, $options: 'i' } },
            { 'profile.displayName': { $regex: keyword, $options: 'i' } }
          ]
        }
      ]
    })
    .select('-password -__v')
    .limit(20); // 限制搜索结果数量
    
    // 格式化搜索结果
    const searchResults = users.map(user => ({
      _id: user._id,
      userId: user.userId,
      username: user.username,
      profile: {
        displayName: user.profile?.displayName || user.username,
        signature: user.profile?.signature || '',
        avatar: user.profile?.avatar || '/uploads/avatars/default.png',
        location: user.profile?.location || ''
      },
      status: user.status || 'offline',
      lastSeen: user.lastSeen || new Date()
    }));
    
    res.json({
      success: true,
      data: searchResults,
      total: searchResults.length
    });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
