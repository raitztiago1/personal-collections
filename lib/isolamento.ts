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
