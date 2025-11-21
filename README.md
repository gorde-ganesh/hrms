# HRMS - Human Resource Management System

A comprehensive Human Resource Management System built with modern web technologies, featuring employee management, attendance tracking, payroll processing, leave management, and real-time communication.

## 🚀 Technology Stack

### Frontend

- **Framework**: Angular (latest version)
- **UI Components**: PrimeNG
- **Styling**: Tailwind CSS
- **Real-time Communication**: Socket.IO Client
- **State Management**: Angular Services

### Backend

- **Runtime**: Node.js with Bun
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **Security**: HTTPS with SSL certificates

## 📁 Project Structure

```
hrms/
├── hrms-ui/                 # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/    # Feature modules (admin, chat, attendance, etc.)
│   │   │   ├── services/    # Angular services
│   │   │   └── guards/      # Route guards
│   │   └── assets/          # Static assets
│   └── package.json
│
├── hrms-backend/            # Node.js backend application
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

- Node.js (v18 or higher)
- Bun (latest version)
- PostgreSQL database
- Git

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd hrms-backend
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a `.env` file in the `hrms-backend` directory with the following variables:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/hrms_db"
   JWT_SECRET="your-secret-key-here"
   JWT_EXPIRES_IN="7d"
   PORT=8080
   HOST=0.0.0.0
   NODE_ENV=development
   ```

4. Run Prisma migrations:

   ```bash
   bunx prisma migrate dev
   ```

5. Generate Prisma Client:

   ```bash
   bunx prisma generate
   ```

6. Start the backend server:
   ```bash
   bun run main.ts
   ```

The backend will be available at `https://localhost:8080` (or your configured host/port).

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd hrms-ui
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Update the API endpoint in the environment files if needed:

   - `src/environments/environment.ts` (development)
   - `src/environments/environment.prod.ts` (production)

4. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:4200`.

## 🌐 Running on Local Network

To make the application accessible to other devices on your local network:

### Backend

The backend is already configured to listen on `0.0.0.0` (all network interfaces).

### Frontend

Run the Angular dev server with the host flag:

```bash
ng serve --host 0.0.0.0
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
cd hrms-ui
npm run build
```

The production build will be in `hrms-ui/dist/`.

**Backend:**

```bash
cd hrms-backend
# Ensure all dependencies are installed
bun install --production
# Run migrations
bunx prisma migrate deploy
# Start the server
bun run main.ts
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
