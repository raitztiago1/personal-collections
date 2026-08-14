const PLACEHOLDERS_SECRET = new Set([
  "change-me",
  "gere-um-valor-longo",
  "substitua-por-openssl-rand-base64-32",
]);

const MSG_SECRET_INVALIDO =
  "AUTH_SECRET inválido em produção. Gere um valor com: openssl rand -base64 32";

const MSG_AUTH_URL_INVALIDA =
  "AUTH_URL é obrigatória em produção e deve ser uma URL absoluta com protocolo http ou https.";

export function assertAuthBoot({
  nodeEnv,
  authSecret,
  authUrl,
  nextPhase,
}: {
  nodeEnv?: string;
  authSecret?: string;
  authUrl?: string;
  nextPhase?: string;
}): void {
  if (nodeEnv !== "production") {
    return;
  }
  if (nextPhase === "phase-production-build") {
    return;
  }

  if (secretInvalido(authSecret)) {
    throw new Error(MSG_SECRET_INVALIDO);
  }

  if (!authUrlValida(authUrl)) {
    throw new Error(MSG_AUTH_URL_INVALIDA);
  }
}

function secretInvalido(authSecret: string | undefined): boolean {
  if (authSecret == null) {
    return true;
  }
  const normalizado = authSecret.trim();
  if (normalizado.length < 32) {
    return true;
  }
  return PLACEHOLDERS_SECRET.has(normalizado.toLowerCase());
}

function authUrlValida(authUrl: string | undefined): boolean {
  if (authUrl == null) {
    return false;
  }
  const valor = authUrl.trim();
  if (!valor) {
    return false;
  }
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
