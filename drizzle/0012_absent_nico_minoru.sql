DROP INDEX "post_board_id_idx";--> statement-breakpoint
CREATE INDEX "post_board_publish_from_idx" ON "post" USING btree ("board_id","publish_from","id");