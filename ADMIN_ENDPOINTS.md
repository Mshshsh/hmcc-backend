# Admin Panel Endpoints

Bu dokümantasyon, HMCC Backend Admin Panel'i için kullanılabilecek tüm endpoint'leri içermektedir.

## 🔐 Kimlik Doğrulama

Tüm admin endpoint'leri için Authorization header gereklidir:

```bash
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 👥 Kullanıcı Yönetimi

### 1. Tüm Kullanıcıları Listele (Admin)

**Endpoint:** `GET /api/users`

**Yetki:** Admin (SUPER_ADMIN, CONTENT_ADMIN, USER_ADMIN, ANALYTICS_ADMIN)

**Query Parametreleri:**
- `page` (opsiyonel): Sayfa numarası (varsayılan: 1)
- `limit` (opsiyonel): Sayfa başına kayıt sayısı (varsayılan: 20)
- `role` (opsiyonel): Role göre filtrele (MENTOR, FELLOW, vb.)
- `status` (opsiyonel): Duruma göre filtrele (ACTIVE, INACTIVE, PENDING, SUSPENDED)
- `search` (opsiyonel): İsim veya email'de arama

**Örnek:**
```bash
curl -X GET "http://localhost:5000/api/users?page=1&limit=10&role=MENTOR&status=ACTIVE" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "MENTOR",
      "status": "ACTIVE",
      "avatar": "https://...",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "lastLogin": "2026-01-02T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

---

### 2. Belirli Kullanıcı Detayı (Admin)

**Endpoint:** `GET /api/users/:id`

**Yetki:** Admin

**Örnek:**
```bash
curl -X GET http://localhost:5000/api/users/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 5,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "MENTOR",
    "status": "ACTIVE",
    "avatar": "https://...",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "lastLogin": "2026-01-02T00:00:00.000Z",
    "fellow": null,
    "mentor": {
      "id": 1,
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "expertise": ["JavaScript", "React", "Node.js"],
      "bio": "Experienced developer...",
      "availability": "available",
      "rating": 4.8,
      "sessionsCompleted": 25
    },
    "communityAdmins": [],
    "admin": null
  }
}
```

---

### 3. Onay Bekleyen Kullanıcıları Listele (Admin)

**Endpoint:** `GET /api/users/pending`

**Yetki:** Admin

**Query Parametreleri:**
- `page` (opsiyonel): Sayfa numarası (varsayılan: 1)
- `limit` (opsiyonel): Sayfa başına kayıt sayısı (varsayılan: 20)
- `role` (opsiyonel): Role göre filtrele

**Örnek:**
```bash
curl -X GET "http://localhost:5000/api/users/pending?role=MENTOR" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Pending users retrieved successfully",
  "data": [
    {
      "id": 10,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "MENTOR",
      "status": "PENDING",
      "avatar": null,
      "createdAt": "2026-01-02T00:00:00.000Z",
      "updatedAt": "2026-01-02T00:00:00.000Z",
      "lastLogin": null,
      "fellow": null,
      "mentor": {
        "title": "Product Manager",
        "company": "StartupXYZ",
        "expertise": ["Product Management", "UX Design"],
        "bio": "Passionate about building great products"
      },
      "communityAdmins": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 4. Kullanıcıyı Onayla (Admin)

**Endpoint:** `POST /api/users/:id/approve`

**Yetki:** Admin

**Örnek:**
```bash
curl -X POST http://localhost:5000/api/users/10/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "User approved successfully",
  "data": {
    "id": 10,
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "MENTOR",
    "status": "ACTIVE"
  }
}
```

---

### 5. Kullanıcıyı Reddet (Admin)

**Endpoint:** `POST /api/users/:id/reject`

**Yetki:** Admin

**Not:** Bu işlem kullanıcıyı veritabanından kalıcı olarak siler.

**Örnek:**
```bash
curl -X POST http://localhost:5000/api/users/10/reject \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "User registration rejected"
}
```

---

### 6. Kullanıcı Durumunu Güncelle (Admin)

**Endpoint:** `PUT /api/users/:id/status`

**Yetki:** Admin

**Body Parametreleri:**
- `status` (zorunlu): "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING"

**Örnek:**
```bash
curl -X PUT http://localhost:5000/api/users/5/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"SUSPENDED"}'
```

**Yanıt:**
```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "id": 5,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "MENTOR",
    "status": "SUSPENDED"
  }
}
```

**Not:** Super Admin kullanıcılarının durumu sadece Super Admin tarafından değiştirilebilir.

---

### 7. Kullanıcı Rolünü Güncelle (Super Admin)

**Endpoint:** `PUT /api/users/:id/role`

**Yetki:** Super Admin

**Body Parametreleri:**
- `role` (zorunlu): "SUPER_ADMIN" | "CONTENT_ADMIN" | "USER_ADMIN" | "ANALYTICS_ADMIN" | "MENTOR" | "FELLOW" | "COMMUNITY_ADMIN"

**Örnek:**
```bash
curl -X PUT http://localhost:5000/api/users/5/role \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"CONTENT_ADMIN"}'
```

**Yanıt:**
```json
{
  "success": true,
  "message": "User role updated successfully",
  "data": {
    "id": 5,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "CONTENT_ADMIN",
    "status": "ACTIVE"
  }
}
```

**Not:** Super Admin kullanıcılarının rolü değiştirilemez.

---

### 8. Kullanıcıyı Sil (Super Admin)

**Endpoint:** `DELETE /api/users/:id`

**Yetki:** Super Admin

**Örnek:**
```bash
curl -X DELETE http://localhost:5000/api/users/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Kısıtlamalar:**
- Super Admin kullanıcıları silinemez
- Kendi hesabınızı silemezsiniz

---

### 9. Kullanıcı İstatistikleri (Admin)

**Endpoint:** `GET /api/users/stats`

**Yetki:** Admin

**Örnek:**
```bash
curl -X GET http://localhost:5000/api/users/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "User statistics retrieved successfully",
  "data": {
    "total": 150,
    "active": 120,
    "pending": 15,
    "byRole": {
      "mentors": 25,
      "fellows": 100,
      "communities": 10,
      "admins": 5
    }
  }
}
```

---

## 🏘️ Topluluk Yönetimi

### 1. Tüm Toplulukları Listele (Admin)

**Endpoint:** `GET /api/communities/admin/all`

**Yetki:** Admin (SUPER_ADMIN, CONTENT_ADMIN, USER_ADMIN, ANALYTICS_ADMIN)

**Query Parametreleri:**
- `page` (opsiyonel): Sayfa numarası (varsayılan: 1)
- `limit` (opsiyonel): Sayfa başına kayıt sayısı (varsayılan: 20)
- `status` (opsiyonel): Duruma göre filtrele (ACTIVE, PENDING, SUSPENDED, INACTIVE)
- `category` (opsiyonel): Kategoriye göre filtrele
- `search` (opsiyonel): İsim veya açıklamada arama

**Örnek:**
```bash
curl -X GET "http://localhost:5000/api/communities/admin/all?status=PENDING" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Communities retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Technology Club",
      "slug": "technology-club",
      "description": "A community for tech enthusiasts",
      "avatar": "https://...",
      "category": "Technology",
      "status": "PENDING",
      "_count": {
        "members": 0,
        "events": 0,
        "posts": 0
      },
      "admins": [
        {
          "user": {
            "id": 5,
            "name": "John Doe",
            "email": "john@example.com",
            "avatar": "https://..."
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 2. Onay Bekleyen Toplulukları Listele (Admin)

**Endpoint:** `GET /api/communities/admin/pending`

**Yetki:** Admin

**Query Parametreleri:**
- `page` (opsiyonel): Sayfa numarası (varsayılan: 1)
- `limit` (opsiyonel): Sayfa başına kayıt sayısı (varsayılan: 20)
- `category` (opsiyonel): Kategoriye göre filtrele

**Örnek:**
```bash
curl -X GET "http://localhost:5000/api/communities/admin/pending?category=Technology" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Pending communities retrieved successfully",
  "data": [
    {
      "id": 3,
      "name": "AI Study Group",
      "slug": "ai-study-group",
      "description": "Learning AI together",
      "category": "Technology",
      "status": "PENDING",
      "_count": {
        "members": 0
      },
      "admins": [
        {
          "user": {
            "id": 8,
            "name": "Jane Smith",
            "email": "jane@example.com",
            "avatar": "https://..."
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### 3. Topluluğu Onayla (Admin)

**Endpoint:** `POST /api/communities/:id/approve`

**Yetki:** Admin

**Örnek:**
```bash
curl -X POST http://localhost:5000/api/communities/3/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Community approved successfully",
  "data": {
    "id": 3,
    "name": "AI Study Group",
    "slug": "ai-study-group",
    "status": "ACTIVE",
    "admins": [
      {
        "user": {
          "id": 8,
          "name": "Jane Smith",
          "email": "jane@example.com"
        }
      }
    ]
  }
}
```

---

### 4. Topluluğu Reddet (Admin)

**Endpoint:** `POST /api/communities/:id/reject`

**Yetki:** Admin

**Body Parametreleri:**
- `reason` (opsiyonel): Ret nedeni

**Not:** Bu işlem topluluğu veritabanından kalıcı olarak siler.

**Örnek:**
```bash
curl -X POST http://localhost:5000/api/communities/3/reject \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"İçerik politikalarına uygun değil"}'
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Community rejected successfully"
}
```

---

### 5. Topluluk Durumunu Güncelle (Admin)

**Endpoint:** `PUT /api/communities/:id/status`

**Yetki:** User Admin veya Super Admin

**Body Parametreleri:**
- `status` (zorunlu): "ACTIVE" | "PENDING" | "SUSPENDED" | "INACTIVE"

**Örnek:**
```bash
curl -X PUT http://localhost:5000/api/communities/3/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"SUSPENDED"}'
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Community status updated",
  "data": {
    "id": 3,
    "name": "AI Study Group",
    "status": "SUSPENDED"
  }
}
```

---

### 6. Topluluk İstatistikleri (Admin)

**Endpoint:** `GET /api/communities/admin/stats`

**Yetki:** Admin

**Örnek:**
```bash
curl -X GET http://localhost:5000/api/communities/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Community statistics retrieved successfully",
  "data": {
    "total": 25,
    "active": 20,
    "pending": 3,
    "suspended": 2,
    "totalMembers": 450,
    "totalEvents": 75,
    "totalPosts": 320,
    "byCategory": {
      "Technology": 10,
      "Art": 5,
      "Sports": 6,
      "Social": 4
    }
  }
}
```

---

### 7. Topluluk Oluştur

**Endpoint:** `POST /api/communities`

**Yetki:** Authenticated (Kimliği doğrulanmış herhangi bir kullanıcı)

**Body Parametreleri:**
- `name` (zorunlu): Topluluk adı
- `description` (zorunlu): Açıklama
- `category` (opsiyonel): Kategori (varsayılan: "Social")
- `tags` (opsiyonel): Etiketler (array)
- `avatar` (opsiyonel): Avatar URL

**Örnek:**
```bash
curl -X POST http://localhost:5000/api/communities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web Development Club",
    "description": "Learn modern web development together",
    "category": "Technology",
    "tags": ["JavaScript", "React", "Node.js"],
    "avatar": "https://example.com/avatar.jpg"
  }'
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Community created successfully",
  "data": {
    "id": 10,
    "name": "Web Development Club",
    "slug": "web-development-club",
    "status": "PENDING"
  }
}
```

**Not:**
- Super Admin oluşturursa durum otomatik olarak **ACTIVE** olur
- Normal kullanıcılar oluşturursa durum **PENDING** olur ve admin onayı gerekir
- Oluşturan kişi otomatik olarak topluluğun admini olur

---

### 8. Topluluğu Güncelle

**Endpoint:** `PUT /api/communities/:id`

**Yetki:** Community Admin veya System Admin

**Örnek:**
```bash
curl -X PUT http://localhost:5000/api/communities/3 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "avatar": "https://example.com/new-avatar.jpg"
  }'
```

---

### 9. Topluluğu Sil

**Endpoint:** `DELETE /api/communities/:id`

**Yetki:** Super Admin

**Örnek:**
```bash
curl -X DELETE http://localhost:5000/api/communities/3 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Diğer Admin Endpoint'leri

### Events (Etkinlikler)

- `POST /api/events` - Yeni etkinlik oluştur (Content Admin veya Community Admin)
- `PUT /api/events/:id` - Etkinlik güncelle (Content Admin veya Community Admin)
- `DELETE /api/events/:id` - Etkinlik sil (Content Admin veya Community Admin)
- `GET /api/events/stats` - Etkinlik istatistikleri (Admin)

### Posts (Gönderiler)

- `DELETE /api/posts/:id` - Gönderi sil (Content Admin)
- `GET /api/posts/reported` - Şikayet edilen gönderiler (Content Admin)

### Upload (Dosya Yükleme)

- `GET /api/upload/status` - S3 yapılandırma durumu (Authenticated)
- `POST /api/upload` - Tekil dosya yükle (Authenticated)
- `POST /api/upload/multiple` - Çoklu dosya yükle (Authenticated)

---

## 🔑 Rol Yetkileri

### SUPER_ADMIN
- Tüm admin yetkilerine sahiptir
- Kullanıcı rollerini değiştirebilir
- Kullanıcıları silebilir
- Sistem genelindeki tüm verileri yönetebilir

### CONTENT_ADMIN
- İçerik yönetimi (Posts, Communities, Events)
- Kullanıcı onayı/durumu değiştirebilir
- İçerik moderasyonu yapabilir

### USER_ADMIN
- Kullanıcı yönetimi
- Kullanıcı onayı/durumu değiştirebilir
- Kullanıcı istatistiklerini görüntüleyebilir

### ANALYTICS_ADMIN
- Tüm istatistikleri görüntüleyebilir
- Kullanıcı onayı/durumu değiştirebilir
- Raporlara erişebilir

### COMMUNITY_ADMIN
- Yönettiği toplulukların içeriğini düzenleyebilir
- Topluluk etkinliklerini oluşturabilir

### MENTOR
- Mentor profilini yönetebilir
- Mentorluk seansları oluşturabilir
- Öğrencilerle mesajlaşabilir

### FELLOW
- Temel kullanıcı yetkileri
- Post oluşturabilir
- Topluluklara katılabilir
- Etkinliklere ilgi gösterebilir

---

## 🛡️ Güvenlik Notları

1. **Token Güvenliği:**
   - Access token'lar 7 gün geçerlidir
   - Refresh token'lar 30 gün geçerlidir
   - Token'ları güvenli bir yerde saklayın

2. **Rate Limiting:**
   - Upload endpoint'leri: 10 istek / 15 dakika
   - Genel API: 100 istek / 15 dakika

3. **CORS:**
   - Sadece `.env` dosyasında tanımlı origin'lerden isteklere izin verilir

4. **Dosya Yükleme:**
   - Maksimum dosya boyutu: 10MB
   - İzin verilen formatlar: jpg, jpeg, png, gif, mp4, mov, avi, pdf, doc, docx

---

## 📝 Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 200 | Başarılı |
| 201 | Oluşturuldu |
| 400 | Hatalı istek |
| 401 | Yetkisiz (Token gerekli) |
| 403 | Yasak (Yetki yetersiz) |
| 404 | Bulunamadı |
| 429 | Çok fazla istek (Rate limit) |
| 500 | Sunucu hatası |

---

## 🧪 Test Kullanıcıları

Seed verilerinde oluşturulan test kullanıcıları:

| Email | Şifre | Rol |
|-------|-------|-----|
| admin@hmcc.com | password123 | SUPER_ADMIN |
| content@hmcc.com | password123 | CONTENT_ADMIN |
| mentor1@hacettepe.edu.tr | password123 | MENTOR |
| mentor2@hacettepe.edu.tr | password123 | MENTOR |
| community@hacettepe.edu.tr | password123 | COMMUNITY_ADMIN |
| student1@hacettepe.edu.tr | password123 | FELLOW |

---

## 💡 Kullanım Örnekleri

### Topluluk Onay Süreci

1. Onay bekleyen toplulukları listele:
```bash
curl -X GET "http://localhost:5000/api/communities/admin/pending" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. Topluluk detaylarını incele:
```bash
curl -X GET http://localhost:5000/api/communities/3 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. Topluluğu onayla:
```bash
curl -X POST http://localhost:5000/api/communities/3/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Mentor Onay Süreci

1. Onay bekleyen mentorları listele:
```bash
curl -X GET "http://localhost:5000/api/users/pending?role=MENTOR" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. Mentor detaylarını incele:
```bash
curl -X GET http://localhost:5000/api/users/10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. Mentoru onayla:
```bash
curl -X POST http://localhost:5000/api/users/10/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Kullanıcı Arama

İsim veya email'e göre kullanıcı ara:
```bash
curl -X GET "http://localhost:5000/api/users?search=john&role=MENTOR" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Toplu İşlemler

Tüm pending kullanıcıları al ve toplu olarak işle:
```bash
# 1. Pending kullanıcıları al
curl -X GET "http://localhost:5000/api/users/pending?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Her birini onayla veya reddet (script ile)
for id in $(echo "$response" | jq -r '.data[].id'); do
  curl -X POST "http://localhost:5000/api/users/$id/approve" \
    -H "Authorization: Bearer YOUR_TOKEN"
done
```

---

## 📞 Destek

Herhangi bir sorun veya soru için lütfen backend ekibiyle iletişime geçin.
