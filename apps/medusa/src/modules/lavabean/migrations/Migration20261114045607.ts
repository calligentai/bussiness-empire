import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261114045607 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "webhook_event" drop constraint if exists "webhook_event_event_id_unique";`);
    this.addSql(`alter table if exists "checkout_record" drop constraint if exists "checkout_record_public_id_unique";`);
    this.addSql(`alter table if exists "checkout_record" drop constraint if exists "checkout_record_scope_key_unique";`);
    this.addSql(`create table if not exists "checkout_record" ("id" text not null, "scope_key" text not null, "namespace" text not null, "idempotency_key" text not null, "fingerprint" text not null, "public_id" text not null, "status" text not null, "medusa_order_id" text null, "payment_id" text null, "projection" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "checkout_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_checkout_record_scope_key_unique" ON "checkout_record" ("scope_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_checkout_record_public_id_unique" ON "checkout_record" ("public_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_checkout_record_deleted_at" ON "checkout_record" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "order_number" ("id" text not null, "next_value" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_number_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_number_deleted_at" ON "order_number" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "webhook_event" ("id" text not null, "event_id" text not null, "public_id" text not null, "outcome" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_webhook_event_event_id_unique" ON "webhook_event" ("event_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_event_deleted_at" ON "webhook_event" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "checkout_record" cascade;`);

    this.addSql(`drop table if exists "order_number" cascade;`);

    this.addSql(`drop table if exists "webhook_event" cascade;`);
  }

}
