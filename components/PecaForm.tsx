"use client";

import type { TipoPeca } from "@/lib/domain/fichas-peca";
import { TIPOS_PECA } from "@/lib/domain/fichas-peca";
import {
  camposFichaPecaUI,
  camposPreenchidosFichaPeca,
  rotuloTipoPeca,
  type CampoFichaUI,
} from "@/lib/domain/rotulos-ficha";

const CAMPO_CLASS =
  "mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base";

export type PecaRascunho = {
  chave: string;
  tipoPeca: TipoPeca;
  nome: string;
  ficha: Record<string, string>;
  notas: string;
};

export type PecaPayload = {
  tipoPeca: TipoPeca;
  nome: string;
  ficha: Record<string, unknown>;
  notas: string | null;
};

export type PecaResumo = {
  id: string;
  tipoPeca: TipoPeca;
  nome: string;
  ficha: Record<string, unknown>;
  notas: string | null;
};

export function pecaRascunhoVazio(chave: string): PecaRascunho {
  return {
    chave,
    tipoPeca: "GPU",
    nome: "",
    ficha: estadoFicha(camposFichaPecaUI("GPU"), {}),
    notas: "",
  };
}

export function pecaDeServidor(peca: PecaResumo): PecaRascunho {
  return {
    chave: peca.id,
    tipoPeca: peca.tipoPeca,
    nome: peca.nome,
    ficha: estadoFicha(camposFichaPecaUI(peca.tipoPeca), peca.ficha),
    notas: peca.notas ?? "",
  };
}

export function montarPecaPayload(rascunho: PecaRascunho): PecaPayload {
  const nome = rascunho.nome.trim();
  if (nome === "") {
    throw new Error("Cada peça precisa de um nome.");
  }
  return {
    tipoPeca: rascunho.tipoPeca,
    nome,
    ficha: montarFicha(camposFichaPecaUI(rascunho.tipoPeca), rascunho.ficha),
    notas: rascunho.notas.trim() === "" ? null : rascunho.notas.trim(),
  };
}

export function PecaView({ peca }: { peca: PecaResumo }) {
  const campos = camposPreenchidosFichaPeca(peca.tipoPeca, peca.ficha);
  const notas = peca.notas?.trim() ?? "";

  return (
    <article className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="min-w-0 break-words text-sm font-semibold tracking-tight">
        {peca.nome}
        <span className="ml-2 font-normal text-zinc-600">
          {rotuloTipoPeca(peca.tipoPeca)}
        </span>
      </h3>
      {campos.length === 0 && notas === "" ? (
        <p className="mt-2 text-sm text-zinc-600">Sem ficha preenchida.</p>
      ) : (
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {campos.map((campo) => (
            <div key={campo.campo} className="min-w-0">
              <dt className="text-xs font-medium text-zinc-600">
                {campo.rotulo}
              </dt>
              <dd className="mt-0.5 break-words text-sm">{campo.valor}</dd>
            </div>
          ))}
          {notas ? (
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs font-medium text-zinc-600">Notas</dt>
              <dd className="mt-0.5 break-words text-sm">{notas}</dd>
            </div>
          ) : null}
        </dl>
      )}
    </article>
  );
}

export function PecaForm({
  valor,
  onChange,
  onRemove,
  disabled = false,
}: {
  valor: PecaRascunho;
  onChange: (valor: PecaRascunho) => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const campos = camposFichaPecaUI(valor.tipoPeca);

  function atualizar(parcial: Partial<PecaRascunho>) {
    onChange({ ...valor, ...parcial });
  }

  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4"
    >
      <legend className="px-1 text-sm font-semibold tracking-tight">
        {rotuloTipoPeca(valor.tipoPeca)}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label
            htmlFor={`peca-tipo-${valor.chave}`}
            className="block text-sm font-medium"
          >
            Tipo da peça
          </label>
          <select
            id={`peca-tipo-${valor.chave}`}
            value={valor.tipoPeca}
            onChange={(evento) => {
              const tipoPeca = evento.target.value as TipoPeca;
              atualizar({
                tipoPeca,
                ficha: estadoFicha(camposFichaPecaUI(tipoPeca), {}),
              });
            }}
            className={CAMPO_CLASS}
          >
            {TIPOS_PECA.map((tipo) => (
              <option key={tipo} value={tipo}>
                {rotuloTipoPeca(tipo)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label
            htmlFor={`peca-nome-${valor.chave}`}
            className="block text-sm font-medium"
          >
            Nome
          </label>
          <input
            id={`peca-nome-${valor.chave}`}
            required
            value={valor.nome}
            onChange={(evento) => atualizar({ nome: evento.target.value })}
            className={CAMPO_CLASS}
          />
        </div>
        {campos.map((campo) => (
          <CampoFicha
            key={`${valor.chave}-${campo.campo}`}
            idPrefix={valor.chave}
            campo={campo}
            valor={valor.ficha[campo.campo] ?? ""}
            onChange={(proximo) =>
              atualizar({
                ficha: { ...valor.ficha, [campo.campo]: proximo },
              })
            }
          />
        ))}
        <div className="min-w-0 sm:col-span-2">
          <label
            htmlFor={`peca-notas-${valor.chave}`}
            className="block text-sm font-medium"
          >
            Notas
          </label>
          <textarea
            id={`peca-notas-${valor.chave}`}
            rows={2}
            value={valor.notas}
            onChange={(evento) => atualizar({ notas: evento.target.value })}
            className={CAMPO_CLASS}
          />
        </div>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="mt-3 text-sm font-medium text-red-800 underline"
        >
          Remover peça
        </button>
      ) : null}
    </fieldset>
  );
}

function CampoFicha({
  idPrefix,
  campo,
  valor,
  onChange,
}: {
  idPrefix: string;
  campo: CampoFichaUI;
  valor: string;
  onChange: (valor: string) => void;
}) {
  const id = `peca-${idPrefix}-${campo.campo}`;

  return (
    <div className="min-w-0">
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
          step={
            campo.tipo === "inteiro"
              ? "1"
              : campo.tipo === "decimal"
                ? "any"
                : undefined
          }
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
