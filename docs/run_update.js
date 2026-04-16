const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://igshgleciwknpupbmvhn.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODczMjUyMCwiZXhwIjoyMDc0MzA4NTIwfQ.2lt7F9Yt-2qhg4qsxCQWktAXszoTgs6JGkdzNm_Z4yI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery() {
  const sql = `
UPDATE organizations SET
  plan_tier           = 'premium',
  subscription_status = 'trial',
  trial_ends_at       = (NOW() + INTERVAL '7 days'),
  plan_started_at     = COALESCE(plan_started_at, NOW()),
  updated_at          = NOW()
WHERE
  subscription_status IN ('free', 'expired_trial', 'expired', 'inactive', 'canceled')
  OR (subscription_status IS NULL AND (plan_tier = 'free' OR plan_tier IS NULL));
  `;

  const { data, error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Result:", data);
}

runQuery();
