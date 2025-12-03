import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from "passport-github2";
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from "passport-facebook";
import { storage } from "./storage";
import type { User, OAuthProvider } from "@shared/schema";
import type { Request, Response, NextFunction } from "express";

const REMEMBER_ME_COOKIE = "remember_me";
const REMEMBER_ME_EXPIRY_DAYS = 30;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export interface PersistentLoginToken {
  series: string;
  token: string;
}

export function parsePersistentLoginCookie(cookieValue: string): PersistentLoginToken | null {
  try {
    const parts = cookieValue.split(":");
    if (parts.length !== 2) return null;
    return { series: parts[0], token: parts[1] };
  } catch {
    return null;
  }
}

export function formatPersistentLoginCookie(series: string, token: string): string {
  return `${series}:${token}`;
}

export async function createRememberMeToken(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ series: string; token: string; cookieValue: string }> {
  const series = generateSecureToken();
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REMEMBER_ME_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await storage.createPersistentLogin({
    userId,
    series,
    tokenHash,
    expiresAt,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
    lastUsed: new Date(),
  });

  return { series, token, cookieValue: formatPersistentLoginCookie(series, token) };
}

export interface ValidateRememberMeResult {
  valid: boolean;
  user?: User;
  newCookieValue?: string;
  theftDetected?: boolean;
}

export async function validateAndRotateRememberMeToken(
  cookieValue: string,
  userAgent?: string,
  ipAddress?: string
): Promise<ValidateRememberMeResult> {
  const parsed = parsePersistentLoginCookie(cookieValue);
  if (!parsed) {
    return { valid: false };
  }

  const { series, token } = parsed;
  const persistentLogin = await storage.getPersistentLogin(series);

  if (!persistentLogin) {
    return { valid: false };
  }

  if (new Date() > persistentLogin.expiresAt) {
    await storage.deletePersistentLogin(series);
    return { valid: false };
  }

  const tokenHash = hashToken(token);
  if (tokenHash !== persistentLogin.tokenHash) {
    await storage.deleteAllUserPersistentLogins(persistentLogin.userId);
    return { valid: false, theftDetected: true };
  }

  const user = await storage.getUser(persistentLogin.userId);
  if (!user) {
    await storage.deletePersistentLogin(series);
    return { valid: false };
  }

  const newToken = generateSecureToken();
  const newTokenHash = hashToken(newToken);
  await storage.updatePersistentLoginToken(series, newTokenHash, new Date());

  return {
    valid: true,
    user,
    newCookieValue: formatPersistentLoginCookie(series, newToken),
  };
}

export async function clearRememberMeToken(cookieValue: string): Promise<void> {
  const parsed = parsePersistentLoginCookie(cookieValue);
  if (parsed) {
    await storage.deletePersistentLogin(parsed.series);
  }
}

export function getRememberMeCookieOptions(
  secure: boolean
): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: REMEMBER_ME_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function getClearCookieOptions(secure: boolean): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
} {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  };
}

function getBaseUrl(): string {
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  return process.env.APP_URL || "http://localhost:5000";
}

type OAuthProfileInfo = {
  id: string;
  email: string | null;
  profileName: string;
  avatarUrl?: string;
};

function extractProfileInfo(
  provider: OAuthProvider,
  profile: GoogleProfile | GitHubProfile | FacebookProfile
): OAuthProfileInfo {
  let email: string | null = null;
  let avatarUrl: string | undefined;

  if (profile.emails && profile.emails.length > 0) {
    email = profile.emails[0].value;
  }

  if (profile.photos && profile.photos.length > 0) {
    avatarUrl = profile.photos[0].value;
  }

  const profileName = profile.displayName || (profile as any).username || `User${profile.id.slice(0, 6)}`;

  return {
    id: profile.id,
    email,
    profileName,
    avatarUrl,
  };
}

function hashAccessToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function handleOAuthCallback(
  provider: OAuthProvider,
  profile: OAuthProfileInfo,
  accessToken: string,
  refreshToken: string | undefined,
  done: (error: any, user?: User | false, info?: object) => void
) {
  try {
    let user = await storage.findUserByOAuthProvider(provider, profile.id);

    if (user) {
      return done(null, user);
    }

    if (profile.email) {
      const existingUser = await storage.getUserByEmail(profile.email);
      if (existingUser) {
        await storage.linkOAuthAccount(existingUser.id, {
          provider,
          providerUserId: profile.id,
          email: profile.email,
          profileName: profile.profileName,
          avatarUrl: profile.avatarUrl || null,
          accessTokenHash: hashAccessToken(accessToken),
          refreshTokenHash: refreshToken ? hashAccessToken(refreshToken) : null,
        });
        return done(null, existingUser);
      }
    }

    let username = profile.profileName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (username.length < 3) {
      username = `user${profile.id.slice(0, 8)}`;
    }

    let usernameAttempt = username;
    let attempt = 0;
    while (await storage.getUserByUsername(usernameAttempt)) {
      attempt++;
      usernameAttempt = `${username}${attempt}`;
    }

    const avatarColors = [
      "#E53E3E", "#DD6B20", "#D69E2E", "#38A169", "#319795",
      "#3182CE", "#5A67D8", "#805AD5", "#D53F8C", "#718096",
    ];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const userEmail = profile.email || `oauth.${provider}.${profile.id}@placeholder.typemasterai.local`;

    user = await storage.createUser({
      username: usernameAttempt,
      email: userEmail,
      password: null,
      emailVerified: !!profile.email,
      avatarColor,
    });

    await storage.linkOAuthAccount(user.id, {
      provider,
      providerUserId: profile.id,
      email: profile.email,
      profileName: profile.profileName,
      avatarUrl: profile.avatarUrl || null,
      accessTokenHash: hashAccessToken(accessToken),
      refreshTokenHash: refreshToken ? hashAccessToken(refreshToken) : null,
    });

    return done(null, user);
  } catch (error) {
    console.error(`OAuth ${provider} error:`, error);
    return done(error);
  }
}

export function initializeOAuthStrategies() {
  const baseUrl = getBaseUrl();

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${baseUrl}/api/auth/google/callback`,
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          const info = extractProfileInfo("google", profile);
          await handleOAuthCallback("google", info, accessToken, refreshToken, done);
        }
      )
    );
    console.log("Google OAuth strategy initialized");
  } else {
    console.log("Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)");
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: `${baseUrl}/api/auth/github/callback`,
          scope: ["user:email"],
        },
        async (accessToken: string, refreshToken: string, profile: GitHubProfile, done: any) => {
          const info = extractProfileInfo("github", profile);
          await handleOAuthCallback("github", info, accessToken, refreshToken, done);
        }
      )
    );
    console.log("GitHub OAuth strategy initialized");
  } else {
    console.log("GitHub OAuth not configured (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET)");
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: `${baseUrl}/api/auth/facebook/callback`,
          profileFields: ["id", "emails", "name", "displayName", "photos"],
        },
        async (accessToken: string, refreshToken: string, profile: FacebookProfile, done: any) => {
          const info = extractProfileInfo("facebook", profile);
          await handleOAuthCallback("facebook", info, accessToken, refreshToken, done);
        }
      )
    );
    console.log("Facebook OAuth strategy initialized");
  } else {
    console.log("Facebook OAuth not configured (missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET)");
  }
}

export function rememberMeMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated?.() || !req.cookies?.[REMEMBER_ME_COOKIE]) {
      return next();
    }

    const cookieValue = req.cookies[REMEMBER_ME_COOKIE];
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    const userAgent = req.get("User-Agent");
    const ipAddress = req.ip;

    try {
      const result = await validateAndRotateRememberMeToken(cookieValue, userAgent, ipAddress);

      if (result.theftDetected) {
        console.warn(`Token theft detected for cookie, clearing all tokens`);
        res.clearCookie(REMEMBER_ME_COOKIE, getClearCookieOptions(isSecure));
        return next();
      }

      if (result.valid && result.user && result.newCookieValue) {
        res.cookie(REMEMBER_ME_COOKIE, result.newCookieValue, getRememberMeCookieOptions(isSecure));
        req.login(result.user, (err) => {
          if (err) {
            console.error("Remember-me auto-login failed:", err);
          }
          next();
        });
      } else {
        res.clearCookie(REMEMBER_ME_COOKIE, getClearCookieOptions(isSecure));
        next();
      }
    } catch (error) {
      console.error("Remember-me middleware error:", error);
      res.clearCookie(REMEMBER_ME_COOKIE, getClearCookieOptions(isSecure));
      next();
    }
  };
}

export function setupRememberMeOnLogin(req: Request, res: Response, userId: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
      const userAgent = req.get("User-Agent");
      const ipAddress = req.ip;

      const { cookieValue } = await createRememberMeToken(userId, userAgent, ipAddress);
      res.cookie(REMEMBER_ME_COOKIE, cookieValue, getRememberMeCookieOptions(isSecure));
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export async function clearRememberMeOnLogout(req: Request, res: Response): Promise<void> {
  const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
  const cookieValue = req.cookies?.[REMEMBER_ME_COOKIE];

  if (cookieValue) {
    await clearRememberMeToken(cookieValue);
    res.clearCookie(REMEMBER_ME_COOKIE, getClearCookieOptions(isSecure));
  }
}

export { REMEMBER_ME_COOKIE };
