-- Phase 4 Database Migration
USE demand_forecasting;

CREATE TABLE IF NOT EXISTS forecast_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL,
    dataset_id INT NOT NULL,
    model_type VARCHAR(50) DEFAULT 'linear_regression',
    target_column VARCHAR(100) NOT NULL,
    date_column VARCHAR(100) NOT NULL,
    periods INT DEFAULT 12,
    `interval` VARCHAR(50) DEFAULT 'daily',
    is_active BOOLEAN DEFAULT TRUE,
    last_run DATETIME NULL,
    next_run DATETIME NULL,
    run_count INT DEFAULT 0,
    config JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_id)
);

CREATE TABLE IF NOT EXISTS alert_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    threshold_value FLOAT NULL,
    threshold_operator VARCHAR(10) NULL,
    dataset_id INT NULL,
    target_column VARCHAR(100) NULL,
    email_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    email_address VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    config JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_config_id INT NULL,
    owner_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    triggered_value FLOAT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    integration_type VARCHAR(50) NOT NULL,
    endpoint_url VARCHAR(500) NULL,
    api_key VARCHAR(500) NULL,
    headers JSON NULL,
    payload_template TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered DATETIME NULL,
    trigger_count INT DEFAULT 0,
    config JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    integration_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSON NULL,
    response_status INT NULL,
    response_body TEXT NULL,
    success BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    widget_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    position_x INT DEFAULT 0,
    position_y INT DEFAULT 0,
    width INT DEFAULT 4,
    height INT DEFAULT 2,
    config JSON NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rate_limit_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_count INT DEFAULT 1,
    window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_request DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifier_endpoint (identifier, endpoint)
);

SELECT 'Phase 4 migration complete!' AS status;
