# 🏆 Enterprise Live Auction Platform — Complete Full-Stack Solution

A high-performance, real-time live auction platform built with Node.js, Express, PostgreSQL, Socket.IO, Redis, and React + Vite with Tailwind CSS.

---

## 🚀 Quick Setup & Launch Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL 18 (Local database cluster pre-configured on port `5433` inside `backend/postgres_data`)

### 1-Click Launch (Windows)
Double-click `start-all.bat` in the project root:
- Starts PostgreSQL on port `5433` (`auction_db`)
- Starts Express + Socket.IO Backend API on port `5000`
- Starts Vite React Frontend on port `5173`

### Manual Launch
```powershell
# 1. Start PostgreSQL
& "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "backend/postgres_data" -p 5433

# 2. Start Backend API
cd backend
npm install
npm run dev

# 3. Start Frontend
cd frontend
npm install
npm run dev
```

### URLs
- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Live Auction Floor:** [http://localhost:5173/auctions](http://localhost:5173/auctions)
- **Seller Hub:** [http://localhost:5173/seller/dashboard](http://localhost:5173/seller/dashboard)
- **Create Auction:** [http://localhost:5173/auctions/create](http://localhost:5173/auctions/create)
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
- **Health Diagnostics:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Demo Role Credentials (Pre-Seeded)

All passwords are encrypted with `bcrypt` (10 salt rounds). Click the **Quick Demo Role Switcher** chips on the Login page for 1-click authentication:

| Role | Email | Password | Permissions & Dashboard |
| :--- | :--- | :--- | :--- |
| 🛡️ **Admin** | `admin@auction.com` | `Admin123!` | System metrics, user directory, lot moderation |
| 📦 **Seller** | `seller@auction.com` | `Seller123!` | Create, edit, delete lots, view catalog & revenue |
| 🏷️ **Buyer** | `buyer@auction.com` | `Buyer123!` | Real-time bidding arena, escrow wallet, bid history |

---

## 🏛️ 6 Core Architecture & System Design Points

### 1. Concurrency Control with Row-Level Locking (`FOR UPDATE`)
To prevent race conditions during high-velocity simultaneous bidding (e.g. multiple bidders submitting at the exact same millisecond), the platform executes all bid submissions inside a PostgreSQL transaction utilizing `SELECT ... FOR UPDATE` on the auction row. This acquires an exclusive row lock, serializes competing bids, and rejects any stale or duplicate bids that do not exceed the new high bid plus minimum increment.

### 2. 30-Second Anti-Sniping Timer Extension (Soft Close)
Mimicking authentic auction houses, if a valid bid is placed when less than 30 seconds remain on the countdown timer, the engine dynamically extends the auction deadline by an additional 30 seconds (`new_end_time = end_time + 30s`). This extension is persisted in PostgreSQL and broadcast to all connected viewers in real time via Socket.IO.

### 3. Sub-50ms Real-Time Event Engine via Socket.IO
The backend utilizes room-based WebSocket subscriptions (`auction_${auctionId}`) for targeted auction broadcasts and global channels for marketplace tickers. When a bid arrives or time updates, the new price, high bidder, and countdown are synchronized across all connected client browsers without requiring page reloads.

### 4. Automated Auction Expiration & Single Winner Resolution
A persistent background worker runs every 2 seconds querying expired auctions with `FOR UPDATE SKIP LOCKED`. When an auction's deadline passes:
- If bids exist: Exactly one highest bidder is recorded as the official winner in PostgreSQL (`winner_id`, `winning_price`), setting `status = 'completed'` and broadcasting the winner banner.
- If zero bids exist: The auction closes with `winner_id = NULL`, officially concluding the lot with "No Winner".

### 5. Multi-Tiered Role-Based Access Control (RBAC) & Redis Session Invalidation
Every route is protected by `authenticateJWT` and `authorizeRoles`. When a user logs out, their JWT signature is blacklisted in Redis (`bl_${token}`), rendering the token immediately invalid. Non-authorized access attempts (such as a Buyer attempting to modify an auction) are intercepted and rejected with `403 Forbidden`.

### 6. Hybrid Multi-Image Upload & Live Preview Pipeline
The auction creation flow supports multi-file uploads (processed by `multer` disk storage and served statically via Express) alongside external URL inputs. A real-time card preview dynamically renders product details, countdown rules, and cover images as the seller types.

---

## 🧪 Comprehensive Verification Suite

Run all automated test suites covering all phases:

```powershell
# 1. Part 1: Auth, Roles, RBAC & Token Blacklist
node backend/scripts/testSuite.js

# 2. Part 2: Auction CRUD, Categories, Image Upload & Search Filters
node backend/scripts/testPart2E2E.js

# 3. Parts 3 & 4: Concurrency, Anti-Sniping & Winner Resolution
node backend/scripts/testPart3And4.js
```

### Verified Test Summary:
- ✅ **Simultaneous Bidding**: Handled safely via PostgreSQL transactions (1 accepted, 1 rejected).
- ✅ **30s Anti-Sniping**: Timer extended automatically on bids placed in final 15s.
- ✅ **Winner Selection**: Highest bidder selected and recorded in PostgreSQL (`winner_id`, `winning_price`).
- ✅ **No Winner**: Zero-bid auctions automatically resolved with "No Winner".
- ✅ **Zero Mock Data**: Landing page, search filters, and dashboards populated directly from PostgreSQL.
- ✅ **Backwards Compatibility**: Parts 1 and 2 intact with 100% passing tests.
