import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const prizeSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  amount: z.coerce.number().nonnegative().optional(),
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
              : "You do not have permission to manage prizes",
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

    const result = prizeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid prize data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const existingPrize = await prisma.prize.findFirst({
      where: {
        eventId: event.id,
        name: result.data.name,
      },
    });

    if (existingPrize) {
      return NextResponse.json(
        {
          error: "A prize with this name already exists",
        },
        { status: 409 }
      );
    }

    const prize = await prisma.prize.create({
      data: {
        name: result.data.name,
        description: result.data.description,
        amount: result.data.amount,
        eventId: event.id,
      },
    });

    return NextResponse.json(
      {
        message: "Prize created successfully",
        prize,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create prize error:", error);

    return NextResponse.json(
      {
        error: "Failed to create prize",
      },
      { status: 500 }
    );
  }
}