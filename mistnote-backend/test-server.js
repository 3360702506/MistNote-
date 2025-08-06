// 简单的服务器测试脚本
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001; // 使用不同端口避免冲突

// 中间件
app.use(cors());
app.use(express.json());

// 测试路由
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'MistNote后端测试服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'MistNote Backend Test',
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`🧪 MistNote Backend Test Server running on port ${PORT}`);
  console.log(`📍 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
