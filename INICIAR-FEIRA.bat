@echo off
chcp 65001 >nul
title Connect ONG - FEIRA (modo rapido local)

REM ============================================================
REM   Connect ONG - INICIAR PARA A FEIRA (tudo local = rapido)
REM   Duplo clique neste arquivo. Ele liga a API, o site e abre
REM   o navegador. Feito para a apresentacao ser instantanea.
REM
REM   O backend e PROCURADO sozinho (nao precisa mais editar caminho).
REM   Corrigido em 02/09/2026: o caminho fixo era o do PC da escola
REM   (01gabriel.MAQCHINELATTO); em qualquer outra maquina a janela da API
REM   morria na hora e o site abria SEM backend. Efeito visivel: o login
REM   ficava sem as estatisticas e o botao "Entrar com a conta de
REM   demonstracao" nao entrava - parecia bug do site, era a API desligada.
REM ============================================================
set "WEB=%~dp0"
set "SUB=IdeaProjects\connect-ong-api\API - Chinelatto - att2\API - Chinelatto\API - Chinelatto"
set "BACKEND="
if exist "%USERPROFILE%\%SUB%\pom.xml" set "BACKEND=%USERPROFILE%\%SUB%"
if not defined BACKEND if exist "C:\Users\gabri\%SUB%\pom.xml" set "BACKEND=C:\Users\gabri\%SUB%"
if not defined BACKEND if exist "C:\Users\01gabriel.MAQCHINELATTO\%SUB%\pom.xml" set "BACKEND=C:\Users\01gabriel.MAQCHINELATTO\%SUB%"
if not defined BACKEND (
  echo.
  echo   [ERRO] Nao encontrei a pasta do backend ^(a API^).
  echo          Procurei em:  %USERPROFILE%\IdeaProjects\connect-ong-api\...
  echo.
  echo   Sem a API o site abre, mas o login e o botao de demonstracao NAO
  echo   funcionam. Abra este .bat no Bloco de Notas e ajuste a linha SUB=
  echo.
  pause
  exit /b 1
)
echo   Backend encontrado em: %BACKEND%
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
