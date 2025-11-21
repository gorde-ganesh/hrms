import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';

const prisma = new PrismaClient();

// Get all roles
export const getRoles = async (req: Request, res: Response) => {
  const roles = await prisma.userRole.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: { users: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform response to flatten permissions
  const formattedRoles = roles.map((role) => ({
    ...role,
    permissions: role.permissions.map((rp) => rp.permission),
    userCount: role._count.users,
  }));

  return successResponse(
    res,
    formattedRoles,
    'Roles fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// Get role by ID
export const getRoleById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const role = await prisma.userRole.findUnique({
    where: { id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!role) {
    throw new HttpError(404, 'Role not found', ERROR_CODES.NOT_FOUND);
  }

  const formattedRole = {
    ...role,
    permissions: role.permissions.map((rp) => rp.permission),
  };

  return successResponse(
    res,
    formattedRole,
    'Role fetched successfully',
    SUCCESS_CODES.SUCCESS,
    200
  );
};

// Create new role
export const createRole = async (req: Request, res: Response) => {
  const { name, description, permissionIds } = req.body;

  if (!name) {
    throw new HttpError(
      400,
      'Role name is required',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const existingRole = await prisma.userRole.findUnique({
    where: { name },
  });

  if (existingRole) {
    throw new HttpError(
      400,
      'Role with this name already exists',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const role = await prisma.$transaction(async (tx) => {
    const newRole = await tx.userRole.create({
      data: {
        name,
        description,
      },
    });

    if (permissionIds && Array.isArray(permissionIds)) {
      for (const permId of permissionIds) {
        await tx.rolePermission.create({
          data: {
            roleId: newRole.id,
            permissionId: permId,
          },
        });
      }
    }

    return newRole;
  });

  return successResponse(
    res,
    role,
    'Role created successfully',
    SUCCESS_CODES.ROLE_CREATED,
    201
  );
};

// Update role
export const updateRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, permissionIds } = req.body;

  const role = await prisma.userRole.findUnique({ where: { id } });

  if (!role) {
    throw new HttpError(404, 'Role not found', ERROR_CODES.NOT_FOUND);
  }

  if (role.isSystem) {
    // Optional: Prevent renaming system roles, but allow updating permissions
    // throw new HttpError(403, 'Cannot modify system roles', ERROR_CODES.FORBIDDEN);
  }

  const updatedRole = await prisma.$transaction(async (tx) => {
    const updated = await tx.userRole.update({
      where: { id },
      data: {
        name,
        description,
      },
    });

    if (permissionIds && Array.isArray(permissionIds)) {
      // Delete existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Add new permissions
      for (const permId of permissionIds) {
        await tx.rolePermission.create({
          data: {
            roleId: id,
            permissionId: permId,
          },
        });
      }
    }

    return updated;
  });

  return successResponse(
    res,
    updatedRole,
    'Role updated successfully',
    SUCCESS_CODES.ROLE_UPDATED,
    200
  );
};

// Delete role
export const deleteRole = async (req: Request, res: Response) => {
  const { id } = req.params;

  const role = await prisma.userRole.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  if (!role) {
    throw new HttpError(404, 'Role not found', ERROR_CODES.NOT_FOUND);
  }

  if (role.isSystem) {
    throw new HttpError(
      403,
      'Cannot delete system roles',
      ERROR_CODES.FORBIDDEN
    );
  }

  if (role._count.users > 0) {
    throw new HttpError(
      400,
      'Cannot delete role assigned to users',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  await prisma.userRole.delete({ where: { id } });

  return successResponse(
    res,
    null,
    'Role deleted successfully',
    SUCCESS_CODES.ROLE_DELETED,
    200
  );
};
