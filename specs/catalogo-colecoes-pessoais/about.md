# Catálogo de coleções pessoais

## Metadados

| Campo | Valor |
|-------|-------|
| **Feature slug** | `catalogo-colecoes-pessoais` |
| **Status** | **Aprovada** (2026-08-13) |
| **Data** | 2026-08-13 |
| **Aprovada em** | 2026-08-13 |
| **Origem** | [ideas/catalogo-colecoes-pessoais.md](../../ideas/catalogo-colecoes-pessoais.md) |
| **Stack** | Next.js (App Router), React, TypeScript, PostgreSQL 16+, Prisma, Auth.js (credentials) |
| **Impacto** | Projeto novo: auth, catálogo híbrido, fotos em disco, busca/filtros, wishlist, decks, builds |

---

## Contexto

O dono precisa de um webapp para **consultar o que já tem na hora de comprar** e, em casa, **abrir cada unidade com a ficha profunda daquele hobby**. Coleções oficiais da Onda 1: Tênis, Whisky, Perfumes, Yu-Gi-Oh!, Mangás, Livros, Gadgets e Setups de PC.

A ideia aprovada escolheu o modelo **híbrido**: fichas prontas por universo + campos extras; wishlist **separada** do inventário; item avulso **e** composição (deck, build). Visitante só-leitura fica fora desta spec.

---

## Objetivo

Entregar um catálogo pessoal autenticado em que o dono cadastra, busca e filtra o inventário (incluindo no celular), vê a ficha de domínio ao abrir um item, mantém wishlist por coleção sem misturar com o que possui, monta decks só com cartas que tem e monta setups de PC com peças tipadas (GPU com VRAM, etc.).

---

## Decisões de produto (fechadas nesta spec)

| # | Pergunta | Decisão |
|---|----------|---------|
| D1 | Stack | **Next.js + TypeScript** (UI e API no mesmo app). Persistência **Prisma** + **PostgreSQL**. Auth **Auth.js** com e-mail/senha. |
| D2 | Dados e fotos | PostgreSQL; fotos em **disco do servidor** (`data/uploads/`), servidas por rota autenticada — não URL pública aberta. |
| D3 | Auth Onda 1 | **Registro + login**. Dados isolados por `usuario_id`. Visitante só-leitura **não** entra. Registro desligável por env após criar a conta (`ALLOW_REGISTRATION`). |
| D4 | Consulta | Busca por texto **e** filtros dos campos de ficha marcados como filtráveis. |
| D5 | Wishlist | Tabela/lista **à parte** por coleção. Não usa status `quero` no item. |
| D6 | Yu-Gi-Oh! | Cartas = itens da coleção; decks = composição apontando para cartas do **inventário** do mesmo usuário. |
| D7 | PC | **Build** (peças com ficha) **e** coleção **Gadgets** (aparelhos avulsos). Sem sincronizar peça ↔ gadget na Onda 1. |
| D8 | Campos extras | Definição por (usuário, coleção); tipos **texto** e **número**; aparecem no form e na ficha; **não** entram nos filtros da Onda 1. |
| D9 | Obrigatoriedade | Para criar item: só **nome**. Resto opcional (incluindo fotos). |
| D10 | Multi-usuário | Cada conta tem o próprio catálogo. Não há catálogo compartilhado nesta onda. |
| D11 | Ficha de domínio | JSONB `ficha` validado por schema TypeScript/Zod **por tipo de coleção**, não tabelas separadas por hobby. |
| D12 | Wishlist → inventário | Ação **“Já comprei”**: cria item no inventário (copia nome, ficha, fotos, descrição) e **remove** a entrada da wishlist. |

---

## Escopo

### Dentro do escopo (Onda 1)

| Bloco | Itens |
|-------|-------|
| Auth | Registro, login, logout, sessão cookie httpOnly, isolamento por usuário, `ALLOW_REGISTRATION` |
| Coleções oficiais | Tênis, Whisky, Perfume, Yu-Gi-Oh! (cartas + decks), Mangá, Livro, Gadget, PC Build |
| Item | CRUD, campos comuns, ficha de domínio, tags, fotos (capa + galeria) |
| Campos extras | CRUD da definição na coleção; valores no item |
| Consulta | Busca textual (global e na coleção) + filtros da ficha na coleção |
| Wishlist | CRUD por coleção; mesma linguagem de ficha; “Já comprei” |
| Decks | CRUD; linhas carta+quantidade só de cartas possuídas |
| Builds | CRUD do setup; peças tipadas com ficha e fotos |
| UI | pt-BR; lista/consulta usável em ~390px; cadastro profundo no desktop |
| Testes | Regras de domínio em Vitest; lint + build |

### Fora do escopo

- Visitante só-leitura, link público, papéis além de dono da própria conta.
- APIs externas (preço de mercado, Cardmarket, importação em lote).
- Construtor de coleções novas pela UI (só as 8 oficiais).
- Filtros sobre campos extras; tipos extras além de texto/número.
- Mover peça de build para Gadgets (ou o inverso).
- Deck com cartas que o dono **não** tem; “deck incompleto”.
- App nativo, PWA como meta, OCR, código de barras.
- Venda, empréstimo, seguro, relatórios financeiros.
- UI em outro idioma.

---

## Personas e fluxos

| Persona | Fluxo | Impacto esperado |
|---------|-------|------------------|
| Dono no celular | Buscar/filtrar “já tenho este tênis / card / whisky?” | Resposta em segundos, sem ficha completa |
| Dono no desktop | Cadastrar perfume com notas; abrir GPU do build e ver VRAM | Ficha de domínio visível, não um campo “detalhes” |
| Dono | Wishlist de uma coleção e depois “Já comprei” | Inventário ganha o item; wishlist não lista mais |
| Dono | Montar deck / montar PC | Composição consistente com as regras abaixo |

---

## Arquitetura (alvo)

```text
app/                    # App Router — páginas e route handlers
  (auth)/login, register
  (app)/                # área autenticada
    page.tsx            # home: grade de coleções
    buscar/             # busca global
    colecoes/[tipo]/    # lista, filtros, wishlist, item, decks/builds
lib/
  auth/                 # Auth.js, hash de senha
  domain/               # regras e schemas de ficha (testável sem UI)
  db/                   # Prisma client
data/uploads/           # fotos (fora do git)
prisma/schema.prisma
```

- Lógica de negócio em `lib/domain` (não só em componentes).
- HTTP: Route Handlers em `/api/*` para auth, itens, fotos, busca, wishlist, decks, builds.
- UI consome a API da mesma origem; sessão por cookie.

---

## Modelo de dados (alvo)

### `usuario`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| nome | TEXT NOT NULL | |
| email | TEXT UNIQUE NOT NULL | case-insensitive |
| senha_hash | TEXT NOT NULL | Argon2id ou bcrypt |
| created_at | TIMESTAMPTZ | |

### `item`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| usuario_id | UUID FK NOT NULL | isolamento |
| tipo_colecao | ENUM NOT NULL | ver enum abaixo |
| nome | TEXT NOT NULL | |
| descricao | TEXT | |
| notas_pessoais | TEXT | |
| data_aquisicao | DATE | |
| preco_pago | DECIMAL(12,2) | |
| tags | TEXT[] | default `{}` |
| ficha | JSONB NOT NULL | default `{}`; validado pelo schema do tipo |
| created_at / updated_at | TIMESTAMPTZ | |

Índices: `(usuario_id, tipo_colecao)`; GIN em `ficha`; busca (ver RNF).

**Enum `tipo_colecao` (itens):** `TENIS`, `WHISKY`, `PERFUME`, `YUGIOH`, `MANGA`, `LIVRO`, `GADGET`.

Builds e decks **não** são linhas de `item`.

### `foto`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| usuario_id | UUID FK | |
| dono_tipo | ENUM | `ITEM`, `WISHLIST`, `BUILD`, `PECA` |
| dono_id | UUID | |
| caminho | TEXT | relativo a `data/uploads/` |
| mime | TEXT | `image/jpeg`, `image/png`, `image/webp` |
| ordem | INT | |
| is_capa | BOOLEAN | no máximo uma capa por dono |

Arquivo no disco: `data/uploads/{usuario_id}/{foto_id}.{ext}`.

### `campo_extra_def`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| usuario_id | UUID FK | |
| tipo_colecao | ENUM | mesmo enum de item **ou** `PC_BUILD` para extras do setup (não da peça) |
| nome | TEXT NOT NULL | único por (usuario, tipo_colecao, nome) |
| tipo_valor | ENUM | `TEXTO`, `NUMERO` |

### `campo_extra_valor`

| Campo | Tipo | Notas |
|-------|------|-------|
| definicao_id | UUID FK | |
| alvo_tipo | ENUM | `ITEM`, `WISHLIST`, `BUILD` |
| alvo_id | UUID | |
| valor_texto | TEXT | |
| valor_numero | DECIMAL | |

Um dos dois valores preenchido conforme `tipo_valor`. Peças de build **não** têm campos extras na Onda 1.

### `wishlist_item`

Mesmos campos de negócio que `item` (nome, descricao, notas, tags, ficha, tipo_colecao) + `usuario_id`. **Sem** `data_aquisicao` / `preco_pago` (ainda não comprou). Fotos via `foto.dono_tipo = WISHLIST`.

### `deck`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| usuario_id | UUID FK | |
| nome | TEXT NOT NULL | |
| formato | TEXT | livre (ex.: TCG, Goat) |
| notas | TEXT | |

### `deck_carta`

| Campo | Tipo | Notas |
|-------|------|-------|
| deck_id | UUID FK | |
| item_id | UUID FK | item `YUGIOH` do **mesmo** usuario |
| quantidade | INT NOT NULL | ≥ 1; ver RN-04 |
| Unique | (deck_id, item_id) | |

### `build`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| usuario_id | UUID FK | |
| nome | TEXT NOT NULL | |
| descricao | TEXT | |
| notas_pessoais | TEXT | |

### `build_peca`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| build_id | UUID FK | |
| tipo_peca | ENUM | ver abaixo |
| nome | TEXT NOT NULL | |
| ficha | JSONB NOT NULL | schema do `tipo_peca` |
| notas | TEXT | |

**Enum `tipo_peca`:** `GPU`, `CPU`, `RAM`, `ARMAZENAMENTO`, `PLACA_MAE`, `PSU`, `GABINETE`, `COOLER`, `MONITOR`, `PERIFERICO`, `OUTRO`.

Um build pode ter várias peças do mesmo tipo (2× RAM, 2× storage).

---

## Fichas de domínio

Validação: objeto JSON; chaves desconhecidas **rejeitadas** no preset (campos extras são outra tabela). Valores omitidos = campo vazio. Nenhum campo de ficha é obrigatório.

**Filtrável** = aparece como filtro na lista da coleção. **Pesquisável** = entra na busca textual.

### `TENIS`

| Campo | Tipo | Filtrável | Pesquisável |
|-------|------|-----------|-------------|
| marca | texto | sim | sim |
| linha | texto | sim | sim |
| colorway | texto | não | sim |
| sku | texto | não | sim |
| tamanho | texto | sim | sim |
| ano | inteiro | sim | não |
| condicao | enum `NOVO`, `USADO`, `DANIFICADO` | sim | não |
| colaboracao | texto | não | sim |

### `WHISKY`

| Campo | Tipo | Filtrável | Pesquisável |
|-------|------|-----------|-------------|
| destilaria | texto | sim | sim |
| regiao | texto | sim | sim |
| idade_anos | inteiro | sim | não |
| abv | decimal | não | não |
| tipo_barril | texto | sim | sim |
| engarrafador | enum `OFICIAL`, `INDEPENDENTE` | sim | não |
| volume_ml | inteiro | não | não |
| nivel_restante | enum `CHEIO`, `MAIORIA`, `METADE`, `POUCO`, `VAZIO` | sim | não |
| notas_degustacao | texto | não | sim |
| nota_pessoal | decimal 0–10 | não | não |

### `PERFUME`

| Campo | Tipo | Filtrável | Pesquisável |
|-------|------|-----------|-------------|
| casa | texto | sim | sim |
| linha | texto | sim | sim |
| concentracao | enum `EDC`, `EDT`, `EDP`, `PARFUM`, `EXTRAT`, `OUTRO` | sim | não |
| perfumista | texto | não | sim |
| ano | inteiro | sim | não |
| volume_ml | inteiro | não | não |
| notas_topo | texto | não | sim |
| notas_coracao | texto | não | sim |
| notas_base | texto | não | sim |
| ocasiao | texto | sim | sim |
| restante | enum `CHEIO`, `MAIORIA`, `METADE`, `POUCO`, `VAZIO` | sim | não |

### `YUGIOH` (carta)

| Campo | Tipo | Filtrável | Pesquisável |
|-------|------|-----------|-------------|
| set_edicao | texto | sim | sim |
| codigo | texto | não | sim |
| raridade | texto | sim | sim |
| condicao | enum `MINT`, `NM`, `LP`, `MP`, `HP`, `DANIFICADO` | sim | não |
| idioma | texto | sim | sim |
| quantidade | inteiro ≥ 1 | não | não |
| tipo_carta | texto | sim | sim |
| atributo | texto | sim | sim |
| nivel | inteiro | sim | não |
| atk | inteiro | não | não |
| def | inteiro | não | não |

`quantidade` default 1. O **nome** da carta é `item.nome`.

### `MANGA`

| Campo | Tipo | Filtrável | Pesquisável |
|-------|------|-----------|-------------|
| obra | texto | sim | sim |
| volume | texto | não | sim |
| autor | texto | sim | sim |
| artista | texto | não | sim |
| editora | texto | sim | sim |
| idioma | texto | sim | sim |
| status_obra | enum `EM_ANDAMENTO`, `COMPLETA`, `HIATO` | sim | não |

Progresso “8/12” **não** é um campo gravado: a UI da lista/ficha de uma obra pode mostrar `count(itens com a mesma obra)` — opcional na lista agrupada; não bloqueia o CRUD por volume.

### `LIVRO`

| Campo | Tipo | Filtrável | Pesquisável |
|-------|------|-----------|-------------|
| autor | texto | sim | sim |
| editora | texto | sim | sim |
| isbn | texto | não | sim |
| ano | inteiro | sim | não |
| edicao | texto | não | sim |
| formato | enum `CAPA_DURA`, `BROCHURA`, `BOLSO`, `EBOOK`, `OUTRO` | sim | não |
| status_leitura | enum `NAO_LIDO`, `LENDO`, `LIDO` | sim | não |

Título = `item.nome`.

### `GADGET`

| Campo | Tipo | Filtrável | Pesquisável |
|-------|------|-----------|-------------|
| tipo_aparelho | texto | sim | sim |
| marca | texto | sim | sim |
| modelo | texto | não | sim |
| ano | inteiro | sim | não |
| capacidade | texto | não | sim |
| condicao | enum `NOVO`, `USADO`, `DANIFICADO` | sim | não |
| acessorios | texto | não | sim |

### Peças de build

#### `GPU`

| Campo | Tipo |
|-------|------|
| marca | texto |
| modelo | texto |
| vram_gb | decimal |
| clock_mhz | inteiro |
| barramento | texto |

#### `CPU`

| Campo | Tipo |
|-------|------|
| marca | texto |
| modelo | texto |
| nucleos | inteiro |
| threads | inteiro |
| clock_ghz | decimal |

#### `RAM`

| Campo | Tipo |
|-------|------|
| capacidade_gb | decimal |
| speed_mhz | inteiro |
| tipo | enum `DDR3`, `DDR4`, `DDR5`, `OUTRO` |

#### `ARMAZENAMENTO`

| Campo | Tipo |
|-------|------|
| tipo | enum `SSD_NVME`, `SSD_SATA`, `HDD`, `OUTRO` |
| capacidade_gb | decimal |
| interface | texto |

#### `PLACA_MAE`

| Campo | Tipo |
|-------|------|
| marca | texto |
| modelo | texto |
| socket | texto |
| chipset | texto |

#### `PSU`

| Campo | Tipo |
|-------|------|
| marca | texto |
| modelo | texto |
| potencia_w | inteiro |
| certificacao | texto |

#### `GABINETE` / `COOLER` / `MONITOR` / `PERIFERICO` / `OUTRO`

| Campo | Tipo | Aplica-se |
|-------|------|-----------|
| marca | texto | todos |
| modelo | texto | todos |
| tamanho | texto | gabinete, cooler |
| polegadas | decimal | monitor |
| resolucao | texto | monitor |
| taxa_hz | inteiro | monitor |
| tipo | texto | periférico, outro (ex.: teclado, iPad usado no setup) |

Peças **não** têm filtros na Onda 1 além da busca textual no nome do build/peça. A ficha completa aparece ao abrir o build.

---

## Requisitos Funcionais

### RF-01 — Registro e sessão

**Descrição:** Pessoa cria conta com nome, e-mail e senha e passa a ter catálogo vazio.

**Comportamento:**
- `POST /api/auth/register` (ou fluxo Auth.js equivalente) cria usuário; e-mail único.
- Senha mínima 8 caracteres; armazenada só como hash.
- Se `ALLOW_REGISTRATION=false`, registro retorna **403** e a UI não oferece cadastro.
- Login cria sessão cookie httpOnly; logout encerra.
- Rotas da área autenticada redirecionam para login se anônimo.

**Critério de aceite:** Registrar, sair, entrar de novo; um segundo e-mail igual falha com mensagem clara.

---

### RF-02 — Isolamento por usuário

**Descrição:** Nenhuma leitura ou escrita acessa dados de outro `usuario_id`.

**Comportamento:**
- Toda query de item, foto, wishlist, deck, build e campo extra filtra `usuario_id` da sessão.
- ID de outro usuário → **404** (não 403 com vazamento de existência além do necessário; padrão único: 404).

**Critério de aceite:** Teste com dois usuários: A não lê/edita item de B.

---

### RF-03 — Home de coleções

**Descrição:** Após login, a home lista as 8 coleções oficiais.

**Comportamento:**
- Entradas: Tênis, Whisky, Perfumes, Yu-Gi-Oh!, Mangás, Livros, Gadgets, Setups PC.
- Yu-Gi-Oh! leva a cartas (com acesso a decks). Setups PC leva a builds.
- Cada card mostra contagem de itens (ou decks/builds) **do usuário**.

---

### RF-04 — CRUD de item com ficha de domínio

**Descrição:** Criar, editar, ver e excluir item na coleção correspondente.

**Comportamento:**
- Formulário mostra campos comuns + campos da ficha daquele `tipo_colecao` **com rótulos próprios** (não um JSON genérico na UI).
- Ficha da GPU **não** aparece num tênis.
- Exclusão pede confirmação; remove fotos do disco.
- GET da ficha renderiza cada campo de domínio preenchido.

**Critério de aceite:** Cadastrar um perfume com casa + notas topo/coração/base e, ao reabrir, ver esses campos com rótulo — não um bloco “detalhes”.

---

### RF-05 — Fotos

**Descrição:** Galeria por item, wishlist, build e peça.

**Comportamento:**
- Upload jpeg/png/webp; máximo **10 MB** por arquivo; até **12** fotos por dono.
- Uma foto pode ser marcada capa (a anterior deixa de ser).
- GET da imagem exige sessão do dono.
- Sem foto: placeholder na lista.

**Critério de aceite:** Enviar 2 fotos, marcar capa, recarregar a ficha; anônimo não abre a URL da imagem.

---

### RF-06 — Campos extras

**Descrição:** O dono define campos texto/número na coleção e preenche por item (e wishlist; em build, no setup).

**Comportamento:**
- UI na coleção: adicionar/renomear/remover definição.
- Remover definição remove valores.
- Form do item lista as definições depois da ficha preset.
- Valor número aceita decimal; vazio permitido.

**Critério de aceite:** Criar extra “batch code” em Perfumes, preencher num item, reabrir a ficha e ver o valor.

---

### RF-07 — Busca textual

**Descrição:** Achar itens pelo texto em nome, descrição, tags e campos de ficha **pesquisáveis**.

**Comportamento:**
- Busca **global** (todas as coleções de item do usuário) e busca **na coleção** atual.
- Case-insensitive; preferir ignorar acentos (`unaccent` ou equivalente).
- Não inclui wishlist, decks ou builds na busca de inventário (builds têm busca própria na lista de setups, por nome).
- Resultado mostra coleção, nome, capa.

**Critério de aceite:** Item “Air Jordan 1 Chicago” encontrado por `chicago` e por SKU cadastrado na ficha.

---

### RF-08 — Filtros da ficha na coleção

**Descrição:** Na lista da coleção, filtrar pelos campos marcados filtráveis.

**Comportamento:**
- Controles gerados a partir do schema (texto, enum, inteiro).
- Filtros combinam com AND entre campos; texto = contém; enum = igualdade; inteiro = igualdade.
- Combinam com a busca textual da coleção.
- Wishlist **não** entra nesta lista.

**Critério de aceite:** Filtrar Yu-Gi-Oh! por raridade e Tênis por tamanho reduz a lista correta.

---

### RF-09 — Wishlist separada

**Descrição:** Cada coleção de **item** tem wishlist com a mesma ficha de domínio.

**Comportamento:**
- CRUD paralelo ao item (nome, ficha, fotos, extras, descrição).
- Navegação explícita “Wishlist” ≠ lista “Inventário”.
- Busca/filtros de inventário **não** retornam wishlist.
- Setups PC: wishlist **fora** da Onda 1 (só itens das 7 coleções de `item`).
- Decks não têm wishlist própria.

**Critério de aceite:** Wishlist com um whisky não aparece na lista nem na busca do inventário de Whisky.

---

### RF-10 — Já comprei

**Descrição:** Conclui o ciclo da wishlist.

**Comportamento:**
- Cria `item` copiando tipo, nome, descricao, notas, tags, ficha, extras e fotos (arquivos duplicados no disco).
- Apaga o `wishlist_item` e fotos antigas.
- Falha se o tipo não for coleção de item.

**Critério de aceite:** Wishlist de 1 perfume → ação → inventário tem 1 item equivalente e wishlist ficou vazia.

---

### RF-11 — Decks Yu-Gi-Oh!

**Descrição:** Deck nomeado com cartas do inventário.

**Comportamento:**
- UI dentro de Yu-Gi-Oh!: abas ou equivalente **Cartas** | **Decks**.
- Adicionar carta: só itens `YUGIOH` do usuário; quantidade ≥ 1.
- Recusar carta de outro tipo ou de outro usuário.
- Ao excluir a carta do inventário: linhas de deck que a referenciam são removidas (ou a exclusão do item é bloqueada se estiver em deck — **escolha: bloquear exclusão do item com mensagem** listando os decks).

**Critério de aceite:** Deck com 2 cartas válidas; tentar quantidade maior que `ficha.quantidade` da carta falha (RN-04); item em deck não apaga sem aviso.

---

### RF-12 — Builds de PC

**Descrição:** Setup com peças tipadas.

**Comportamento:**
- CRUD de build; adicionar/editar/remover peças; cada peça com form da ficha do `tipo_peca`.
- Abrir o build mostra cada peça e, na GPU, **VRAM, clock, barramento** (se preenchidos) com rótulos.
- Gadgets não aparecem como peças e peças não aparecem em Gadgets.

**Critério de aceite:** Build “PC da sala” com GPU (8 GB VRAM) e CPU; ao abrir, VRAM visível com rótulo, não como JSON.

---

### RF-13 — Layout celular e desktop

**Descrição:** Consulta no telefone; cadastro fundo no desktop.

**Comportamento:**
- Viewport ~390px: home, lista da coleção, busca e ficha de item usáveis **sem overflow horizontal do documento**.
- Lista: capa, nome, 1–2 campos-chave (ex.: marca; raridade).
- Desktop: formulário de ficha com seções (comum / domínio / extras / fotos).
- UI e mensagens em **português (Brasil)**.

---

### RF-14 — Exclusão e confirmação

**Descrição:** Apagar item, wishlist, deck ou build é irreversível e pede confirmação.

**Comportamento:**
- Remove registros filhos (fotos, peças, linhas de deck, extras) e arquivos no disco.

---

## Regras de negócio

| RN | Descrição |
|----|-----------|
| RN-01 | Wishlist **nunca** entra em listagem, busca ou filtro de inventário. |
| RN-02 | Único obrigatório para criar item ou wishlist: **nome** (não vazio). |
| RN-03 | `deck_carta.item_id` deve ser item `YUGIOH` do mesmo `usuario_id`. |
| RN-04 | `deck_carta.quantidade` ≤ `ficha.quantidade` da carta (se quantidade ausente, trata como 1). |
| RN-05 | Toda entidade de acervo pertence a um `usuario_id`; sem dono compartilhado nesta onda. |
| RN-06 | Chaves de `ficha` fora do schema do tipo → validação **400**. |
| RN-07 | Peça de build ≠ gadget; sem cópia automática entre os dois. |
| RN-08 | No máximo **uma** foto capa por dono. |
| RN-09 | Item referenciado por deck **não** é excluído até o dono tirar dos decks ou confirmar o bloqueio (mensagem lista os decks). |
| RN-10 | `ALLOW_REGISTRATION=false` impede novas contas; login de contas existentes segue. |
| RN-11 | “Já comprei” é atômico: ou existe item e some a wishlist, ou nada muda. |
| RN-12 | Filtros da lista de coleção só nos campos marcados filtráveis nesta spec. |

---

## Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF-01 | UI em pt-BR |
| RNF-02 | `npm run lint` e `npm run build` verdes |
| RNF-03 | Testes Vitest cobrindo RN-01, RN-02, RN-03, RN-04, RN-05, RN-06, RN-11 |
| RNF-04 | Senha nunca em log nem em JSON de resposta |
| RNF-05 | Uploads fora do git; caminho configurável (`UPLOAD_DIR`) |
| RNF-06 | PostgreSQL 16+; migrations Prisma versionadas |
| RNF-07 | Sessão cookie `httpOnly`, `secure` em produção, `sameSite=lax` |
| RNF-08 | Tempo de busca/lista aceitável para até ~5 000 itens do usuário (GIN / índice de texto) |

---

## Critérios de aceite globais (Definition of Done)

1. Registrar, login, logout; segundo usuário não vê o catálogo do primeiro.
2. No celular, buscar/filtrar e responder se um tênis, um card ou um whisky **já está no inventário**.
3. Abrir perfume e ver casa + notas; abrir GPU de um build e ver VRAM/speed com rótulos.
4. Wishlist da coleção **não** aparece como possuído; “Já comprei” migra para o inventário.
5. Deck só com cartas possuídas e quantidade respeitando o estoque da carta.
6. Campo extra “batch code” visível na ficha do perfume.
7. Fotos na ficha; anônimo não acessa o arquivo.
8. `npm test` (Vitest), `npm run lint` e `npm run build` verdes.

---

## Verificação

```powershell
npm test
npm run lint
npm run build
```

### Smoke manual

1. Registrar usuário A → home com 8 coleções vazias.
2. Cadastrar tênis com marca, SKU e foto → buscar `sku` → encontra.
3. Filtrar tênis por tamanho → lista coerente.
4. Wishlist de whisky → não aparece no inventário → “Já comprei” → aparece só no inventário.
5. Perfume com notas + extra “batch code” → reabrir ficha.
6. Carta YGO com quantidade 2 → deck com 2 cópias ok; 3 cópias falha.
7. Build com GPU (VRAM) e CPU → abrir setup e ler VRAM.
8. Viewport 390px na home e na lista: sem scroll horizontal da página.
9. Usuário B não vê itens de A; logout impede `/api` de itens.
10. `ALLOW_REGISTRATION=false` bloqueia novo cadastro.

---

## Riscos e mitigação

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Super-schema nos forms | Alta | Campos de ficha opcionais; RN-02 |
| JSONB difícil de filtrar | Média | Schema fixo + GIN; filtros só nos campos listados |
| Fotos enchendo o disco | Média | Limite 10 MB e 12 fotos; `UPLOAD_DIR` backup = copiar pasta |
| Registro aberto em deploy público | Média | `ALLOW_REGISTRATION` |
| Escopo de visitante vazando | Média | Fora desta spec; só `usuario_id` preparado |
| Cadastro de 8 coleções atrasar o núcleo | Média | Schemas em `lib/domain`; UI de form gerada pelo schema |

---

## Referências

- [ideas/catalogo-colecoes-pessoais.md](../../ideas/catalogo-colecoes-pessoais.md)

---

## Aprovação

| Revisor | Data | Status |
|---------|------|--------|
| Usuário | 2026-08-13 | Aprovada |

**Plano:** [plan.md](plan.md) — rascunho em validação.
