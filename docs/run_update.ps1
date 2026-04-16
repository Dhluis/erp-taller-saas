$ErrorActionPreference = 'Stop'

$sql = Get-Content -Path 'C:\Users\exclu\erp-taller-saas\docs\update_orgs.sql' -Raw -Encoding UTF8

$body = @{
    sql = $sql
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri 'https://igshgleciwknpupbmvhn.supabase.co/rest/v1/rpc/exec_sql' `
    -Method POST `
    -Headers @{
        'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODczMjUyMCwiZXhwIjoyMDc0MzA4NTIwfQ.2lt7F9Yt-2qhg4qsxCQWktAXszoTgs6JGkdzNm_Z4yI'
        'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODczMjUyMCwiZXhwIjoyMDc0MzA4NTIwfQ.2lt7F9Yt-2qhg4qsxCQWktAXszoTgs6JGkdzNm_Z4yI'
        'Content-Type' = 'application/json'
    } `
    -Body $body

$response | ConvertTo-Json -Depth 10