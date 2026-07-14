# Author: Robert Massey | Created: 2026-07-13 | Sprint 9 live smoke
# Verifies: public gallery browse, clone flow, notifications feed,
# admin console (PLATFORM_ADMIN in, customer OWNER 403), override CRUD.
# ASCII only - PowerShell 5.1 chokes on em-dashes in UTF-8 without BOM.

$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3101/api/v1'
$pass = 0
$fail = 0

function Step([string]$name, [scriptblock]$body) {
    try {
        & $body
        $script:pass++
        Write-Host "PASS  $name"
    } catch {
        $script:fail++
        Write-Host "FAIL  $name :: $($_.Exception.Message)"
    }
}

function Login([string]$email, [string]$password) {
    $res = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' `
        -Body (@{ email = $email; password = $password } | ConvertTo-Json)
    return $res.data.tokens.accessToken
}

# --- 1. Public gallery (no auth) ---
$gallery = $null
Step 'public gallery lists 25+ curated templates' {
    $script:gallery = Invoke-RestMethod -Uri "$base/library?pageSize=100"
    if ($script:gallery.data.total -lt 25) { throw "only $($script:gallery.data.total) templates" }
}

Step 'public template detail by slug returns full schema' {
    $slug = $script:gallery.data.templates[0].slug
    $detail = Invoke-RestMethod -Uri "$base/library/$slug"
    if (-not $detail.data.schema.fields) { throw 'no schema fields' }
}

# --- 2. Demo owner: clone + notifications + admin 403 ---
$ownerToken = Login 'owner@demo.attune-sb.local' 'DemoOwnerPass#2026'
$ownerHeaders = @{ Authorization = "Bearer $ownerToken" }

Step 'owner clones a template into a draft form' {
    $tplId = $script:gallery.data.templates[0].id
    $clone = Invoke-RestMethod -Method Post -Uri "$base/library/$tplId/clone" -Headers $ownerHeaders
    if (-not $clone.data.formId) { throw 'no formId returned' }
    $form = Invoke-RestMethod -Uri "$base/forms/$($clone.data.formId)" -Headers $ownerHeaders
    if ($form.data.status -ne 'DRAFT') { throw "clone status $($form.data.status), expected DRAFT" }
}

Step 'owner notifications feed responds' {
    $feed = Invoke-RestMethod -Uri "$base/notifications" -Headers $ownerHeaders
    if ($null -eq $feed.data.unreadCount) { throw 'no unreadCount in response' }
}

Step 'customer OWNER gets 403 from the admin console' {
    try {
        Invoke-RestMethod -Uri "$base/admin/orgs" -Headers $ownerHeaders | Out-Null
        throw 'expected 403 but request succeeded'
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw }
    }
}

Step 'owner publish-org-template hits the plan gate (402) on trial' {
    $forms = Invoke-RestMethod -Uri "$base/forms" -Headers $ownerHeaders
    $formId = $forms.data.forms[0].id
    try {
        Invoke-RestMethod -Method Post -Uri "$base/library/publish" -Headers $ownerHeaders `
            -ContentType 'application/json' -Body (@{
                formId = $formId; name = 'Smoke Tpl'; description = 'x'; category = 'intake'
            } | ConvertTo-Json) | Out-Null
        throw 'expected 402 but request succeeded'
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 402) { throw }
    }
}

# --- 3. Platform admin console ---
$adminToken = Login 'admin@attuneitus.com' 'AttunePlatform#2026'
$adminHeaders = @{ Authorization = "Bearer $adminToken" }
$demoOrgId = $null

Step 'admin lists organizations' {
    $orgs = Invoke-RestMethod -Uri "$base/admin/orgs" -Headers $adminHeaders
    if ($orgs.data.total -lt 1) { throw 'no orgs' }
    $script:demoOrgId = ($orgs.data.orgs | Where-Object { $_.slug -ne 'attune-platform' } | Select-Object -First 1).id
    if (-not $script:demoOrgId) { throw 'demo org not found' }
}

Step 'admin org detail includes usage, members, counts' {
    $detail = Invoke-RestMethod -Uri "$base/admin/orgs/$script:demoOrgId" -Headers $adminHeaders
    if (-not $detail.data.usage.meters) { throw 'no usage meters' }
    if ($detail.data.members.Count -lt 1) { throw 'no members' }
    if ($null -eq $detail.data.counts.submissions) { throw 'no counts' }
}

Step 'admin creates and deletes an entitlement override' {
    $ovr = Invoke-RestMethod -Method Post -Uri "$base/admin/orgs/$script:demoOrgId/overrides" `
        -Headers $adminHeaders -ContentType 'application/json' -Body (@{
            entitlement = 'submissionsPerMonth'; value = 999; reason = 'S9 smoke'
        } | ConvertTo-Json)
    if (-not $ovr.data.id) { throw 'no override id' }
    Invoke-RestMethod -Method Delete -Uri "$base/admin/orgs/$script:demoOrgId/overrides/$($ovr.data.id)" `
        -Headers $adminHeaders | Out-Null
    $detail = Invoke-RestMethod -Uri "$base/admin/orgs/$script:demoOrgId" -Headers $adminHeaders
    if (($detail.data.overrides | Where-Object { $_.reason -eq 'S9 smoke' }).Count -ne 0) {
        throw 'override still present after delete'
    }
}

Step 'admin toggles legal hold on and off' {
    Invoke-RestMethod -Method Post -Uri "$base/admin/orgs/$script:demoOrgId/legal-hold" `
        -Headers $adminHeaders -ContentType 'application/json' -Body '{"hold":true}' | Out-Null
    $detail = Invoke-RestMethod -Uri "$base/admin/orgs/$script:demoOrgId" -Headers $adminHeaders
    if (-not $detail.data.legalHold) { throw 'legal hold not set' }
    Invoke-RestMethod -Method Post -Uri "$base/admin/orgs/$script:demoOrgId/legal-hold" `
        -Headers $adminHeaders -ContentType 'application/json' -Body '{"hold":false}' | Out-Null
}

# --- 4. Web pages (SSR) ---
Step 'public /gallery page renders' {
    $page = Invoke-WebRequest -Uri 'http://localhost:3100/gallery' -UseBasicParsing
    if ($page.StatusCode -ne 200) { throw "status $($page.StatusCode)" }
}

Write-Host ''
if ($fail -eq 0) {
    Write-Host "SPRINT 9 SMOKE: PASS ($pass steps)"
} else {
    Write-Host "SPRINT 9 SMOKE: FAIL ($fail of $($pass + $fail) steps failed)"
    exit 1
}
