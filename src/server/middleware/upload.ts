import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from './errorHandler';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter for images only
const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

// Configure multer instance for avatar uploads
export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file at a time
  },
}).single('avatar');

// Middleware wrapper to handle multer errors
export const handleAvatarUpload = (req: any, res: any, next: any) => {
  uploadAvatar(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ValidationError('File size too large. Maximum size is 5MB'));
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        return next(new ValidationError('Too many files. Only one file allowed'));
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new ValidationError('Unexpected field name. Use "avatar" as field name'));
      }
      return next(new ValidationError(`Upload error: ${err.message}`));
    } else if (err) {
      return next(err);
    }
    next();
  });
};

// Utility function to delete old avatar file
export const deleteAvatarFile = (avatarPath: string): void => {
  if (avatarPath && avatarPath.startsWith('/uploads/avatars/')) {
    const fullPath = path.join(process.cwd(), 'public', avatarPath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (error) {
        console.error('Error deleting avatar file:', error);
      }
    }
  }
};

// Utility function to get avatar URL
export const getAvatarUrl = (filename: string): string => {
  return `/uploads/avatars/${filename}`;
};