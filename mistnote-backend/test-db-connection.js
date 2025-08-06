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
    console.log(`📈 连接状态: ${mongoose.connection.readyState === 1 ? '已连接' : '未连接'}`);
    
    // 测试基本操作
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📁 现有集合数量: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('📋 现有集合:');
      collections.forEach(col => console.log(`  - ${col.name}`));
    }
    
    console.log('\n🎉 数据库连接测试成功！');
    
  } catch (error) {
    console.error('❌ MongoDB连接失败:');
    console.error(`   错误信息: ${error.message}`);
    console.error('\n💡 解决方案:');
    console.error('   1. 确保MongoDB服务正在运行');
    console.error('   2. 检查连接地址是否正确');
    console.error('   3. 检查防火墙设置');
    console.error('   4. 验证数据库权限');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n🚨 连接被拒绝，请启动MongoDB服务:');
      console.error('   Linux: sudo systemctl start mongod');
      console.error('   macOS: brew services start mongodb-community');
      console.error('   Windows: net start MongoDB');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  }
};

testConnection();
