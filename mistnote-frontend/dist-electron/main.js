import { app, BrowserWindow, ipcMain, shell } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.ROOT = path.join(__dirname, "../..");
process.env.DIST = path.join(process.env.ROOT, "dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL ? path.join(process.env.ROOT, "public") : process.env.DIST;
if (process.platform === "win32") app.disableHardwareAcceleration();
if (process.platform === "win32") app.setAppUserModelId(app.getName());
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
let win = null;
const preload = process.env.VITE_DEV_SERVER_URL ? path.join(__dirname, "preload.js") : path.join(__dirname, "preload.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = path.join(process.env.DIST, "index.html");
async function createWindow() {
  win = new BrowserWindow({
    title: "MistNote",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    // 无边框窗口，仿QQ NT风格
    titleBarStyle: "hidden",
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });
  if (url) {
    win.loadURL(url);
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.setWindowOpenHandler(({ url: url2 }) => {
    if (url2.startsWith("https:")) shell.openExternal(url2);
    return { action: "deny" };
  });
  win.setMenuBarVisibility(false);
  win.on("maximize", () => {
    win.webContents.send("window-maximized");
  });
  win.on("unmaximize", () => {
    win.webContents.send("window-unmaximized");
  });
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});
app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
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
  if (win) {
    win.minimize();
  }
});
ipcMain.on("window-maximize", () => {
  if (win) {
    if (win.isMaximized()) {
      console.log("还原窗口");
      win.unmaximize();
    } else {
      console.log("最大化窗口");
      win.maximize();
    }
  }
});
ipcMain.on("window-close", () => {
  console.log("关闭窗口请求");
  if (win) {
    win.close();
  }
});
