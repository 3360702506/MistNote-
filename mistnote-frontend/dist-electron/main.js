import { app, BrowserWindow, ipcMain, shell } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import fs$1 from "fs";
import path from "path";
import require$$2 from "events";
import require$$0 from "util";
class ClientUserDataManager {
  constructor() {
    this.baseDataDir = path.join(app.getPath("userData"), "user_data");
    this.configPath = path.join(app.getPath("userData"), "app_config.json");
    this.config = this.loadConfig();
    this.ensureBaseDirectory();
  }
  // 加载客户端配置
  loadConfig() {
    try {
      if (fs$1.existsSync(this.configPath)) {
        const configData = fs$1.readFileSync(this.configPath, "utf8");
        return JSON.parse(configData);
      }
    } catch (error) {
      console.error("加载客户端配置失败:", error);
    }
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
      fs$1.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error("保存客户端配置失败:", error);
      return false;
    }
  }
  // 确保基础数据目录存在
  ensureBaseDirectory() {
    if (!fs$1.existsSync(this.baseDataDir)) {
      fs$1.mkdirSync(this.baseDataDir, { recursive: true });
    }
  }
  // 为用户创建本地数据目录
  createUserDirectory(userId) {
    const userDir = path.join(this.baseDataDir, userId.toString());
    try {
      if (!fs$1.existsSync(userDir)) {
        fs$1.mkdirSync(userDir, { recursive: true });
      }
      const subDirs = [
        this.config.storage.picturesFolder,
        this.config.storage.documentsFolder,
        this.config.storage.avatarsFolder,
        this.config.storage.cacheFolder
      ];
      subDirs.forEach((subDir) => {
        const fullPath = path.join(userDir, subDir);
        if (!fs$1.existsSync(fullPath)) {
          fs$1.mkdirSync(fullPath, { recursive: true });
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
    return path.join(userDir, "user.db");
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
      `,
      userCache: `
        CREATE TABLE IF NOT EXISTS user_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          display_name TEXT DEFAULT '',
          signature TEXT DEFAULT '',
          avatar TEXT DEFAULT '',
          location TEXT DEFAULT '',
          status TEXT DEFAULT 'offline',
          last_seen DATETIME,
          cache_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    };
  }
  // 设置当前登录用户
  setCurrentUser(userId) {
    this.config.currentUserId = userId;
    this.saveConfig();
    this.createUserDirectory(userId);
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
        userInfo.displayName || "",
        userInfo.signature || "",
        userInfo.avatarPath || "",
        userInfo.location || ""
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
      if (fs$1.existsSync(userDir)) {
        fs$1.rmSync(userDir, { recursive: true, force: true });
        console.log(`用户本地数据清除成功 (${userId})`);
      }
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
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var sqlite3$1 = { exports: {} };
function commonjsRequire(path2) {
  throw new Error('Could not dynamically require "' + path2 + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var bindings = { exports: {} };
var fileUriToPath_1;
var hasRequiredFileUriToPath;
function requireFileUriToPath() {
  if (hasRequiredFileUriToPath) return fileUriToPath_1;
  hasRequiredFileUriToPath = 1;
  var sep = path.sep || "/";
  fileUriToPath_1 = fileUriToPath;
  function fileUriToPath(uri) {
    if ("string" != typeof uri || uri.length <= 7 || "file://" != uri.substring(0, 7)) {
      throw new TypeError("must pass in a file:// URI to convert to a file path");
    }
    var rest = decodeURI(uri.substring(7));
    var firstSlash = rest.indexOf("/");
    var host = rest.substring(0, firstSlash);
    var path2 = rest.substring(firstSlash + 1);
    if ("localhost" == host) host = "";
    if (host) {
      host = sep + sep + host;
    }
    path2 = path2.replace(/^(.+)\|/, "$1:");
    if (sep == "\\") {
      path2 = path2.replace(/\//g, "\\");
    }
    if (/^.+\:/.test(path2)) ;
    else {
      path2 = sep + path2;
    }
    return host + path2;
  }
  return fileUriToPath_1;
}
var hasRequiredBindings;
function requireBindings() {
  if (hasRequiredBindings) return bindings.exports;
  hasRequiredBindings = 1;
  (function(module, exports) {
    var fs2 = fs$1, path$12 = path, fileURLToPath2 = requireFileUriToPath(), join = path$12.join, dirname = path$12.dirname, exists = fs2.accessSync && function(path2) {
      try {
        fs2.accessSync(path2);
      } catch (e) {
        return false;
      }
      return true;
    } || fs2.existsSync || path$12.existsSync, defaults = {
      arrow: process.env.NODE_BINDINGS_ARROW || " → ",
      compiled: process.env.NODE_BINDINGS_COMPILED_DIR || "compiled",
      platform: process.platform,
      arch: process.arch,
      nodePreGyp: "node-v" + process.versions.modules + "-" + process.platform + "-" + process.arch,
      version: process.versions.node,
      bindings: "bindings.node",
      try: [
        // node-gyp's linked version in the "build" dir
        ["module_root", "build", "bindings"],
        // node-waf and gyp_addon (a.k.a node-gyp)
        ["module_root", "build", "Debug", "bindings"],
        ["module_root", "build", "Release", "bindings"],
        // Debug files, for development (legacy behavior, remove for node v0.9)
        ["module_root", "out", "Debug", "bindings"],
        ["module_root", "Debug", "bindings"],
        // Release files, but manually compiled (legacy behavior, remove for node v0.9)
        ["module_root", "out", "Release", "bindings"],
        ["module_root", "Release", "bindings"],
        // Legacy from node-waf, node <= 0.4.x
        ["module_root", "build", "default", "bindings"],
        // Production "Release" buildtype binary (meh...)
        ["module_root", "compiled", "version", "platform", "arch", "bindings"],
        // node-qbs builds
        ["module_root", "addon-build", "release", "install-root", "bindings"],
        ["module_root", "addon-build", "debug", "install-root", "bindings"],
        ["module_root", "addon-build", "default", "install-root", "bindings"],
        // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
        ["module_root", "lib", "binding", "nodePreGyp", "bindings"]
      ]
    };
    function bindings2(opts) {
      if (typeof opts == "string") {
        opts = { bindings: opts };
      } else if (!opts) {
        opts = {};
      }
      Object.keys(defaults).map(function(i2) {
        if (!(i2 in opts)) opts[i2] = defaults[i2];
      });
      if (!opts.module_root) {
        opts.module_root = exports.getRoot(exports.getFileName());
      }
      if (path$12.extname(opts.bindings) != ".node") {
        opts.bindings += ".node";
      }
      var requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
      var tries = [], i = 0, l = opts.try.length, n, b, err;
      for (; i < l; i++) {
        n = join.apply(
          null,
          opts.try[i].map(function(p) {
            return opts[p] || p;
          })
        );
        tries.push(n);
        try {
          b = opts.path ? requireFunc.resolve(n) : requireFunc(n);
          if (!opts.path) {
            b.path = n;
          }
          return b;
        } catch (e) {
          if (e.code !== "MODULE_NOT_FOUND" && e.code !== "QUALIFIED_PATH_RESOLUTION_FAILED" && !/not find/i.test(e.message)) {
            throw e;
          }
        }
      }
      err = new Error(
        "Could not locate the bindings file. Tried:\n" + tries.map(function(a) {
          return opts.arrow + a;
        }).join("\n")
      );
      err.tries = tries;
      throw err;
    }
    module.exports = exports = bindings2;
    exports.getFileName = function getFileName(calling_file) {
      var origPST = Error.prepareStackTrace, origSTL = Error.stackTraceLimit, dummy = {}, fileName;
      Error.stackTraceLimit = 10;
      Error.prepareStackTrace = function(e, st) {
        for (var i = 0, l = st.length; i < l; i++) {
          fileName = st[i].getFileName();
          if (fileName !== __filename) {
            if (calling_file) {
              if (fileName !== calling_file) {
                return;
              }
            } else {
              return;
            }
          }
        }
      };
      Error.captureStackTrace(dummy);
      dummy.stack;
      Error.prepareStackTrace = origPST;
      Error.stackTraceLimit = origSTL;
      var fileSchema = "file://";
      if (fileName.indexOf(fileSchema) === 0) {
        fileName = fileURLToPath2(fileName);
      }
      return fileName;
    };
    exports.getRoot = function getRoot(file) {
      var dir = dirname(file), prev;
      while (true) {
        if (dir === ".") {
          dir = process.cwd();
        }
        if (exists(join(dir, "package.json")) || exists(join(dir, "node_modules"))) {
          return dir;
        }
        if (prev === dir) {
          throw new Error(
            'Could not find module root given file: "' + file + '". Do you have a `package.json` file? '
          );
        }
        prev = dir;
        dir = join(dir, "..");
      }
    };
  })(bindings, bindings.exports);
  return bindings.exports;
}
var sqlite3Binding;
var hasRequiredSqlite3Binding;
function requireSqlite3Binding() {
  if (hasRequiredSqlite3Binding) return sqlite3Binding;
  hasRequiredSqlite3Binding = 1;
  sqlite3Binding = requireBindings()("node_sqlite3.node");
  return sqlite3Binding;
}
var trace = {};
var hasRequiredTrace;
function requireTrace() {
  if (hasRequiredTrace) return trace;
  hasRequiredTrace = 1;
  const util = require$$0;
  function extendTrace(object, property, pos) {
    const old = object[property];
    object[property] = function() {
      const error = new Error();
      const name = object.constructor.name + "#" + property + "(" + Array.prototype.slice.call(arguments).map(function(el) {
        return util.inspect(el, false, 0);
      }).join(", ") + ")";
      if (typeof pos === "undefined") pos = -1;
      if (pos < 0) pos += arguments.length;
      const cb = arguments[pos];
      if (typeof arguments[pos] === "function") {
        arguments[pos] = function replacement() {
          const err = arguments[0];
          if (err && err.stack && !err.__augmented) {
            err.stack = filter(err).join("\n");
            err.stack += "\n--> in " + name;
            err.stack += "\n" + filter(error).slice(1).join("\n");
            err.__augmented = true;
          }
          return cb.apply(this, arguments);
        };
      }
      return old.apply(this, arguments);
    };
  }
  trace.extendTrace = extendTrace;
  function filter(error) {
    return error.stack.split("\n").filter(function(line) {
      return line.indexOf(__filename) < 0;
    });
  }
  return trace;
}
var hasRequiredSqlite3;
function requireSqlite3() {
  if (hasRequiredSqlite3) return sqlite3$1.exports;
  hasRequiredSqlite3 = 1;
  (function(module, exports) {
    const path$12 = path;
    const sqlite32 = requireSqlite3Binding();
    const EventEmitter = require$$2.EventEmitter;
    module.exports = sqlite32;
    function normalizeMethod(fn) {
      return function(sql) {
        let errBack;
        const args = Array.prototype.slice.call(arguments, 1);
        if (typeof args[args.length - 1] === "function") {
          const callback = args[args.length - 1];
          errBack = function(err) {
            if (err) {
              callback(err);
            }
          };
        }
        const statement = new Statement(this, sql, errBack);
        return fn.call(this, statement, args);
      };
    }
    function inherits(target, source) {
      for (const k in source.prototype)
        target.prototype[k] = source.prototype[k];
    }
    sqlite32.cached = {
      Database: function(file, a, b) {
        if (file === "" || file === ":memory:") {
          return new Database(file, a, b);
        }
        let db;
        file = path$12.resolve(file);
        if (!sqlite32.cached.objects[file]) {
          db = sqlite32.cached.objects[file] = new Database(file, a, b);
        } else {
          db = sqlite32.cached.objects[file];
          const callback = typeof a === "number" ? b : a;
          if (typeof callback === "function") {
            let cb = function() {
              callback.call(db, null);
            };
            if (db.open) process.nextTick(cb);
            else db.once("open", cb);
          }
        }
        return db;
      },
      objects: {}
    };
    const Database = sqlite32.Database;
    const Statement = sqlite32.Statement;
    const Backup = sqlite32.Backup;
    inherits(Database, EventEmitter);
    inherits(Statement, EventEmitter);
    inherits(Backup, EventEmitter);
    Database.prototype.prepare = normalizeMethod(function(statement, params) {
      return params.length ? statement.bind.apply(statement, params) : statement;
    });
    Database.prototype.run = normalizeMethod(function(statement, params) {
      statement.run.apply(statement, params).finalize();
      return this;
    });
    Database.prototype.get = normalizeMethod(function(statement, params) {
      statement.get.apply(statement, params).finalize();
      return this;
    });
    Database.prototype.all = normalizeMethod(function(statement, params) {
      statement.all.apply(statement, params).finalize();
      return this;
    });
    Database.prototype.each = normalizeMethod(function(statement, params) {
      statement.each.apply(statement, params).finalize();
      return this;
    });
    Database.prototype.map = normalizeMethod(function(statement, params) {
      statement.map.apply(statement, params).finalize();
      return this;
    });
    Database.prototype.backup = function() {
      let backup;
      if (arguments.length <= 2) {
        backup = new Backup(this, arguments[0], "main", "main", true, arguments[1]);
      } else {
        backup = new Backup(this, arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
      }
      backup.retryErrors = [sqlite32.BUSY, sqlite32.LOCKED];
      return backup;
    };
    Statement.prototype.map = function() {
      const params = Array.prototype.slice.call(arguments);
      const callback = params.pop();
      params.push(function(err, rows) {
        if (err) return callback(err);
        const result = {};
        if (rows.length) {
          const keys = Object.keys(rows[0]);
          const key = keys[0];
          if (keys.length > 2) {
            for (let i = 0; i < rows.length; i++) {
              result[rows[i][key]] = rows[i];
            }
          } else {
            const value = keys[1];
            for (let i = 0; i < rows.length; i++) {
              result[rows[i][key]] = rows[i][value];
            }
          }
        }
        callback(err, result);
      });
      return this.all.apply(this, params);
    };
    let isVerbose = false;
    const supportedEvents = ["trace", "profile", "change"];
    Database.prototype.addListener = Database.prototype.on = function(type) {
      const val = EventEmitter.prototype.addListener.apply(this, arguments);
      if (supportedEvents.indexOf(type) >= 0) {
        this.configure(type, true);
      }
      return val;
    };
    Database.prototype.removeListener = function(type) {
      const val = EventEmitter.prototype.removeListener.apply(this, arguments);
      if (supportedEvents.indexOf(type) >= 0 && !this._events[type]) {
        this.configure(type, false);
      }
      return val;
    };
    Database.prototype.removeAllListeners = function(type) {
      const val = EventEmitter.prototype.removeAllListeners.apply(this, arguments);
      if (supportedEvents.indexOf(type) >= 0) {
        this.configure(type, false);
      }
      return val;
    };
    sqlite32.verbose = function() {
      if (!isVerbose) {
        const trace2 = requireTrace();
        [
          "prepare",
          "get",
          "run",
          "all",
          "each",
          "map",
          "close",
          "exec"
        ].forEach(function(name) {
          trace2.extendTrace(Database.prototype, name);
        });
        [
          "bind",
          "get",
          "run",
          "all",
          "each",
          "map",
          "reset",
          "finalize"
        ].forEach(function(name) {
          trace2.extendTrace(Statement.prototype, name);
        });
        isVerbose = true;
      }
      return sqlite32;
    };
  })(sqlite3$1);
  return sqlite3$1.exports;
}
var sqlite3Exports = requireSqlite3();
const sqlite3 = /* @__PURE__ */ getDefaultExportFromCjs(sqlite3Exports);
class DatabaseManager {
  constructor() {
    this.databases = /* @__PURE__ */ new Map();
  }
  // 获取或创建数据库连接
  async getDatabase(dbPath) {
    if (this.databases.has(dbPath)) {
      return this.databases.get(dbPath);
    }
    return new Promise((resolve, reject) => {
      try {
        const dbDir = path.dirname(dbPath);
        if (!fs$1.existsSync(dbDir)) {
          fs$1.mkdirSync(dbDir, { recursive: true });
        }
        const db = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            console.error(`创建数据库连接失败: ${dbPath}`, err);
            reject(err);
            return;
          }
          db.runAsync = (sql, params = []) => {
            return new Promise((resolve2, reject2) => {
              db.run(sql, params, function(err2) {
                if (err2) reject2(err2);
                else resolve2({ changes: this.changes, lastID: this.lastID });
              });
            });
          };
          db.getAsync = (sql, params = []) => {
            return new Promise((resolve2, reject2) => {
              db.get(sql, params, (err2, row) => {
                if (err2) reject2(err2);
                else resolve2(row);
              });
            });
          };
          db.allAsync = (sql, params = []) => {
            return new Promise((resolve2, reject2) => {
              db.all(sql, params, (err2, rows) => {
                if (err2) reject2(err2);
                else resolve2(rows);
              });
            });
          };
          db.execAsync = (sql) => {
            return new Promise((resolve2, reject2) => {
              db.exec(sql, (err2) => {
                if (err2) reject2(err2);
                else resolve2();
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
        userInfo.displayName || "",
        userInfo.signature || "",
        userInfo.avatarPath || "",
        userInfo.location || ""
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
        messageData.messageType || "text",
        messageData.content,
        messageData.filePath || null,
        messageData.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        messageData.isSent ? 1 : 0,
        messageData.isRead ? 1 : 0,
        messageData.syncStatus || "pending",
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
      result.forEach((row) => {
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
      if (sql.trim().toUpperCase().startsWith("SELECT")) {
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
      if (fs$1.existsSync(dbPath)) {
        fs$1.unlinkSync(dbPath);
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
      const updateSql = `UPDATE avatar_history SET is_current = 0 WHERE user_id = ?`;
      await db.runAsync(updateSql, [userId]);
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
const require2 = createRequire(import.meta.url);
const __dirname = path$1.dirname(fileURLToPath(import.meta.url));
process.env.ROOT = path$1.join(__dirname, "../..");
process.env.DIST = path$1.join(process.env.ROOT, "dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL ? path$1.join(process.env.ROOT, "public") : process.env.DIST;
if (process.platform === "win32") app.disableHardwareAcceleration();
if (process.platform === "win32") app.setAppUserModelId(app.getName());
let loginWin = null;
let mainWin = null;
const preload = process.env.VITE_DEV_SERVER_URL ? path$1.join(__dirname, "preload.js") : path$1.join(__dirname, "preload.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = path$1.join(process.env.DIST, "index.html");
let clientUserDataManager = null;
let databaseManager = null;
async function createLoginWindow() {
  loginWin = new BrowserWindow({
    title: "MistNote - 登录",
    icon: path$1.join(process.env.VITE_PUBLIC, "favicon.ico"),
    width: 400,
    height: 600,
    resizable: false,
    frame: false,
    // 无边框窗口
    titleBarStyle: "hidden",
    center: true,
    show: false,
    // 先不显示，等加载完成后再显示
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });
  if (url) {
    loginWin.loadURL(`${url}?page=login`);
    loginWin.webContents.openDevTools();
  } else {
    loginWin.loadFile(indexHtml, { search: "?page=login" });
  }
  loginWin.webContents.on("did-finish-load", () => {
    loginWin.show();
  });
  loginWin.setMenuBarVisibility(false);
  loginWin.webContents.on("ipc-message", (event, channel) => {
    if (channel === "login-success") {
      createMainWindow();
      loginWin.close();
    }
  });
  loginWin.on("closed", () => {
    loginWin = null;
  });
}
async function createMainWindow() {
  mainWin = new BrowserWindow({
    title: "MistNote",
    icon: path$1.join(process.env.VITE_PUBLIC, "favicon.ico"),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    // 无边框窗口，仿QQ NT风格
    titleBarStyle: "hidden",
    show: false,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });
  if (url) {
    mainWin.loadURL(`${url}?page=chat`);
    mainWin.webContents.openDevTools();
  } else {
    mainWin.loadFile(indexHtml, { search: "?page=chat" });
  }
  mainWin.webContents.on("did-finish-load", () => {
    mainWin.show();
  });
  mainWin.webContents.setWindowOpenHandler(({ url: url2 }) => {
    if (url2.startsWith("https:")) shell.openExternal(url2);
    return { action: "deny" };
  });
  mainWin.setMenuBarVisibility(false);
  mainWin.on("maximize", () => {
    mainWin.webContents.send("window-maximized");
  });
  mainWin.on("unmaximize", () => {
    mainWin.webContents.send("window-unmaximized");
  });
  mainWin.on("closed", () => {
    mainWin = null;
  });
}
app.whenReady().then(() => {
  clientUserDataManager = new ClientUserDataManager();
  databaseManager = new DatabaseManager();
  createLoginWindow();
  app.on("activate", function() {
    if (BrowserWindow.getAllWindows().length === 0) createLoginWindow();
  });
});
app.on("window-all-closed", () => {
  loginWin = null;
  mainWin = null;
  if (process.platform !== "darwin") app.quit();
});
ipcMain.handle("save-avatar-info", async (event, userId, avatarData) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const result = await databaseManager.saveAvatarInfo(dbPath, userId, avatarData);
      return { success: true, result };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("保存头像信息失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-current-avatar", async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const avatar = await databaseManager.getCurrentAvatar(dbPath, userId);
      return { success: true, avatar };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取当前头像失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-avatar-history", async (event, userId, limit = 10) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const history = await databaseManager.getAvatarHistory(dbPath, userId, limit);
      return { success: true, history };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取头像历史失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("save-file-to-user-folder", async (event, userId, folderType, fileName, fileBuffer) => {
  try {
    if (clientUserDataManager) {
      let targetPath;
      switch (folderType) {
        case "avatars":
          targetPath = clientUserDataManager.getUserAvatarsPath(userId);
          break;
        case "pictures":
          targetPath = clientUserDataManager.getUserPicturesPath(userId);
          break;
        case "documents":
          targetPath = clientUserDataManager.getUserDocumentsPath(userId);
          break;
        default:
          targetPath = clientUserDataManager.getUserDataPath(userId);
      }
      const filePath = path$1.join(targetPath, fileName);
      await fs.promises.writeFile(filePath, fileBuffer);
      return { success: true, filePath };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("保存文件失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-user-cache-info", async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const currentUserId = clientUserDataManager.getCurrentUserId();
      const dbPath = clientUserDataManager.getUserDatabasePath(currentUserId);
      const db = await databaseManager.getDatabase(dbPath);
      const sql = `SELECT * FROM user_cache WHERE user_id = ?`;
      const result = await db.getAsync(sql, [userId]);
      return { success: true, data: result };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取用户缓存信息失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("save-user-cache-info", async (event, userId, cacheData) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const currentUserId = clientUserDataManager.getCurrentUserId();
      const dbPath = clientUserDataManager.getUserDatabasePath(currentUserId);
      const db = await databaseManager.getDatabase(dbPath);
      const sql = `
        INSERT OR REPLACE INTO user_cache 
        (user_id, display_name, signature, avatar, location, status, last_seen, cache_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await db.runAsync(sql, [
        userId,
        cacheData.displayName || "",
        cacheData.signature || "",
        cacheData.avatar || "",
        cacheData.location || "",
        cacheData.status || "offline",
        cacheData.lastSeen || (/* @__PURE__ */ new Date()).toISOString(),
        cacheData.cacheTime || (/* @__PURE__ */ new Date()).toISOString()
      ]);
      return { success: true, result };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("保存用户缓存信息失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-user-avatar", async (event, userId) => {
  try {
    if (clientUserDataManager) {
      const currentUserId = clientUserDataManager.getCurrentUserId();
      const avatarsPath = clientUserDataManager.getUserAvatarsPath(currentUserId);
      const avatarPath = path$1.join(avatarsPath, `${userId}.jpg`);
      if (fs.existsSync(avatarPath)) {
        return { success: true, path: avatarPath };
      }
      const extensions = [".png", ".jpeg", ".gif", ".webp"];
      for (const ext of extensions) {
        const altPath = path$1.join(avatarsPath, `${userId}${ext}`);
        if (fs.existsSync(altPath)) {
          return { success: true, path: altPath };
        }
      }
      return { success: false, error: "本地头像不存在" };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取用户头像失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("cache-user-avatar", async (event, userId, avatarUrl) => {
  try {
    if (clientUserDataManager) {
      const currentUserId = clientUserDataManager.getCurrentUserId();
      const avatarsPath = clientUserDataManager.getUserAvatarsPath(currentUserId);
      const response = await fetch(avatarUrl);
      if (!response.ok) {
        throw new Error(`下载头像失败: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const contentType = response.headers.get("content-type") || "";
      let extension = ".jpg";
      if (contentType.includes("png")) extension = ".png";
      else if (contentType.includes("gif")) extension = ".gif";
      else if (contentType.includes("webp")) extension = ".webp";
      const avatarPath = path$1.join(avatarsPath, `${userId}${extension}`);
      await fs.promises.writeFile(avatarPath, uint8Array);
      console.log(`用户头像已缓存: ${userId} -> ${avatarPath}`);
      return { success: true, localPath: avatarPath };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("缓存用户头像失败:", error);
    return { success: false, error: error.message };
  }
});
app.on("before-quit", () => {
  if (databaseManager) {
    databaseManager.closeAllDatabases();
  }
});
app.on("second-instance", () => {
  const activeWin = mainWin || loginWin;
  if (activeWin) {
    if (activeWin.isMinimized()) activeWin.restore();
    activeWin.focus();
  }
});
app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createLoginWindow();
  }
});
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});
ipcMain.on("window-minimize", () => {
  console.log("最小化窗口请求");
  const activeWin = mainWin || loginWin;
  if (activeWin) {
    activeWin.minimize();
  }
});
ipcMain.on("window-maximize", () => {
  const activeWin = mainWin || loginWin;
  if (activeWin) {
    if (activeWin.isMaximized()) {
      console.log("还原窗口");
      activeWin.unmaximize();
    } else {
      console.log("最大化窗口");
      activeWin.maximize();
    }
  }
});
ipcMain.on("window-close", () => {
  console.log("关闭窗口请求");
  const activeWin = mainWin || loginWin;
  if (activeWin) {
    activeWin.close();
  }
});
ipcMain.on("login-success", () => {
  console.log("登录成功，切换到主窗口");
  createMainWindow();
  if (loginWin) {
    loginWin.close();
  }
});
ipcMain.on("window-move", (event, deltaX, deltaY) => {
  const activeWin = mainWin || loginWin;
  if (activeWin) {
    const [currentX, currentY] = activeWin.getPosition();
    activeWin.setPosition(currentX + deltaX, currentY + deltaY);
  }
});
ipcMain.handle("user-data-setup", async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbInfo = clientUserDataManager.setCurrentUser(userId);
      await databaseManager.initializeUserDatabase(dbInfo.dbPath, dbInfo.initSQL);
      console.log(`用户本地数据设置完成: ${userId}`);
      return { success: true, userId, dbPath: dbInfo.dbPath };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("设置用户本地数据失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-current-user", async () => {
  try {
    if (clientUserDataManager) {
      const userId = clientUserDataManager.getCurrentUserId();
      return { success: true, userId };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取当前用户失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("save-user-info-locally", async (event, userId, userInfo) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      await databaseManager.saveUserInfo(dbPath, userId, userInfo);
      return { success: true };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("保存用户本地信息失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-user-data-paths", async (event, userId) => {
  try {
    if (clientUserDataManager) {
      const paths = {
        userData: clientUserDataManager.getUserDataPath(userId),
        pictures: clientUserDataManager.getUserPicturesPath(userId),
        avatars: clientUserDataManager.getUserAvatarsPath(userId),
        documents: clientUserDataManager.getUserDocumentsPath(userId),
        cache: clientUserDataManager.getUserCachePath(userId),
        database: clientUserDataManager.getUserDatabasePath(userId)
      };
      return { success: true, paths };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取用户数据路径失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("clear-user-data", async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      await databaseManager.clearUserDatabase(dbPath);
      await clientUserDataManager.clearUserData(userId);
      return { success: true };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("清除用户数据失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.removeHandler("save-file-to-user-folder");
ipcMain.handle("save-file-to-user-folder", async (event, userId, folderType, fileName, fileBuffer) => {
  console.log(`开始保存文件: userId=${userId}, folderType=${folderType}, fileName=${fileName}, bufferSize=${fileBuffer?.length}`);
  try {
    if (!clientUserDataManager) {
      console.error("用户数据管理器未初始化");
      return { success: false, error: "用户数据管理器未初始化" };
    }
    const fs2 = require2("fs").promises;
    const path2 = require2("path");
    let folderPath;
    switch (folderType) {
      case "avatars":
        folderPath = clientUserDataManager.getUserAvatarsPath(userId);
        break;
      case "pictures":
        folderPath = clientUserDataManager.getUserPicturesPath(userId);
        break;
      case "documents":
        folderPath = clientUserDataManager.getUserDocumentsPath(userId);
        break;
      case "cache":
        folderPath = clientUserDataManager.getUserCachePath(userId);
        break;
      default:
        folderPath = clientUserDataManager.getUserDataPath(userId);
    }
    console.log(`目标文件夹路径: ${folderPath}`);
    await fs2.mkdir(folderPath, { recursive: true });
    console.log(`文件夹创建成功: ${folderPath}`);
    const filePath = path2.join(folderPath, fileName);
    console.log(`完整文件路径: ${filePath}`);
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error("文件数据为空");
    }
    await fs2.writeFile(filePath, Buffer.from(fileBuffer));
    console.log(`文件保存成功: ${filePath}`);
    return { success: true, filePath };
  } catch (error) {
    console.error(`保存文件失败 (${fileName}):`, error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-user-info-locally", async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const userInfo = await databaseManager.getUserInfo(dbPath, userId);
      return { success: true, userInfo };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取用户本地信息失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("save-chat-message", async (event, userId, messageData) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const result = await databaseManager.saveChatMessage(dbPath, messageData);
      return { success: true, result };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("保存聊天消息失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-chat-messages", async (event, userId, contactId, limit, offset) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const messages = await databaseManager.getChatMessages(dbPath, userId, contactId, limit, offset);
      return { success: true, messages };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取聊天消息失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("save-contact", async (event, userId, contactData) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const result = await databaseManager.saveContact(dbPath, contactData);
      return { success: true, result };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("保存联系人失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-contacts", async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const contacts = await databaseManager.getContacts(dbPath, userId);
      return { success: true, contacts };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取联系人列表失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("save-setting", async (event, userId, key, value) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const result = await databaseManager.saveSetting(dbPath, userId, key, value);
      return { success: true, result };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("保存设置失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-setting", async (event, userId, key) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const value = await databaseManager.getSetting(dbPath, userId, key);
      return { success: true, value };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取设置失败:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-all-settings", async (event, userId) => {
  try {
    if (clientUserDataManager && databaseManager) {
      const dbPath = clientUserDataManager.getUserDatabasePath(userId);
      const settings = await databaseManager.getAllSettings(dbPath, userId);
      return { success: true, settings };
    }
    return { success: false, error: "用户数据管理器未初始化" };
  } catch (error) {
    console.error("获取所有设置失败:", error);
    return { success: false, error: error.message };
  }
});
