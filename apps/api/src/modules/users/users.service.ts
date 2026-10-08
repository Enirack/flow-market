import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AdminListUsersDto } from './dto/admin-list-users.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { profile: true, provider: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.client.profile.update({
      where: { userId },
      data: dto,
    });
  }

  async adminList(dto: AdminListUsersDto) {
    const where = {
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.status ? { status: dto.status } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.client.user.count({ where }),
    ]);

    return {
      users: users.map(({ passwordHash: _passwordHash, ...user }) => user),
      total,
      page: dto.page,
      totalPages: Math.max(1, Math.ceil(total / dto.limit)),
    };
  }

  async adminSuspend(userId: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') throw new BadRequestException('An admin account cannot be suspended');

    return this.prisma.client.$transaction([
      this.prisma.client.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } }),
      this.prisma.client.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async adminReactivate(userId: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.client.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), status: 'DELETED' },
      }),
      this.prisma.client.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
