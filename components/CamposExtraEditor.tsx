"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TipoColecao } from "@/lib/domain/colecoes";

type Definicao = {
  id: string;
  nome: string;
  tipoValor: "TEXTO" | "NUMERO";
};

const CAMPO_CLASS =
  "mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base";

export function CamposExtraEditor({
  tipoColecao,
}: {
  tipoColecao: TipoColecao;
}) {
  const router = useRouter();
  const [definicoes, setDefinicoes] = useState<Definicao[]>([]);
  const [nome, setNome] = useState("");
  const [tipoValor, setTipoValor] = useState<"TEXTO" | "NUMERO">("TEXTO");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const resposta = await fetch(
          `/api/campos-extra?tipoColecao=${encodeURIComponent(tipoColecao)}`,
          { signal: ac.signal },
        );
        const lista = await lerJson<Definicao[]>(
          resposta,
          "Não foi possível carregar os campos extras.",
        );
        if (!ac.signal.aborted) {
          setDefinicoes(lista);
        }
      } catch (falha) {
        if (ac.signal.aborted) {
          return;
        }
        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar os campos extras.",
        );
      }
    })();
    return () => ac.abort();
  }, [tipoColecao]);

  async function adicionar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const nomeLimpo = nome.trim();
    if (nomeLimpo === "") {
      setErro("O nome é obrigatório.");
      return;
    }
    setOcupado(true);
    try {
      const resposta = await fetch("/api/campos-extra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoColecao, nome: nomeLimpo, tipoValor }),
      });
      const criada = await lerJson<Definicao>(
        resposta,
        "Não foi possível adicionar o campo extra.",
      );
      setDefinicoes((atual) =>
        [...atual, criada].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      );
      setNome("");
      setTipoValor("TEXTO");
      router.refresh();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível adicionar o campo extra.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function salvarDefinicao(definicao: Definicao) {
    setErro(null);
    const nomeLimpo = definicao.nome.trim();
    if (nomeLimpo === "") {
      setErro("O nome é obrigatório.");
      return;
    }
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/campos-extra/${definicao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeLimpo, tipoValor: definicao.tipoValor }),
      });
      const atualizada = await lerJson<Definicao>(
        resposta,
        "Não foi possível salvar o campo extra.",
      );
      setDefinicoes((atual) =>
        atual
          .map((item) => (item.id === atualizada.id ? atualizada : item))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      );
      router.refresh();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar o campo extra.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function remover(id: string) {
    if (
      !window.confirm(
        "Remover este campo extra e os valores preenchidos? Esta ação não pode ser desfeita.",
      )
    ) {
      return;
    }
    setErro(null);
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/campos-extra/${id}`, {
        method: "DELETE",
      });
      if (!resposta.ok) {
        throw new Error(
          await lerErro(resposta, "Não foi possível remover o campo extra."),
        );
      }
      setDefinicoes((atual) => atual.filter((item) => item.id !== id));
      router.refresh();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível remover o campo extra.",
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="mt-10 min-w-0 border-t border-zinc-200 pt-6">
      <h2 className="text-sm font-semibold tracking-tight">Campos extras</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Defina campos de texto ou número para esta coleção. Eles aparecem depois
        da ficha em cada item e na wishlist.
      </p>

      {erro ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {erro}
        </p>
      ) : null}

      {definicoes.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">Nenhum campo extra ainda.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {definicoes.map((definicao) => (
            <li
              key={definicao.id}
              className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label
                    htmlFor={`extra-nome-${definicao.id}`}
                    className="block text-sm font-medium"
                  >
                    Nome
                  </label>
                  <input
                    id={`extra-nome-${definicao.id}`}
                    value={definicao.nome}
                    onChange={(evento) =>
                      setDefinicoes((atual) =>
                        atual.map((item) =>
                          item.id === definicao.id
                            ? { ...item, nome: evento.target.value }
                            : item,
                        ),
                      )
                    }
                    className={CAMPO_CLASS}
                  />
                </div>
                <div className="min-w-0">
                  <label
                    htmlFor={`extra-tipo-${definicao.id}`}
                    className="block text-sm font-medium"
                  >
                    Tipo
                  </label>
                  <select
                    id={`extra-tipo-${definicao.id}`}
                    value={definicao.tipoValor}
                    onChange={(evento) =>
                      setDefinicoes((atual) =>
                        atual.map((item) =>
                          item.id === definicao.id
                            ? {
                                ...item,
                                tipoValor: evento.target.value as
                                  | "TEXTO"
                                  | "NUMERO",
                              }
                            : item,
                        ),
                      )
                    }
                    className={CAMPO_CLASS}
                  >
                    <option value="TEXTO">Texto</option>
                    <option value="NUMERO">Número</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void salvarDefinicao(definicao)}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void remover(definicao.id)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-800 disabled:opacity-60"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(evento) => void adicionar(evento)} className="mt-6 min-w-0">
        <h3 className="text-sm font-medium">Novo campo</h3>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="extra-novo-nome" className="block text-sm font-medium">
              Nome
            </label>
            <input
              id="extra-novo-nome"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              className={CAMPO_CLASS}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="extra-novo-tipo" className="block text-sm font-medium">
              Tipo
            </label>
            <select
              id="extra-novo-tipo"
              value={tipoValor}
              onChange={(evento) =>
                setTipoValor(evento.target.value as "TEXTO" | "NUMERO")
              }
              className={CAMPO_CLASS}
            >
              <option value="TEXTO">Texto</option>
              <option value="NUMERO">Número</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={ocupado}
          className="mt-3 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          Adicionar campo
        </button>
      </form>
    </section>
  );
}

async function lerJson<T>(resposta: Response, fallback: string): Promise<T> {
  if (resposta.status === 204) {
    return undefined as T;
  }
  const corpo: unknown = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error(mensagemErro(corpo, fallback));
  }
  return corpo as T;
}

async function lerErro(resposta: Response, fallback: string): Promise<string> {
  try {
    return mensagemErro(await resposta.json(), fallback);
  } catch {
    return fallback;
  }
}

function mensagemErro(corpo: unknown, fallback: string): string {
  if (
    corpo !== null &&
    typeof corpo === "object" &&
    "erro" in corpo &&
    typeof corpo.erro === "string"
  ) {
    return corpo.erro;
  }
  return fallback;
}
