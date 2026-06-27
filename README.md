# Buybee — Full-Stack E-Commerce Platform

A production-style e-commerce application for clothing, accessories, and creative/handcrafted
goods — built with React, Redux Toolkit (RTK Query), Node.js/Express, Prisma, and PostgreSQL.

---

## 1. Tech Stack & Why

| Layer       | Choice                                   | Why |
|-------------|-------------------------------------------|-----|
| Frontend    | React 18 + Vite, Tailwind CSS, Redux Toolkit + RTK Query | RTK Query gives free caching/invalidation for the catalog, cart, and order data without hand-written `useEffect`/`axios` boilerplate. Vite gives a much faster dev server than CRA. |
| Backend     | Node.js + Express                        | Minimal, unopinionated REST framework, easy to reason about middleware/auth pipeline. |
| Database    | **PostgreSQL + Prisma Client**            | Relation-rich schemas (User, Product, Review, Order, OrderItem, Payment, Refund) map naturally to tabular relational structures. Prisma provides modern type-safety, autocomplete, schema migrations, and clean transactions. |
| Auth        | JWT (stateless)                          | Works cleanly across a separate frontend/backend (no shared session store needed); token is sent via `Authorization: Bearer` header and persisted client-side. |
| Image upload| Multer (local disk)                      | Simulates a real upload pipeline; swap the storage engine for S3/Cloudinary in production without touching the controller contract. |
| Payments    | Razorpay + Mock Fallback                 | Dynamic payment verification via Razorpay SDK with an automatic simulation fallback mode. |

---

## 2. Folder Structure

```
Ecommerce/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── userController.js      # register/login/profile/admin user mgmt
│   │   ├── productController.js   # catalog: search/filter/sort/pagination, CRUD, reviews
│   │   └── orderController.js     # checkout, mock payment, status updates, history
│   ├── middleware/
│   │   ├── authMiddleware.js      # protect (JWT) + admin (role check)
│   │   └── errorMiddleware.js     # 404 + centralized error handler
│   ├── models/
│   │   ├── userModel.js
│   │   ├── productModel.js        # embedded reviews sub-schema
│   │   └── orderModel.js          # embedded order items + shipping/payment/status
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   └── uploadRoutes.js        # multer image upload endpoint
│   ├── utils/
│   │   └── generateToken.js
│   ├── data/                      # seed data (sample products/users)
│   ├── uploads/                   # uploaded product images land here
│   ├── seeder.js                  # `node seeder.js` to import sample data
│   ├── server.js                  # app entry point
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   └── store.js           # Redux store config
    │   ├── features/
    │   │   ├── api/
    │   │   │   ├── apiSlice.js          # base RTK Query slice (auth header injection)
    │   │   │   ├── productsApiSlice.js  # catalog endpoints
    │   │   │   ├── usersApiSlice.js     # auth endpoints
    │   │   │   └── ordersApiSlice.js    # checkout/order endpoints
    │   │   ├── auth/
    │   │   │   └── authSlice.js   # logged-in user, persisted to localStorage
    │   │   └── cart/
    │   │       └── cartSlice.js   # persistent cart, price calculations
    │   ├── components/            # Header, Footer, Product, Rating, Loader, Message,
    │   │                          # Paginate, SearchBox, CheckoutSteps, PrivateRoute,
    │   │                          # AdminRoute, FormContainer
    │   ├── screens/
    │   │   ├── HomeScreen.jsx, ProductScreen.jsx, CartScreen.jsx
    │   │   ├── LoginScreen.jsx, RegisterScreen.jsx
    │   │   ├── ShippingScreen.jsx, PaymentScreen.jsx, PlaceOrderScreen.jsx
    │   │   ├── OrderScreen.jsx, ProfileScreen.jsx
    │   │   └── admin/
    │   │       ├── ProductListScreen.jsx, ProductEditScreen.jsx
    │   │       ├── OrderListScreen.jsx, UserListScreen.jsx
    │   ├── App.jsx                 # route definitions
    │   ├── main.jsx                # Redux Provider + Router bootstrap
    │   ├── constants.js
    │   └── index.css
    ├── index.html
    ├── tailwind.config.js
    ├── vite.config.js              # dev proxy: /api → http://localhost:5000
    ├── package.json
    └── .env.example
```

---

## 3. Core Architecture Notes

- **Auth & Roles**: Every `User` document has `isAdmin: Boolean`. `authMiddleware.js` exports
  `protect` (validates the JWT, attaches `req.user`) and `admin` (requires `req.user.isAdmin`).
  Frontend mirrors this with `<PrivateRoute>` (must be logged in) and `<AdminRoute>` (must be admin),
  both implemented as React Router layout routes wrapping `<Outlet />`.

- **Product Search/Filter/Sort/Pagination**: All handled server-side in
  `GET /api/products?keyword=&category=&sortBy=&pageNumber=` (see `productController.js`).
  This keeps the client simple (RTK Query just passes query params) and keeps pagination correct
  even with filters applied.

- **Cart Persistence**: `cartSlice.js` reads/writes `localStorage` on every mutation, so the cart
  survives refreshes and browser restarts for both guests and logged-in users.

- **Checkout Wizard**: `ShippingScreen → PaymentScreen → PlaceOrderScreen` enforce step order by
  redirecting backward if a prior step's data is missing (e.g. `PaymentScreen` redirects to
  `/shipping` if no address is saved yet). `<CheckoutSteps>` renders the progress indicator.

- **Mock Payment Gateway**: `PlaceOrderScreen` creates the `Order` (status `Pending`, `isPaid: false`).
  On the `OrderScreen`, the customer clicks **"Pay Now"**, which calls
  `PUT /api/orders/:id/pay` — this simulates the Stripe/PayPal success webhook, sets
  `isPaid: true`, stamps `paidAt`, and advances `status` to `Processing`. Swap this handler for a
  real Stripe Elements / PayPal SDK integration without changing the rest of the order flow.

- **Order Status Lifecycle**: `Pending → Processing → Shipped → Delivered` (or `Cancelled`),
  enum-enforced on the `Order` model. Admins update it from the Order Dashboard
  (`OrderListScreen`) or an order's detail page; customers see it reflected on their
  `ProfileScreen` order history table.

- **Image Upload (simulated)**: `POST /api/upload` (multer, local disk) returns a URL that the
  admin's `ProductEditScreen` appends to the product's `images` array. In production, point
  `multer` at S3/Cloudinary instead of local disk — the controller's request/response contract
  stays the same.

---

## 4. Environment Variables

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and fill in:

```
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://username:password@localhost:5432/ecommerce"
DIRECT_URL="postgresql://username:password@localhost:5432/ecommerce"
JWT_SECRET=replace_this_with_a_long_random_secret_string
JWT_EXPIRES_IN=30d
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`) — optional for local dev
Not required locally (Vite's dev server proxies `/api` straight to the backend — see
`vite.config.js`). Only needed if you deploy the frontend separately from the backend:

```
VITE_API_BASE_URL=https://your-api-domain.com
```

---

## 5. Running Locally on Windows

Open PowerShell (or Command Prompt) and navigate to the project:

```powershell
cd "c:\Users\dipik\Desktop\Ecommerce-Claude\Ecommerce"
```

### Step 1 — Setup PostgreSQL Database
- Create a PostgreSQL database locally or use a cloud service like Supabase.
- Copy the connection URL into `DATABASE_URL` and `DIRECT_URL` in `backend/.env`.

### Step 2 — Backend setup
```powershell
cd backend
npm install
copy .env.example .env
# Edit .env with your real DATABASE_URL/DIRECT_URL and a random JWT_SECRET
npx prisma db push          # applies schema models to the database
npm run data:import         # seeds sample products + admin/customer/seller accounts
npm run server              # starts on http://localhost:5000 with nodemon (auto-restart)
```

Demo accounts created by the seeder:
- **Super Admin**: `superadmin@buybee.com` / `superadmin123`
- **Admin**: `admin@buybee.com` / `admin123`
- **Customer**: `customer@buybee.com` / `customer123`
- **Seller**: `seller@buybee.com` / `seller123`

### Step 3 — Frontend setup (in a new terminal)
```powershell
cd "c:\Users\dipik\Desktop\Ecommerce-Claude\Ecommerce\frontend"
npm install
npm run dev                 # starts on http://localhost:5173
```

### Step 4 — Open the app
Visit **http://localhost:5173**. The Vite dev server proxies all `/api/*` calls to the Express
backend on port 5000, so you don't need to configure CORS for local dev (though `server.js`
already sets up CORS for `CLIENT_URL` in case you run them on different machines/ports).

### Resetting sample data
```powershell
cd backend
npm run data:destroy   # wipes database collections
npm run data:import    # re-seeds
```

---

## 6. Production Build

```powershell
# Frontend
cd frontend
npm run build           # outputs static files to frontend/dist
                         # deploy this to Vercel/Netlify/S3+CloudFront, or have Express serve it

# Backend
cd backend
npm install --production
npm start                # node server.js (no nodemon)
```

For a single-server deployment, you can have Express serve the built frontend by adding a static
file handler in `server.js` pointing at `../frontend/dist` and a catch-all route returning
`index.html` for client-side routing.

---

## 7. API Reference (summary)

| Method | Endpoint                          | Access        | Purpose |
|--------|------------------------------------|---------------|---------|
| POST   | `/api/users`                      | Public        | Register |
| POST   | `/api/users/login`                | Public        | Login (returns JWT) |
| POST   | `/api/users/logout`               | Private       | Logout |
| GET/PUT| `/api/users/profile`              | Private       | View/update own profile |
| GET    | `/api/users`                      | Admin         | List all users |
| PUT/DEL| `/api/users/:id`                  | Admin         | Update/delete a user |
| GET    | `/api/products`                   | Public        | List products (`keyword`, `category`, `sortBy`, `pageNumber`) |
| GET    | `/api/products/categories`        | Public        | Distinct category list |
| GET    | `/api/products/top`               | Public        | Top-rated products |
| GET    | `/api/products/:id`               | Public        | Product detail |
| POST   | `/api/products`                   | Admin         | Create product |
| PUT/DEL| `/api/products/:id`                | Admin         | Update/delete product |
| POST   | `/api/products/:id/reviews`       | Private       | Add a review |
| POST   | `/api/upload`                     | Admin         | Upload a product image |
| POST   | `/api/orders`                     | Private       | Place an order |
| GET    | `/api/orders/myorders`            | Private       | Logged-in user's order history |
| GET    | `/api/orders/:id`                 | Private       | Order detail (owner or admin) |
| PUT    | `/api/orders/:id/pay`             | Private       | Mock payment success callback |
| PUT    | `/api/orders/:id/status`          | Admin         | Update shipping/delivery status |
| GET    | `/api/orders`                     | Admin         | All orders (dashboard) |

---

## 8. Next Steps / Extension Ideas
- Swap the mock payment endpoint for real Stripe Elements or PayPal Smart Buttons.
- Move uploaded images from local disk to S3/Cloudinary for production durability.
- Add product variant-level stock tracking (currently stock is per-product, not per size/color).
- Add email notifications (order confirmation, shipped, delivered) via a transactional email service.
- Add Jest/Supertest tests for controllers and React Testing Library tests for screens.
