import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const teamSchema = z.object({
  name: z.string().min(2).max(100),
});

type RouteContext = {
  params: Promise<{
    slug: string;
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
        {
          error:
            auth.status === 401
              ? "Not authenticated"
              : "You do not have permission to create a team",
        },
        { status: auth.status }
      );
    }

    const { slug } = await context.params;

    const event = await prisma.event.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        {
          error: "Event not found",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const result = teamSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid team data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const existingTeam = await prisma.team.findFirst({
      where: {
        eventId: event.id,
        name: result.data.name,
      },
    });

    if (existingTeam) {
      return NextResponse.json(
        {
          error: "A team with this name already exists in this event",
        },
        { status: 409 }
      );
    }

    const team = await prisma.team.create({
      data: {
        name: result.data.name,
        eventId: event.id,
        leaderId: auth.user.id,

        members: {
          create: {
            userId: auth.user.id,
            role: "LEADER",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Team created successfully",
        team,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create team error:", error);

    return NextResponse.json(
      {
        error: "Failed to create team",
      },
      { status: 500 }
    );
  }
}
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;

    const event = await prisma.event.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const teams = await prisma.team.findMany({
      where: {
        eventId: event.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        project: true,
      },
    });

    return NextResponse.json({
      teams,
    });
  } catch (error) {
    console.error("Get teams error:", error);

    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}