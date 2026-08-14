export const VALOR_HSTS = "max-age=31536000; includeSubDomains";

export function headersSegurancaFixos(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "frame-ancestors 'none'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

export function deveEnviarHsts(input: {
  protocol?: string;
  forwardedProto?: string | null;
}): boolean {
  const encaminhado = input.forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (encaminhado === "https") {
    return true;
  }
  const protocol = input.protocol?.toLowerCase();
  return protocol === "https:" || protocol === "https";
}
