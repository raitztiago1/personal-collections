# Plano — Catálogo de coleções pessoais

**Spec:** [about.md](about.md) (**Aprovada** 2026-08-13)  
**Status plano:** **Implementado** (2026-08-13) — smoke manual do about.md pendente; depois **spec-validator**  
**Ideia:** [ideas/catalogo-colecoes-pessoais.md](../../ideas/catalogo-colecoes-pessoais.md)

Projeto **novo** (pasta vazia). T01 cria a base; T03–T12 são domínio/API com **TDD** (teste falhando → código mínimo → verde). T13–T17 são UI sobre APIs já verdes. T18 fecha DoD.

**Exceção de arquivos:** T01 (bootstrap) pode passar de 5 arquivos. Demais tasks: ≤ 5 arquivos.

---

## Ordem de execução

```text
T01 (scaffold Next.js)
  → T02 (Prisma + Postgres)
    → T03 (schemas Zod / fichas)          ─┐
    → T04 (auth registro/login)           ─┤
      → T05 (isolamento por usuário)      ─┘
        → T06 (CRUD item)
          → T07 (fotos)
          → T08 (campos extras)
          → T09 (busca + filtros)
          → T10 (wishlist + já comprei)
          → T11 (decks)
          → T12 (builds + peças)
            → T13 (shell + home + auth UI)
              → T14 (lista + busca + filtros UI)
              → T15 (ficha/form item + fotos UI)
              → T16 (extras + wishlist UI)
              → T17 (decks + builds UI)
                → T18 (constituição + DoD)
```

T06 é o tronco. T07–T12 podem ser sequenciais (dependem de item/auth); não paralelizar na mesma sessão se compartilham Prisma. T13 pode começar depois de T04 (páginas de auth), mas a home só fecha com T06. **Não iniciar UI de um bloco antes da API correspondente estar verde.**

---

## Mapa RF → Tasks

| RF / RN / RNF | Tasks |
|---------------|-------|
| RF-01, RN-10 | T04, T13 |
| RF-02, RN-05 | T05 |
| RF-03 | T13 |
| RF-04, RN-02, RN-06 | T03, T06, T15 |
| RF-05, RN-08 | T07, T15 |
| RF-06 | T08, T16 |
| RF-07, RF-08, RN-12 | T09, T14 |
| RF-09, RN-01 | T10, T16 |
| RF-10, RN-11 | T10, T16 |
| RF-11, RN-03, RN-04, RN-09 | T11, T17 |
| RF-12, RN-07 | T12, T17 |
| RF-13 | T13, T14, T15 |
| RF-14 | T15, T17 |
| RNF-01..08, DoD | T01, T02, T18 |

---

## T01 — Scaffold Next.js + tooling

| Campo | Valor |
|-------|-------|
| **RFs** | RNF-01, RNF-02 (base) |
| **Arquivos** | `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore` (+ `app/layout.tsx` se o create-next-app não gerar) |
| **Estimativa** | ~45 min |

### Ações

1. App Router + TypeScript + ESLint. Dependências: Next.js atual, React, Prisma, Auth.js, Zod, Vitest.
2. Scripts: `dev`, `build`, `lint`, `test` (Vitest).
3. `.gitignore`: `node_modules`, `.next`, `.env`, `data/uploads/`.
4. `.env.example`: `DATABASE_URL`, `AUTH_SECRET`, `ALLOW_REGISTRATION=true`, `UPLOAD_DIR=data/uploads`.
5. UI pt-BR no `layout` (`lang="pt-BR"`).
6. `docker-compose.yml` com PostgreSQL 16 (porta local, volume). Não commitar segredos.

### Critério de aceite

- `npm run lint` e `npm test` (suite vazia ou smoke) passam; `npm run build` passa com página mínima.

### Verificação

```powershell
npm test
npm run lint
npm run build
```

---

## T02 — Prisma: schema e migration inicial

| Campo | Valor |
|-------|-------|
| **RFs** | modelo de dados da spec |
| **Arquivos** | `prisma/schema.prisma`, `prisma/migrations/*_init/migration.sql`, `lib/db.ts`, `docker-compose.yml` (se não ficou em T01) |
| **Depende de** | T01 |
| **Estimativa** | ~60 min |

### Ações

1. Models alinhados à spec: `Usuario`, `Item`, `Foto`, `CampoExtraDef`, `CampoExtraValor`, `WishlistItem`, `Deck`, `DeckCarta`, `Build`, `BuildPeca`.
2. Enums: `TipoColecao`, `DonoFoto`, `TipoValorExtra`, `AlvoExtra`, `TipoPeca`.
3. `ficha Json`, índices `(usuarioId, tipoColecao)`, GIN em `ficha` na SQL da migration.
4. Extensão `unaccent` na migration se o Postgres permitir (busca T09); se o compose não tiver, documentar e usar fallback `ILIKE` em T09.
5. `lib/db.ts` exporta PrismaClient singleton.

### Critério de aceite

- `npx prisma migrate dev` aplica em Postgres limpo sem erro.
- Unique de e-mail; unique `(deckId, itemId)`; FKs com `usuarioId`.

### Verificação

```powershell
docker compose up -d
npx prisma migrate dev --name init
npx prisma validate
```

---

## T03 — Schemas de ficha (Zod) — TDD

| Campo | Valor |
|-------|-------|
| **RFs** | RF-04, RN-02, RN-06 |
| **Arquivos** | `lib/domain/colecoes.ts`, `lib/domain/fichas-item.ts`, `lib/domain/fichas-peca.ts`, `lib/domain/validar-ficha.ts`, `lib/domain/validar-ficha.test.ts` |
| **Depende de** | T01 |
| **Estimativa** | ~75 min |

### Ações

1. **Testes primeiro:** ficha de perfume válida; chave desconhecida → erro; ficha `{}` válida; GPU com `vram_gb`; tênis com chave de whisky → erro.
2. Catalogar as 8 coleções (slug, rótulo, `tipo_colecao`, se é item/composição).
3. Zod por tipo de item e por `tipo_peca`, com flags filtrável/pesquisável (objeto de metadados, não só o schema).
4. `validarFicha(tipo, json)` / `validarFichaPeca(tipoPeca, json)` — strip unknown **não**; **rejeitar** unknown (RN-06).

### Critério de aceite

- Vitest cobre RN-06 e ficha vazia ok.
- Metadados de filtro/busca batem com a tabela da spec.

### Verificação

```powershell
npx vitest run lib/domain/validar-ficha.test.ts
```

---

## T04 — Auth: registro, login, logout, `ALLOW_REGISTRATION` — TDD

| Campo | Valor |
|-------|-------|
| **RFs** | RF-01, RN-10, RNF-04, RNF-07 |
| **Arquivos** | `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/api/register/route.ts`, `lib/auth-register.ts`, `lib/auth-register.test.ts` |
| **Depende de** | T02 |
| **Estimativa** | ~75 min |

### Ações

1. **Testes primeiro:** registro ok; e-mail duplicado falha; senha com menos de 8 caracteres falha; `ALLOW_REGISTRATION=false` → 403; senha não aparece no JSON.
2. Auth.js credentials; hash Argon2id ou bcrypt; cookie httpOnly, `sameSite=lax`.
3. `register` cria `Usuario`; login devolve sessão com `usuario.id`.
4. Logout via Auth.js.

### Critério de aceite

- CA RF-01: registrar, sessão existe; e-mail repetido falha com mensagem pt-BR.
- RN-10 coberta por teste.

### Verificação

```powershell
npx vitest run lib/auth-register.test.ts
```

---

## T05 — Isolamento por `usuario_id` — TDD

| Campo | Valor |
|-------|-------|
| **RFs** | RF-02, RN-05 |
| **Arquivos** | `lib/session.ts`, `lib/isolamento.ts`, `lib/isolamento.test.ts`, `middleware.ts` |
| **Depende de** | T04 |
| **Estimativa** | ~45 min |

### Ações

1. Helper `requireUser()` lê sessão ou 401.
2. `assertDono(usuarioId, recursoUsuarioId)` → 404 se diferente.
3. Middleware: `/` autenticada (exceto `/login`, `/register`, `/api/auth/*`, `/api/register`).
4. Testes unitários do assert (não precisa DB).

### Critério de aceite

- Recurso de outro usuário mapeia para 404.
- Anônimo em rota protegida vai para login.

### Verificação

```powershell
npx vitest run lib/isolamento.test.ts
```

---

## T06 — API CRUD de item — TDD

| Campo | Valor |
|-------|-------|
| **RFs** | RF-04, RN-02, RN-06, RN-05 |
| **Arquivos** | `lib/domain/itens.ts`, `lib/domain/itens.test.ts`, `app/api/itens/route.ts`, `app/api/itens/[id]/route.ts` |
| **Depende de** | T03, T05 |
| **Estimativa** | ~90 min |

### Ações

1. **Testes primeiro:** cria só com nome; nome vazio 400; ficha inválida 400; list filtra `usuarioId` + `tipoColecao`; get/patch/delete 404 se outro usuário.
2. `POST/GET /api/itens`; `GET/PATCH/DELETE /api/itens/[id]`.
3. Validar `ficha` com T03 antes de persistir.
4. Mensagens pt-BR.

### Critério de aceite

- Item perfume com notas persiste e GET devolve `ficha` estruturada.
- Isolamento coberto por teste.

### Verificação

```powershell
npx vitest run lib/domain/itens.test.ts
```

---

## T07 — API de fotos — TDD

| Campo | Valor |
|-------|-------|
| **RFs** | RF-05, RN-08, RNF-05 |
| **Arquivos** | `lib/fotos.ts`, `lib/fotos.test.ts`, `app/api/fotos/route.ts`, `app/api/fotos/[id]/route.ts` |
| **Depende de** | T06 (itens como dono); T10–T12 reutilizam o mesmo módulo |
| **Estimativa** | ~75 min |

### Ações

1. Upload jpeg/png/webp; max 10 MB; max 12 por dono; `UPLOAD_DIR`.
2. Marcar capa: desmarca a anterior (RN-08).
3. GET binário só com sessão do dono; anônimo 401.
4. Delete item (T06) deve chamar limpeza de arquivos — hook em `itens.ts` ou cascade + `lib/fotos.apagarDono`.
5. Testes com filesystem temp (não precisa servir HTTP real se o módulo for testável).

### Critério de aceite

- Duas fotos + capa; GET autenticado 200; sem sessão 401.
- Limite 13ª foto → 400.

### Verificação

```powershell
npx vitest run lib/fotos.test.ts
```

---

## T08 — API campos extras — TDD

| Campo | Valor |
|-------|-------|
| **RFs** | RF-06 |
| **Arquivos** | `lib/domain/campos-extra.ts`, `lib/domain/campos-extra.test.ts`, `app/api/campos-extra/route.ts`, `app/api/campos-extra/[id]/route.ts` |
| **Depende de** | T06 |
| **Estimativa** | ~60 min |

### Ações

1. CRUD definição por `(usuario, tipoColecao)`; tipos TEXTO/NUMERO.
2. Valores no PATCH do item (estender `itens.ts` **ou** `PUT /api/itens/[id]/extras`) — preferir incluir extras no GET/PATCH de item para a UI não fazer N round-trips. Se estender `itens.ts`/`itens.test.ts`, contar como os arquivos desta task e **não** reabrir T06.
3. Remover definição apaga valores.
4. Unique nome por coleção do usuário.

### Critério de aceite

- Extra “batch code” em PERFUME grava e volta no GET do item.
- Delete da definição remove o valor.

### Verificação

```powershell
npx vitest run lib/domain/campos-extra.test.ts
```

---

## T09 — API busca textual + filtros — TDD

| Campo | Valor |
|-------|-------|
| **RFs** | RF-07, RF-08, RN-01, RN-12, RNF-08 |
| **Arquivos** | `lib/domain/busca.ts`, `lib/domain/busca.test.ts`, `app/api/busca/route.ts` |
| **Depende de** | T06 |
| **Estimativa** | ~75 min |

### Ações

1. **Testes primeiro:** `chicago` acha colorway; SKU acha tênis; filtro tamanho AND marca; wishlist **não** entra (RN-01); filtro só campos filtráveis (RN-12).
2. Query `q` em nome, descricao, tags e chaves pesquisáveis da ficha (JSONB).
3. Filtros: query params `tipoColecao` + `filtro.<campo>=`.
4. Global: sem tipo; na coleção: com tipo.
5. Builds/decks fora desta rota (listagens próprias em T11/T12).

### Critério de aceite

- CA RF-07/RF-08 cobertos por testes.
- Wishlist ausente nos resultados.

### Verificação

```powershell
npx vitest run lib/domain/busca.test.ts
```

---

## T10 — API wishlist + “Já comprei” — TDD

| Campo | Valor |
|-------|-------|
| **RFs** | RF-09, RF-10, RN-01, RN-11 |
| **Arquivos** | `lib/domain/wishlist.ts`, `lib/domain/wishlist.test.ts`, `app/api/wishlist/route.ts`, `app/api/wishlist/[id]/route.ts`, `app/api/wishlist/[id]/comprar/route.ts` |
| **Depende de** | T06, T07 |
| **Estimativa** | ~90 min |

### Ações

1. CRUD wishlist (7 tipos de item; não PC_BUILD).
2. `POST .../comprar`: transação — cria item, copia fotos (arquivos novos), copia extras, apaga wishlist (RN-11).
3. Teste: falha no meio não deixa item órfão nem wishlist sumida.
4. Confirmar que T09 não lista wishlist (regressão).

### Critério de aceite

- CA RF-10: 1 perfume na wishlist → comprar → 1 item, wishlist 0.
- RN-11 atômico no teste.

### Verificação

```powershell
npx vitest run lib/domain/wishlist.test.ts
```

---

## T11 — API decks Yu-Gi-Oh! — TDD

| Campo | Valor |
|-------|-------|
| **RFs** | RF-11, RN-03, RN-04, RN-09 |
| **Arquivos** | `lib/domain/decks.ts`, `lib/domain/decks.test.ts`, `app/api/decks/route.ts`, `app/api/decks/[id]/route.ts` |
| **Depende de** | T06 |
| **Estimativa** | ~75 min |

### Ações

1. CRUD deck; linhas `{ itemId, quantidade }`.
2. RN-03: só item `YUGIOH` do mesmo usuário.
3. RN-04: quantidade ≤ `ficha.quantidade` (default 1).
4. RN-09: `DELETE` item falha 409 com nomes dos decks; ajustar `itens.ts` **nesta task** (exceção: 6º arquivo se inevitável — preferir extrair `podeExcluirItem` para `lib/domain/decks.ts` e chamar de `itens.ts` já existente, sem reescrever o CRUD).
5. DELETE deck remove `deck_carta`.

### Critério de aceite

- Deck com 2 cópias ok se estoque 2; 3 falha.
- Excluir carta em deck → 409 + mensagem pt-BR.

### Verificação

```powershell
npx vitest run lib/domain/decks.test.ts
npx vitest run lib/domain/itens.test.ts
```

---

## T12 — API builds e peças — TDD

| Campo | Valor |
|-------|-------|
| **RFs** | RF-12, RN-07 |
| **Arquivos** | `lib/domain/builds.ts`, `lib/domain/builds.test.ts`, `app/api/builds/route.ts`, `app/api/builds/[id]/route.ts` |
| **Depende de** | T03, T05, T07 |
| **Estimativa** | ~75 min |

### Ações

1. CRUD build + peças (`tipoPeca` + `ficha` Zod de T03).
2. Fotos de build/peça via módulo T07 (`donoTipo` BUILD/PECA).
3. RN-07: nenhum vínculo com `GADGET`.
4. GET build devolve peças com ficha (VRAM etc.) estruturada.

### Critério de aceite

- Build “PC da sala” + GPU `vram_gb: 8` no GET.
- Peça não cria linha em `item`.

### Verificação

```powershell
npx vitest run lib/domain/builds.test.ts
```

---

## T13 — Shell, auth UI, home das 8 coleções

| Campo | Valor |
|-------|-------|
| **RFs** | RF-01, RF-03, RF-13, RNF-01 |
| **Arquivos** | `app/login/page.tsx`, `app/register/page.tsx`, `app/(main)/layout.tsx`, `app/(main)/page.tsx`, `components/AppHeader.tsx` |
| **Depende de** | T04, T06 (contagens; mock 0 se T06 ok) |
| **Estimativa** | ~60 min |

### Ações

1. Login/registro/logout em pt-BR; registro oculto se API 403/`ALLOW_REGISTRATION`.
2. Layout autenticado: header com busca (link `/buscar`), logout, nome.
3. Home: 8 cards (Tênis, Whisky, Perfumes, Yu-Gi-Oh!, Mangás, Livros, Gadgets, Setups PC) com contagem.
4. Viewport 390px: menu sem overflow horizontal do documento.

### Critério de aceite

- Fluxo registro → home com 8 coleções.
- Anônimo em `/` → `/login`.

### Verificação

```powershell
npm run lint
npm run build
```

Smoke: itens 1 e 8 do about.md.

---

## T14 — Lista da coleção, busca global, filtros

| Campo | Valor |
|-------|-------|
| **RFs** | RF-07, RF-08, RF-13 |
| **Arquivos** | `app/(main)/buscar/page.tsx`, `app/(main)/colecoes/[tipo]/page.tsx`, `components/ListaItens.tsx`, `components/FiltrosColecao.tsx` |
| **Depende de** | T09, T13 |
| **Estimativa** | ~75 min |

### Ações

1. `/buscar?q=` resultados globais (coleção, nome, capa).
2. Lista da coleção: busca + filtros gerados pelos metadados de T03.
3. Lista: capa, nome, 1–2 campos-chave; **não** mistura wishlist.
4. Yu-Gi-Oh!: nav Cartas | Decks (Decks pode ser stub até T17).
5. Mobile: sem overflow horizontal; filtros usáveis.

### Critério de aceite

- CA globais #2: achar tênis/card/whisky no inventário.
- Filtro raridade / tamanho reduz a lista.

### Verificação

```powershell
npm run lint
npm run build
```

Smoke: itens 2, 3, 8 do about.md.

---

## T15 — Form/ficha de item + fotos + exclusão

| Campo | Valor |
|-------|-------|
| **RFs** | RF-04, RF-05, RF-13, RF-14 |
| **Arquivos** | `components/FichaForm.tsx`, `components/FichaView.tsx`, `components/FotoGaleria.tsx`, `app/(main)/colecoes/[tipo]/itens/novo/page.tsx`, `app/(main)/colecoes/[tipo]/itens/[id]/page.tsx` |
| **Depende de** | T06, T07, T14 |
| **Estimativa** | ~90 min |

### Ações

1. Form **gerado pelo schema** (rótulos pt-BR por campo; não JSON cru).
2. Seções: comum / domínio / fotos (extras no T16).
3. Ver ficha: cada campo preenchido com rótulo (perfume notas; não “detalhes”).
4. Galeria: upload, capa, placeholder.
5. Excluir com confirmação; 409 de deck (T11) mostra mensagem.

### Critério de aceite

- CA global #3 (parte perfume) e #7 (fotos; anônimo não abre imagem).
- Só nome basta para salvar.

### Verificação

```powershell
npm run lint
npm run build
```

Smoke: itens 2, 5, 8 do about.md.

---

## T16 — UI campos extras, wishlist, “Já comprei”

| Campo | Valor |
|-------|-------|
| **RFs** | RF-06, RF-09, RF-10 |
| **Arquivos** | `components/CamposExtraEditor.tsx`, `app/(main)/colecoes/[tipo]/wishlist/page.tsx`, `app/(main)/colecoes/[tipo]/wishlist/novo/page.tsx`, `app/(main)/colecoes/[tipo]/wishlist/[id]/page.tsx` |
| **Depende de** | T08, T10, T15 (reusar `FichaForm` / `FichaView`) |
| **Estimativa** | ~75 min |

### Ações

1. Na coleção: gerir definições de extras; form de item/wishlist mostra os campos depois da ficha.
2. Wishlist: lista distinta do inventário; mesmo form de ficha.
3. Botão “Já comprei” → inventário; some da wishlist.
4. Setups PC sem wishlist (spec).

### Critério de aceite

- CA globais #4 e #6.
- Extra “batch code” visível na ficha do perfume.

### Verificação

```powershell
npm run lint
npm run build
```

Smoke: itens 4 e 5 do about.md.

---

## T17 — UI decks e builds

| Campo | Valor |
|-------|-------|
| **RFs** | RF-11, RF-12, RF-14, RN-07 |
| **Arquivos** | `app/(main)/colecoes/yugioh/decks/page.tsx`, `app/(main)/colecoes/yugioh/decks/[id]/page.tsx`, `app/(main)/colecoes/pc-builds/page.tsx`, `app/(main)/colecoes/pc-builds/[id]/page.tsx`, `components/PecaForm.tsx` |
| **Depende de** | T11, T12, T15 |
| **Estimativa** | ~90 min |

### Ações

1. Decks: criar, adicionar cartas do inventário YGO, quantidade, erro se passar do estoque.
2. Builds: lista setups; ficha do build; peças com form por `tipoPeca`; GPU mostra VRAM/clock/barramento com rótulos.
3. Confirmação ao excluir deck/build.
4. Gadgets e peças não se misturam na UI.

### Critério de aceite

- CA globais #3 (GPU) e #5 (deck).
- Smoke itens 6 e 7 do about.md.

### Verificação

```powershell
npm run lint
npm run build
```

---

## T18 — Constituição, índices de busca, DoD

| Campo | Valor |
|-------|-------|
| **RFs** | RNF-01..08, DoD |
| **Arquivos** | `.cursor/rules/constituicao.mdc`, `.cursor/rules/spec-driven-workflow.mdc`, `.env.example` (conferir), `README.md` |
| **Depende de** | T01–T17 |
| **Estimativa** | ~45 min |

### Ações

1. `constituicao.mdc`: stack, comandos (`npm test`, `lint`, `build`, `prisma migrate`), `UPLOAD_DIR`, `ALLOW_REGISTRATION`, idioma pt-BR.
2. Copiar/adaptar o fluxo spec-driven (paths relativos a este workspace).
3. README: Postgres via compose, env, `npm run dev`, primeiro registro.
4. Confirmar GIN/`unaccent` ou documentar fallback ILIKE.
5. Correr suite completa + smoke da spec (itens 1–10).

### Critério de aceite

- DoD da spec: testes, lint, build verdes; smoke manual executável pelo README.

### Verificação

```powershell
npm test
npm run lint
npm run build
```

Smoke: checklist completo do about.md (10 itens). Depois: skill **spec-validator**.

---

## Fora deste plano

- Visitante só-leitura, APIs externas, construtor de coleções, PWA, OCR.
- Qualquer RF/RN não listado no about.md.

---

## Aprovação do plano

| Revisor | Data | Status |
|---------|------|--------|
| Usuário | 2026-08-13 | Aprovado |

**Implementação:** **`subagent-driven-development`**, task a task, TDD em T03–T12.
