import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const judgeSchema = z.object({
  userId: z.string(),
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
      "ORGANIZER",
      "ADMIN",
    ]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Not authorized" },
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
        name: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const result = judgeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid judge data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { userId } = result.data;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "JUDGE") {
      return NextResponse.json(
        {
          error: "User must have the JUDGE role",
        },
        { status: 400 }
      );
    }

    const existingJudge = await prisma.judge.findUnique({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: user.id,
        },
      },
    });

    if (existingJudge) {
      return NextResponse.json(
        {
          error: "User is already a judge for this event",
        },
        { status: 409 }
      );
    }

    const judge = await prisma.judge.create({
      data: {
        userId: user.id,
        eventId: event.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Judge added successfully",
        judge,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add judge error:", error);

    return NextResponse.json(
      {
        error: "Failed to add judge",
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
        name: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const judges = await prisma.judge.findMany({
      where: {
        eventId: event.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      event,
      judges,
    });
  } catch (error) {
    console.error("List judges error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch judges",
      },
      { status: 500 }
    );
  }
}