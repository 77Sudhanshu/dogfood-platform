import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET is not configured");
}

const secretKey = new TextEncoder().encode(secret);

type RouteContext = {
  params: Promise<{
    teamId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const auth = await requireRole(request, [
      "PARTICIPANT",
      "ORGANIZER",
      "ADMIN",
    ]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { teamId } = await context.params;

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        id: true,
        name: true,
        leaderId: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    if (
      team.leaderId !== auth.user.id &&
      auth.user.role !== "ORGANIZER" &&
      auth.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error: "Only the team leader or organizer can create an invite",
        },
        { status: 403 }
      );
    }

    const token = await new SignJWT({
      teamId: team.id,
      type: "team-invite",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secretKey);

    return NextResponse.json({
      message: "Invite created successfully",
      inviteToken: token,
      inviteUrl: `/join-team/${token}`,
      expiresIn: "7 days",
    });
  } catch (error) {
    console.error("Create team invite error:", error);

    return NextResponse.json(
      { error: "Failed to create team invite" },
      { status: 500 }
    );
  }
}