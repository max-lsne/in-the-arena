import { prisma } from "@arena/db";
import { PersonaForm } from "../../components/PersonaForm";

export const dynamic = "force-dynamic";

export default async function PersonaPage() {
  const persona = await prisma.persona.findUnique({ where: { id: 1 } });
  return (
    <div>
      <h1>Persona</h1>
      <p>The AI uses this to draft replies in your voice.</p>
      <PersonaForm
        about={persona?.about ?? ""}
        voice={persona?.voice ?? ""}
      />
    </div>
  );
}
