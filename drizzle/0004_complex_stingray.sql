CREATE TABLE "post" (
	"id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"board_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"external_url" text,
	"original_key" text NOT NULL,
	"original_content_type" text NOT NULL,
	"original_size" bigint NOT NULL,
	"thumbnail_key" text NOT NULL,
	"thumbnail_size" bigint NOT NULL,
	"thumbnail_width" integer NOT NULL,
	"thumbnail_height" integer NOT NULL,
	"publish_from" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "post_expires_after_publish" CHECK ("post"."expires_at" > "post"."publish_from")
);
--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_board_id_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_removed_by_user_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_board_id_idx" ON "post" USING btree ("board_id");