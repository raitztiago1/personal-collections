import Link from "next/link";
import type { TipoColecaoItem } from "@/lib/domain/colecoes";
import { camposFiltroColecao } from "@/lib/query-filtros";

const campoClass =
  "mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base";

export function FiltrosColecao({
  slug,
  tipoColecao,
  q,
  filtros,
}: {
  slug: string;
  tipoColecao: TipoColecaoItem;
  q: string;
  filtros: Record<string, string>;
}) {
  const campos = camposFiltroColecao(tipoColecao);

  return (
    <form
      action={`/colecoes/${slug}`}
      method="get"
      className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2">
          <label htmlFor="q-colecao" className="block text-sm font-medium">
            Buscar nesta coleção
          </label>
          <input
            id="q-colecao"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Nome, tags ou ficha"
            className={campoClass}
          />
        </div>
        {campos.map((campo) => {
          const nome = `filtro.${campo.campo}`;
          const valor = filtros[campo.campo] ?? "";
          return (
            <div key={campo.campo} className="min-w-0">
              <label htmlFor={nome} className="block text-sm font-medium">
                {campo.rotulo}
              </label>
              {campo.tipo === "enum" && campo.opcoes ? (
                <select
                  id={nome}
                  name={nome}
                  defaultValue={valor}
                  className={campoClass}
                >
                  <option value="">Todos</option>
                  {campo.opcoes.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={nome}
                  name={nome}
                  type={campo.tipo === "inteiro" ? "number" : "search"}
                  defaultValue={valor}
                  className={campoClass}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Filtrar
        </button>
        <Link
          href={`/colecoes/${slug}`}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          Limpar
        </Link>
      </div>
    </form>
  );
}
