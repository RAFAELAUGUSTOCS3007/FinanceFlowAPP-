CREATE TABLE `category_budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`category` varchar(50) NOT NULL,
	`budgetLimit` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `category_budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixed_expenses` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`plannedValue` decimal(12,2) NOT NULL,
	`actualValue` decimal(12,2),
	`isPaid` boolean DEFAULT false,
	`paidDate` varchar(10),
	`isRecurring` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fixed_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incomes` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`value` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`type` enum('emergency','personal') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(100),
	`pronouns` varchar(30),
	`emergencyGoal` decimal(12,2) DEFAULT '0',
	`personalGoalName` varchar(100),
	`personalGoalTarget` decimal(12,2) DEFAULT '0',
	`creditLimit` decimal(12,2) DEFAULT '0',
	`biometricEnabled` boolean DEFAULT false,
	`notificationsEnabled` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `variable_expenses` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` varchar(50) NOT NULL,
	`value` decimal(12,2) NOT NULL,
	`paymentMethod` enum('debit','credit','pix','cash') NOT NULL,
	`isEssential` boolean DEFAULT false,
	`date` varchar(10) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `variable_expenses_id` PRIMARY KEY(`id`)
);
