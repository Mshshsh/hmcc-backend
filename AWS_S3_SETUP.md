# AWS S3 Setup Guide for HMCC Backend

Bu rehber, HMCC Backend'de dosya yüklemelerini AWS S3'te saklamak için gerekli adımları içerir.

## 📋 Gereksinimler

- AWS hesabı
- AWS Access Key ve Secret Key
- S3 Bucket oluşturma yetkisi

## 🪣 1. AWS S3 Bucket Oluşturma

### AWS Console'dan:

1. **AWS Console'a giriş yapın**: https://console.aws.amazon.com/
2. **S3 servisine gidin**: Üst menüden "Services" > "S3"
3. **Create bucket** butonuna tıklayın

### Bucket Ayarları:

```
Bucket name: hmcc-uploads (veya tercih ettiğiniz isim)
AWS Region: eu-central-1 (Frankfurt) veya size yakın region
```

### Object Ownership:
- **ACLs disabled (recommended)** seçeneğini seçin

### Block Public Access:
- ⚠️ **Tüm "Block public access" ayarlarını KAPATIN**
- Dosyaların public erişime açık olması gerekiyor
- Onay kutucuğunu işaretleyin

### Bucket Versioning:
- Disable (opsiyonel: Enable yapabilirsiniz)

### Default encryption:
- Server-side encryption: **Enable**
- Encryption type: **Amazon S3-managed keys (SSE-S3)**

4. **Create bucket** butonuna tıklayın

## 🔐 2. Bucket Policy Ayarlama

Bucket'ınıza gidip **Permissions** sekmesine tıklayın, ardından **Bucket Policy** bölümünü düzenleyin:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::hmcc-uploads/*"
        }
    ]
}
```

⚠️ **Not:** `hmcc-uploads` kısmını kendi bucket isminizle değiştirin.

## 🔑 3. IAM User ve Access Keys Oluşturma

### IAM User Oluşturma:

1. AWS Console'da **IAM** servisine gidin
2. **Users** > **Add users** tıklayın
3. User name: `hmcc-backend-s3-user`
4. **Access key - Programmatic access** seçeneğini işaretleyin
5. **Next: Permissions** tıklayın

### Permissions Ekleme:

**Option 1: Attach existing policies directly**
- `AmazonS3FullAccess` policy'sini seçin

**Option 2: Custom Policy (Daha güvenli - Önerilen)**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::hmcc-uploads",
                "arn:aws:s3:::hmcc-uploads/*"
            ]
        }
    ]
}
```

6. **Create user** tıklayın
7. ⚠️ **Access Key ID** ve **Secret Access Key**'i kaydedin (bir daha göremezsiniz!)

## ⚙️ 4. Backend .env Konfigürasyonu

`.env` dosyanızı açın ve şu değerleri güncelleyin:

```env
# AWS S3 Configuration
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=hmcc-uploads
S3_ENABLED=true
```

**Önemli:**
- `AWS_REGION`: Bucket'ınızı oluşturduğunuz region
- `AWS_ACCESS_KEY_ID`: IAM user'dan aldığınız Access Key
- `AWS_SECRET_ACCESS_KEY`: IAM user'dan aldığınız Secret Key
- `AWS_S3_BUCKET`: Bucket isminiz
- `S3_ENABLED`: **true** olarak ayarlayın

## 🌍 5. CORS Ayarları (Opsiyonel)

Web uygulamanızdan direkt S3'e yükleme yapacaksanız CORS ayarları gerekir:

S3 Bucket > **Permissions** > **CORS configuration**:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://yourdomain.com"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

## 🧪 6. Test Etme

Server'ı yeniden başlatın:

```bash
# Development serveri durdurun (Ctrl+C)
npm run dev
```

### Upload Status Kontrolü:

```bash
curl -X GET http://localhost:5000/api/upload/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Beklenen yanıt:
```json
{
  "success": true,
  "message": "Upload configuration",
  "data": {
    "provider": "s3",
    "s3Enabled": true,
    "bucket": "hmcc-uploads",
    "region": "eu-central-1",
    "maxFileSize": 10485760
  }
}
```

### Dosya Yükleme Testi:

```bash
# Önce login olup token alın
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hmcc.com","password":"password123"}'

# Token ile dosya yükleyin
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/image.jpg"
```

Başarılı yanıt:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://hmcc-uploads.s3.eu-central-1.amazonaws.com/images/1234567890-123456789.jpg",
    "filename": "images/1234567890-123456789.jpg",
    "originalName": "image.jpg",
    "mimetype": "image/jpeg",
    "size": 102400,
    "bucket": "hmcc-uploads",
    "key": "images/1234567890-123456789.jpg"
  }
}
```

## 📁 7. Dosya Organizasyonu

S3'te dosyalar otomatik olarak şu şekilde organize edilir:

```
hmcc-uploads/
├── images/
│   ├── 1234567890-123456789.jpg
│   ├── 1234567890-123456790.png
│   └── ...
├── videos/
│   ├── 1234567890-123456789.mp4
│   └── ...
├── documents/
│   ├── 1234567890-123456789.pdf
│   └── ...
└── files/
    └── ...
```

## 💰 8. Maliyet Optimizasyonu

### S3 Lifecycle Rules (Opsiyonel):

Eski dosyaları otomatik olarak silmek için:

1. S3 Bucket > **Management** > **Lifecycle rules**
2. **Create lifecycle rule**
3. Rule name: `delete-old-files`
4. **Expire current versions of objects**: 365 days
5. **Permanently delete noncurrent versions**: 30 days

### S3 Storage Classes:

Sık erişilmeyen dosyalar için:
- **S3 Standard-IA**: 30 gün sonra taşıma
- **S3 Glacier**: Arşivleme için

## 🔒 9. Güvenlik En İyi Pratikleri

1. **IAM User'ı Minimize Edin:**
   - Sadece gerekli S3 bucket'a erişim verin
   - Full access yerine custom policy kullanın

2. **Access Keys'i Güvenli Tutun:**
   - `.env` dosyasını `.gitignore`'a ekleyin
   - Production'da environment variables kullanın
   - Keys'i asla public repository'e koymayın

3. **Bucket Encryption:**
   - Server-side encryption enable edin
   - KMS keys kullanabilirsiniz (opsiyonel)

4. **Versioning:**
   - Yanlışlıkla silmelere karşı enable edin

5. **Logging:**
   - S3 access logging enable edin
   - CloudTrail ile monitör edin

## 🚫 10. Local Storage'a Geri Dönme

S3'ü devre dışı bırakmak için:

```env
S3_ENABLED=false
```

Dosyalar otomatik olarak `./uploads` klasörüne kaydedilecek.

## 📊 11. Monitoring

### CloudWatch Metrics:

- **S3 Console** > **Metrics** > Request metrics
- Upload success/failure rates
- Storage usage
- Request count

### Cost Explorer:

- AWS Console > **Cost Explorer**
- S3 maliyetlerini izleyin
- Budget alerts kurun

## ❓ Sorun Giderme

### "Access Denied" Hatası:

```json
{
  "success": false,
  "message": "Access Denied"
}
```

**Çözüm:**
1. IAM user permissions kontrolü
2. Bucket policy kontrolü
3. Access keys doğru mu kontrol edin

### "Bucket Not Found":

```json
{
  "success": false,
  "message": "The specified bucket does not exist"
}
```

**Çözüm:**
1. Bucket ismini kontrol edin
2. Region'u kontrol edin
3. AWS hesabınızda bucket var mı kontrol edin

### CORS Hatası:

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Çözüm:**
1. Bucket CORS configuration ayarlayın
2. Frontend URL'inizi CORS allowed origins'a ekleyin

## 🎯 Production Checklist

- [ ] S3 bucket oluşturuldu
- [ ] Bucket policy ayarlandı
- [ ] IAM user ve access keys oluşturuldu
- [ ] `.env` dosyası güncellendi
- [ ] S3_ENABLED=true ayarlandı
- [ ] CORS configuration yapıldı (gerekirse)
- [ ] Lifecycle rules ayarlandı (opsiyonel)
- [ ] Encryption enable edildi
- [ ] Test yüklemesi başarılı
- [ ] Monitoring kuruldu
- [ ] Budget alerts ayarlandı

## 📚 Ek Kaynaklar

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)
