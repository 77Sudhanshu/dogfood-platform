import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
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
      select: {
  id: true,
  name: true,
  status: true,
  communityVotingEnabled: true,
  communityResultsHidden: true,
},
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }
    const currentUser = await getCurrentUser(request);

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams.get("search")?.trim() || "";

    const trackSlug =
      searchParams.get("track")?.trim() || "";

    const page = Math.max(
      Number(searchParams.get("page") || "1"),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit") || "12"),
        1
      ),
      50
    );

    const where = {
      eventId: event.id,
      status: "SUBMITTED" as const,

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                slug: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),

      ...(trackSlug
        ? {
            track: {
              slug: trackSlug,
            },
          }
        : {}),
    };

    const total =
      await prisma.project.count({
        where,
      });
      const projectIds = await prisma.project.findMany({
  where,
  select: {
    id: true,
  },
});

const shuffledIds = projectIds
  .map((project) => project.id)
  .sort((a, b) => {
    const hash = (value: string) => {
      let result = 0;

      for (let i = 0; i < value.length; i++) {
        result =
          (result * 31 + value.charCodeAt(i)) | 0;
      }

      return Math.abs(result);
    };

    const hashA = hash(`${event.id}:${a}`);
    const hashB = hash(`${event.id}:${b}`);

    if (hashA === hashB) {
      return a.localeCompare(b);
    }

    return hashA - hashB;
  });

const pageIds = shuffledIds.slice(
  (page - 1) * limit,
  page * limit
);

    const projects = await prisma.project.findMany({
  where: {
    ...where,
    id: {
      in: pageIds,
    },
  },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          githubUrl: true,
          demoUrl: true,
          videoUrl: true,
          technologies: true,
          submittedAt: true,
          _count: {
  select: {
    communityVotes: true,
  },
},

          team: {
            select: {
              id: true,
              name: true,
            },
          },

          track: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },

      });
      const orderedProjects = pageIds
  .map((id) => projects.find((project) => project.id === id))
  .filter(
    (project): project is (typeof projects)[number] =>
      project !== undefined
  );
   const publicProjects = await Promise.all(
  orderedProjects.map(async (project) => {
    const { _count, ...projectData } = project;

    let hasVoted = false;

    if (currentUser?.role === "PARTICIPANT") {
      const existingVote = await prisma.communityVote.findUnique({
        where: {
          userId_projectId: {
            userId: currentUser.id,
            projectId: project.id,
          },
        },
        select: {
          id: true,
        },
      });

      hasVoted = Boolean(existingVote);
    }

    return {
      ...projectData,
      hasVoted,

      ...(event.communityVotingEnabled &&
      !event.communityResultsHidden
        ? {
            communityVoteCount: _count.communityVotes,
          }
        : {}),
    };
  })
);


    const totalPages =
      Math.ceil(total / limit);

    return NextResponse.json({
      event,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      projects: publicProjects,
    });
  } catch (error) {
    console.error(
      "Public gallery error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load public gallery",
      },
      { status: 500 }
    );
  }
}