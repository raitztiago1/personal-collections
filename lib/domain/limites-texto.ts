import { HttpErro } from "../isolamento";

export const MAX_NOME = 200;
export const MAX_TEXTO_OPCIONAL = 4000;
export const MAX_TAG = 50;
export const MAX_TAGS = 30;

export function exigirNome(valor: unknown): string {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new HttpErro(400, "O nome é obrigatório.");
  }
  const nome = valor.trim();
  if (nome.length > MAX_NOME) {
    throw new HttpErro(
      400,
      `O campo nome deve ter no máximo ${MAX_NOME} caracteres.`,
    );
  }
  return nome;
}

export function textoOpcional(
  valor: unknown,
  campo: string,
): string | null | undefined {
  if (valor === undefined) {
    return undefined;
  }
  if (valor === null) {
    return null;
  }
  if (typeof valor !== "string") {
    throw new HttpErro(400, `O campo ${campo} deve ser texto.`);
  }
  const texto = valor.trim();
  if (texto === "") {
    return null;
  }
  if (texto.length > MAX_TEXTO_OPCIONAL) {
    throw new HttpErro(
      400,
      `O campo ${campo} deve ter no máximo ${MAX_TEXTO_OPCIONAL} caracteres.`,
    );
  }
  return texto;
}

export function tagsOpcional(valor: unknown): string[] | undefined {
  if (valor === undefined) {
    return undefined;
  }
  if (!Array.isArray(valor) || valor.some((tag) => typeof tag !== "string")) {
    throw new HttpErro(400, "As tags devem ser uma lista de textos.");
  }
  const tags = valor.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  for (const tag of tags) {
    if (tag.length > MAX_TAG) {
      throw new HttpErro(
        400,
        `Cada tag deve ter no máximo ${MAX_TAG} caracteres.`,
      );
    }
  }
  if (tags.length > MAX_TAGS) {
    throw new HttpErro(
      400,
      `O campo tags deve ter no máximo ${MAX_TAGS} itens.`,
    );
  }
  return tags;
}
