import fs from 'fs';
import path from 'path';
import { app } from 'electron';

class ClientUserDataManager {
  constructor() {
    // 获取应用数据目录（用户电脑上的数据目录）
    this.baseDataDir = path.join(app.getPath('userData'), 'user_data');
    this.configPath = path.join(app.getPath('userData'), 'app_config.json');
    this.config = this.loadConfig();
    this.ensureBaseDirectory();
  }

  // 加载客户端配置
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.error('加载客户端配置失败:', error);
    }
    
    // 返回默认配置
    return {
      userIdLength: 5,
      currentUserId: null,
      lastSyncTime: null,
      storage: {
        picturesFolder: "pic",
        documentsFolder: "docs",
        avatarsFolder: "avatars",
        cacheFolder: "cache"
      }
    };
  }

  // 保存客户端配置
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('保存客户端配置失败:', error);
      return false;
    }
  }

  // 确保基础数据目录存在
  ensureBaseDirectory() {
    if (!fs.existsSync(this.baseDataDir)) {
      fs.mkdirSync(this.baseDataDir, { recursive: true });
    }
  }

  // 为用户创建本地数据目录
  createUserDirectory(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    
    try {
      // 创建用户主目录
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      // 创建子目录
      const subDirs = [
        this.config.storage.picturesFolder,
        this.config.storage.documentsFolder,
        this.config.storage.avatarsFolder,
        this.config.storage.cacheFolder
      ];

      subDirs.forEach(subDir => {
        const fullPath = path.join(userDir, subDir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      });

      console.log(`客户端用户目录创建成功: ${userDir}`);
      return userDir;
    } catch (error) {
      console.error(`创建客户端用户目录失败 (${userId}):`, error);
      throw error;
    }
  }

  // 获取用户数据库路径
  getUserDatabasePath(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    return path.join(userDir, 'user.db');
  }

  // 获取数据库初始化SQL语句
  getDatabaseInitSQL() {
    return {
      userInfo: `
        CREATE TABLE IF NOT EXISTS user_info (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          signature TEXT DEFAULT '',
          avatar_path TEXT DEFAULT '',
          location TEXT DEFAULT '',
          server_sync_time DATETIME,
          local_update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      chatMessages: `
        CREATE TABLE IF NOT EXISTS local_chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_message_id TEXT,
          user_id TEXT NOT NULL,
          contact_id TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          content TEXT NOT NULL,
          file_path TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_sent INTEGER DEFAULT 1,
          is_read INTEGER DEFAULT 0,
          sync_status TEXT DEFAULT 'pending',
          local_only INTEGER DEFAULT 0
        )
      `,
      contacts: `
        CREATE TABLE IF NOT EXISTS local_contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          contact_user_id TEXT NOT NULL,
          nickname TEXT,
          is_blocked INTEGER DEFAULT 0,
          server_sync_time DATETIME,
          local_update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, contact_user_id)
        )
      `,
      settings: `
        CREATE TABLE IF NOT EXISTS local_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          setting_key TEXT NOT NULL,
          setting_value TEXT,
          server_sync_time DATETIME,
          local_update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, setting_key)
        )
      `,
      syncStatus: `
        CREATE TABLE IF NOT EXISTS sync_status (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          last_sync_time DATETIME,
          sync_direction TEXT DEFAULT 'bidirectional',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(table_name)
        )
      `,
      avatarHistory: `
        CREATE TABLE IF NOT EXISTS avatar_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          avatar_filename TEXT NOT NULL,
          avatar_path TEXT NOT NULL,
          upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_current INTEGER DEFAULT 0,
          file_size INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    };
  }

  // 设置当前登录用户
  setCurrentUser(userId) {
    this.config.currentUserId = userId;
    this.saveConfig();
    
    // 创建用户目录
    this.createUserDirectory(userId);
    
    // 返回数据库路径和SQL语句，供主进程使用
    return {
      dbPath: this.getUserDatabasePath(userId),
      initSQL: this.getDatabaseInitSQL()
    };
  }

  // 获取当前登录用户ID
  getCurrentUserId() {
    return this.config.currentUserId;
  }

  // 获取保存用户信息SQL语句
  getSaveUserInfoSQL(userId, userInfo) {
    return {
      sql: `
        INSERT OR REPLACE INTO user_info 
        (user_id, display_name, signature, avatar_path, location, local_update_time) 
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      params: [
        userId,
        userInfo.displayName || '',
        userInfo.signature || '',
        userInfo.avatarPath || '',
        userInfo.location || ''
      ]
    };
  }

  // 获取用户各种目录路径
  getUserPicturesPath(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    return path.join(userDir, this.config.storage.picturesFolder);
  }

  getUserAvatarsPath(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    return path.join(userDir, this.config.storage.avatarsFolder);
  }

  getUserDocumentsPath(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    return path.join(userDir, this.config.storage.documentsFolder);
  }

  getUserCachePath(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    return path.join(userDir, this.config.storage.cacheFolder);
  }

  // 获取用户数据目录
  getUserDataPath(userId) {
    return path.join(this.baseDataDir, userId.toString());
  }

  // 清除用户本地数据
  async clearUserData(userId) {
    const userDir = this.getUserDataPath(userId);
    
    try {
      if (fs.existsSync(userDir)) {
        // 递归删除用户目录
        fs.rmSync(userDir, { recursive: true, force: true });
        console.log(`用户本地数据清除成功 (${userId})`);
      }
      
      // 如果是当前用户，清除配置
      if (this.config.currentUserId === userId) {
        this.config.currentUserId = null;
        this.saveConfig();
      }
      
      return true;
    } catch (error) {
      console.error(`清除用户本地数据失败 (${userId}):`, error);
      throw error;
    }
  }
}

export default ClientUserDataManager;
