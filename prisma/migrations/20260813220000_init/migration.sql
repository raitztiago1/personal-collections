-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- citext: e-mail único case-insensitive (spec usuario.email)
CREATE EXTENSION IF NOT EXISTS citext;

-- unaccent: busca T09 (ignorar acentos). A imagem postgres:16 inclui o módulo contrib.
-- Se a extensão não existir neste Postgres, a migration segue e T09 deve usar ILIKE.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS unaccent;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Extensão unaccent indisponível; T09 deve usar fallback ILIKE.';
END
$$;

-- CreateEnum
CREATE TYPE "tipo_colecao" AS ENUM ('TENIS', 'WHISKY', 'PERFUME', 'YUGIOH', 'MANGA', 'LIVRO', 'GADGET');

-- CreateEnum
CREATE TYPE "tipo_colecao_or_build" AS ENUM ('TENIS', 'WHISKY', 'PERFUME', 'YUGIOH', 'MANGA', 'LIVRO', 'GADGET', 'PC_BUILD');

-- CreateEnum
CREATE TYPE "dono_foto" AS ENUM ('ITEM', 'WISHLIST', 'BUILD', 'PECA');

-- CreateEnum
CREATE TYPE "tipo_valor_extra" AS ENUM ('TEXTO', 'NUMERO');

-- CreateEnum
CREATE TYPE "alvo_extra" AS ENUM ('ITEM', 'WISHLIST', 'BUILD');

-- CreateEnum
CREATE TYPE "tipo_peca" AS ENUM ('GPU', 'CPU', 'RAM', 'ARMAZENAMENTO', 'PLACA_MAE', 'PSU', 'GABINETE', 'COOLER', 'MONITOR', 'PERIFERICO', 'OUTRO');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo_colecao" "tipo_colecao" NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "notas_pessoais" TEXT,
    "data_aquisicao" DATE,
    "preco_pago" DECIMAL(12,2),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ficha" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "dono_tipo" "dono_foto" NOT NULL,
    "dono_id" UUID NOT NULL,
    "caminho" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "is_capa" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campo_extra_def" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo_colecao" "tipo_colecao_or_build" NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo_valor" "tipo_valor_extra" NOT NULL,

    CONSTRAINT "campo_extra_def_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campo_extra_valor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "definicao_id" UUID NOT NULL,
    "alvo_tipo" "alvo_extra" NOT NULL,
    "alvo_id" UUID NOT NULL,
    "valor_texto" TEXT,
    "valor_numero" DECIMAL(12,2),

    CONSTRAINT "campo_extra_valor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo_colecao" "tipo_colecao" NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "notas_pessoais" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ficha" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "formato" TEXT,
    "notas" TEXT,

    CONSTRAINT "deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_carta" (
    "deck_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "deck_carta_pkey" PRIMARY KEY ("deck_id","item_id"),
    CONSTRAINT "deck_carta_quantidade_check" CHECK ("quantidade" >= 1)
);

-- CreateTable
CREATE TABLE "build" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "notas_pessoais" TEXT,

    CONSTRAINT "build_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_peca" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "build_id" UUID NOT NULL,
    "tipo_peca" "tipo_peca" NOT NULL,
    "nome" TEXT NOT NULL,
    "ficha" JSONB NOT NULL DEFAULT '{}',
    "notas" TEXT,

    CONSTRAINT "build_peca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "item_usuario_id_tipo_colecao_idx" ON "item"("usuario_id", "tipo_colecao");

-- CreateIndex
CREATE INDEX "item_ficha_idx" ON "item" USING GIN ("ficha");

-- CreateIndex
CREATE INDEX "foto_dono_tipo_dono_id_idx" ON "foto"("dono_tipo", "dono_id");

-- RN-08: no máximo uma foto capa por dono
CREATE UNIQUE INDEX "foto_uma_capa_por_dono" ON "foto" ("dono_tipo", "dono_id") WHERE "is_capa";

-- CreateIndex
CREATE UNIQUE INDEX "campo_extra_def_usuario_id_tipo_colecao_nome_key" ON "campo_extra_def"("usuario_id", "tipo_colecao", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "campo_extra_valor_definicao_id_alvo_tipo_alvo_id_key" ON "campo_extra_valor"("definicao_id", "alvo_tipo", "alvo_id");

-- CreateIndex
CREATE INDEX "wishlist_item_usuario_id_tipo_colecao_idx" ON "wishlist_item"("usuario_id", "tipo_colecao");

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto" ADD CONSTRAINT "foto_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campo_extra_def" ADD CONSTRAINT "campo_extra_def_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campo_extra_valor" ADD CONSTRAINT "campo_extra_valor_definicao_id_fkey" FOREIGN KEY ("definicao_id") REFERENCES "campo_extra_def"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck" ADD CONSTRAINT "deck_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_carta" ADD CONSTRAINT "deck_carta_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_carta" ADD CONSTRAINT "deck_carta_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build" ADD CONSTRAINT "build_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_peca" ADD CONSTRAINT "build_peca_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "build"("id") ON DELETE CASCADE ON UPDATE CASCADE;
