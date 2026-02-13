-- De-SaaS: Unlock all workspaces to team plan, clear billing fields
UPDATE workspace SET plan = 'team' WHERE plan IS NULL OR plan = 'free' OR plan = 'starter';
UPDATE workspace SET stripe_id = NULL, subscription_id = NULL, paid_until = NULL, ends_at = NULL;
