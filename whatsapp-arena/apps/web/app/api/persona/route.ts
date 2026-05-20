import { NextResponse } from "next/server";
import { prisma } from "@arena/db";

export async function PUT(req: Request) {
  const { about, voice } = (await req.json()) as { about: string; voice: string };

  const persona = await prisma.persona.upsert({
    where: { id: 1 },
    create: { id: 1, about, voice },
    update: { about, voice },
  });

  return NextResponse.json(persona);
}
