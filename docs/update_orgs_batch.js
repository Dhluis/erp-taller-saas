const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://igshgleciwknpupbmvhn.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODczMjUyMCwiZXhwIjoyMDc0MzA4NTIwfQ.2lt7F9Yt-2qhg4qsxCQWktAXszoTgs6JGkdzNm_Z4yI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateOrganizations() {
  // Get all orgs that need updating (trial status but no trial_ends_at, or free tier)
  const { data: orgs, error: fetchError } = await supabase
    .from("organizations")
    .select(
      "id, name, plan_tier, subscription_status, plan_started_at, trial_ends_at",
    )
    .or(
      "subscription_status.eq.trial,subscription_status.eq.free,subscription_status.is.null",
    );

  if (fetchError) {
    console.error("Error fetching orgs:", fetchError);
    return;
  }

  console.log(
    `Total organizations with trial/free/null status: ${orgs.length}`,
  );

  // Filter to only those that need updating (don't have trial_ends_at set or have 'free' tier)
  const toUpdate = orgs.filter((org) => {
    return !org.trial_ends_at || org.plan_tier === "free";
  });

  console.log(
    `Organizations to update (no trial_ends_at or free tier): ${toUpdate.length}`,
  );

  // Calculate dates
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  const now = new Date().toISOString();

  console.log(`Setting trial_ends_at to: ${trialEndsAt.toISOString()}`);

  // Update each organization
  let updated = 0;
  for (const org of toUpdate) {
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        plan_tier: "premium",
        subscription_status: "trial",
        trial_ends_at: trialEndsAt.toISOString(),
        plan_started_at: org.plan_started_at || now,
        updated_at: now,
      })
      .eq("id", org.id);

    if (updateError) {
      console.error(`Error updating org ${org.id}:`, updateError);
    } else {
      updated++;
    }
  }

  console.log(`Updated ${updated} organizations`);

  // Verify the results with the query the user requested
  const { data: results } = await supabase
    .from("organizations")
    .select("subscription_status, plan_tier, trial_ends_at");

  // Group by status
  const grouped = {};
  for (const r of results) {
    const key = `${r.subscription_status || "NULL"}/${r.plan_tier || "NULL"}`;
    if (!grouped[key])
      grouped[key] = { count: 0, minDate: null, maxDate: null };
    grouped[key].count++;
    if (r.trial_ends_at) {
      if (!grouped[key].minDate || r.trial_ends_at < grouped[key].minDate)
        grouped[key].minDate = r.trial_ends_at;
      if (!grouped[key].maxDate || r.trial_ends_at > grouped[key].maxDate)
        grouped[key].maxDate = r.trial_ends_at;
    }
  }

  console.log("\n--- Results (as requested) ---");
  console.log(
    "subscription_status | plan_tier | total | min_trial_ends | max_trial_ends",
  );
  console.log(
    "-------------------|-----------|-------|----------------|----------------",
  );
  for (const [key, data] of Object.entries(grouped)) {
    const [status, tier] = key.split("/");
    console.log(
      `${status.padEnd(18)}| ${tier.padEnd(9)}| ${data.count.toString().padEnd(5)}| ${data.minDate ? data.minDate.substring(0, 10) : "NULL"} | ${data.maxDate ? data.maxDate.substring(0, 10) : "NULL"}`,
    );
  }
}

updateOrganizations();
