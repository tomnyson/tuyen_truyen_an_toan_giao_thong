CREATE TABLE IF NOT EXISTS `rate_limit_buckets` (
  `scope` text NOT NULL,
  `key_hash` text NOT NULL,
  `window_start` integer NOT NULL,
  `request_count` integer DEFAULT 1 NOT NULL,
  `expires_at` integer NOT NULL,
  PRIMARY KEY (`scope`, `key_hash`, `window_start`),
  CONSTRAINT `rate_limit_buckets_scope_check`
    CHECK (`scope` IN (
      'login-client-15m-v1',
      'login-account-60m-v1',
      'login-pair-attempt-15m-v1',
      'chat-client-60s-v1',
      'chat-client-day-v1'
    )),
  CONSTRAINT `rate_limit_buckets_key_hash_check`
    CHECK (
      length(`key_hash`) = 64
      AND `key_hash` = lower(`key_hash`)
      AND `key_hash` NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `rate_limit_buckets_window_check`
    CHECK (
      `window_start` >= 0
      AND `request_count` >= 1
      AND `expires_at` > `window_start`
    )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rate_limit_buckets_expiry_idx`
  ON `rate_limit_buckets` (`expires_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rate_limit_penalties` (
  `scope` text NOT NULL,
  `key_hash` text NOT NULL,
  `window_start` integer NOT NULL,
  `consecutive_failures` integer DEFAULT 1 NOT NULL,
  `blocked_until` integer DEFAULT 0 NOT NULL,
  `state_version` text NOT NULL,
  `expires_at` integer NOT NULL,
  PRIMARY KEY (`scope`, `key_hash`),
  CONSTRAINT `rate_limit_penalties_scope_check`
    CHECK (`scope` = 'login-pair-penalty-15m-v1'),
  CONSTRAINT `rate_limit_penalties_key_hash_check`
    CHECK (
      length(`key_hash`) = 64
      AND `key_hash` = lower(`key_hash`)
      AND `key_hash` NOT GLOB '*[^0-9a-f]*'
    ),
  CONSTRAINT `rate_limit_penalties_state_check`
    CHECK (
      `window_start` >= 0
      AND `consecutive_failures` >= 0
      AND `blocked_until` >= 0
      AND length(`state_version`) = 32
      AND `state_version` = lower(`state_version`)
      AND `state_version` NOT GLOB '*[^0-9a-f]*'
      AND `expires_at` > `window_start`
    )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rate_limit_penalties_expiry_idx`
  ON `rate_limit_penalties` (`expires_at`);
