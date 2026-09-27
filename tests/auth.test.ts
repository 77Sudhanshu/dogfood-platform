import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { createSession, verifySession, getCurrentUser, requireRole } from "../lib/auth";
import { prisma } from "../lib/prisma";

const mockedFindUnique = vi.mocked(prisma.user.findUnique);

describe("Authentication and role isolation", () => {
  it("creates and verifies a valid session", async () => {
    const token = await createSession("user-123", "PARTICIPANT");

    const session = await verifySession(token);

    expect(session).toEqual({
      userId: "user-123",
      role: "PARTICIPANT",
    });
  });

  it("rejects an invalid session token", async () => {
    const session = await verifySession("invalid-token");

    expect(session).toBeNull();
  });

  it("rejects requests without a session", async () => {
    const request = new Request("http://localhost/api/protected");

    const result = await requireRole(request, ["ORGANIZER"]);

    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
    expect(result.user).toBeNull();
  });

  it("denies a participant from an organizer-only endpoint", async () => {
    mockedFindUnique.mockResolvedValueOnce({
      id: "user-123",
      name: "Participant",
      email: "participant@dogfood.local",
      role: "PARTICIPANT",
    } as never);

    const token = await createSession("user-123", "PARTICIPANT");

    const request = new Request("http://localhost/api/protected", {
      headers: {
        cookie: `session=${token}`,
      },
    });

    const result = await requireRole(request, ["ORGANIZER", "ADMIN"]);

    expect(result.authorized).toBe(false);
    expect(result.status).toBe(403);
  });

  it("allows an organizer to access an organizer-only endpoint", async () => {
    mockedFindUnique.mockResolvedValueOnce({
      id: "organizer-123",
      name: "Organizer",
      email: "organizer@dogfood.local",
      role: "ORGANIZER",
    } as never);

    const token = await createSession("organizer-123", "ORGANIZER");

    const request = new Request("http://localhost/api/protected", {
      headers: {
        cookie: `session=${token}`,
      },
    });

    const result = await requireRole(request, ["ORGANIZER", "ADMIN"]);

    expect(result.authorized).toBe(true);
    expect(result.status).toBe(200);
    expect(result.user?.role).toBe("ORGANIZER");
  });

  it("allows an admin to access an organizer-only endpoint", async () => {
    mockedFindUnique.mockResolvedValueOnce({
      id: "admin-123",
      name: "Admin",
      email: "admin@dogfood.local",
      role: "ADMIN",
    } as never);

    const token = await createSession("admin-123", "ADMIN");

    const request = new Request("http://localhost/api/protected", {
      headers: {
        cookie: `session=${token}`,
      },
    });

    const result = await requireRole(request, ["ORGANIZER", "ADMIN"]);

    expect(result.authorized).toBe(true);
    expect(result.status).toBe(200);
    expect(result.user?.role).toBe("ADMIN");
  });

  it("uses the database role instead of trusting the JWT role", async () => {
    mockedFindUnique.mockResolvedValueOnce({
      id: "user-123",
      name: "Participant",
      email: "participant@dogfood.local",
      role: "PARTICIPANT",
    } as never);

    // JWT claims ORGANIZER, but database says PARTICIPANT.
    const token = await createSession("user-123", "ORGANIZER");

    const request = new Request("http://localhost/api/protected", {
      headers: {
        cookie: `session=${token}`,
      },
    });

    const result = await requireRole(request, ["ORGANIZER"]);

    expect(result.authorized).toBe(false);
    expect(result.status).toBe(403);
    expect(result.user?.role).toBe("PARTICIPANT");
  });
});