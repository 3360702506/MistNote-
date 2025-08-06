const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 基本信息
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // 个人资料
  profile: {
    nickname: {
      type: String,
      default: '',
      maxlength: 30
    },
    avatar: {
      type: String,
      default: '/uploads/avatars/default.png'
    },
    signature: {
      type: String,
      default: '',
      maxlength: 100
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: ''
    },
    birthday: {
      type: Date,
      default: null
    },
    country: {
      type: String,
      default: ''
    },
    province: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    }
  },
  
  // 状态信息
  status: {
    type: String,
    enum: ['online', 'busy', 'away', 'invisible', 'offline'],
    default: 'offline'
  },
  statusText: {
    type: String,
    default: '离线'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  
  // 社交信息
  level: {
    type: Number,
    default: 1
  },
  likes: {
    type: Number,
    default: 0
  },
  
  // 联系人列表
  contacts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String, // 备注名
    addedAt: {
      type: Date,
      default: Date.now
    },
    isBlocked: {
      type: Boolean,
      default: false
    }
  }],
  
  // 群组列表
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  
  // 设置
  settings: {
    privacy: {
      allowSearchByEmail: {
        type: Boolean,
        default: true
      },
      allowSearchByPhone: {
        type: Boolean,
        default: true
      },
      showOnlineStatus: {
        type: Boolean,
        default: true
      }
    },
    notifications: {
      messageSound: {
        type: Boolean,
        default: true
      },
      showPreview: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// 索引
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'profile.phone': 1 });

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 获取公开信息方法
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    username: this.username,
    profile: {
      nickname: this.profile.nickname || this.username,
      avatar: this.profile.avatar,
      signature: this.profile.signature,
      gender: this.profile.gender,
      birthday: this.profile.birthday,
      country: this.profile.country,
      province: this.profile.province,
      city: this.profile.city
    },
    status: this.status,
    statusText: this.statusText,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    level: this.level,
    likes: this.likes,
    createdAt: this.createdAt
  };
};

// 更新在线状态
userSchema.methods.updateOnlineStatus = function(status, statusText) {
  this.status = status;
  this.statusText = statusText;
  this.isOnline = status !== 'offline';
  this.lastSeen = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
