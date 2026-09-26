import { SignJWT, jwtVerify } from "jose";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET is not configured");
}

const secretKey = new TextEncoder().encode(secret);

export async function createSession(userId: string, role: string) {
  return await new SignJWT({
    userId,
    role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);

    return {
      userId: payload.userId as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
import { prisma } from "@/lib/prisma";

export type AppRole =
  | "PARTICIPANT"
  | "JUDGE"
  | "ORGANIZER"
  | "ADMIN";

export async function getCurrentUser(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  const sessionCookie = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("session="));

  if (!sessionCookie) {
    return null;
  }

  const token = sessionCookie.substring("session=".length);
  const session = await verifySession(token);

  if (!session) {
    return null;
  }

  // Always read the current role from the database.
  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return user;
}

export async function requireRole(
  request: Request,
  allowedRoles: AppRole[]
) {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      authorized: false as const,
      status: 401,
      user: null,
    };
  }

  if (!allowedRoles.includes(user.role as AppRole)) {
    return {
      authorized: false as const,
      status: 403,
      user,
    };
  }

  return {
    authorized: true as const,
    status: 200,
    user,
  };
}