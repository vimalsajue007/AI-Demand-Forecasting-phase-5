USE demand_forecasting;

CREATE TABLE IF NOT EXISTS forecast_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    owner_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    is_shared BOOLEAN DEFAULT FALSE,
    tags JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_id)
);

CREATE TABLE IF NOT EXISTS project_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project (project_id)
);

CREATE TABLE IF NOT EXISTS project_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    details JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project (project_id)
);

CREATE TABLE IF NOT EXISTS forecast_scenarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    owner_id INT NOT NULL,
    dataset_id INT NOT NULL,
    base_forecast_id INT NULL,
    variables JSON NULL,
    results JSON NULL,
    status VARCHAR(50) DEFAULT 'pending',
    is_saved BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_id)
);

CREATE TABLE IF NOT EXISTS forecast_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    forecast_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_id INT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_forecast (forecast_id)
);

CREATE TABLE IF NOT EXISTS forecast_revisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    forecast_id INT NOT NULL,
    user_id INT NOT NULL,
    version INT DEFAULT 1,
    model_type VARCHAR(50),
    accuracy_score VARCHAR(50) NULL,
    changes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_forecast (forecast_id)
);

CREATE TABLE IF NOT EXISTS shared_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    forecast_id INT NOT NULL,
    owner_id INT NOT NULL,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NULL,
    view_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (share_token)
);

CREATE TABLE IF NOT EXISTS dataset_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dataset_id INT NOT NULL,
    owner_id INT NOT NULL,
    version INT DEFAULT 1,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    rows_count INT NULL,
    changes_summary TEXT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dataset (dataset_id)
);

CREATE TABLE IF NOT EXISTS executive_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    period_from VARCHAR(20) NULL,
    period_to VARCHAR(20) NULL,
    content JSON NULL,
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_interval VARCHAR(50) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_id)
);

SELECT 'Phase 5 migration complete!' AS status;
