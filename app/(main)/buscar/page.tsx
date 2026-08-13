import { ListaItens } from "@/components/ListaItens";
import { parsearQueryLista } from "@/lib/query-filtros";

export const dynamic = "force-dynamic";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q } = parsearQueryLista(await searchParams);

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Buscar</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Procure no inventário de todas as coleções. A wishlist não entra nos
        resultados.
      </p>
      <form
        action="/buscar"
        method="get"
        className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="q" className="block text-sm font-medium">
            Termo
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Ex.: chicago, destilaria, raridade"
            className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Buscar
        </button>
      </form>
      <ListaItens modo="global" q={q} />
    </main>
  );
}
