# HMCC Backend Setup Guide

Bu rehber, HMCC Backend API'yi sıfırdan kurmak için gereken adımları içerir.

## 📋 Gereksinimler

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0

## 🚀 Kurulum Adımları

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. MySQL Veritabanı Oluşturun

MySQL'e giriş yapın ve bir veritabanı oluşturun:

```sql
CREATE DATABASE hmcc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Environment Variables Ayarlayın

`.env` dosyasını düzenleyin ve MySQL bağlantı bilgilerinizi girin:

```env
DATABASE_URL="mysql://KULLANICI_ADI:SIFRE@localhost:3306/hmcc_db"
```

Örnek:
```env
DATABASE_URL="mysql://root:mypassword@localhost:3306/hmcc_db"
```

**Önemli:** Diğer ayarları da kontrol edin:
- `JWT_SECRET` - Production'da mutlaka değiştirin
- `JWT_REFRESH_SECRET` - Production'da mutlaka değiştirin
- `ALLOWED_ORIGINS` - Frontend URL'lerinizi ekleyin
- `PORT` - API portunu ayarlayın (varsayılan: 5000)

### 4. Prisma Client Oluşturun

```bash
npm run prisma:generate
```

### 5. Veritabanı Tablolarını Oluşturun

```bash
npm run prisma:push
```

**Veya migration kullanarak:**

```bash
npm run prisma:migrate
```

> İlk migration için isim girin: `init` veya `initial_schema`

### 6. Veritabanını Seed Edin (Opsiyonel)

Test verilerini yükleyin:

```bash
npm run prisma:seed
```

Bu komut şu kullanıcıları oluşturur:
- **Super Admin:** admin@hmcc.com / password123
- **Content Admin:** content@hmcc.com / password123
- **Mentor 1:** ahmet@mentor.com / password123
- **Mentor 2:** zeynep@mentor.com / password123
- **Community Admin:** mehmet@community.com / password123
- **10 Öğrenci:** student1@hacettepe.edu.tr - student10@hacettepe.edu.tr / password123

### 7. Serveri Başlatın

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server `http://localhost:5000` adresinde çalışacaktır.

## ✅ Kurulum Testi

### 1. Health Check

```bash
curl http://localhost:5000/api/health
```

Beklenen yanıt:
```json
{
  "success": true,
  "message": "HMCC Backend API is running",
  "timestamp": "2026-01-02T...",
  "environment": "development"
}
```

### 2. Login Test

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hmcc.com",
    "password": "password123"
  }'
```

Başarılı giriş yanıtı bir `accessToken` içermelidir.

### 3. Protected Endpoint Test

Yukarıdaki token'ı kullanarak:

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🗄️ Veritabanı Yönetimi

### Prisma Studio

Veritabanını görsel olarak yönetmek için:

```bash
npm run prisma:studio
```

Browser'da `http://localhost:5555` açılacaktır.

### Migration Oluşturma

Schema değişikliklerinden sonra:

```bash
npm run prisma:migrate
```

### Veritabanını Sıfırlama (Dikkatli!)

**Tüm verileri siler:**

```bash
npx prisma migrate reset
```

## 🔧 Sorun Giderme

### MySQL Bağlantı Hatası

```
Error: Can't reach database server
```

**Çözüm:**
1. MySQL servisinin çalıştığından emin olun
2. `.env` dosyasındaki bağlantı bilgilerini kontrol edin
3. MySQL kullanıcısının doğru izinlere sahip olduğundan emin olun

```sql
GRANT ALL PRIVILEGES ON hmcc_db.* TO 'kullanici_adi'@'localhost';
FLUSH PRIVILEGES;
```

### Prisma Client Hatası

```
Error: @prisma/client did not initialize yet
```

**Çözüm:**
```bash
npm run prisma:generate
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Çözüm:**
1. `.env` dosyasında `PORT` değişkenini değiştirin
2. Veya mevcut process'i sonlandırın

Windows:
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Linux/Mac:
```bash
lsof -ti:5000 | xargs kill -9
```

## 📦 Production Deployment

### 1. Environment Variables

Production `.env` dosyası:

```env
NODE_ENV=production
DATABASE_URL="mysql://user:pass@production-host:3306/hmcc_db"
JWT_SECRET=your-very-strong-secret-key-min-32-characters
JWT_REFRESH_SECRET=your-very-strong-refresh-secret-key
ALLOWED_ORIGINS=https://hmcc.com,https://app.hmcc.com
CLOUDINARY_ENABLED=true
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 2. Migration

```bash
npm run prisma:migrate
```

### 3. Server Başlatma

PM2 ile (önerilen):

```bash
npm install -g pm2
pm2 start src/server.js --name hmcc-backend
pm2 save
pm2 startup
```

## 🧪 Testing

API endpoint'lerini test etmek için:

1. **Postman Collection:** `docs/postman_collection.json` (yakında)
2. **Thunder Client** (VS Code extension)
3. **cURL** komutları

## 📚 API Documentation

API endpoint'lerinin tam listesi için:

```
GET http://localhost:5000/api
```

Detaylı döküman: [README.md](README.md)

## 🆘 Yardım

Sorun yaşıyorsanız:

1. Logs'ları kontrol edin: `logs/combined.log` ve `logs/error.log`
2. GitHub Issues sayfasını kontrol edin
3. Development ekibine ulaşın

## 📝 Sonraki Adımlar

- [ ] Email servisini yapılandırın (SMTP ayarları)
- [ ] Cloudinary'yi production için ayarlayın
- [ ] Redis cache ekleyin (opsiyonel)
- [ ] API documentation generate edin (Swagger/OpenAPI)
- [ ] Unit ve integration testler yazın
- [ ] CI/CD pipeline kurun
