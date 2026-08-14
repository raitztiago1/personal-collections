"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { estoqueDaCarta } from "@/lib/domain/decks";

const CAMPO_CLASS =
  "mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base";

const ERRO_ESTOQUE =
  "A quantidade no deck não pode ser maior que a quantidade da carta no inventário.";

type CartaInventario = {
  id: string;
  nome: string;
  ficha: Record<string, unknown>;
};

export type DeckCartaUI = {
  itemId: string;
  quantidade: number;
};

export type DeckInicial = {
  nome: string;
  formato: string | null;
  notas: string | null;
  cartas: DeckCartaUI[];
};

export function DeckForm({
  deckId,
  inicial,
}: {
  deckId?: string;
  inicial?: DeckInicial;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [formato, setFormato] = useState(inicial?.formato ?? "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [cartas, setCartas] = useState<DeckCartaUI[]>(inicial?.cartas ?? []);
  const [escolhida, setEscolhida] = useState("");
  const [inventario, setInventario] = useState<CartaInventario[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const resposta = await fetch("/api/itens?tipoColecao=YUGIOH", {
          signal: ac.signal,
        });
        if (!resposta.ok) {
          throw new Error("Não foi possível carregar as cartas do inventário.");
        }
        const lista = (await resposta.json()) as CartaInventario[];
        if (!ac.signal.aborted) {
          setInventario(
            lista.map((item) => ({
              id: item.id,
              nome: item.nome,
              ficha: eObjeto(item.ficha) ? item.ficha : {},
            })),
          );
        }
      } catch (falha) {
        if (ac.signal.aborted) {
          return;
        }
        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar as cartas do inventário.",
        );
        setInventario([]);
      }
    })();
    return () => ac.abort();
  }, []);

  const porId = useMemo(() => {
    const mapa = new Map<string, CartaInventario>();
    for (const carta of inventario ?? []) {
      mapa.set(carta.id, carta);
    }
    return mapa;
  }, [inventario]);

  const disponiveis = (inventario ?? []).filter(
    (carta) => !cartas.some((linha) => linha.itemId === carta.id),
  );

  function adicionarCarta() {
    if (escolhida === "") {
      return;
    }
    const item = porId.get(escolhida);
    if (!item) {
      return;
    }
    setCartas((atual) => [...atual, { itemId: item.id, quantidade: 1 }]);
    setEscolhida("");
    setErro(null);
  }

  function atualizarQuantidade(itemId: string, bruto: string) {
    const quantidade = Number(bruto);
    setCartas((atual) =>
      atual.map((carta) =>
        carta.itemId === itemId
          ? {
              ...carta,
              quantidade: Number.isInteger(quantidade) ? quantidade : 0,
            }
          : carta,
      ),
    );
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const nomeLimpo = nome.trim();
    if (nomeLimpo === "") {
      setErro("O nome é obrigatório.");
      return;
    }

    for (const carta of cartas) {
      const item = porId.get(carta.itemId);
      const estoque = item ? estoqueDaCarta(item) : 1;
      if (!Number.isInteger(carta.quantidade) || carta.quantidade < 1) {
        setErro("A quantidade da carta deve ser no mínimo 1.");
        return;
      }
      if (carta.quantidade > estoque) {
        setErro(ERRO_ESTOQUE);
        return;
      }
    }

    const criando = !deckId;
    setOcupado(true);
    try {
      const resposta = await fetch(
        criando ? "/api/decks" : `/api/decks/${deckId}`,
        {
          method: criando ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: nomeLimpo,
            formato: formato.trim() === "" ? null : formato.trim(),
            notas: notas.trim() === "" ? null : notas.trim(),
            cartas,
          }),
        },
      );
      if (!resposta.ok) {
        setErro(await lerErro(resposta, "Não foi possível salvar o deck."));
        return;
      }
      if (criando) {
        const criado = (await resposta.json()) as { id: string };
        router.push(`/colecoes/yugioh/decks/${criado.id}`);
        return;
      }
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    if (!deckId) {
      return;
    }
    if (
      !window.confirm("Excluir este deck? Esta ação não pode ser desfeita.")
    ) {
      return;
    }
    setErro(null);
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/decks/${deckId}`, {
        method: "DELETE",
      });
      if (!resposta.ok) {
        setErro(await lerErro(resposta, "Não foi possível excluir o deck."));
        return;
      }
      router.push("/colecoes/yugioh/decks");
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
          <h2 className="text-sm font-semibold tracking-tight">Dados do deck</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="deck-nome" className="block text-sm font-medium">
                Nome
              </label>
              <input
                id="deck-nome"
                name="nome"
                required
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
            <div className="min-w-0">
              <label
                htmlFor="deck-formato"
                className="block text-sm font-medium"
              >
                Formato
              </label>
              <input
                id="deck-formato"
                name="formato"
                value={formato}
                onChange={(evento) => setFormato(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="deck-notas" className="block text-sm font-medium">
                Notas
              </label>
              <textarea
                id="deck-notas"
                name="notas"
                rows={3}
                value={notas}
                onChange={(evento) => setNotas(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Cartas</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Só cartas do seu inventário Yu-Gi-Oh!. A quantidade não pode passar
            do estoque.
          </p>

          {cartas.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">
              Nenhuma carta neste deck.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {cartas.map((carta) => {
                const item = porId.get(carta.itemId);
                const estoque = item ? estoqueDaCarta(item) : carta.quantidade;
                const nomeCarta = item?.nome ?? "Carta do inventário";
                return (
                  <li
                    key={carta.itemId}
                    className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3"
                  >
                    <p className="truncate font-medium">{nomeCarta}</p>
                    <p className="mt-0.5 text-sm text-zinc-600">
                      Estoque: {estoque}
                    </p>
                    <div className="mt-2 flex min-w-0 flex-wrap items-end gap-3">
                      <div className="min-w-0">
                        <label
                          htmlFor={`deck-qtd-${carta.itemId}`}
                          className="block text-sm font-medium"
                        >
                          Quantidade
                        </label>
                        <input
                          id={`deck-qtd-${carta.itemId}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          value={carta.quantidade}
                          onChange={(evento) =>
                            atualizarQuantidade(
                              carta.itemId,
                              evento.target.value,
                            )
                          }
                          className={CAMPO_CLASS}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCartas((atual) =>
                            atual.filter((linha) => linha.itemId !== carta.itemId),
                          )
                        }
                        className="text-sm font-medium text-red-800 underline"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 min-w-0 sm:flex sm:items-end sm:gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="deck-carta" className="block text-sm font-medium">
                Adicionar carta
              </label>
              <select
                id="deck-carta"
                value={escolhida}
                disabled={inventario === null || disponiveis.length === 0}
                onChange={(evento) => setEscolhida(evento.target.value)}
                className={CAMPO_CLASS}
              >
                <option value="">
                  {inventario === null
                    ? "Carregando inventário…"
                    : disponiveis.length === 0
                      ? "Nenhuma carta disponível"
                      : "Escolha uma carta"}
                </option>
                {disponiveis.map((carta) => (
                  <option key={carta.id} value={carta.id}>
                    {carta.nome} (estoque {estoqueDaCarta(carta)})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={escolhida === "" || ocupado}
              onClick={adicionarCarta}
              className="mt-3 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-60 sm:mt-0"
            >
              Adicionar
            </button>
          </div>
        </section>

        <div className="mt-6">
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {deckId ? "Salvar" : "Criar deck"}
          </button>
        </div>
      </form>

      {deckId ? (
        <section className="min-w-0 border-t border-zinc-200 pt-6">
          <h2 className="text-sm font-semibold tracking-tight">Excluir</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Remove o deck e as cartas associadas. Pedimos confirmação antes.
          </p>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void excluir()}
            className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 disabled:opacity-60"
          >
            Excluir deck
          </button>
        </section>
      ) : null}
    </div>
  );
}

function eObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
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
