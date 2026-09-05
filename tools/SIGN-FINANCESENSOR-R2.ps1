param(
  [Parameter(Mandatory = $true)][string]$InputApk,
  [Parameter(Mandatory = $true)][string]$ApkSignerJar,
  [string]$OutputApk = 'FinanceSensor-R2-STABLE.apk'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ExpectedSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'

function Convert-SecureStringToPlain([Security.SecureString]$Secure) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Normalize-Sha1([string]$Value) {
  $hex = ($Value -replace '[^0-9A-Fa-f]', '').ToUpperInvariant()
  if ($hex.Length -ne 40) { return '' }
  return (($hex -split '(.{2})' | Where-Object { $_ }) -join ':')
}

function Choose-Keystore {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = 'Selecciona el keystore privado FINANCESENSOR_R2_LAB'
    $dialog.Filter = 'Java keystore (*.jks;*.keystore)|*.jks;*.keystore|Todos los archivos (*.*)|*.*'
    $dialog.Multiselect = $false
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { return $dialog.FileName }
  } catch { }
  return (Read-Host 'Ruta completa del keystore privado FINANCESENSOR_R2_LAB').Trim('"')
}

$java = Get-Command java -ErrorAction SilentlyContinue
$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $java) { throw 'Java no está disponible en PATH.' }
if (-not $keytool) { throw 'keytool no está disponible en PATH.' }
if (-not (Test-Path -LiteralPath $InputApk)) { throw "APK de entrada no encontrado: $InputApk" }
if (-not (Test-Path -LiteralPath $ApkSignerJar)) { throw "apksigner.jar no encontrado: $ApkSignerJar" }

$Keystore = Choose-Keystore
if ([string]::IsNullOrWhiteSpace($Keystore) -or -not (Test-Path -LiteralPath $Keystore)) { throw 'Keystore no seleccionado o no encontrado.' }

$StoreSecure = Read-Host 'Contraseña del keystore (permanece solo en esta sesión local)' -AsSecureString
$StorePass = Convert-SecureStringToPlain $StoreSecure
$env:FINANCESENSOR_R2_STORE_PASS = $StorePass
$env:FINANCESENSOR_R2_KEY_PASS = $StorePass

try {
  $listing = & $keytool.Source '-J-Duser.language=en' '-J-Duser.country=US' -list -v -keystore $Keystore -storepass:env FINANCESENSOR_R2_STORE_PASS 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo abrir el keystore con la contraseña indicada.' }

  $Alias = $null
  $CurrentAlias = $null
  foreach ($line in $listing) {
    $text = [string]$line
    if ($text -match '^Alias name:\s*(.+)$') { $CurrentAlias = $Matches[1].Trim(); continue }
    if ($CurrentAlias -and $text -match '^\s*SHA1:\s*([0-9A-Fa-f:]+)\s*$') {
      if ((Normalize-Sha1 $Matches[1]) -eq $ExpectedSha1) { $Alias = $CurrentAlias; break }
    }
  }
  if (-not $Alias) { throw "El keystore no contiene la identidad estable R2 esperada ($ExpectedSha1). No se firmó nada." }

  if (Test-Path -LiteralPath $OutputApk) { Remove-Item -LiteralPath $OutputApk -Force }
  & $java.Source -jar $ApkSignerJar sign --ks $Keystore --ks-key-alias $Alias --ks-pass env:FINANCESENSOR_R2_STORE_PASS --key-pass env:FINANCESENSOR_R2_KEY_PASS --out $OutputApk $InputApk
  if ($LASTEXITCODE -ne 0) {
    if (Test-Path -LiteralPath $OutputApk) { Remove-Item -LiteralPath $OutputApk -Force }
    $KeySecure = Read-Host 'Contraseña de la clave privada (si es distinta)' -AsSecureString
    $KeyPass = Convert-SecureStringToPlain $KeySecure
    $env:FINANCESENSOR_R2_KEY_PASS = $KeyPass
    & $java.Source -jar $ApkSignerJar sign --ks $Keystore --ks-key-alias $Alias --ks-pass env:FINANCESENSOR_R2_STORE_PASS --key-pass env:FINANCESENSOR_R2_KEY_PASS --out $OutputApk $InputApk
    if ($LASTEXITCODE -ne 0) { throw 'La firma local falló. No se produjo un APK aceptado.' }
  }

  $verify = & $java.Source -jar $ApkSignerJar verify --print-certs $OutputApk 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'apksigner no pudo verificar el APK firmado.' }
  $Observed = $null
  foreach ($line in $verify) {
    $text = [string]$line
    if ($text -match 'certificate SHA-1 digest:\s*([0-9A-Fa-f:]+)') { $Observed = Normalize-Sha1 $Matches[1]; break }
  }
  if ($Observed -ne $ExpectedSha1) {
    Remove-Item -LiteralPath $OutputApk -Force -ErrorAction SilentlyContinue
    throw "La firma producida no coincide con R2. Observada=$Observed Esperada=$ExpectedSha1. APK eliminado."
  }

  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutputApk).Hash.ToLowerInvariant()
  "$hash  $(Split-Path -Leaf $OutputApk)" | Set-Content -LiteralPath "$OutputApk.sha256" -Encoding ascii
  Write-Host 'FINANCESENSOR_R2_TRUSTED_EDGE_SIGNING=PASS'
  Write-Host "SIGNER_SHA1=$Observed"
  Write-Host "APK_SHA256=$hash"
}
finally {
  $StorePass = $null
  if (Get-Variable KeyPass -ErrorAction SilentlyContinue) { $KeyPass = $null }
  Remove-Item Env:FINANCESENSOR_R2_STORE_PASS -ErrorAction SilentlyContinue
  Remove-Item Env:FINANCESENSOR_R2_KEY_PASS -ErrorAction SilentlyContinue
}
