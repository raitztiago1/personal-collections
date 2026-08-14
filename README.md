# Catálogo de Coleções Pessoais

App web para inventariar coleções pessoais (tênis, whisky, perfumes, Yu-Gi-Oh!, mangás, livros, gadgets e setups de PC), com wishlist, decks, fotos e busca no celular.

Spec: [specs/catalogo-colecoes-pessoais/about.md](specs/catalogo-colecoes-pessoais/about.md)  
Ideia: [ideas/catalogo-colecoes-pessoais.md](ideas/catalogo-colecoes-pessoais.md)

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4
- PostgreSQL 16 + Prisma 7 (`prisma.config.ts`, adapter `pg`)
- Auth.js (`next-auth` v5 beta), Credentials, `AUTH_SECRET`
- Vitest nos testes de domínio

O client Prisma é gerado em `generated/` (gitignored). Depois de clonar: `npx prisma generate`.

## Pré-requisitos

- Node.js 20+
- Docker Desktop (recomendado) **ou** PostgreSQL 16 acessível em `localhost:5432`

Sem Docker: aponte `DATABASE_URL` para o seu Postgres. A extensão `unaccent` é opcional (ver [Busca e índices](#busca-e-índices)).

## Subir localmente

1. Suba o banco (imagem `postgres:16`, user/senha/db `catalogo`, porta 5432):

   ```powershell
   docker compose up -d
   ```

2. Copie o exemplo de ambiente e **defina `AUTH_SECRET`** (obrigatório; a sessão Auth.js não sobe sem ele):

   ```powershell
   copy .env.example .env
   ```

   Gere um segredo, por exemplo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

3. Instale dependências, gere o client Prisma e aplique as migrations:

   ```powershell
   npm install
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Rode o app:

   ```powershell
   npm run dev
   ```

5. Abra [http://localhost:3000](http://localhost:3000), vá em **Registrar** e crie a primeira conta.

Para fechar novos cadastros depois da sua conta: `ALLOW_REGISTRATION=false` no `.env` e reinicie o `dev`. Login das contas existentes continua.

## Variáveis de ambiente

| Variável | Exemplo | Notas |
|----------|---------|--------|
| `DATABASE_URL` | `postgresql://catalogo:catalogo@localhost:5432/catalogo` | Compose local |
| `AUTH_SECRET` | (segredo longo) | **Obrigatório.** Não commitar valor real |
| `ALLOW_REGISTRATION` | `true` | `false` bloqueia `/register` (403) |
| `UPLOAD_DIR` | `data/uploads` | Fotos fora do git; backup = copiar a pasta |

## Busca e índices

A migration inicial cria índice **GIN** em `item.ficha` e tenta `CREATE EXTENSION unaccent` (módulo contrib da imagem `postgres:16` do Compose).

A busca (T09) **não depende** de `unaccent` no SQL: ignora acentos no JavaScript (`normalize("NFD")`). Se o Postgres não tiver a extensão (instalação sem contrib), a migration só avisa e segue.

## Verificação

```powershell
npm test
npm run lint
npm run build
```

## Smoke manual (humano)

Checklist da spec — executar no browser após o setup:

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
