@echo off
title 4V Geodesic Dome Builder & Node Visualizer
echo ===============================================================
echo   🌐 4V GEODESIC DOME BUILDER & NODE VISUALIZER
echo ===============================================================
echo Uruchamianie aplikacji w przegladarce...
echo.

if exist "4V_Geodesic_Dome_Builder.exe" (
    start 4V_Geodesic_Dome_Builder.exe
) else if exist "dist\4V_Geodesic_Dome_Builder.exe" (
    start dist\4V_Geodesic_Dome_Builder.exe
) else (
    python launcher.py
)

exit
