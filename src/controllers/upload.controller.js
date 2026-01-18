const { s3Enabled } = require('../middlewares/upload.middleware');
const { bucketName, region } = require('../config/s3');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');
const fs = require('fs');

class UploadController {
  /**
   * Upload file (image or video)
   * POST /api/upload
   */
  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.badRequest(res, 'No file uploaded');
      }

      const file = req.file;
      let fileUrl;

      if (s3Enabled) {
        // S3 upload - multer-s3 already handled the upload
        // File location is in file.location
        fileUrl = file.location;
      } else {
        // Local storage
        fileUrl = `/uploads/${file.filename}`;
      }

      logger.info(`File uploaded by user ${req.user.id}: ${fileUrl}`);

      return ApiResponse.created(res, 'File uploaded successfully', {
        url: fileUrl,
        filename: file.filename || file.key,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bucket: s3Enabled ? bucketName : null,
        key: s3Enabled ? file.key : null,
      });
    } catch (error) {
      // Clean up local file if error occurs (only for local storage)
      if (!s3Enabled && req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          logger.error('Failed to delete file after error:', unlinkError);
        }
      }
      next(error);
    }
  }

  /**
   * Upload multiple files
   * POST /api/upload/multiple
   */
  async uploadMultiple(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        return ApiResponse.badRequest(res, 'No files uploaded');
      }

      const uploadedFiles = req.files.map((file) => {
        const fileUrl = s3Enabled ? file.location : `/uploads/${file.filename}`;

        return {
          url: fileUrl,
          filename: file.filename || file.key,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          bucket: s3Enabled ? bucketName : null,
          key: s3Enabled ? file.key : null,
        };
      });

      logger.info(`${uploadedFiles.length} files uploaded by user ${req.user.id}`);

      return ApiResponse.created(res, 'Files uploaded successfully', uploadedFiles);
    } catch (error) {
      // Clean up local files if error occurs (only for local storage)
      if (!s3Enabled && req.files) {
        req.files.forEach((file) => {
          try {
            if (file.path) fs.unlinkSync(file.path);
          } catch (unlinkError) {
            logger.error('Failed to delete file after error:', unlinkError);
          }
        });
      }
      next(error);
    }
  }

  /**
   * Get S3 configuration status
   * GET /api/upload/status
   */
  async getStatus(req, res, next) {
    try {
      return ApiResponse.success(res, 'Upload configuration', {
        provider: s3Enabled ? 's3' : 'local',
        s3Enabled,
        bucket: s3Enabled ? bucketName : null,
        region: s3Enabled ? region : null,
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UploadController();
