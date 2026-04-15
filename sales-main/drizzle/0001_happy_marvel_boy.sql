CREATE TABLE `purchase_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`purchase_date` text NOT NULL,
	`total_qty` integer NOT NULL,
	`remaining_qty` integer NOT NULL,
	`total_cost` integer NOT NULL,
	`unit_cost` integer NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `weekly_costs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_label` text NOT NULL,
	`ad_cost` integer DEFAULT 0 NOT NULL,
	`shipping_cost` integer DEFAULT 0 NOT NULL,
	`packaging_cost` integer DEFAULT 0 NOT NULL,
	`other_cost` integer DEFAULT 0 NOT NULL,
	`total_cost` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now'))
);
