param(
    [Parameter(Mandatory = $true)][string]$Server,
    [string]$Key = (Join-Path $HOME ".ssh\mibers_vps"),
    [string]$User = "root",
    [string]$Domain = "mibersduoanam.my.id",
    [string]$Email,
    [switch]$FirstTime,
    [switch]$WithData,
    [string]$PgDump = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$target = "$User@$Server"
$sshOpts = @("-i", $Key, "-o", "StrictHostKeyChecking=accept-new")

if ($FirstTime -and -not $Email) { throw "Pakai -Email untuk pendaftaran sertifikat HTTPS." }

if (-not (Test-Path $Key)) {
    Write-Host "Membuat SSH key baru di $Key ..."
    New-Item -ItemType Directory -Force (Split-Path -Parent $Key) | Out-Null
    & ssh-keygen -t ed25519 -N '""' -C "mibers-deploy" -f $Key
    if ($LASTEXITCODE -ne 0) { throw "Gagal membuat SSH key." }
}

$ErrorActionPreference = "Continue"
& ssh -i $Key -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 $target "true" 2>$null
$keyWorks = $LASTEXITCODE -eq 0
$ErrorActionPreference = "Stop"
if (-not $keyWorks) {
    Write-Host "Memasang SSH key ke server. Masukkan password VPS sekali saja:"
    $pub = (Get-Content "$Key.pub" -Raw).Trim()
    $install = "umask 077; mkdir -p ~/.ssh; touch ~/.ssh/authorized_keys; grep -qxF '$pub' ~/.ssh/authorized_keys || echo '$pub' >> ~/.ssh/authorized_keys"
    & ssh -o StrictHostKeyChecking=accept-new $target $install
    if ($LASTEXITCODE -ne 0) { throw "Gagal login ke server. Periksa IP, user, dan password VPS." }
}
if ($FirstTime -and -not (Test-Path "$root\.env")) { throw "File .env tidak ditemukan di $root" }

$archive = Join-Path $env:TEMP "mibers-release.tar.gz"
if (Test-Path $archive) { Remove-Item $archive -Force }

Write-Host "Membungkus kode..."
Push-Location $root
try {
    & "$env:SystemRoot\System32\tar.exe" -czf $archive `
        --exclude=./node_modules --exclude=./.next --exclude=./storage --exclude=./.git `
        --exclude=./src/generated --exclude=./.env --exclude=./.env.* `
        --exclude=./.claude --exclude=./.agents --exclude=./.windsurf --exclude=./deploy `
        .
    if ($LASTEXITCODE -ne 0) { throw "Gagal membuat arsip." }
} finally {
    Pop-Location
}
Write-Host ("Ukuran arsip: {0:N1} MB" -f ((Get-Item $archive).Length / 1MB))

& ssh @sshOpts $target "mkdir -p ~/mibers-deploy"
if ($LASTEXITCODE -ne 0) { throw "Tidak bisa terhubung ke server lewat SSH." }

$files = @($archive, "$PSScriptRoot\update.sh")
if ($FirstTime) {
    $files += @("$PSScriptRoot\setup-server.sh", "$PSScriptRoot\nginx.conf", "$PSScriptRoot\nginx-locations.conf", "$PSScriptRoot\nginx-brotli.conf", "$PSScriptRoot\mibers.service")
}
Write-Host "Mengunggah ke server..."
& scp @sshOpts @files "${target}:~/mibers-deploy/"
if ($LASTEXITCODE -ne 0) { throw "Gagal mengunggah file." }

if ($FirstTime) {
    & scp @sshOpts "$root\.env" "${target}:~/mibers-deploy/env.local"
    if ($LASTEXITCODE -ne 0) { throw "Gagal mengunggah .env." }
}

$dump = Join-Path $env:TEMP "mibers-data.dump"
$uploads = Join-Path $env:TEMP "mibers-uploads.tar.gz"
if ($WithData) {
    if (-not (Test-Path $PgDump)) { throw "pg_dump tidak ditemukan di $PgDump. Pakai -PgDump <path>." }
    $line = (Select-String -Path "$root\.env" -Pattern '^\s*DATABASE_URL\s*=' | Select-Object -First 1).Line
    if (-not $line) { throw "DATABASE_URL tidak ada di .env" }
    $dbUrl = ($line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"').Trim("'") -replace '\?.*$', ''

    Write-Host "Membackup database laptop..."
    & $PgDump --format=custom --no-owner --no-acl --file=$dump --dbname=$dbUrl
    if ($LASTEXITCODE -ne 0) { throw "Gagal membackup database laptop." }

    & scp @sshOpts $dump "${target}:~/mibers-deploy/data.dump"
    if ($LASTEXITCODE -ne 0) { throw "Gagal mengunggah backup database." }

    if (Test-Path "$root\storage\uploads") {
        Write-Host "Membungkus file unggahan..."
        & "$env:SystemRoot\System32\tar.exe" -czf $uploads -C "$root\storage" uploads
        if ($LASTEXITCODE -ne 0) { throw "Gagal membungkus file unggahan." }
        & scp @sshOpts $uploads "${target}:~/mibers-deploy/uploads.tar.gz"
        if ($LASTEXITCODE -ne 0) { throw "Gagal mengunggah file unggahan." }
    }
}

$remote = @(
    "set -e",
    "cd ~/mibers-deploy",
    "sed -i 's/\r$//' *.sh",
    $(if ($FirstTime) { "sudo bash setup-server.sh '$Domain' '$Email'" } else { "true" }),
    "sudo mkdir -p /opt/mibers/incoming",
    "sudo mv mibers-release.tar.gz /opt/mibers/incoming/release.tar.gz",
    "if [ -f env.local ]; then sudo mv env.local /opt/mibers/incoming/env.local; fi",
    "if [ -f data.dump ]; then sudo mv data.dump /opt/mibers/incoming/data.dump; fi",
    "if [ -f uploads.tar.gz ]; then sudo mv uploads.tar.gz /opt/mibers/incoming/uploads.tar.gz; fi",
    "sudo bash update.sh"
) -join " && "

Write-Host "Menjalankan instalasi di server (bisa makan 5-15 menit)..."
& ssh @sshOpts $target $remote
if ($LASTEXITCODE -ne 0) { throw "Deploy gagal. Lihat pesan di atas." }

Remove-Item $archive -Force
if (Test-Path $dump) { Remove-Item $dump -Force }
if (Test-Path $uploads) { Remove-Item $uploads -Force }
Write-Host "Selesai: https://$Domain"
