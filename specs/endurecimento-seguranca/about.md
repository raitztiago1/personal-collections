# Endurecimento de segurança

## Metadados

| Campo | Valor |
|-------|-------|
| **Feature slug** | `endurecimento-seguranca` |
| **Status** | **Aprovada** (2026-08-13) |
| **Data** | 2026-08-13 |
| **Aprovada em** | 2026-08-13 |
| **Origem** | [ideas/endurecimento-seguranca.md](../../ideas/endurecimento-seguranca.md) (pacote E, aprovado 2026-08-13) |
| **Stack** | Next.js 16 (App Router), Auth.js v5, Prisma 7, PostgreSQL 16, Vitest |
| **Impacto** | Auth, fotos, headers HTTP, compose, env, validação de textos. **Não** mexe em fichas, busca, decks, wishlist nem isolamento `usuarioId`. |
| **Complementa** | [catalogo-colecoes-pessoais/about.md](../catalogo-colecoes-pessoais/about.md) (RF-01, RF-05, RN-10, RNF-04, RNF-07) |

---

## Contexto

O catálogo já autentica, isola dados por `usuarioId` e serve fotos só com sessão. A auditoria de 13 ago 2026 **não** achou CVE no `npm audit`, nem IDOR/SQLi/XSS no domínio. Achou defaults perigosos (`AUTH_SECRET=change-me`, Postgres publicado na LAN) e falta de freio operacional (MIME da foto, rate limit, headers, `trustHost`).

O produto continua sendo **um dono, catálogo pessoal**. Esta spec não cria visitante público, 2FA, RLS nem WAF.

---

## Objetivo

Fechar os achados da auditoria em três camadas: o app **não sobe pronto para vazamento**; fotos e HTTP não vazam por sniff/cache; login e cadastro têm freio se a porta ficar visível.

---

## Decisões fechadas nesta spec

| # | Pergunta | Decisão |
|---|----------|---------|
| D1 | Onde recusar secret fraco | Módulo de domínio testável (`lib/`), chamado na inicialização do Auth.js. Só falha com `NODE_ENV=production`. Dev local continua subindo. |
| D2 | O que é secret inválido em produção | Ausente, vazio, comprimento &lt; 32 **ou** igual (case-insensitive, trim) a um placeholder conhecido: `change-me`, `gere-um-valor-longo`, `substitua-por-openssl-rand-base64-32`. |
| D3 | Postgres | Compose publica `127.0.0.1:5432:5432`. Senha `catalogo` permanece **somente** porque o bind é localhost. |
| D4 | `trustHost` | `true` só fora de produção. Em produção exige `AUTH_URL` (https ou http explícito). Sem `AUTH_URL` em produção → falha na subida, mesma família do secret. |
| D5 | Rate limit | Memória do processo; uma instância. Sem Redis. |
| D6 | Tetos de rate limit | Login: **10** / 15 min por e-mail (trim + minúsculas) **e** **30** / 15 min por IP. Cadastro: **5** / 15 min por IP. |
| D7 | Enumeração no cadastro | **Não muda.** 409 “Este e-mail já está cadastrado.” continua (RF-01 do catálogo). |
| D8 | Hash | Continua bcryptjs custo 12. Miss de usuário faz `compare` contra um hash dummy fixo (mesmo custo). |
| D9 | Fonte da verdade da foto | **Magic bytes**, não o `File.type` do cliente. MIME gravado e servido = tipo detectado. |
| D10 | CSP | Só `frame-ancestors 'none'`. Sem CSP de scripts nesta onda. |
| D11 | HSTS | Só quando o request é HTTPS (`https:` ou `x-forwarded-proto=https`). HTTP local não leva HSTS. |
| D12 | RLS / Argon2 / captcha / 2FA | Fora desta spec. |

---

## Escopo

### Dentro

| Bloco | Itens |
|-------|-------|
| Boot / env | Recusar secret e `AUTH_URL` ausente em produção; `.env.example` e README honestos; `ALLOW_REGISTRATION=false` como passo pós-primeira-conta |
| Compose | Bind Postgres em loopback |
| Auth.js | `trustHost` só em dev; `AUTH_URL` em produção |
| Headers | `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` / CSP `frame-ancestors 'none'`; HSTS condicional |
| Fotos | Magic bytes; headers na resposta; path dentro de `UPLOAD_DIR`; `File.size` antes de ler o corpo |
| Auth operacional | Rate limit; hash dummy; e-mail/nome/comprimento na API de registro |
| Textos | Teto de tamanho em nome, descrição, notas, tags (item, wishlist, deck, build, peça, extra, usuário) |
| Testes | Vitest nas regras novas; lint + build |

### Fora

- RLS no Postgres; Argon2id; Redis; captcha; 2FA; lockout permanente de conta.
- Esconder enumeração de e-mail no cadastro.
- CSP de `script-src` / `default-src`.
- TLS no Postgres; bind IPv6; backup automatizado.
- Mudança de fichas, busca, decks, wishlist, isolamento (RN-05 do catálogo).
- Visitante só-leitura.

---

## Requisitos funcionais

### RF-H01 — Secret de sessão em produção

**Descrição:** Em produção o app não autentica com placeholder.

**Comportamento:**
- Com `NODE_ENV=production`, se `AUTH_SECRET` for inválido (D2), a inicialização do Auth **lança** com mensagem em pt-BR dizendo para gerar um valor (`openssl rand -base64 32` ou equivalente Node).
- Com `NODE_ENV` ≠ `production`, placeholder não derruba o `npm run dev`.
- `.env.example` **não** usa `change-me`. Usa valor claramente falso (ex.: `gere-um-valor-longo`) e comentário de como gerar. Lista `AUTH_URL=http://localhost:3000`.
- README: gerar secret **antes** do primeiro `dev` em máquina nova; depois da primeira conta, `ALLOW_REGISTRATION=false` se for expor.

**Critério de aceite:** Teste unitário: produção + `change-me` falha; produção + secret ≥ 32 chars ok; development + `change-me` ok. `.env.example` não contém `change-me`.

---

### RF-H02 — Origem do Auth.js

**Descrição:** Produção não confia no `Host` do cliente.

**Comportamento:**
- `trustHost: true` apenas quando `NODE_ENV` ≠ `production`.
- Produção: `AUTH_URL` obrigatória (URL absoluta com `http:` ou `https:`). Ausente ou inválida → falha na subida, mensagem em pt-BR.
- Cookie continua httpOnly, `sameSite=lax`, `secure` em produção (RNF-07 do catálogo).

**Critério de aceite:** Teste: produção sem `AUTH_URL` falha; development sem `AUTH_URL` não falha.

---

### RF-H03 — Postgres só no localhost

**Descrição:** O compose não publica o banco na LAN.

**Comportamento:**
- `ports` do serviço `postgres`: `"127.0.0.1:5432:5432"`.
- User/senha/db `catalogo` no exemplo local **não mudam**.

**Critério de aceite:** `docker-compose.yml` contém o bind de loopback; não contém `"5432:5432"` sem host.

---

### RF-H04 — Headers HTTP mínimos

**Descrição:** Respostas da app não ficam à mercê do sniffing/clickjacking do browser.

**Comportamento:**
- Todas as respostas (Next `headers()` e/ou middleware):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy: frame-ancestors 'none'`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` **somente** se o request for HTTPS (protocolo `https:` ou primeiro hop de `x-forwarded-proto` = `https`).
- HTTP em `localhost` **não** envia HSTS.

**Critério de aceite:** Config/teste documentado: headers presentes; HSTS ausente em HTTP.

---

### RF-H05 — Fotos: conteúdo real, cache e path

**Descrição:** Upload e GET de foto não confiam no cliente nem em cache compartilhado.

**Comportamento:**
- Detectar tipo pelos **magic bytes** (mínimo):
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47 0D 0A 1A 0A`
  - WEBP: `RIFF` + `WEBP` no offset 8
- Se os bytes não baterem com jpeg/png/webp → **400**, mesma família de mensagem já usada (“Tipo de imagem não permitido…”).
- `mime` persistido e `Content-Type` do GET = tipo detectado, não `arquivo.type`.
- `GET /api/fotos/:id` (além da auth já existente): `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`.
- Caminho no disco: `path.resolve(UPLOAD_DIR, caminhoRelativo)` deve ficar **estritamente dentro** de `path.resolve(UPLOAD_DIR)`. Caso contrário → 404, sem ler o arquivo.
- Na rota POST: se `File.size > 10 MB`, **400** **antes** de `arrayBuffer()`. O domínio continua recusando `bytes.byteLength > 10 MB`.

**Critério de aceite:** Teste: payload HTML/PNG poliglota ou `.html` com `type=image/jpeg` é rejeitado. GET autenticado inclui `nosniff` e `private, no-store`. Teste de path: `caminho` com `..` não lê fora de `UPLOAD_DIR`. POST com `File` cujo `size` &gt; 10 MB falha sem persistir.

---

### RF-H06 — Rate limit de login e cadastro

**Descrição:** Força bruta e cadastro em massa levam 429.

**Comportamento:**
- Contador **em memória** do processo, janela deslizante ou bucket de **15 minutos**.
- Login (todo caminho que chega em `authorize` / credentials, inclusive `/api/auth/*` e a server action de `/login`):
  - chave e-mail (trim + minúsculas): máximo **10** tentativas na janela;
  - chave IP: máximo **30** na janela.
- Cadastro (`registrarUsuario`, portanto `/register` e `POST /api/register`): **5** por IP na janela.
- Estouro → **429**, body `{ erro }` em pt-BR (ex.: “Muitas tentativas. Tente de novo em alguns minutos.”), header `Retry-After` em segundos quando a resposta for HTTP da API.
- UI de login/registro mostra a mensagem (query `erro` ou JSON), sem stack.
- IP: primeiro endereço de `x-forwarded-for` se existir; senão um fallback estável (`local`) para o processo. Não confiar em `x-forwarded-for` para **afrouxar** o limite (o mais restritivo entre e-mail e IP vale no login).
- Processo reiniciado zera o contador (aceitável nesta onda).

**Critério de aceite:** Teste de domínio: 10ª+ tentativa do mesmo e-mail na janela é recusada; após expirar a janela, volta a aceitar. `POST /api/register` acima do teto → 429. Login via credentials acima do teto não autentica e a UI/API comunica o limite.

---

### RF-H07 — Login sem oráculo de tempo óbvio

**Descrição:** E-mail inexistente não responde visivelmente mais rápido que senha errada.

**Comportamento:**
- Se o usuário não existe, ainda assim corre `bcrypt.compare` da senha enviada contra um **hash dummy** fixo de custo 12 (não é senha de conta alguma).
- Depois disso, retorna o mesmo “credenciais inválidas” de sempre (não distingue usuário ausente vs senha errada).

**Critério de aceite:** Teste: `authorize`/função de login chama `compare` tanto no miss quanto no hit; dummy não está no banco como `senha_hash` de usuário.

---

### RF-H08 — Cadastro validado na API

**Descrição:** HTML required não é a única barreira.

**Comportamento:**
- `registrarUsuario` (e portanto `POST /api/register` e a server action) exige:
  - **nome:** string trim, 1–80 caracteres;
  - **e-mail:** trim, 3–254 caracteres, formato `local@domínio` com pelo menos um ponto no domínio (validação simples, não RFC completa);
  - **senha:** já existente, mínimo 8 caracteres (sem teto novo além de 200 caracteres para evitar payload absurdo).
- Falha → **400** com mensagem em pt-BR (nome/e-mail/senha, específica do campo).
- 409 de e-mail duplicado **não muda**.
- 403 com `ALLOW_REGISTRATION=false` **não muda**.

**Critério de aceite:** POST JSON `{ nome: "", email: "x", senha: "12345678" }` → 400. E-mail vazio ou sem `@` → 400. Nome de 81 caracteres → 400. E-mail já existente → 409.

---

### RF-H09 — Teto de tamanho nos textos do acervo

**Descrição:** CRUD não aceita megabytes de texto.

**Comportamento:** (após trim; vazio opcional continua opcional, RN-02 do catálogo intacto)

| Campo | Máximo |
|-------|--------|
| Nome (item, wishlist, deck, build, peça, definição de extra) | 200 |
| Nome do usuário (cadastro) | 80 (RF-H08) |
| `descricao`, `notasPessoais`, `notas`, `formato` | 4 000 |
| Tag individual | 50 |
| Quantidade de tags por entidade | 30 |
| Valor texto de campo extra | 4 000 |

- Exceder → **400**, mensagem em pt-BR citando o campo.

**Critério de aceite:** Teste de domínio em item (e analogamente wishlist/build/deck/extra): nome de 201 chars falha; 200 passa. 31 tags falha.

---

## Regras de negócio

| RN | Descrição |
|----|-----------|
| RN-H01 | Em produção, secret placeholder ou curto **impede** a sessão de subir. Em development, não. |
| RN-H02 | Em produção, `AUTH_URL` é obrigatória; `trustHost` não fica `true`. |
| RN-H03 | Postgres do compose não escuta em `0.0.0.0:5432`. |
| RN-H04 | Tipo da foto = magic bytes; MIME do cliente é ignorado para persistir/servir. |
| RN-H05 | GET de foto autenticada é `private, no-store` + `nosniff`. |
| RN-H06 | Arquivo de foto só é lido se o path resolvido estiver dentro de `UPLOAD_DIR`. |
| RN-H07 | Login e cadastro têm teto por janela de 15 min (D6); estouro = 429, não 401 genérico no cadastro. |
| RN-H08 | Miss de usuário no login ainda executa bcrypt contra hash dummy. |
| RN-H09 | Mensagem de e-mail duplicado no cadastro permanece a do catálogo (não “credenciais inválidas”). |
| RN-H10 | Textos do acervo respeitam os tetos da tabela RF-H09; RN-02 (só nome obrigatório) permanece. |
| RN-H11 | Isolamento `assertDono` / 404 do catálogo **não muda**. |

---

## Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF-H01 | UI e erros em pt-BR |
| RNF-H02 | `npm test`, `npm run lint`, `npm run build` verdes |
| RNF-H03 | Vitest cobre: secret (RF-H01), AUTH_URL (RF-H02), magic bytes + path (RF-H05), rate limit (RF-H06), dummy hash (RF-H07), validação de registro (RF-H08), tetos de texto (RF-H09) |
| RNF-H04 | Senha e `AUTH_SECRET` nunca em log nem no JSON de erro |
| RNF-H05 | Rate limit em memória; aceitável perder estado no restart |
| RNF-H06 | Sem dependência nova obrigatória (sem Redis, sem lib de captcha). Headers do Next nativos. |

---

## Fluxos

### Boot em produção

1. Ler env.
2. Validar `AUTH_SECRET` (D2) e `AUTH_URL`.
3. Se inválido → processo/Auth falha com mensagem acionável.
4. Se ok → Auth.js sobe com `trustHost: false` e cookies secure.

### Upload de foto

1. Sessão obrigatória (já existe).
2. Se `File.size` &gt; 10 MB → 400, sem ler o corpo.
3. Ler bytes; magic bytes; persistir mime detectado; gravar em `{UPLOAD_DIR}/{usuarioId}/{uuid}.{ext}`.
4. GET: dono + headers RF-H05; recusar path fora do dir.

### Login

1. Rate limit (e-mail e IP).
2. Buscar usuário; `bcrypt.compare` (real ou dummy).
3. Sucesso → sessão. Falha → mesma mensagem de credenciais, ou 429 se o teto estourou.

### Cadastro

1. Rate limit por IP.
2. Validar nome/e-mail/senha (RF-H08).
3. RN-10 do catálogo (`ALLOW_REGISTRATION`).
4. Unicidade de e-mail → 409 com a mensagem atual.

---

## Critérios de aceite globais (Definition of Done)

1. Produção com `AUTH_SECRET=change-me` não sobe sessão; mensagem diz como gerar.
2. `docker-compose.yml` publica Postgres só em `127.0.0.1:5432`.
3. Upload jpeg falso (HTML) é 400; GET da foto autenticada manda `nosniff` e `private, no-store`.
4. Estourar o teto de login/cadastro → 429 e mensagem em pt-BR.
5. E-mail inexistente no login ainda passa por bcrypt dummy.
6. `POST /api/register` com e-mail/nome inválidos → 400; duplicado → 409.
7. Nome de item com 201 caracteres → 400.
8. `npm test`, `npm run lint`, `npm run build` verdes; testes de isolamento existentes continuam passando.

---

## Verificação

```powershell
npm test
npm run lint
npm run build
```

### Smoke manual

1. `copy .env.example .env`, gerar `AUTH_SECRET` real, `npm run dev` sobe.
2. Compose: Postgres acessível em `localhost:5432` nesta máquina.
3. Login errado 10 vezes no mesmo e-mail → mensagem de muitas tentativas.
4. Enviar um `.txt` renomeado / HTML com type jpeg → recusado.
5. Abrir uma foto autenticada (DevTools): `Cache-Control: private, no-store` e `nosniff`.
6. `ALLOW_REGISTRATION=false` continua bloqueando cadastro (regressão RN-10).

---

## Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Recusar secret quebra o `dev` | Só `production` (RN-H01) |
| Bind 127.0.0.1 quebra Postgres em outro container futuro | Hoje há um serviço; app no compose usaria rede interna, não a porta publicada |
| Rate limit por IP pune NAT da casa | Teto de IP (30) mais folgado que o de e-mail (10) |
| Magic bytes rejeitam foto exótica | Allowlist só jpeg/png/webp, já da spec do catálogo |
| CSP de script quebra Next/Auth | Fora de escopo; só `frame-ancestors` |
| Contar rate limit duas vezes (middleware + domínio) | Um módulo; login incrementa em `authorize`; cadastro em `registrarUsuario` |

---

## Referências

- [ideas/endurecimento-seguranca.md](../../ideas/endurecimento-seguranca.md)
- [specs/catalogo-colecoes-pessoais/about.md](../catalogo-colecoes-pessoais/about.md)
- Auditoria 2026-08-13 (canvas interno; `npm audit` zerado)

---

## Aprovação

| Revisor | Data | Status |
|---------|------|--------|
| Usuário | 2026-08-13 | Aprovada |

**Plano:** [plan.md](plan.md) — rascunho em validação.
