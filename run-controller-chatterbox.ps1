$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$arenaRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$python = Join-Path $arenaRoot 'AI-Arena-Chatterbox-env\Scripts\python.exe'
$cache = Join-Path $arenaRoot 'AI-Arena-Chatterbox-cache'
if (-not (Test-Path $python)) {
    throw 'Chatterbox environment is missing. Install the dependencies before starting the controller.'
}
if (-not (Test-Path $cache)) {
    throw 'Chatterbox model cache is missing.'
}

$env:AI_ARENA_TTS = '1'
$env:AI_ARENA_TTS_BACKEND = 'chatterbox'
$env:AI_ARENA_CHATTERBOX_CACHE = $cache
$env:NUMBA_CACHE_DIR = Join-Path $PSScriptRoot '.numba-cache'
$env:PYTHONPATH = Join-Path $PSScriptRoot '.vendor311'
& $python -m uvicorn controller.server:app --host 0.0.0.0 --port 8000
