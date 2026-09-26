import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const trackSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers, and hyphens only"
    ),
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
    const auth = await requireRole(request, ["ORGANIZER", "ADMIN"]);

    if (!auth.authorized) {
      return NextResponse.json(
        {
          error:
            auth.status === 401
              ? "Not authenticated"
              : "You do not have permission to manage tracks",
        },
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
    const result = trackSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid track data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const existingTrack = await prisma.track.findFirst({
      where: {
        eventId: event.id,
        OR: [
          { slug: result.data.slug },
          { name: result.data.name },
        ],
      },
    });

    if (existingTrack) {
      return NextResponse.json(
        {
          error: "A track with this name or slug already exists",
        },
        { status: 409 }
      );
    }

    const track = await prisma.track.create({
      data: {
        name: result.data.name,
        slug: result.data.slug,
        eventId: event.id,
      },
    });

    return NextResponse.json(
      {
        message: "Track created successfully",
        track,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create track error:", error);

    return NextResponse.json(
      { error: "Failed to create track" },
      { status: 500 }
    );
  }
}
