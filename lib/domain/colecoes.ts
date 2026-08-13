export const TIPOS_COLECAO_ITEM = [
  "TENIS",
  "WHISKY",
  "PERFUME",
  "YUGIOH",
  "MANGA",
  "LIVRO",
  "GADGET",
] as const;

export type TipoColecaoItem = (typeof TIPOS_COLECAO_ITEM)[number];

export type TipoColecao = TipoColecaoItem | "PC_BUILD";

export type KindColecao = "item" | "composition";

export type DefinicaoColecao = {
  slug: string;
  rotulo: string;
  tipoColecao: TipoColecao;
  kind: KindColecao;
};

export const COLECOES: readonly DefinicaoColecao[] = [
  { slug: "tenis", rotulo: "Tênis", tipoColecao: "TENIS", kind: "item" },
  { slug: "whisky", rotulo: "Whisky", tipoColecao: "WHISKY", kind: "item" },
  { slug: "perfumes", rotulo: "Perfumes", tipoColecao: "PERFUME", kind: "item" },
  { slug: "yugioh", rotulo: "Yu-Gi-Oh!", tipoColecao: "YUGIOH", kind: "item" },
  { slug: "mangas", rotulo: "Mangás", tipoColecao: "MANGA", kind: "item" },
  { slug: "livros", rotulo: "Livros", tipoColecao: "LIVRO", kind: "item" },
  { slug: "gadgets", rotulo: "Gadgets", tipoColecao: "GADGET", kind: "item" },
  {
    slug: "pc-builds",
    rotulo: "Setups PC",
    tipoColecao: "PC_BUILD",
    kind: "composition",
  },
];
