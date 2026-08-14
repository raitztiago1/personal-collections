export type PecaComparavel = {
  tipoPeca: string;
  nome: string;
  ficha: Record<string, unknown>;
  notas: string | null;
};

export function pecasMudaram(
  originais: PecaComparavel[],
  atuais: PecaComparavel[],
): boolean {
  if (originais.length !== atuais.length) {
    return true;
  }
  return originais.some((original, indice) => {
    const atual = atuais[indice];
    if (!atual) {
      return true;
    }
    return (
      original.tipoPeca !== atual.tipoPeca ||
      original.nome !== atual.nome ||
      normalizarNotas(original.notas) !== normalizarNotas(atual.notas) ||
      assinaturaFicha(original.ficha) !== assinaturaFicha(atual.ficha)
    );
  });
}

function normalizarNotas(notas: string | null | undefined): string | null {
  if (notas === undefined || notas === null) {
    return null;
  }
  const texto = notas.trim();
  return texto === "" ? null : texto;
}

function assinaturaFicha(ficha: Record<string, unknown>): string {
  const normalizado: Record<string, unknown> = {};
  for (const chave of Object.keys(ficha).sort()) {
    const valor = ficha[chave];
    if (valor === undefined || valor === null) {
      continue;
    }
    if (typeof valor === "string" && valor.trim() === "") {
      continue;
    }
    normalizado[chave] = valor;
  }
  return JSON.stringify(normalizado);
}
