# Author: Robert Massey | Created: 2026-07-15 | Module: Scripts
# Live smoke: clone the Contractor Job Quote library template, verify the
# bundled document blueprint materialized as a READY pre-mapped template,
# publish form + workflow, submit the public form, and confirm the run fills
# the branded quote PDF and emails it. ASCII-only (PowerShell 5.1 encoding).

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

# 2. Fetch the template — it must advertise the bundled document
$tpl = Invoke-RestMethod -Uri "$api/library/contractor-job-quote"
Step 'template has document' ($tpl.data.hasDocument -eq $true) "blueprint=$($tpl.data.document.blueprint)"

# 3. Clone — form + workflow + materialized document template
$clone = Invoke-RestMethod -Method Post -Uri "$api/library/$($tpl.data.id)/clone" -Headers $h
$formId = $clone.data.formId
$workflowId = $clone.data.workflowId
$docId = $clone.data.documentTemplateId
Step 'clone' ($formId -and $workflowId -and $docId) "form=$formId workflow=$workflowId doc=$docId"

# 4. The document template must be READY, linked, and pre-mapped
$doc = Invoke-RestMethod -Uri "$api/document-templates/$docId" -Headers $h
Step 'document READY' ($doc.data.status -eq 'READY') "mappings=$($doc.data.fieldMappings.Count)"
Step 'document linked to form' ($doc.data.formId -eq $formId) ''
Step 'document pre-mapped' ($doc.data.fieldMappings.Count -ge 10) ''

# 5. Publish the form + workflow
$null = Invoke-RestMethod -Method Post -Uri "$api/forms/$formId/publish" -Headers $h -ContentType 'application/json' -Body '{}'
$form = Invoke-RestMethod -Uri "$api/forms/$formId" -Headers $h
$slug = $form.data.slug
Step 'form published' ($form.data.status -eq 'PUBLISHED') "slug=$slug"

$null = Invoke-RestMethod -Method Post -Uri "$api/workflows/$workflowId/publish" -Headers $h -ContentType 'application/json' -Body '{}'
Step 'workflow published' $true ''

# 6. Submit the public form (Resend test inbox as the customer)
$values = @{
  'quote-date'      = '2026-07-15'
  'valid-days'      = '30 days'
  'prepared-by'     = 'Massey Construction LLC'
  'customer-name'   = 'Pat Doe'
  'customer-email'  = 'delivered@resend.dev'
  'customer-phone'  = '(555) 201-8843'
  'job-address'     = '412 Birchwood Ln, Franklin TN'
  'job-title'       = 'Kitchen remodel - full gut'
  'job-description' = 'Demo cabinets and tile; install new cabinets, quartz counters, LVP floor.'
  'materials-cost'  = 14250
  'labor-cost'      = 9800
  'other-cost'      = 650
  'total-price'     = 24700
  'notes'           = '50 percent deposit to schedule. Excludes appliances.'
  'signature'       = '[[{"x":0,"y":30},{"x":20,"y":5},{"x":40,"y":35},{"x":90,"y":10},{"x":140,"y":25}]]'
}
$body = @{ values = $values } | ConvertTo-Json -Depth 5
$sub = Invoke-RestMethod -Method Post -Uri "$api/public/forms/$slug/submissions" -ContentType 'application/json' -Body $body
Step 'public submission' ($null -ne $sub.data.id) "id=$($sub.data.id)"

# 7. Poll the run until it settles
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

# fill_document proves the blueprint template was found and rendered; the two
# send_document steps prove the filled quote went to customer + owner.
$fillStep = $detail.data.steps | Where-Object { $_.nodeType -eq 'fill_document' }
$sendSteps = @($detail.data.steps | Where-Object { $_.nodeType -eq 'send_document' -and $_.status -eq 'COMPLETED' })
Step 'quote PDF filled' ($fillStep.status -eq 'COMPLETED') ''
Step 'quote emailed (customer + owner)' ($sendSteps.Count -eq 2) "sent=$($sendSteps.Count)"
