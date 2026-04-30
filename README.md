# 🚀 Social API — Production-Ready Scalable Backend

🔗 **Live API:** https://social-api-ereo.onrender.com  

A robust, scalable **social media backend API** built with **Node.js, Express, and PostgreSQL**. Designed for real-world production use with strong focus on **security, performance, and maintainability**.

---

## ✨ Overview

This API provides the core backend infrastructure for a modern social media platform, including authentication, user management, background processing, and secure data handling.

---

## ⚡ Features

- 🔐 JWT Authentication (Access & Refresh Tokens)
- 🔑 Role-Based Access Control (RBAC)
- 📱 Device Tracking & Login History
- 🧾 Activity Logging
- ⏱️ Cron Jobs for automation
- ⚙️ Background Jobs with BullMQ (Queue & Workers)
- 🚦 Sliding Window Rate Limiting
- 🖼️ Cloudinary Image Upload
- 🧱 Scalable & Modular Architecture
- 📄 Swagger API Documentation

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js  
- **Database:** PostgreSQL (Neon)  
- **Queue:** BullMQ + Upstash Redis  
- **Storage:** Cloudinary  
- **Hosting:** Render  
- **Docs:** Swagger  

---

## 📚 API Documentation

- Swagger Docs:  
  👉 https://social-api-ereo.onrender.com/api-docs  

- Postman Collection:  
  👉 (Add your Postman link here)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/social-api.git
cd social-api

```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
This project uses two environment files:
- env.development
- env.production

👉 Check .env.example to know what values to provide.

Example structure
```env
PORT=
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
REDIS_URL=

```

### 3. Run the Project
Development Mode

```bash
npm run dev

```

Production Mode

```bash
npm start
```

