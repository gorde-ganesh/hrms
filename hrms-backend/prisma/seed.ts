import { PrismaClient, EmployeeStatus } from '../generated/prisma';

const prisma = new PrismaClient();

const rolePermissions: Record<string, Record<string, string[]>> = {
  ADMIN: {
    dashboard: ['view'],
    chat: ['view'],
    attendence: ['view', 'add', 'edit'],
    employees: ['view', 'add', 'edit'],
    departments: ['view', 'add', 'edit'],
    designations: ['view', 'add', 'edit'],
    payroll: ['view', 'generate', 'edit'],
    leaves: ['view', 'approve', 'reject'],
    performance: ['view', 'add', 'edit'],
    notifications: ['view', 'send'],
    reports: ['view'],
    roles: ['view', 'add', 'edit', 'delete'],
    users: ['view', 'edit'],
  },
  HR: {
    dashboard: ['view'],
    chat: ['view'],
    attendence: ['view', 'add', 'edit'],
    employees: ['view', 'add', 'edit'],
    departments: ['view', 'add', 'edit'],
    designations: ['view', 'add', 'edit'],
    payroll: ['view', 'generate'],
    leaves: ['view', 'approve', 'reject'],
    performance: ['view', 'add', 'edit'],
    notifications: ['view', 'send'],
    reports: ['view'],
  },
  EMPLOYEE: {
    dashboard: ['view'],
    chat: ['view'],
    attendence: ['view', 'add', 'edit'],
    payroll: ['view'],
    leaves: ['view', 'apply'],
    performance: ['view'],
    notifications: ['view'],
    reports: ['view'],
  },
  MANAGER: {
    dashboard: ['view'],
    chat: ['view'],
    attendence: ['view', 'add', 'edit'],
    employees: ['view'],
    payroll: ['view'],
    leaves: ['view', 'teams_leave', 'approve', 'reject'],
    performance: ['view', 'add', 'edit'],
    notifications: ['view', 'send'],
    reports: ['view'],
  },
};

async function main() {
  console.log('Start seeding ...');

  // 1. Create Permissions
  const allPermissions = new Set<string>();
  for (const role in rolePermissions) {
    for (const resource in rolePermissions[role]) {
      for (const action of rolePermissions[role][resource]) {
        allPermissions.add(`${resource}:${action}`);
      }
    }
  }

  console.log(`Found ${allPermissions.size} unique permissions.`);

  for (const permString of allPermissions) {
    const [resource, action] = permString.split(':');
    await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: { resource, action, description: `Can ${action} ${resource}` },
    });
  }

  // 2. Create Roles and Assign Permissions
  for (const roleName in rolePermissions) {
    console.log(`Processing role: ${roleName}`);

    const role = await prisma.userRole.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `Default ${roleName} role`, isSystem: true },
    });

    for (const resource in rolePermissions[roleName]) {
      for (const action of rolePermissions[roleName][resource]) {
        const permission = await prisma.permission.findUnique({
          where: { resource_action: { resource, action } },
        });
        if (permission) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
            update: {},
            create: { roleId: role.id, permissionId: permission.id },
          });
        }
      }
    }
  }

  console.log('Seeding finished roles.');

  // 3. Create Departments
  const departments = [
    { name: 'Engineering', description: 'Software development and technical innovation' },
    { name: 'Human Resources', description: 'Talent acquisition, employee relations, and organizational development' },
    { name: 'Finance', description: 'Financial planning, accounting, and budget management' },
    { name: 'Marketing', description: 'Brand management, digital marketing, and market research' },
    { name: 'Sales', description: 'Business development and revenue generation' },
    { name: 'Operations', description: 'Day-to-day operations and process optimization' },
    { name: 'Customer Support', description: 'Customer success and technical support' },
    { name: 'Legal', description: 'Legal compliance, contracts, and regulatory affairs' },
    { name: 'Product', description: 'Product strategy, design, and roadmap planning' },
    { name: 'IT', description: 'Infrastructure, security, and technical support' },
    { name: 'Research & Development', description: 'Innovation and emerging technology research' },
    { name: 'Quality Assurance', description: 'Product testing and quality control' },
  ];

  console.log('Creating departments...');
  for (const dept of departments) {
    await prisma.department.upsert({ where: { name: dept.name }, update: {}, create: dept });
  }

  // 4. Create Designations
  const designations = [
    // Executive
    { name: 'Chief Executive Officer (CEO)', description: 'Chief executive officer', classification: 'Executive' },
    { name: 'Chief Technology Officer (CTO)', description: 'Chief technology officer', classification: 'Executive' },
    { name: 'Chief Financial Officer (CFO)', description: 'Chief financial officer', classification: 'Executive' },
    { name: 'Chief Operating Officer (COO)', description: 'Chief operating officer', classification: 'Executive' },
    { name: 'Chief Human Resources Officer (CHRO)', description: 'Chief human resources officer', classification: 'Executive' },
    { name: 'Chief Marketing Officer (CMO)', description: 'Chief marketing officer', classification: 'Executive' },
    // VP
    { name: 'Vice President of Engineering', description: 'VP Engineering', classification: 'Leadership' },
    { name: 'Vice President of Sales', description: 'VP Sales', classification: 'Leadership' },
    { name: 'Vice President of Marketing', description: 'VP Marketing', classification: 'Leadership' },
    { name: 'Vice President of Operations', description: 'VP Operations', classification: 'Leadership' },
    // Director
    { name: 'Engineering Director', description: 'Director of Engineering', classification: 'Leadership' },
    { name: 'Product Director', description: 'Director of Product', classification: 'Leadership' },
    { name: 'HR Director', description: 'Director of Human Resources', classification: 'Leadership' },
    { name: 'Finance Director', description: 'Director of Finance', classification: 'Leadership' },
    // Management
    { name: 'Engineering Manager', description: 'Manages engineering team', classification: 'Management' },
    { name: 'Product Manager', description: 'Manages product roadmap and strategy', classification: 'Management' },
    { name: 'Project Manager', description: 'Manages projects and timelines', classification: 'Management' },
    { name: 'Team Lead', description: 'Technical team lead', classification: 'Management' },
    { name: 'HR Manager', description: 'Human resources manager', classification: 'Management' },
    { name: 'Sales Manager', description: 'Sales team manager', classification: 'Management' },
    { name: 'Marketing Manager', description: 'Marketing team manager', classification: 'Management' },
    { name: 'Operations Manager', description: 'Operations team manager', classification: 'Management' },
    { name: 'Support Manager', description: 'Customer support manager', classification: 'Management' },
    // Senior IC
    { name: 'Principal Engineer', description: 'Principal level engineer', classification: 'Individual Contributor' },
    { name: 'Staff Engineer', description: 'Staff level engineer', classification: 'Individual Contributor' },
    { name: 'Senior Software Engineer', description: 'Senior software engineer', classification: 'Individual Contributor' },
    { name: 'Senior Product Designer', description: 'Senior product designer', classification: 'Individual Contributor' },
    { name: 'Senior Data Analyst', description: 'Senior data analyst', classification: 'Individual Contributor' },
    { name: 'Senior HR Specialist', description: 'Senior HR specialist', classification: 'Individual Contributor' },
    { name: 'Senior Accountant', description: 'Senior accountant', classification: 'Individual Contributor' },
    { name: 'Senior Marketing Specialist', description: 'Senior marketing specialist', classification: 'Individual Contributor' },
    // Mid-Level
    { name: 'Software Engineer', description: 'Software engineer', classification: 'Individual Contributor' },
    { name: 'Full Stack Developer', description: 'Full stack developer', classification: 'Individual Contributor' },
    { name: 'Frontend Developer', description: 'Frontend developer', classification: 'Individual Contributor' },
    { name: 'Backend Developer', description: 'Backend developer', classification: 'Individual Contributor' },
    { name: 'DevOps Engineer', description: 'DevOps engineer', classification: 'Individual Contributor' },
    { name: 'QA Engineer', description: 'Quality assurance engineer', classification: 'Individual Contributor' },
    { name: 'Product Designer', description: 'Product designer', classification: 'Individual Contributor' },
    { name: 'UX/UI Designer', description: 'UX/UI designer', classification: 'Individual Contributor' },
    { name: 'Data Analyst', description: 'Data analyst', classification: 'Individual Contributor' },
    { name: 'Business Analyst', description: 'Business analyst', classification: 'Individual Contributor' },
    { name: 'HR Specialist', description: 'HR specialist', classification: 'Individual Contributor' },
    { name: 'Recruiter', description: 'Technical recruiter', classification: 'Individual Contributor' },
    { name: 'Accountant', description: 'Accountant', classification: 'Individual Contributor' },
    { name: 'Financial Analyst', description: 'Financial analyst', classification: 'Individual Contributor' },
    { name: 'Marketing Specialist', description: 'Marketing specialist', classification: 'Individual Contributor' },
    { name: 'Content Writer', description: 'Content writer', classification: 'Individual Contributor' },
    { name: 'Sales Representative', description: 'Sales representative', classification: 'Individual Contributor' },
    { name: 'Business Development Representative', description: 'BDR', classification: 'Individual Contributor' },
    { name: 'Customer Success Manager', description: 'CSM', classification: 'Individual Contributor' },
    { name: 'Support Specialist', description: 'Customer support specialist', classification: 'Individual Contributor' },
    { name: 'IT Support Specialist', description: 'IT support', classification: 'Individual Contributor' },
    { name: 'System Administrator', description: 'System administrator', classification: 'Individual Contributor' },
    // Junior
    { name: 'Junior Software Engineer', description: 'Junior software engineer', classification: 'Individual Contributor' },
    { name: 'Associate Engineer', description: 'Associate engineer', classification: 'Individual Contributor' },
    { name: 'Junior Designer', description: 'Junior designer', classification: 'Individual Contributor' },
    { name: 'Junior Analyst', description: 'Junior analyst', classification: 'Individual Contributor' },
    { name: 'HR Intern', description: 'HR intern', classification: 'Intern' },
    { name: 'Engineering Intern', description: 'Engineering intern', classification: 'Intern' },
  ];

  console.log('Creating designations...');
  for (const desig of designations) {
    await prisma.designation.upsert({ where: { name: desig.name }, update: {}, create: desig });
  }

  // 5. Create Test Users
  console.log('Creating test users...');

  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const adminRole    = await prisma.userRole.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const hrRole       = await prisma.userRole.findUniqueOrThrow({ where: { name: 'HR' } });
  const managerRole  = await prisma.userRole.findUniqueOrThrow({ where: { name: 'MANAGER' } });
  const employeeRole = await prisma.userRole.findUniqueOrThrow({ where: { name: 'EMPLOYEE' } });

  const engineeringDept = await prisma.department.findUniqueOrThrow({ where: { name: 'Engineering' } });
  const hrDept          = await prisma.department.findUniqueOrThrow({ where: { name: 'Human Resources' } });
  const productDept     = await prisma.department.findUniqueOrThrow({ where: { name: 'Product' } });
  const salesDept       = await prisma.department.findUniqueOrThrow({ where: { name: 'Sales' } });
  const marketingDept   = await prisma.department.findUniqueOrThrow({ where: { name: 'Marketing' } });
  const supportDept     = await prisma.department.findUniqueOrThrow({ where: { name: 'Customer Support' } });

  const ceoDesig            = await prisma.designation.findUniqueOrThrow({ where: { name: 'Chief Executive Officer (CEO)' } });
  const ctoDesig            = await prisma.designation.findUniqueOrThrow({ where: { name: 'Chief Technology Officer (CTO)' } });
  const engManagerDesig     = await prisma.designation.findUniqueOrThrow({ where: { name: 'Engineering Manager' } });
  const seniorEngDesig      = await prisma.designation.findUniqueOrThrow({ where: { name: 'Senior Software Engineer' } });
  const engDesig            = await prisma.designation.findUniqueOrThrow({ where: { name: 'Software Engineer' } });
  const juniorEngDesig      = await prisma.designation.findUniqueOrThrow({ where: { name: 'Junior Software Engineer' } });
  const hrManagerDesig      = await prisma.designation.findUniqueOrThrow({ where: { name: 'HR Manager' } });
  const hrSpecialistDesig   = await prisma.designation.findUniqueOrThrow({ where: { name: 'HR Specialist' } });
  const productManagerDesig = await prisma.designation.findUniqueOrThrow({ where: { name: 'Product Manager' } });
  const salesManagerDesig   = await prisma.designation.findUniqueOrThrow({ where: { name: 'Sales Manager' } });
  const marketingManagerDesig = await prisma.designation.findUniqueOrThrow({ where: { name: 'Marketing Manager' } });
  const supportManagerDesig = await prisma.designation.findUniqueOrThrow({ where: { name: 'Support Manager' } });

  const testUsers = [
    // ADMIN
    {
      name: 'Rajesh Sharma', email: 'admin@company.com',
      phone: '+1-555-0101', address: '123 Main St', city: 'San Francisco', state: 'CA', country: 'USA', zipCode: '94102',
      roleId: adminRole.id,
      employee: {
        employeeCode: 'EMP001', departmentId: engineeringDept.id, designationId: ceoDesig.id,
        joiningDate: new Date('2020-01-15'), salary: 250000, dob: new Date('1985-03-20'),
        personalEmail: 'rajesh.sharma.personal@email.com', bloodGroup: 'A+',
        emergencyContactPerson: 'Priya Sharma', emergencyContactNumber: '+1-555-0102', status: EmployeeStatus.ACTIVE,
      },
    },
    {
      name: 'Ankit Verma', email: 'sysadmin@company.com',
      phone: '+1-555-0103', address: '456 Tech Blvd', city: 'San Francisco', state: 'CA', country: 'USA', zipCode: '94103',
      roleId: adminRole.id,
      employee: {
        employeeCode: 'EMP002', departmentId: engineeringDept.id, designationId: ctoDesig.id,
        joiningDate: new Date('2020-06-01'), salary: 220000, dob: new Date('1988-07-15'),
        personalEmail: 'ankit.verma.personal@email.com', bloodGroup: 'B+',
        emergencyContactPerson: 'Sunita Verma', emergencyContactNumber: '+1-555-0104', status: EmployeeStatus.ACTIVE,
      },
    },
    // HR
    {
      name: 'Meena Iyer', email: 'hr.manager@company.com',
      phone: '+1-555-0201', address: '789 HR Lane', city: 'New York', state: 'NY', country: 'USA', zipCode: '10001',
      roleId: hrRole.id,
      employee: {
        employeeCode: 'EMP003', departmentId: hrDept.id, designationId: hrManagerDesig.id,
        joiningDate: new Date('2021-03-10'), salary: 120000, dob: new Date('1990-05-25'),
        personalEmail: 'meena.iyer.personal@email.com', bloodGroup: 'O+',
        emergencyContactPerson: 'Ramesh Iyer', emergencyContactNumber: '+1-555-0202', status: EmployeeStatus.ACTIVE,
      },
    },
    {
      name: 'Kavya Nair', email: 'hr.specialist@company.com',
      phone: '+1-555-0203', address: '321 People St', city: 'New York', state: 'NY', country: 'USA', zipCode: '10002',
      roleId: hrRole.id,
      employee: {
        employeeCode: 'EMP004', departmentId: hrDept.id, designationId: hrSpecialistDesig.id,
        joiningDate: new Date('2022-01-20'), salary: 85000, dob: new Date('1993-11-08'),
        personalEmail: 'kavya.nair.personal@email.com', bloodGroup: 'AB+',
        emergencyContactPerson: 'Suresh Nair', emergencyContactNumber: '+1-555-0204', status: EmployeeStatus.ACTIVE,
      },
    },
    // MANAGER
    {
      name: 'Vikram Patel', email: 'eng.manager@company.com',
      phone: '+1-555-0301', address: '555 Code Ave', city: 'Seattle', state: 'WA', country: 'USA', zipCode: '98101',
      roleId: managerRole.id,
      employee: {
        employeeCode: 'EMP005', departmentId: engineeringDept.id, designationId: engManagerDesig.id,
        joiningDate: new Date('2021-06-15'), salary: 180000, dob: new Date('1987-09-12'),
        personalEmail: 'vikram.patel.personal@email.com', bloodGroup: 'A-',
        emergencyContactPerson: 'Anjali Patel', emergencyContactNumber: '+1-555-0302', status: EmployeeStatus.ACTIVE,
      },
    },
    {
      name: 'Rohit Desai', email: 'product.manager@company.com',
      phone: '+1-555-0303', address: '777 Product Rd', city: 'Austin', state: 'TX', country: 'USA', zipCode: '73301',
      roleId: managerRole.id,
      employee: {
        employeeCode: 'EMP006', departmentId: productDept.id, designationId: productManagerDesig.id,
        joiningDate: new Date('2021-09-01'), salary: 165000, dob: new Date('1989-04-30'),
        personalEmail: 'rohit.desai.personal@email.com', bloodGroup: 'B-',
        emergencyContactPerson: 'Sneha Desai', emergencyContactNumber: '+1-555-0304', status: EmployeeStatus.ACTIVE,
      },
    },
    {
      name: 'Arjun Mehta', email: 'sales.manager@company.com',
      phone: '+1-555-0305', address: '888 Sales Blvd', city: 'Chicago', state: 'IL', country: 'USA', zipCode: '60601',
      roleId: managerRole.id,
      employee: {
        employeeCode: 'EMP007', departmentId: salesDept.id, designationId: salesManagerDesig.id,
        joiningDate: new Date('2021-11-20'), salary: 155000, dob: new Date('1991-02-14'),
        personalEmail: 'arjun.mehta.personal@email.com', bloodGroup: 'O-',
        emergencyContactPerson: 'Pooja Mehta', emergencyContactNumber: '+1-555-0306', status: EmployeeStatus.ACTIVE,
      },
    },
    {
      name: 'Divya Krishnan', email: 'marketing.manager@company.com',
      phone: '+1-555-0307', address: '999 Brand St', city: 'Los Angeles', state: 'CA', country: 'USA', zipCode: '90001',
      roleId: managerRole.id,
      employee: {
        employeeCode: 'EMP008', departmentId: marketingDept.id, designationId: marketingManagerDesig.id,
        joiningDate: new Date('2022-02-28'), salary: 145000, dob: new Date('1992-08-22'),
        personalEmail: 'divya.krishnan.personal@email.com', bloodGroup: 'A+',
        emergencyContactPerson: 'Arun Krishnan', emergencyContactNumber: '+1-555-0308', status: EmployeeStatus.ACTIVE,
      },
    },
    {
      name: 'Sunil Joshi', email: 'support.manager@company.com',
      phone: '+1-555-0309', address: '111 Support Lane', city: 'Denver', state: 'CO', country: 'USA', zipCode: '80201',
      roleId: managerRole.id,
      employee: {
        employeeCode: 'EMP009', departmentId: supportDept.id, designationId: supportManagerDesig.id,
        joiningDate: new Date('2022-04-15'), salary: 125000, dob: new Date('1990-12-05'),
        personalEmail: 'sunil.joshi.personal@email.com', bloodGroup: 'B+',
        emergencyContactPerson: 'Rekha Joshi', emergencyContactNumber: '+1-555-0310', status: EmployeeStatus.ACTIVE,
      },
    },
    // EMPLOYEE — Senior
    {
      name: 'Kiran Rao', email: 'senior.engineer1@company.com',
      phone: '+1-555-0401', address: '222 Dev St', city: 'San Francisco', state: 'CA', country: 'USA', zipCode: '94104',
      roleId: employeeRole.id,
      employee: {
        employeeCode: 'EMP010', departmentId: engineeringDept.id, designationId: seniorEngDesig.id,
        joiningDate: new Date('2020-08-10'), salary: 160000, dob: new Date('1988-06-18'),
        personalEmail: 'kiran.rao.personal@email.com', bloodGroup: 'O+',
        emergencyContactPerson: 'Geeta Rao', emergencyContactNumber: '+1-555-0402', status: EmployeeStatus.ACTIVE,
      },
    },
    {
      name: 'Nisha Gupta', email: 'senior.engineer2@company.com',
      phone: '+1-555-0403', address: '333 Backend Ave', city: 'Seattle', state: 'WA', country: 'USA', zipCode: '98102',
      roleId: employeeRole.id,
      employee: {
        employeeCode: 'EMP011', departmentId: engineeringDept.id, designationId: seniorEngDesig.id,
        joiningDate: new Date('2021-01-05'), salary: 155000, dob: new Date('1989-03-25'),
        personalEmail: 'nisha.gupta.personal@email.com', bloodGroup: 'AB+',
        emergencyContactPerson: 'Amit Gupta', emergencyContactNumber: '+1-555-0404', status: EmployeeStatus.ACTIVE,
      },
    },
    // EMPLOYEE — Mid
    {
      name: 'Ravi Shankar', email: 'engineer1@company.com',
      phone: '+1-555-0405', address: '444 Frontend Blvd', city: 'Austin', state: 'TX', country: 'USA', zipCode: '73302',
      roleId: employeeRole.id,
      employee: {
        employeeCode: 'EMP012', departmentId: engineeringDept.id, designationId: engDesig.id,
        joiningDate: new Date('2022-06-01'), salary: 130000, dob: new Date('1994-09-10'),
        personalEmail: 'ravi.shankar.personal@email.com', bloodGroup: 'A+',
        emergencyContactPerson: 'Usha Shankar', emergencyContactNumber: '+1-555-0406', status: EmployeeStatus.ACTIVE,
      },
    },
    {
      name: 'Priya Kulkarni', email: 'engineer2@company.com',
      phone: '+1-555-0407', address: '555 Fullstack Way', city: 'Boston', state: 'MA', country: 'USA', zipCode: '02101',
      roleId: employeeRole.id,
      employee: {
        employeeCode: 'EMP013', departmentId: engineeringDept.id, designationId: engDesig.id,
        joiningDate: new Date('2022-08-15'), salary: 128000, dob: new Date('1995-01-28'),
        personalEmail: 'priya.kulkarni.personal@email.com', bloodGroup: 'B+',
        emergencyContactPerson: 'Ganesh Kulkarni', emergencyContactNumber: '+1-555-0408', status: EmployeeStatus.ACTIVE,
      },
    },
    {
      name: 'Aditya Singh', email: 'engineer3@company.com',
      phone: '+1-555-0409', address: '666 DevOps Dr', city: 'Portland', state: 'OR', country: 'USA', zipCode: '97201',
      roleId: employeeRole.id,
      employee: {
        employeeCode: 'EMP014', departmentId: engineeringDept.id, designationId: engDesig.id,
        joiningDate: new Date('2023-01-10'), salary: 125000, dob: new Date('1993-07-14'),
        personalEmail: 'aditya.singh.personal@email.com', bloodGroup: 'O-',
        emergencyContactPerson: 'Neha Singh', emergencyContactNumber: '+1-555-0410', status: EmployeeStatus.ACTIVE,
      },
    },
    // EMPLOYEE — Junior
    {
      name: 'Sneha Reddy', email: 'junior.engineer1@company.com',
      phone: '+1-555-0411', address: '777 Junior Ct', city: 'Miami', state: 'FL', country: 'USA', zipCode: '33101',
      roleId: employeeRole.id,
      employee: {
        employeeCode: 'EMP015', departmentId: engineeringDept.id, designationId: juniorEngDesig.id,
        joiningDate: new Date('2024-01-15'), salary: 95000, dob: new Date('1998-04-20'),
        personalEmail: 'sneha.reddy.personal@email.com', bloodGroup: 'A+',
        emergencyContactPerson: 'Venkat Reddy', emergencyContactNumber: '+1-555-0412', status: EmployeeStatus.ACTIVE,
      },
    },
    {
      name: 'Rahul Tiwari', email: 'junior.engineer2@company.com',
      phone: '+1-555-0413', address: '888 New Grad Ln', city: 'Phoenix', state: 'AZ', country: 'USA', zipCode: '85001',
      roleId: employeeRole.id,
      employee: {
        employeeCode: 'EMP016', departmentId: engineeringDept.id, designationId: juniorEngDesig.id,
        joiningDate: new Date('2024-06-01'), salary: 92000, dob: new Date('1999-11-30'),
        personalEmail: 'rahul.tiwari.personal@email.com', bloodGroup: 'B-',
        emergencyContactPerson: 'Seema Tiwari', emergencyContactNumber: '+1-555-0414', status: EmployeeStatus.ACTIVE,
      },
    },
  ];

  for (const userData of testUsers) {
    const { employee: employeeData, roleId, ...userCreateData } = userData;

    const user = await prisma.user.upsert({
      where: { email: userCreateData.email },
      update: { ...userCreateData, password: hashedPassword, roleId },
      create: { ...userCreateData, password: hashedPassword, roleId },
    });

    if (employeeData) {
      await prisma.employee.upsert({
        where: { employeeCode: employeeData.employeeCode },
        update: { ...employeeData, userId: user.id },
        create: { ...employeeData, userId: user.id },
      });
    }

    console.log(`Created user: ${user.name} (${user.email})`);
  }

  console.log('\n=========================================');
  console.log('Seeding completed successfully!');
  console.log('=========================================');
  console.log('\nTest Credentials (password: Password123!)');
  console.log('\nAdmin:    admin@company.com | sysadmin@company.com');
  console.log('HR:       hr.manager@company.com | hr.specialist@company.com');
  console.log('Manager:  eng.manager@company.com | product.manager@company.com');
  console.log('          sales.manager@company.com | marketing.manager@company.com | support.manager@company.com');
  console.log('Employee: senior.engineer1@company.com | senior.engineer2@company.com');
  console.log('          engineer1@company.com | engineer2@company.com | engineer3@company.com');
  console.log('          junior.engineer1@company.com | junior.engineer2@company.com');
  console.log('=========================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
