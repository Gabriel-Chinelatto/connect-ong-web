# Hospedar o Connect ONG com endereço FIXO e gratuito (Netlify + Render)

Resultado: um endereço permanente tipo **`https://connectong.netlify.app`** (ou um
domínio próprio), com HTTPS — a Dora por voz, PWA, notificações e os QR funcionam
de **qualquer celular, qualquer rede**, e o histórico da Dora para de sumir.

- **Front (site)** → **Netlify** (grátis). Publica os arquivos e encaminha a API
  para o backend na mesma origem (o `netlify.toml` já faz isso → sem CORS).
- **Backend (API)** → **Render** (grátis, via o `Dockerfile` que já existe).

Você faz tudo pelo navegador, conectando o GitHub. Não precisa instalar nada.

---

## Parte 1 — Backend no Render (faça esta PRIMEIRO)

1. Crie uma conta grátis em https://render.com (pode entrar com o GitHub).
2. **New +** → **Web Service** → conecte o repositório **`connect-ong-api`**.
3. Configurações:
   - **Root Directory:** `API - Chinelatto - att2/API - Chinelatto/API - Chinelatto`
     (é onde está o `Dockerfile`).
   - **Runtime/Environment:** Docker (o Render detecta o `Dockerfile` sozinho).
   - **Name:** `connect-ong-api`  ← **importante:** esse nome vira a URL
     `https://connect-ong-api.onrender.com`, que é a que está no `netlify.toml`.
     Se usar outro nome, ajuste o `netlify.toml` do site depois.
   - **Instance Type:** Free.
4. **Environment Variables** (aba Environment) — copie os valores do seu
   `application-local.properties`:

   | Chave (env)          | Valor                                             |
   |----------------------|---------------------------------------------------|
   | `DB_PASSWORD`        | a senha do MySQL da escola                        |
   | `APP_JWT_SECRET`     | um texto longo e aleatório (segredo do login)     |
   | `APP_IA_GROQ_KEY`    | a chave da Groq (Dora/IA); opcional               |
   | `APP_ADMIN_EMAIL`    | e-mail do admin                                   |
   | `APP_ADMIN_PASSWORD` | senha do admin                                    |
   | `APP_DEMO_ENABLED`   | `true`  (habilita a conta de demonstração)        |

   `DB_URL` e `DB_USERNAME` já têm padrão no código (o MySQL da escola) — só
   defina se for usar outro banco.
5. **Create Web Service** e aguarde o build (uns minutos). Quando aparecer "Live",
   teste: abra `https://connect-ong-api.onrender.com/publico/estatisticas` —
   tem que voltar um JSON com números.

## Parte 2 — Front no Netlify

1. Crie uma conta grátis em https://netlify.com (entre com o GitHub).
2. **Add new site** → **Import an existing project** → repositório **`connect-ong-web`**.
3. Build: deixe em branco (é site estático). **Publish directory:** `.` (ponto).
   O `netlify.toml` do repo já cuida do resto.
4. **Deploy.** Em segundos você recebe uma URL tipo `https://random-name.netlify.app`.
5. **Site settings → Change site name** → coloque `connectong` (ou o que preferir)
   → fica `https://connectong.netlify.app`.
6. Se você nomeou o backend no Render com um nome diferente de `connect-ong-api`,
   edite o `netlify.toml` (a linha `to = "https://SEU-BACKEND.onrender.com/:splat"`)
   e faça commit — o Netlify redeploya sozinho.

Pronto: abra `https://connectong.netlify.app`, faça login com a conta demo e teste
tudo. Os QR já saem com esse endereço fixo.

---

## Atenção (2 pontos honestos)

1. **O banco da escola precisa aceitar conexão de fora.** O backend aponta para o
   MySQL da UNICAMP (`143.106.241.3`). Se esse servidor só aceitar conexões de
   dentro do campus, o Render **não vai conseguir conectar** e a API falha ao subir.
   - Como saber: se o serviço no Render ficar reiniciando/erro de conexão, é isso.
   - Solução: usar um **MySQL grátis na nuvem** (Railway, Aiven, Clever Cloud) e
     apontar `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` para ele (migrando o schema+dados).
     Me chama que eu te guio nessa migração.
2. **Plano grátis do Render "dorme" após ~15 min sem uso** e leva ~30s para
   acordar na próxima visita (a primeira carga fica lenta; depois fica rápido).
   Para uma demo ao vivo, abra o site 1 min antes para "acordar" o backend, ou
   use um pingador grátis (UptimeRobot) para mantê-lo acordado.

## Domínio próprio (opcional, mais profissional para a banca)
Compre um domínio (ex.: `connectong.com.br` no https://registro.br, ~R$40/ano) e
em **Netlify → Domain settings → Add custom domain** aponte para ele (o Netlify dá
o HTTPS de graça). O `netlify.toml` continua igual.
