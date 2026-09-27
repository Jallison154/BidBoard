# BidBoard taskbar icon. Hover shows the IP address. Right-click: Open, Settings, Exit.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$log = Join-Path $env:TEMP 'bidboard-tray.log'
$global:BidBoardPort = 3001
if ($env:PORT) { $global:BidBoardPort = [int]$env:PORT }

function Write-Log($message) {
  Add-Content -Path $log -Value ("{0} {1}" -f (Get-Date -Format 's'), $message)
}

function global:Get-BidBoardTip {
  $addresses = New-Object System.Collections.Generic.List[string]
  $virtualPattern = 'virtual|vmware|vbox|docker|veth|loopback|hyper-v'
  $nics = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()
  foreach ($nic in $nics) {
    if ($nic.OperationalStatus -ne 'Up') { continue }
    $looksVirtual = $nic.Name -match $virtualPattern -or $nic.Description -match $virtualPattern
    foreach ($addr in $nic.GetIPProperties().UnicastAddresses) {
      if ($addr.Address.AddressFamily -ne 'InterNetwork') { continue }
      $text = $addr.Address.ToString()
      if ($text -eq '127.0.0.1') { continue }
      $shown = "${text}:$($global:BidBoardPort)"
      if ($looksVirtual) { $addresses.Add($shown) } else { $addresses.Insert(0, $shown) }
    }
  }
  if ($addresses.Count -eq 0) { return 'BidBoard: no IP address' }
  $tip = 'BidBoard ' + ($addresses -join ', ')
  if ($tip.Length -gt 63) { return $tip.Substring(0, 63) }
  return $tip
}

function global:Open-BidBoardPage([string]$path) {
  Start-Process ("http://127.0.0.1:{0}{1}" -f $global:BidBoardPort, $path)
}

function global:Stop-BidBoard {
  $global:BidBoardNotify.Visible = $false
  $server = $global:BidBoardServer
  if ($server -and -not $server.HasExited) {
    & taskkill.exe /PID $server.Id /T /F | Out-Null
  }
  [System.Windows.Forms.Application]::Exit()
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$tsx = Join-Path $root 'node_modules\tsx\dist\cli.mjs'
$entry = Join-Path $root 'server\index.ts'
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd -or -not (Test-Path $tsx)) {
  Write-Log 'Node.js or BidBoard is not installed.'
  [System.Windows.Forms.MessageBox]::Show('Run Install BidBoard.bat first.', 'BidBoard') | Out-Null
  exit 1
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $nodeCmd.Source
$psi.Arguments = "`"$tsx`" `"$entry`""
$psi.WorkingDirectory = $root
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.EnvironmentVariables['BIDBOARD_OPEN'] = '1'
$psi.EnvironmentVariables['PORT'] = "$($global:BidBoardPort)"
$global:BidBoardServer = [System.Diagnostics.Process]::Start($psi)
Write-Log "Server started. PID $($global:BidBoardServer.Id)"

$iconPath = Join-Path $root 'src\assets\bidboard.ico'
$global:BidBoardNotify = New-Object System.Windows.Forms.NotifyIcon
$global:BidBoardNotify.Icon = New-Object System.Drawing.Icon($iconPath)
$global:BidBoardNotify.Visible = $true
$global:BidBoardNotify.Text = Get-BidBoardTip

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$openItem = New-Object System.Windows.Forms.ToolStripMenuItem 'Open'
$settingsItem = New-Object System.Windows.Forms.ToolStripMenuItem 'Settings'
$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem 'Exit'
$openItem.Add_Click({ Open-BidBoardPage '/' })
$settingsItem.Add_Click({ Open-BidBoardPage '/?settings=1' })
$exitItem.Add_Click({ Stop-BidBoard })
[void]$menu.Items.Add($openItem)
[void]$menu.Items.Add($settingsItem)
[void]$menu.Items.Add($exitItem)
$global:BidBoardNotify.ContextMenuStrip = $menu
$global:BidBoardNotify.Add_MouseClick({
  param($sender, $eventArgs)
  if ($eventArgs.Button -eq [System.Windows.Forms.MouseButtons]::Left) { Open-BidBoardPage '/' }
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.Add_Tick({ $global:BidBoardNotify.Text = Get-BidBoardTip })
$timer.Start()

[System.Windows.Forms.Application]::Run()
$global:BidBoardNotify.Visible = $false
$global:BidBoardNotify.Dispose()
if ($global:BidBoardServer -and -not $global:BidBoardServer.HasExited) {
  & taskkill.exe /PID $global:BidBoardServer.Id /T /F | Out-Null
}
