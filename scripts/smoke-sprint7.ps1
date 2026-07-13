# Author: Robert Massey | Created: 2026-07-13 | Module: Scripts
# Sprint 7 acceptance smoke: publish a workflow (fill_document -> send_document
# -> notify), trigger it with a public submission, verify the run ledger, the
# filled-PDF email, WORKFLOW_RUNS + EMAILS metering, and the plan-tier gate.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3101/api/v1'

function Step($msg) { Write-Host "== $msg" -ForegroundColor Cyan }

Step 'Login as demo owner'
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{
  email = 'owner@demo.attune-sb.local'; password = 'DemoOwnerPass#2026'
} | ConvertTo-Json)
$token = $login.data.tokens.accessToken
$h = @{ Authorization = "Bearer $token" }

Step 'Clean up artifacts from previous smoke runs'
$oldWf = Invoke-RestMethod -Uri "$base/workflows?pageSize=50" -Headers $h
foreach ($w in @($oldWf.data.workflows)) {
  if ($w.name -like 'S7 *') {
    Invoke-RestMethod -Method Delete -Uri "$base/workflows/$($w.id)" -Headers $h | Out-Null
    Write-Host "deleted old workflow $($w.id)"
  }
}
$existing = Invoke-RestMethod -Uri "$base/document-templates" -Headers $h
foreach ($t in @($existing.data)) {
  if ($t.name -in @('S6 Fixture', 'S7 Fixture')) {
    Invoke-RestMethod -Method Delete -Uri "$base/document-templates/$($t.id)" -Headers $h | Out-Null
    Write-Host "deleted old template $($t.id)"
  }
}
$oldForms = Invoke-RestMethod -Uri "$base/forms?pageSize=50" -Headers $h
foreach ($f in $oldForms.data.forms) {
  if ($f.name -like 'S6 Smoke*' -or $f.name -like 'S7 Smoke*') {
    Invoke-RestMethod -Method Delete -Uri "$base/forms/$($f.id)" -Headers $h | Out-Null
    Write-Host "deleted old form $($f.id)"
  } elseif ($f.name -like 'Smoke Form*' -and $f.status -eq 'PUBLISHED') {
    Invoke-RestMethod -Method Post -Uri "$base/forms/$($f.id)/unpublish" -Headers $h | Out-Null
    Write-Host "unpublished old smoke form $($f.id)"
  }
}

Step 'Create form + mapped template (S6 machinery)'
$fields = @(
  @{ id = 'f-name';    type = 'text';      label = 'Full Name';              page = 1 },
  @{ id = 'f-email';   type = 'email';     label = 'Email Address';          page = 1 },
  @{ id = 'f-phone';   type = 'phone';     label = 'Phone Number';           page = 1 },
  @{ id = 'f-company'; type = 'text';      label = 'Company';                page = 1 },
  @{ id = 'f-street';  type = 'text';      label = 'Street Address';         page = 1 },
  @{ id = 'f-city';    type = 'text';      label = 'City';                   page = 1 },
  @{ id = 'f-state';   type = 'text';      label = 'State';                  page = 1 },
  @{ id = 'f-zip';     type = 'text';      label = 'Zip Code';               page = 1 },
  @{ id = 'f-date';    type = 'date';      label = 'Preferred Contact Date'; page = 1 },
  @{ id = 'f-notes';   type = 'textarea';  label = 'Comments';               page = 1 }
)
$form = Invoke-RestMethod -Method Post -Uri "$base/forms" -Headers $h -ContentType 'application/json' -Body (@{
  name = "S7 Smoke $(Get-Date -Format HHmmss)"
  schema = @{ fields = $fields; pages = @() }
} | ConvertTo-Json -Depth 8)
$formId = $form.data.id
Write-Host "form=$formId"

$upload = curl.exe -s -X POST "$base/document-templates" -H "Authorization: Bearer $token" `
  -F "file=@api/storage/_fixture-intake.pdf;type=application/pdf" -F "name=S7 Fixture" -F "formId=$formId" | ConvertFrom-Json
if (-not $upload.success) { throw "upload failed: $($upload | ConvertTo-Json -Depth 5)" }
$templateId = $upload.data.id

$suggest = Invoke-RestMethod -Method Post -Uri "$base/document-templates/$templateId/suggest-mappings" -Headers $h
$mappings = @($suggest.data.candidates | ForEach-Object {
  @{
    fieldId = $_.fieldId; fieldLabel = $_.fieldLabel; page = $_.page
    x = $_.x; y = $_.y; width = $_.width; height = $_.height; renderMode = 'value'
  }
})
$null = Invoke-RestMethod -Method Put -Uri "$base/document-templates/$templateId/mappings" -Headers $h -ContentType 'application/json' -Body (@{
  mappings = $mappings
} | ConvertTo-Json -Depth 6)
Write-Host "template=$templateId mapped=$($mappings.Count)"

$pub = Invoke-RestMethod -Method Post -Uri "$base/forms/$formId/publish" -Headers $h
$slug = $pub.data.slug
if (-not $slug) { $slug = (Invoke-RestMethod -Uri "$base/forms/$formId" -Headers $h).data.slug }
Write-Host "slug=$slug"

Step 'Create + publish workflow: start -> fill_document -> send_document -> notify -> end'
$nodes = @(
  @{ id = 'n-start';  type = 'start';         position = @{ x = 0;   y = 0 }; data = @{} },
  @{ id = 'n-fill';   type = 'fill_document'; position = @{ x = 200; y = 0 }; data = @{} },
  @{ id = 'n-send';   type = 'send_document'; position = @{ x = 400; y = 0 }; data = @{
      to = '{{formData.f-email}}'; subject = 'Your {{_formName}} document'
      body = 'Hi {{formData.f-name}}, your completed document is attached.'
  } },
  @{ id = 'n-notify'; type = 'notify';        position = @{ x = 600; y = 0 }; data = @{
      title = 'New {{_formName}} submission'; body = 'Processed for {{formData.f-name}}.'
  } },
  @{ id = 'n-end';    type = 'end';           position = @{ x = 800; y = 0 }; data = @{} }
)
$edges = @(
  @{ id = 'e1'; source = 'n-start';  target = 'n-fill' },
  @{ id = 'e2'; source = 'n-fill';   target = 'n-send' },
  @{ id = 'e3'; source = 'n-send';   target = 'n-notify' },
  @{ id = 'e4'; source = 'n-notify'; target = 'n-end' }
)
$wf = Invoke-RestMethod -Method Post -Uri "$base/workflows" -Headers $h -ContentType 'application/json' -Body (@{
  name = "S7 Doc Flow $(Get-Date -Format HHmmss)"
  nodes = $nodes; edges = $edges; triggerFormId = $formId
} | ConvertTo-Json -Depth 8)
$wfId = $wf.data.id
$null = Invoke-RestMethod -Method Post -Uri "$base/workflows/$wfId/publish" -Headers $h
Write-Host "workflow=$wfId published"

Step 'Plan-tier gate: publishing an approval node on trial must 402'
$gateWf = Invoke-RestMethod -Method Post -Uri "$base/workflows" -Headers $h -ContentType 'application/json' -Body (@{
  name = "S7 Tier Gate $(Get-Date -Format HHmmss)"
  triggerFormId = $formId
  nodes = @(
    @{ id = 'g-start'; type = 'start';    position = @{ x = 0;   y = 0 }; data = @{} },
    @{ id = 'g-appr';  type = 'approval'; position = @{ x = 200; y = 0 }; data = @{} },
    @{ id = 'g-end';   type = 'end';      position = @{ x = 400; y = 0 }; data = @{} }
  )
  edges = @(
    @{ id = 'g1'; source = 'g-start'; target = 'g-appr' },
    @{ id = 'g2'; source = 'g-appr';  target = 'g-end' }
  )
} | ConvertTo-Json -Depth 8)
try {
  Invoke-RestMethod -Method Post -Uri "$base/workflows/$($gateWf.data.id)/publish" -Headers $h | Out-Null
  throw 'tier gate FAILED to block approval node on trial'
} catch {
  $resp = $_.ErrorDetails.Message | ConvertFrom-Json
  if ($resp.error.code -ne 'LIMIT_EXCEEDED') { throw "expected LIMIT_EXCEEDED, got: $($_.ErrorDetails.Message)" }
  Write-Host "tier gate OK: $($resp.error.code) upgradeUrl=$($resp.error.details.upgradeUrl)"
}

Step 'Meters before submission'
$before = Invoke-RestMethod -Uri "$base/billing/usage" -Headers $h
$wfBefore = ($before.data.meters | Where-Object { $_.meter -eq 'WORKFLOW_RUNS' }).used
$emBefore = ($before.data.meters | Where-Object { $_.meter -eq 'EMAILS' }).used
Write-Host "WORKFLOW_RUNS=$wfBefore EMAILS=$emBefore"

Step 'Public submission (the trigger)'
$sub = Invoke-RestMethod -Method Post -Uri "$base/public/forms/$slug/submissions" -ContentType 'application/json' -Body (@{
  values = @{
    'f-name' = 'Wanda Workflow'; 'f-email' = 'wanda@example.com'; 'f-phone' = '555-0107'
    'f-company' = 'Flow Corp'; 'f-street' = '7 Node Way'; 'f-city' = 'Graphville'
    'f-state' = 'IL'; 'f-zip' = '62705'; 'f-date' = '2026-08-07'; 'f-notes' = 'S7 smoke'
  }
} | ConvertTo-Json -Depth 4)
Write-Host "submission accepted: $($sub.success)"

Step 'Wait for the run to complete (BullMQ)'
$run = $null
foreach ($i in 1..20) {
  Start-Sleep -Seconds 1
  $runs = Invoke-RestMethod -Uri "$base/workflows/$wfId/runs" -Headers $h
  $run = $runs.data.runs | Select-Object -First 1
  if ($run -and $run.status -in @('COMPLETED', 'FAILED')) { break }
}
if (-not $run) { throw 'no run appeared' }
Write-Host "run=$($run.id) status=$($run.status) version=$($run.workflowVersion)"
if ($run.status -ne 'COMPLETED') { throw "run did not complete: $($run | ConvertTo-Json -Depth 5)" }

Step 'Run step ledger'
$detail = Invoke-RestMethod -Uri "$base/workflows/runs/$($run.id)" -Headers $h
foreach ($s in $detail.data.steps) {
  Write-Host ("  {0,-14} {1,-10} {2}ms {3}" -f $s.nodeType, $s.status, $s.durationMs, $s.error)
}
$sendStep = $detail.data.steps | Where-Object { $_.nodeType -eq 'send_document' }
if ($sendStep.status -ne 'COMPLETED') { throw 'send_document step did not complete' }

Step 'Meters after run'
$after = Invoke-RestMethod -Uri "$base/billing/usage" -Headers $h
$wfAfter = ($after.data.meters | Where-Object { $_.meter -eq 'WORKFLOW_RUNS' }).used
$emAfter = ($after.data.meters | Where-Object { $_.meter -eq 'EMAILS' }).used
Write-Host "WORKFLOW_RUNS=$wfAfter (was $wfBefore) EMAILS=$emAfter (was $emBefore)"
if ($wfAfter -le $wfBefore) { throw 'WORKFLOW_RUNS did not increment' }
if ($emAfter -le $emBefore) { throw 'EMAILS did not increment' }

Write-Host "`nSPRINT 7 SMOKE: PASS" -ForegroundColor Green
