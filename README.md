# 🌿 DailyMarts — Daily Agricultural & Dairy Direct Ordering Platform

![DailyMarts Banner](public/logo.svg)

[![React](https://img.shields.io/badge/Frontend-React_v18-16a34a?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_Express-14532d?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-47a248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![Resend](https://img.shields.io/badge/Email-Resend_API-000000?style=for-the-badge&logo=mail.ru)](https://resend.com)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.style=for-the-badge)](#license)

**DailyMarts** is a full MERN-stack daily agricultural and dairy product platform connecting local **Farmers** directly with **Customers**. The platform powers daily fresh milk deliveries, milk products, organic vegetables, chicken, and meat subscriptions with daily yield capacity management, direct UPI QR payments, peer-to-peer farmer product exchange, and automated email notifications.

---

## ✨ Key Features & Capability Overview

### 🌾 Farmer Capabilities
- **🥛 Daily Milking Yield & Capacity Control**: Manage daily available milk volume (L) and dairy product capacities with real-time stepper adjustments.
- **🚚 Route & Order Fulfillment**: Track morning (6:00–8:00 AM) & evening household delivery routes and mark orders as supplied.
- **💰 Customer Ledger & Payment Confirmation**: View pending customer UPI transfers, review transaction references, and approve payments to reduce customer bill balances and credit the farmer wallet.
- **🤝 Farmer-to-Farmer Exchange Network**: Post excess milk supply requests or supply nearby partner farmers based on geospatial 2dsphere proximity.
- **📧 Direct Customer Email Communication**: Send custom email updates (delivery slots, batch purity test reports) directly to customers via Resend.
- **📊 Sales Analytics & Reporting**: Interactive volume & revenue trend charts powered by `Recharts`.

### 👤 Customer Capabilities
- **🥛 Fresh Product Catalog**: Browse certified fresh milk (A2 Cow, Buffalo), dairy products (Ghee, Paneer, Butter), organic vegetables, and meats.
- **🔄 Recurring Daily Subscriptions**: Setup, pause, skip, or cancel recurring daily deliveries with flexible quantity management.
- **💳 UPI QR Payment Generator**: Scannable `upi://pay` QR code generated automatically from the farmer's registered UPI VPA (works with GPay, PhonePe, Paytm, BHIM).
- **📄 Monthly Invoice & Billing Ledger**: View itemized monthly bills derived strictly from verified `DELIVERED` status records.
- **🔔 Notification Center**: Real-time alerts and email notifications for bill generation, payment confirmations, and delivery updates.

---

## 🏗️ Tech Stack & System Architecture

```
                       ┌─────────────────────────┐
                       │     React 18 + Vite     │  (Frontend Single Page Application)
                       │   Vanilla CSS (Modern)  │
                       └────────────┬────────────┘
                                    │
                             REST API (JSON)
                                    │
                       ┌────────────▼────────────┐
                       │  Node.js + Express.js   │  (MVC RESTful Backend API)
                       │   JWT Auth & Bcryptjs   │
                       └─────┬──────────────┬────┘
                             │              │
        ┌────────────────────▼──┐        ┌──▼──────────────────┐
        │  MongoDB Atlas (Cloud)│        │   Resend Email API  │
        │  Mongoose + 2dsphere  │        │ (Transactional Mail)│
        └───────────────────────┘        └─────────────────────┘
```

| Layer | Technology Used |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Axios, Recharts, QRCode.react, Lucide-style CSS |
| **Backend** | Node.js, Express.js (MVC Pattern), CommonJS |
| **Database** | MongoDB Atlas, Mongoose ODM, GeoJSON `2dsphere` Indexing |
| **Authentication** | JSON Web Tokens (JWT), Password Hashing via `bcryptjs` |
| **Email Service** | Resend API SDK (`resend`) with responsive HTML templates |
| **Styling System** | Custom Vanilla CSS Design System with dark mode support & CSS variables |

---

## 📁 Repository Structure

```
.
├── backend/                        # Express.js REST API Server
│   ├── src/
│   │   ├── config/                 # Database (MongoDB) & Email (Resend) configs
│   │   ├── controllers/            # Route controllers (Auth, Products, Payments, etc.)
│   │   ├── middleware/             # Auth JWT protection & Error handlers
│   │   ├── models/                 # Mongoose schemas (User, Product, Bill, Payment, etc.)
│   │   ├── routes/                 # REST API Express endpoints
│   │   └── services/               # Resend Email service & Cron jobs
│   ├── .env                        # Server Environment variables
│   └── server.js                   # Application Entry Point
├── public/                         # Static assets (Favicon, Logo SVGs)
├── src/                            # React Frontend Source Code
│   ├── components/                 # Shared UI components (Navbar, Sidebar, Modal)
│   ├── context/                    # AuthContext & ToastContext
│   ├── layouts/                    # Farmer & Customer layout wrappers
│   ├── pages/                      # Role-specific application pages
│   │   ├── auth/                   # Login & Registration pages
│   │   ├── customer/               # Customer Dashboard, Products, Billing, Payments
│   │   └── farmer/                 # Farmer Dashboard, Capacity, Exchange, Ledger
│   ├── services/                   # Frontend Axios API client service mapping
│   └── utils/                      # Currency formatters & Mock fallbacks
├── index.html                      # HTML Entry point
├── vite.config.js                  # Vite configuration & Backend proxy setup
└── README.md                       # Documentation
```

---

## 🔌 Core REST API Endpoint Reference

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new Customer or Farmer (collects `upiId` for farmers)
- `POST /api/auth/login` — Authenticate user and issue JWT token
- `GET  /api/auth/me` — Fetch currently logged-in user profile

### 💳 Payments & Billing (`/api/payments` & `/api/bills`)
- `GET  /api/payments/farmer-upi/:farmerId` — Fetch farmer's registered UPI ID for QR generation
- `POST /api/payments` — Record customer UPI transfer (creates `PENDING` request)
- `GET  /api/payments/pending` — Fetch pending payments awaiting farmer approval
- `PATCH /api/payments/:paymentId/confirm` — Farmer marks payment received → deducts bill balance
- `GET  /api/bills` — Fetch customer/farmer monthly billing ledger

### 📧 Notifications (`/api/notifications`)
- `POST /api/notifications/remind/:customerId` — Trigger payment reminder email & notification
- `POST /api/notifications/send-email` — Send direct custom email from farmer to customer via Resend

---

## 🚀 Getting Started & Local Installation

### Prerequisites
- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- **MongoDB Atlas** account (or local MongoDB server)
- **Resend API Key**: [resend.com](https://resend.com)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/dailymarts.git
cd dailymarts
```

### 2. Configure Backend Environment
Navigate to the `backend/` directory and create/verify the `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/dailymarts?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM=DailyMarts <onboarding@resend.dev>
CLIENT_URL=http://localhost:5173
```

### 3. Install Dependencies
```bash
# Install root (Frontend) dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 4. Run Development Servers
Start both the backend server and frontend development client:

```bash
# Terminal 1: Backend Server (Port 5000)
cd backend
node server.js

# Terminal 2: Frontend Client (Port 5173)
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## 🔑 Demo Test Login Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| 🌾 **Farmer** | `anand.farmer@gmail.com` | `password123` | Farm: *Anand Organic Dairy*, UPI: `anand@oksbi` |
| 🌾 **Farmer (Alt)** | `testfarmer@dailymarts.com` | `test123` | Farm: *Test Farm* |
| 👤 **Customer** | `bhagavathiraja.s26@gmail.com` | `password123` | Name: *Priya Customer*, Location: *Dindigul* |
| 👤 **Customer (Alt)** | `kavitha.customer@gmail.com` | `password123` | Name: *Kavitha Customer* |

---

## 🤝 Contributing
Contributions are welcome! Please follow these steps:
1. Fork the Project Repository
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p center="text-center">
Made with ❤️ for local dairy farmers and healthy families.
</p>
