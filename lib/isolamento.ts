export class HttpErro extends Error {
  readonly status: number;
  readonly mensagem: string;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "HttpErro";
    this.status = status;
    this.mensagem = mensagem;
  }
}

export function assertDono(
  usuarioId: string,
  recursoUsuarioId: string,
): void {
  if (usuarioId !== recursoUsuarioId) {
    throw new HttpErro(404, "Recurso não encontrado.");
  }
}

const ROTAS_PUBLICAS_EXATAS = new Set([
  "/login",
  "/register",
  "/api/register",
]);

export function eRotaPublica(pathname: string): boolean {
  if (ROTAS_PUBLICAS_EXATAS.has(pathname)) {
    return true;
  }
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

export function deveRedirecionarParaLogin(
  pathname: string,
  autenticado: boolean,
): boolean {
  if (autenticado) {
    return false;
  }
  if (eRotaPublica(pathname)) {
    return false;
  }
  if (pathname.startsWith("/api/")) {
    return false;
  }
  return true;
}

export const NOME_COOKIE_SESSAO = "authjs.session-token";
export const NOME_COOKIE_SESSAO_SECURE = `__Secure-${NOME_COOKIE_SESSAO}`;

export type OpcoesGetTokenSessao = {
  secureCookie: boolean;
  cookieName: string;
};

function cookieSessaoPresente(
  cookieHeader: string,
  cookieName: string,
): boolean {
  const padrao = new RegExp(
    `(?:^|;\\s*)${cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\.\\d+)?=`,
  );
  return padrao.test(cookieHeader);
}

function protocoloEhHttps(
  protocol: string | undefined,
  forwardedProto: string | null | undefined,
): boolean | undefined {
  const encaminhado = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (encaminhado === "https") {
    return true;
  }
  if (encaminhado === "http") {
    return false;
  }
  if (protocol === "https:" || protocol === "https") {
    return true;
  }
  if (protocol === "http:" || protocol === "http") {
    return false;
  }
  return undefined;
}

export function opcoesGetTokenSessao(input: {
  protocol?: string;
  forwardedProto?: string | null;
  cookieHeader?: string | null;
  nodeEnv?: string | null;
}): OpcoesGetTokenSessao {
  const cookieHeader = input.cookieHeader ?? "";
  if (cookieSessaoPresente(cookieHeader, NOME_COOKIE_SESSAO_SECURE)) {
    return { secureCookie: true, cookieName: NOME_COOKIE_SESSAO_SECURE };
  }
  if (cookieSessaoPresente(cookieHeader, NOME_COOKIE_SESSAO)) {
    return { secureCookie: false, cookieName: NOME_COOKIE_SESSAO };
  }

  const https = protocoloEhHttps(input.protocol, input.forwardedProto);
  const secureCookie = https ?? input.nodeEnv === "production";
  return {
    secureCookie,
    cookieName: secureCookie
      ? NOME_COOKIE_SESSAO_SECURE
      : NOME_COOKIE_SESSAO,
  };
}
