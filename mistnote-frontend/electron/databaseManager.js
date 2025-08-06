import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

class DatabaseManager {
  constructor() {
    this.databases = new Map(); // 存储打开的数据库连接
  }

  // 获取或创建数据库连接
  async getDatabase(dbPath) {
    if (this.databases.has(dbPath)) {
      return this.databases.get(dbPath);
    }

    return new Promise((resolve, reject) => {
      try {
        // 确保数据库目录存在
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        const db = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            console.error(`创建数据库连接失败: ${dbPath}`, err);
            reject(err);
            return;
          }

          // 手动包装异步方法
          db.runAsync = (sql, params = []) => {
            return new Promise((resolve, reject) => {
              db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes, lastID: this.lastID });
              });
            });
          };

          db.getAsync = (sql, params = []) => {
            return new Promise((resolve, reject) => {
              db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
            });
          };

          db.allAsync = (sql, params = []) => {
            return new Promise((resolve, reject) => {
              db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
              });
            });
          };

          db.execAsync = (sql) => {
            return new Promise((resolve, reject) => {
              db.exec(sql, (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          };

          this.databases.set(dbPath, db);
          console.log(`数据库连接创建成功: ${dbPath}`);
          resolve(db);
        });
      } catch (error) {
        console.error(`创建数据库连接失败: ${dbPath}`, error);
        reject(error);
      }
    });
  }

  // 初始化用户数据库
  async initializeUserDatabase(dbPath, initSQL) {
    try {
      const db = await this.getDatabase(dbPath);
      
      // 执行所有初始化SQL语句
      for (const sql of Object.values(initSQL)) {
        await db.execAsync(sql);
      }

      console.log(`用户数据库初始化成功: ${dbPath}`);
      return true;
    } catch (error) {
      console.error(`用户数据库初始化失败: ${dbPath}`, error);
      throw error;
    }
  }

  // 保存用户信息
  async saveUserInfo(dbPath, userId, userInfo) {
    try {
      const db = await this.getDatabase(dbPath);
      
      const sql = `
        INSERT OR REPLACE INTO user_info 
        (user_id, display_name, signature, avatar_path, location, local_update_time) 
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const result = await db.runAsync(sql, [
        userId,
        userInfo.displayName || '',
        userInfo.signature || '',
        userInfo.avatarPath || '',
        userInfo.location || ''
      ]);

      console.log(`用户信息保存成功 (${userId}):`, result.changes);
      return result;
    } catch (error) {
      console.error(`保存用户信息失败 (${userId}):`, error);
      throw error;
    }
  }

  // 获取用户信息
  async getUserInfo(dbPath, userId) {
    try {
      const db = await this.getDatabase(dbPath);
      
      const sql = `SELECT * FROM user_info WHERE user_id = ?`;
      const result = await db.getAsync(sql, [userId]);
      return result;
    } catch (error) {
      console.error(`获取用户信息失败 (${userId}):`, error);
      throw error;
    }
  }

  // 保存聊天消息
  async saveChatMessage(dbPath, messageData) {
    try {
      const db = await this.getDatabase(dbPath);
      
      const sql = `
        INSERT INTO local_chat_messages 
        (server_message_id, user_id, contact_id, message_type, content, file_path, timestamp, is_sent, is_read, sync_status, local_only) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await db.runAsync(sql, [
        messageData.serverMessageId || null,
        messageData.userId,
        messageData.contactId,
        messageData.messageType || 'text',
        messageData.content,
        messageData.filePath || null,
        messageData.timestamp || new Date().toISOString(),
        messageData.isSent ? 1 : 0,
        messageData.isRead ? 1 : 0,
        messageData.syncStatus || 'pending',
        messageData.localOnly ? 1 : 0
      ]);

      console.log(`聊天消息保存成功:`, result.changes);
      return result;
    } catch (error) {
      console.error(`保存聊天消息失败:`, error);
      throw error;
    }
  }

  // 获取聊天消息
  async getChatMessages(dbPath, userId, contactId, limit = 50, offset = 0) {
    try {
      const db = await this.getDatabase(dbPath);
      
      const sql = `
        SELECT * FROM local_chat_messages 
        WHERE user_id = ? AND contact_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `;
      
      const result = await db.allAsync(sql, [userId, contactId, limit, offset]);
      return result;
    } catch (error) {
      console.error(`获取聊天消息失败:`, error);
      throw error;
    }
  }

  // 保存联系人
  saveContact(dbPath, contactData) {
    try {
      const db = this.getDatabase(dbPath);
      
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO local_contacts 
        (user_id, contact_user_id, nickname, is_blocked, local_update_time) 
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      const result = stmt.run(
        contactData.userId,
        contactData.contactUserId,
        contactData.nickname || null,
        contactData.isBlocked ? 1 : 0
      );

      console.log(`联系人保存成功:`, result.changes);
      return result;
    } catch (error) {
      console.error(`保存联系人失败:`, error);
      throw error;
    }
  }

  // 获取联系人列表
  getContacts(dbPath, userId) {
    try {
      const db = this.getDatabase(dbPath);
      
      const stmt = db.prepare(`
        SELECT * FROM local_contacts 
        WHERE user_id = ? AND is_blocked = 0 
        ORDER BY created_at DESC
      `);
      
      const result = stmt.all(userId);
      return result;
    } catch (error) {
      console.error(`获取联系人列表失败:`, error);
      throw error;
    }
  }

  // 保存设置
  saveSetting(dbPath, userId, key, value) {
    try {
      const db = this.getDatabase(dbPath);
      
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO local_settings 
        (user_id, setting_key, setting_value, local_update_time) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      const result = stmt.run(userId, key, value);
      console.log(`设置保存成功 (${key}):`, result.changes);
      return result;
    } catch (error) {
      console.error(`保存设置失败 (${key}):`, error);
      throw error;
    }
  }

  // 获取设置
  getSetting(dbPath, userId, key) {
    try {
      const db = this.getDatabase(dbPath);
      
      const stmt = db.prepare(`
        SELECT setting_value FROM local_settings 
        WHERE user_id = ? AND setting_key = ?
      `);
      
      const result = stmt.get(userId, key);
      return result ? result.setting_value : null;
    } catch (error) {
      console.error(`获取设置失败 (${key}):`, error);
      throw error;
    }
  }

  // 获取所有设置
  getAllSettings(dbPath, userId) {
    try {
      const db = this.getDatabase(dbPath);
      
      const stmt = db.prepare(`
        SELECT setting_key, setting_value FROM local_settings 
        WHERE user_id = ?
      `);
      
      const result = stmt.all(userId);
      const settings = {};
      result.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
      return settings;
    } catch (error) {
      console.error(`获取所有设置失败:`, error);
      throw error;
    }
  }

  // 执行自定义SQL查询
  executeQuery(dbPath, sql, params = []) {
    try {
      const db = this.getDatabase(dbPath);
      
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
      } else {
        const stmt = db.prepare(sql);
        return stmt.run(...params);
      }
    } catch (error) {
      console.error(`执行SQL查询失败:`, error);
      throw error;
    }
  }

  // 关闭数据库连接
  closeDatabase(dbPath) {
    if (this.databases.has(dbPath)) {
      const db = this.databases.get(dbPath);
      db.close();
      this.databases.delete(dbPath);
      console.log(`数据库连接关闭: ${dbPath}`);
    }
  }

  // 关闭所有数据库连接
  closeAllDatabases() {
    for (const [dbPath, db] of this.databases) {
      try {
        db.close();
        console.log(`数据库连接关闭: ${dbPath}`);
      } catch (error) {
        console.error(`关闭数据库连接失败: ${dbPath}`, error);
      }
    }
    this.databases.clear();
  }

  // 清理用户数据库
  clearUserDatabase(dbPath) {
    try {
      this.closeDatabase(dbPath);
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log(`用户数据库文件删除成功: ${dbPath}`);
      }
      return true;
    } catch (error) {
      console.error(`清理用户数据库失败: ${dbPath}`, error);
      throw error;
    }
  }

  // 保存头像信息
  async saveAvatarInfo(dbPath, userId, avatarData) {
    try {
      const db = await this.getDatabase(dbPath);
      
      // 先将所有头像设为非当前
      const updateSql = `UPDATE avatar_history SET is_current = 0 WHERE user_id = ?`;
      await db.runAsync(updateSql, [userId]);
      
      // 插入新头像记录
      const insertSql = `
        INSERT INTO avatar_history 
        (user_id, avatar_filename, avatar_path, upload_time, is_current) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      
      const result = await db.runAsync(insertSql, [
        userId,
        avatarData.filename,
        avatarData.path
      ]);

      console.log(`头像信息保存成功 (${userId}):`, result.changes);
      return result;
    } catch (error) {
      console.error(`保存头像信息失败 (${userId}):`, error);
      throw error;
    }
  }

  // 获取当前头像
  async getCurrentAvatar(dbPath, userId) {
    try {
      const db = await this.getDatabase(dbPath);
      
      const sql = `
        SELECT * FROM avatar_history 
        WHERE user_id = ? AND is_current = 1 
        ORDER BY upload_time DESC 
        LIMIT 1
      `;
      
      const result = await db.getAsync(sql, [userId]);
      return result;
    } catch (error) {
      console.error(`获取当前头像失败 (${userId}):`, error);
      throw error;
    }
  }

  // 获取头像历史
  async getAvatarHistory(dbPath, userId, limit = 10) {
    try {
      const db = await this.getDatabase(dbPath);
      
      const sql = `
        SELECT * FROM avatar_history 
        WHERE user_id = ? 
        ORDER BY upload_time DESC 
        LIMIT ?
      `;
      
      const result = await db.allAsync(sql, [userId, limit]);
      return result;
    } catch (error) {
      console.error(`获取头像历史失败 (${userId}):`, error);
      throw error;
    }
  }

  // 关闭所有数据库连接
  closeAllDatabases() {
    for (const [dbPath, db] of this.databases) {
      try {
        db.close((err) => {
          if (err) {
            console.error(`关闭数据库连接失败: ${dbPath}`, err);
          } else {
            console.log(`数据库连接已关闭: ${dbPath}`);
          }
        });
      } catch (error) {
        console.error(`关闭数据库连接异常: ${dbPath}`, error);
      }
    }
    this.databases.clear();
  }

  // 关闭特定数据库连接
  closeDatabase(dbPath) {
    if (this.databases.has(dbPath)) {
      try {
        const db = this.databases.get(dbPath);
        db.close();
        this.databases.delete(dbPath);
        console.log(`数据库连接已关闭: ${dbPath}`);
      } catch (error) {
        console.error(`关闭数据库连接失败: ${dbPath}`, error);
      }
    }
  }

}

export default DatabaseManager;
