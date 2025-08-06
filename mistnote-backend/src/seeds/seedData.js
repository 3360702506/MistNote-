const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');
require('dotenv').config();

// 测试用户数据
const testUsers = [
  {
    username: 'admin',
    email: 'admin@mistnote.com',
    password: '123456',
    profile: {
      nickname: '管理员',
      signature: 'MistNote管理员账号',
      gender: 'other',
      country: '中国',
      province: '北京',
      city: '北京'
    },
    level: 10,
    likes: 999
  },
  {
    username: 'testuser1',
    email: 'test1@mistnote.com',
    password: '123456',
    profile: {
      nickname: '测试用户1',
      signature: '这是一个测试用户',
      gender: 'male',
      country: '中国',
      province: '上海',
      city: '上海'
    },
    level: 5,
    likes: 88
  },
  {
    username: 'testuser2',
    email: 'test2@mistnote.com',
    password: '123456',
    profile: {
      nickname: '测试用户2',
      signature: '另一个测试用户',
      gender: 'female',
      country: '中国',
      province: '广东',
      city: '深圳'
    },
    level: 3,
    likes: 66
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 开始初始化数据库...');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mistnote');
    console.log('✅ 数据库连接成功');

    // 清空现有用户数据（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      await User.deleteMany({});
      console.log('🗑️  清空现有用户数据');
    }

    // 创建测试用户
    console.log('👥 创建测试用户...');
    const createdUsers = [];
    
    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`✅ 创建用户: ${user.username} (${user.email})`);
    }

    // 建立联系人关系
    console.log('🤝 建立联系人关系...');
    const [admin, user1, user2] = createdUsers;
    
    // admin添加其他用户为联系人
    admin.contacts.push(
      {
        user: user1._id,
        nickname: user1.profile.nickname,
        addedAt: new Date()
      },
      {
        user: user2._id,
        nickname: user2.profile.nickname,
        addedAt: new Date()
      }
    );
    await admin.save();

    // user1和user2互相添加为联系人
    user1.contacts.push({
      user: user2._id,
      nickname: user2.profile.nickname,
      addedAt: new Date()
    });
    await user1.save();

    user2.contacts.push({
      user: user1._id,
      nickname: user1.profile.nickname,
      addedAt: new Date()
    });
    await user2.save();

    console.log('✅ 联系人关系建立完成');

    console.log('\n🎉 数据库初始化完成！');
    console.log('\n📋 测试账号信息:');
    createdUsers.forEach(user => {
      console.log(`- ${user.username}: ${user.email} (密码: 123456)`);
    });

    logger.info('数据库种子数据初始化完成');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    logger.error('数据库种子数据初始化失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
};

// 如果直接运行此文件，则执行种子数据初始化
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
