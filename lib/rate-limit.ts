import { HttpErro } from "./isolamento";

const JANELA_PADRAO_MS = 15 * 60 * 1000;
const MENSAGEM_LIMITE =
  "Muitas tentativas. Tente de novo em alguns minutos.";

export class RateLimitErro extends HttpErro {
  readonly retryAfterSegundos: number;

  constructor(retryAfterSegundos: number, mensagem = MENSAGEM_LIMITE) {
    super(429, mensagem);
    this.name = "RateLimitErro";
    this.retryAfterSegundos = retryAfterSegundos;
  }
}

export type Limitador = {
  consumir(chave: string, teto: number): { retryAfterSegundos: number };
  consultar(
    chave: string,
    teto: number,
  ): { restante: number; retryAfterSegundos: number; excedido: boolean };
};

export function criarLimitador(opcoes?: {
  agora?: () => number;
  janelaMs?: number;
}): Limitador {
  const agora = opcoes?.agora ?? Date.now;
  const janelaMs = opcoes?.janelaMs ?? JANELA_PADRAO_MS;
  const hitsPorChave = new Map<string, number[]>();

  function timestampsAtivos(chave: string): number[] {
    const corte = agora() - janelaMs;
    const atuais = (hitsPorChave.get(chave) ?? []).filter((t) => t > corte);
    hitsPorChave.set(chave, atuais);
    return atuais;
  }

  function retryAfterSegundos(timestamps: number[]): number {
    if (timestamps.length === 0) {
      return 0;
    }
    const maisAntigo = timestamps.reduce((min, t) => (t < min ? t : min));
    return Math.max(0, Math.ceil((maisAntigo + janelaMs - agora()) / 1000));
  }

  return {
    consumir(chave, teto) {
      const timestamps = timestampsAtivos(chave);
      timestamps.push(agora());
      hitsPorChave.set(chave, timestamps);
      const retry = retryAfterSegundos(timestamps);
      if (timestamps.length > teto) {
        throw new RateLimitErro(retry);
      }
      return { retryAfterSegundos: retry };
    },
    consultar(chave, teto) {
      const timestamps = timestampsAtivos(chave);
      const restante = Math.max(0, teto - timestamps.length);
      return {
        restante,
        retryAfterSegundos: restante === 0 ? retryAfterSegundos(timestamps) : 0,
        excedido: timestamps.length >= teto,
      };
    },
  };
}

let instanciaPadrao = criarLimitador();

export const limitadorPadrao: Limitador = {
  consumir(chave, teto) {
    return instanciaPadrao.consumir(chave, teto);
  },
  consultar(chave, teto) {
    return instanciaPadrao.consultar(chave, teto);
  },
};

export function resetLimitadorPadrao(): void {
  instanciaPadrao = criarLimitador();
}

export function ipDoRequest(
  headers: { get(name: string): string | null } | Headers,
): string {
  const bruto = headers.get("x-forwarded-for");
  if (!bruto) {
    return "local";
  }
  const primeiro = bruto.split(",")[0]?.trim();
  return primeiro || "local";
}
