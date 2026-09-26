import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

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
      include: {
        tracks: {
          orderBy: {
            name: "asc",
          },
        },
        prizes: true,
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

    return NextResponse.json({
      event,
    });
  } catch (error) {
    console.error("Get event error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch event",
      },
      { status: 500 }
    );
  }
}