import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
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

  if (deveRedirecionarParaLogin(request.nextUrl.pathname, autenticado)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
