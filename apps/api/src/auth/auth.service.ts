import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
};

export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
};

const EXPIRES_IN_SECONDS = 60 * 60 * 8;

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(account?: string, password?: string): Promise<LoginResponse> {
    const user = await this.prismaService.user.findUnique({
      where: {
        username: account ?? ""
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("账号或密码错误");
    }

    const passwordMatched = await bcrypt.compare(password ?? "", user.passwordHash);

    if (!passwordMatched) {
      throw new UnauthorizedException("账号或密码错误");
    }

    const authUser = this.toAuthUser(user);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username
    });

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: EXPIRES_IN_SECONDS,
      user: authUser
    };
  }

  async getCurrentUser(authorization?: string): Promise<AuthUser> {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      throw new UnauthorizedException("登录已失效，请重新登录");
    }

    const payload = await this.jwtService.verifyAsync<{ sub?: string }>(token).catch(() => {
      throw new UnauthorizedException("登录已失效，请重新登录");
    });

    if (!payload?.sub) {
      throw new UnauthorizedException("登录已失效，请重新登录");
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        id: payload.sub
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("登录已失效，请重新登录");
    }

    return this.toAuthUser(user);
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles
        .split(",")
        .map((role: string) => role.trim())
        .filter(Boolean)
    };
  }
}
