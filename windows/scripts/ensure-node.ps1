# Installs Node.js 18+ when it is missing, then allows it through the firewall
# so phones on the same network can reach BidBoard. Writes the Node folder
# path to -OutFile so the installer can add it to PATH.
param(
  [Parameter(Mandatory = $true)]
  [string]$OutFile
)

$ErrorActionPreference = 'Stop'
$Minimum = [version]'18.0.0'

function Get-NodeVersion {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $cmd) { return $null }
  $raw = & node -p "process.versions.node" 2>$null
  if (-not $raw) { return $null }
  return [version](($raw -split '-')[0])
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user"
}

function Find-NodeHome {
  $candidates = @(
    (Join-Path $env:ProgramFiles 'nodejs'),
    (Join-Path ${env:ProgramFiles(x86)} 'nodejs')
  )
  foreach ($dir in $candidates) {
    if ($dir -and (Test-Path (Join-Path $dir 'node.exe'))) { return $dir }
  }
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return (Split-Path -Parent $cmd.Source) }
  return $null
}

$existing = Get-NodeVersion
if ($existing -and $existing -ge $Minimum) {
  Write-Host "Node.js $existing is already installed."
} else {
  Write-Host "Installing Node.js..."
  $installed = $false
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if ($winget) {
    & winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --disable-interactivity | Out-Host
    # 0 = installed. -1978335189 = no newer package (already present).
    if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq -1978335189) { $installed = $true }
  }

  if (-not $installed) {
    Write-Host "Downloading Node.js..."
    $index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json'
    $lts = $index | Where-Object { $_.lts -and $_.version } | Select-Object -First 1
    if (-not $lts) { throw 'Could not find a Node.js release to download.' }
    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
    $version = $lts.version
    $msi = Join-Path $env:TEMP "bidboard-node-$version-$arch.msi"
    $url = "https://nodejs.org/dist/$version/node-$version-$arch.msi"
    Invoke-WebRequest -Uri $url -OutFile $msi
    $proc = Start-Process -FilePath msiexec.exe -ArgumentList @('/i', $msi, '/qn', '/norestart') -Wait -PassThru
    if ($proc.ExitCode -ne 0) { throw "Node.js installer exited with code $($proc.ExitCode)." }
  }

  Refresh-Path
  $after = Get-NodeVersion
  if (-not $after -or $after -lt $Minimum) {
    throw 'Node.js was installed, but this window cannot see it yet. Close this window and run the installer again.'
  }
  Write-Host "Node.js $after is installed."
}

$nodeHome = Find-NodeHome
if (-not $nodeHome) { throw 'Node.js is installed, but node.exe could not be found.' }

$nodeExe = Join-Path $nodeHome 'node.exe'
Write-Host "Allowing BidBoard through the Windows firewall..."
& netsh advfirewall firewall delete rule name="BidBoard" | Out-Host
& netsh advfirewall firewall add rule name="BidBoard" dir=in action=allow program="$nodeExe" enable=yes profile=any | Out-Host

Set-Content -Path $OutFile -Value $nodeHome -Encoding ascii
