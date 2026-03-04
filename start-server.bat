@echo off
setlocal
set PORT=8000

REM Try to find Python and start a simple HTTP server
where python >nul 2>&1
if %ERRORLEVEL%==0 (
    start "" "http://localhost:%PORT%"
    start "" python -m http.server %PORT%
    goto end
)

where py >nul 2>&1
if %ERRORLEVEL%==0 (
    start "" "http://localhost:%PORT%"
    start "" py -3 -m http.server %PORT%
    goto end
)

REM Fallback: open the index.html directly
start "" index.html

:end
endlocal