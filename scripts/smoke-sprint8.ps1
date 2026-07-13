# Author: Robert Massey | Created: 2026-07-13 | Module: Scripts
# Sprint 8 acceptance smoke:
#   1. tier gate - publishing an approval workflow on trial 402s
#   2. approval flow - with a workflowNodeTier=growth override, the same
#      workflow publishes; a public submission pauses at the approval node;
#      the public token endpoint approves it; the run resumes down the
#      Approved branch and completes
#   3. webhook SSRF - a workflow step pointed at 169.254.169.254 is refused
#      (run routes down the failure edge)
# Uses prisma db execute for the override + a known-hash ApprovalToken (the
# real token is only ever emailed; unit tests cover adapter token creation).
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3101/api/v1'
$schema = 'api/prisma/schema.prisma'

function Step($msg) { Write-Host "== $msg" -ForegroundColor Cyan }
function Sql($sql) { $sql | npx prisma db execute --stdin --schema $schema | Out-Null }

Step 'Login as demo owner'
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{
  email = 'owner@demo.attune-sb.local'; password = 'DemoOwnerPass#2026'
} | ConvertTo-Json)
$token = $login.data.tokens.accessToken
$h = @{ Authorization = "Bearer $token" }
$orgId = $login.data.user.organizationId
if (-not $orgId) { $orgId = (Invoke-RestMethod -Uri "$base/organizations/me" -Headers $h).data.id }
Write-Host "org=$orgId"

Step 'Clean up artifacts from previous smoke runs'
Sql "DELETE FROM entitlement_overrides WHERE organization_id = '$orgId' AND reason LIKE 'S8 smoke%';"
$oldWf = Invoke-RestMethod -Uri "$base/workflows?pageSize=50" -Headers $h
foreach ($w in @($oldWf.data.workflows)) {
  if ($w.name -like 'S7 *' -or $w.name -like 'S8 *') {
    Invoke-RestMethod -Method Delete -Uri "$base/workflows/$($w.id)" -Headers $h | Out-Null
    Write-Host "deleted old workflow $($w.id)"
  }
}
$oldForms = Invoke-RestMethod -Uri "$base/forms?pageSize=50" -Headers $h
foreach ($f in $oldForms.data.forms) {
  if ($f.name -like 'S7 Smoke*' -or $f.name -like 'S8 Smoke*') {
    Invoke-RestMethod -Method Delete -Uri "$base/forms/$($f.id)" -Headers $h | Out-Null
    Write-Host "deleted old form $($f.id)"
  } elseif ($f.name -like 'Smoke Form*' -and $f.status -eq 'PUBLISHED') {
    Invoke-RestMethod -Method Post -Uri "$base/forms/$($f.id)/unpublish" -Headers $h | Out-Null
  }
}

Step 'Create + publish the trigger form'
$fields = @(
  @{ id = 'f-name';     type = 'text';  label = 'Full Name';     page = 1 },
  @{ id = 'f-email';    type = 'email'; label = 'Email Address'; page = 1 },
  @{ id = 'f-priority'; type = 'text';  label = 'Priority';      page = 1 }
)
$form = Invoke-RestMethod -Method Post -Uri "$base/forms" -Headers $h -ContentType 'application/json' -Body (@{
  name = "S8 Smoke $(Get-Date -Format HHmmss)"
  schema = @{ fields = $fields; pages = @() }
} | ConvertTo-Json -Depth 8)
$formId = $form.data.id
$pub = Invoke-RestMethod -Method Post -Uri "$base/forms/$formId/publish" -Headers $h
$slug = $pub.data.slug
if (-not $slug) { $slug = (Invoke-RestMethod -Uri "$base/forms/$formId" -Headers $h).data.slug }
Write-Host "form=$formId slug=$slug"

Step 'Create the approval workflow (start -> approval -> Approved: notify -> end / Rejected: end)'
$nodes = @(
  @{ id = 'n-start';  type = 'start';    position = @{ x = 0;   y = 0 };   data = @{} },
  @{ id = 'n-appr';   type = 'approval'; position = @{ x = 200; y = 0 };   data = @{
      to = 'approver@demo.attune-sb.local'; message = 'Sign off for {{f-name}} ({{f-priority}})' } },
  @{ id = 'n-notify'; type = 'notify';   position = @{ x = 400; y = -80 }; data = @{
      message = 'Approved: {{f-name}}' } },
  @{ id = 'n-end';    type = 'end';      position = @{ x = 600; y = 0 };   data = @{} }
)
$edges = @(
  @{ id = 'e1'; source = 'n-start';  target = 'n-appr' },
  @{ id = 'e2'; source = 'n-appr';   target = 'n-notify'; label = 'Approved' },
  @{ id = 'e3'; source = 'n-appr';   target = 'n-end';    label = 'Rejected' },
  @{ id = 'e4'; source = 'n-notify'; target = 'n-end' }
)
$wf = Invoke-RestMethod -Method Post -Uri "$base/workflows" -Headers $h -ContentType 'application/json' -Body (@{
  name = "S8 Approval Flow $(Get-Date -Format HHmmss)"
  nodes = $nodes; edges = $edges; triggerFormId = $formId
} | ConvertTo-Json -Depth 8)
$wfId = $wf.data.id
Write-Host "workflow=$wfId"

Step 'Tier gate: publish on trial must 402 (approval is a Growth node)'
try {
  Invoke-RestMethod -Method Post -Uri "$base/workflows/$wfId/publish" -Headers $h | Out-Null
  throw 'tier gate FAILED to block approval node on trial'
} catch {
  $resp = $_.ErrorDetails.Message | ConvertFrom-Json
  if ($resp.error.code -ne 'LIMIT_EXCEEDED') { throw "expected LIMIT_EXCEEDED, got: $($_.ErrorDetails.Message)" }
  Write-Host "tier gate OK: $($resp.error.code) upgradeUrl=$($resp.error.details.upgradeUrl)"
}

Step 'Grant workflowNodeTier=growth override, wait out the 60s plan cache'
Sql @"
INSERT INTO entitlement_overrides (id, organization_id, entitlement, value, reason, created_at, updated_at)
VALUES (gen_random_uuid(), '$orgId', 'workflowNodeTier', '"growth"', 'S8 smoke: approval flow test', now(), now());
"@
Start-Sleep -Seconds 65

Step 'Publish now succeeds at growth tier'
$null = Invoke-RestMethod -Method Post -Uri "$base/workflows/$wfId/publish" -Headers $h
Write-Host 'published'

Step 'Public submission (the trigger)'
$null = Invoke-RestMethod -Method Post -Uri "$base/public/forms/$slug/submissions" -ContentType 'application/json' -Body (@{
  values = @{ 'f-name' = 'Alex Approver'; 'f-email' = 'alex@example.com'; 'f-priority' = 'Urgent' }
} | ConvertTo-Json -Depth 4)

Step 'Run must pause at the approval node'
$run = $null
foreach ($i in 1..20) {
  Start-Sleep -Seconds 1
  $runs = Invoke-RestMethod -Uri "$base/workflows/$wfId/runs" -Headers $h
  $run = $runs.data.runs | Select-Object -First 1
  if ($run -and $run.status -in @('PAUSED', 'COMPLETED', 'FAILED')) { break }
}
if (-not $run) { throw 'no run appeared' }
Write-Host "run=$($run.id) status=$($run.status)"
if ($run.status -ne 'PAUSED') { throw "expected PAUSED, got $($run.status)" }

Step 'Decide via the public token endpoint'
# The real token was emailed (stub logs it); for automation, plant a second
# token with a known hash on the same paused node - same code path.
$raw = -join ((1..64) | ForEach-Object { '0123456789abcdef'[(Get-Random -Maximum 16)] })
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = ([System.BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($raw)))).Replace('-', '').ToLower()
Sql @"
INSERT INTO approval_tokens (id, token_hash, run_id, node_id, organization_id, assigned_to, message, expires_at, created_at)
VALUES (gen_random_uuid(), '$hash', '$($run.id)', 'n-appr', '$orgId', 'approver@demo.attune-sb.local', 'S8 smoke', now() + interval '7 days', now());
"@

$view = Invoke-RestMethod -Uri "$base/public/approvals/$raw"
Write-Host "landing view OK: workflow='$($view.data.workflowName)' assignedTo=$($view.data.assignedTo)"

$null = Invoke-RestMethod -Method Post -Uri "$base/public/approvals/$raw/decide" -ContentType 'application/json' -Body (@{
  decision = 'approved'; note = 'LGTM (S8 smoke)'
} | ConvertTo-Json)
Write-Host 'decision recorded: approved'

Step 'Second decision on the same token must 410'
try {
  Invoke-RestMethod -Method Post -Uri "$base/public/approvals/$raw/decide" -ContentType 'application/json' -Body (@{
    decision = 'rejected'
  } | ConvertTo-Json) | Out-Null
  throw 'single-use FAILED: second decision was accepted'
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 410) { throw "expected 410, got: $($_.Exception.Message)" }
  Write-Host 'single-use OK (410 Gone)'
}

Step 'Run resumes down the Approved branch and completes'
foreach ($i in 1..20) {
  Start-Sleep -Seconds 1
  $run = (Invoke-RestMethod -Uri "$base/workflows/runs/$($run.id)" -Headers $h).data
  if ($run.status -in @('COMPLETED', 'FAILED')) { break }
}
if ($run.status -ne 'COMPLETED') { throw "run did not complete: status=$($run.status) error=$($run.error)" }
foreach ($s in $run.steps) {
  Write-Host ("  {0,-10} {1,-10} {2}" -f $s.nodeType, $s.status, $s.error)
}
if (-not ($run.steps | Where-Object { $_.nodeType -eq 'approval' -and $_.status -eq 'COMPLETED' })) { throw 'approval step missing from ledger' }
if (-not ($run.steps | Where-Object { $_.nodeType -eq 'notify' -and $_.status -eq 'COMPLETED' })) { throw 'Approved branch (notify) did not run' }

Step 'Webhook SSRF: metadata endpoint is refused, run takes the failure edge'
$ssrfWf = Invoke-RestMethod -Method Post -Uri "$base/workflows" -Headers $h -ContentType 'application/json' -Body (@{
  name = "S8 SSRF $(Get-Date -Format HHmmss)"
  triggerFormId = $formId
  nodes = @(
    @{ id = 's-start'; type = 'start';   position = @{ x = 0;   y = 0 };  data = @{} },
    @{ id = 's-hook';  type = 'webhook'; position = @{ x = 200; y = 0 };  data = @{ url = 'http://169.254.169.254/latest/meta-data/' } },
    @{ id = 's-note';  type = 'notify';  position = @{ x = 400; y = 80 }; data = @{ message = 'webhook failed as expected' } },
    @{ id = 's-end';   type = 'end';     position = @{ x = 600; y = 0 };  data = @{} }
  )
  edges = @(
    @{ id = 's1'; source = 's-start'; target = 's-hook' },
    @{ id = 's2'; source = 's-hook';  target = 's-end' },
    @{ id = 's3'; source = 's-hook';  target = 's-note'; label = 'failure' },
    @{ id = 's4'; source = 's-note';  target = 's-end' }
  )
} | ConvertTo-Json -Depth 8)
$ssrfWfId = $ssrfWf.data.id
$null = Invoke-RestMethod -Method Post -Uri "$base/workflows/$ssrfWfId/publish" -Headers $h
# Unpublish the approval workflow so only the SSRF one triggers cleanly
$null = Invoke-RestMethod -Method Post -Uri "$base/workflows/$wfId/unpublish" -Headers $h
$null = Invoke-RestMethod -Method Post -Uri "$base/public/forms/$slug/submissions" -ContentType 'application/json' -Body (@{
  values = @{ 'f-name' = 'Sam SSRF'; 'f-email' = 'sam@example.com'; 'f-priority' = 'Low' }
} | ConvertTo-Json -Depth 4)
$ssrfRun = $null
foreach ($i in 1..20) {
  Start-Sleep -Seconds 1
  $runs = Invoke-RestMethod -Uri "$base/workflows/$ssrfWfId/runs" -Headers $h
  $ssrfRun = $runs.data.runs | Select-Object -First 1
  if ($ssrfRun -and $ssrfRun.status -in @('COMPLETED', 'FAILED')) { break }
}
$ssrfDetail = (Invoke-RestMethod -Uri "$base/workflows/runs/$($ssrfRun.id)" -Headers $h).data
$hookStep = $ssrfDetail.steps | Where-Object { $_.nodeType -eq 'webhook' }
Write-Host "webhook step: $($hookStep.status) - $($hookStep.error)"
if ($hookStep.status -ne 'FAILED') { throw 'SSRF guard did not fail the webhook step' }
if ($hookStep.error -notmatch 'private|reserved|not allowed') { throw "unexpected webhook error: $($hookStep.error)" }
if ($ssrfDetail.status -ne 'COMPLETED') { throw 'failure edge did not route the run to completion' }
Write-Host 'SSRF guard OK, failure edge OK'

Step 'Remove the smoke override (org back to trial tier)'
Sql "DELETE FROM entitlement_overrides WHERE organization_id = '$orgId' AND reason LIKE 'S8 smoke%';"

Write-Host "`nSPRINT 8 SMOKE: PASS" -ForegroundColor Green
