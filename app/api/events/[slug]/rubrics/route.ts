import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const rubricSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
});

const criterionSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  weight: z.number().positive(),
  maxScore: z.number().positive().default(10),
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
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const result = rubricSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid rubric data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const rubric = await prisma.rubric.create({
      data: {
        name: result.data.name,
        description: result.data.description,
        eventId: event.id,
      },
    });

    return NextResponse.json(
      {
        message: "Rubric created successfully",
        rubric,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create rubric error:", error);

    return NextResponse.json(
      { error: "Failed to create rubric" },
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
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const rubrics = await prisma.rubric.findMany({
      where: {
        eventId: event.id,
      },
      include: {
        criteria: true,
      },
    });

    return NextResponse.json({
      rubrics,
    });
  } catch (error) {
    console.error("List rubrics error:", error);

    return NextResponse.json(
      { error: "Failed to fetch rubrics" },
      { status: 500 }
    );
  }
}