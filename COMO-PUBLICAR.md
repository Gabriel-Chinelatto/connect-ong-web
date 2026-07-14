# Publicar o Connect ONG online (HTTPS, qualquer rede)

O app fica numa **URL HTTPS pública** — funciona em **qualquer celular, em qualquer
rede** (dados móveis, outro Wi‑Fi, etc.) e o HTTPS libera **microfone (Dora por voz),
instalação como app (PWA), notificações e compartilhamento**. Tudo gratuito.

## Como funciona
- `serve.py` entrega os arquivos do app **e** encaminha a API no **mesmo endereço**
  (mesma origem → sem CORS). O backend continua em `localhost:8080`.
- O `cloudflared` cria um túnel HTTPS público apontando para o `serve.py`.
- Como o front usa a **mesma origem**, o QR e os links já saem com a URL pública —
  qualquer celular abre.

## Passo a passo (3 terminais)
1. **Backend** (Spring) — na pasta da API:
   ```
   ./mvnw spring-boot:run -Dspring-boot.run.profiles=local
   ```
2. **App + proxy** — nesta pasta:
   ```
   python serve.py 8090
   ```
   (abre em http://localhost:8090 — já dá pra testar tudo localmente, com HTTPS
   apenas no túnel abaixo)
3. **Túnel HTTPS público** — com o cloudflared (baixe o `cloudflared.exe` em
   https://github.com/cloudflare/cloudflared/releases):
   ```
   cloudflared tunnel --url http://localhost:8090
   ```
   Ele imprime uma URL tipo `https://xxxx.trycloudflare.com`. **Essa é a URL para
   abrir e para os QR Codes** — mande no projetor/estande.

## Observações
- A URL do `trycloudflare` é **temporária**: muda a cada vez que você inicia o
  túnel. O app usa sempre a URL atual automaticamente (inclusive nos QR). Para uma
  URL **fixa/permanente**, use uma conta gratuita da Cloudflare (Named Tunnel) ou
  hospede o front (Cloudflare Pages/Netlify) + backend (Render/Railway).
- Dev local sem túnel: `python serve.py 8090` e abra `http://localhost:8090`
  (microfone/PWA funcionam em `localhost` também). Sem o proxy, use
  `?api=http://localhost:8080` na URL.
