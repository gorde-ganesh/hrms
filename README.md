# HRMS - Human Resource Management System

A comprehensive Human Resource Management System built with modern web technologies, featuring employee management, attendance tracking, payroll processing, leave management, and real-time communication.

## 🚀 Technology Stack

### Monorepo

- **Workspaces**: npm workspaces (single root `package-lock.json`)
- **Task runner**: [Turborepo](https://turbo.build) (`turbo.json`)

### Frontend

- **Framework**: Angular 20 (standalone components)
- **UI Components**: PrimeNG
- **Styling**: Tailwind CSS
- **Real-time Communication**: Socket.IO Client
- **State Management**: Angular Services

### Backend

- **Runtime**: Node.js (TypeScript, run with `tsx`)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **Security**: HTTPS with SSL certificates

## 📁 Project Structure

```
hrms/
├── package.json             # Workspace root (npm workspaces + turbo scripts)
├── turbo.json               # Turborepo task pipeline
├── package-lock.json        # Single lockfile for all workspaces
├── docker-compose.yml
│
├── hrms-ui/                 # Angular frontend workspace
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/    # Feature modules (admin, chat, attendance, etc.)
│   │   │   ├── services/    # Angular services
│   │   │   └── guards/      # Route guards
│   │   └── assets/          # Static assets
│   └── package.json
│
├── hrms-backend/            # Node.js backend workspace
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Custom middleware
│   │   └── utils/           # Utility functions
│   ├── prisma/              # Database schema and migrations
│   ├── cert/                # SSL certificates
│   └── main.ts              # Application entry point
│
└── docs/                    # Documentation
```

## ✨ Features

- **User Management**: Role-based access control (Admin, HR, Manager, Employee)
- **Employee Management**: Complete employee lifecycle management
- **Attendance Tracking**: Real-time attendance monitoring and reporting
- **Leave Management**: Leave requests, approvals, and balance tracking
- **Payroll Processing**: Automated payroll calculation and generation
- **Department & Designation Management**: Organizational structure management
- **Real-time Chat**: Direct messages, group chats, and channels
- **Huddle/Video Calls**: Audio and video communication
- **Notifications**: Real-time notifications for important events
- **Reports & Analytics**: Comprehensive reporting capabilities

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v20 or higher) and npm
- PostgreSQL database
- Git
- Windows only: Microsoft Visual C++ Redistributable (required by the Turbo binary)

### Install

Install all dependencies once from the repository root:

```bash
npm install
```

### Backend Setup

1. Create a `.env` file in the `hrms-backend` directory with the following variables:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/hrms_db"
   JWT_SECRET="your-secret-key-here"
   JWT_EXPIRES_IN="7d"
   PORT=8080
   HOST=0.0.0.0
   NODE_ENV=development
   ```

2. Place SSL certificates in `hrms-backend/cert/` (git-ignored).

3. Run Prisma migrations and generate the client:

   ```bash
   npm run migrate -w hrms-backend
   npm run generate -w hrms-backend
   ```

4. Optionally seed the database:

   ```bash
   npm run seed -w hrms-backend
   ```

### Frontend Setup

Update the API endpoint in the environment files if needed:

- `hrms-ui/src/environments/environment.ts` (development)
- `hrms-ui/src/environments/environment.prod.ts` (production)

### Run Everything

From the repository root:

```bash
npm run dev
```

This runs `prisma generate` and then starts both dev servers through Turbo:

- Backend: `https://localhost:8080`
- Frontend: `http://localhost:4200`

To run a single app:

```bash
npm run dev -w hrms-backend
npm start -w hrms-ui
```

### Common Commands

| Command                                     | Description                                     |
| ------------------------------------------- | ----------------------------------------------- |
| `npm run dev`                               | Start backend and frontend                      |
| `npm run build`                             | Build all workspaces                            |
| `npm run typecheck`                         | Type-check all workspaces                       |
| `npm run <script> -w <workspace>`           | Run any workspace script directly (no Turbo)    |

## 🌐 Running on Local Network

To make the application accessible to other devices on your local network:

### Backend

The backend is already configured to listen on `0.0.0.0` (all network interfaces).

### Frontend

Run the Angular dev server with the host flag:

```bash
npm run host -w hrms-ui
```

Then access the application from other devices using:

```
http://<your-ip-address>:4200
```

## 🔒 Security Notes

- Never commit `.env` files to version control
- SSL certificates are stored in `hrms-backend/cert/` and are excluded from git
- Ensure strong JWT secrets in production
- Use environment-specific configuration for different deployment environments

## 📝 Environment Variables

### Backend Required Variables

| Variable         | Description                  | Example                                      |
| ---------------- | ---------------------------- | -------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/hrms` |
| `JWT_SECRET`     | Secret key for JWT signing   | `your-secure-secret-key`                     |
| `JWT_EXPIRES_IN` | JWT token expiration time    | `7d`                                         |
| `PORT`           | Server port                  | `8080`                                       |
| `HOST`           | Server host                  | `0.0.0.0`                                    |
| `NODE_ENV`       | Environment mode             | `development` or `production`                |

## 🚀 Deployment

### Production Build

**Frontend:**

```bash
npm run build -w hrms-ui
```

The production build will be in `hrms-ui/dist/`.

**Backend:**

```bash
# From the repository root
npm ci
# Run migrations
npm exec -w hrms-backend -- prisma migrate deploy
# Start the server
npm run start -w hrms-backend
```

### Docker

Both images build from the repository root (they share the root lockfile):

```bash
docker compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Authors

- Development Team

## 🐛 Known Issues

- None currently documented

## 📞 Support

For support and questions, please contact the development team.
