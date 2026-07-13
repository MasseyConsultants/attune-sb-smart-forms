# Author: Robert Massey | Created: 2026-07-13 | Module: Scripts
# Sprint 6 acceptance smoke: auto-map -> publish -> public submission -> filled PDF.
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
$existing = Invoke-RestMethod -Uri "$base/document-templates" -Headers $h
foreach ($t in @($existing.data)) {
  if ($t.name -eq 'S6 Fixture') {
    Invoke-RestMethod -Method Delete -Uri "$base/document-templates/$($t.id)" -Headers $h | Out-Null
    Write-Host "deleted old template $($t.id)"
  }
}
$oldForms = Invoke-RestMethod -Uri "$base/forms?pageSize=50" -Headers $h
foreach ($f in $oldForms.data.forms) {
  if ($f.name -like 'S6 Smoke*') {
    Invoke-RestMethod -Method Delete -Uri "$base/forms/$($f.id)" -Headers $h | Out-Null
    Write-Host "deleted old form $($f.id)"
  } elseif ($f.name -like 'Smoke Form*' -and $f.status -eq 'PUBLISHED') {
    # Earlier sprint smoke leftovers consume the trial's activeForms cap (2)
    Invoke-RestMethod -Method Post -Uri "$base/forms/$($f.id)/unpublish" -Headers $h | Out-Null
    Write-Host "unpublished old smoke form $($f.id)"
  }
}

Step 'Create form with fields matching the fixture PDF'
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
  name = "S6 Smoke $(Get-Date -Format HHmmss)"
  schema = @{ fields = $fields; pages = @() }
} | ConvertTo-Json -Depth 8)
$formId = $form.data.id
Write-Host "form=$formId"

Step 'Upload fixture PDF as template linked to form'
$upload = curl.exe -s -X POST "$base/document-templates" -H "Authorization: Bearer $token" `
  -F "file=@api/storage/_fixture-intake.pdf;type=application/pdf" -F "name=S6 Fixture" -F "formId=$formId" | ConvertFrom-Json
if (-not $upload.success) { throw "upload failed: $($upload | ConvertTo-Json -Depth 5)" }
$templateId = $upload.data.id
Write-Host "template=$templateId status=$($upload.data.status)"

Step 'Auto-map suggestions'
$suggest = Invoke-RestMethod -Method Post -Uri "$base/document-templates/$templateId/suggest-mappings" -Headers $h
$stats = $suggest.data.stats
Write-Host ("stats: totalFields={0} autoAccepted={1} needsReview={2} dropped={3} scannedPdf={4}" -f `
  $stats.totalFields, $stats.autoAccepted, $stats.needsReview, $stats.dropped, $suggest.data.scannedPdf)
$suggested = $stats.autoAccepted + $stats.needsReview
$pct = [math]::Round(100 * $suggested / $stats.totalFields)
Write-Host "suggested coverage: $pct%"
if ($pct -lt 70) { throw "coverage below 70% acceptance bar" }

Step 'Accept all candidates as mappings'
$mappings = @($suggest.data.candidates | ForEach-Object {
  @{
    fieldId = $_.fieldId; fieldLabel = $_.fieldLabel; page = $_.page
    x = $_.x; y = $_.y; width = $_.width; height = $_.height; renderMode = 'value'
  }
})
$null = Invoke-RestMethod -Method Put -Uri "$base/document-templates/$templateId/mappings" -Headers $h -ContentType 'application/json' -Body (@{
  mappings = $mappings
} | ConvertTo-Json -Depth 6)
Write-Host "saved $($mappings.Count) mappings"

Step 'Publish form'
$pub = Invoke-RestMethod -Method Post -Uri "$base/forms/$formId/publish" -Headers $h
$slug = $pub.data.slug
if (-not $slug) { $slug = (Invoke-RestMethod -Uri "$base/forms/$formId" -Headers $h).data.slug }
Write-Host "slug=$slug"

Step 'Public submission'
$sub = Invoke-RestMethod -Method Post -Uri "$base/public/forms/$slug/submissions" -ContentType 'application/json' -Body (@{
  values = @{
    'f-name' = 'Jane Q. Tester'; 'f-email' = 'jane@example.com'; 'f-phone' = '555-0100'
    'f-company' = 'Acme LLC'; 'f-street' = '123 Main St'; 'f-city' = 'Springfield'
    'f-state' = 'IL'; 'f-zip' = '62704'; 'f-date' = '2026-08-01'; 'f-notes' = 'Smoke test run'
  }
} | ConvertTo-Json -Depth 4)
Write-Host "submission accepted: $($sub.success)"

Step 'Verify filled document + download'
Start-Sleep -Seconds 2
$list = Invoke-RestMethod -Uri "$base/forms/$formId/submissions" -Headers $h
$row = $list.data.submissions[0]
Write-Host "hasFilledDocument=$($row.hasFilledDocument) id=$($row.id)"
if (-not $row.hasFilledDocument) { throw 'filled document missing' }
curl.exe -s -o "api/storage/_s6-filled.pdf" -H "Authorization: Bearer $token" "$base/submissions/$($row.id)/document"
$size = (Get-Item 'api/storage/_s6-filled.pdf').Length
Write-Host "downloaded filled PDF: $size bytes"

Step 'Check DOC_FILLS + STORAGE_BYTES usage'
$usage = Invoke-RestMethod -Uri "$base/billing/usage" -Headers $h
$usage.data.meters | Where-Object { $_.meter -in @('DOC_FILLS','STORAGE_BYTES','SUBMISSIONS') } | ForEach-Object {
  Write-Host ("{0}: {1} / {2}" -f $_.meter, $_.used, $_.limit)
}

Write-Host "`nSPRINT 6 SMOKE: PASS" -ForegroundColor Green
