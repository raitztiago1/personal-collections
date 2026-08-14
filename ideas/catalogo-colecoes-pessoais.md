# Catálogo de coleções pessoais

**Status:** Aprovada para spec  
**Data:** 2026-08-13  
**Aprovada em:** 2026-08-13  
**Tipo:** Produto novo (idea-refine)  
**Pasta:** `personal-collections`  
**Próximo:** `specs/catalogo-colecoes-pessoais/plan.md`

---

## Como Poderíamos…?

> **Como poderíamos ter um inventário pessoal, rápido de consultar na hora de comprar, em que cada coleção tem ficha profunda do seu universo — sem virar uma planilha genérica nem um app separado por hobby?**

O problema não é “guardar uma lista”. É **consultar o que já existe no meio de uma compra** e, em casa, **abrir a unidade e ver o que importa naquele hobby**: notas de um perfume, VRAM da GPU, raridade de um card, colorway de um tênis.

---

## Problema

Hoje as coleções vivem em cabeças, fotos soltas e apps fragmentados. Cada universo pede um vocabulário diferente; um CRUD de “categoria + nome + foto” empobrece o hobby. Um Notion/Airtable do zero exige montar a ficha toda vez. Apps especializados (tênis, whisky, cards) não conversam na hora de decidir uma compra.

| Dor | Por que dói |
|-----|-------------|
| Consulta na loja / checkout | Sem um lugar único e rápido, compra-se duplicata ou esquece o que já tem |
| Ficha rasa | “Perfume” sem notas, “PC” sem VRAM, “card” sem edição — inútil para quem aprofunda |
| Modelos misturados | Um tênis é um item; um PC é um **build** de peças; um deck é uma **composição** de cartas |
| Wishlist misturada com o que já tem | Polui o inventário e atrapalha a pergunta “eu já tenho isso?” |
| Querer mostrar a coleção | Eventualmente outra pessoa vê, sem editar |

**Quem usa:** o dono (cadastra, aprofunda, consulta) e, depois, um visitante só-leitura.

**Onde:** celular para checar; desktop para cadastrar e ir fundo.

---

## Alternativas consideradas

| Conceito | Prós | Contras |
|----------|------|---------|
| **A) Apps separados por hobby** | Profundidade máxima em cada nicho | Fragmenta a consulta na hora de comprar; N logins |
| **B) Catálogo genérico** (nome, foto, tags) | Rápido de construir | Rasos demais; o dono é “chato” e vai abandonar |
| **C) Schemas rígidos** só para as coleções citadas | Fichas profundas de cara | Trava quando o hobby evolui (novo campo, nova coleção) |
| **D) Builder tipo Notion** | Flexível para sempre | Começa vazio; consulta/compra fica ruim; muito setup |
| **E) Híbrido: fichas prontas + campos extras + wishlist à parte + builds/decks** | Profundo no dia 1, extensível, consulta clara | Precisa desenhar bem os tipos (item vs composição) |

**Escolha:** **E**.

Três ideias que **não** entram no núcleo: planilha glorificada, wiki de texto, e misturar “tenho” com “quero” no mesmo status de item.

---

## Conceito escolhido

Um **webapp de catálogo híbrido**:

1. **Coleções com ficha pronta** para os universos já conhecidos (tênis, whisky, perfume, Yu-Gi-Oh!, mangá, livro, gadgets, builds de PC).
2. **Campos extras** por coleção, quando o dono quiser aprofundar além do preset.
3. **Wishlist separada** por coleção — não mistura com o inventário.
4. **Dois tipos de “unidade”:** item avulso **e** composição (build de PC, deck de cards).
5. **Consulta rápida** (busca/filtro) no celular; **ficha completa** no desktop.
6. **Dono edita; visitante só vê** (visitante pode ficar na onda seguinte, mas o modelo já prevê).

### O que toda unidade tem

Nome, fotos (capa + galeria), descrição, notas pessoais, data de aquisição, preço pago (opcional), tags. Isso é o chão. O que muda é a **ficha de domínio**.

### Fichas de domínio (preset — ponto de partida, não teto)

Campos abaixo são **intenção de produto**, não schema final. A spec detalha tipos, obrigatoriedade e filtros.

**Tênis** — marca, linha/modelo, colorway, código/SKU, tamanho, ano, condição, colaboração.

**Whisky** — destilaria, região, idade, ABV, tipo de barril, engarrafador (oficial/independente), volume, nível restante, notas de degustação, nota pessoal.

**Perfume** — casa/fabricante, linha, concentração (EDT/EDP/parfum…), perfumista, ano, volume, notas (topo / coração / base), ocasião/estação, restante.

**Yu-Gi-Oh! (carta)** — nome, set/edição, código, raridade, condição, idioma, quantidade, tipo, atributo, nível/rank/link, ATK/DEF.

**Yu-Gi-Oh! (deck)** — nome, formato; lista de cartas + quantidade **apontando para cartas do inventário**.

**Mangá** — obra, volume, autor/artista, editora, idioma, status da obra, quanto da coleção está na estante (ex.: 8/12).

**Livro** — título, autor, editora, ISBN, ano, edição, formato, status de leitura.

**Gadgets** (DS, iPod, periféricos avulsos…) — tipo de aparelho, marca, modelo, ano, capacidade/armazenamento, condição, acessórios.

**PC / build** — um setup nomeado (ex.: “PC da sala”) composto de **peças**, cada uma com ficha própria:

| Peça | Exemplos de profundidade |
|------|--------------------------|
| GPU | marca, modelo, VRAM (GB), clock, barramento |
| CPU | marca, modelo, núcleos/threads, clock |
| RAM | capacidade, speed, tipo (DDR4/5) |
| Armazenamento | tipo, capacidade, interface |
| Placa-mãe, PSU, gabinete, cooler, monitor, periféricos do setup | campos do tipo correspondente |

Gadget avulso ≠ peça de um build. Um iPod é item da coleção Gadgets. A RTX do PC da sala é peça daquele build (e pode aparecer também como item se um dia sair do PC — isso é detalhe de spec, não de v1).

### Wishlist

Lista **à parte**, por coleção. Mesma linguagem da ficha (um “quero esse perfume” parece um perfume, não um post-it). Não conta como “já tenho”. A consulta na loja pergunta primeiro ao **inventário**.

### Extensão

- Novo campo numa coleção existente (ex.: “família olfativa” em perfumes).
- Nova coleção no futuro (o híbrido existe para isso; **v1 não precisa de um construtor genérico completo**, só de campos extras nas coleções oficiais).

---

## Escopo proposto

### Onda 1 — Dono, inventário, consulta, wishlist

**Incluir:**

1. Login do dono (o app não fica aberto na internet).
2. Navegação por coleções + busca/filtro para responder “já tenho?”.
3. CRUD de itens com fotos, descrição e ficha de domínio das coleções oficiais.
4. Campos extras por coleção (pelo menos: nome do campo, valor texto/número).
5. Wishlist **separada** por coleção.
6. Yu-Gi-Oh!: cartas + decks ligados às cartas que o dono tem.
7. PC: builds com peças tipadas (GPU com VRAM etc.) **e** coleção de gadgets.
8. Layout usável no celular (lista + ficha) e confortável no desktop (cadastro profundo).

**Fora de escopo da Onda 1:**

- Visitante só-leitura / link público da coleção (Onda 2; modelo já reserva “dono vs ver”).
- Marketplace, preço de mercado, importação automática de APIs (Cardmarket, Discogs, etc.).
- Construtor total estilo Notion para criar coleções do zero pela UI.
- App nativo; PWA só se vier de graça com o webapp.
- Venda, empréstimo, seguro, relatórios financeiros pesados.
- Código de barras / OCR na loja.
- Multi-idioma da UI (conteúdo do acervo pode ser o que o dono digitar).

### Onda 2 (reservada)

- Papel visitante (ver, não editar).
- Campos extras com tipos mais ricos e filtros.
- “Deck incompleto” / peças que o build ainda não tem.
- Importações pontuais se o cadastro manual doer.

---

## Critérios de sucesso

1. No celular, achar em poucos segundos se um tênis, um card ou um whisky **já está no inventário**.
2. Abrir um perfume e ver fabricante + notas; abrir uma GPU do build e ver VRAM, speed e o resto da ficha — **sem campo genérico “detalhes” no lugar disso**.
3. Wishlist de uma coleção **não aparece** como item possuído.
4. Montar um deck só com cartas cadastradas; montar um PC e ver as peças.
5. Adicionar um campo extra (ex.: “batch code” no perfume) e vê-lo na ficha daquele item.
6. Cadastrar e consultar com fotos, no desktop e no celular.

---

## Riscos

- **Super-schema:** querer todos os campos de todos os hobbies na v1. Mitigar: presets bons o suficiente + campos extras; profundidade “enciclopédia” fica para depois.
- **Item vs composição:** tratar deck/build como item achatado. Mitigar: dois conceitos desde o início.
- **Fotos:** volume e backup. Mitigar: upload local no servidor do app; galeria simples na v1.
- **Escopo de visitante vazando para v1** e atrasando o dono. Mitigar: Onda 2 explícita.
- **Cadastro trabalhoso:** se cada item pedir 30 campos obrigatórios, o app morre. Mitigar: poucos obrigatórios (nome + coleção); o resto é opcional.

---

## Decisões já tomadas (refino)

| Tema | Decisão |
|------|---------|
| Onde consulta | Celular para checar; desktop para cadastrar e aprofundar |
| PC | Build (peças com spec) **e** coleção de gadgets |
| Modelo de dados | Fichas prontas + campos extras |
| Na hora de comprar | Consultar o que tem + wishlist |
| Wishlist | Lista separada por coleção, não status no item |
| Yu-Gi-Oh! | Cartas avulsas + decks apontando para cartas que já tem |
| Quem usa | Dono agora; outra pessoa vendo, sem editar, depois |

**Aberto para a spec (não bloqueia a ideia):** stack, hospedagem concreta, se o visitante é conta ou link.

---

## Próximo passo

→ Smoke manual (checklist no README / about.md) e skill **`spec-validator`**.
