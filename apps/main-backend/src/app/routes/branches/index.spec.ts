import Fastify, { FastifyInstance } from "fastify";

jest.mock("../../services/branch.service", () => ({
  branchService: {
    listBranchesForMerchant: jest.fn(),
    createBranch: jest.fn(),
    updateBranch: jest.fn(),
  },
}));
jest.mock("../../services/merchant.service", () => ({
  merchantService: {
    getMerchantIdForUser: jest.fn(),
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

import branchRoutes from "./index";
import { branchService } from "../../services/branch.service";
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
  server.register(branchRoutes);
  return server;
}

describe("GET /branches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUser(["manager"], 42);
  });

  it("returns 401 when unauthenticated", async () => {
    setUnauthenticated();
    const server = buildServer();
    const res = await server.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(401);
    await server.close();
  });

  it("returns empty list when user has no merchant", async () => {
    setUser(["manager"], null);
    (merchantService.getMerchantIdForUser as jest.Mock).mockResolvedValue(null);
    const server = buildServer();
    const res = await server.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
    await server.close();
  });

  it("returns branches for the merchant", async () => {
    (branchService.listBranchesForMerchant as jest.Mock).mockResolvedValue([
      {
        id: 1,
        merchant_id: 42,
        name: "A",
        phone: null,
        address: null,
        city: "Accra",
        country_code: "GH",
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
        staff_count: 0,
        customer_count: 0,
        credit_issued_this_month: 0,
        last_activity_date: null,
      },
    ]);
    const server = buildServer();
    const res = await server.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(1);
    expect(branchService.listBranchesForMerchant).toHaveBeenCalledWith(42);
    await server.close();
  });
});

describe("POST /branches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUser(["manager"], 42);
  });

  it("returns 401 when unauthenticated", async () => {
    setUnauthenticated();
    const server = buildServer();
    const res = await server.inject({
      method: "POST",
      url: "/",
      payload: { name: "New", city: "Accra", country_code: "GH" },
    });
    expect(res.statusCode).toBe(401);
    await server.close();
  });

  it("returns 403 for cashier role", async () => {
    setUser(["cashier"], 42);
    const server = buildServer();
    const res = await server.inject({
      method: "POST",
      url: "/",
      payload: { name: "New", city: "Accra", country_code: "GH" },
    });
    expect(res.statusCode).toBe(403);
    await server.close();
  });

  it("creates a branch and returns 201", async () => {
    (branchService.createBranch as jest.Mock).mockResolvedValue({
      id: 10,
      merchant_id: 42,
      name: "New",
      phone: null,
      address: null,
      city: "Accra",
      country_code: "GH",
      is_active: true,
      created_at: "2025-01-02T00:00:00Z",
      staff_count: 0,
      customer_count: 0,
      credit_issued_this_month: 0,
      last_activity_date: null,
    });
    const server = buildServer();
    const res = await server.inject({
      method: "POST",
      url: "/",
      payload: { name: "New", city: "Accra", country_code: "GH" },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBe(10);
    expect(branchService.createBranch).toHaveBeenCalledWith(42, {
      name: "New",
      city: "Accra",
      country_code: "GH",
    });
    await server.close();
  });
});

describe("PATCH /branches/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUser(["manager"], 42);
  });

  it("returns 403 for cashier role", async () => {
    setUser(["cashier"], 42);
    const server = buildServer();
    const res = await server.inject({
      method: "PATCH",
      url: "/5",
      payload: { name: "X" },
    });
    expect(res.statusCode).toBe(403);
    await server.close();
  });

  it("returns 400 for non-numeric id", async () => {
    const server = buildServer();
    const res = await server.inject({
      method: "PATCH",
      url: "/abc",
      payload: { name: "X" },
    });
    expect(res.statusCode).toBe(400);
    await server.close();
  });

  it("returns 404 when branch not found", async () => {
    (branchService.updateBranch as jest.Mock).mockRejectedValue(
      new Error("Branch not found"),
    );
    const server = buildServer();
    const res = await server.inject({
      method: "PATCH",
      url: "/99",
      payload: { name: "X" },
    });
    expect(res.statusCode).toBe(404);
    await server.close();
  });

  it("returns 403 when ownership check fails", async () => {
    const err = new Error(
      "Forbidden: branch does not belong to your merchant",
    );
    (err as any).statusCode = 403;
    (branchService.updateBranch as jest.Mock).mockRejectedValue(err);
    const server = buildServer();
    const res = await server.inject({
      method: "PATCH",
      url: "/5",
      payload: { name: "X" },
    });
    expect(res.statusCode).toBe(403);
    await server.close();
  });

  it("updates and returns the branch on success", async () => {
    (branchService.updateBranch as jest.Mock).mockResolvedValue({
      id: 5,
      merchant_id: 42,
      name: "Updated",
      phone: null,
      address: null,
      city: "Tema",
      country_code: "GH",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      staff_count: 0,
      customer_count: 0,
      credit_issued_this_month: 0,
      last_activity_date: null,
    });
    const server = buildServer();
    const res = await server.inject({
      method: "PATCH",
      url: "/5",
      payload: { name: "Updated", city: "Tema" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.name).toBe("Updated");
    expect(branchService.updateBranch).toHaveBeenCalledWith(5, 42, {
      name: "Updated",
      city: "Tema",
    });
    await server.close();
  });
});