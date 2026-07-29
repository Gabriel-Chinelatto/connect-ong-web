@echo off
chcp 65001 >nul
title Connect ONG - FEIRA (modo rapido local)

REM ============================================================
REM   Connect ONG - INICIAR PARA A FEIRA (tudo local = rapido)
REM   Duplo clique neste arquivo. Ele liga a API, o site e abre
REM   o navegador. Feito para a apresentacao ser instantanea.
REM
REM   >>> AJUSTE ESTES 2 CAMINHOS SE MUDAR DE COMPUTADOR <<<
REM ============================================================
set "BACKEND=C:\Users\01gabriel.MAQCHINELATTO\IdeaProjects\connect-ong-api\API - Chinelatto - att2\API - Chinelatto\API - Chinelatto"
set "WEB=%~dp0"
REM ============================================================

set "SPRING_PROFILES_ACTIVE=local"

echo.
echo   ================================================
echo    Connect ONG - iniciando LOCAL para a feira
echo   ================================================
echo.

REM --- Descobre um jar pronto (rapido). Se nao houver, usa o Maven. ---
set "JAR="
for %%f in ("%BACKEND%\target\*.jar") do set "JAR=%%f"

echo   [1/3] Ligando a API...
if defined JAR (
  echo         (usando o jar pronto - ligamento rapido ~15s^)
  start "Connect ONG - API" cmd /c "cd /d \"%BACKEND%\" && java -jar \"%JAR%\" --spring.profiles.active=local"
) else (
  echo         (sem jar pronto - subindo pelo Maven, pode demorar mais^)
  start "Connect ONG - API" cmd /c "cd /d \"%BACKEND%\" && mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local"
)

echo   [2/3] Ligando o site (mesma origem - PWA/microfone/QR funcionam)...
start "Connect ONG - Site" cmd /c "cd /d \"%WEB%\" && python serve.py 8090 http://localhost:8080"

echo   [3/3] Aguardando a API ficar pronta (pode levar ate ~40s)...
set /a TENTATIVAS=0
:esperar
set /a TENTATIVAS+=1
if %TENTATIVAS% GTR 60 goto abrir
timeout /t 3 /nobreak >nul
for /f %%c in ('curl -s -o nul -w "%%{http_code}" http://localhost:8080/publico/estatisticas 2^>nul') do set "CODE=%%c"
if not "%CODE%"=="200" (
  echo         ...ainda ligando (tentativa %TENTATIVAS%^)
  goto esperar
)

:abrir
echo.
echo   API pronta! Abrindo o Connect ONG no navegador...
start "" http://localhost:8090/
echo.
echo   ============================================================
echo    TUDO PRONTO. Deixe as janelas "API" e "Site" ABERTAS.
echo    Para encerrar tudo no fim: feche esta janela e as outras 2.
echo   ============================================================
echo.
echo   (Pode minimizar. Endereco do app: http://localhost:8090 )
pause >nul
