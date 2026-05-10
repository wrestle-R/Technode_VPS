CREATE TABLE "ems_meter_labels" (
  "id" BIGSERIAL NOT NULL,
  "ems_unit_id" BIGINT NOT NULL,
  "meter_key" VARCHAR(64) NOT NULL,
  "label" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ems_meter_labels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ems_meter_labels_ems_unit_id_meter_key_key"
  ON "ems_meter_labels"("ems_unit_id", "meter_key");

CREATE INDEX "ems_meter_labels_ems_unit_id_idx"
  ON "ems_meter_labels"("ems_unit_id");

ALTER TABLE "ems_meter_labels"
  ADD CONSTRAINT "ems_meter_labels_ems_unit_id_fkey"
  FOREIGN KEY ("ems_unit_id") REFERENCES "ems_units"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
