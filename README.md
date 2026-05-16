# TeamTask - Full Stack Project Management App

A production-ready project management application with role-based access control, real-time task tracking, and email notifications.

## Tech Stack

**Backend:**
- Node.js + Express.js
- Prisma ORM with PostgreSQL
- JWT Authentication with role-based access control
- Resend API for email notifications
- Helmet.js for security headers

**Frontend:**
- React 18 + Vite
- Tailwind CSS + shadcn/ui components
- TanStack React Query for server state management
- Zustand for client state management
- React Hook Form + Zod for form validation
- Axios for HTTP requests

**Infrastructure:**
- Railway (Backend hosting)
- Railway (Frontend hosting)
- Supabase (PostgreSQL database)

## Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, Manager, Member)
  - Secure cookie-based sessions
  - Admin approval workflow for new admin accounts

- **Project Management**
  - Create and manage multiple projects
  - Project status tracking (ACTIVE, ARCHIVED, DELETED)
  - Member invitation system (existing users + email invites for new users)
  - Role-based project permissions

- **Task Management**
  - Create, assign, and track tasks
  - Task status workflow (TODO → IN_PROGRESS → DONE)
  - Task priority levels (LOW, MEDIUM, HIGH)
  - Due dates and deadline tracking
  - Task comments and activity logs

- **Email Notifications**
  - Project invitation emails
  - Task assignment notifications
  - Task completion notifications
  - Daily reminder emails for overdue/due-soon tasks

- **Performance Optimizations**
  - Database indexes on frequently queried columns
  - React Query caching with staleTime/gcTime configuration
  - Optimized Prisma queries (removed unnecessary includes)
  - Efficient member counting without loading full user data

## Project Structure

```
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── scripts/
│   │   ├── migrate-and-start.js   # Railway startup script
│   │   └── seed.js                # Database seeding
│   ├── src/
│   │   ├── controllers/           # Route controllers
│   │   ├── lib/                   # Utilities (Prisma client, Resend)
│   │   ├── middleware/            # Auth, error handling, validation
│   │   ├── routes/                # API route definitions
│   │   └── index.js               # Express app entry point
│   ├── .env.example               # Backend environment template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/ui/         # shadcn/ui components
│   │   ├── pages/                 # Route pages
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── store/                 # Zustand stores
│   │   ├── lib/                   # Utilities (axios, query client)
│   │   └── main.jsx               # React entry point
│   ├── .env.example               # Frontend environment template
│   └── package.json
│
├── README.md                      # This file
└── DEPLOYMENT.md                  # Deployment instructions
```

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or Supabase)
- Resend API key (free tier available at resend.com)

### 1. Clone and Install

```bash
git clone <repository-url>
cd full-stack-assessment
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/teamtask
DIRECT_URL=postgresql://user:password@localhost:5432/teamtask
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=TeamTask <onboarding@resend.dev>
NODE_ENV=development
```

```bash
# Generate Prisma client and sync database
npx prisma generate
npx prisma db push

# (Optional) Seed the database
node scripts/seed.js

# Start development server
npm run dev
```

Backend runs at `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

```bash
# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173`

## Environment Variables

### Backend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Yes | Direct PostgreSQL URL for migrations |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | No | Token expiry (default: 7d) |
| `FRONTEND_URL` | Yes | Frontend URL for CORS and redirects |
| `RESEND_API_KEY` | Yes | Resend API key for emails |
| `RESEND_FROM_EMAIL` | No | Sender email (default: onboarding@resend.dev) |
| `NODE_ENV` | No | Environment mode (development/production) |

### Frontend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API base URL |

## Database Schema

The application uses the following Prisma models:

- **User**: Accounts with role-based access (ADMIN, MANAGER, MEMBER)
- **AdminRequest**: Pending admin approval requests
- **Project**: Projects with status tracking
- **ProjectMember**: Many-to-many project membership with roles
- **Task**: Tasks with status, priority, assignee, and due dates
- **TaskComment**: Comments on tasks
- **ActivityLog**: Audit trail for project activities
- **ProjectInvite**: Email invites for non-registered users

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Admin
- `GET /api/admin/users` - List all users (Admin only)
- `POST /api/admin/request` - Request admin access
- `GET /api/admin/requests` - List pending admin requests
- `POST /api/admin/requests/:id/approve` - Approve admin request
- `POST /api/admin/requests/:id/reject` - Reject admin request

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/members` - List project members
- `POST /api/projects/:id/members` - Add member (existing user)
- `DELETE /api/projects/:id/members/:userId` - Remove member
- `POST /api/admin/projects/:id/email-invite` - Invite by email (existing or new user)

### Tasks
- `GET /api/projects/:id/tasks` - List project tasks
- `POST /api/projects/:id/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/comments` - Add comment

### Health Check
- `GET /api/health` - Server health status

## Performance Optimizations

### Database Indexes
The following indexes were added to optimize query performance:

- `Task`: `projectId`, `assigneeId`, `status`, composite (`projectId`, `status`)
- `ProjectMember`: `userId`, `projectId`
- `Project`: `ownerId`, `status`
- `ActivityLog`: `projectId`, `userId`, `createdAt`

### API Optimizations
- Removed heavy `members` + `users` includes from project list endpoint
- Returns only member counts instead of full user objects
- Reduced payload size and query complexity

### Frontend Optimizations
- React Query configured with:
  - `staleTime: 5 minutes` - Reduces redundant refetches
  - `gcTime: 10 minutes` - Keeps data in cache longer
  - `refetchOnWindowFocus: false` - Prevents unnecessary refetches
- Efficient cache invalidation on mutations

## Email Setup

The application uses Resend for transactional emails.

### Option A: Testing (Recommended for development)
- No domain verification required
- Uses `onboarding@resend.dev` as sender
- Limited to 100 emails/day
- Works immediately after adding `RESEND_API_KEY`

### Option B: Production (Custom domain)
1. Add your domain in Resend dashboard
2. Add the DNS records provided by Resend to your domain registrar
3. Wait for domain verification
4. Update `RESEND_FROM_EMAIL` to your verified domain

**Note:** Railway subdomains (`.up.railway.app`) cannot be used with Resend as you cannot modify their DNS records. Use a custom domain or the default `onboarding@resend.dev` address.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Railway deployment instructions.

Quick summary:
1. Push code to GitHub
2. Create Railway backend service (root: `backend`, start: `npm run start:railway`)
3. Create Railway frontend service (root: `frontend`, build: `npm install && npm run build`, start: `npm run start`)
4. Configure environment variables in Railway dashboard
5. Deploy and verify

## Available Scripts

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run start` - Start production server
- `npm run start:railway` - Railway startup (migrations + server)
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run migrations in development
- `npm run prisma:deploy` - Deploy migrations in production

### Frontend
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm start` - Start production preview server (used by Railway)

## Troubleshooting

### Emails not sending
1. Verify `RESEND_API_KEY` is set in environment variables
2. Check Railway logs for "Resend is not configured" warnings
3. Verify the recipient email is valid
4. Check Resend dashboard for delivery status

### Database connection errors
1. Verify `DATABASE_URL` uses the pooler URL (IPv4 compatible)
2. Check Supabase connection limits
3. Ensure SSL mode is set to `require`

### CORS errors
1. Verify `FRONTEND_URL` matches your actual frontend domain
2. Check that the backend is receiving requests with proper origin headers

## License

ISC

## Author

Utkarsh Dubey
