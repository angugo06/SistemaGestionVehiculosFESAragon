$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectPath

Write-Host ''
Write-Host 'ARAGÓN · MOVILIDAD' -ForegroundColor Green
Write-Host 'Preparando la aplicación local...'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Instala Node.js 24 o superior desde https://nodejs.org y vuelve a ejecutar este archivo.' -ForegroundColor Yellow
    exit 1
}
$nodeMajorVersion = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajorVersion -lt 24) {
    Write-Host 'Esta aplicación necesita Node.js 24 o superior.' -ForegroundColor Yellow
    exit 1
}

function Invoke-ProjectPnpm {
    param([string[]]$Arguments)
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        & pnpm @Arguments
    } else {
        & npx --yes pnpm@11.24.0 @Arguments
    }
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo completar el paso. Revisa el mensaje anterior.' }
}

try {
    # El lanzador se ejecuta sin entrada interactiva; pnpm puede necesitar
    # reconstruir node_modules y no debe esperar una confirmación por TTY.
    $previousCi = $env:CI
    try {
        $env:CI = 'true'
        Invoke-ProjectPnpm -Arguments @('install', '--frozen-lockfile')
    } finally {
        $env:CI = $previousCi
    }
    Invoke-ProjectPnpm -Arguments @('build')
    Write-Host ''
    $appPort = if ($env:PORT) { $env:PORT } else { '3000' }
    Write-Host "Cuando el servidor esté listo, abre http://localhost:$appPort" -ForegroundColor Green
    if ($env:DEMO_DATA -eq 'false' -or $env:ADMIN_PASSWORD) {
        Write-Host 'Usuario inicial: admin. Utiliza la contraseña configurada para esta base.'
    } else {
        Write-Host 'Usuario: admin     Contraseña de demostración: Aragon2026!'
    }
    Write-Host 'Mantén esta ventana abierta. Presiona Ctrl+C para detener.'
    Invoke-ProjectPnpm -Arguments @('start')
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
