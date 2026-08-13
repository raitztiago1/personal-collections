import { prisma } from "@/lib/db";
import {
  depsFotos,
  enviarFoto,
  responderErroFoto,
} from "@/lib/fotos";
import { HttpErro } from "@/lib/isolamento";
import { requireUser } from "@/lib/session";

const deps = depsFotos(prisma);

export async function POST(request: Request) {
  try {
    const { id } = await requireUser();
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) {
      throw new HttpErro(400, "O arquivo é obrigatório.");
    }
    const foto = await enviarFoto(
      id,
      {
        donoTipo: form.get("donoTipo"),
        donoId: form.get("donoId"),
        isCapa: form.get("isCapa"),
        arquivo: {
          bytes: new Uint8Array(await arquivo.arrayBuffer()),
          mime: arquivo.type,
        },
      },
      deps,
    );
    return Response.json(foto, { status: 201 });
  } catch (erro) {
    return responderErroFoto(erro);
  }
}
