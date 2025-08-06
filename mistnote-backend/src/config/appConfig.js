const fs = require('fs');
const path = require('path');

class AppConfig {
  constructor() {
    this.configPath = path.join(__dirname, '../../config/app.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('加载配置文件失败:', error);
      // 返回默认配置
      return {
        userIdLength: 5,
        userIdMinValue: 10000,
        userIdMaxValue: 99999,
        allowCustomUserId: false,
        dataDirectory: "./user_data",
        database: {
          type: "sqlite",
          filename: "user.db"
        },
        storage: {
          picturesFolder: "pic",
          documentsFolder: "docs",
          avatarsFolder: "avatars"
        }
      };
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('保存配置文件失败:', error);
      return false;
    }
  }

  // 获取用户ID长度
  getUserIdLength() {
    return this.config.userIdLength;
  }

  // 获取用户ID范围
  getUserIdRange() {
    return {
      min: this.config.userIdMinValue,
      max: this.config.userIdMaxValue
    };
  }

  // 是否允许自定义用户ID
  isCustomUserIdAllowed() {
    return this.config.allowCustomUserId;
  }

  // 获取数据目录
  getDataDirectory() {
    return this.config.dataDirectory;
  }

  // 获取数据库配置
  getDatabaseConfig() {
    return this.config.database;
  }

  // 获取存储配置
  getStorageConfig() {
    return this.config.storage;
  }

  // 生成随机用户ID
  generateUserId() {
    const range = this.getUserIdRange();
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }

  // 更新配置
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.saveConfig();
  }
}

// 创建单例实例
const appConfig = new AppConfig();

module.exports = appConfig;
