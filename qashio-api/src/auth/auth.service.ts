import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RefreshSession } from './entities/refresh-session.entity';

/** Registers users, issues JWT access tokens, and manages refresh sessions (httpOnly cookie + DB hash). */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshSession)
    private readonly refreshRepository: Repository<RefreshSession>,
  ) {}

  /** Creates a new user after validating email uniqueness; hashes password and opens a session (refresh cookie + access token). */
  async register(
    name: string,
    email: string,
    password: string,
    res: Response,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({ name, email, passwordHash });
    return this.issueSessionAndTokens(user.id, user.email, user.name, res);
  }

  /** Validates credentials and issues a new session (refresh cookie + access token) for an existing user. */
  async login(
    email: string,
    password: string,
    res: Response,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueSessionAndTokens(user.id, user.email, user.name, res);
  }

  /** Reads the refresh token from the cookie, verifies it against the DB, rotates it, sets a new cookie, and returns a fresh access token. */
  async refresh(
    req: Request,
    res: Response,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const rawRefreshToken = req.cookies?.[this.cookieName()] as
      | string
      | undefined;
    if (!rawRefreshToken?.length) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const session = await this.refreshRepository.findOne({
      where: { tokenHash },
    });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) {
      await this.refreshRepository.delete({ id: session.id });
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newRaw = randomBytes(32).toString('base64url');
    const newHash = this.hashRefreshToken(newRaw);
    const refreshTtlMs = this.refreshTtlMs();
    session.tokenHash = newHash;
    session.expiresAt = new Date(Date.now() + refreshTtlMs);
    await this.refreshRepository.save(session);
    this.setRefreshCookie(res, newRaw, refreshTtlMs);

    return this.signAccessTokens(user.id, user.email, user.name);
  }

  /** Deletes the user’s refresh session row and clears the refresh cookie so the browser cannot refresh further. */
  async logout(userId: string, res: Response): Promise<void> {
    await this.refreshRepository.delete({ userId });
    this.clearRefreshCookie(res);
  }

  /** Returns public profile fields for the authenticated user (no password hash). */
  async getMe(userId: string): Promise<{ id: string; name: string; email: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} was not found`);
    }
    return { id: user.id, name: user.name, email: user.email };
  }

  /** Persists a new refresh token (hashed), sets the httpOnly cookie with the raw value, and returns the signed access JWT + expiry seconds. */
  private async issueSessionAndTokens(
    userId: string,
    email: string,
    name: string,
    res: Response,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const rawRefresh = randomBytes(32).toString('base64url');
    const tokenHash = this.hashRefreshToken(rawRefresh);
    const refreshTtlMs = this.refreshTtlMs();
    const expiresAt = new Date(Date.now() + refreshTtlMs);

    await this.upsertRefreshSession(userId, tokenHash, expiresAt);

    this.setRefreshCookie(res, rawRefresh, refreshTtlMs);
    return this.signAccessTokens(userId, email, name);
  }

  /** Ensures a single refresh session per user: inserts or updates the hashed token and expiry (unique on `userId`). */
  private async upsertRefreshSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    let row = await this.refreshRepository.findOne({ where: { userId } });
    if (!row) {
      row = this.refreshRepository.create({
        userId,
        tokenHash,
        expiresAt,
      });
    } else {
      row.tokenHash = tokenHash;
      row.expiresAt = expiresAt;
    }
    await this.refreshRepository.save(row);
  }

  /** Produces a fixed-length hex digest of the raw refresh string for storage (never store the raw token in the DB). */
  private hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /** Converts `JWT_REFRESH_EXPIRES_SEC` to milliseconds for cookie `maxAge` and session `expiresAt`. */
  private refreshTtlMs(): number {
    const sec = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_SEC') ?? '1000000',
      10,
    );
    if (Number.isNaN(sec) || sec <= 0) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    return sec * 1000;
  }

  /** Name of the httpOnly refresh cookie (`AUTH_REFRESH_COOKIE_NAME` or default `refreshToken`). */
  private cookieName(): string {
    return (
      this.configService.get<string>('AUTH_REFRESH_COOKIE_NAME') ??
      'refreshToken'
    );
  }

  /** Writes `Set-Cookie` for the raw refresh token using configured secure/same-site attributes. */
  private setRefreshCookie(
    res: Response,
    rawToken: string,
    maxAgeMs: number,
  ): void {
    const secure =
      this.configService.get<string>('COOKIE_SECURE') === 'true' ||
      this.configService.get<string>('NODE_ENV') === 'production';
    const sameSite =
      (this.configService.get<string>('COOKIE_SAMESITE') as 'lax' | 'strict' | 'none') ??
      'lax';

    res.cookie(this.cookieName(), rawToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: maxAgeMs,
    });
  }

  /** Expires the refresh cookie in the browser (logout or failed refresh). */
  private clearRefreshCookie(res: Response): void {
    const secure =
      this.configService.get<string>('COOKIE_SECURE') === 'true' ||
      this.configService.get<string>('NODE_ENV') === 'production';
    const sameSite =
      (this.configService.get<string>('COOKIE_SAMESITE') as 'lax' | 'strict' | 'none') ??
      'lax';
    res.clearCookie(this.cookieName(), {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
    });
  }

  /** Signs a short-lived JWT with `sub`, `email`, and `name`, and returns the token plus lifetime in seconds for the client. */
  private async signAccessTokens(
    userId: string,
    email: string,
    name: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const expiresIn = this.accessExpiresSeconds();
    const accessToken = await this.jwtService.signAsync({
      sub: userId,
      email,
      name,
    });
    return { accessToken, expiresIn };
  }

  /** Parses `JWT_ACCESS_EXPIRES` (e.g. `15m`, `1h`, `7d`, or raw seconds) into seconds for API responses. */
  private accessExpiresSeconds(): number {
    const raw = this.configService.get<string>('JWT_ACCESS_EXPIRES') ?? '15m';
    const m = /^(\d+)\s*m$/i.exec(raw.trim());
    if (m) {
      return parseInt(m[1], 10) * 60;
    }
    const h = /^(\d+)\s*h$/i.exec(raw.trim());
    if (h) {
      return parseInt(h[1], 10) * 3600;
    }
    const d = /^(\d+)\s*d$/i.exec(raw.trim());
    if (d) {
      return parseInt(d[1], 10) * 86400;
    }
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? 900 : n;
  }
}
