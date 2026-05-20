import { NextResponse } from "next/server";
import { prisma, DraftStatus } from "@arena/db";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { action, body } = (await req.json()) as {
    action: "approve" | "discard";
    body?: string;
  };

  const status = action === "approve" ? DraftStatus.APPROVED : DraftStatus.DISCARDED;

  const updated = await prisma.draft.update({
    where: { id },
    data: { status, ...(body !== undefined ? { body } : {}) },
  });

  return NextResponse.json(updated);
}
