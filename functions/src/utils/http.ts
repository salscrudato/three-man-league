/**
 * HTTP Utilities for Cloud Functions
 *
 * Shared utilities for CORS handling, authentication verification, and request validation.
 */

import type { Request, Response } from "express";
import * as admin from "firebase-admin";

// ============================================================================
// CORS Configuration
// ============================================================================

/**
 * Default allowed origins for CORS
 * Can be overridden via ALLOWED_ORIGINS environment variable (comma-separated)
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://three-man-league.web.app",
  "https://three-man-league.firebaseapp.com",
  // Allow localhost for development
  "http://localhost:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5000",
];

/**
 * Get allowed origins from environment or defaults
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

const ALLOWED_ORIGINS = getAllowedOrigins();

/**
 * Set CORS headers for cross-origin requests
 *
 * In production, restricts to allowed origins.
 * Allows localhost for development convenience.
 *
 * Note: The origin parameter is optional. If not provided, defaults to production domain.
 * For proper CORS handling, pass req.headers.origin when available.
 */
export function setCors(res: Response, origin?: string): void {
  let allowedOrigin: string;

  if (origin) {
    // Check if origin is in allowed list or is a localhost origin
    if (ALLOWED_ORIGINS.includes(origin)) {
      allowedOrigin = origin;
    } else if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      // Allow localhost for development
      allowedOrigin = origin;
    } else {
      // Unknown origin - use production domain
      allowedOrigin = ALLOWED_ORIGINS[0];
    }
  } else {
    // No origin header - use production domain
    allowedOrigin = ALLOWED_ORIGINS[0];
  }

  res.set("Access-Control-Allow-Origin", allowedOrigin);
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");
}

/**
 * Verify Firebase Auth token and return userId
 * 
 * @param authHeader - The Authorization header value (e.g., "Bearer <token>")
 * @returns The user ID if valid, null otherwise
 */
export async function verifyAuth(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * Handle OPTIONS preflight request
 * 
 * @returns true if this was a preflight request (caller should return early)
 */
export function handlePreflight(method: string, res: Response): boolean {
  if (method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

/**
 * Send a standardized error response
 */
export function sendError(res: Response, status: number, message: string): void {
  res.status(status).send({ error: message });
}

/**
 * Send a standardized success response
 */
export function sendSuccess<T>(res: Response, data: T): void {
  res.status(200).send(data);
}

/**
 * Verify admin API key for protected admin endpoints
 *
 * Admin endpoints should include an X-Admin-Key header with the admin key.
 * The admin key is set via the ADMIN_API_KEY environment variable.
 *
 * @returns true if the admin key is valid, false otherwise
 */
export function verifyAdminKey(adminKeyHeader: string | undefined): boolean {
  const expectedKey = process.env.ADMIN_API_KEY;

  // If no admin key is configured, allow access (for development)
  if (!expectedKey) {
    console.warn("ADMIN_API_KEY not configured - admin endpoints are unprotected");
    return true;
  }

  return adminKeyHeader === expectedKey;
}

// ============================================================================
// Request Handling Helpers
// ============================================================================

/**
 * Result of requireAuth - either contains userId or has already sent error response
 */
export type AuthResult =
  | { authenticated: true; userId: string }
  | { authenticated: false };

/**
 * Require authentication for an endpoint.
 * Sends 401 error response if not authenticated.
 *
 * @example
 * const auth = await requireAuth(req, res);
 * if (!auth.authenticated) return;
 * const userId = auth.userId;
 */
export async function requireAuth(req: Request, res: Response): Promise<AuthResult> {
  const userId = await verifyAuth(req.headers.authorization);
  if (!userId) {
    sendError(res, 401, "Authentication required");
    return { authenticated: false };
  }
  return { authenticated: true, userId };
}

/**
 * Result of requireAdmin - either contains userId or has already sent error response
 */
export type AdminResult =
  | { authorized: true }
  | { authorized: false };

/**
 * Require admin API key for an endpoint.
 * Sends 403 error response if not authorized.
 *
 * @example
 * const admin = requireAdmin(req, res);
 * if (!admin.authorized) return;
 */
export function requireAdmin(req: Request, res: Response): AdminResult {
  if (!verifyAdminKey(req.headers["x-admin-key"] as string)) {
    sendError(res, 403, "Admin access required");
    return { authorized: false };
  }
  return { authorized: true };
}

/**
 * Require specific HTTP method(s) for an endpoint.
 * Sends 405 error response if method not allowed.
 *
 * @example
 * if (!requireMethod(req, res, "POST")) return;
 */
export function requireMethod(req: Request, res: Response, ...methods: string[]): boolean {
  if (!methods.includes(req.method)) {
    sendError(res, 405, `${methods.join(" or ")} only`);
    return false;
  }
  return true;
}

/**
 * Common handler setup for authenticated endpoints.
 * Handles CORS, preflight, and authentication in one call.
 *
 * @example
 * const auth = await handleAuthenticatedRequest(req, res, "POST");
 * if (!auth) return;
 * const userId = auth.userId;
 */
export async function handleAuthenticatedRequest(
  req: Request,
  res: Response,
  ...methods: string[]
): Promise<{ userId: string } | null> {
  setCors(res, req.headers.origin);
  if (handlePreflight(req.method, res)) return null;

  if (methods.length > 0 && !requireMethod(req, res, ...methods)) return null;

  const auth = await requireAuth(req, res);
  if (!auth.authenticated) return null;

  return { userId: auth.userId };
}

/**
 * Common handler setup for admin endpoints.
 * Handles CORS, preflight, and admin key verification in one call.
 *
 * @example
 * if (!handleAdminRequest(req, res)) return;
 */
export function handleAdminRequest(req: Request, res: Response): boolean {
  setCors(res, req.headers.origin);
  if (handlePreflight(req.method, res)) return false;

  const admin = requireAdmin(req, res);
  return admin.authorized;
}

// ============================================================================
// Request Body Validation
// ============================================================================

/**
 * Get a required string parameter from request body
 * @returns The string value or null if missing/invalid (error already sent)
 */
export function getRequiredString(
  req: Request,
  res: Response,
  paramName: string
): string | null {
  const value = req.body?.[paramName];
  if (typeof value !== "string" || !value.trim()) {
    sendError(res, 400, `${paramName} is required`);
    return null;
  }
  return value.trim();
}

/**
 * Get an optional string parameter from request body or query
 */
export function getOptionalString(req: Request, paramName: string): string | undefined {
  const value = req.body?.[paramName] ?? req.query?.[paramName];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

/**
 * Get a required parameter from body or query
 * @returns The value or null if missing (error already sent)
 */
export function getRequiredParam(
  req: Request,
  res: Response,
  paramName: string
): string | null {
  const value = req.body?.[paramName] ?? req.query?.[paramName];
  if (!value || typeof value !== "string") {
    sendError(res, 400, `${paramName} is required`);
    return null;
  }
  return value;
}
