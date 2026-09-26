import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const createEventSchema = z.object({
  name: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers, and hyphens only"
    ),
  description: z.string().max(5000).optional(),

  registrationStart: z.coerce.date().optional(),
  registrationEnd: z.coerce.date().optional(),

  submissionStart: z.coerce.date().optional(),
  submissionEnd: z.coerce.date().optional(),

  judgingStart: z.coerce.date().optional(),
  judgingEnd: z.coerce.date().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ["ORGANIZER", "ADMIN"]);

    if (!auth.authorized) {
      return NextResponse.json(
        {
          error:
            auth.status === 401
              ? "Not authenticated"
              : "You do not have permission to create events",
        },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const result = createEventSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid event data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = result.data;

    const existingEvent = await prisma.event.findUnique({
      where: {
        slug: data.slug,
      },
    });

    if (existingEvent) {
      return NextResponse.json(
        {
          error: "An event with this slug already exists",
        },
        { status: 409 }
      );
    }

    const event = await prisma.event.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,

        registrationStart: data.registrationStart,
        registrationEnd: data.registrationEnd,

        submissionStart: data.submissionStart,
        submissionEnd: data.submissionEnd,

        judgingStart: data.judgingStart,
        judgingEnd: data.judgingEnd,

        createdById: auth.user.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        registrationStart: true,
        registrationEnd: true,
        submissionStart: true,
        submissionEnd: true,
        judgingStart: true,
        judgingEnd: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Event created successfully",
        event,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create event error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while creating the event",
      },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        registrationStart: true,
        registrationEnd: true,
        submissionStart: true,
        submissionEnd: true,
        judgingStart: true,
        judgingEnd: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      events,
    });
  } catch (error) {
    console.error("Get events error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch events",
      },
      { status: 500 }
    );
  }
}