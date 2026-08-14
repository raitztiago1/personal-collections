import { describe, expect, it } from "vitest";
import { pecasMudaram } from "./pecas-iguais";

const gpu = {
  tipoPeca: "GPU" as const,
  nome: "RTX 3060",
  ficha: { marca: "NVIDIA", vram_gb: 8, barramento: "PCIe 4.0" },
  notas: null,
};

describe("pecasMudaram", () => {
  it("não trata ordem diferente das chaves da ficha como mudança", () => {
    const doServidor = {
      ...gpu,
      ficha: { vram_gb: 8, barramento: "PCIe 4.0", marca: "NVIDIA" },
    };
    const doFormulario = {
      ...gpu,
      ficha: { marca: "NVIDIA", vram_gb: 8, barramento: "PCIe 4.0" },
    };

    expect(pecasMudaram([doServidor], [doFormulario])).toBe(false);
  });

  it("detecta mudança real de ficha, tipo, nome ou notas", () => {
    expect(
      pecasMudaram([gpu], [{ ...gpu, ficha: { ...gpu.ficha, vram_gb: 12 } }]),
    ).toBe(true);
    expect(pecasMudaram([gpu], [{ ...gpu, tipoPeca: "CPU" }])).toBe(true);
    expect(pecasMudaram([gpu], [{ ...gpu, nome: "RTX 3070" }])).toBe(true);
    expect(pecasMudaram([gpu], [{ ...gpu, notas: "under volt" }])).toBe(true);
  });

  it("trata notas vazias e ausentes como iguais", () => {
    expect(
      pecasMudaram([{ ...gpu, notas: null }], [{ ...gpu, notas: "" }]),
    ).toBe(false);
    expect(
      pecasMudaram([{ ...gpu, notas: undefined as unknown as null }], [gpu]),
    ).toBe(false);
  });

  it("detecta inclusão ou remoção de peça", () => {
    expect(pecasMudaram([gpu], [])).toBe(true);
    expect(pecasMudaram([], [gpu])).toBe(true);
  });
});
