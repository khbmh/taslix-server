# Taslix - Server-Side Setup

## Live Link:
[Taslix Live Site](https://taslix.web.app)

## Features

### 1. **Server Setup**
   - Backend is built with **Node.js** and **Express.js**.
   - The server handles authentication, job data, bid data, and user management.
   - **MongoDB** is used for storing job and bid data.

### 2. **Authentication System**
   - Firebase authentication is used for user login and registration.
   - The backend manages user sessions and performs actions based on authenticated user context.
   - JWT (JSON Web Tokens) are used for protecting private routes.

### 3. **MongoDB Integration**
   - MongoDB is used to store:
     - **Users**: User details (name, email, photo URL).
     - **Jobs**: Job data (title, deadline, description, category, price range).
     - **Bids**: Bid data (user's bid, job ID, status).
   - Mongoose ODM is used to interact with the database.

### 4. **API Endpoints**

#### **Authentication Routes**
   - **POST** `/api/auth/register`: Registers a new user with name, email, password, and photo URL.
   - **POST** `/api/auth/login`: Authenticates user with email/password and returns a JWT token.
   - **GET** `/api/auth/user`: Returns the current authenticated user’s data (requires JWT).

#### **Job Routes**
   - **GET** `/api/jobs`: Fetches all jobs from the database.
   - **POST** `/api/jobs`: Adds a new job (requires user authentication).
   - **GET** `/api/jobs/:id`: Fetches details for a single job by ID.
   - **PUT** `/api/jobs/:id`: Updates a job by ID (only the job creator can update their own jobs).
   - **DELETE** `/api/jobs/:id`: Deletes a job by ID (only the job creator can delete their own jobs).

#### **Bid Routes**
   - **POST** `/api/bids`: Allows a user to place a bid on a job (requires user authentication).
   - **GET** `/api/bids`: Fetches all bids placed by the authenticated user.
   - **GET** `/api/bids/job/:jobId`: Fetches all bids for a specific job (job owner only).
   - **PUT** `/api/bids/:id`: Updates the bid status (only job owner can update bids).
   - **DELETE** `/api/bids/:id`: Deletes a bid (requires user authentication).

#### **Private Routes (Protected by JWT)**
   - **GET** `/api/my-posted-jobs`: Fetches all jobs posted by the current authenticated user.
   - **GET** `/api/my-bids`: Fetches all bids made by the current authenticated user.
   - **GET** `/api/bid-requests`: Fetches all bids made on jobs posted by the current user (job owners).

### 5. **Error Handling**
   - Custom error messages are returned for issues like invalid authentication, missing parameters, or database errors.
   - Response status codes are set according to the error type (e.g., 400 for bad requests, 404 for not found, 500 for internal errors).

### 6. **Database Models (Mongoose)**

#### **User Model**
   - Fields: `name`, `email`, `password`, `photoURL`.
   - Methods: `comparePassword()` to validate the password during login.

#### **Job Model**
   - Fields: `userId` (creator), `title`, `deadline`, `description`, `category`, `minPrice`, `maxPrice`.
   - Associated with **Bids**.

#### **Bid Model**
   - Fields: `jobId` (reference to job), `userId` (bidder), `price`, `deadline`, `status`.
   - Status can be: `Rendering`, `Rejected`, `In Progress`, `Complete`.

### 7. **Toast Notifications**
   - Toast notifications are shown for success or error after performing actions like adding, updating, or deleting jobs and bids.

### 8. **Environment Variables**
   - The `.env` file stores sensitive information such as:
     - MongoDB connection string (`MONGODB_URI`).
     - JWT secret (`JWT_SECRET`).
     - Firebase config keys and other credentials.
