const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupIndexes() {
  try {
    // 连接到MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mistnote');
    console.log('已连接到MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // 获取当前索引
    const indexes = await collection.indexes();
    console.log('当前索引:', indexes);

    // 删除username和email的唯一索引
    try {
      await collection.dropIndex('username_1');
      console.log('已删除username唯一索引');
    } catch (error) {
      console.log('username索引不存在或已删除');
    }

    try {
      await collection.dropIndex('email_1');
      console.log('已删除email唯一索引');
    } catch (error) {
      console.log('email索引不存在或已删除');
    }

    // 确保userId有唯一索引
    try {
      await collection.createIndex({ userId: 1 }, { unique: true });
      console.log('已创建userId唯一索引');
    } catch (error) {
      console.log('userId索引已存在');
    }

    // 获取更新后的索引
    const newIndexes = await collection.indexes();
    console.log('更新后的索引:', newIndexes);

    console.log('索引清理完成');
  } catch (error) {
    console.error('索引清理失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('已断开MongoDB连接');
  }
}

// 运行清理脚本
cleanupIndexes();
