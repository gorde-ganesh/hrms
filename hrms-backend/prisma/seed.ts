import { PrismaClient } from '../generated/prisma';

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
    roles: ['view', 'add', 'edit', 'delete'], // New permission for Admin
    users: ['view', 'edit'], // New permission for Admin
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

  // Collect all unique permissions
  for (const role in rolePermissions) {
    const resources = rolePermissions[role];
    for (const resource in resources) {
      const actions = resources[resource];
      for (const action of actions) {
        allPermissions.add(`${resource}:${action}`);
      }
    }
  }

  console.log(`Found ${allPermissions.size} unique permissions.`);

  for (const permString of allPermissions) {
    const [resource, action] = permString.split(':');
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource,
          action,
        },
      },
      update: {},
      create: {
        resource,
        action,
        description: `Can ${action} ${resource}`,
      },
    });
  }

  // 2. Create Roles and Assign Permissions
  for (const roleName in rolePermissions) {
    console.log(`Processing role: ${roleName}`);

    const role = await prisma.userRole.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `Default ${roleName} role`,
        isSystem: true,
      },
    });

    const resources = rolePermissions[roleName];
    for (const resource in resources) {
      const actions = resources[resource];
      for (const action of actions) {
        const permission = await prisma.permission.findUnique({
          where: {
            resource_action: {
              resource,
              action,
            },
          },
        });

        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
      }
    }
  }

  // 3. Migrate Existing Users (Optional but recommended)
  // This part attempts to link existing users to the new UserRole based on their enum Role
  const users = await prisma.user.findMany({
    where: { roleId: null },
  });

  console.log(`Found ${users.length} users to migrate.`);

  for (const user of users) {
    if (user.role) {
      const role = await prisma.userRole.findUnique({
        where: { name: user.role.toString() },
      });

      if (role) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: role.id },
        });
      }
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
