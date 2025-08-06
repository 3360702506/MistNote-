const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 确保上传目录存在
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 头像上传配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/avatars');
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user._id}-${uniqueSuffix}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片格式：JPEG, JPG, PNG, GIF, WebP'));
    }
  }
});

// 文件上传配置
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/files');
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  }
});

const fileUpload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// 上传头像
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件'
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // 删除旧头像文件（如果不是默认头像）
    if (req.user.profile.avatar && !req.user.profile.avatar.includes('default.png')) {
      const oldAvatarPath = path.join(__dirname, '../../', req.user.profile.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // 更新用户头像
    req.user.profile.avatar = avatarUrl;
    await req.user.save();

    logger.info(`头像上传成功: ${req.user.username} -> ${avatarUrl}`);

    res.json({
      success: true,
      message: '头像上传成功',
      data: {
        avatarUrl
      }
    });
  } catch (error) {
    logger.error('头像上传失败:', error);
    
    // 删除已上传的文件
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      message: '头像上传失败'
    });
  }
});

// 上传聊天文件
router.post('/file', authenticateToken, fileUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    const fileUrl = `/uploads/files/${req.file.filename}`;
    
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl
    };

    logger.info(`文件上传成功: ${req.user.username} -> ${req.file.originalname}`);

    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        fileInfo
      }
    });
  } catch (error) {
    logger.error('文件上传失败:', error);
    
    // 删除已上传的文件
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      message: '文件上传失败'
    });
  }
});

// 上传图片
router.post('/image', authenticateToken, avatarUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    const imageUrl = `/uploads/avatars/${req.file.filename}`;
    
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: imageUrl
    };

    logger.info(`图片上传成功: ${req.user.username} -> ${req.file.originalname}`);

    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        fileInfo
      }
    });
  } catch (error) {
    logger.error('图片上传失败:', error);
    
    // 删除已上传的文件
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      message: '图片上传失败'
    });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超出限制'
      });
    }
  }
  
  res.status(400).json({
    success: false,
    message: error.message || '文件上传失败'
  });
});

module.exports = router;
