# DailyMarts ASP.NET Core 8.0 Backend API

Converted backend for **DailyMarts** — Daily agricultural and dairy product ordering platform, built using **ASP.NET Core 8.0 (C#)** and **MongoDB**.

## Features

- **Framework**: ASP.NET Core 8.0 Web API (C#)
- **Database**: MongoDB Atlas / Local MongoDB via `MongoDB.Driver`
- **Authentication**: JWT Bearer Tokens (`Authorization: Bearer <token>`) with `BCrypt.Net` password hashing
- **Geospatial Query**: 2dsphere indexing for finding nearby farmers within radius (Dindigul & Tamil Nadu region)
- **Background Jobs**: `CronBackgroundService` (`IHostedService`) for midnight daily delivery generation from active subscriptions
- **Email Notifications**: Integration with Resend REST API & Nodemailer SMTP fallback
- **Swagger Documentation**: Interactive OpenAPI UI at `/swagger`
- **CORS**: Full support for frontend cross-origin requests

---

## REST API Endpoints

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new Customer or Farmer
- `POST /api/auth/login` — Authenticate & obtain JWT
- `GET /api/auth/me` — Get logged-in user profile
- `PUT /api/auth/profile` — Update user profile & farmer attributes

### 🥛 Products (`/api/products`)
- `GET /api/products` — Search & filter available products
- `GET /api/products/{id}` — Get product details by ID
- `POST /api/products` — Create new product (Farmer only)
- `PUT /api/products/{id}` — Update product details
- `DELETE /api/products/{id}` — Delete product
- `PATCH /api/products/{id}/capacity` — Update daily stock inventory capacity

### 📦 Orders (`/api/orders`)
- `POST /api/orders` — Place new one-time order
- `GET /api/orders` — Fetch orders (Customer / Farmer scoped)
- `GET /api/orders/{id}` — Get order details
- `PATCH /api/orders/{id}/status` — Update order status
- `PATCH /api/orders/{id}/supplied` — Mark order supplied
- `PATCH /api/orders/{id}/cancel` — Cancel order

### 🔄 Subscriptions (`/api/subscriptions`)
- `POST /api/subscriptions` — Create recurring milk subscription
- `GET /api/subscriptions` — List active/paused subscriptions
- `PATCH /api/subscriptions/{id}/pause` — Pause subscription
- `PATCH /api/subscriptions/{id}/cancel` — Cancel subscription

### 📅 Daily Inventory & Deliveries (`/api/inventory`, `/api/deliveries`)
- `GET /api/inventory` — Fetch daily stock records by date
- `POST /api/inventory/update` — Update stock capacity
- `GET /api/deliveries` — List daily delivery records
- `PATCH /api/deliveries/{id}/status` — Update delivery status

### 📄 Bills & Payments (`/api/bills`, `/api/payments`)
- `GET /api/bills` — Get customer / farmer invoices
- `POST /api/bills/generate` — Generate monthly bill for subscription
- `POST /api/payments` — Record customer UPI payment (Status: PENDING)
- `PATCH /api/payments/{paymentId}/confirm` — Farmer confirms UPI payment & updates wallet balance
- `GET /api/payments/pending` — Get payments awaiting confirmation
- `GET /api/payments/farmer-upi/{farmerId}` — Get farmer UPI VPA string
- `GET /api/payments/history` — Payment transaction history

### 🤝 Farmer Exchange & Reports (`/api/exchanges`, `/api/farmers`, `/api/reports`)
- `GET /api/farmers/nearby` — Find nearby farmers within radius (GeoJSON)
- `GET /api/exchanges/requests` — View B2B product swap/paid requests
- `POST /api/exchanges/requests` — Publish new exchange request
- `PATCH /api/exchanges/requests/{id}/accept` — Accept exchange request
- `GET /api/reports/farmer/stats` — Aggregated sales & financial statistics

---

## How to Run locally

### Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)

### Commands
```bash
# Navigate into backend-dotnet folder
cd backend-dotnet

# Restore dependencies
dotnet restore

# Build project
dotnet build

# Run project
dotnet run
```

The API will start at `http://localhost:5000` with Swagger UI at `http://localhost:5000/swagger`.

---

## Pushing to New Repository

To push this codebase to your new repository `https://github.com/BHAGAVATHIRAJA26/DailyMarts-.NET-`:

```bash
git init
git remote add origin https://github.com/BHAGAVATHIRAJA26/DailyMarts-.NET-.git
git add .
git commit -m "Initial commit of DailyMarts ASP.NET Core 8.0 Web API backend"
git branch -M main
git push -u origin main
```
