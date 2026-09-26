import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function PATCH(
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

    const body = await request.json();

    const communityVotingEnabled =
      Boolean(body.communityVotingEnabled);

    const communityResultsHidden =
      body.communityResultsHidden === undefined
        ? true
        : Boolean(body.communityResultsHidden);

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

    const updatedEvent =
      await prisma.event.update({
        where: {
          id: event.id,
        },
        data: {
          communityVotingEnabled,
          communityResultsHidden,
        },
        select: {
          id: true,
          name: true,
          communityVotingEnabled: true,
          communityResultsHidden: true,
        },
      });

    return NextResponse.json({
      message:
        "Community voting settings updated",
      event: updatedEvent,
    });
  } catch (error) {
    console.error(
      "Community voting settings error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update community voting settings",
      },
      { status: 500 }
    );
  }
}