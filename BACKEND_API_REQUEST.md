# Mobile App - Backend API Endpoint Talepleri

**Tarih:** 18 Ocak 2026
**Hazırlayan:** Mobile Development Team
**İlgili Doküman:** backend_documentation.md v1.0.0

---

## Genel Bakış

Backend API dokümantasyonu incelendi ve mevcut endpoint'ler mobil uygulama gereksinimleri ile karşılaştırıldı. Aşağıda, mobil uygulamanın tam işlevsellik sağlaması için gerekli olan ek endpoint talepleri listelenmiştir.

---

## 1. Kimlik Doğrulama (Authentication)

### 1.1 Şifre Sıfırlama

Kullanıcıların şifrelerini unutmaları durumunda gereklidir.

| Öncelik | Method | Endpoint | Açıklama |
|---------|--------|----------|----------|
| 🔴 Yüksek | POST | `/auth/forgot-password` | Şifre sıfırlama e-postası gönderimi |
| 🔴 Yüksek | POST | `/auth/reset-password` | Yeni şifre belirleme |

**`POST /auth/forgot-password` - Beklenen Request:**
```json
{
  "email": "user@hacettepe.edu.tr"
}
```

**Beklenen Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

---

**`POST /auth/reset-password` - Beklenen Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Beklenen Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

### 1.2 Şifre Değiştirme

Oturum açmış kullanıcıların mevcut şifrelerini değiştirmesi için gereklidir.

| Öncelik | Method | Endpoint | Açıklama |
|---------|--------|----------|----------|
| 🟡 Orta | PUT | `/auth/change-password` | Mevcut şifreyi değiştirme |

**Beklenen Request:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword123"
}
```

**Beklenen Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 2. Kullanıcı Profili (User Profile)

### 2.1 Public Profil Görüntüleme

Kullanıcıların diğer kullanıcıların profillerini görüntüleyebilmesi için gereklidir. Mevcut `GET /users/:id` endpoint'i sadece Admin yetkisi gerektirmektedir.

| Öncelik | Method | Endpoint | Açıklama |
|---------|--------|----------|----------|
| 🔴 Yüksek | GET | `/users/:id/profile` | Public kullanıcı profili |

**Beklenen Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 21,
    "name": "Ahmet Yılmaz",
    "avatar": "https://...",
    "role": "FELLOW",
    "bio": "Computer Science student",
    "department": "Computer Science",
    "joinedAt": "2025-09-01T00:00:00Z",
    "stats": {
      "posts": 15,
      "communities": 5,
      "events": 8
    },
    "isFollowing": false
  }
}
```

---

### 2.2 Kullanıcı İçerikleri

Profil sayfasında kullanıcının paylaşımlarını ve katıldığı toplulukları listelemek için gereklidir.

| Öncelik | Method | Endpoint | Açıklama |
|---------|--------|----------|----------|
| 🟡 Orta | GET | `/users/:id/posts` | Kullanıcının paylaşımları |
| 🟡 Orta | GET | `/users/:id/communities` | Kullanıcının toplulukları |
| 🟢 Düşük | GET | `/users/:id/events` | Kullanıcının katıldığı etkinlikler |

**`GET /users/:id/posts` - Beklenen Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "type": "TEXT",
      "content": "Just finished my first React project!",
      "mediaUrl": null,
      "likes": 12,
      "comments_count": 3,
      "timestamp": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

---

## 3. Post İşlemleri (Posts)

### 3.1 Tek Post Detayı

Bildirimlerden veya deep link'lerden belirli bir post'a yönlendirme için gereklidir.

| Öncelik | Method | Endpoint | Açıklama |
|---------|--------|----------|----------|
| 🔴 Yüksek | GET | `/posts/:id` | Tek post detayı |

**Beklenen Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "type": "TEXT",
    "content": "Just finished my first React project!",
    "mediaUrl": null,
    "author": {
      "id": 21,
      "name": "Student 1",
      "avatar": "https://..."
    },
    "community": {
      "id": 3,
      "name": "Technology Club",
      "avatar": "https://..."
    },
    "likes": 12,
    "comments_count": 5,
    "isLiked": true,
    "timestamp": "2026-01-15T10:30:00Z",
    "comments": [
      {
        "id": 1,
        "content": "Great work!",
        "user": {
          "id": 18,
          "name": "Mentor Ali",
          "avatar": "https://..."
        },
        "createdAt": "2026-01-15T11:00:00Z"
      }
    ]
  }
}
```

---

### 3.2 Post Güncelleme

Kullanıcıların kendi paylaşımlarını düzenleyebilmesi için gereklidir.

| Öncelik | Method | Endpoint | Açıklama |
|---------|--------|----------|----------|
| 🟢 Düşük | PUT | `/posts/:id` | Post güncelleme |

**Beklenen Request:**
```json
{
  "content": "Updated post content",
  "mediaUrl": "https://..."
}
```

**Beklenen Response (200):**
```json
{
  "success": true,
  "message": "Post updated successfully",
  "data": {
    "id": 3,
    "content": "Updated post content",
    "mediaUrl": "https://...",
    "updatedAt": "2026-01-18T12:00:00Z"
  }
}
```

---

## 4. Arama (Search)

### 4.1 Genel Arama

Discover ekranındaki arama fonksiyonelliği için gereklidir. Kullanıcılar, topluluklar, etkinlikler ve mentorlar arasında arama yapabilmelidir.

| Öncelik | Method | Endpoint | Açıklama |
|---------|--------|----------|----------|
| 🔴 Yüksek | GET | `/search` | Genel arama endpoint'i |

**Query Parameters:**
- `q` (required): Arama terimi
- `type` (optional): `all`, `users`, `communities`, `events`, `mentors`
- `page` (optional): Sayfa numarası (default: 1)
- `limit` (optional): Sayfa başına sonuç (default: 20)

**Örnek Request:**
```
GET /api/search?q=react&type=all&page=1&limit=20
```

**Beklenen Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 21,
        "name": "React Developer",
        "avatar": "https://...",
        "role": "FELLOW"
      }
    ],
    "communities": [
      {
        "id": 3,
        "name": "React Community",
        "avatar": "https://...",
        "members": 150
      }
    ],
    "events": [
      {
        "id": 5,
        "title": "React Workshop",
        "date": "2026-02-01",
        "community": "Technology Club"
      }
    ],
    "mentors": [
      {
        "id": 2,
        "name": "Senior React Developer",
        "avatar": "https://...",
        "expertise": ["React", "JavaScript"]
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

---

## 5. Push Notification

### 5.1 Device Token Yönetimi

Mobil cihazlara push notification gönderilebilmesi için FCM (Firebase Cloud Messaging) veya APNs token'larının backend'de saklanması gereklidir.

| Öncelik | Method | Endpoint | Açıklama |
|---------|--------|----------|----------|
| 🔴 Yüksek | POST | `/users/device-token` | Device token kaydetme |
| 🟡 Orta | DELETE | `/users/device-token` | Device token silme (logout) |

**`POST /users/device-token` - Beklenen Request:**
```json
{
  "token": "fcm-or-apns-device-token",
  "platform": "ios" | "android",
  "deviceId": "unique-device-identifier"
}
```

**Beklenen Response (200):**
```json
{
  "success": true,
  "message": "Device token registered successfully"
}
```

---

**`DELETE /users/device-token` - Beklenen Request:**
```json
{
  "deviceId": "unique-device-identifier"
}
```

**Beklenen Response (200):**
```json
{
  "success": true,
  "message": "Device token removed successfully"
}
```

---

## 6. Kullanıcı Takip Sistemi (Opsiyonel)

Kullanıcıların birbirini takip edebilmesi için aşağıdaki endpoint'ler faydalı olacaktır.

| Öncelik | Method | Endpoint | Açıklama |
|---------|--------|----------|----------|
| 🟢 Düşük | POST | `/users/:id/follow` | Kullanıcı takip et/bırak |
| 🟢 Düşük | GET | `/users/:id/followers` | Takipçi listesi |
| 🟢 Düşük | GET | `/users/:id/following` | Takip edilenler listesi |

---

## Öncelik Özeti

| Öncelik | Endpoint | Kullanım Alanı |
|---------|----------|----------------|
| 🔴 Yüksek | `POST /auth/forgot-password` | Şifre sıfırlama |
| 🔴 Yüksek | `POST /auth/reset-password` | Şifre sıfırlama |
| 🔴 Yüksek | `GET /users/:id/profile` | Profil görüntüleme |
| 🔴 Yüksek | `GET /posts/:id` | Post detay sayfası |
| 🔴 Yüksek | `GET /search` | Arama fonksiyonu |
| 🔴 Yüksek | `POST /users/device-token` | Push notification |
| 🟡 Orta | `PUT /auth/change-password` | Şifre değiştirme |
| 🟡 Orta | `GET /users/:id/posts` | Kullanıcı postları |
| 🟡 Orta | `GET /users/:id/communities` | Kullanıcı toplulukları |
| 🟡 Orta | `DELETE /users/device-token` | Logout token temizleme |
| 🟢 Düşük | `PUT /posts/:id` | Post düzenleme |
| 🟢 Düşük | `GET /users/:id/events` | Kullanıcı etkinlikleri |
| 🟢 Düşük | `POST /users/:id/follow` | Kullanıcı takip |
| 🟢 Düşük | `GET /users/:id/followers` | Takipçi listesi |
| 🟢 Düşük | `GET /users/:id/following` | Takip listesi |

---

## İletişim

Sorularınız veya ek bilgi talepleriniz için Mobile Development Team ile iletişime geçebilirsiniz.

---

**Not:** Bu doküman, mevcut backend_documentation.md (v1.0.0) baz alınarak hazırlanmıştır. Endpoint response formatları, mevcut API response yapısı ile uyumlu olacak şekilde önerilmiştir.
