const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://igshgleciwknpupbmvhn.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODczMjUyMCwiZXhwIjoyMDc0MzA4NTIwfQ.2lt7F9Yt-2qhg4qsxCQWktAXszoTgs6JGkdzNm_Z4yI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateActiveOrgs() {
  // Get all active orgs
  const { data: orgs, error: fetchError } = await supabase
    .from("organizations")
    .select("id, name, email, subscription_status, plan_tier")
    .eq("subscription_status", "active");

  if (fetchError) {
    console.error("Error:", fetchError);
    return;
  }

  console.log(`Organizations con status active: ${orgs.length}`);
  orgs.forEach((o) => console.log(`  - ${o.name} (${o.email})`));

  // Calculate dates
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);
  const now = new Date().toISOString();

  // Update each to trial
  for (const org of orgs) {
    await supabase
      .from("organizations")
      .update({
        subscription_status: "trial",
        trial_ends_at: trialEndsAt.toISOString(),
        updated_at: now,
      })
      .eq("id", org.id);
  }

  console.log(
    `\nActualizadas a trial hasta: ${trialEndsAt.toISOString().substring(0, 10)}`,
  );

  // Verify
  const { data: results } = await supabase
    .from("organizations")
    .select("subscription_status, plan_tier");

  const grouped = {};
  results.forEach((r) => {
    const key = `${r.subscription_status}/${r.plan_tier}`;
    grouped[key] = (grouped[key] || 0) + 1;
  });

  console.log("\n--- Resultados finales ---");
  Object.entries(grouped).forEach(([key, count]) =>
    console.log(`${key}: ${count}`),
  );
}

updateActiveOrgs();
