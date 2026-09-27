import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  // --------------------------------------------------
  // USERS
  // --------------------------------------------------

  const participant = await prisma.user.upsert({
    where: { email: "participant@dogfood.local" },
    update: {
      name: "Demo Participant",
      role: "PARTICIPANT",
      passwordHash,
    },
    create: {
      name: "Demo Participant",
      email: "participant@dogfood.local",
      role: "PARTICIPANT",
      passwordHash,
    },
  });

  const participant2 = await prisma.user.upsert({
    where: { email: "participant2@dogfood.local" },
    update: {
      name: "Demo Participant 2",
      role: "PARTICIPANT",
      passwordHash,
    },
    create: {
      name: "Demo Participant 2",
      email: "participant2@dogfood.local",
      role: "PARTICIPANT",
      passwordHash,
    },
  });

  const judgeUser = await prisma.user.upsert({
    where: { email: "judge@dogfood.local" },
    update: {
      name: "Demo Judge",
      role: "JUDGE",
      passwordHash,
    },
    create: {
      name: "Demo Judge",
      email: "judge@dogfood.local",
      role: "JUDGE",
      passwordHash,
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: "organizer@dogfood.local" },
    update: {
      name: "Demo Organizer",
      role: "ORGANIZER",
      passwordHash,
    },
    create: {
      name: "Demo Organizer",
      email: "organizer@dogfood.local",
      role: "ORGANIZER",
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@dogfood.local" },
    update: {
      name: "Demo Admin",
      role: "ADMIN",
      passwordHash,
    },
    create: {
      name: "Demo Admin",
      email: "admin@dogfood.local",
      role: "ADMIN",
      passwordHash,
    },
  });

  // --------------------------------------------------
  // EVENT
  // --------------------------------------------------

  const now = new Date();

  const event = await prisma.event.upsert({
    where: {
      slug: "dogfood-demo-2026",
    },
    update: {
      name: "Dogfood Demo Hackathon",
      description:
        "Demo hackathon event for testing submissions, judging, normalization, voting, and public project discovery.",
      status: "ACTIVE",
      communityVotingEnabled: true,
      communityResultsHidden: true,
      createdById: organizer.id,
      registrationStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      submissionStart: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      submissionEnd: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      judgingStart: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      judgingEnd: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    },
    create: {
      name: "Dogfood Demo Hackathon",
      slug: "dogfood-demo-2026",
      description:
        "Demo hackathon event for testing submissions, judging, normalization, voting, and public project discovery.",
      status: "ACTIVE",
      communityVotingEnabled: true,
      communityResultsHidden: true,
      createdById: organizer.id,
      registrationStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      submissionStart: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      submissionEnd: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      judgingStart: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      judgingEnd: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  // --------------------------------------------------
  // TRACK
  // --------------------------------------------------

  const track = await prisma.track.upsert({
    where: {
      eventId_slug: {
        eventId: event.id,
        slug: "ai-technology",
      },
    },
    update: {
      name: "AI & Technology",
    },
    create: {
      name: "AI & Technology",
      slug: "ai-technology",
      eventId: event.id,
    },
  });

  // --------------------------------------------------
  // PRIZE
  // --------------------------------------------------

  const existingPrize = await prisma.prize.findFirst({
    where: {
      eventId: event.id,
      name: "First Prize",
    },
  });

  if (!existingPrize) {
    await prisma.prize.create({
      data: {
        name: "First Prize",
        description: "Winner prize",
        amount: 50000,
        eventId: event.id,
      },
    });
  }

  // --------------------------------------------------
  // TEAM
  // --------------------------------------------------

  const team = await prisma.team.upsert({
    where: {
      eventId_name: {
        eventId: event.id,
        name: "Team Phoenix",
      },
    },
    update: {
      leaderId: participant.id,
    },
    create: {
      name: "Team Phoenix",
      eventId: event.id,
      leaderId: participant.id,
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: participant.id,
      },
    },
    update: {
      role: "LEADER",
    },
    create: {
      teamId: team.id,
      userId: participant.id,
      role: "LEADER",
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: participant2.id,
      },
    },
    update: {
      role: "MEMBER",
    },
    create: {
      teamId: team.id,
      userId: participant2.id,
      role: "MEMBER",
    },
  });

  // --------------------------------------------------
  // PROJECT
  // --------------------------------------------------

  const project = await prisma.project.upsert({
    where: {
      eventId_slug: {
        eventId: event.id,
        slug: "fraudshield-ai",
      },
    },
    update: {
      name: "FraudShield AI",
      description:
        "AI-powered fraud and scam detection platform for identifying suspicious online activity.",
      technologies: "Next.js, TypeScript, Prisma, PostgreSQL, AI",
      status: "SUBMITTED",
      trackId: track.id,
      teamId: team.id,
      submittedAt: new Date(),
    },
    create: {
      name: "FraudShield AI",
      slug: "fraudshield-ai",
      description:
        "AI-powered fraud and scam detection platform for identifying suspicious online activity.",
      technologies: "Next.js, TypeScript, Prisma, PostgreSQL, AI",
      status: "SUBMITTED",
      eventId: event.id,
      trackId: track.id,
      teamId: team.id,
      submittedAt: new Date(),
    },
  });

    // --------------------------------------------------
  // SECOND DEMO TEAM + PROJECT (PAIRWISE JUDGING)
  // --------------------------------------------------

  const team2 = await prisma.team.upsert({
    where: {
      eventId_name: {
        eventId: event.id,
        name: "Team Nova",
      },
    },
    update: {
      leaderId: participant2.id,
    },
    create: {
      name: "Team Nova",
      eventId: event.id,
      leaderId: participant2.id,
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team2.id,
        userId: participant2.id,
      },
    },
    update: {
      role: "LEADER",
    },
    create: {
      teamId: team2.id,
      userId: participant2.id,
      role: "LEADER",
    },
  });

  const project2 = await prisma.project.upsert({
    where: {
      eventId_slug: {
        eventId: event.id,
        slug: "novaguard-ai",
      },
    },
    update: {
      name: "NovaGuard AI",
      description:
        "AI-powered cybersecurity assistant for detecting suspicious messages and online threats.",
      technologies: "Next.js, TypeScript, Prisma, PostgreSQL, AI",
      status: "SUBMITTED",
      trackId: track.id,
      teamId: team2.id,
      submittedAt: new Date(),
    },
    create: {
      name: "NovaGuard AI",
      slug: "novaguard-ai",
      description:
        "AI-powered cybersecurity assistant for detecting suspicious messages and online threats.",
      technologies: "Next.js, TypeScript, Prisma, PostgreSQL, AI",
      status: "SUBMITTED",
      eventId: event.id,
      trackId: track.id,
      teamId: team2.id,
      submittedAt: new Date(),
    },
  });

  // --------------------------------------------------
  // JUDGE
  // --------------------------------------------------

  const judge = await prisma.judge.upsert({
    where: {
      eventId_userId: {
        eventId: event.id,
        userId: judgeUser.id,
      },
    },
    update: {},
    create: {
      eventId: event.id,
      userId: judgeUser.id,
    },
  });

  // --------------------------------------------------
  // RUBRIC
  // --------------------------------------------------

  let rubric = await prisma.rubric.findFirst({
    where: {
      eventId: event.id,
      name: "Final Judging Rubric",
    },
  });

  if (!rubric) {
    rubric = await prisma.rubric.create({
      data: {
        name: "Final Judging Rubric",
        description: "Weighted final judging rubric.",
        eventId: event.id,
      },
    });
  }

  const criteriaData = [
    {
      name: "Innovation",
      description: "Originality and creativity of the solution.",
      weight: 25,
    },
    {
      name: "Technical Quality",
      description: "Implementation quality and technical execution.",
      weight: 25,
    },
    {
      name: "Impact & Usefulness",
      description: "Practical value and potential impact.",
      weight: 25,
    },
    {
      name: "UX / Presentation",
      description: "User experience and presentation quality.",
      weight: 15,
    },
    {
      name: "Completeness",
      description: "Overall completeness and readiness.",
      weight: 10,
    },
  ];

  const criteria = [];

  for (const item of criteriaData) {
    let criterion = await prisma.rubricCriterion.findFirst({
      where: {
        rubricId: rubric.id,
        name: item.name,
      },
    });

    if (!criterion) {
      criterion = await prisma.rubricCriterion.create({
        data: {
          name: item.name,
          description: item.description,
          weight: item.weight,
          maxScore: 10,
          rubricId: rubric.id,
        },
      });
    }

    criteria.push(criterion);
  }

  // --------------------------------------------------
  // JUDGE ASSIGNMENT
  // --------------------------------------------------

  await prisma.judgeAssignment.upsert({
    where: {
      judgeId_projectId: {
        judgeId: judge.id,
        projectId: project.id,
      },
    },
    update: {},
    create: {
      judgeId: judge.id,
      projectId: project.id,
    },
  });

    await prisma.judgeAssignment.upsert({
    where: {
      judgeId_projectId: {
        judgeId: judge.id,
        projectId: project2.id,
      },
    },
    update: {},
    create: {
      judgeId: judge.id,
      projectId: project2.id,
    },
  });

  // --------------------------------------------------
  // DEMO EVALUATION
  // --------------------------------------------------

  const evaluation = await prisma.evaluation.upsert({
    where: {
      judgeId_projectId: {
        judgeId: judge.id,
        projectId: project.id,
      },
    },
    update: {
      comment:
        "Good project with a clear implementation and useful fraud prevention concept.",
      submittedAt: new Date(),
    },
    create: {
      judgeId: judge.id,
      projectId: project.id,
      comment:
        "Good project with a clear implementation and useful fraud prevention concept.",
      submittedAt: new Date(),
    },
  });

  // 8.5/10, 9/10, 8.5/10, 9/10, 8/10
  // Weighted total = 86/100.
  const scores = [8.5, 9, 8.5, 9, 8];

  for (let i = 0; i < criteria.length; i++) {
    await prisma.evaluationScore.upsert({
      where: {
        evaluationId_criterionId: {
          evaluationId: evaluation.id,
          criterionId: criteria[i].id,
        },
      },
      update: {
        score: scores[i],
      },
      create: {
        evaluationId: evaluation.id,
        criterionId: criteria[i].id,
        score: scores[i],
      },
    });
  }

  // --------------------------------------------------
  // DEMO COMMUNITY VOTE
  // --------------------------------------------------

  await prisma.communityVote.upsert({
    where: {
      userId_projectId: {
        userId: participant2.id,
        projectId: project.id,
      },
    },
    update: {},
    create: {
      userId: participant2.id,
      projectId: project.id,
    },
  });

  console.log("Complete Dogfood demo data seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });