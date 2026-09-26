import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function escapeCsv(value: unknown) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export async function GET(
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

    const evaluations = await prisma.evaluation.findMany({
      where: {
        project: {
          eventId: event.id,
        },
      },
      include: {
        judge: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        project: {
          select: {
            name: true,
            slug: true,
          },
        },
        scores: {
          include: {
            criterion: true,
          },
        },
      },
      orderBy: {
        submittedAt: "asc",
      },
    });

    const rows = evaluations.map((evaluation) => {
      let weightedScore = 0;
      let totalWeight = 0;

      for (const score of evaluation.scores) {
        const scoreValue = Number(score.score);
        const maxScore = Number(score.criterion.maxScore);
        const weight = Number(score.criterion.weight);

        const normalizedScore =
          maxScore === 0
            ? 0
            : scoreValue / maxScore;

        weightedScore +=
          normalizedScore * weight;

        totalWeight += weight;
      }

      const rawScore =
        totalWeight === 0
          ? 0
          : (weightedScore / totalWeight) * 100;

      return [
  evaluation.project.name,
  evaluation.project.slug,
  evaluation.judge.user.name,
  evaluation.judge.user.email,
  Number(rawScore.toFixed(2)),
  evaluation.submittedAt
    ? evaluation.submittedAt.toISOString()
    : "",
  evaluation.comment ?? "",
];
    });

    const header = [
      "Project Name",
      "Project Slug",
      "Judge Name",
      "Judge Email",
      "Raw Score",
      "Submitted At",
      "Comment",
    ];

    const csv = [
      header,
      ...rows,
    ]
      .map((row) =>
        row.map(escapeCsv).join(",")
      )
      .join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-evaluations.csv"`,
      },
    });
  } catch (error) {
    console.error(
      "Evaluation CSV export error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to export evaluations",
      },
      { status: 500 }
    );
  }
}