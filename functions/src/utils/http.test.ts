/**
 * Tests for HTTP utilities
 */

import { setCors, handlePreflight, sendError, sendSuccess, verifyAdminKey } from "./http.js";
import type { Response } from "express";

// Mock Response object
function createMockResponse(): Response {
  const headers: Record<string, string> = {};
  const res = {
    set: jest.fn((key: string, value: string) => {
      headers[key] = value;
      return res;
    }),
    status: jest.fn(() => res),
    send: jest.fn(() => res),
    getHeaders: () => headers,
  } as unknown as Response;
  return res;
}

describe("setCors", () => {
  it("sets production origin when no origin provided", () => {
    const res = createMockResponse();
    setCors(res);
    expect(res.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "https://three-man-league.web.app"
    );
  });

  it("allows production web.app origin", () => {
    const res = createMockResponse();
    setCors(res, "https://three-man-league.web.app");
    expect(res.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "https://three-man-league.web.app"
    );
  });

  it("allows production firebaseapp.com origin", () => {
    const res = createMockResponse();
    setCors(res, "https://three-man-league.firebaseapp.com");
    expect(res.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "https://three-man-league.firebaseapp.com"
    );
  });

  it("allows localhost:5173 for development", () => {
    const res = createMockResponse();
    setCors(res, "http://localhost:5173");
    expect(res.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "http://localhost:5173"
    );
  });

  it("allows localhost:5000 for development", () => {
    const res = createMockResponse();
    setCors(res, "http://localhost:5000");
    expect(res.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "http://localhost:5000"
    );
  });

  it("allows 127.0.0.1 for development", () => {
    const res = createMockResponse();
    setCors(res, "http://127.0.0.1:5173");
    expect(res.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "http://127.0.0.1:5173"
    );
  });

  it("falls back to production for unknown origins", () => {
    const res = createMockResponse();
    setCors(res, "https://malicious-site.com");
    expect(res.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "https://three-man-league.web.app"
    );
  });

  it("sets all required CORS headers", () => {
    const res = createMockResponse();
    setCors(res);
    expect(res.set).toHaveBeenCalledWith("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    expect(res.set).toHaveBeenCalledWith("Access-Control-Allow-Headers", "Content-Type, Authorization");
    expect(res.set).toHaveBeenCalledWith("Access-Control-Allow-Credentials", "true");
  });
});

describe("handlePreflight", () => {
  it("returns true and sends 204 for OPTIONS requests", () => {
    const res = createMockResponse();
    const result = handlePreflight("OPTIONS", res);
    expect(result).toBe(true);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith("");
  });

  it("returns false for GET requests", () => {
    const res = createMockResponse();
    const result = handlePreflight("GET", res);
    expect(result).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns false for POST requests", () => {
    const res = createMockResponse();
    const result = handlePreflight("POST", res);
    expect(result).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("sendError", () => {
  it("sends error response with correct status and message", () => {
    const res = createMockResponse();
    sendError(res, 400, "Bad request");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Bad request" });
  });

  it("handles 401 unauthorized", () => {
    const res = createMockResponse();
    sendError(res, 401, "Unauthorized");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("handles 500 internal error", () => {
    const res = createMockResponse();
    sendError(res, 500, "Internal server error");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Internal server error" });
  });
});

describe("sendSuccess", () => {
  it("sends success response with data", () => {
    const res = createMockResponse();
    const data = { message: "Success", id: "123" };
    sendSuccess(res, data);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(data);
  });

  it("handles empty object", () => {
    const res = createMockResponse();
    sendSuccess(res, {});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({});
  });

  it("handles array data", () => {
    const res = createMockResponse();
    const data = [{ id: 1 }, { id: 2 }];
    sendSuccess(res, data);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(data);
  });
});

describe("verifyAdminKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns true when no admin key is configured (development mode)", () => {
    delete process.env.ADMIN_API_KEY;
    expect(verifyAdminKey("any-key")).toBe(true);
    expect(verifyAdminKey(undefined)).toBe(true);
  });

  it("returns true when admin key matches", () => {
    process.env.ADMIN_API_KEY = "secret-admin-key";
    expect(verifyAdminKey("secret-admin-key")).toBe(true);
  });

  it("returns false when admin key does not match", () => {
    process.env.ADMIN_API_KEY = "secret-admin-key";
    expect(verifyAdminKey("wrong-key")).toBe(false);
  });

  it("returns false when admin key is undefined but expected", () => {
    process.env.ADMIN_API_KEY = "secret-admin-key";
    expect(verifyAdminKey(undefined)).toBe(false);
  });

  it("returns false when admin key is empty string but expected", () => {
    process.env.ADMIN_API_KEY = "secret-admin-key";
    expect(verifyAdminKey("")).toBe(false);
  });
});

