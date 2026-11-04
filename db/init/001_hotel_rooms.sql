-- Room registry (PRD §6.4, FR-06). Custom table; LimeSurvey tables are never touched.
-- Runs once, on first database initialisation (docker-entrypoint-initdb.d).

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  room_number   VARCHAR(20)      NOT NULL,
  qr_token_hash CHAR(64)         NOT NULL,           -- SHA-256 hex of the random token; raw token is never stored
  is_active     TINYINT(1)       NOT NULL DEFAULT 1,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hotel_rooms_room_number (room_number),
  UNIQUE KEY uq_hotel_rooms_token_hash (qr_token_hash)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
