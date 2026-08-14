"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TipoColecaoItem } from "@/lib/domain/colecoes";
import {
  hrefItemColecao,
  montarQueryBusca,
  rotuloTipoColecao,
  valoresChaveLista,
} from "@/lib/query-filtros";

type ResultadoBusca = {
  id: string;
  tipoColecao: TipoColecaoItem;
  nome: string;
  capa: string | null;
};

type ItemComFicha = ResultadoBusca & {
  ficha: Record<string, unknown>;
};

type BuildResumo = {
  id: string;
  nome: string;
};

type DeckResumo = {
  id: string;
  nome: string;
};

type ListaItensProps =
  | { modo: "global"; q: string }
  | {
      modo: "colecao";
      tipoColecao: TipoColecaoItem;
      q: string;
      filtros: Record<string, string>;
    }
  | { modo: "builds" }
  | { modo: "decks" }
  | { modo: "wishlist"; tipoColecao: TipoColecaoItem; slug: string };

type EstadoLista =
  | { status: "carregando" }
  | { status: "erro"; mensagem: string }
  | { status: "itens"; itens: ItemComFicha[] }
  | { status: "builds"; builds: BuildResumo[] }
  | { status: "decks"; decks: DeckResumo[] };

export function ListaItens(props: ListaItensProps) {
  const chave =
    props.modo === "builds"
      ? "builds"
      : props.modo === "decks"
        ? "decks"
        : props.modo === "wishlist"
          ? `wishlist:${props.tipoColecao}`
          : `${props.modo}:${montarQueryBusca({
              q: props.q,
              tipoColecao: props.modo === "colecao" ? props.tipoColecao : undefined,
              filtros: props.modo === "colecao" ? props.filtros : undefined,
            })}`;

  return <ListaItensInterna key={chave} {...props} />;
}

function ListaItensInterna(props: ListaItensProps) {
  const [estado, setEstado] = useState<EstadoLista>({ status: "carregando" });
  const [buscaSetup, setBuscaSetup] = useState("");
  const modo = props.modo;
  const tipoColecao =
    modo === "colecao" || modo === "wishlist" ? props.tipoColecao : undefined;
  const queryBusca =
    modo === "builds" || modo === "decks" || modo === "wishlist"
      ? ""
      : montarQueryBusca({
          q: props.q,
          tipoColecao,
          filtros: modo === "colecao" ? props.filtros : undefined,
        });

  useEffect(() => {
    const ac = new AbortController();

    void (async () => {
      try {
        if (modo === "wishlist" && tipoColecao) {
          const lista = await lerJson<ItemComFicha[]>(
            await fetch(
              `/api/wishlist?tipoColecao=${encodeURIComponent(tipoColecao)}`,
              { signal: ac.signal },
            ),
          );
          if (!ac.signal.aborted) {
            setEstado({
              status: "itens",
              itens: lista.map((item) => ({
                id: item.id,
                tipoColecao: item.tipoColecao,
                nome: item.nome,
                capa: null,
                ficha: eObjeto(item.ficha) ? item.ficha : {},
              })),
            });
          }
          return;
        }

        if (modo === "builds") {
          const lista = await lerJson<BuildResumo[]>(
            await fetch("/api/builds", { signal: ac.signal }),
          );
          if (!ac.signal.aborted) {
            setEstado({
              status: "builds",
              builds: lista.map((build) => ({ id: build.id, nome: build.nome })),
            });
          }
          return;
        }

        if (modo === "decks") {
          const lista = await lerJson<DeckResumo[]>(
            await fetch("/api/decks", { signal: ac.signal }),
          );
          if (!ac.signal.aborted) {
            setEstado({
              status: "decks",
              decks: lista.map((deck) => ({ id: deck.id, nome: deck.nome })),
            });
          }
          return;
        }

        const resultados = await lerJson<ResultadoBusca[]>(
          await fetch(`/api/busca?${queryBusca}`, { signal: ac.signal }),
        );

        let fichas = new Map<string, Record<string, unknown>>();
        if (tipoColecao) {
          const todos = await lerJson<{ id: string; ficha?: unknown }[]>(
            await fetch(
              `/api/itens?tipoColecao=${encodeURIComponent(tipoColecao)}`,
              { signal: ac.signal },
            ),
          );
          fichas = new Map(
            todos.map((item) => [
              item.id,
              eObjeto(item.ficha) ? item.ficha : {},
            ]),
          );
        }

        if (!ac.signal.aborted) {
          setEstado({
            status: "itens",
            itens: resultados.map((item) => ({
              ...item,
              ficha: fichas.get(item.id) ?? {},
            })),
          });
        }
      } catch (falha) {
        if (ac.signal.aborted) {
          return;
        }
        setEstado({
          status: "erro",
          mensagem:
            falha instanceof Error
              ? falha.message
              : "Não foi possível carregar a lista.",
        });
      }
    })();

    return () => ac.abort();
  }, [modo, queryBusca, tipoColecao]);

  if (estado.status === "carregando") {
    return <p className="mt-4 text-sm text-zinc-600">Carregando…</p>;
  }

  if (estado.status === "erro") {
    return (
      <p className="mt-4 text-sm text-red-700" role="alert">
        {estado.mensagem}
      </p>
    );
  }

  if (estado.status === "builds") {
    const termo = buscaSetup.trim().toLocaleLowerCase("pt-BR");
    const filtrados =
      termo === ""
        ? estado.builds
        : estado.builds.filter((build) =>
            build.nome.toLocaleLowerCase("pt-BR").includes(termo),
          );

    return (
      <div className="mt-4 min-w-0">
        <label htmlFor="busca-setup" className="block text-sm font-medium">
          Buscar setup
        </label>
        <input
          id="busca-setup"
          type="search"
          value={buscaSetup}
          onChange={(evento) => setBuscaSetup(evento.target.value)}
          placeholder="Nome do setup"
          className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base"
        />
        {estado.builds.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">Nenhum setup cadastrado.</p>
        ) : filtrados.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            Nenhum setup encontrado com esse nome.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3">
            {filtrados.map((build) => (
              <li key={build.id} className="min-w-0">
                <Link
                  href={`/colecoes/pc-builds/${build.id}`}
                  className="block min-w-0 truncate rounded-xl border border-zinc-200 bg-white p-4 font-medium"
                >
                  {build.nome}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (estado.status === "decks") {
    if (estado.decks.length === 0) {
      return (
        <p className="mt-4 text-sm text-zinc-600">Nenhum deck cadastrado.</p>
      );
    }
    return (
      <ul className="mt-4 grid grid-cols-1 gap-3">
        {estado.decks.map((deck) => (
          <li key={deck.id} className="min-w-0">
            <Link
              href={`/colecoes/yugioh/decks/${deck.id}`}
              className="block min-w-0 truncate rounded-xl border border-zinc-200 bg-white p-4 font-medium"
            >
              {deck.nome}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  if (estado.itens.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-600">
        {props.modo === "wishlist"
          ? "Nenhum item na wishlist."
          : "Nenhum item encontrado no inventário."}
      </p>
    );
  }

  return (
    <ul className="mt-4 grid grid-cols-1 gap-3">
      {estado.itens.map((item) => {
        const campos =
          props.modo === "colecao" || props.modo === "wishlist"
            ? valoresChaveLista(item.tipoColecao, item.ficha)
            : [];
        const capaUrl = item.capa ? `/api/fotos/${item.capa}` : null;
        const href =
          props.modo === "wishlist"
            ? `/colecoes/${props.slug}/wishlist/${item.id}`
            : hrefItemColecao(item.tipoColecao, item.id);

        return (
          <li key={item.id} className="min-w-0">
            <Link
              href={href}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3"
            >
              {props.modo === "wishlist" ? null : capaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={capaUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-center text-[10px] leading-tight text-zinc-600">
                  Sem capa
                </div>
              )}
              <div className="min-w-0 flex-1">
                {props.modo === "global" ? (
                  <p className="truncate text-xs text-zinc-600">
                    {rotuloTipoColecao(item.tipoColecao)}
                  </p>
                ) : null}
                <p className="truncate font-medium">{item.nome}</p>
                {campos.length > 0 ? (
                  <p className="mt-0.5 truncate text-sm text-zinc-600">
                    {campos
                      .map((campo) => `${campo.rotulo}: ${campo.valor}`)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

async function lerJson<T>(resposta: Response): Promise<T> {
  const corpo: unknown = await resposta.json();
  if (!resposta.ok) {
    const mensagem =
      eObjeto(corpo) && typeof corpo.erro === "string"
        ? corpo.erro
        : "Não foi possível carregar a lista.";
    throw new Error(mensagem);
  }
  return corpo as T;
}

function eObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}
