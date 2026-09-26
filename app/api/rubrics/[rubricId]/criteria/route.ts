import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const criterionSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  weight: z.number().positive(),
  maxScore: z.number().positive().default(10),
});

type RouteContext = {
  params: Promise<{
    rubricId: string;
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

    const { rubricId } = await context.params;

    const rubric = await prisma.rubric.findUnique({
      where: {
        id: rubricId,
      },
    });

    if (!rubric) {
      return NextResponse.json(
        { error: "Rubric not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const result = criterionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid criterion data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const criterion = await prisma.rubricCriterion.create({
      data: {
        rubricId,
        name: result.data.name,
        description: result.data.description,
        weight: result.data.weight,
        maxScore: result.data.maxScore,
      },
    });

    return NextResponse.json(
      {
        message: "Criterion created successfully",
        criterion,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create criterion error:", error);

    return NextResponse.json(
      { error: "Failed to create criterion" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { rubricId } = await context.params;

    const rubric = await prisma.rubric.findUnique({
      where: {
        id: rubricId,
      },
      include: {
        criteria: true,
      },
    });

    if (!rubric) {
      return NextResponse.json(
        { error: "Rubric not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      rubric,
      criteria: rubric.criteria,
    });
  } catch (error) {
    console.error("List criteria error:", error);

    return NextResponse.json(
      { error: "Failed to fetch criteria" },
      { status: 500 }
    );
  }
}