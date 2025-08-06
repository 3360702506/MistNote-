const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateToken, generateRefreshToken, authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 注册验证规则
const registerSchema = Joi.object({
  userId: Joi.string().pattern(/^\d{5}$/).required().messages({
    'string.pattern.base': 'ID必须是5位数字'
  }),
  displayName: Joi.string().min(1).max(30).required().messages({
    'string.min': '显示名称不能为空',
    'string.max': '显示名称不能超过30个字符'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': '密码长度至少6位'
  })
});

// 登录验证规则
const loginSchema = Joi.object({
  userId: Joi.string().pattern(/^\d{5}$/).required().messages({
    'string.pattern.base': 'ID必须是5位数字'
  }),
  password: Joi.string().required()
});

// 用户注册
router.post('/register', async (req, res) => {
  try {
    // 验证输入数据
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { userId, displayName, password } = value;

    // 检查用户ID是否已存在
    const existingUser = await User.findOne({ userId });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'ID已存在'
      });
    }

    // 创建新用户
    const user = new User({
      userId,
      password,
      profile: {
        displayName
      }
    });

    await user.save();

    // 生成令牌
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    logger.info(`用户注册成功: ${displayName} (ID: ${userId})`);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('用户注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    console.log('登录请求数据:', req.body);
    
    // 验证输入数据
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      console.log('登录数据验证失败:', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { userId, password } = value;
    console.log('验证后的数据:', { userId, password: '***' });

    // 查找用户
    const user = await User.findOne({ userId });
    console.log('查找用户结果:', user ? `找到用户: ${user.profile.displayName}` : '未找到用户');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ID或密码错误'
      });
    }

    // 验证密码
    console.log('开始验证密码...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('密码验证结果:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'ID或密码错误'
      });
    }

    // 生成令牌
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // 更新最后登录时间
    user.lastSeen = new Date();
    await user.save();

    logger.info(`用户登录成功: ${user.profile.displayName} (ID: ${user.userId})`);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('用户登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
});

// 刷新令牌
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: '刷新令牌缺失'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'mistnote_refresh_secret');
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 生成新的访问令牌
    const newToken = generateToken(user._id);

    res.json({
      success: true,
      message: '令牌刷新成功',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    logger.error('令牌刷新失败:', error);
    res.status(401).json({
      success: false,
      message: '刷新令牌无效或已过期'
    });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.getPublicProfile()
      }
    });
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

// 用户登出
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // 更新用户离线状态
    await req.user.updateOnlineStatus('offline', '离线');
    
    logger.info(`用户登出: ${req.user.username}`);
    
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    logger.error('用户登出失败:', error);
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
});

module.exports = router;
