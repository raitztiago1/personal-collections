# Endurecimento de segurança do catálogo

**Status:** Aprovada para spec  
**Data:** 2026-08-13  
**Aprovada em:** 2026-08-13  
**Tipo:** Endurecimento (idea-refine a partir da auditoria)  
**Origem:** auditoria estática + `npm audit` (13 ago 2026)  
**Próximo:** spec `about.md` aprovada; `plan.md` em validação.

---

## Como Poderíamos…?

> **Como poderíamos fechar os buracos da auditoria de forma proporcional a um catálogo pessoal (localhost, rede de casa, ou um VPS com uma conta) — sem transformar o app num produto de segurança corporativa nem reabrir o domínio de coleções?**

O problema não é “não há autenticação”. Já há sessão, isolamento por `usuarioId` e fotos autenticadas. O problema é **o padrão do repositório e alguns buracos operacionais** que, juntos, tornam um deploy descuidado equivalente a deixar o catálogo aberto.

---

## Problema

A auditoria **não** achou CVE nas dependências, nem IDOR, SQLi ou XSS clássico no domínio. Achou **configuração perigosa por omissão** e **falta de endurecimento** em auth, fotos e headers.

Quem sofre: o dono do catálogo, se o app sair do `localhost` (rede da casa, VPS, “só um túnel rápido”). Um visitante anônimo na Onda 1 não é ator previsto — mas a internet não pergunta se o deploy era “só pra mim”.

| Dor | Por que dói |
|-----|-------------|
| Segredo de sessão placeholder | `AUTH_SECRET=change-me` permite forjar JWT e assumir qualquer conta |
| Banco na rede | Compose publica `5432` com `catalogo/catalogo`; na LAN isso é o acervo inteiro |
| Fotos confiando no MIME do browser | Arquivo poliglota + ausência de `nosniff`/`Cache-Control: private` |
| Login sem freio | Força bruta e cadastro em massa se o registro continuar aberto |
| Headers vazios | Clickjacking e sniffing ficam por conta do browser |
| `trustHost: true` sem `AUTH_URL` | Em produção o `Host` do request define origem do Auth.js |

**Quem usa:** o mesmo dono da Onda 1. Não entra visitante público nesta ideia.

**Onde:** o mesmo webapp. Nada de painel de SOC, WAF pago ou segundo serviço.

**Fora desta ideia:** mudar fichas, busca, decks, builds ou o modelo de isolamento (que já funciona na aplicação).

---

## Alternativas consideradas

| Conceito | Prós | Contras |
|----------|------|---------|
| **A) Só README** (“troque o secret, feche o registro, bind no localhost”) | Zero código; honesto para uso 100% local | O default do repo continua perigoso; ninguém lê o README na hora do `docker compose up` |
| **B) Defaults seguros no repo** (secret recusado se fraco em produção, Postgres só em `127.0.0.1`, headers, fotos com magic bytes + `nosniff` + cache privado) | Fecha as altas e a maior parte das médias sem feature nova | Não cobre força bruta nem validação fina de cadastro |
| **C) Auth operacional** (rate limit em memória, hash dummy no login, e-mail/nome validados, teto de texto, rejeitar upload cedo) | Freio contra abuso se alguém achar a porta 3000 | Rate limit in-memory não escala em multi-instância (não é o caso hoje) |
| **D) Fortaleza** (RLS no Postgres, Argon2id, captcha, Redis, audit log, HSTS obrigatório, CSP rígida) | Fica “bonito em pentest” | Custo alto, pouco ganho para um dono; RLS pede `SET LOCAL` em toda query; captcha é overkill com `ALLOW_REGISTRATION=false` |
| **E) Híbrido: B + fatia barata de C; D fica de fora** | Proporcional ao produto; cobre o que a auditoria realmente exploraria | Precisa desenhar o que é “barato” vs “onda seguinte” |

**Escolha:** **E**.

Três ideias que **não** entram no núcleo: RLS nesta onda, trocar bcrypt (a spec já aceita Argon2id **ou** bcrypt e o custo 12 está ok), e enumeração de e-mail no cadastro — a spec atual **exige** a mensagem “já cadastrado”; inverter isso é mudança de RF, não de hardening silencioso.

---

## Conceito escolhido

Um **pacote de endurecimento em três camadas**, todas no app atual:

1. **Não atirar no pé** — o repositório não sobe “pronto para vazamento”.
2. **Fotos e HTTP duros** — o que o browser e um cache compartilhado podem fazer com um arquivo do dono.
3. **Auth com freio** — cadastro e senha deixam de ser alvos fáceis se a porta ficar visível.

O isolamento por `usuarioId` + `assertDono` **permanece** o controle principal. Esta ideia não substitui isso; só reduz o dano quando o dono (ou o Docker) expõe o processo.

### Camada 1 — Defaults que evitam tiro no pé

- Recusar subir em `NODE_ENV=production` se `AUTH_SECRET` estiver ausente, vazio, ou for o placeholder `change-me` (e documentar geração: `openssl rand -base64 32`).
- `.env.example` deixa de parecer um secret real: comentário claro + valor impossível de copiar sem pensar (`gere-um-valor-longo`).
- Postgres no compose escuta só em `127.0.0.1:5432` (acesso local continua; LAN deixa de ver o banco).
- `AUTH_URL` no exemplo; `trustHost` só como fallback de desenvolvimento, não como default cego de produção.
- README / `.env.example`: depois da primeira conta, `ALLOW_REGISTRATION=false` (já existe RN-10; vira passo explícito de “se for expor”).

### Camada 2 — Fotos e headers

- Validar **magic bytes** (jpeg/png/webp) além do MIME declarado.
- Resposta de `GET /api/fotos/:id`: `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`, `Content-Type` só do allowlist interno.
- Resolver o caminho do arquivo e garantir que fica **dentro** de `UPLOAD_DIR` (defesa se o `caminho` no banco for envenenado).
- Headers globais no Next: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` / CSP `frame-ancestors 'none'`. HSTS só quando o app estiver em HTTPS (não quebrar HTTP local).
- Teto de tamanho em nome, descrição, notas e tags (DoS de payload; a ficha Zod já limita o shape).

### Camada 3 — Auth operacional (barato, uma instância)

- Rate limit **em memória** no login, no cadastro (página + `POST /api/register`) e, se possível, no `signIn` credentials — por IP (e por e-mail no login, para não derrubar a casa inteira por um IP).
- Hash dummy quando o e-mail não existe (mesmo tempo aproximado do `bcrypt.compare`).
- Validar e-mail (formato) e nome (não vazio, comprimento máximo) **na API**, não só no HTML do form.
- Rejeitar upload **antes** de `arrayBuffer()` se `File.size` já passar de 10 MB (o teto de bytes no domínio permanece).

### O que toda alteração desta ideia **não** é

Não é feature de catálogo. Não muda fichas, busca, decks, wishlist. Não abre visitante só-leitura (isso continua Onda 2 do produto). Não exige Redis, captcha, nem row-level security.

---

## Escopo proposto

### Onda 1 desta ideia — Fechar as altas e as médias baratas

**Incluir:**

1. Falha explícita se `AUTH_SECRET` for fraco/placeholder em produção; exemplo de env sem valor copiável.
2. Compose: bind `127.0.0.1:5432`.
3. `AUTH_URL` no exemplo; `trustHost` restrito a desenvolvimento.
4. Headers de segurança no Next (sem HSTS em HTTP local).
5. Magic bytes + `nosniff` + `Cache-Control: private, no-store` nas fotos; path confinement.
6. Rate limit em memória em login e register.
7. Hash dummy no login; validação de e-mail/nome/comprimento na API de registro e nos textos longos de item/wishlist/build.
8. Upload: checar `File.size` antes de ler o corpo.

**Fora de escopo desta onda:**

- RLS no Postgres.
- Trocar bcrypt por Argon2id.
- Esconder enumeração de e-mail no cadastro (conflita com a mensagem atual da spec).
- Rate limit distribuído (Redis).
- Captcha, 2FA, lockout permanente de conta.
- CSP restritiva que quebre o App Router / Auth.js (só o mínimo: frame-ancestors + nosniff).
- Bind IPv6, TLS no Postgres, backup automatizado.

### Onda 2 (reservada)

- CSP mais fechada depois de medir o que o Next injeta.
- RLS se o app ganhar mais de um processo falando no mesmo banco com queries ad hoc.
- 2FA só se o catálogo for de fato público na internet com dados que o dono considere sensíveis demais para senha só.

---

## Mapa auditoria → alteração

| Achado | Severidade | Destino |
|--------|------------|---------|
| `AUTH_SECRET=change-me` | Alta | Onda 1 — recusar em produção + exemplo honesto |
| Postgres `0.0.0.0:5432` + senha padrão | Alta | Onda 1 — bind localhost; senha default **ok no localhost** |
| MIME do cliente / sem nosniff / sem cache privado | Média | Onda 1 — magic bytes + headers da foto |
| Sem rate limit | Média | Onda 1 — memória, login + register |
| Sem CSP/HSTS/frame | Média | Onda 1 — headers mínimos; HSTS só HTTPS |
| `trustHost: true` sem `AUTH_URL` | Média | Onda 1 — `AUTH_URL` + trustHost só em dev |
| Upload inteiro na RAM / textos sem teto | Média | Onda 1 — `File.size` + max length |
| Enumeração 409 no cadastro | Baixa | **Não mudar** (RF atual) |
| Timing do login | Baixa | Onda 1 — hash dummy |
| E-mail/nome sem validar na API | Baixa | Onda 1 — validar no domínio de registro |
| Sem RLS | Baixa | Onda 2 / fora |

---

## Critérios de sucesso

1. `NODE_ENV=production` com `AUTH_SECRET=change-me` **não sobe** a sessão; a mensagem diz o que gerar.
2. Da LAN, `psql` na porta 5432 da máquina **não** alcança o Postgres do compose (só `127.0.0.1` na própria máquina).
3. Upload de um `.html` disfarçado de jpeg é rejeitado; `GET` da foto autentica e manda `nosniff` + `private, no-store`.
4. Dezenas de POSTs seguidos em login/register passam a levar 429.
5. Login de e-mail inexistente não responde visivelmente mais rápido que senha errada.
6. `POST /api/register` com e-mail vazio ou nome de 100 kB falha com 400.
7. `npm test`, `npm run lint` e `npm run build` continuam verdes; isolamento (RN de `usuarioId`) não regride.

---

## Riscos

- **Quebrar o `npm run dev` local** ao recusar secret. Mitigar: a recusa é só em `production`; dev continua com placeholder, mas o README grita.
- **Compose bind 127.0.0.1** atrapalha Postgres em outro container da mesma compose (hoje só há um serviço). Mitigar: se no futuro houver app no compose, usar rede interna, não publicar 5432.
- **Rate limit por IP** pune NAT da casa. Mitigar: teto folgado (ex. 10 tentativas / 15 min) e chave também por e-mail no login.
- **Magic bytes** rejeitam foto “válida” de câmera esquisita. Mitigar: allowlist só jpeg/png/webp; testes com arquivos mínimos reais.
- **Headers CSP agressivos** quebram Auth.js / Next. Mitigar: nesta onda só `frame-ancestors 'none'` + `nosniff` + referrer; CSP script fica para Onda 2.
- **Escopo inchando para RLS.** Mitigar: tabela acima; RLS explícito fora.

---

## Decisões já tomadas (refino)

| Tema | Decisão |
|------|---------|
| Proporção | Catálogo pessoal, não SIEM |
| Segredo | Falha em produção se placeholder; não gerar secret sozinho no boot (opaco demais) |
| Banco | Bind localhost; senha `catalogo` permanece aceitável **só** nesse bind |
| Fotos | Magic bytes + headers; MIME do cliente deixa de ser fonte da verdade |
| Rate limit | Memória, uma instância; sem Redis |
| Enumeração no cadastro | Mantém mensagem atual da spec |
| Hash | Continua bcryptjs custo 12 + dummy no miss |
| RLS | Fora desta onda |
| Visitante público | Continua fora (Onda 2 do produto) |

**Aberto para a spec (não bloqueia a ideia):** números exatos do rate limit; comprimento máximo de nome/descrição/notas; se o check de `AUTH_SECRET` vive em `auth.ts`, `instrumentation.ts` ou um guard no boot.

---

## Próximo passo

Plano **implementado** (2026-08-13). Smoke manual da spec; depois skill **`spec-validator`**.
