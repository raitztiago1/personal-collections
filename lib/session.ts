import { auth } from "../auth";
import { HttpErro } from "./isolamento";

export async function requireUser(): Promise<{ id: string }> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    throw new HttpErro(401, "Não autenticado.");
  }
  return { id };
}
