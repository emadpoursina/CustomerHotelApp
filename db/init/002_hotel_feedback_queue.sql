-- Hotel Feedback Queue (spec 003). Custom table; engine tables are never touched.
-- Manages workflow state (pending -> published / private) for completed survey responses.
-- Comments are never copied into this table (privacy boundary).

CREATE TABLE IF NOT EXISTS hotel_feedback_queue (
  id            INT UNSIGNED                         NOT NULL AUTO_INCREMENT,
  survey_id     INT                                  NOT NULL DEFAULT 420001,
  response_id   INT                                  NOT NULL,
  department    VARCHAR(32)                          NOT NULL DEFAULT '',
  overall       TINYINT UNSIGNED                     NULL,
  nps           TINYINT UNSIGNED                     NULL,
  submitted_at  DATETIME                             NULL,
  state         ENUM('pending', 'published', 'private') NOT NULL DEFAULT 'pending',
  decided_at    DATETIME                             NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hotel_feedback_queue_survey_response (survey_id, response_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
