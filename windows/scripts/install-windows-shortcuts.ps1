$windows = Split-Path -Parent $PSScriptRoot
$root = Split-Path -Parent $windows
$target = Join-Path $windows 'Start BidBoard.bat'
$shell = New-Object -ComObject WScript.Shell
$dirs = @(
  [Environment]::GetFolderPath('Desktop'),
  (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs')
)
foreach ($dir in $dirs) {
  $link = $shell.CreateShortcut((Join-Path $dir 'BidBoard.lnk'))
  $link.TargetPath = $target
  $link.WorkingDirectory = $root
  $link.WindowStyle = 1
  $link.Description = 'Start BidBoard'
  $icon = Join-Path $root 'src\assets\bidboard.ico'
  if (Test-Path $icon) { $link.IconLocation = "$icon,0" }
  $link.Save()
}
