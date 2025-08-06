const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const appConfig = require('../config/appConfig');

class UserDataManager {
  constructor() {
    this.baseDataDir = path.resolve(appConfig.getDataDirectory());
    this.ensureBaseDirectory();
  }

  // 确保基础数据目录存在
  ensureBaseDirectory() {
    if (!fs.existsSync(this.baseDataDir)) {
      fs.mkdirSync(this.baseDataDir, { recursive: true });
    }
  }

  // 为用户创建数据目录
  createUserDirectory(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    const storageConfig = appConfig.getStorageConfig();
    
    try {
      // 创建用户主目录
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      // 创建子目录
      const subDirs = [
        storageConfig.picturesFolder,
        storageConfig.documentsFolder,
        storageConfig.avatarsFolder
      ];

      subDirs.forEach(subDir => {
        const fullPath = path.join(userDir, subDir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      });

      console.log(`用户目录创建成功: ${userDir}`);
      return userDir;
    } catch (error) {
      console.error(`创建用户目录失败 (${userId}):`, error);
      throw error;
    }
  }

  // 获取用户数据库路径
  getUserDatabasePath(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    const dbConfig = appConfig.getDatabaseConfig();
    return path.join(userDir, dbConfig.filename);
  }

  // 初始化用户数据库
  async initializeUserDatabase(userId) {
    const dbPath = this.getUserDatabasePath(userId);
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error(`创建用户数据库失败 (${userId}):`, err);
          reject(err);
          return;
        }

        // 创建用户信息表
        db.serialize(() => {
          // 用户基本信息表
          db.run(`
            CREATE TABLE IF NOT EXISTS user_info (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT UNIQUE NOT NULL,
              display_name TEXT NOT NULL,
              signature TEXT DEFAULT '',
              avatar_path TEXT DEFAULT '',
              location TEXT DEFAULT '',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // 用户设置表
          db.run(`
            CREATE TABLE IF NOT EXISTS user_settings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT NOT NULL,
              setting_key TEXT NOT NULL,
              setting_value TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, setting_key)
            )
          `);

          // 聊天记录表
          db.run(`
            CREATE TABLE IF NOT EXISTS chat_messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT NOT NULL,
              contact_id TEXT NOT NULL,
              message_type TEXT DEFAULT 'text',
              content TEXT NOT NULL,
              file_path TEXT,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              is_sent INTEGER DEFAULT 1,
              is_read INTEGER DEFAULT 0
            )
          `);

          // 联系人表
          db.run(`
            CREATE TABLE IF NOT EXISTS contacts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT NOT NULL,
              contact_user_id TEXT NOT NULL,
              nickname TEXT,
              is_blocked INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, contact_user_id)
            )
          `);

          console.log(`用户数据库初始化成功 (${userId}): ${dbPath}`);
        });

        db.close((err) => {
          if (err) {
            console.error(`关闭数据库连接失败 (${userId}):`, err);
            reject(err);
          } else {
            resolve(dbPath);
          }
        });
      });
    });
  }

  // 保存用户基本信息到用户数据库
  async saveUserInfo(userId, userInfo) {
    const dbPath = this.getUserDatabasePath(userId);
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO user_info 
        (user_id, display_name, signature, avatar_path, location, updated_at) 
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run([
        userId,
        userInfo.displayName || '',
        userInfo.signature || '',
        userInfo.avatarPath || '',
        userInfo.location || ''
      ], function(err) {
        stmt.finalize();
        db.close();
        
        if (err) {
          console.error(`保存用户信息失败 (${userId}):`, err);
          reject(err);
        } else {
          console.log(`用户信息保存成功 (${userId})`);
          resolve(this.lastID);
        }
      });
    });
  }

  // 获取用户图片目录路径
  getUserPicturesPath(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    const storageConfig = appConfig.getStorageConfig();
    return path.join(userDir, storageConfig.picturesFolder);
  }

  // 获取用户头像目录路径
  getUserAvatarsPath(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    const storageConfig = appConfig.getStorageConfig();
    return path.join(userDir, storageConfig.avatarsFolder);
  }
}

// 创建单例实例
const userDataManager = new UserDataManager();

module.exports = userDataManager;
