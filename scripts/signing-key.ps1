# Resolve the minisign updater signing key + password into the environment so release
# builds sign the updater `.sig` files without an interactive prompt. Dot-source, then call:
#
#   . (Join-Path $PSScriptRoot 'signing-key.ps1')
#   Initialize-SigningKey -WorkspaceRoot $repoRoot
#
# or from the repository root in one go:
#
#   . .\scripts\signing-key.ps1; Initialize-SigningKey -WorkspaceRoot (Get-Location)
#
# Private key: loaded from .tauri/torrent-remote.key (gitignored) unless already in env.
# Password precedence (first hit wins):
#   1. $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD already set (e.g. a CI secret).
#   2. 1Password CLI — `op read` of $env:TORRENT_REMOTE_OP_PASSWORD_REF
#      (default below), using a service-account token in $env:OP_SERVICE_ACCOUNT_TOKEN.
#      A secret *reference* is not sensitive (it's a pointer); the secret never hits disk.
#   3. Gitignored plaintext fallback file .tauri/torrent-remote.key.pass.
#
# CI uses the repository secrets of the same two names instead (see .github/workflows/build.yml).
# A missing key file is not an error here (Tauri just produces an unsigned build).

function Initialize-SigningKey {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$WorkspaceRoot)

    $keyFile = Join-Path $WorkspaceRoot '.tauri\torrent-remote.key'
    if ((Test-Path $keyFile) -and [string]::IsNullOrEmpty($env:TAURI_SIGNING_PRIVATE_KEY)) {
        $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content $keyFile -Raw)
    }

    # 1. Already provided (CI secret / explicit export) — nothing to do.
    if (-not [string]::IsNullOrEmpty($env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD)) {
        return
    }

    # 2. 1Password service account. Capturing op's stdout into a variable avoids any
    #    shell re-interpretation of the password's symbols.
    $opRef = if ($env:TORRENT_REMOTE_OP_PASSWORD_REF) { $env:TORRENT_REMOTE_OP_PASSWORD_REF } else { 'op://Development/Torrent Remote/h45hpkrdaxawvnuhnk62iutvge' }
    # Name the missing prerequisite instead of skipping silently, otherwise a shell
    # without the token falls straight through to Tauri's interactive password prompt.
    if (-not (Get-Command op -ErrorAction SilentlyContinue)) {
        Write-Host "1Password CLI (op) not on PATH; skipping 1Password lookup." -ForegroundColor DarkYellow
    } elseif ([string]::IsNullOrEmpty($env:OP_SERVICE_ACCOUNT_TOKEN)) {
        Write-Host "OP_SERVICE_ACCOUNT_TOKEN not set in this shell; skipping 1Password lookup (restart the terminal if it was set recently)." -ForegroundColor DarkYellow
    }
    if ((Get-Command op -ErrorAction SilentlyContinue) -and
        -not [string]::IsNullOrEmpty($env:OP_SERVICE_ACCOUNT_TOKEN)) {
        try {
            $pw = (& op read $opRef 2>$null)
            if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($pw)) {
                $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ([string]$pw).TrimEnd("`r", "`n")
                Write-Host "Signing-key password loaded from 1Password ($opRef)." -ForegroundColor DarkGray
                return
            }
            Write-Host "1Password: could not read $opRef (op exit $LASTEXITCODE); trying file fallback." -ForegroundColor DarkYellow
        } catch {
            Write-Host "1Password lookup failed ($($_.Exception.Message)); trying file fallback." -ForegroundColor DarkYellow
        }
    }

    # 3. Gitignored plaintext fallback.
    $passFile = Join-Path $WorkspaceRoot '.tauri\torrent-remote.key.pass'
    if (Test-Path $passFile) {
        $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = (Get-Content $passFile -Raw).TrimEnd("`r", "`n")
    }
}
