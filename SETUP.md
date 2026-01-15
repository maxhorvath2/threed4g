# ThreeD4G Setup Guide

A Next.js CMS application for managing and displaying 3D printed grow tent accessories.

## Overview

This application provides:
- Public-facing product gallery and contact pages
- Admin dashboard for managing products and administrators
- Image upload and storage using Vercel Blob
- PostgreSQL database via Neon Database
- Session-based authentication

## Prerequisites

Before setting up the project, ensure you have:

- Node.js 20.x or later
- pnpm (or npm/yarn)
- A Neon Database account (free tier available at https://neon.tech)
- A Vercel account for Blob storage (free tier available at https://vercel.com)

## Installation Steps

### 1. Clone and Install Dependencies

```bash
cd threed4g
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
# Database Configuration
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxx"

# Optional: Base URL for production deployments
# NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
```

#### Getting Your DATABASE_URL (Neon Database)

1. Go to https://neon.tech and sign up/login
2. Create a new project
3. Navigate to your project dashboard
4. Click on "Connection Details" or "Connection String"
5. Copy the connection string that looks like:
   ```
   postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```
6. Paste it into your `.env.local` file

#### Getting Your BLOB_READ_WRITE_TOKEN (Vercel Blob)

1. Go to https://vercel.com/dashboard
2. Navigate to Storage
3. Create a new Blob Store (or use an existing one)
4. Go to the store's settings
5. Copy the "BLOB_READ_WRITE_TOKEN"
6. Paste it into your `.env.local` file

### 3. Initialize the Database

Run the SQL schema to create the necessary tables:

```bash
# Connect to your Neon database using psql or Neon SQL Editor
# Then run the contents of schema.sql
```

Alternatively, using the Neon SQL Editor:
1. Log into Neon Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Execute the queries

The schema creates:
- `admins` table - stores admin user credentials
- `products` table - stores product information
- Indexes for optimized queries

### 4. Create Your First Admin User

You need to create an admin user manually since the admin creation endpoint requires authentication. You can do this in two ways:

#### Option A: Using Neon SQL Editor

```sql
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2a$10$YourHashedPasswordHere');
```

To generate a bcrypt hash for your password, you can use an online tool like https://bcrypt-generator.com/ or run this Node.js script:

```javascript
// hash-password.js
const bcrypt = require('bcryptjs');
const password = 'your-secure-password';
bcrypt.hash(password, 10).then(hash => console.log(hash));
```

Run it with: `node hash-password.js`

#### Option B: Using a temporary setup script

Create a file `scripts/create-admin.ts`:

```typescript
import { hashPassword } from '../lib/auth';
import { sql } from '../lib/db';

async function createAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: tsx scripts/create-admin.ts <username> <password>');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await sql`
    INSERT INTO admins (username, password_hash)
    VALUES (${username}, ${passwordHash})
  `;

  console.log('Admin user created successfully!');
}

createAdmin();
```

Then run:
```bash
npx tsx scripts/create-admin.ts admin YourSecurePassword123
```

### 5. Run the Development Server

```bash
pnpm dev
```

The application will be available at http://localhost:3000

### 6. Access the Admin Panel

1. Navigate to http://localhost:3000/login
2. Log in with the admin credentials you created
3. You'll be redirected to http://localhost:3000/admin

From the admin panel, you can:
- Add, edit, and delete products
- Upload product images
- Manage categories and featured products
- Create additional admin users

## Project Structure

```
threed4g/
├── app/                      # Next.js app directory
│   ├── admin/               # Admin dashboard page
│   ├── api/                 # API routes
│   │   ├── admin/          # Admin management endpoints
│   │   ├── auth/           # Authentication endpoints
│   │   ├── products/       # Product CRUD endpoints
│   │   └── upload/         # Image upload endpoint
│   ├── contact/            # Contact page
│   ├── gallery/            # Product gallery page
│   ├── login/              # Login page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/              # React components
│   ├── Navigation.tsx      # Site navigation
│   └── ProductCard.tsx     # Product display card
├── lib/                     # Utility libraries
│   ├── auth.ts             # Password hashing utilities
│   ├── db.ts               # Database connection
│   ├── session.ts          # Session management
│   └── utils.ts            # General utilities
├── middleware.ts           # Route protection middleware
├── schema.sql              # Database schema
└── .env.local              # Environment variables (create this)
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `BLOB_READ_WRITE_TOKEN`
   - `NEXT_PUBLIC_BASE_URL` (your production URL)
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- Self-hosted with Node.js

Make sure to:
- Set all required environment variables
- Use Node.js 20+ runtime
- Build command: `pnpm build`
- Start command: `pnpm start`

## Security Notes

1. Never commit `.env.local` to version control
2. Use strong passwords for admin accounts
3. In production, ensure `NODE_ENV=production` is set
4. The session cookie is automatically secured in production mode
5. Passwords are hashed using bcrypt with 10 salt rounds
6. Admin routes are protected by middleware

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` is correct
- Ensure your IP is allowed in Neon's connection settings
- Check that SSL mode is enabled in the connection string

### Image Upload Failures
- Verify `BLOB_READ_WRITE_TOKEN` is correct
- Check that the token has read and write permissions
- Ensure images are under 10MB
- Only image file types are accepted

### Authentication Issues
- Clear browser cookies and try again
- Verify admin user exists in database
- Check that password hash was generated correctly

### Build Errors
- Run `pnpm install` to ensure dependencies are installed
- Delete `.next` folder and rebuild
- Check Node.js version (should be 20+)

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Neon Database Docs](https://neon.tech/docs)
- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## Support

For issues or questions, please open an issue on the project repository.
