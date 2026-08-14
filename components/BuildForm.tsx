"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { pecasMudaram } from "@/lib/domain/pecas-iguais";
import { FotoGaleria, type FotoResumo } from "./FotoGaleria";
import {
  montarPecaPayload,
  pecaDeServidor,
  pecaRascunhoVazio,
  PecaForm,
  type PecaPayload,
  type PecaRascunho,
  type PecaResumo,
} from "./PecaForm";

const CAMPO_CLASS =
  "mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base";

export type BuildInicial = {
  nome: string;
  descricao: string | null;
  notasPessoais: string | null;
  pecas: PecaResumo[];
};

export function BuildForm({
  buildId,
  inicial,
  fotosBuild = [],
  fotosPecas = {},
}: {
  buildId?: string;
  inicial?: BuildInicial;
  fotosBuild?: FotoResumo[];
  fotosPecas?: Record<string, FotoResumo[]>;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [notasPessoais, setNotasPessoais] = useState(
    inicial?.notasPessoais ?? "",
  );
  const [pecas, setPecas] = useState<PecaRascunho[]>(() =>
    (inicial?.pecas ?? []).map(pecaDeServidor),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function atualizarPeca(indice: number, valor: PecaRascunho) {
    setPecas((atual) => atual.map((peca, i) => (i === indice ? valor : peca)));
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const nomeLimpo = nome.trim();
    if (nomeLimpo === "") {
      setErro("O nome é obrigatório.");
      return;
    }

    let pecasPayload: PecaPayload[];
    try {
      pecasPayload = pecas.map(montarPecaPayload);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Peças inválidas.");
      return;
    }

    const criando = !buildId;
    const payload: Record<string, unknown> = {
      nome: nomeLimpo,
      descricao: descricao.trim() === "" ? null : descricao.trim(),
      notasPessoais:
        notasPessoais.trim() === "" ? null : notasPessoais.trim(),
    };

    if (criando || pecasMudaram(inicial?.pecas ?? [], pecasPayload)) {
      payload.pecas = pecasPayload;
    }

    setOcupado(true);
    try {
      const resposta = await fetch(
        criando ? "/api/builds" : `/api/builds/${buildId}`,
        {
          method: criando ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!resposta.ok) {
        setErro(await lerErro(resposta, "Não foi possível salvar o setup."));
        return;
      }
      if (criando) {
        const criado = (await resposta.json()) as { id: string };
        router.push(`/colecoes/pc-builds/${criado.id}`);
        return;
      }
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    if (!buildId) {
      return;
    }
    if (
      !window.confirm(
        "Excluir este setup? Esta ação não pode ser desfeita.",
      )
    ) {
      return;
    }
    setErro(null);
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/builds/${buildId}`, {
        method: "DELETE",
      });
      if (!resposta.ok) {
        setErro(await lerErro(resposta, "Não foi possível excluir o setup."));
        return;
      }
      router.push("/colecoes/pc-builds");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mt-6 min-w-0 space-y-8">
      <form onSubmit={(evento) => void salvar(evento)} className="min-w-0">
        {erro ? (
          <p className="mb-4 text-sm text-red-700" role="alert">
            {erro}
          </p>
        ) : null}

        <section className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Dados do setup</h2>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div className="min-w-0">
              <label htmlFor="build-nome" className="block text-sm font-medium">
                Nome
              </label>
              <input
                id="build-nome"
                name="nome"
                required
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
            <div className="min-w-0">
              <label
                htmlFor="build-descricao"
                className="block text-sm font-medium"
              >
                Descrição
              </label>
              <textarea
                id="build-descricao"
                name="descricao"
                rows={3}
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
            <div className="min-w-0">
              <label
                htmlFor="build-notas"
                className="block text-sm font-medium"
              >
                Notas pessoais
              </label>
              <textarea
                id="build-notas"
                name="notasPessoais"
                rows={3}
                value={notasPessoais}
                onChange={(evento) => setNotasPessoais(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Peças</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Peças tipadas deste setup. Gadgets avulsos ficam na coleção Gadgets.
          </p>
          <div className="mt-3 space-y-3">
            {pecas.map((peca, indice) => (
              <PecaForm
                key={peca.chave}
                valor={peca}
                disabled={ocupado}
                onChange={(valor) => atualizarPeca(indice, valor)}
                onRemove={() =>
                  setPecas((atual) => atual.filter((_, i) => i !== indice))
                }
              />
            ))}
          </div>
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              setPecas((atual) => [
                ...atual,
                pecaRascunhoVazio(`nova-${atual.length}-${Date.now()}`),
              ])
            }
            className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            Adicionar peça
          </button>
        </section>

        <div className="mt-6">
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {buildId ? "Salvar" : "Criar setup"}
          </button>
        </div>
      </form>

      {buildId ? (
        <>
          <FotoGaleria
            donoId={buildId}
            fotosIniciais={fotosBuild}
            donoTipo="BUILD"
          />
          {(inicial?.pecas ?? []).length > 0 ? (
            <section className="min-w-0 space-y-4">
              <h2 className="text-sm font-semibold tracking-tight">
                Fotos das peças
              </h2>
              <p className="text-sm text-zinc-600">
                Salve as peças antes de enviar fotos. Alterar e salvar a lista
                de peças gera novos identificadores.
              </p>
              {(inicial?.pecas ?? []).map((peca) => (
                <div key={peca.id} className="min-w-0">
                  <h3 className="text-sm font-medium">{peca.nome}</h3>
                  <FotoGaleria
                    donoId={peca.id}
                    fotosIniciais={fotosPecas[peca.id] ?? []}
                    donoTipo="PECA"
                  />
                </div>
              ))}
            </section>
          ) : (
            <p className="text-sm text-zinc-600">
              Salve as peças para enviar fotos de cada uma.
            </p>
          )}
        </>
      ) : (
        <section className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Fotos</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Salve o setup para enviar fotos do build e das peças.
          </p>
        </section>
      )}

      {buildId ? (
        <section className="min-w-0 border-t border-zinc-200 pt-6">
          <h2 className="text-sm font-semibold tracking-tight">Excluir</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Remove o setup, as peças e as fotos. Pedimos confirmação antes.
          </p>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void excluir()}
            className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 disabled:opacity-60"
          >
            Excluir setup
          </button>
        </section>
      ) : null}
    </div>
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
