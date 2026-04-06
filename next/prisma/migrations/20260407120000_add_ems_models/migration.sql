CREATE TABLE "ems_units" (
    "id" BIGSERIAL NOT NULL,
    "unit_id" VARCHAR(64) NOT NULL,
    "customer_id" INTEGER,
    "location_label" VARCHAR(120),
    "latitude" DECIMAL(10,6),
    "longitude" DECIMAL(10,6),
    "device_type" VARCHAR(120),
    "last_seen_at" TIMESTAMP(3),
    "topic_path" VARCHAR(255),
    "unit_field_template" JSONB NOT NULL,
    "rtu_overrides" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ems_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ems_logs" (
    "id" BIGSERIAL NOT NULL,
    "ems_unit_id" BIGINT NOT NULL,
    "device_timestamp" TIMESTAMP(3) NOT NULL,
    "raw_unit_payload" JSONB NOT NULL,
    "raw_rtu_array" JSONB NOT NULL,
    "mapped_rtu_array" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ems_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ems_units_unit_id_key" ON "ems_units"("unit_id");
CREATE INDEX "ems_units_customer_id_idx" ON "ems_units"("customer_id");
CREATE INDEX "ems_units_last_seen_at_idx" ON "ems_units"("last_seen_at");
CREATE INDEX "ems_logs_ems_unit_id_device_timestamp_idx" ON "ems_logs"("ems_unit_id", "device_timestamp" DESC);
CREATE INDEX "ems_logs_created_at_idx" ON "ems_logs"("created_at");

ALTER TABLE "ems_units"
ADD CONSTRAINT "ems_units_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ems_logs"
ADD CONSTRAINT "ems_logs_ems_unit_id_fkey"
FOREIGN KEY ("ems_unit_id") REFERENCES "ems_units"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
