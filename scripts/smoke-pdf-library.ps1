# Author: Robert Massey | Created: 2026-07-14 | Module: Scripts
# Live smoke: clone the Service Estimate library template, publish form +
# workflow, submit the public form, and confirm the run generates a PDF and
# emails it. ASCII-only on purpose (PowerShell 5.1 encoding).

$ErrorActionPreference = 'Stop'
$api = 'http://localhost:3101/api/v1'

function Step($name, $ok, $extra) {
  $mark = if ($ok) { 'PASS' } else { 'FAIL' }
  Write-Host ("[{0}] {1} {2}" -f $mark, $name, $extra)
  if (-not $ok) { exit 1 }
}

# 1. Login as the growth demo owner
$login = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' `
  -Body '{"email":"owner@growth.attune-sb.local","password":"GrowthOwnerPass#2026"}'
$h = @{ Authorization = "Bearer $($login.data.tokens.accessToken)" }
Step 'login' ($null -ne $login.data.tokens.accessToken) ''

# 2. Fetch the template + clone it
$tpl = Invoke-RestMethod -Uri "$api/library/service-estimate"
Step 'template fetch' ($tpl.data.workflow.nodes.Count -ge 4) "nodes=$($tpl.data.workflow.nodes.Count)"

$clone = Invoke-RestMethod -Method Post -Uri "$api/library/$($tpl.data.id)/clone" -Headers $h
$formId = $clone.data.formId
$workflowId = $clone.data.workflowId
Step 'clone' ($formId -and $workflowId) "form=$formId workflow=$workflowId"

# 3. Publish the form, grab its slug, publish the workflow
$null = Invoke-RestMethod -Method Post -Uri "$api/forms/$formId/publish" -Headers $h -ContentType 'application/json' -Body '{}'
$form = Invoke-RestMethod -Uri "$api/forms/$formId" -Headers $h
$slug = $form.data.slug
Step 'form published' ($form.data.status -eq 'PUBLISHED') "slug=$slug"

$null = Invoke-RestMethod -Method Post -Uri "$api/workflows/$workflowId/publish" -Headers $h -ContentType 'application/json' -Body '{}'
Step 'workflow published' $true ''

# 4. Submit the public form (Resend test inbox as the customer)
$values = @{
  'customer-name'       = 'Pat Doe'
  'customer-email'      = 'delivered@resend.dev'
  'job-title'           = 'Water heater replacement'
  'scope'               = 'Remove failed 40-gal unit; install new 50-gal gas water heater; haul away.'
  'materials'           = '50-gal Rheem unit, expansion tank, fittings'
  'labor-cost'          = 450
  'materials-cost'      = 1150
  'total'               = 1600
  'valid-days'          = '30 days'
  'terms'               = '50 percent deposit to schedule; balance on completion.'
  'estimator-signature' = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
}
$body = @{ values = $values } | ConvertTo-Json -Depth 5
$sub = Invoke-RestMethod -Method Post -Uri "$api/public/forms/$slug/submissions" -ContentType 'application/json' -Body $body
Step 'public submission' ($null -ne $sub.data.id) "id=$($sub.data.id)"

# 5. Poll the run until it settles
$run = $null
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 2
  $runs = Invoke-RestMethod -Uri "$api/workflows/$workflowId/runs" -Headers $h
  $run = $runs.data.runs | Select-Object -First 1
  if ($run -and $run.status -notin @('PENDING', 'RUNNING')) { break }
}
Step 'run settled' ($null -ne $run) "status=$($run.status)"

$detail = Invoke-RestMethod -Uri "$api/workflows/runs/$($run.id)" -Headers $h
$steps = $detail.data.steps | ForEach-Object { "$($_.nodeType)=$($_.status)" }
Write-Host ("steps: " + ($steps -join ', '))
Step 'run completed' ($run.status -eq 'COMPLETED') ''

# send_document only completes after downloading the generated PDF and
# handing it to the mailer, so these two steps are the end-to-end proof.
$pdfStep = $detail.data.steps | Where-Object { $_.nodeType -eq 'pdf_generate' }
$sendStep = $detail.data.steps | Where-Object { $_.nodeType -eq 'send_document' }
Step 'pdf generated' ($pdfStep.status -eq 'COMPLETED') ''
Step 'pdf emailed' ($sendStep.status -eq 'COMPLETED') ''
