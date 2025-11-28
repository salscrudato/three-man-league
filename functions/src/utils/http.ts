/**
 * HTTP Utilities for Cloud Functions
 * 
 * Shared utilities for CORS handling and authentication verification.
 */

import type { Response } from "express";
import * as admin from "firebase-admin";

/**
 * Set CORS headers for cross-origin requests
 */
export function setCors(res: Response): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

