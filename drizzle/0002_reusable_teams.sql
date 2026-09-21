CREATE TABLE `teams` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `invite_code` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_invite_code` ON `teams` (`invite_code`);
--> statement-breakpoint
ALTER TABLE `members` ADD `team_id` text;
--> statement-breakpoint
CREATE INDEX `members_team` ON `members` (`team_id`);
