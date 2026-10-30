# Envoi du site sur l'hébergement OVH par FTP chiffré (FTPS), pour les offres sans SSH (hébergement gratuit 100 Mo).
# Lancé par envoyer-sur-ovh.bat. Lit la liste d'envoi préparée par build.js (deploy\installation.txt ou deploy\mise-a-jour.txt).
param(
  [Parameter(Mandatory = $true)][string]$Hote,
  [Parameter(Mandatory = $true)][string]$Compte,
  [Parameter(Mandatory = $true)][string]$Liste
)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$secure = Read-Host "Mot de passe FTP du compte $Compte (rien ne s'affiche, c'est normal)" -AsSecureString
$cred = New-Object System.Net.NetworkCredential($Compte, $secure)
$ssl = $true

function Requete([string]$chemin, [string]$methode) {
  $r = [System.Net.FtpWebRequest]::Create("ftp://$Hote/$chemin")
  $r.Method = $methode
  $r.Credentials = $cred
  $r.EnableSsl = $script:ssl
  $r.UseBinary = $true
  $r.UsePassive = $true
  $r.KeepAlive = $true
  $r.Timeout = 60000
  return $r
}

# Test de connexion (chiffrée si le serveur l'accepte)
try {
  $t = Requete '' ([System.Net.WebRequestMethods+Ftp]::PrintWorkingDirectory)
  $t.GetResponse().Close()
} catch {
  Write-Host ""
  Write-Host " La connexion chiffrée (FTPS) a échoué : $($_.Exception.Message)" -ForegroundColor Yellow
  $rep = Read-Host " Réessayer en FTP non chiffré (le mot de passe circule en clair) ? o/N"
  if ($rep -notmatch '^[oOyY]') { exit 1 }
  $script:ssl = $false
  $t = Requete '' ([System.Net.WebRequestMethods+Ftp]::PrintWorkingDirectory)
  $t.GetResponse().Close()
}

$lignes = Get-Content -Encoding UTF8 $Liste
$envois = @($lignes | Where-Object { $_ -match '^put ' })
$n = 0; $erreurs = 0
foreach ($l in $lignes) {
  if ($l -match '^-mkdir (.+)$') {
    try { (Requete $Matches[1] ([System.Net.WebRequestMethods+Ftp]::MakeDirectory)).GetResponse().Close() } catch { } # déjà présent
  } elseif ($l -match '^put (\S+) (\S+)$') {
    $src = $Matches[1]; $dst = $Matches[2]; $n++
    Write-Progress -Activity "Envoi du site" -Status "$n / $($envois.Count) : $dst" -PercentComplete ($n * 100 / [Math]::Max(1, $envois.Count))
    try {
      $octets = [System.IO.File]::ReadAllBytes((Join-Path (Get-Location) $src))
      $r = Requete $dst ([System.Net.WebRequestMethods+Ftp]::UploadFile)
      $r.ContentLength = $octets.Length
      $s = $r.GetRequestStream(); $s.Write($octets, 0, $octets.Length); $s.Close()
      $r.GetResponse().Close()
    } catch {
      $erreurs++
      Write-Host " Échec : $dst ($($_.Exception.Message))" -ForegroundColor Red
    }
  }
}
Write-Progress -Activity "Envoi du site" -Completed
Write-Host ""
if ($erreurs) { Write-Host " $n fichier(s) traités, $erreurs échec(s). Relancez l'envoi." -ForegroundColor Red; exit 1 }
Write-Host " $n fichier(s) envoyés." -ForegroundColor Green
