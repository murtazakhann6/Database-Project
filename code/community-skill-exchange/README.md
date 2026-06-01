# Community Skill Exchange — Full Stack App

A complete platform connecting service providers with customers in local communities.

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JS (served as static files)
- **Backend**: Node.js + Express.js (REST API)
- **Database**: MySQL

---

## Project Structure

```
community-skill-exchange/
├── backend/
│   ├── config/
│   │   └── db.js              # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js            # JWT auth + admin middleware
│   ├── routes/
│   │   ├── auth.js            # Register, Login
│   │   ├── users.js           # Profile CRUD
│   │   ├── services.js        # Service CRUD + browse
│   │   ├── bookings.js        # Booking management
│   │   ├── reviews.js         # Review submission
│   │   ├── categories.js      # Public category list
│   │   └── admin.js           # Admin dashboard APIs
│   └── server.js              # Express entry point
├── frontend/
│   ├── css/
│   │   └── main.css           # Full design system
│   ├── js/
│   │   ├── api.js             # Fetch wrapper + auth helpers
│   │   └── app.js             # All page logic + routing
│   └── index.html             # Single-page app shell
├── setup.sql                  # DB schema + seed categories
└── README.md
```

---

## Setup Instructions

### 1. Database

```bash
mysql -u root -p < setup.sql
```

Or manually:
```sql
CREATE DATABASE community_skill_exchange;
-- Then run your Sample_database.sql
```

### 2. Backend

```bash
cd backend
npm install
```

Configure DB credentials (optional — defaults to root/no password):
```bash
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=yourpassword
export DB_NAME=community_skill_exchange
export JWT_SECRET=your_secret_key
```

Start the server:
```bash
npm start        # production
npm run dev      # development (nodemon)
```

### 3. Access

Open **http://localhost:3000** — the backend serves the frontend.

---

## Features

### Public
- Browse all active services with search and category filters
- View service details, provider info, availability, and reviews

### Customer
- Register / Login
- Book services (PKR 5 booking fee)
- View booking history and payment status
- Leave reviews for completed bookings

### Provider
- Register as provider
- Create, edit, delete services with availability slots
- View and manage incoming bookings (confirm/complete/cancel)

### Admin
- View platform stats (users, bookings, revenue)
- Manage users (block/unblock)
- Verify/reject provider accounts
- Manage service categories (full CRUD)

---

## Creating an Admin Account

After registering a user, run this in MySQL:
```sql
INSERT INTO admin (user_id) 
SELECT user_id FROM users WHERE email = 'admin@example.com';
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register user |
| POST | /api/auth/login | — | Login |
| GET | /api/users/me | ✓ | Get own profile |
| PUT | /api/users/me | ✓ | Update profile |
| GET | /api/services | — | List services |
| GET | /api/services/:id | — | Service detail |
| POST | /api/services | ✓ Provider | Create service |
| PUT | /api/services/:id | ✓ Provider | Update service |
| DELETE | /api/services/:id | ✓ Provider | Delete service |
| GET | /api/services/my/services | ✓ Provider | My services |
| POST | /api/bookings | ✓ Customer | Create booking |
| GET | /api/bookings/my | ✓ Customer | My bookings |
| GET | /api/bookings/provider | ✓ Provider | Incoming bookings |
| PUT | /api/bookings/:id/status | ✓ | Update status |
| POST | /api/reviews | ✓ | Submit review |
| GET | /api/categories | — | List categories |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET | /api/admin/users | Admin | All users |
| PUT | /api/admin/users/:id/status | Admin | Block/unblock user |
| PUT | /api/admin/verify-by-user | Admin | Verify provider |
| CRUD | /api/admin/categories | Admin | Category management |
