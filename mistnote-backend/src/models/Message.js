const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // 发送者
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 接收者（私聊）或群组（群聊）
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'receiverType'
  },
  receiverType: {
    type: String,
    enum: ['User', 'Group'],
    required: true
  },
  
  // 消息内容
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // 消息类型
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'voice', 'video', 'system'],
    default: 'text'
  },
  
  // 文件信息（当消息类型为文件时）
  fileInfo: {
    filename: String,
    originalName: String,
    size: Number,
    mimetype: String,
    url: String
  },
  
  // 消息状态
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  // 已读用户列表（群聊时使用）
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 回复消息
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // 是否已删除
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  
  // 是否已撤回
  isRecalled: {
    type: Boolean,
    default: false
  },
  recalledAt: Date
}, {
  timestamps: true
});

// 索引
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

// 获取消息摘要
messageSchema.methods.getSummary = function() {
  let summary = this.content;
  
  switch (this.messageType) {
    case 'image':
      summary = '[图片]';
      break;
    case 'file':
      summary = `[文件] ${this.fileInfo?.originalName || ''}`;
      break;
    case 'voice':
      summary = '[语音]';
      break;
    case 'video':
      summary = '[视频]';
      break;
  }
  
  return summary.length > 50 ? summary.substring(0, 50) + '...' : summary;
};

module.exports = mongoose.model('Message', messageSchema);
