# Multi-Client HRMS Application

A comprehensive Human Resource Management System (HRMS) built with React, TypeScript, Tailwind CSS, and Supabase. This application supports multi-client architecture with role-based access control and provides modules for attendance, leave management, payroll, performance tracking, and internal communication.

## 🚀 Features

### Core Modules

1. **Attendance Management**

   - Real-time clock in/out functionality
   - Attendance logs and history
   - Team attendance overview (for managers)
   - Attendance reports and analytics
   - Automated time tracking

2. **Leave Management**

   - Submit leave requests with reason and dates
   - Manager/HR approval workflow
   - Leave balance tracking by type
   - Leave history and calendar view
   - Automated notifications

3. **Payroll Processing**

   - Salary calculation and processing
   - Payslip generation and download
   - Earnings and deductions breakdown
   - Department-wise salary reports
   - Tax deduction management

4. **Performance Management**

   - KPI tracking and goal setting
   - Performance reviews and feedback
   - Skills assessment
   - Quarterly performance trends
   - Team performance overview

5. **Chat & Messaging**

   - Real-time messaging between employees
   - Conversation history
   - File sharing capability
   - Online status indicators
   - Search conversations

6. **Employee Management**

   - Complete employee directory
   - Add, edit, and deactivate employees
   - Employee profiles with detailed information
   - Search and filter functionality
   - Department and role assignment

7. **Departments & Designations**

   - Organizational structure management
   - Department hierarchy
   - Designation/role definitions
   - Department head assignment
   - Employee distribution analytics

8. **Settings & Configuration**
   - User profile management
   - Notification preferences
   - Security settings (password, 2FA)
   - Organization-wide settings (Admin/HR)
   - Module enable/disable

### User Roles

- **Admin**: Full system access, client management, module configuration
- **HR**: Employee management, payroll processing, organization-wide reports
- **Manager**: Team oversight, leave approvals, performance reviews
- **Employee**: Self-service access to personal data, attendance, leave requests

## 🛠️ Technology Stack

### Frontend

- **React 18** with TypeScript
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Shadcn UI** component library
- **Recharts** for data visualization
- **Lucide React** for icons

### Backend

- **Supabase** (PostgreSQL database)
- **Supabase Auth** for authentication
- **Supabase Edge Functions** (Deno + Hono)
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for live updates

## 📦 Installation

### Prerequisites

- Node.js 18+ installed
- Supabase account
- Git

### Steps

1. **Clone the repository** (if applicable)

   ```bash
   git clone <repository-url>
   cd hrms-application
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**

   - The application is already connected to Supabase
   - Follow the [Backend Setup Guide](./BACKEND_SETUP.md) to configure the database

4. **Run the database schema**

   - Open Supabase Dashboard → SQL Editor
   - Copy content from `/supabase/schema.sql`
   - Execute the SQL to create all tables

5. **Create demo users**

   - Open the application
   - Click "Create Demo Users" button on login page
   - Or follow manual setup in Backend Setup Guide

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔐 Demo Credentials

After creating demo users, use these credentials:

| Role     | Email                | Password |
| -------- | -------------------- | -------- |
| Admin    | admin@company.com    | demo123  |
| HR       | hr@company.com       | demo123  |
| Manager  | manager@company.com  | demo123  |
| Employee | employee@company.com | demo123  |

## 📖 Usage Guide

### For Employees

1. **Check In/Out**

   - Go to Dashboard or Attendance module
   - Click "Check In" at start of day
   - Click "Check Out" at end of day

2. **Request Leave**

   - Navigate to Leave module
   - Click "Request Leave"
   - Fill in dates, type, and reason
   - Submit for approval

3. **View Payslips**

   - Go to Payroll module
   - Click on any month to view detailed payslip
   - Download as PDF

4. **Send Messages**
   - Open Chat module
   - Select a conversation
   - Type and send messages

### For Managers

1. **Approve Leave Requests**

   - Go to Leave module → Pending Approvals tab
   - Review request details
   - Click Approve or Reject

2. **View Team Attendance**

   - Navigate to Attendance module → Team Attendance tab
   - See real-time attendance status
   - View team attendance patterns

3. **Conduct Performance Reviews**
   - Go to Performance module → Team Performance tab
   - Click on team member
   - Submit review and feedback

### For HR

1. **Manage Employees**

   - Go to Employees module
   - Add new employees with full details
   - Edit or deactivate as needed

2. **Process Payroll**

   - Navigate to Payroll module → Employee Payroll tab
   - Review salary details
   - Mark as processed

3. **Manage Departments**
   - Go to Departments module
   - Create departments and sub-departments
   - Assign department heads
   - Define designations

### For Admins

1. **System Configuration**

   - Access Settings → Organization tab
   - Configure timezone, currency, work hours

2. **Module Management**

   - Go to Settings → Modules tab
   - Enable/disable modules per organization

3. **View Analytics**
   - Dashboard shows organization-wide metrics
   - Client activity and employee distribution

## 🗄️ Database Schema

### Main Tables

- **clients** - Organization/company information
- **profiles** - User profiles (extends auth.users)
- **departments** - Department structure
- **designations** - Job titles and roles
- **attendance** - Daily attendance records
- **leave_requests** - Leave applications
- **leave_balances** - Leave entitlement tracking
- **payroll** - Salary and payment records
- **performance_reviews** - Performance assessments
- **kpis** - Key performance indicators
- **messages** - Chat messages
- **notifications** - System notifications

See `/supabase/schema.sql` for complete schema.

## 🔌 API Integration

### Using the API Hook

```typescript
import { useApi } from '../hooks/useApi';
import { useAuth } from '../components/auth/AuthContext';

function MyComponent() {
  const api = useApi();
  const { user } = useAuth();

  const handleCheckIn = async () => {
    const result = await api.attendance.checkIn(user.clientId);
    if (result) {
      console.log('Success:', result);
    } else {
      console.error('Error:', api.error);
    }
  };

  return (
    <button onClick={handleCheckIn} disabled={api.loading}>
      {api.loading ? 'Processing...' : 'Check In'}
    </button>
  );
}
```

### Available API Methods

See `/hooks/useApi.ts` for all available methods and `/utils/api.ts` for low-level API functions.

## 🔒 Security Features

1. **Row Level Security (RLS)**

   - Client data isolation
   - Role-based access control
   - User can only access their own data

2. **Authentication**

   - Supabase Auth integration
   - Secure session management
   - Password reset functionality

3. **Authorization**

   - Role-based permissions
   - Protected routes
   - API endpoint authorization

4. **Data Protection**
   - HTTPS only communication
   - Encrypted database connections
   - Environment variable protection

## 📱 Responsive Design

The application is fully responsive and works on:

- Desktop (1920px+)
- Laptop (1024px - 1919px)
- Tablet (768px - 1023px)
- Mobile (< 768px)

## 🎨 Customization

### Styling

The application uses Tailwind CSS v4. Global styles are in `/styles/globals.css`.

To customize colors, update the CSS variables:

```css
:root {
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  /* Add more custom variables */
}
```

### Adding New Modules

1. Create component in `/components/[module-name]/`
2. Add route in `/App.tsx`
3. Update sidebar navigation in `/components/layout/Sidebar.tsx`
4. Create backend API endpoints if needed
5. Update database schema for new tables

## 🧪 Testing

### Manual Testing

Test each user role:

1. Login as each role
2. Verify dashboard access
3. Test module permissions
4. Validate CRUD operations
5. Check real-time features

### Database Testing

```sql
-- Test attendance records
SELECT * FROM attendance WHERE user_id = 'USER_ID';

-- Test leave balances
SELECT * FROM leave_balances WHERE user_id = 'USER_ID';

-- Test RLS policies
SET ROLE authenticated;
SET request.jwt.claim.sub = 'USER_ID';
SELECT * FROM profiles; -- Should only see accessible profiles
```

## 🐛 Troubleshooting

### Common Issues

**Problem**: Can't log in

- Solution: Verify user exists in Auth and has profile record

**Problem**: "Unauthorized" errors

- Solution: Check RLS policies and user role

**Problem**: API endpoints fail

- Solution: Check Edge Function logs in Supabase Dashboard

**Problem**: Data not loading

- Solution: Verify database tables exist and are populated

See [Backend Setup Guide](./BACKEND_SETUP.md) for detailed troubleshooting.

## 📄 File Structure

```
/
├── components/
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Role-specific dashboards
│   ├── attendance/        # Attendance module
│   ├── leave/             # Leave management
│   ├── payroll/           # Payroll processing
│   ├── performance/       # Performance tracking
│   ├── chat/              # Messaging
│   ├── employee/          # Employee management
│   ├── departments/       # Org structure
│   ├── settings/          # Settings & config
│   ├── layout/            # Layout components
│   └── ui/                # Shadcn UI components
├── hooks/                 # Custom React hooks
├── utils/                 # Utility functions
│   ├── supabase/          # Supabase client & types
│   └── api.ts             # API functions
├── supabase/              # Backend code
│   ├── functions/server/  # Edge Functions
│   └── schema.sql         # Database schema
├── styles/                # Global styles
└── App.tsx                # Main app component
```

## 🚧 Limitations

This is a prototype application with the following limitations:

1. **Not Production-Ready**: Additional security hardening required
2. **PII Warning**: Not suitable for production PII/sensitive data
3. **Compliance**: GDPR and compliance features need implementation
4. **Email**: SMTP configuration required for email notifications
5. **File Upload**: File storage needs additional configuration
6. **Audit Logging**: No built-in audit trail
7. **Backup**: Manual backup procedures needed

## 🔮 Future Enhancements

Potential features for production version:

- [ ] Advanced reporting and analytics
- [ ] Mobile app (React Native)
- [ ] Document management system
- [ ] Expense tracking module
- [ ] Time tracking with projects
- [ ] Benefits administration
- [ ] Recruitment module
- [ ] Training and development
- [ ] Survey and feedback system
- [ ] Integration with external tools (Slack, Teams, etc.)

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn UI](https://ui.shadcn.com)

## 📝 License

This is a demonstration application. Please refer to your organization's licensing requirements for production use.

## 🤝 Support

For issues or questions:

1. Check the troubleshooting section
2. Review [Backend Setup Guide](./BACKEND_SETUP.md)
3. Check Supabase Dashboard logs
4. Review browser console for frontend errors

---

**Built with ❤️ for enterprise HR management**
