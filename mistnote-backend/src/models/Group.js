const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  // 群组基本信息
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200,
    default: ''
  },
  avatar: {
    type: String,
    default: '/uploads/groups/default.png'
  },
  
  // 群主
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 管理员列表
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 成员列表
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String, // 群昵称
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    isMuted: {
      type: Boolean,
      default: false
    },
    mutedUntil: Date
  }],
  
  // 群组设置
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowMemberInvite: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    maxMembers: {
      type: Number,
      default: 500
    }
  },
  
  // 群组状态
  isActive: {
    type: Boolean,
    default: true
  },
  
  // 最后一条消息
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
groupSchema.index({ owner: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ lastActivity: -1 });

// 添加成员方法
groupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(m => m.user.toString() === userId.toString());
  if (existingMember) {
    throw new Error('用户已经是群成员');
  }
  
  if (this.members.length >= this.settings.maxMembers) {
    throw new Error('群成员已达上限');
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });
  
  return this.save();
};

// 移除成员方法
groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  return this.save();
};

// 检查用户权限
groupSchema.methods.checkPermission = function(userId, action) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return false;
  
  switch (action) {
    case 'send_message':
      return !member.isMuted || (member.mutedUntil && member.mutedUntil < new Date());
    case 'invite_member':
      return this.settings.allowMemberInvite || ['owner', 'admin'].includes(member.role);
    case 'remove_member':
    case 'mute_member':
      return ['owner', 'admin'].includes(member.role);
    case 'manage_group':
      return member.role === 'owner';
    default:
      return true;
  }
};

module.exports = mongoose.model('Group', groupSchema);
