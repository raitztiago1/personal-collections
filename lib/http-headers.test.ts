import { describe, expect, it } from "vitest";
import {
  VALOR_HSTS,
  deveEnviarHsts,
  headersSegurancaFixos,
} from "./http-headers";

describe("headersSegurancaFixos", () => {
  it("retorna exatamente os quatro headers mínimos de RF-H04", () => {
    expect(headersSegurancaFixos()).toEqual({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "frame-ancestors 'none'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    expect(Object.keys(headersSegurancaFixos())).toHaveLength(4);
  });
});

describe("deveEnviarHsts", () => {
  it("envia HSTS quando o protocolo é HTTPS", () => {
    expect(deveEnviarHsts({ protocol: "https:" })).toBe(true);
    expect(deveEnviarHsts({ protocol: "https" })).toBe(true);
  });

  it("envia HSTS quando x-forwarded-proto é https mesmo com protocol http:", () => {
    expect(
      deveEnviarHsts({ protocol: "http:", forwardedProto: "https" }),
    ).toBe(true);
  });

  it("não envia HSTS em HTTP sem forwarded proto", () => {
    expect(deveEnviarHsts({ protocol: "http:" })).toBe(false);
  });

  it("não envia HSTS quando o primeiro hop de x-forwarded-proto é http", () => {
    expect(
      deveEnviarHsts({ protocol: "http:", forwardedProto: "http" }),
    ).toBe(false);
  });
});

describe("VALOR_HSTS", () => {
  it("usa max-age de um ano com includeSubDomains", () => {
    expect(VALOR_HSTS).toBe("max-age=31536000; includeSubDomains");
  });
});
