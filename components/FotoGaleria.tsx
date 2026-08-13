"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type FotoResumo = {
  id: string;
  isCapa: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp";
const MIMES_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FOTOS_POR_DONO = 12;
const TAMANHO_MAX_BYTES = 10 * 1024 * 1024;

export function FotoGaleria({
  donoId,
  fotosIniciais,
}: {
  donoId: string;
  fotosIniciais: FotoResumo[];
}) {
  const router = useRouter();
  const fotos = fotosIniciais;
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(arquivo: File) {
    setErro(null);
    if (fotos.length >= MAX_FOTOS_POR_DONO) {
      setErro("Limite de 12 fotos por item.");
      return;
    }
    if (!(MIMES_PERMITIDOS as readonly string[]).includes(arquivo.type)) {
      setErro("Use jpeg, png ou webp.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX_BYTES) {
      setErro("O arquivo excede 10 MB.");
      return;
    }

    const form = new FormData();
    form.set("arquivo", arquivo);
    form.set("donoTipo", "ITEM");
    form.set("donoId", donoId);
    if (fotos.length === 0) {
      form.set("isCapa", "true");
    }

    setOcupado(true);
    try {
      const resposta = await fetch("/api/fotos", { method: "POST", body: form });
      if (!resposta.ok) {
        setErro(await lerErro(resposta, "Não foi possível enviar a foto."));
        return;
      }
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function marcarCapa(id: string) {
    setErro(null);
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/fotos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCapa: true }),
      });
      if (!resposta.ok) {
        setErro(await lerErro(resposta, "Não foi possível marcar a capa."));
        return;
      }
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function apagar(id: string) {
    if (!window.confirm("Excluir esta foto?")) {
      return;
    }
    setErro(null);
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/fotos/${id}`, { method: "DELETE" });
      if (!resposta.ok) {
        setErro(await lerErro(resposta, "Não foi possível excluir a foto."));
        return;
      }
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="min-w-0">
      <h2 className="text-sm font-semibold tracking-tight">Fotos</h2>
      {erro ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      ) : null}

      {fotos.length === 0 ? (
        <div className="mt-3 flex min-h-32 min-w-0 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-100 px-4 text-center text-sm text-zinc-600">
          Sem fotos. Envie jpeg, png ou webp (até 12).
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((foto) => (
            <li
              key={foto.id}
              className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/fotos/${foto.id}`}
                alt=""
                className="aspect-square w-full object-cover"
              />
              <div className="flex min-w-0 flex-col gap-1 p-2">
                {foto.isCapa ? (
                  <span className="text-xs font-medium text-zinc-800">Capa</span>
                ) : (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void marcarCapa(foto.id)}
                    className="text-left text-xs font-medium text-zinc-800 underline"
                  >
                    Definir capa
                  </button>
                )}
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void apagar(foto.id)}
                  className="text-left text-xs text-red-700 underline"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-3 block min-w-0">
        <span className="block text-sm font-medium">Enviar foto</span>
        <input
          type="file"
          accept={ACCEPT}
          disabled={ocupado || fotos.length >= MAX_FOTOS_POR_DONO}
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0];
            evento.target.value = "";
            if (arquivo) {
              void enviar(arquivo);
            }
          }}
          className="mt-1 w-full min-w-0 text-sm"
        />
      </label>
    </section>
  );
}

async function lerErro(resposta: Response, fallback: string): Promise<string> {
  try {
    const corpo: unknown = await resposta.json();
    if (
      corpo !== null &&
      typeof corpo === "object" &&
      "erro" in corpo &&
      typeof corpo.erro === "string"
    ) {
      return corpo.erro;
    }
  } catch {
    /* corpo vazio */
  }
  return fallback;
}
