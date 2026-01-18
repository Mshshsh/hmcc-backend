const { S3Client } = require('@aws-sdk/client-s3');

// Configure AWS S3 Client
// Using S3_ prefix to avoid Netlify reserved variable conflicts
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

module.exports = {
  s3Client,
  bucketName: process.env.S3_BUCKET || 'hmcc-uploads',
  region: process.env.S3_REGION || 'eu-central-1',
};
