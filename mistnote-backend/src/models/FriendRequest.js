const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  // 发送者
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 接收者
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 请求消息
  message: {
    type: String,
    default: '',
    maxlength: 200
  },
  // 请求状态
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  // 处理时间
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 索引
friendRequestSchema.index({ sender: 1, receiver: 1 });
friendRequestSchema.index({ receiver: 1, status: 1 });
friendRequestSchema.index({ createdAt: -1 });

// 确保同一对用户之间不能有多个待处理的好友请求
friendRequestSchema.index(
  { sender: 1, receiver: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'pending' }
  }
);

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
