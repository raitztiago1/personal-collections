"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TipoColecaoItem } from "@/lib/domain/colecoes";
import {
  camposFichaUI,
  type CampoFichaUI,
} from "@/lib/domain/rotulos-ficha";
import { FotoGaleria, type FotoResumo } from "./FotoGaleria";

const CAMPO_CLASS =
  "mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base";

const TEXTOS_LONGOS = new Set([
  "notas_degustacao",
  "notas_topo",
  "notas_coracao",
  "notas_base",
  "acessorios",
  "colaboracao",
]);

export type ValoresIniciaisItem = {
  nome: string;
  descricao: string | null;
  notasPessoais: string | null;
  dataAquisicao: string | null;
  precoPago: number | null;
  tags: string[];
  ficha: Record<string, unknown>;
};

export function FichaForm({
  tipoColecao,
  slug,
  itemId,
  inicial,
  fotosIniciais = [],
}: {
  tipoColecao: TipoColecaoItem;
  slug: string;
  itemId?: string;
  inicial?: ValoresIniciaisItem;
  fotosIniciais?: FotoResumo[];
}) {
  const router = useRouter();
  const campos = camposFichaUI(tipoColecao);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [notasPessoais, setNotasPessoais] = useState(
    inicial?.notasPessoais ?? "",
  );
  const [dataAquisicao, setDataAquisicao] = useState(
    dataParaInput(inicial?.dataAquisicao),
  );
  const [precoPago, setPrecoPago] = useState(
    inicial?.precoPago === null || inicial?.precoPago === undefined
      ? ""
      : String(inicial.precoPago),
  );
  const [tags, setTags] = useState((inicial?.tags ?? []).join(", "));
  const [ficha, setFicha] = useState<Record<string, string>>(() =>
    estadoFicha(campos, inicial?.ficha ?? {}),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function atualizarFicha(campo: string, valor: string) {
    setFicha((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const nomeLimpo = nome.trim();
    if (nomeLimpo === "") {
      setErro("O nome é obrigatório.");
      return;
    }

    let fichaPayload: Record<string, unknown>;
    let preco: number | null;
    try {
      fichaPayload = montarFicha(campos, ficha);
      preco = montarPreco(precoPago);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Dados inválidos.");
      return;
    }

    const payload: Record<string, unknown> = {
      nome: nomeLimpo,
      descricao: descricao.trim() === "" ? null : descricao.trim(),
      notasPessoais:
        notasPessoais.trim() === "" ? null : notasPessoais.trim(),
      dataAquisicao: dataAquisicao === "" ? null : dataAquisicao,
      precoPago: preco,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      ficha: fichaPayload,
    };

    const criando = !itemId;
    if (criando) {
      payload.tipoColecao = tipoColecao;
    }

    setOcupado(true);
    try {
      const resposta = await fetch(
        criando ? "/api/itens" : `/api/itens/${itemId}`,
        {
          method: criando ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!resposta.ok) {
        setErro(await lerErro(resposta, "Não foi possível salvar o item."));
        return;
      }
      if (criando) {
        const criado = (await resposta.json()) as { id: string };
        router.push(`/colecoes/${slug}/itens/${criado.id}`);
        return;
      }
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    if (!itemId) {
      return;
    }
    if (!window.confirm("Excluir este item? Esta ação não pode ser desfeita.")) {
      return;
    }
    setErro(null);
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/itens/${itemId}`, {
        method: "DELETE",
      });
      if (resposta.status === 409) {
        setErro(await lerErro(resposta, "Não é possível excluir este item."));
        return;
      }
      if (!resposta.ok) {
        setErro(await lerErro(resposta, "Não foi possível excluir o item."));
        return;
      }
      router.push(`/colecoes/${slug}`);
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
          <h2 className="text-sm font-semibold tracking-tight">Dados gerais</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="item-nome" className="block text-sm font-medium">
                Nome
              </label>
              <input
                id="item-nome"
                name="nome"
                required
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
            <div className="min-w-0 sm:col-span-2">
              <label
                htmlFor="item-descricao"
                className="block text-sm font-medium"
              >
                Descrição
              </label>
              <textarea
                id="item-descricao"
                name="descricao"
                rows={3}
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
            <div className="min-w-0 sm:col-span-2">
              <label
                htmlFor="item-notas"
                className="block text-sm font-medium"
              >
                Notas pessoais
              </label>
              <textarea
                id="item-notas"
                name="notasPessoais"
                rows={3}
                value={notasPessoais}
                onChange={(evento) => setNotasPessoais(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="item-data" className="block text-sm font-medium">
                Data de aquisição
              </label>
              <input
                id="item-data"
                name="dataAquisicao"
                type="date"
                value={dataAquisicao}
                onChange={(evento) => setDataAquisicao(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="item-preco" className="block text-sm font-medium">
                Preço pago
              </label>
              <input
                id="item-preco"
                name="precoPago"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={precoPago}
                onChange={(evento) => setPrecoPago(evento.target.value)}
                className={CAMPO_CLASS}
              />
            </div>
            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="item-tags" className="block text-sm font-medium">
                Tags
              </label>
              <input
                id="item-tags"
                name="tags"
                value={tags}
                onChange={(evento) => setTags(evento.target.value)}
                placeholder="separadas por vírgula"
                className={CAMPO_CLASS}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Ficha</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {campos.map((campo) => (
              <CampoFicha
                key={campo.campo}
                campo={campo}
                valor={ficha[campo.campo] ?? ""}
                onChange={(valor) => atualizarFicha(campo.campo, valor)}
              />
            ))}
          </div>
        </section>

        <div className="mt-6">
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {itemId ? "Salvar" : "Criar item"}
          </button>
        </div>
      </form>

      {itemId ? (
        <FotoGaleria donoId={itemId} fotosIniciais={fotosIniciais} />
      ) : (
        <section className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Fotos</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Salve o item para enviar fotos.
          </p>
        </section>
      )}

      {itemId ? (
        <section className="min-w-0 border-t border-zinc-200 pt-6">
          <h2 className="text-sm font-semibold tracking-tight">Excluir</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Remove o item e as fotos. Pedimos confirmação antes.
          </p>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void excluir()}
            className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 disabled:opacity-60"
          >
            Excluir item
          </button>
        </section>
      ) : null}
    </div>
  );
}

function CampoFicha({
  campo,
  valor,
  onChange,
}: {
  campo: CampoFichaUI;
  valor: string;
  onChange: (valor: string) => void;
}) {
  const id = `ficha-${campo.campo}`;
  const longo = TEXTOS_LONGOS.has(campo.campo);
  const colSpan = longo ? "min-w-0 sm:col-span-2" : "min-w-0";

  return (
    <div className={colSpan}>
      <label htmlFor={id} className="block text-sm font-medium">
        {campo.rotulo}
      </label>
      {campo.tipo === "enum" && campo.opcoes ? (
        <select
          id={id}
          name={campo.campo}
          value={valor}
          onChange={(evento) => onChange(evento.target.value)}
          className={CAMPO_CLASS}
        >
          <option value="">—</option>
          {campo.opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      ) : longo ? (
        <textarea
          id={id}
          name={campo.campo}
          rows={3}
          value={valor}
          onChange={(evento) => onChange(evento.target.value)}
          className={CAMPO_CLASS}
        />
      ) : (
        <input
          id={id}
          name={campo.campo}
          type={campo.tipo === "texto" ? "text" : "number"}
          inputMode={
            campo.tipo === "inteiro"
              ? "numeric"
              : campo.tipo === "decimal"
                ? "decimal"
                : undefined
          }
          step={campo.tipo === "inteiro" ? "1" : campo.tipo === "decimal" ? "any" : undefined}
          value={valor}
          onChange={(evento) => onChange(evento.target.value)}
          className={CAMPO_CLASS}
        />
      )}
    </div>
  );
}

function estadoFicha(
  campos: CampoFichaUI[],
  ficha: Record<string, unknown>,
): Record<string, string> {
  const estado: Record<string, string> = {};
  for (const campo of campos) {
    const bruto = ficha[campo.campo];
    estado[campo.campo] =
      bruto === undefined || bruto === null ? "" : String(bruto);
  }
  return estado;
}

function montarFicha(
  campos: CampoFichaUI[],
  estado: Record<string, string>,
): Record<string, unknown> {
  const ficha: Record<string, unknown> = {};
  for (const campo of campos) {
    const bruto = estado[campo.campo]?.trim() ?? "";
    if (bruto === "") {
      continue;
    }
    if (campo.tipo === "inteiro" || campo.tipo === "decimal") {
      const numero = Number(bruto);
      if (!Number.isFinite(numero)) {
        throw new Error(`${campo.rotulo} inválido.`);
      }
      if (campo.tipo === "inteiro" && !Number.isInteger(numero)) {
        throw new Error(`${campo.rotulo} deve ser um número inteiro.`);
      }
      ficha[campo.campo] = numero;
      continue;
    }
    ficha[campo.campo] = bruto;
  }
  return ficha;
}

function montarPreco(valor: string): number | null {
  const bruto = valor.trim();
  if (bruto === "") {
    return null;
  }
  const numero = Number(bruto);
  if (!Number.isFinite(numero)) {
    throw new Error("O preço pago é inválido.");
  }
  return numero;
}

function dataParaInput(valor: string | null | undefined): string {
  if (!valor) {
    return "";
  }
  return valor.slice(0, 10);
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
