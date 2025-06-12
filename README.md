# 🚀 HZM Backend VeriTabanı

> **Backend-as-a-Service (BaaS)** platformu - Supabase/Firebase benzeri özelliklere sahip güçlü Node.js backend sistemi

## 🎯 **Özellikler**

### 🔐 **API Key Authentication**
- Proje bazlı güvenlik sistemi
- `vt_` prefix ile unique API keys
- Otomatik authentication middleware

### 🗃️ **Dynamic Table Management**
- Runtime'da tablo oluşturma
- 5 farklı alan tipi: `text`, `number`, `boolean`, `date`, `json`
- Flexible field configuration
- Automatic `id`, `created_at`, `updated_at` fields

### 📊 **Advanced Data Operations**
- **CRUD**: Create, Read, Update, Delete
- **Pagination**: Sayfa bazlı veri getirme
- **Search**: Tüm alanlarda arama
- **Sorting**: ASC/DESC sıralama
- **Bulk Operations**: Toplu ekleme/güncelleme

### 🏗️ **Project Isolation**
- Her proje kendi namespace'i
- Tam veri izolasyonu
- Project statistics

---

## ⚡ **Hızlı Başlangıç**

### **1. Prerequisites**
```bash
# PostgreSQL 12+ gerekli
brew install postgresql
brew services start postgresql

# Node.js 18+ gerekli  
node --version  # v18.x.x+
```

### **2. Kurulum**
```bash
# Repository'yi clone edin
git clone <repository-url>
cd HzmBackendVeriTabani

# Dependencies yükleyin
npm install

# Environment variables
cp .env.example .env
# .env dosyasını düzenleyin
```

### **3. Database Setup**
```bash
# PostgreSQL database oluşturun
createdb hzm_veritabani

# Database'i initialize edin
npm run init-db
```

### **4. Sunucuyu Başlatın**
```bash
npm start
# Sunucu http://localhost:3000 üzerinde çalışacak
```

---

## 🔧 **Configuration**

### **Environment Variables (.env)**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hzm_veritabani
DB_USER=ozguraltintas
DB_PASSWORD=

# Server Configuration
PORT=3000
NODE_ENV=development

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

---

## 📡 **API Documentation**

### **Base URL**
```
http://localhost:3000
```

### **Authentication**
Tüm API çağrılarında (health check hariç) aşağıdaki header gereklidir:
```http
x-api-key: vt_your_api_key_here
```

---

### 🏗️ **Project Endpoints**

#### **Create Project**
```http
POST /api/projects
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description"
}
```

#### **Get Project Info**
```http
GET /api/projects/info
x-api-key: vt_your_api_key
```

#### **Update Project**
```http
PUT /api/projects
x-api-key: vt_your_api_key
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### **Get Project Tables**
```http
GET /api/projects/tables
x-api-key: vt_your_api_key
```

#### **Get Project Stats**
```http
GET /api/projects/stats
x-api-key: vt_your_api_key
```

---

### 🗃️ **Table Endpoints**

#### **Create Table**
```http
POST /api/tables
x-api-key: vt_your_api_key
Content-Type: application/json

{
  "name": "users",
  "displayName": "Users",
  "description": "User data table",
  "fields": [
    {
      "name": "email",
      "type": "text",
      "required": true
    },
    {
      "name": "age",
      "type": "number"
    },
    {
      "name": "is_active",
      "type": "boolean"
    }
  ]
}
```

#### **Get Table Info**
```http
GET /api/tables/{tableName}
x-api-key: vt_your_api_key
```

#### **Update Table**
```http
PUT /api/tables/{tableName}
x-api-key: vt_your_api_key
Content-Type: application/json

{
  "displayName": "Updated Display Name",
  "fields": [...] // Updated fields
}
```

#### **Delete Table**
```http
DELETE /api/tables/{tableName}
x-api-key: vt_your_api_key
```

---

### 📊 **Data Endpoints**

#### **Create Data**
```http
POST /api/data/{tableName}
x-api-key: vt_your_api_key
Content-Type: application/json

{
  "email": "john@example.com",
  "age": 25,
  "is_active": true
}
```

#### **Get Data (with pagination & search)**
```http
GET /api/data/{tableName}?page=1&limit=10&search=john&sort=created_at&order=DESC
x-api-key: vt_your_api_key
```

#### **Get Single Data**
```http
GET /api/data/{tableName}/{id}
x-api-key: vt_your_api_key
```

#### **Update Data**
```http
PUT /api/data/{tableName}/{id}
x-api-key: vt_your_api_key
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "age": 26
}
```

#### **Delete Data**
```http
DELETE /api/data/{tableName}/{id}
x-api-key: vt_your_api_key
```

#### **Bulk Create Data**
```http
POST /api/data/{tableName}/bulk
x-api-key: vt_your_api_key
Content-Type: application/json

{
  "data": [
    {"email": "user1@example.com", "age": 25},
    {"email": "user2@example.com", "age": 30}
  ]
}
```

---

## 🛡️ **Security Features**

- **Rate Limiting**: 100 requests per 15 minutes
- **CORS Protection**: Configurable origins
- **SQL Injection Protection**: Parameterized queries
- **Input Validation**: Joi schema validation
- **Error Handling**: Centralized error management

---

## 🏗️ **Architecture**

```
HzmBackendVeriTabani/
├── index.js              # Main server file
├── config/
│   └── database.js       # PostgreSQL connection
├── middleware/
│   └── auth.js          # API Key authentication
├── routes/
│   ├── projects.js      # Project management
│   ├── tables.js        # Table operations
│   └── data.js          # Data CRUD operations
├── scripts/
│   └── initDatabase.js  # Database initialization
└── README.md
```

---

## 🧪 **Testing**

### **Health Check**
```bash
curl http://localhost:3000/health
```

### **Test API Key**
Development ortamında kullanabileceğiniz test API key:
```
vt_test123demo456789
```

### **Sample Requests**
```bash
# Get project info
curl -H "x-api-key: vt_test123demo456789" \
     http://localhost:3000/api/projects/info

# Create table
curl -X POST \
     -H "x-api-key: vt_test123demo456789" \
     -H "Content-Type: application/json" \
     -d '{"name":"test","displayName":"Test Table","fields":[{"name":"name","type":"text","required":true}]}' \
     http://localhost:3000/api/tables

# Add data
curl -X POST \
     -H "x-api-key: vt_test123demo456789" \
     -H "Content-Type: application/json" \
     -d '{"name":"John Doe"}' \
     http://localhost:3000/api/data/test
```

---

## 🚀 **Production Deployment**

### **Environment Setup**
```bash
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
```

### **Process Management (PM2)**
```bash
npm install -g pm2
pm2 start index.js --name "hzm-backend"
pm2 startup
pm2 save
```

---

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

---

## 📝 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 **Related Projects**

- **Frontend**: [HZM Frontend VeriTabanı](../HzmFrontendVeriTabani) - React.js frontend application
- **Documentation**: [API Docs](docs/) - Detailed API documentation

---

**🎯 Bu proje, modern web uygulamaları için tam özellikli Backend-as-a-Service çözümü sağlar!** 