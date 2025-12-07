import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from "passport-github2";
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from "passport-facebook";
import { storage } from "./storage";
import type { User, OAuthProvider } from "@shared/schema";
import type { Request, Response, NextFunction } from "express";
import {
  generateOAuthState,
  generateCodeVerifier,
  generateCodeChallenge,
  storeOAuthState,
  validateAndConsumeOAuthState,
  logAuthEvent,
  extractDeviceInfo,
  generateDeviceFingerprint,
  validateDeviceBinding,
  checkRateLimit,
  canUnlinkProvider,
  getProviderAvailability,
  regenerateSession,
} from "./auth-security";

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
  ipAddress?: string,
  deviceFingerprint?: string
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
    deviceFingerprint: deviceFingerprint || null,
    lastUsed: new Date(),
  });

  logAuthEvent({
    eventType: "remember_me_created",
    userId,
    ipAddress: ipAddress || "unknown",
    userAgent: userAgent || "unknown",
    deviceFingerprint: deviceFingerprint || "unknown",
    success: true,
  });

  return { series, token, cookieValue: formatPersistentLoginCookie(series, token) };
}

export interface ValidateRememberMeResult {
  valid: boolean;
  user?: User;
  newCookieValue?: string;
  theftDetected?: boolean;
  deviceMismatch?: boolean;
}

export async function validateAndRotateRememberMeToken(
  cookieValue: string,
  userAgent?: string,
  ipAddress?: string,
  deviceFingerprint?: string
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
    logAuthEvent({
      eventType: "remember_me_theft_detected",
      userId: persistentLogin.userId,
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      deviceFingerprint: deviceFingerprint || "unknown",
      success: false,
      metadata: {
        series,
        storedIp: persistentLogin.ipAddress,
        currentIp: ipAddress,
      },
    });
    
    await storage.deleteAllUserPersistentLogins(persistentLogin.userId);
    return { valid: false, theftDetected: true };
  }

  if (deviceFingerprint && persistentLogin.deviceFingerprint) {
    const isValidDevice = validateDeviceBinding(
      persistentLogin.deviceFingerprint,
      deviceFingerprint,
      false
    );
    
    if (!isValidDevice) {
      logAuthEvent({
        eventType: "remember_me_used",
        userId: persistentLogin.userId,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgent || "unknown",
        deviceFingerprint: deviceFingerprint || "unknown",
        success: false,
        metadata: { reason: "device_mismatch", series },
      });
      return { valid: false, deviceMismatch: true };
    }
  }

  const user = await storage.getUser(persistentLogin.userId);
  if (!user) {
    await storage.deletePersistentLogin(series);
    return { valid: false };
  }

  const newToken = generateSecureToken();
  const newTokenHash = hashToken(newToken);
  await storage.updatePersistentLoginToken(series, newTokenHash, new Date());

  logAuthEvent({
    eventType: "remember_me_used",
    userId: user.id,
    ipAddress: ipAddress || "unknown",
    userAgent: userAgent || "unknown",
    deviceFingerprint: deviceFingerprint || "unknown",
    success: true,
  });

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
  priority: "high" | "medium" | "low";
} {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: REMEMBER_ME_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
    priority: "high",
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
  // Prioritize APP_URL for production OAuth redirects (stable domain)
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  // Fallback to Replit domains for development if APP_URL not set
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  return "http://localhost:5000";
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
  req: Request,
  provider: OAuthProvider,
  profile: OAuthProfileInfo,
  accessToken: string,
  refreshToken: string | undefined,
  done: (error: any, user?: User | false, info?: object) => void
) {
  const deviceInfo = extractDeviceInfo(req);
  
  try {
    const linkToUserId = (req as any).oauthLinkUserId;
    
    if (linkToUserId) {
      const existingAccount = await storage.getOAuthAccount(provider, profile.id);
      if (existingAccount && existingAccount.userId !== linkToUserId) {
        logAuthEvent({
          eventType: "oauth_link",
          userId: linkToUserId,
          provider,
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          deviceFingerprint: deviceInfo.fingerprint,
          success: false,
          metadata: { reason: "already_linked_to_another_account" },
        });
        return done(null, false, { message: "This social account is already linked to another user" });
      }
      
      await storage.linkOAuthAccount(linkToUserId, {
        provider,
        providerUserId: profile.id,
        email: profile.email,
        profileName: profile.profileName,
        avatarUrl: profile.avatarUrl || null,
        accessTokenHash: hashAccessToken(accessToken),
        refreshTokenHash: refreshToken ? hashAccessToken(refreshToken) : null,
      });
      
      const user = await storage.getUser(linkToUserId);
      
      logAuthEvent({
        eventType: "oauth_link",
        userId: linkToUserId,
        provider,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
        success: true,
      });
      
      return done(null, user || false);
    }
    
    let user = await storage.findUserByOAuthProvider(provider, profile.id);

    if (user) {
      logAuthEvent({
        eventType: "oauth_login",
        userId: user.id,
        provider,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
        success: true,
      });
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
        
        logAuthEvent({
          eventType: "oauth_login",
          userId: existingUser.id,
          email: profile.email,
          provider,
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          deviceFingerprint: deviceInfo.fingerprint,
          success: true,
          metadata: { linkedExisting: true },
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

    logAuthEvent({
      eventType: "oauth_login",
      userId: user.id,
      email: profile.email || undefined,
      provider,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      deviceFingerprint: deviceInfo.fingerprint,
      success: true,
      metadata: { newUser: true },
    });

    return done(null, user);
  } catch (error) {
    console.error(`OAuth ${provider} error:`, error);
    
    logAuthEvent({
      eventType: "oauth_login",
      provider,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      deviceFingerprint: deviceInfo.fingerprint,
      success: false,
      metadata: { error: String(error) },
    });
    
    return done(error);
  }
}

export function initializeOAuthStrategies() {
  const baseUrl = getBaseUrl();
  console.log(`OAuth base URL: ${baseUrl}`);

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${baseUrl}/api/auth/callback/google`,
          scope: ["profile", "email"],
          passReqToCallback: true,
        },
        async (req: Request, accessToken: string, refreshToken: string, profile: GoogleProfile, done: any) => {
          const info = extractProfileInfo("google", profile);
          await handleOAuthCallback(req, "google", info, accessToken, refreshToken, done);
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
          callbackURL: `${baseUrl}/api/auth/callback/github`,
          scope: ["user:email"],
          passReqToCallback: true,
        },
        async (req: Request, accessToken: string, refreshToken: string, profile: GitHubProfile, done: any) => {
          const info = extractProfileInfo("github", profile);
          await handleOAuthCallback(req, "github", info, accessToken, refreshToken, done);
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
          callbackURL: `${baseUrl}/api/auth/callback/facebook`,
          profileFields: ["id", "emails", "name", "displayName", "photos"],
          passReqToCallback: true,
        },
        async (req: Request, accessToken: string, refreshToken: string, profile: FacebookProfile, done: any) => {
          const info = extractProfileInfo("facebook", profile);
          await handleOAuthCallback(req, "facebook", info, accessToken, refreshToken, done);
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
    const deviceInfo = extractDeviceInfo(req);

    try {
      const result = await validateAndRotateRememberMeToken(
        cookieValue,
        deviceInfo.userAgent,
        deviceInfo.ipAddress,
        deviceInfo.fingerprint
      );

      if (result.theftDetected) {
        console.warn(`Token theft detected for cookie, clearing all tokens`);
        res.clearCookie(REMEMBER_ME_COOKIE, getClearCookieOptions(isSecure));
        return next();
      }

      if (result.deviceMismatch) {
        console.warn(`Device mismatch for remember-me token`);
        res.clearCookie(REMEMBER_ME_COOKIE, getClearCookieOptions(isSecure));
        return next();
      }

      if (result.valid && result.user && result.newCookieValue) {
        res.cookie(REMEMBER_ME_COOKIE, result.newCookieValue, getRememberMeCookieOptions(isSecure));
        
        await regenerateSession(req).catch(() => {});
        
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
      const deviceInfo = extractDeviceInfo(req);

      const { cookieValue } = await createRememberMeToken(
        userId,
        deviceInfo.userAgent,
        deviceInfo.ipAddress,
        deviceInfo.fingerprint
      );
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
  const userId = (req.user as User)?.id;

  if (cookieValue) {
    await clearRememberMeToken(cookieValue);
    res.clearCookie(REMEMBER_ME_COOKIE, getClearCookieOptions(isSecure));
  }

  if (userId) {
    const deviceInfo = extractDeviceInfo(req);
    logAuthEvent({
      eventType: "logout",
      userId,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      deviceFingerprint: deviceInfo.fingerprint,
      success: true,
    });
  }
}

export function oauthRateLimitMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || "unknown";
    const result = checkRateLimit(identifier, "oauth");
    
    if (!result.allowed) {
      logAuthEvent({
        eventType: "rate_limit_exceeded",
        ipAddress: identifier,
        userAgent: req.get("User-Agent") || "unknown",
        deviceFingerprint: generateDeviceFingerprint(req),
        success: false,
        metadata: { action: "oauth", retryAfterMs: result.retryAfterMs },
      });
      
      return res.status(429).json({
        message: "Too many authentication attempts. Please try again later.",
        retryAfterMs: result.retryAfterMs,
      });
    }
    
    next();
  };
}

export function initiateOAuthFlow(provider: string, linkToUserId?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const state = generateOAuthState();
      const codeVerifier = provider === "google" ? generateCodeVerifier() : undefined;
      
      await storeOAuthState(state, provider, {
        codeVerifier,
        returnTo: req.query.returnTo as string | undefined,
        linkToUserId,
      });

      (req as any).oauthState = state;
      (req as any).oauthCodeVerifier = codeVerifier;
      
      const authenticateOptions: any = { 
        state,
        session: false,
      };
      
      if (codeVerifier && provider === "google") {
        authenticateOptions.codeChallenge = generateCodeChallenge(codeVerifier);
        authenticateOptions.codeChallengeMethod = "S256";
      }

      passport.authenticate(provider, authenticateOptions)(req, res, next);
    } catch (error) {
      console.error(`Failed to initiate OAuth flow for ${provider}:`, error);
      return res.redirect("/login?error=oauth_error");
    }
  };
}

export function handleOAuthCallbackFlow(provider: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const state = req.query.state as string;
    
    if (!state) {
      console.warn(`OAuth ${provider} callback missing state parameter`);
      return res.redirect("/login?error=invalid_state");
    }
    
    const stateResult = await validateAndConsumeOAuthState(state);
    
    if (!stateResult.valid) {
      console.warn(`OAuth ${provider} callback with invalid/expired state`);
      return res.redirect("/login?error=invalid_state");
    }

    if (stateResult.linkToUserId) {
      (req as any).oauthLinkUserId = stateResult.linkToUserId;
    }

    passport.authenticate(provider, { session: false }, async (err: any, user: User | false, info: any) => {
      const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
      
      if (err) {
        console.error(`OAuth ${provider} authentication error:`, err);
        return res.redirect("/login?error=oauth_error");
      }

      if (!user) {
        const message = info?.message || "authentication_failed";
        return res.redirect(`/login?error=${encodeURIComponent(message)}`);
      }

      try {
        await regenerateSession(req);
      } catch (e) {
        console.error("Session regeneration failed:", e);
      }

      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error(`OAuth ${provider} login error:`, loginErr);
          return res.redirect("/login?error=login_error");
        }

        try {
          const deviceInfo = extractDeviceInfo(req);
          const { cookieValue } = await createRememberMeToken(
            user.id,
            deviceInfo.userAgent,
            deviceInfo.ipAddress,
            deviceInfo.fingerprint
          );
          res.cookie(REMEMBER_ME_COOKIE, cookieValue, getRememberMeCookieOptions(isSecure));
        } catch (e) {
          console.error("Failed to create remember-me token:", e);
        }

        const returnTo = stateResult.returnTo || "/";
        res.redirect(returnTo);
      });
    })(req, res, next);
  };
}

export {
  REMEMBER_ME_COOKIE,
  canUnlinkProvider,
  getProviderAvailability,
  extractDeviceInfo,
  logAuthEvent,
  checkRateLimit,
  regenerateSession,
};
