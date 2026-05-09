DROP TABLE IF EXISTS ems_logs;
DROP TABLE IF EXISTS ems_units;

CREATE TABLE ems_units (
    id BIGSERIAL PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL UNIQUE,
    customer_id INTEGER REFERENCES customers(customer_id) ON DELETE SET NULL,
    location_label VARCHAR(120),
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    device_type VARCHAR(120),
    topic_path VARCHAR(255),
    last_seen_at TIMESTAMP(3),
    last_status VARCHAR(16),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ems_units_customer_id_idx ON ems_units(customer_id);
CREATE INDEX ems_units_last_seen_at_idx ON ems_units(last_seen_at);

CREATE TABLE ems_logs (
    id BIGSERIAL PRIMARY KEY,
    ems_unit_id BIGINT NOT NULL REFERENCES ems_units(id) ON DELETE CASCADE,
    message_type VARCHAR(16) NOT NULL,
    status_value VARCHAR(16),
    device_timestamp TIMESTAMP(3) NOT NULL,
    raw_payload JSONB NOT NULL,
    meter_payload JSONB NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ems_logs_ems_unit_id_device_timestamp_idx
ON ems_logs(ems_unit_id, device_timestamp DESC);

CREATE INDEX ems_logs_created_at_idx ON ems_logs(created_at);
