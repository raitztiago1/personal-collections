import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { VALOR_HSTS, deveEnviarHsts } from "@/lib/http-headers";
import {
  deveRedirecionarParaLogin,
  opcoesGetTokenSessao,
} from "@/lib/isolamento";

export async function middleware(request: NextRequest) {
  const { secureCookie, cookieName } = opcoesGetTokenSessao({
    protocol: request.nextUrl.protocol,
    forwardedProto: request.headers.get("x-forwarded-proto"),
    cookieHeader: request.headers.get("cookie"),
    nodeEnv: process.env.NODE_ENV,
  });
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie,
    cookieName,
  });
  const autenticado =
    typeof token?.id === "string" || typeof token?.sub === "string";

  let response: NextResponse;
  if (deveRedirecionarParaLogin(request.nextUrl.pathname, autenticado)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    response = NextResponse.redirect(loginUrl);
  } else {
    response = NextResponse.next();
  }

  if (
    deveEnviarHsts({
      protocol: request.nextUrl.protocol,
      forwardedProto: request.headers.get("x-forwarded-proto"),
    })
  ) {
    response.headers.set("Strict-Transport-Security", VALOR_HSTS);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
