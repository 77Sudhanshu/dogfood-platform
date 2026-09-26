import { requireRole } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["ADMIN"]);

  if (!auth.authorized) {
    return NextResponse.json(
      {
        error:
          auth.status === 401
            ? "Not authenticated"
            : "Forbidden",
      },
      { status: auth.status }
    );
  }

  return NextResponse.json({
    message: "Admin access granted",
    user: auth.user,
  });
}