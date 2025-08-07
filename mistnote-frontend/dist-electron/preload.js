const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  }
});
contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  openWindow: (url) => ipcRenderer.invoke("open-win", url),
  // Login window specific APIs
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  closeWindow: () => ipcRenderer.send("window-close"),
  loginSuccess: () => ipcRenderer.send("login-success"),
  // Window drag functionality
  moveWindow: (deltaX, deltaY) => ipcRenderer.send("window-move", deltaX, deltaY),
  // 用户数据管理
  setupUserData: (userId) => ipcRenderer.invoke("user-data-setup", userId),
  getCurrentUser: () => ipcRenderer.invoke("get-current-user"),
  saveUserInfoLocally: (userId, userInfo) => ipcRenderer.invoke("save-user-info-locally", userId, userInfo),
  getUserInfoLocally: (userId) => ipcRenderer.invoke("get-user-info-locally", userId),
  getUserDataPaths: (userId) => ipcRenderer.invoke("get-user-data-paths", userId),
  clearUserData: (userId) => ipcRenderer.invoke("clear-user-data", userId),
  // 聊天消息管理
  saveChatMessage: (userId, messageData) => ipcRenderer.invoke("save-chat-message", userId, messageData),
  getChatMessages: (userId, contactId, limit, offset) => ipcRenderer.invoke("get-chat-messages", userId, contactId, limit, offset),
  // 联系人管理
  saveContact: (userId, contactData) => ipcRenderer.invoke("save-contact", userId, contactData),
  getContacts: (userId) => ipcRenderer.invoke("get-contacts", userId),
  // 设置管理
  saveSetting: (userId, key, value) => ipcRenderer.invoke("save-setting", userId, key, value),
  getSetting: (userId, key) => ipcRenderer.invoke("get-setting", userId, key),
  getSettings: (userId) => ipcRenderer.invoke("get-settings", userId),
  // 头像管理
  saveAvatarInfo: (userId, avatarData) => ipcRenderer.invoke("save-avatar-info", userId, avatarData),
  getCurrentAvatar: (userId) => ipcRenderer.invoke("get-current-avatar", userId),
  getAvatarHistory: (userId, limit) => ipcRenderer.invoke("get-avatar-history", userId, limit),
  // 文件管理
  saveFileToUserFolder: (userId, folderType, fileName, fileBuffer) => ipcRenderer.invoke("save-file-to-user-folder", userId, folderType, fileName, fileBuffer),
  // 用户缓存管理
  getUserCacheInfo: (userId) => ipcRenderer.invoke("get-user-cache-info", userId),
  saveUserCacheInfo: (userId, cacheData) => ipcRenderer.invoke("save-user-cache-info", userId, cacheData),
  getUserAvatar: (userId) => ipcRenderer.invoke("get-user-avatar", userId),
  cacheUserAvatar: (userId, avatarUrl) => ipcRenderer.invoke("cache-user-avatar", userId, avatarUrl)
});
function domReady(condition = ["complete", "interactive"]) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true);
    } else {
      document.addEventListener("readystatechange", () => {
        if (condition.includes(document.readyState)) {
          resolve(true);
        }
      });
    }
  });
}
const safeDOM = {
  append(parent, child) {
    if (!Array.from(parent.children).find((c) => c === child)) {
      return parent.appendChild(child);
    }
  },
  remove(parent, child) {
    if (Array.from(parent.children).find((c) => c === child)) {
      return parent.removeChild(child);
    }
  }
};
function useLoading() {
  const className = `loaders-css__square-spin`;
  const styleContent = `
@keyframes square-spin {
  25% { 
    transform: perspective(100px) rotateX(180deg) rotateY(0); 
  }
  50% { 
    transform: perspective(100px) rotateX(180deg) rotateY(180deg); 
  }
  75% { 
    transform: perspective(100px) rotateX(0) rotateY(180deg); 
  }
  100% { 
    transform: perspective(100px) rotateX(0) rotateY(0); 
  }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `;
  const oStyle = document.createElement("style");
  const oDiv = document.createElement("div");
  oStyle.id = "app-loading-style";
  oStyle.innerHTML = styleContent;
  oDiv.className = "app-loading-wrap";
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`;
  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle);
      safeDOM.append(document.body, oDiv);
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle);
      safeDOM.remove(document.body, oDiv);
    }
  };
}
const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);
window.onmessage = (ev) => {
  ev.data.payload === "removeLoading" && removeLoading();
};
setTimeout(removeLoading, 4999);
