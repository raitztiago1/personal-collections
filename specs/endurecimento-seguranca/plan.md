# Plano — Endurecimento de segurança

**Spec:** [about.md](about.md) (**Aprovada** 2026-08-13)  
**Status plano:** **Implementado** (2026-08-13) — smoke manual do about.md pendente  
**Ideia:** [ideas/endurecimento-seguranca.md](../../ideas/endurecimento-seguranca.md)

Código já existe (catálogo Onda 1). Cada task de comportamento: **TDD** (teste falhando → código mínimo → verde). Tasks de config (T02) não pedem Vitest.

**Limite:** ≤ 5 arquivos por task, salvo T12 (DoD / docs cruzados).

**Não implementar** até este plano ser aprovado explicitamente.

---

## Ordem de execução

```text
T01 (auth-boot: secret + AUTH_URL)
  → T02 (env, README, compose bind)
  → T03 (headers HTTP + HSTS condicional)
  → T04 (limites de texto: helper + item)
    → T05 (limites: wishlist + decks)
    → T06 (limites: builds + extras)
  → T07 (validação de cadastro RF-H08)
  → T08 (módulo rate limit)
    → T09 (rate limit no cadastro + UI/API 429)
    → T10 (login: rate limit + hash dummy + UI)
  → T11 (fotos: magic bytes, path, cache, File.size)
    → T12 (DoD: test + lint + build)
```

T04–T06 são sequenciais no mesmo domínio de texto (evita conflito em helpers). T07 pode começar depois de T01. T08 não depende de T04. T11 só depende de fotos já existentes (independente de T04–T10), mas fica no fim para não misturar sessões. **Na prática:** T01→T12 em ordem; não paralelizar T04–T06.

---

## Mapa RF → Tasks

| RF / RN / RNF | Tasks |
|---------------|-------|
| RF-H01, RN-H01 | T01, T02 |
| RF-H02, RN-H02 | T01, T02 |
| RF-H03, RN-H03 | T02 |
| RF-H04 | T03 |
| RF-H05, RN-H04, RN-H05, RN-H06 | T11 |
| RF-H06, RN-H07 | T08, T09, T10 |
| RF-H07, RN-H08 | T10 |
| RF-H08, RN-H09 | T07, T09 |
| RF-H09, RN-H10 | T04, T05, T06 |
| RN-H11 (isolamento intacto) | T12 (regressão) |
| RNF-H01..H06, DoD | T12 |

---

## T01 — Guard de boot: `AUTH_SECRET` e `AUTH_URL`

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H01, RF-H02, RN-H01, RN-H02 |
| **Arquivos** | `lib/auth-boot.ts`, `lib/auth-boot.test.ts`, `auth.ts` |
| **Estimativa** | ~45 min |

### Ações

1. TDD: `assertAuthBoot({ nodeEnv, authSecret, authUrl })`.
2. Produção: secret inválido (D2 da spec) lança com mensagem pt-BR citando `openssl rand -base64 32`.
3. Produção: `AUTH_URL` obrigatória, URL absoluta `http:` ou `https:`; inválida/ausente lança em pt-BR.
4. Fora de produção: placeholder e `AUTH_URL` ausente **não** lançam.
5. `auth.ts`: chamar o guard na inicialização; `trustHost: process.env.NODE_ENV !== "production"`.
6. Não logar o valor de `AUTH_SECRET`.

### Critério de aceite

- Produção + `change-me` falha; produção + secret ≥ 32 ok; development + `change-me` ok.
- Produção sem `AUTH_URL` falha; development sem `AUTH_URL` ok.

### Verificação

```powershell
npx vitest run lib/auth-boot.test.ts
```

---

## T02 — Defaults do repo: env, README, Postgres localhost

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H01 (docs), RF-H03, RN-H03 |
| **Arquivos** | `.env.example`, `README.md`, `docker-compose.yml` |
| **Depende de** | T01 (mensagem de gerar secret alinhada) |
| **Estimativa** | ~20 min |

### Ações

1. `.env.example`: `AUTH_SECRET=gere-um-valor-longo` (sem `change-me`); comentário de geração; `AUTH_URL=http://localhost:3000`.
2. README: gerar secret **antes** do primeiro `dev`; passo explícito `ALLOW_REGISTRATION=false` depois da primeira conta se for expor; documentar `AUTH_URL`.
3. Compose: `"127.0.0.1:5432:5432"`. User/senha/db `catalogo` inalterados.

### Critério de aceite

- `.env.example` não contém `change-me`.
- `docker-compose.yml` tem bind loopback; não tem `"5432:5432"` sem host.

### Verificação

```powershell
Select-String -Path .env.example -Pattern "change-me"
Select-String -Path docker-compose.yml -Pattern "127.0.0.1:5432:5432"
```

---

## T03 — Headers HTTP mínimos e HSTS condicional

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H04 |
| **Arquivos** | `lib/http-headers.ts`, `lib/http-headers.test.ts`, `next.config.ts`, `middleware.ts` |
| **Estimativa** | ~40 min |

### Ações

1. TDD: `headersSegurancaFixos()` e `deveEnviarHsts({ protocol, forwardedProto })`.
2. Headers fixos: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`.
3. `next.config.ts` `headers()` aplica os fixos em `/:path*`.
4. Middleware: se `deveEnviarHsts` → `Strict-Transport-Security: max-age=31536000; includeSubDomains`. HTTP local **não** envia HSTS.
5. Sem CSP de scripts.

### Critério de aceite

- Testes: HTTPS / `x-forwarded-proto=https` → HSTS sim; `http:` → HSTS não.
- `next.config.ts` declara os quatro headers fixos.

### Verificação

```powershell
npx vitest run lib/http-headers.test.ts
```

---

## T04 — Tetos de texto: helper + item

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H09, RN-H10 |
| **Arquivos** | `lib/domain/limites-texto.ts`, `lib/domain/limites-texto.test.ts`, `lib/domain/itens.ts`, `lib/domain/itens.test.ts` |
| **Estimativa** | ~50 min |

### Ações

1. TDD do helper: nome 1–200 (obrigatório); textos opcionais ≤ 4000; tag ≤ 50; no máximo 30 tags; mensagens pt-BR com nome do campo.
2. `itens.ts` passa a usar o helper em `exigirNome` / `textoOpcional` / `tagsOpcional` (não duplicar constantes).
3. Testes de item: nome 201 falha; 200 passa; 31 tags falha. RN-02 (só nome obrigatório) permanece.

### Critério de aceite

- Helper e `criarItem`/`atualizarItem` recusam payload acima do teto com 400.

### Verificação

```powershell
npx vitest run lib/domain/limites-texto.test.ts lib/domain/itens.test.ts
```

---

## T05 — Tetos de texto: wishlist e decks

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H09, RN-H10 |
| **Arquivos** | `lib/domain/wishlist.ts`, `lib/domain/wishlist.test.ts`, `lib/domain/decks.ts`, `lib/domain/decks.test.ts` |
| **Depende de** | T04 |
| **Estimativa** | ~40 min |

### Ações

1. Trocar `exigirNome` / `textoOpcional` / tags locais pelo helper da T04.
2. Testes: nome 201 e notas/descrição 4001 falham; formato de deck ≤ 4000.

### Critério de aceite

- Wishlist e deck recusam texto acima do teto; casos felizes existentes continuam verdes.

### Verificação

```powershell
npx vitest run lib/domain/wishlist.test.ts lib/domain/decks.test.ts
```

---

## T06 — Tetos de texto: builds, peças e extras

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H09, RN-H10 |
| **Arquivos** | `lib/domain/builds.ts`, `lib/domain/builds.test.ts`, `lib/domain/campos-extra.ts`, `lib/domain/campos-extra.test.ts` |
| **Depende de** | T04 |
| **Estimativa** | ~40 min |

### Ações

1. Helper nos nomes/descrições/notas de build e peça; nome de extra ≤ 200; `valorTexto` ≤ 4000.
2. Testes de regressão + um caso de teto em cada módulo.

### Critério de aceite

- Build/peça/extra recusam texto acima do teto.

### Verificação

```powershell
npx vitest run lib/domain/builds.test.ts lib/domain/campos-extra.test.ts
```

---

## T07 — Validação de cadastro na API

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H08, RN-H09 |
| **Arquivos** | `lib/auth-register.ts`, `lib/auth-register.test.ts` |
| **Estimativa** | ~40 min |

### Ações

1. TDD em `registrarUsuario`: nome trim 1–80; e-mail trim 3–254, `local@domínio` com ponto no domínio; senha 8–200.
2. 400 com mensagem específica do campo (pt-BR).
3. 409 duplicado **inalterado**; 403 com `ALLOW_REGISTRATION=false` **inalterado**.
4. Server action / rota já chamam `registrarUsuario` — herdam a validação.

### Critério de aceite

- `{ nome: "", email: "x", senha: "12345678" }` → 400.
- E-mail sem `@` → 400; nome 81 chars → 400; e-mail existente → 409.

### Verificação

```powershell
npx vitest run lib/auth-register.test.ts
```

---

## T08 — Módulo de rate limit em memória

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H06, RN-H07, RNF-H05 |
| **Arquivos** | `lib/rate-limit.ts`, `lib/rate-limit.test.ts` |
| **Estimativa** | ~50 min |

### Ações

1. TDD: janela 15 min; `consumir(chave, teto)` incrementa e, se estourar, lança `HttpErro` 429 com mensagem pt-BR e `retryAfterSegundos`.
2. `consultar(chave, teto)` **não** incrementa (peek).
3. Relógio injetável nos testes (não `sleep` de 15 min): avançar o relógio libera a janela.
4. `ipDoRequest(headers)`: primeiro hop de `x-forwarded-for` ou `"local"`.
5. Sem Redis. Mapa em memória do processo.

### Critério de aceite

- 10ª+ com teto 10 falha; após expirar a janela, volta a aceitar.
- Peek não consome; `ipDoRequest` cobre header e fallback.

### Verificação

```powershell
npx vitest run lib/rate-limit.test.ts
```

---

## T09 — Rate limit no cadastro (API + UI)

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H06, RN-H07 |
| **Arquivos** | `lib/auth-register.ts`, `lib/auth-register.test.ts`, `app/api/register/route.ts`, `app/register/page.tsx` |
| **Depende de** | T07, T08 |
| **Estimativa** | ~45 min |

### Ações

1. `registrarUsuario` recebe `ip` (deps ou argumento). Consome teto **5 / 15 min** por IP **antes** de criar usuário. Estouro → `{ status: 429, body: { erro }, retryAfter }`.
2. `POST /api/register`: passa IP; resposta 429 com header `Retry-After`.
3. Server action de `/register`: se 429, redirect com `erro` em pt-BR (já exibido na página).
4. **Um** incremento: só dentro de `registrarUsuario` (não no middleware).

### Critério de aceite

- Teste: 6º cadastro do mesmo IP na janela → 429; mensagem não vaza senha.
- Rota define `Retry-After` quando 429.

### Verificação

```powershell
npx vitest run lib/auth-register.test.ts lib/rate-limit.test.ts
```

---

## T10 — Login: rate limit, hash dummy e UI

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H06, RF-H07, RN-H07, RN-H08 |
| **Arquivos** | `lib/auth-login.ts`, `lib/auth-login.test.ts`, `auth.ts`, `app/login/page.tsx` |
| **Depende de** | T08 |
| **Estimativa** | ~70 min |

### Ações

1. Extrair `autenticarPorCredenciais({ email, senha, ip }, deps)` (TDD):
   - `consumir` e-mail (10 / 15 min) **e** IP (30 / 15 min); o mais restritivo vale.
   - Peek **não** entra nesta função (fica na UI).
   - Usuário ausente: `bcrypt.compare` contra hash dummy custo 12 (constante no módulo, não é `senha_hash` de ninguém).
   - Usuário presente: `compare` no hash real.
   - Falha de credencial → `null` (mesmo resultado miss vs senha errada).
   - Estouro de limite → `HttpErro` 429.
2. `authorize` do Auth.js chama essa função (passar IP do `Request` se a API v5 expuser; senão `"local"` + `x-forwarded-for` via headers do request).
3. Server action de `/login`: `consultar` o limite **sem** incrementar; se já estourou, `redirect("/login?erro=rate-limit")` **sem** `signIn`. Senão `signIn` (quem incrementa é o `authorize`).
4. Página: `erro=rate-limit` mostra a mensagem de muitas tentativas.

### Critério de aceite

- Teste: miss chama `compare`; hit chama `compare`; dummy não é hash de usuário do repo fake.
- 11ª tentativa do mesmo e-mail lança 429; 31ª do mesmo IP também.
- UI trata `erro=rate-limit`.

### Verificação

```powershell
npx vitest run lib/auth-login.test.ts lib/rate-limit.test.ts
```

---

## T11 — Fotos: magic bytes, path, cache, tamanho cedo

| Campo | Valor |
|-------|-------|
| **RFs** | RF-H05, RN-H04, RN-H05, RN-H06 |
| **Arquivos** | `lib/fotos.ts`, `lib/fotos.test.ts`, `app/api/fotos/route.ts` |
| **Estimativa** | ~70 min |

### Ações

1. TDD: detectar jpeg (`FF D8 FF`), png (8 bytes oficiais), webp (`RIFF` + `WEBP` no offset 8). HTML/`type=image/jpeg` → 400, mensagem da família já usada.
2. `mime` persistido = tipo detectado, **não** o do cliente.
3. GET (`respostaGetFoto`): `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`.
4. `resolverCaminhoSeguro(uploadDir, relativo)`: `path.resolve`; se não estiver dentro do dir → 404, sem `readFile`. Teste com `../`.
5. POST da rota: se `arquivo.size > 10 MB`, 400 **antes** de `arrayBuffer()`. Domínio continua checando `byteLength`.

### Critério de aceite

- JPEG falso rejeitado; GET inclui os dois headers; path `..` não lê fora; `size` grande na rota não chama persistência.

### Verificação

```powershell
npx vitest run lib/fotos.test.ts
```

---

## T12 — Gates de DoD

| Campo | Valor |
|-------|-------|
| **RFs** | RNF-H02, RNF-H03, RN-H11, DoD |
| **Arquivos** | (nenhum de produto, salvo ajuste pontual se um gate falhar) |
| **Depende de** | T01–T11 |
| **Estimativa** | ~30 min |

### Ações

1. Rodar a suíte completa, lint e build.
2. Confirmar testes de isolamento (`lib/isolamento.test.ts`) verdes.
3. Se algo quebrar, **systematic-debugging** — não “quick fix” sem causa.

### Critério de aceite

- DoD da spec: itens 1–8 cobertos por teste ou config (compose/env).
- `npm test`, `npm run lint`, `npm run build` verdes.

### Verificação

```powershell
npm test
npm run lint
npm run build
```

Smoke manual (humano, after.md da spec): secret gerado, Postgres em localhost, 10 logins falhos, foto falsa, DevTools nos headers da foto, `ALLOW_REGISTRATION=false`.

---

## Dependências entre tasks

| Task | Precisa de |
|------|------------|
| T01 | — |
| T02 | T01 (textos de secret alinhados) |
| T03 | — (pode após T01) |
| T04 | — |
| T05 | T04 |
| T06 | T04 |
| T07 | — |
| T08 | — |
| T09 | T07, T08 |
| T10 | T08 |
| T11 | — |
| T12 | T01–T11 |

---

## Fora deste plano (spec: fora de escopo)

RLS, Argon2id, Redis, captcha, 2FA, CSP de scripts, esconder enumeração de e-mail no cadastro.

---

## Aprovação

| Revisor | Data | Status |
|---------|------|--------|
| Usuário | 2026-08-13 | Aprovado — execução T01→T12 |

**Depois de aprovado:** skill `subagent-driven-development` (um subagente por task, TDD) na ordem T01→T12.
