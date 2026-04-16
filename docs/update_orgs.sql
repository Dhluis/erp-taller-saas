UPDATE organizations SET
  plan_tier           = 'premium',
  subscription_status = 'trial',
  trial_ends_at       = (NOW() + INTERVAL '7 days'),
  plan_started_at     = COALESCE(plan_started_at, NOW()),
  updated_at          = NOW()
WHERE
  subscription_status IN ('free', 'expired_trial', 'expired', 'inactive', 'canceled')
  OR (subscription_status IS NULL AND (plan_tier = 'free' OR plan_tier IS NULL));