CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'super_admin') NOT NULL DEFAULT 'admin',
  role_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_role_id (role_id)
);

CREATE TABLE admin_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  permissions_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  actor_name VARCHAR(160) NULL,
  actor_email VARCHAR(190) NULL,
  action VARCHAR(120) NOT NULL,
  resource VARCHAR(120) NOT NULL,
  resource_id VARCHAR(120) NULL,
  message VARCHAR(500) NOT NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_activity_logs_created_at (created_at, id),
  KEY idx_activity_logs_user_created (user_id, created_at),
  KEY idx_activity_logs_resource_created (resource, created_at),
  KEY idx_activity_logs_action_created (action, created_at),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE admin_invitations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  accepted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_admin_invitations_user_created (user_id, created_at),
  KEY idx_admin_invitations_token_active (token_hash, accepted_at, expires_at),
  CONSTRAINT fk_admin_invitations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

CREATE TABLE countries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(12) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_country_name (name),
  KEY idx_countries_name (name)
);

CREATE TABLE communes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  country_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_commune_per_country (country_id, name),
  KEY idx_communes_name (name),
  CONSTRAINT fk_communes_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
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
  channel ENUM('email', 'sms', 'whatsapp', 'telegram') NOT NULL DEFAULT 'email',
  name VARCHAR(160) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_content MEDIUMTEXT NOT NULL,
  text_content MEDIUMTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_email_templates_channel_created (channel, created_at, id),
  KEY idx_email_templates_created_at (created_at, id)
);

CREATE TABLE communication_providers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  channel ENUM('email', 'sms', 'whatsapp', 'telegram') NOT NULL,
  name VARCHAR(160) NOT NULL,
  provider_key VARCHAR(80) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  variables_json JSON NOT NULL,
  limits_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_communication_providers_channel_active (channel, is_active),
  KEY idx_communication_providers_key (provider_key)
);

CREATE TABLE campaigns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template_id BIGINT UNSIGNED NOT NULL,
  contact_list_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('email', 'sms', 'whatsapp', 'telegram') NOT NULL DEFAULT 'email',
  communication_provider_id BIGINT UNSIGNED NULL,
  send_mode ENUM('single', 'bulk') NOT NULL DEFAULT 'single',
  status ENUM('draft', 'ready', 'sending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_campaigns_status_scheduled (status, scheduled_at),
  KEY idx_campaigns_channel_provider (channel, communication_provider_id),
  KEY idx_campaigns_created_at (created_at, id),
  KEY idx_campaigns_template_id (template_id),
  KEY idx_campaigns_contact_list_id (contact_list_id),
  CONSTRAINT fk_campaigns_template FOREIGN KEY (template_id) REFERENCES email_templates(id),
  CONSTRAINT fk_campaigns_contact_list FOREIGN KEY (contact_list_id) REFERENCES contact_lists(id),
  CONSTRAINT fk_campaigns_communication_provider FOREIGN KEY (communication_provider_id) REFERENCES communication_providers(id) ON DELETE SET NULL
);

CREATE TABLE campaign_channels (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('email', 'sms', 'whatsapp', 'telegram') NOT NULL,
  communication_provider_id BIGINT UNSIGNED NULL,
  template_id BIGINT UNSIGNED NULL,
  send_mode ENUM('single', 'bulk') NOT NULL DEFAULT 'single',
  status ENUM('draft', 'ready', 'sending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'ready',
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_campaign_channel (campaign_id, channel),
  KEY idx_campaign_channels_campaign_status (campaign_id, status),
  KEY idx_campaign_channels_provider (communication_provider_id),
  KEY idx_campaign_channels_channel (channel),
  CONSTRAINT fk_campaign_channels_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_campaign_channels_provider FOREIGN KEY (communication_provider_id) REFERENCES communication_providers(id) ON DELETE SET NULL,
  CONSTRAINT fk_campaign_channels_template FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
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

CREATE TABLE campaign_channel_recipients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  campaign_channel_id BIGINT UNSIGNED NOT NULL,
  campaign_recipient_id BIGINT UNSIGNED NOT NULL,
  contact_id BIGINT UNSIGNED NOT NULL,
  provider_message_id VARCHAR(190) NULL,
  status ENUM('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked', 'unsubscribed') NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_recipient_per_campaign_channel (campaign_channel_id, campaign_recipient_id),
  KEY idx_campaign_channel_recipients_status (campaign_channel_id, status),
  KEY idx_campaign_channel_recipients_contact (contact_id),
  KEY idx_campaign_channel_recipients_provider_message (provider_message_id),
  CONSTRAINT fk_campaign_channel_recipients_channel FOREIGN KEY (campaign_channel_id) REFERENCES campaign_channels(id) ON DELETE CASCADE,
  CONSTRAINT fk_campaign_channel_recipients_recipient FOREIGN KEY (campaign_recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  CONSTRAINT fk_campaign_channel_recipients_contact FOREIGN KEY (contact_id) REFERENCES contacts(id)
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

CREATE TABLE technical_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  level ENUM('debug', 'info', 'warning', 'error') NOT NULL DEFAULT 'info',
  scope VARCHAR(80) NOT NULL,
  event VARCHAR(120) NOT NULL,
  message VARCHAR(500) NOT NULL,
  campaign_id BIGINT UNSIGNED NULL,
  campaign_channel_id BIGINT UNSIGNED NULL,
  provider VARCHAR(120) NULL,
  payload_json JSON NULL,
  response_json JSON NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_technical_logs_created_at (created_at, id),
  KEY idx_technical_logs_scope_event (scope, event),
  KEY idx_technical_logs_campaign (campaign_id, campaign_channel_id),
  KEY idx_technical_logs_level_created (level, created_at),
  CONSTRAINT fk_technical_logs_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
  CONSTRAINT fk_technical_logs_campaign_channel FOREIGN KEY (campaign_channel_id) REFERENCES campaign_channels(id) ON DELETE SET NULL
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
