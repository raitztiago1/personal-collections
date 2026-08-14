import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  criarItem,
  excluirItem,
  type Item,
  type ItemDados,
  type ItemRepo,
} from "./domain/itens";
import { HttpErro } from "./isolamento";
import {
  apagarDono,
  apagarFoto,
  assertTamanhoArquivo,
  detectarMimeImagem,
  diretorioUpload,
  enviarFoto,
  fotoFsDisco,
  marcarCapa,
  resolverCaminhoSeguro,
  respostaGetFoto,
  servirFoto,
  TAMANHO_MAX_BYTES,
  type DonoRepo,
  type Foto,
  type FotoDados,
  type FotoDeps,
  type FotoRepo,
} from "./fotos";

const USUARIO_A = "user-a";
const USUARIO_B = "user-b";
const DONO_ID = "11111111-1111-4111-8111-111111111111";
const JPEG = {
  bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
  mime: "image/jpeg",
};
const PNG = {
  bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  mime: "image/png",
};
const WEBP = {
  bytes: new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]),
  mime: "image/webp",
};
const HTML_COMO_JPEG = {
  bytes: new TextEncoder().encode("<!DOCTYPE html><html><body>x</body></html>"),
  mime: "image/jpeg",
};

function criarRepoEmMemoria(iniciais: Foto[] = []): FotoRepo & { fotos: Foto[] } {
  const fotos: Foto[] = [...iniciais];

  return {
    fotos,
    async create(data: FotoDados) {
      const foto: Foto = { ...data };
      fotos.push(foto);
      return foto;
    },
    async findById(id) {
      return fotos.find((foto) => foto.id === id) ?? null;
    },
    async findManyByDono(donoTipo, donoId) {
      return fotos.filter(
        (foto) => foto.donoTipo === donoTipo && foto.donoId === donoId,
      );
    },
    async countByDono(donoTipo, donoId) {
      return fotos.filter(
        (foto) => foto.donoTipo === donoTipo && foto.donoId === donoId,
      ).length;
    },
    async update(id, data) {
      const indice = fotos.findIndex((foto) => foto.id === id);
      const atual = fotos[indice];
      if (indice < 0 || !atual) {
        throw new Error(`Foto ${id} não existe no repositório fake.`);
      }
      const atualizada: Foto = { ...atual, ...data };
      fotos[indice] = atualizada;
      return atualizada;
    },
    async unsetCapa(donoTipo, donoId) {
      for (const foto of fotos) {
        if (foto.donoTipo === donoTipo && foto.donoId === donoId && foto.isCapa) {
          foto.isCapa = false;
        }
      }
    },
    async delete(id) {
      const indice = fotos.findIndex((foto) => foto.id === id);
      if (indice >= 0) {
        fotos.splice(indice, 1);
      }
    },
    async deleteByDono(donoTipo, donoId) {
      const removidas = fotos.filter(
        (foto) => foto.donoTipo === donoTipo && foto.donoId === donoId,
      );
      for (const foto of removidas) {
        const indice = fotos.indexOf(foto);
        if (indice >= 0) {
          fotos.splice(indice, 1);
        }
      }
      return removidas;
    },
  };
}

function criarDonoRepoEmMemoria(): DonoRepo & {
  registrarItem(id: string, usuarioId: string): void;
  registrarWishlist(id: string, usuarioId: string): void;
  registrarBuild(id: string, usuarioId: string): void;
  registrarPeca(id: string, buildId: string): void;
} {
  const itens = new Map<string, string>();
  const wishlists = new Map<string, string>();
  const builds = new Map<string, string>();
  const pecas = new Map<string, string>();

  return {
    registrarItem(id, usuarioId) {
      itens.set(id, usuarioId);
    },
    registrarWishlist(id, usuarioId) {
      wishlists.set(id, usuarioId);
    },
    registrarBuild(id, usuarioId) {
      builds.set(id, usuarioId);
    },
    registrarPeca(id, buildId) {
      pecas.set(id, buildId);
    },
    async findItem(id) {
      const usuarioId = itens.get(id);
      return usuarioId ? { usuarioId } : null;
    },
    async findWishlist(id) {
      const usuarioId = wishlists.get(id);
      return usuarioId ? { usuarioId } : null;
    },
    async findBuild(id) {
      const usuarioId = builds.get(id);
      return usuarioId ? { usuarioId } : null;
    },
    async findPeca(id) {
      const buildId = pecas.get(id);
      return buildId ? { buildId } : null;
    },
  };
}

function criarItemRepoEmMemoria(): ItemRepo & { itens: Item[] } {
  const itens: Item[] = [];
  let sequencia = 0;
  return {
    itens,
    async create(data: ItemDados) {
      sequencia += 1;
      const agora = new Date("2026-08-13T12:00:00.000Z");
      const item: Item = {
        ...data,
        id: `item-${sequencia}`,
        createdAt: agora,
        updatedAt: agora,
      };
      itens.push(item);
      return item;
    },
    async findMany() {
      return itens;
    },
    async findById(id) {
      return itens.find((item) => item.id === id) ?? null;
    },
    async update(id, data) {
      const indice = itens.findIndex((item) => item.id === id);
      const atual = itens[indice];
      if (indice < 0 || !atual) {
        throw new Error(`Item ${id} não existe.`);
      }
      const atualizado = { ...atual, ...data, updatedAt: new Date() };
      itens[indice] = atualizado;
      return atualizado;
    },
    async delete(id) {
      const indice = itens.findIndex((item) => item.id === id);
      if (indice >= 0) {
        itens.splice(indice, 1);
      }
    },
  };
}

async function expectHttpErro(
  acao: Promise<unknown>,
  status: number,
  mensagem: RegExp,
): Promise<HttpErro> {
  try {
    await acao;
    throw new Error("Esperava HttpErro, mas a ação resolveu.");
  } catch (erro) {
    expect(erro).toBeInstanceOf(HttpErro);
    const http = erro as HttpErro;
    expect(http.status).toBe(status);
    expect(http.mensagem).toMatch(mensagem);
    return http;
  }
}

describe("API de fotos", () => {
  let uploadDir = "";
  let repo: ReturnType<typeof criarRepoEmMemoria>;
  let donos: ReturnType<typeof criarDonoRepoEmMemoria>;
  let deps: FotoDeps;

  afterEach(async () => {
    if (uploadDir) {
      await rm(uploadDir, { recursive: true, force: true });
    }
  });

  async function preparar(
    donoUsuarioId: string = USUARIO_A,
  ): Promise<FotoDeps> {
    uploadDir = await mkdtemp(path.join(tmpdir(), "fotos-"));
    repo = criarRepoEmMemoria();
    donos = criarDonoRepoEmMemoria();
    donos.registrarItem(DONO_ID, donoUsuarioId);
    deps = { repo, fs: fotoFsDisco(), uploadDir, donos };
    return deps;
  }

  it("usa UPLOAD_DIR ou data/uploads por omissão", () => {
    expect(diretorioUpload({})).toBe("data/uploads");
    expect(diretorioUpload({ UPLOAD_DIR: "tmp/fotos" })).toBe("tmp/fotos");
  });

  it("envia duas fotos, marca capa e desmarca a anterior (RN-08)", async () => {
    await preparar();

    const primeira = await enviarFoto(
      USUARIO_A,
      { donoTipo: "ITEM", donoId: DONO_ID, arquivo: JPEG, isCapa: true },
      deps,
    );
    const segunda = await enviarFoto(
      USUARIO_A,
      { donoTipo: "ITEM", donoId: DONO_ID, arquivo: PNG },
      deps,
    );

    expect(primeira.isCapa).toBe(true);
    expect(segunda.isCapa).toBe(false);
    expect(primeira.mime).toBe("image/jpeg");
    expect(segunda.mime).toBe("image/png");
    expect(primeira.caminho).toBe(`${USUARIO_A}/${primeira.id}.jpg`);
    expect(segunda.caminho).toBe(`${USUARIO_A}/${segunda.id}.png`);

    const bytesPrimeira = await readFile(path.join(uploadDir, primeira.caminho));
    expect(Buffer.from(bytesPrimeira)).toEqual(Buffer.from(JPEG.bytes));

    const capa = await marcarCapa(USUARIO_A, segunda.id, deps);
    const atualizada = await repo.findById(primeira.id);

    expect(capa.isCapa).toBe(true);
    expect(atualizada?.isCapa).toBe(false);
    expect(repo.fotos.filter((foto) => foto.isCapa)).toHaveLength(1);
  });

  it("GET autenticado devolve 200 com bytes e Content-Type", async () => {
    await preparar();
    const foto = await enviarFoto(
      USUARIO_A,
      { donoTipo: "ITEM", donoId: DONO_ID, arquivo: JPEG },
      deps,
    );

    const resposta = await respostaGetFoto(USUARIO_A, foto.id, deps);

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Content-Type")).toBe("image/jpeg");
    expect(Buffer.from(await resposta.arrayBuffer())).toEqual(
      Buffer.from(JPEG.bytes),
    );
  });

  it("GET sem sessão devolve 401 e não 404", async () => {
    await preparar();
    const foto = await enviarFoto(
      USUARIO_A,
      { donoTipo: "ITEM", donoId: DONO_ID, arquivo: JPEG },
      deps,
    );

    const anonimo = await respostaGetFoto(undefined, foto.id, deps);
    const nulo = await respostaGetFoto(null, foto.id, deps);

    expect(anonimo.status).toBe(401);
    expect(nulo.status).toBe(401);
    expect(anonimo.status).not.toBe(404);
    const corpo = (await anonimo.json()) as { erro: string };
    expect(corpo.erro).toMatch(/autenticado/i);
  });

  it("GET de foto de outro usuário devolve 404", async () => {
    await preparar(USUARIO_B);
    const foto = await enviarFoto(
      USUARIO_B,
      { donoTipo: "ITEM", donoId: DONO_ID, arquivo: JPEG },
      deps,
    );

    const resposta = await respostaGetFoto(USUARIO_A, foto.id, deps);

    expect(resposta.status).toBe(404);
  });

  it("rejeita a 13ª foto do mesmo dono com 400", async () => {
    await preparar();

    for (let i = 0; i < 12; i += 1) {
      await enviarFoto(
        USUARIO_A,
        { donoTipo: "ITEM", donoId: DONO_ID, arquivo: JPEG },
        deps,
      );
    }

    await expectHttpErro(
      enviarFoto(
        USUARIO_A,
        { donoTipo: "ITEM", donoId: DONO_ID, arquivo: JPEG },
        deps,
      ),
      400,
      /12|limite|máximo/i,
    );
    expect(repo.fotos).toHaveLength(12);
  });

  it("recusa foto em item de outro usuário com 404", async () => {
    await preparar(USUARIO_B);

    await expectHttpErro(
      enviarFoto(
        USUARIO_A,
        { donoTipo: "ITEM", donoId: DONO_ID, arquivo: JPEG },
        deps,
      ),
      404,
      /não encontrado/i,
    );
    expect(repo.fotos).toHaveLength(0);
  });

  it("recusa foto em peça cujo build é de outro usuário com 404", async () => {
    await preparar();
    donos.registrarBuild("build-b", USUARIO_B);
    donos.registrarPeca(DONO_ID, "build-b");

    await expectHttpErro(
      enviarFoto(
        USUARIO_A,
        { donoTipo: "PECA", donoId: DONO_ID, arquivo: JPEG },
        deps,
      ),
      404,
      /não encontrado/i,
    );
    expect(repo.fotos).toHaveLength(0);
  });

  it("rejeita mime não permitido e arquivo acima de 10 MB", async () => {
    await preparar();

    await expectHttpErro(
      enviarFoto(
        USUARIO_A,
        {
          donoTipo: "ITEM",
          donoId: DONO_ID,
          arquivo: {
            bytes: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
            mime: "image/gif",
          },
        },
        deps,
      ),
      400,
      /jpeg|png|webp|tipo|mime/i,
    );
    await expectHttpErro(
      enviarFoto(
        USUARIO_A,
        {
          donoTipo: "ITEM",
          donoId: DONO_ID,
          arquivo: { bytes: new Uint8Array(10 * 1024 * 1024 + 1), mime: JPEG.mime },
        },
        deps,
      ),
      400,
      /10|tamanho|grande|MB/i,
    );
    expect(repo.fotos).toHaveLength(0);
  });

  it("apaga arquivo e linha; apagarDono limpa o dono ao excluir item", async () => {
    await preparar();
    const itemRepo = criarItemRepoEmMemoria();
    const item = await criarItem(
      USUARIO_A,
      { nome: "Sauvage", tipoColecao: "PERFUME" },
      itemRepo,
    );
    donos.registrarItem(item.id, USUARIO_A);

    const foto = await enviarFoto(
      USUARIO_A,
      { donoTipo: "ITEM", donoId: item.id, arquivo: JPEG, isCapa: true },
      deps,
    );
    const extra = await enviarFoto(
      USUARIO_A,
      { donoTipo: "ITEM", donoId: item.id, arquivo: PNG },
      deps,
    );
    const caminhoFoto = path.join(uploadDir, foto.caminho);
    const caminhoExtra = path.join(uploadDir, extra.caminho);

    await apagarFoto(USUARIO_A, extra.id, deps);
    await expect(readFile(caminhoExtra)).rejects.toThrow();
    expect(repo.fotos.map((f) => f.id)).toEqual([foto.id]);

    await excluirItem(USUARIO_A, item.id, itemRepo, (usuarioId, donoId) =>
      apagarDono(usuarioId, "ITEM", donoId, deps),
    );

    await expect(readFile(caminhoFoto)).rejects.toThrow();
    expect(repo.fotos).toHaveLength(0);
    expect(itemRepo.itens).toHaveLength(0);
  });

  it("rejeita HTML com mime image/jpeg e não persiste", async () => {
    await preparar();

    await expectHttpErro(
      enviarFoto(
        USUARIO_A,
        { donoTipo: "ITEM", donoId: DONO_ID, arquivo: HTML_COMO_JPEG },
        deps,
      ),
      400,
      /Tipo de imagem não permitido\. Use jpeg, png ou webp\./,
    );
    expect(repo.fotos).toHaveLength(0);
  });

  it("persiste o mime detectado pelos bytes e ignora o mime do cliente", async () => {
    await preparar();

    const jpegDisfarçado = await enviarFoto(
      USUARIO_A,
      {
        donoTipo: "ITEM",
        donoId: DONO_ID,
        arquivo: { bytes: JPEG.bytes, mime: "image/png" },
      },
      deps,
    );
    const pngOk = await enviarFoto(
      USUARIO_A,
      { donoTipo: "ITEM", donoId: DONO_ID, arquivo: PNG },
      deps,
    );
    const webpOk = await enviarFoto(
      USUARIO_A,
      { donoTipo: "ITEM", donoId: DONO_ID, arquivo: WEBP },
      deps,
    );

    expect(jpegDisfarçado.mime).toBe("image/jpeg");
    expect(jpegDisfarçado.caminho).toBe(`${USUARIO_A}/${jpegDisfarçado.id}.jpg`);
    expect(pngOk.mime).toBe("image/png");
    expect(webpOk.mime).toBe("image/webp");
    expect(webpOk.caminho).toBe(`${USUARIO_A}/${webpOk.id}.webp`);
  });

  it("GET inclui nosniff e Cache-Control private, no-store", async () => {
    await preparar();
    const foto = await enviarFoto(
      USUARIO_A,
      { donoTipo: "ITEM", donoId: DONO_ID, arquivo: JPEG },
      deps,
    );

    const resposta = await respostaGetFoto(USUARIO_A, foto.id, deps);

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Content-Type")).toBe("image/jpeg");
    expect(resposta.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("servirFoto recusa path traversal e não lê fora do diretório", async () => {
    await preparar();
    const foto = await enviarFoto(
      USUARIO_A,
      { donoTipo: "ITEM", donoId: DONO_ID, arquivo: JPEG },
      deps,
    );
    const secreto = path.join(path.dirname(uploadDir), "secret.txt");
    await writeFile(secreto, "segredo-nao-deve-vazar");

    const raiz = path.resolve(uploadDir);
    const lerOriginal = deps.fs.readFile.bind(deps.fs);
    deps.fs.readFile = async (caminho) => {
      const relativo = path.relative(raiz, path.resolve(caminho));
      if (relativo.startsWith("..") || path.isAbsolute(relativo)) {
        throw new Error("readFile chamado fora do diretório de upload");
      }
      return lerOriginal(caminho);
    };

    const registro = repo.fotos.find((item) => item.id === foto.id);
    expect(registro).toBeDefined();
    registro!.caminho = "../secret.txt";

    await expectHttpErro(
      servirFoto(USUARIO_A, foto.id, deps),
      404,
      /não encontrado/i,
    );

    registro!.caminho = "..\\..\\etc\\passwd";
    const resposta = await respostaGetFoto(USUARIO_A, foto.id, deps);
    expect(resposta.status).toBe(404);
    expect(await resposta.text()).not.toContain("segredo-nao-deve-vazar");

    await rm(secreto, { force: true });
  });

  it("detectarMimeImagem identifica jpeg, png, webp e recusa HTML", () => {
    expect(detectarMimeImagem(JPEG.bytes)).toBe("image/jpeg");
    expect(detectarMimeImagem(PNG.bytes)).toBe("image/png");
    expect(detectarMimeImagem(WEBP.bytes)).toBe("image/webp");
    expect(detectarMimeImagem(HTML_COMO_JPEG.bytes)).toBeNull();
  });

  it("resolverCaminhoSeguro recusa caminho fora do diretório com 404", async () => {
    const raiz = await mkdtemp(path.join(tmpdir(), "fotos-safe-"));
    try {
      const seguro = resolverCaminhoSeguro(raiz, "user/a.jpg");
      expect(path.resolve(seguro)).toBe(path.resolve(raiz, "user/a.jpg"));

      for (const relativo of ["../secret.txt", "..\\..\\etc\\passwd"]) {
        try {
          resolverCaminhoSeguro(raiz, relativo);
          throw new Error(`Esperava HttpErro para ${relativo}`);
        } catch (erro) {
          expect(erro).toBeInstanceOf(HttpErro);
          const http = erro as HttpErro;
          expect(http.status).toBe(404);
          expect(http.mensagem).toMatch(/não encontrado/i);
        }
      }
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it("assertTamanhoArquivo recusa tamanho acima de 10 MB com 400", () => {
    try {
      assertTamanhoArquivo(TAMANHO_MAX_BYTES + 1);
      throw new Error("Esperava HttpErro para tamanho acima de 10 MB.");
    } catch (erro) {
      expect(erro).toBeInstanceOf(HttpErro);
      const http = erro as HttpErro;
      expect(http.status).toBe(400);
      expect(http.mensagem).toBe("O arquivo excede 10 MB.");
    }
    expect(() => assertTamanhoArquivo(TAMANHO_MAX_BYTES)).not.toThrow();
  });
});
