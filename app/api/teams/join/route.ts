import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET is not configured");
}

const secretKey = new TextEncoder().encode(secret);

export async function POST(request: Request) {
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

    const body = await request.json();

    const token = body.token;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invite token is required" },
        { status: 400 }
      );
    }

    let payload;

    try {
      const verified = await jwtVerify(token, secretKey);
      payload = verified.payload;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired invite token" },
        { status: 400 }
      );
    }

    if (
      payload.type !== "team-invite" ||
      typeof payload.teamId !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid team invite" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: {
        id: payload.teamId,
      },
      select: {
        id: true,
        name: true,
        eventId: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: auth.user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        {
          error: "You are already a member of this team",
        },
        { status: 409 }
      );
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: auth.user.id,
        role: "MEMBER",
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            eventId: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Joined team successfully",
        member,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Join team error:", error);

    return NextResponse.json(
      { error: "Failed to join team" },
      { status: 500 }
    );
  }
}