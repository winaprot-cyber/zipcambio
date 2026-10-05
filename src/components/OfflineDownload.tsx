import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export default function OfflineDownload({ onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateExeInstaller = () => {
    setIsGenerating(true);
    const currentUrl = window.location.href;

    const batContent = `@echo off
chcp 65001 >nul
title Gestor ZIP Pro - Creador de EXE Portable
color 0A

echo.
echo ================================================================
echo   Gestor ZIP Pro - Creador de EXE Portable
echo   Desarrollado para uso de digitacion
echo   (c) 2026
echo ================================================================
echo.
echo Este script creara un archivo .EXE portable de la aplicacion.
echo La aplicacion funcionara 100%% offline sin necesidad de internet.
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js no esta instalado.
    echo.
    echo Es necesario instalar Node.js para crear el EXE.
    echo Descargalo desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detectado: 
node --version
echo.

set BUILD_DIR=%USERPROFILE%\\Desktop\\GestorZIP_Pro_Build
if exist "%BUILD_DIR%" (
    echo [INFO] Limpiando carpeta anterior...
    rmdir /s /q "%BUILD_DIR%"
)
mkdir "%BUILD_DIR%"
cd /d "%BUILD_DIR%"

echo [1/5] Creando configuracion del proyecto...
(
echo {
echo   "name": "gestor-zip-pro",
echo   "version": "1.0.0",
echo   "description": "Gestor ZIP Pro - Desarrollado para uso de digitacion",
echo   "main": "main.js",
echo   "scripts": {
echo     "start": "electron .",
echo     "build": "electron-builder --win portable"
echo   },
echo   "author": "Uso de Digitacion",
echo   "license": "MIT",
echo   "devDependencies": {
echo     "electron": "^28.0.0",
echo     "electron-builder": "^24.9.1"
echo   },
echo   "build": {
echo     "appId": "com.digitacion.gestorzippro",
echo     "productName": "Gestor ZIP Pro",
echo     "win": {
echo       "target": "portable",
echo       "icon": "icon.ico"
echo     },
echo     "portable": {
echo       "artifactName": "GestorZIP_Pro_Portable.exe"
echo     },
echo     "files": [
echo       "main.js",
echo       "app/**/*"
echo     ]
echo   }
echo }
) > package.json

echo [2/5] Creando archivo principal de Electron...
(
echo const { app, BrowserWindow, Menu } = require('electron'^);
echo const path = require('path'^);
echo Menu.setApplicationMenu(null^);
echo function createWindow(^) {
echo   const win = new BrowserWindow({
echo     width: 1280,
echo     height: 800,
echo     minWidth: 800,
echo     minHeight: 600,
echo     title: 'Gestor ZIP Pro',
echo     icon: path.join(__dirname, 'icon.ico'^),
echo     webPreferences: {
echo       nodeIntegration: false,
echo       contextIsolation: true,
echo       webSecurity: true
echo     },
echo     autoHideMenuBar: true,
echo     backgroundColor: '#f3f4f6'
echo   }^);
echo   win.loadFile(path.join(__dirname, 'app', 'index.html'^)^);
echo }
echo app.whenReady(^).then(createWindow^);
echo app.on('window-all-closed', (^) =^> {
echo   if (process.platform !== 'darwin'^) app.quit(^);
echo }^);
echo app.on('activate', (^) =^> {
echo   if (BrowserWindow.getAllWindows(^).length === 0^) createWindow(^);
echo }^);
) > main.js

mkdir app

echo [3/5] Descargando aplicacion web...
echo       URL: ${currentUrl}
echo.

powershell -Command "& { try { Invoke-WebRequest -Uri '${currentUrl}' -OutFile 'app\\index.html' -UseBasicParsing; Write-Host '[OK] Pagina principal descargada' } catch { Write-Host '[ERROR] No se pudo descargar la pagina'; exit 1 } }"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudo descargar la aplicacion.
    pause
    exit /b 1
)

echo [INFO] Descargando recursos adicionales...
powershell -Command "& { $content = Get-Content 'app\\index.html' -Raw; $matches = [regex]::Matches($content, 'src=\"([^\"]+\\.js)\"'); foreach ($m in $matches) { $url = $m.Groups[1].Value; if ($url -notmatch '^http'^) { $url = '${currentUrl}' + $url }; $filename = [System.IO.Path]::GetFileName($url); try { Invoke-WebRequest -Uri $url -OutFile ('app\\' + $filename) -UseBasicParsing; Write-Host ('[OK] Descargado: ' + $filename) } catch { Write-Host ('[WARN] No se pudo descargar: ' + $filename) } }; $cssMatches = [regex]::Matches($content, 'href=\"([^\"]+\\.css)\"'); foreach ($m in $cssMatches) { $url = $m.Groups[1].Value; if ($url -notmatch '^http'^) { $url = '${currentUrl}' + $url }; $filename = [System.IO.Path]::GetFileName($url); try { Invoke-WebRequest -Uri $url -OutFile ('app\\' + $filename) -UseBasicParsing; Write-Host ('[OK] Descargado: ' + $filename) } catch { Write-Host ('[WARN] No se pudo descargar: ' + $filename) } } }"

echo.

echo [4/5] Creando icono de la aplicacion...
powershell -Command "& { Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap(256,256); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.SmoothingMode = 'AntiAlias'; $g.Clear([System.Drawing.Color]::FromArgb(31,41,55)); $font = New-Object System.Drawing.Font('Arial',72,[System.Drawing.FontStyle]::Bold); $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White); $sf = New-Object System.Drawing.StringFormat; $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'; $rect = New-Object System.Drawing.RectangleF(0,0,256,256); $g.DrawString('ZIP',$font,$brush,$rect,$sf); $bmp.Save('%BUILD_DIR%\\icon.ico',[System.Drawing.Imaging.ImageFormat]::Icon); $g.Dispose(); $bmp.Dispose(); Write-Host '[OK] Icono creado' }"

echo.

echo [5/5] Instalando dependencias de Electron...
echo       Esto puede tardar varios minutos...
echo.

call npm install --silent

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Error al instalar dependencias.
    pause
    exit /b 1
)

echo.
echo [INFO] Generando ejecutable portable...
echo       Esto puede tardar varios minutos...
echo.

call npx electron-builder --win portable

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Error al generar el ejecutable.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   EJECUTABLE GENERADO EXITOSAMENTE!
echo ================================================================
echo.

set EXE_FOUND=0
if exist "%BUILD_DIR%\\dist\\GestorZIP_Pro_Portable.exe" (
    copy /y "%BUILD_DIR%\\dist\\GestorZIP_Pro_Portable.exe" "%USERPROFILE%\\Desktop\\GestorZIP_Pro.exe" >nul
    set EXE_FOUND=1
)

if %EXE_FOUND%==1 (
    echo [OK] El archivo EXE se ha copiado a tu escritorio:
    echo.
    echo     %USERPROFILE%\\Desktop\\GestorZIP_Pro.exe
    echo.
    echo ================================================================
    echo   Ya puedes usar la aplicacion offline!
    echo   Solo haz doble clic en el icono del escritorio.
    echo   No necesita internet para funcionar.
    echo ================================================================
) else (
    echo [INFO] Buscando el archivo EXE generado...
    dir /s /b "%BUILD_DIR%\\dist\\*.exe" 2>nul
    echo.
    echo El archivo EXE se encuentra en:
    echo     %BUILD_DIR%\\dist\\
)

echo.
echo Desarrollado para uso de digitacion - 2026
echo.

set /p CLEANUP="Deseas eliminar la carpeta de compilacion? (S/N): "
if /i "%CLEANUP%"=="S" (
    echo [INFO] Limpiando archivos temporales...
    cd /d %USERPROFILE%
    rmdir /s /q "%BUILD_DIR%"
    echo [OK] Limpieza completada.
) else (
    echo [INFO] La carpeta de compilacion se mantiene en:
    echo     %BUILD_DIR%
)

echo.
pause
`;

    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Crear_EXE_Portable.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => setIsGenerating(false), 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
              <i className="fas fa-desktop text-white"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Descargar .EXE Portable</h2>
              <p className="text-xs text-gray-500">Aplicación de escritorio para Windows — 100% Offline</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg flex items-center justify-center transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <i className="fas fa-file-code text-green-600 text-2xl"></i>
              </div>
              <div>
                <h3 className="font-bold text-green-800 text-lg">Gestor ZIP Pro — Versión EXE</h3>
                <p className="text-green-700 text-sm mt-1">
                  Aplicación de escritorio que funciona sin internet.
                  Todas las herramientas en un solo archivo .exe portable.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
              <i className="fas fa-ban text-red-400 text-2xl mb-2"></i>
              <p className="text-sm font-medium text-gray-700">100% Offline</p>
              <p className="text-xs text-gray-500">No necesita internet</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
              <i className="fas fa-usb text-gray-400 text-2xl mb-2"></i>
              <p className="text-sm font-medium text-gray-700">Portable</p>
              <p className="text-xs text-gray-500">Llévalo en USB</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
              <i className="fas fa-bolt text-gray-400 text-2xl mb-2"></i>
              <p className="text-sm font-medium text-gray-700">Sin Instalación</p>
              <p className="text-xs text-gray-500">Solo ejecutar</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <i className="fas fa-list-ol text-gray-600"></i>
              Instrucciones:
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Descargar el script</p>
                  <p className="text-sm text-gray-600">Haz clic en el botón verde de abajo para descargar <code className="bg-gray-200 px-1 rounded">Crear_EXE_Portable.bat</code></p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Verificar Node.js</p>
                  <p className="text-sm text-gray-600">Necesitas tener <a href="https://nodejs.org" target="_blank" className="text-blue-600 hover:underline font-medium">Node.js</a> instalado.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Ejecutar el script</p>
                  <p className="text-sm text-gray-600">Doble clic en el archivo .bat. El script hará todo automáticamente.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-check text-sm"></i>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-800">¡Listo!</p>
                  <p className="text-sm text-green-700">El archivo <code className="bg-green-200 px-1 rounded">GestorZIP_Pro.exe</code> aparecerá en tu escritorio.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <i className="fas fa-exclamation-triangle text-yellow-600 mt-0.5"></i>
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Requisitos:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                  <li>Windows 10 o 11</li>
                  <li>Node.js (<a href="https://nodejs.org" target="_blank" className="underline">nodejs.org</a>)</li>
                  <li>Internet (solo para la primera compilación)</li>
                  <li>~500 MB de espacio temporal</li>
                </ul>
                <p className="text-yellow-600 text-xs mt-2">
                  <i className="fas fa-info-circle mr-1"></i>
                  Una vez compilado, el .EXE funciona sin internet permanentemente.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400">
            <i className="fas fa-shield-alt mr-1"></i>
            Seguro — Sin telemetría — 100% offline
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm">
              Cancelar
            </button>
            <button
              onClick={generateExeInstaller}
              disabled={isGenerating}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all shadow-sm flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <><i className="fas fa-spinner fa-spin"></i> Generando...</>
              ) : (
                <><i className="fas fa-download"></i> Descargar Script .BAT</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
