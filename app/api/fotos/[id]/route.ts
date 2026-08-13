import { prisma } from "@/lib/db";
import {
  apagarFoto,
  depsFotos,
  marcarCapa,
  responderErroFoto,
  respostaGetFoto,
} from "@/lib/fotos";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const deps = depsFotos(prisma);

type ContextoRota = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    return respostaGetFoto(usuarioId, id, deps);
  } catch (erro) {
    return responderErroFoto(erro);
  }
}

export async function PATCH(request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    const payload = await lerCorpo(request);
    if (payload.isCapa !== true) {
      throw new HttpErro(400, "Informe isCapa: true para marcar a capa.");
    }
    const foto = await marcarCapa(usuarioId, id, deps);
    return Response.json(foto);
  } catch (erro) {
    return responderErroFoto(erro);
  }
}

export async function DELETE(_request: Request, contexto: ContextoRota) {
  try {
    const { id: usuarioId } = await requireUser();
    const { id } = await contexto.params;
    await apagarFoto(usuarioId, id, deps);
    return new Response(null, { status: 204 });
  } catch (erro) {
    return responderErroFoto(erro);
  }
}

async function lerCorpo(request: Request): Promise<{ isCapa?: unknown }> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new HttpErro(400, "JSON inválido.");
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpErro(400, "JSON inválido.");
  }
  return payload as { isCapa?: unknown };
}
