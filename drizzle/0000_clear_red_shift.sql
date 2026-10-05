CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`qty` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "qty_positive" CHECK("order_items"."qty" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_items_order_id` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`order_id` text,
	`created` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`customer` text NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`payment` text DEFAULT 'UNPAID' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`spicy` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`target` text NOT NULL,
	`recipient` text NOT NULL,
	`slip` text,
	`slip_type` text
);
--> statement-breakpoint
CREATE INDEX `idx_orders_created` ON `orders` (`created`);--> statement-breakpoint
CREATE INDEX `idx_orders_token` ON `orders` (`token`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`stock` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stock_nonnegative" CHECK("products"."stock" >= 0),
	CONSTRAINT "price_positive" CHECK("products"."price" > 0)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target` text DEFAULT '' NOT NULL,
	`recipient` text DEFAULT '' NOT NULL,
	`open` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER validate_order_stock BEFORE INSERT ON order_items
BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM products WHERE id=NEW.product_id AND active=1 AND stock>=NEW.qty)
 THEN RAISE(ABORT,'STOCK_UNAVAILABLE') END;
END;
--> statement-breakpoint
CREATE TRIGGER deduct_order_stock AFTER INSERT ON order_items
BEGIN
 UPDATE products SET stock=stock-NEW.qty WHERE id=NEW.product_id;
 INSERT INTO stock_movements(product_id,delta,reason,order_id,created)
 VALUES(NEW.product_id,-NEW.qty,'จองสำหรับออเดอร์',NEW.order_id,(SELECT created FROM orders WHERE id=NEW.order_id));
END;
--> statement-breakpoint
CREATE TRIGGER restore_cancelled_stock AFTER UPDATE OF status ON orders
WHEN NEW.status='CANCELLED' AND OLD.status!='CANCELLED'
BEGIN
 UPDATE products SET stock=stock+COALESCE((SELECT SUM(qty) FROM order_items WHERE order_id=NEW.id AND product_id=products.id),0)
 WHERE id IN (SELECT product_id FROM order_items WHERE order_id=NEW.id);
 INSERT INTO stock_movements(product_id,delta,reason,order_id,created)
 SELECT product_id,qty,'คืนจากออเดอร์ยกเลิก',NEW.id,CAST(strftime('%s','now') AS INTEGER)*1000 FROM order_items WHERE order_id=NEW.id;
END;
