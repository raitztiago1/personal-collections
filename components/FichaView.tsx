import {
  camposPreenchidosFicha,
} from "@/lib/domain/rotulos-ficha";
import type { TipoColecaoItem } from "@/lib/domain/colecoes";
import {
  extrasPreenchidos,
  type ExtraUI,
} from "@/lib/query-filtros";

const ROTULOS_COMUNS = {
  descricao: "Descrição",
  notasPessoais: "Notas pessoais",
  dataAquisicao: "Data de aquisição",
  precoPago: "Preço pago",
  tags: "Tags",
} as const;

export function FichaView({
  tipoColecao,
  ficha,
  descricao,
  notasPessoais,
  dataAquisicao,
  precoPago,
  tags,
  extras = [],
}: {
  tipoColecao: TipoColecaoItem;
  ficha: Record<string, unknown>;
  descricao?: string | null;
  notasPessoais?: string | null;
  dataAquisicao?: string | null;
  precoPago?: number | null;
  tags?: string[];
  extras?: ExtraUI[];
}) {
  const comuns = camposComunsPreenchidos({
    descricao,
    notasPessoais,
    dataAquisicao,
    precoPago,
    tags,
  });
  const dominio = camposPreenchidosFicha(tipoColecao, ficha);
  const extrasVisiveis = extrasPreenchidos(extras);

  if (
    comuns.length === 0 &&
    dominio.length === 0 &&
    extrasVisiveis.length === 0
  ) {
    return (
      <p className="mt-4 text-sm text-zinc-600">
        Só o nome está preenchido. Edite abaixo para completar a ficha.
      </p>
    );
  }

  return (
    <div className="mt-4 min-w-0 space-y-6">
      {comuns.length > 0 ? (
        <section className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Dados gerais</h2>
          <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {comuns.map((campo) => (
              <div key={campo.rotulo} className="min-w-0">
                <dt className="text-xs font-medium text-zinc-600">
                  {campo.rotulo}
                </dt>
                <dd className="mt-0.5 break-words text-sm">{campo.valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {dominio.length > 0 ? (
        <section className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Ficha</h2>
          <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dominio.map((campo) => (
              <div key={campo.campo} className="min-w-0">
                <dt className="text-xs font-medium text-zinc-600">
                  {campo.rotulo}
                </dt>
                <dd className="mt-0.5 break-words text-sm">{campo.valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {extrasVisiveis.length > 0 ? (
        <section className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Campos extras</h2>
          <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {extrasVisiveis.map((campo) => (
              <div key={campo.nome} className="min-w-0">
                <dt className="text-xs font-medium text-zinc-600">
                  {campo.nome}
                </dt>
                <dd className="mt-0.5 break-words text-sm">{campo.valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function camposComunsPreenchidos(valores: {
  descricao?: string | null;
  notasPessoais?: string | null;
  dataAquisicao?: string | null;
  precoPago?: number | null;
  tags?: string[];
}): { rotulo: string; valor: string }[] {
  const campos: { rotulo: string; valor: string }[] = [];

  const descricao = valores.descricao?.trim() ?? "";
  if (descricao) {
    campos.push({ rotulo: ROTULOS_COMUNS.descricao, valor: descricao });
  }

  const notas = valores.notasPessoais?.trim() ?? "";
  if (notas) {
    campos.push({ rotulo: ROTULOS_COMUNS.notasPessoais, valor: notas });
  }

  const data = valores.dataAquisicao?.trim() ?? "";
  if (data) {
    campos.push({
      rotulo: ROTULOS_COMUNS.dataAquisicao,
      valor: formatarData(data),
    });
  }

  if (valores.precoPago !== null && valores.precoPago !== undefined) {
    campos.push({
      rotulo: ROTULOS_COMUNS.precoPago,
      valor: valores.precoPago.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    });
  }

  const tags = (valores.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  if (tags.length > 0) {
    campos.push({ rotulo: ROTULOS_COMUNS.tags, valor: tags.join(", ") });
  }

  return campos;
}

function formatarData(valor: string): string {
  const dia = valor.slice(0, 10);
  const [ano, mes, diaMes] = dia.split("-");
  if (ano && mes && diaMes) {
    return `${diaMes}/${mes}/${ano}`;
  }
  return dia;
}
