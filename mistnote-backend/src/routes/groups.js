const express = require('express');
const Group = require('../models/Group');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 创建群聊
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { groupName, description, inviteUsers = [] } = req.body;
    
    // 验证群聊名称
    if (!groupName || groupName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: '群聊名称至少需要2个字符'
      });
    }
    
    if (groupName.length > 30) {
      return res.status(400).json({
        success: false,
        message: '群聊名称不能超过30个字符'
      });
    }
    
    // 验证描述长度
    if (description && description.length > 200) {
      return res.status(400).json({
        success: false,
        message: '群聊描述不能超过200个字符'
      });
    }
    
    // 验证邀请用户列表
    const validInviteUsers = [];
    if (inviteUsers.length > 0) {
      for (const userId of inviteUsers) {
        const user = await User.findOne({ userId: userId });
        if (user) {
          // 检查是否是当前用户的好友
          const currentUser = await User.findById(req.user.userId);
          const isFriend = currentUser.contacts.some(
            contact => contact.user.toString() === user._id.toString()
          );
          
          if (isFriend) {
            validInviteUsers.push(user._id);
          }
        }
      }
    }
    
    // 创建群聊
    const group = new Group({
      name: groupName.trim(),
      description: description?.trim() || '',
      owner: req.user.userId,
      members: [
        {
          user: req.user.userId,
          role: 'owner',
          joinedAt: new Date()
        }
      ]
    });
    
    // 添加邀请的用户
    for (const userId of validInviteUsers) {
      group.members.push({
        user: userId,
        role: 'member',
        joinedAt: new Date()
      });
    }
    
    await group.save();
    
    // 更新所有成员的群组列表
    const memberIds = [req.user.userId, ...validInviteUsers];
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $push: { groups: group._id } }
    );
    
    logger.info(`群聊创建成功: ${group.name} by ${req.user.userId}`);
    
    res.status(201).json({
      success: true,
      message: '群聊创建成功',
      data: {
        group: {
          _id: group._id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          memberCount: group.members.length,
          createdAt: group.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('创建群聊失败:', error);
    res.status(500).json({
      success: false,
      message: '创建群聊失败'
    });
  }
});

// 获取用户的群聊列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('groups');
    
    const groups = await Group.find({
      'members.user': req.user.userId,
      isActive: true
    })
    .populate('owner', 'userId profile.displayName profile.avatar')
    .populate('members.user', 'userId profile.displayName profile.avatar')
    .sort({ lastActivity: -1 });
    
    const groupsData = groups.map(group => ({
      _id: group._id,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      owner: group.owner,
      memberCount: group.members.length,
      lastActivity: group.lastActivity,
      createdAt: group.createdAt,
      // 当前用户在群中的角色
      userRole: group.members.find(m => m.user._id.toString() === req.user.userId)?.role
    }));
    
    res.json({
      success: true,
      data: groupsData
    });
  } catch (error) {
    logger.error('获取群聊列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取群聊列表失败'
    });
  }
});

// 获取群聊详情
router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId)
      .populate('owner', 'userId profile.displayName profile.avatar')
      .populate('members.user', 'userId profile.displayName profile.avatar')
      .populate('admins', 'userId profile.displayName profile.avatar');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群聊不存在'
      });
    }
    
    // 检查用户是否是群成员
    const isMember = group.members.some(m => m.user._id.toString() === req.user.userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: '您不是该群的成员'
      });
    }
    
    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    logger.error('获取群聊详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取群聊详情失败'
    });
  }
});

module.exports = router;
