CREATE TABLE IF NOT EXISTS sent_notifications (
  notification_key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent')),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sent_notifications_status_updated_idx ON sent_notifications (status, updated_at);
