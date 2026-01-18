const { S3Client } = require('@aws-sdk/client-s3');

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = {
  s3Client,
  bucketName: process.env.AWS_S3_BUCKET || 'hmcc-uploads',
  region: process.env.AWS_REGION || 'eu-central-1',
};
