import {
  limitadorPadrao,
  type Limitador,
} from "./rate-limit";

/** bcryptjs cost 12 de "not-a-real-user-password-dummy" — não é senha de conta. */
export const HASH_DUMMY =
  "$2b$12$QdDCH4F2OnRytIMz1AooV.bH0rzL/zCLyVYW7Jer29bau5vQ15ipe";

export type UsuarioLogin = {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
};

export type AutenticarPorCredenciaisDeps = {
  findByEmail(email: string): Promise<UsuarioLogin | null>;
  compare(senha: string, hash: string): Promise<boolean>;
  limitador?: Limitador;
};

export async function autenticarPorCredenciais(
  input: { email: string; senha: string; ip: string },
  deps: AutenticarPorCredenciaisDeps,
): Promise<{ id: string; name: string; email: string } | null> {
  const emailTrim = input.email.trim();
  const emailNorm = emailTrim.toLowerCase();
  const limitador = deps.limitador ?? limitadorPadrao;

  limitador.consumir(`login-email:${emailNorm}`, 10);
  limitador.consumir(`login-ip:${input.ip}`, 30);

  const usuario = await deps.findByEmail(emailTrim);
  if (!usuario) {
    await deps.compare(input.senha, HASH_DUMMY);
    return null;
  }

  const senhaOk = await deps.compare(input.senha, usuario.senhaHash);
  if (!senhaOk) {
    return null;
  }

  return {
    id: usuario.id,
    name: usuario.nome,
    email: usuario.email,
  };
}
