// 后端项目设置脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始设置MistNote后端项目...\n');

// 检查Node.js版本
console.log('📋 检查Node.js版本...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js版本: ${nodeVersion}`);
  
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    console.warn('⚠️  警告: 建议使用Node.js 16或更高版本');
  }
} catch (error) {
  console.error('❌ Node.js未安装或无法访问');
  process.exit(1);
}

// 检查npm版本
console.log('\n📋 检查npm版本...');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm版本: ${npmVersion}`);
} catch (error) {
  console.error('❌ npm未安装或无法访问');
  process.exit(1);
}

// 检查必要目录
console.log('\n📁 检查项目目录结构...');
const requiredDirs = [
  'src',
  'src/config',
  'src/models',
  'src/routes',
  'src/middleware',
  'src/socket',
  'src/utils',
  'logs',
  'uploads',
  'uploads/avatars',
  'uploads/files'
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`📁 创建目录: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    console.log(`✅ 目录存在: ${dir}`);
  }
});

// 检查环境配置文件
console.log('\n🔧 检查环境配置...');
if (!fs.existsSync('.env')) {
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ 已从.env.example创建.env文件');
  } else {
    console.log('⚠️  .env文件不存在，请手动创建');
  }
} else {
  console.log('✅ .env文件存在');
}

// 检查package.json
console.log('\n📦 检查package.json...');
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json文件不存在');
  process.exit(1);
} else {
  console.log('✅ package.json文件存在');
}

console.log('\n🎉 MistNote后端项目设置完成！');
console.log('\n📝 下一步操作:');
console.log('1. 安装依赖: npm install');
console.log('2. 配置.env文件中的数据库连接');
console.log('3. 启动MongoDB服务');
console.log('4. 运行开发服务器: npm run dev');
console.log('5. 或运行测试服务器: node test-server.js');

console.log('\n🔗 API端点:');
console.log('- 健康检查: GET /health');
console.log('- 用户注册: POST /api/auth/register');
console.log('- 用户登录: POST /api/auth/login');
console.log('- 获取用户信息: GET /api/auth/me');
console.log('- 更多API请查看README.md文档');
