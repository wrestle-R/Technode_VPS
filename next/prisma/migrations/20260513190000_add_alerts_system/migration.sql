-- CreateEnum
CREATE TYPE "AlertRuleType" AS ENUM ('metric', 'offline');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('critical', 'warning', 'info');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "AlertMeterScope" AS ENUM ('single', 'multiple', 'all');

-- CreateEnum
CREATE TYPE "AlertDirection" AS ENUM ('above', 'below');

-- CreateEnum
CREATE TYPE "AlertEmailDeliveryStatus" AS ENUM ('sent', 'failed');

-- DropForeignKey
ALTER TABLE "public"."ems_logs" DROP CONSTRAINT "ems_logs_ems_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ems_units" DROP CONSTRAINT "ems_units_customer_id_fkey";

-- AlterTable
ALTER TABLE "ems_units" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "alert_recipients" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "role" VARCHAR(120),
    "phone" VARCHAR(40),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "unit_id" VARCHAR(64) NOT NULL,
    "type" "AlertRuleType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "meter_scope" "AlertMeterScope" NOT NULL,
    "meter_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "field_key" VARCHAR(120),
    "direction" "AlertDirection",
    "threshold_value" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_instances" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "rule_id" BIGINT NOT NULL,
    "unit_id" VARCHAR(64) NOT NULL,
    "meter_key" VARCHAR(64),
    "field_key" VARCHAR(120),
    "type" "AlertRuleType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "context_json" JSONB NOT NULL,
    "trigger_value" DOUBLE PRECISION,
    "threshold_value" DOUBLE PRECISION,
    "seen_at" TIMESTAMP(3),
    "triggered_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "last_emailed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_email_logs" (
    "id" BIGSERIAL NOT NULL,
    "alert_instance_id" BIGINT NOT NULL,
    "recipient_email" VARCHAR(150) NOT NULL,
    "status" "AlertEmailDeliveryStatus" NOT NULL,
    "error_message" VARCHAR(500),
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_recipients_customer_id_enabled_idx" ON "alert_recipients"("customer_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "alert_recipients_customer_id_email_key" ON "alert_recipients"("customer_id", "email");

-- CreateIndex
CREATE INDEX "alert_rules_customer_id_unit_id_enabled_type_idx" ON "alert_rules"("customer_id", "unit_id", "enabled", "type");

-- CreateIndex
CREATE INDEX "alert_rules_customer_id_enabled_idx" ON "alert_rules"("customer_id", "enabled");

-- CreateIndex
CREATE INDEX "alert_instances_customer_id_status_triggered_at_idx" ON "alert_instances"("customer_id", "status", "triggered_at" DESC);

-- CreateIndex
CREATE INDEX "alert_instances_customer_id_seen_at_status_idx" ON "alert_instances"("customer_id", "seen_at", "status");

-- CreateIndex
CREATE INDEX "alert_instances_rule_id_unit_id_meter_key_field_key_status_idx" ON "alert_instances"("rule_id", "unit_id", "meter_key", "field_key", "status");

-- CreateIndex
CREATE INDEX "alert_instances_unit_id_type_severity_idx" ON "alert_instances"("unit_id", "type", "severity");

-- CreateIndex
CREATE INDEX "alert_email_logs_alert_instance_id_sent_at_idx" ON "alert_email_logs"("alert_instance_id", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "alert_email_logs_recipient_email_sent_at_idx" ON "alert_email_logs"("recipient_email", "sent_at" DESC);

-- AddForeignKey
ALTER TABLE "ems_units" ADD CONSTRAINT "ems_units_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ems_logs" ADD CONSTRAINT "ems_logs_ems_unit_id_fkey" FOREIGN KEY ("ems_unit_id") REFERENCES "ems_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_recipients" ADD CONSTRAINT "alert_recipients_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_instances" ADD CONSTRAINT "alert_instances_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_instances" ADD CONSTRAINT "alert_instances_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_email_logs" ADD CONSTRAINT "alert_email_logs_alert_instance_id_fkey" FOREIGN KEY ("alert_instance_id") REFERENCES "alert_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
