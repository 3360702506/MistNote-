const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    console.log('🔌 正在连接MongoDB...');
    console.log(`📍 连接地址: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/mistnote'}`);
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mistnote', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB连接成功！');
    console.log(`📊 数据库名称: ${mongoose.connection.name}`);
    console.log(`🏠 主机地址: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    // 测试基本操作
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📁 现有集合数量: ${collections.length}`);
    
    console.log('\n🎉 数据库连接测试成功！');
    
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  }
};

testConnection();
