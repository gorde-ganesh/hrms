import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES } from '../utils/response-codes';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const JWT_SECRET = process.env.JWT_KEY as string;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export class AuthService {
  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRole: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user) {
      throw new HttpError(400, 'Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new HttpError(
        403,
        `Account locked. Try again in ${minutesLeft} minute(s).`,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    const employee = await prisma.employee.findFirst({ where: { userId: user.id } });
    if (!employee) {
      throw new HttpError(400, 'Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (employee.status === 'TERMINATED' || employee.status === 'INACTIVE') {
      throw new HttpError(
        403,
        `Account is ${employee.status.toLowerCase()}. Please contact HR.`,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
        },
      });
      const remaining = MAX_FAILED_ATTEMPTS - attempts;
      const msg = shouldLock
        ? 'Account locked for 30 minutes due to too many failed attempts.'
        : `Invalid credentials. ${remaining} attempt(s) remaining.`;
      throw new HttpError(400, msg, ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Successful login — reset lockout counters
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.userRole?.name, employeeId: employee.id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: this.hashToken(rawRefreshToken),
        refreshTokenExp: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    const permissions = user.userRole.permissions.reduce((acc: any, rp) => {
      const { resource, action } = rp.permission;
      if (!acc[resource]) acc[resource] = [];
      acc[resource].push(action);
      return acc;
    }, {});

    return {
      accessToken,
      rawRefreshToken,
      userDetails: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.userRole.name,
        roleId: user.roleId,
        employeeId: employee.id,
        permissions,
      },
    };
  }

  async refresh(rawRefreshToken: string) {
    const hashed = this.hashToken(rawRefreshToken);
    const user = await prisma.user.findFirst({
      where: { refreshToken: hashed, refreshTokenExp: { gte: new Date() } },
      include: { userRole: true },
    });
    if (!user) {
      throw new HttpError(401, 'Invalid or expired refresh token', ERROR_CODES.UNAUTHORIZED);
    }

    const employee = await prisma.employee.findFirst({ where: { userId: user.id } });

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.userRole?.name, employeeId: employee?.id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const newRaw = crypto.randomBytes(40).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: this.hashToken(newRaw),
        refreshTokenExp: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { newAccessToken, newRawRefreshToken: newRaw };
  }

  async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null, refreshTokenExp: null },
    });
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRole: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (!user) throw new HttpError(404, 'User not found', ERROR_CODES.USER_NOT_FOUND);

    const employee = await prisma.employee.findFirst({ where: { userId: user.id } });

    const permissions = user.userRole.permissions.reduce((acc: any, rp) => {
      const { resource, action } = rp.permission;
      if (!acc[resource]) acc[resource] = [];
      acc[resource].push(action);
      return acc;
    }, {});

    return {
      id: user.id, name: user.name, email: user.email,
      role: user.userRole.name, roleId: user.roleId,
      employeeId: employee?.id, permissions,
    };
  }

  async changePassword(opts: { token?: string; userId?: string; oldPassword?: string; newPassword: string }) {
    const { token, userId, oldPassword, newPassword } = opts;
    let user: any;

    if (token) {
      user = await prisma.user.findFirst({
        where: { resetToken: token, resetTokenExp: { gte: new Date() } },
      });
      if (!user) throw new HttpError(400, 'Invalid or expired token', ERROR_CODES.VALIDATION_ERROR);
    } else if (userId && oldPassword) {
      user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new HttpError(404, 'User not found', ERROR_CODES.USER_NOT_FOUND);
      const valid = await bcrypt.compare(oldPassword, user.password);
      if (!valid) throw new HttpError(400, 'Old password is incorrect', ERROR_CODES.VALIDATION_ERROR);
    } else {
      throw new HttpError(400, 'Provide token or old password with userId', ERROR_CODES.VALIDATION_ERROR);
    }

    const same = await bcrypt.compare(newPassword, user.password);
    if (same) throw new HttpError(400, 'New password cannot be same as old password', ERROR_CODES.VALIDATION_ERROR);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        // Invalidate all active sessions so stolen tokens stop working
        refreshToken: null,
        refreshTokenExp: null,
        resetToken: null,
        resetTokenExp: null,
      },
    });
  }
}

export const authService = new AuthService();
