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

function Resolve-Java {
  $command = Get-Command java -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $candidates = @()
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME 'bin\java.exe') }
  if ($env:ProgramFiles) {
    $candidates += (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr\bin\java.exe')
    $candidates += (Join-Path $env:ProgramFiles 'Android\Android Studio\jre\bin\java.exe')
  }
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
  }
  return $null
}

function Choose-Keystore {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = 'Select private FINANCESENSOR_R2_LAB keystore'
    $dialog.Filter = 'Java keystore (*.jks;*.keystore)|*.jks;*.keystore|All files (*.*)|*.*'
    $dialog.Multiselect = $false
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { return $dialog.FileName }
  } catch { }
  return (Read-Host 'Full path to private FINANCESENSOR_R2_LAB keystore').Trim('"')
}

function Find-R2Alias([string]$JavaExe, [string]$KeystorePath, [string]$ExpectedFingerprint) {
  $probeDir = Join-Path ([IO.Path]::GetTempPath()) ('financesensor-r2-probe-' + [Guid]::NewGuid().ToString('N'))
  $probeSource = Join-Path $probeDir 'FinanceSensorKeystoreProbe.java'
  New-Item -ItemType Directory -Path $probeDir -Force | Out-Null

  $source = @'
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.cert.Certificate;
import java.util.Enumeration;

public class FinanceSensorKeystoreProbe {
  private static String hex(byte[] bytes) {
    StringBuilder out = new StringBuilder();
    for (byte b : bytes) out.append(String.format("%02X", b));
    return out.toString();
  }

  private static KeyStore load(Path path, char[] password) throws Exception {
    Exception last = null;
    for (String type : new String[] {"PKCS12", "JKS"}) {
      try (InputStream in = Files.newInputStream(path)) {
        KeyStore store = KeyStore.getInstance(type);
        store.load(in, password);
        return store;
      } catch (Exception error) {
        last = error;
      }
    }
    throw last == null ? new IllegalStateException("KEYSTORE_OPEN_FAILED") : last;
  }

  public static void main(String[] args) throws Exception {
    if (args.length != 2) System.exit(64);
    String secret = System.getenv("FINANCESENSOR_R2_STORE_PASS");
    if (secret == null) System.exit(65);
    KeyStore store;
    try {
      store = load(Path.of(args[0]), secret.toCharArray());
    } catch (Exception error) {
      System.err.println("KEYSTORE_OPEN_FAILED");
      System.exit(66);
      return;
    }
    String expected = args[1].replace(":", "").toUpperCase();
    Enumeration<String> aliases = store.aliases();
    while (aliases.hasMoreElements()) {
      String alias = aliases.nextElement();
      Certificate certificate = store.getCertificate(alias);
      if (certificate == null) continue;
      String sha1 = hex(MessageDigest.getInstance("SHA-1").digest(certificate.getEncoded()));
      if (sha1.equals(expected)) {
        System.out.println(alias);
        return;
      }
    }
    System.err.println("R2_ALIAS_NOT_FOUND");
    System.exit(67);
  }
}
'@

  try {
    Set-Content -LiteralPath $probeSource -Value $source -Encoding ascii
    $output = & $JavaExe $probeSource $KeystorePath $ExpectedFingerprint 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      $safe = (($output | ForEach-Object { [string]$_ }) -join ' ').Trim()
      if ($safe -match 'KEYSTORE_OPEN_FAILED') { throw 'Could not open the selected keystore with that password.' }
      if ($safe -match 'R2_ALIAS_NOT_FOUND') { throw "The selected keystore does not contain the expected stable R2 identity ($ExpectedFingerprint)." }
      throw "Keystore identity probe failed safely (exit $exitCode)."
    }
    $alias = ($output | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Last 1)
    if ([string]::IsNullOrWhiteSpace($alias)) { throw 'R2 alias probe returned no alias.' }
    return $alias.Trim()
  }
  finally {
    Remove-Item -LiteralPath $probeDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

$java = Resolve-Java
if (-not $java) { throw 'Java 17+ was not found. Install Android Studio/JDK or expose java.exe locally.' }
if (-not (Test-Path -LiteralPath $InputApk)) { throw "Input APK not found: $InputApk" }
if (-not (Test-Path -LiteralPath $ApkSignerJar)) { throw "apksigner.jar not found: $ApkSignerJar" }

$Keystore = Choose-Keystore
if ([string]::IsNullOrWhiteSpace($Keystore) -or -not (Test-Path -LiteralPath $Keystore)) { throw 'Keystore was not selected or does not exist.' }

$StoreSecure = Read-Host 'Keystore password (local memory only)' -AsSecureString
$StorePass = Convert-SecureStringToPlain $StoreSecure
$env:FINANCESENSOR_R2_STORE_PASS = $StorePass
$env:FINANCESENSOR_R2_KEY_PASS = $StorePass

try {
  $Alias = Find-R2Alias -JavaExe $java -KeystorePath $Keystore -ExpectedFingerprint $ExpectedSha1

  if (Test-Path -LiteralPath $OutputApk) { Remove-Item -LiteralPath $OutputApk -Force }
  & $java -jar $ApkSignerJar sign --ks $Keystore --ks-key-alias $Alias --ks-pass env:FINANCESENSOR_R2_STORE_PASS --key-pass env:FINANCESENSOR_R2_KEY_PASS --out $OutputApk $InputApk
  if ($LASTEXITCODE -ne 0) {
    if (Test-Path -LiteralPath $OutputApk) { Remove-Item -LiteralPath $OutputApk -Force }
    $KeySecure = Read-Host 'Private key password (only if different from keystore password)' -AsSecureString
    $KeyPass = Convert-SecureStringToPlain $KeySecure
    $env:FINANCESENSOR_R2_KEY_PASS = $KeyPass
    & $java -jar $ApkSignerJar sign --ks $Keystore --ks-key-alias $Alias --ks-pass env:FINANCESENSOR_R2_STORE_PASS --key-pass env:FINANCESENSOR_R2_KEY_PASS --out $OutputApk $InputApk
    if ($LASTEXITCODE -ne 0) { throw 'Local signing failed. No accepted APK was produced.' }
  }

  $verify = & $java -jar $ApkSignerJar verify --print-certs $OutputApk 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'apksigner could not verify the signed APK.' }
  $Observed = $null
  foreach ($line in $verify) {
    $text = [string]$line
    if ($text -match 'certificate SHA-1 digest:\s*([0-9A-Fa-f:]+)') { $Observed = Normalize-Sha1 $Matches[1]; break }
  }
  if ($Observed -ne $ExpectedSha1) {
    Remove-Item -LiteralPath $OutputApk -Force -ErrorAction SilentlyContinue
    throw "Produced APK signer mismatch. Observed=$Observed Expected=$ExpectedSha1. Output deleted."
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
