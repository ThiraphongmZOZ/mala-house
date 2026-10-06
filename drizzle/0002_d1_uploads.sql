CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`data` blob NOT NULL,
	CONSTRAINT "upload_size" CHECK(length("uploads"."data") <= 500000)
);
