# MistNote Backend

MistNote即时通讯应用的Node.js后端服务，提供用户认证、实时聊天、联系人管理等功能。

## 技术栈

- **Node.js** - 运行时环境
- **Express.js** - Web框架
- **MongoDB** - 数据库
- **Mongoose** - ODM
- **Socket.IO** - 实时通信
- **JWT** - 身份认证
- **Multer** - 文件上传
- **Winston** - 日志管理

## 项目结构

```
src/
├── app.js              # 应用入口文件
├── config/
│   └── database.js     # 数据库配置
├── models/
│   ├── User.js         # 用户模型
│   ├── Message.js      # 消息模型
│   └── Group.js        # 群组模型
├── routes/
│   ├── auth.js         # 认证路由
│   ├── user.js         # 用户路由
│   ├── contact.js      # 联系人路由
│   ├── chat.js         # 聊天路由
│   └── upload.js       # 文件上传路由
├── middleware/
│   ├── auth.js         # 认证中间件
│   └── errorHandler.js # 错误处理中间件
├── socket/
│   └── socketHandler.js # Socket.IO处理器
└── utils/
    └── logger.js       # 日志工具
```

## 安装与运行

### 1. 安装依赖

```bash
cd mistnote-backend
npm install
```

### 2. 环境配置

复制环境变量示例文件并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接和其他参数。

### 3. 启动MongoDB

确保MongoDB服务正在运行：

```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### 4. 运行应用

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## API文档

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新令牌
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/logout` - 用户登出

### 用户相关

- `GET /api/users/profile` - 获取用户资料
- `PUT /api/users/profile` - 更新用户资料
- `PUT /api/users/status` - 更新用户状态
- `GET /api/users/search` - 搜索用户
- `GET /api/users/:userId` - 获取用户详情
- `POST /api/users/:userId/like` - 给用户点赞

### 联系人相关

- `GET /api/contacts` - 获取联系人列表
- `POST /api/contacts` - 添加联系人
- `PUT /api/contacts/:contactId` - 更新联系人备注
- `DELETE /api/contacts/:contactId` - 删除联系人
- `PUT /api/contacts/:contactId/block` - 屏蔽/取消屏蔽联系人

### 聊天相关

- `GET /api/chats` - 获取聊天列表
- `GET /api/chats/:userId` - 获取与指定用户的聊天记录
- `POST /api/chats` - 发送消息
- `PUT /api/chats/:messageId/recall` - 撤回消息
- `DELETE /api/chats/:messageId` - 删除消息

### 文件上传

- `POST /api/upload/avatar` - 上传头像
- `POST /api/upload/file` - 上传文件
- `POST /api/upload/image` - 上传图片

## Socket.IO事件

### 客户端发送事件

- `send_message` - 发送消息
- `mark_as_read` - 标记消息已读
- `update_status` - 更新用户状态
- `typing` - 正在输入
- `send_like` - 发送点赞
- `get_online_users` - 获取在线用户列表

### 服务端发送事件

- `new_message` - 新消息
- `message_sent` - 消息发送确认
- `message_read` - 消息已读通知
- `user_online` - 用户上线
- `user_offline` - 用户离线
- `user_status_changed` - 用户状态变更
- `user_typing` - 用户正在输入
- `received_like` - 收到点赞
- `online_users_list` - 在线用户列表

## 数据模型

### 用户模型 (User)

```javascript
{
  username: String,        // 用户名
  email: String,          // 邮箱
  password: String,       // 密码（加密）
  profile: {              // 个人资料
    nickname: String,     // 昵称
    avatar: String,       // 头像URL
    signature: String,    // 个性签名
    gender: String,       // 性别
    birthday: Date,       // 生日
    country: String,      // 国家
    province: String,     // 省份
    city: String,         // 城市
    phone: String         // 手机号
  },
  status: String,         // 在线状态
  statusText: String,     // 状态文本
  isOnline: Boolean,      // 是否在线
  lastSeen: Date,         // 最后在线时间
  level: Number,          // 等级
  likes: Number,          // 点赞数
  contacts: [ContactSchema], // 联系人列表
  settings: Object        // 用户设置
}
```

### 消息模型 (Message)

```javascript
{
  sender: ObjectId,       // 发送者
  receiver: ObjectId,     // 接收者
  receiverType: String,   // 接收者类型（User/Group）
  content: String,        // 消息内容
  messageType: String,    // 消息类型
  fileInfo: Object,       // 文件信息
  status: String,         // 消息状态
  readBy: [ReadSchema],   // 已读用户列表
  replyTo: ObjectId,      // 回复消息
  isDeleted: Boolean,     // 是否已删除
  isRecalled: Boolean     // 是否已撤回
}
```

## 开发指南

### 添加新的API端点

1. 在相应的路由文件中添加路由处理函数
2. 使用适当的中间件进行认证和验证
3. 添加错误处理
4. 更新API文档

### 添加新的Socket事件

1. 在 `socketHandler.js` 中添加事件处理器
2. 确保适当的认证和权限检查
3. 添加错误处理和日志记录

### 数据库操作

- 使用Mongoose进行数据库操作
- 添加适当的索引以提高查询性能
- 使用事务处理复杂的数据操作

## 部署

### 使用PM2部署

```bash
npm install -g pm2
pm2 start src/app.js --name "mistnote-backend"
pm2 startup
pm2 save
```

### 使用Docker部署

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 许可证

MIT License
