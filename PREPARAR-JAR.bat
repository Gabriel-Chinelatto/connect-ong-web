@echo off
chcp 65001 >nul
title Connect ONG - Preparar jar (rodar 1x em casa)

REM ============================================================
REM   Gera o jar da API para a feira ligar rapido (java -jar).
REM   Rode ISTO UMA VEZ em casa (com internet) sempre que o
REM   codigo do backend mudar. No dia da feira use INICIAR-FEIRA.
REM   >>> AJUSTE O CAMINHO SE MUDAR DE COMPUTADOR <<<
REM ============================================================
set "BACKEND=C:\Users\01gabriel.MAQCHINELATTO\IdeaProjects\connect-ong-api\API - Chinelatto - att2\API - Chinelatto\API - Chinelatto"
REM ============================================================

echo.
echo   Construindo o jar da API (pode levar alguns minutos)...
echo.
cd /d "%BACKEND%"
call mvnw.cmd -DskipTests clean package

echo.
if exist "%BACKEND%\target\*.jar" (
  echo   PRONTO! Jar gerado em: %BACKEND%\target\
  echo   Agora o INICIAR-FEIRA vai ligar a API rapido.
) else (
  echo   ATENCAO: nao encontrei o jar. Verifique os erros acima.
)
echo.
pause
