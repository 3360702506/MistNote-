const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取联系人列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contacts.user', 'username profile status isOnline lastSeen');

    const contacts = user.contacts.map(contact => ({
      _id: contact._id,
      user: contact.user.getPublicProfile(),
      nickname: contact.nickname,
      addedAt: contact.addedAt,
      isBlocked: contact.isBlocked
    }));

    res.json({
      success: true,
      data: {
        contacts
      }
    });
  } catch (error) {
    logger.error('获取联系人列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取联系人列表失败'
    });
  }
});

// 添加联系人
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, nickname } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空'
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: '不能添加自己为联系人'
      });
    }

    // 检查目标用户是否存在
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查是否已经是联系人
    const existingContact = req.user.contacts.find(
      contact => contact.user.toString() === userId
    );

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: '该用户已经是您的联系人'
      });
    }

    // 添加联系人
    req.user.contacts.push({
      user: userId,
      nickname: nickname || targetUser.profile.nickname || targetUser.username,
      addedAt: new Date()
    });

    await req.user.save();

    // 同时将当前用户添加到目标用户的联系人列表
    const existingReverseContact = targetUser.contacts.find(
      contact => contact.user.toString() === req.user._id.toString()
    );

    if (!existingReverseContact) {
      targetUser.contacts.push({
        user: req.user._id,
        nickname: req.user.profile.nickname || req.user.username,
        addedAt: new Date()
      });
      await targetUser.save();
    }

    logger.info(`添加联系人: ${req.user.username} -> ${targetUser.username}`);

    res.json({
      success: true,
      message: '联系人添加成功',
      data: {
        contact: {
          user: targetUser.getPublicProfile(),
          nickname: nickname || targetUser.profile.nickname || targetUser.username,
          addedAt: new Date()
        }
      }
    });
  } catch (error) {
    logger.error('添加联系人失败:', error);
    res.status(500).json({
      success: false,
      message: '添加联系人失败'
    });
  }
});

// 更新联系人备注
router.put('/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { nickname } = req.body;

    const contact = req.user.contacts.id(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: '联系人不存在'
      });
    }

    contact.nickname = nickname;
    await req.user.save();

    res.json({
      success: true,
      message: '联系人备注更新成功'
    });
  } catch (error) {
    logger.error('更新联系人备注失败:', error);
    res.status(500).json({
      success: false,
      message: '更新联系人备注失败'
    });
  }
});

// 删除联系人
router.delete('/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = req.user.contacts.id(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: '联系人不存在'
      });
    }

    const targetUserId = contact.user;
    req.user.contacts.pull(contactId);
    await req.user.save();

    // 同时从目标用户的联系人列表中移除
    const targetUser = await User.findById(targetUserId);
    if (targetUser) {
      const reverseContact = targetUser.contacts.find(
        c => c.user.toString() === req.user._id.toString()
      );
      if (reverseContact) {
        targetUser.contacts.pull(reverseContact._id);
        await targetUser.save();
      }
    }

    logger.info(`删除联系人: ${req.user.username} -> ${targetUserId}`);

    res.json({
      success: true,
      message: '联系人删除成功'
    });
  } catch (error) {
    logger.error('删除联系人失败:', error);
    res.status(500).json({
      success: false,
      message: '删除联系人失败'
    });
  }
});

// 屏蔽/取消屏蔽联系人
router.put('/:contactId/block', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { isBlocked } = req.body;

    const contact = req.user.contacts.id(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: '联系人不存在'
      });
    }

    contact.isBlocked = isBlocked;
    await req.user.save();

    res.json({
      success: true,
      message: isBlocked ? '联系人已屏蔽' : '联系人已取消屏蔽'
    });
  } catch (error) {
    logger.error('屏蔽联系人失败:', error);
    res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
});

module.exports = router;
