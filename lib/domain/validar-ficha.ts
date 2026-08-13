import type { TipoColecaoItem } from "./colecoes";
import { schemasFichaItem } from "./fichas-item";
import { schemasFichaPeca, type TipoPeca } from "./fichas-peca";

export function validarFicha(tipo: TipoColecaoItem, json: unknown) {
  const schema = schemasFichaItem[tipo];
  if (!schema) {
    throw new Error(`Tipo de coleção sem ficha de item: ${String(tipo)}`);
  }
  return schema.parse(json);
}

export function validarFichaPeca(tipoPeca: TipoPeca, json: unknown) {
  const schema = schemasFichaPeca[tipoPeca];
  if (!schema) {
    throw new Error(`Tipo de peça desconhecido: ${String(tipoPeca)}`);
  }
  return schema.parse(json);
}
