import Fastify, { FastifyInstance } from "fastify";

jest.mock("../../services/merchant.service", () => ({
  merchantService: {
    getMerchantIdForUser: jest.fn(),
    getMyMerchantWithStats: jest.fn(),
    updateMyMerchant: jest.fn(),
  },
}));

jest.mock("../../middleware/auth.middleware", () => ({
  requireAuth: jest.fn(async (request: any, reply: any) => {
    if (!(global as any).__AUTH_OK) {
      return reply.code(401).send({ success: false, error: "Unauthorized" });
    }
    request.user = (global as any).__USER;
  }),
  requireRoles: (...allowed: string[]) =>
    jest.fn(async (request: any, reply: any) => {
      if (!request.user) {
        return reply.code(401).send({ success: false, error: "Unauthorized" });
      }
      const has = request.user.roles.some((r: string) => allowed.includes(r));
      if (!has) {
        return reply.code(403).send({ success: false, error: "Forbidden" });
      }
    }),
  AuthenticatedRequest: {},
}));

import merchantRoutes from "./index";
import { merchantService } from "../../services/merchant.service";

function setUser(roles: string[], merchantId: number | null) {
  (global as any).__AUTH_OK = true;
  (global as any).__USER = {
    sub: "user-1",
    phone: "+233500000000",
    roles,
    merchant_id: merchantId,
    branch_id: 7,
    iat: 0,
    exp: 0,
    iss: "storecredit-api",
    aud: "storecredit-app",
    jti: "jti-1",
  };
}

function setUnauthenticated() {
  (global as any).__AUTH_OK = false;
}

function buildServer(): FastifyInstance {
  const server = Fastify();
  server.register(merchantRoutes);
  return server;
}

describe("GET /merchants/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUser(["manager"], 42);
  });

  it("returns 401 when unauthenticated", async () => {
    setUnauthenticated();
    const server = buildServer();
    const res = await server.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(401);
    await server.close();
  });

  it("returns { data: null } when user has no merchant assigned", async () => {
    setUser(["manager"], null);
    (merchantService.getMerchantIdForUser as jest.Mock).mockResolvedValue(null);
    const server = buildServer();
    const res = await server.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeNull();
    await server.close();
  });

  it("falls back to staff lookup when JWT merchant_id is null", async () => {
    setUser(["manager"], null);
    (merchantService.getMerchantIdForUser as jest.Mock).mockResolvedValue({
      merchant_id: 42,
      branch_id: 7,
    });
    (merchantService.getMyMerchantWithStats as jest.Mock).mockResolvedValue({
      id: 42,
      name: "Acme",
      phone: "+233500000000",
      country_code: "GH",
      slug: "acme",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      branch_count: 3,
      staff_count: 5,
      customer_count: 12,
      lifetime_credit_issued: 100,
      credit_pool_used: 1500,
      credit_pool_limit: 5000,
    });
    const server = buildServer();
    const res = await server.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBe(42);
    expect(body.data.branch_count).toBe(3);
    expect(merchantService.getMerchantIdForUser).toHaveBeenCalledWith("user-1");
    await server.close();
  });

  it("returns merchant with stats when JWT merchant_id is set", async () => {
    setUser(["manager"], 42);
    (merchantService.getMyMerchantWithStats as jest.Mock).mockResolvedValue({
      id: 42,
      name: "Acme",
      phone: "+233500000000",
      country_code: "GH",
      slug: "acme",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      branch_count: 1,
      staff_count: 2,
      customer_count: 3,
      lifetime_credit_issued: 0,
      credit_pool_used: 0,
      credit_pool_limit: null,
    });
    const server = buildServer();
    const res = await server.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBe(42);
    expect(merchantService.getMerchantIdForUser).not.toHaveBeenCalled();
    await server.close();
  });
});

describe("PATCH /merchants/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUser(["manager"], 42);
  });

  it("returns 401 when unauthenticated", async () => {
    setUnauthenticated();
    const server = buildServer();
    const res = await server.inject({
      method: "PATCH",
      url: "/me",
      payload: { name: "New" },
    });
    expect(res.statusCode).toBe(401);
    await server.close();
  });

  it("returns 403 for cashier role", async () => {
    setUser(["cashier"], 42);
    const server = buildServer();
    const res = await server.inject({
      method: "PATCH",
      url: "/me",
      payload: { name: "New" },
    });
    expect(res.statusCode).toBe(403);
    await server.close();
  });

  it("returns 403 when manager has no merchant assigned", async () => {
    setUser(["manager"], null);
    (merchantService.getMerchantIdForUser as jest.Mock).mockResolvedValue(null);
    const server = buildServer();
    const res = await server.inject({
      method: "PATCH",
      url: "/me",
      payload: { name: "New" },
    });
    expect(res.statusCode).toBe(403);
    await server.close();
  });

  it("updates the merchant and returns the refreshed row", async () => {
    setUser(["manager"], 42);
    (merchantService.updateMyMerchant as jest.Mock).mockResolvedValue({
      id: 42,
      name: "New",
      phone: "+233500000000",
      country_code: "GH",
      slug: "acme",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      branch_count: 1,
      staff_count: 2,
      customer_count: 3,
      lifetime_credit_issued: 0,
      credit_pool_used: 0,
      credit_pool_limit: null,
    });
    const server = buildServer();
    const res = await server.inject({
      method: "PATCH",
      url: "/me",
      payload: { name: "New" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("New");
    expect(merchantService.updateMyMerchant).toHaveBeenCalledWith(42, {
      name: "New",
    });
    await server.close();
  });
});