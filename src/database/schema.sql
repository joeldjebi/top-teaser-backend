CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin') NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  full_name VARCHAR(190) NULL,
  mobile_number VARCHAR(60) NULL,
  commune VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  first_name VARCHAR(120) NULL,
  last_name VARCHAR(120) NULL,
  status ENUM('active', 'invalid', 'bounced', 'unsubscribed') NOT NULL DEFAULT 'active',
  unsubscribed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_contact_mobile_number (mobile_number),
  KEY idx_contacts_created_at (created_at, id),
  KEY idx_contacts_status_unsubscribed (status, unsubscribed_at),
  KEY idx_contacts_commune_country (commune, country)
);

CREATE TABLE contact_lists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_contact_lists_created_at (created_at, id)
);

CREATE TABLE contact_list_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  contact_list_id BIGINT UNSIGNED NOT NULL,
  contact_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_contact_per_list (contact_list_id, contact_id),
  KEY idx_contact_list_items_contact_id (contact_id),
  CONSTRAINT fk_contact_list_items_list FOREIGN KEY (contact_list_id) REFERENCES contact_lists(id) ON DELETE CASCADE,
  CONSTRAINT fk_contact_list_items_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE TABLE contact_imports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  original_filename VARCHAR(255) NOT NULL,
  status ENUM('completed', 'failed') NOT NULL DEFAULT 'completed',
  total_rows INT UNSIGNED NOT NULL DEFAULT 0,
  imported_rows INT UNSIGNED NOT NULL DEFAULT 0,
  duplicate_rows INT UNSIGNED NOT NULL DEFAULT 0,
  invalid_rows INT UNSIGNED NOT NULL DEFAULT 0,
  summary JSON NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_contact_imports_created_at (created_at, id),
  KEY idx_contact_imports_status_created (status, created_at)
);

CREATE TABLE contact_import_rows (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  contact_import_id BIGINT UNSIGNED NOT NULL,
  row_number INT UNSIGNED NOT NULL,
  email VARCHAR(190) NULL,
  status ENUM('imported', 'duplicate', 'invalid') NOT NULL,
  reason VARCHAR(255) NULL,
  raw_data JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_contact_import_rows_import_status (contact_import_id, status),
  KEY idx_contact_import_rows_email (email),
  CONSTRAINT fk_contact_import_rows_import FOREIGN KEY (contact_import_id) REFERENCES contact_imports(id) ON DELETE CASCADE
);

CREATE TABLE email_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_content MEDIUMTEXT NOT NULL,
  text_content MEDIUMTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_email_templates_created_at (created_at, id)
);

CREATE TABLE campaigns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template_id BIGINT UNSIGNED NOT NULL,
  contact_list_id BIGINT UNSIGNED NOT NULL,
  send_mode ENUM('single', 'bulk') NOT NULL DEFAULT 'single',
  status ENUM('draft', 'ready', 'sending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_campaigns_status_scheduled (status, scheduled_at),
  KEY idx_campaigns_created_at (created_at, id),
  KEY idx_campaigns_template_id (template_id),
  KEY idx_campaigns_contact_list_id (contact_list_id),
  CONSTRAINT fk_campaigns_template FOREIGN KEY (template_id) REFERENCES email_templates(id),
  CONSTRAINT fk_campaigns_contact_list FOREIGN KEY (contact_list_id) REFERENCES contact_lists(id)
);

CREATE TABLE campaign_recipients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  contact_id BIGINT UNSIGNED NOT NULL,
  provider_message_id VARCHAR(190) NULL,
  status ENUM('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked', 'unsubscribed') NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_contact_per_campaign (campaign_id, contact_id),
  KEY idx_campaign_recipients_campaign_status (campaign_id, status),
  KEY idx_campaign_recipients_contact_id (contact_id),
  KEY idx_campaign_recipients_provider_message (provider_message_id),
  KEY idx_campaign_recipients_created_at (created_at, id),
  CONSTRAINT fk_campaign_recipients_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_campaign_recipients_contact FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

CREATE TABLE email_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  campaign_recipient_id BIGINT UNSIGNED NULL,
  provider VARCHAR(60) NOT NULL,
  provider_message_id VARCHAR(190) NULL,
  event_type VARCHAR(80) NOT NULL,
  payload JSON NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_events_provider_message (provider_message_id),
  KEY idx_email_events_recipient_occurred (campaign_recipient_id, occurred_at),
  KEY idx_email_events_type_occurred (event_type, occurred_at),
  CONSTRAINT fk_email_events_campaign_recipient FOREIGN KEY (campaign_recipient_id) REFERENCES campaign_recipients(id) ON DELETE SET NULL
);

CREATE TABLE mail_settings (
  config_key VARCHAR(120) NOT NULL PRIMARY KEY,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE suppression_list (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  reason ENUM('unsubscribed', 'bounce', 'complaint', 'manual') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_suppression_list_reason_created (reason, created_at)
);
