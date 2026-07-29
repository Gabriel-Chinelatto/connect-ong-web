# 🎪 Connect ONG na feira — modo rápido (local)

Para a apresentação ficar **instantânea**, no dia da feira a gente roda tudo
**no próprio notebook** (a API perto do banco = sem a lentidão de atravessar o
mundo). O site hospedado (**connectong.netlify.app**) continua no ar como
**vitrine/backup** — não apague nada.

---

## ▶️ No dia da feira: só um duplo clique

**Dê duplo clique em `INICIAR-FEIRA.bat`.**

Ele faz tudo sozinho:
1. Liga a **API** (janela "Connect ONG - API").
2. Liga o **site** (janela "Connect ONG - Site").
3. Espera a API ficar pronta e **abre o navegador** em `http://localhost:8090`.

Deixe as duas janelas pretas **abertas** enquanto apresenta. No fim, feche-as
para encerrar.

> ⏱️ A API leva ~15-40s pra ligar na primeira vez. **Abra o `.bat` uns 2 minutos
> antes de apresentar** e deixe pronto.

---

## ✅ Teste obrigatório ANTES (regra de ouro)

O único ponto que pode falhar é o **banco da escola não estar acessível na rede
da feira**. Então, **conectado no Wi‑Fi da feira**:

1. Rode o `INICIAR-FEIRA.bat`.
2. Quando abrir, faça **login** e abra **uma tela com dados** (ex.: Procurar ONG).
3. Se carregou, está **100% garantido** para a apresentação.

Se o login falhar, o problema é a rede não alcançar o banco — nesse caso use o
site hospedado (**connectong.netlify.app**) como plano B.

---

## 🔧 Em casa, quando o código do backend mudar

Rode **uma vez** o `PREPARAR-JAR.bat` (precisa de internet). Ele reconstrói o
jar para a API ligar rápido no dia. Não precisa fazer isso na feira.

---

## 🖥️ Trocou de computador? (ex.: notebook da feira)

Abra o `INICIAR-FEIRA.bat` (e o `PREPARAR-JAR.bat`) no Bloco de Notas e ajuste a
linha do topo `set "BACKEND=..."` para o caminho do backend **naquele** PC.
O caminho do site (`WEB`) se autodetecta.

Requisitos no PC: **Java** e **Python** instalados (o `serve.py` usa Python).

---

## 📱 E o app do celular (mobile) / desktop?

O `INICIAR-FEIRA` cuida do **site (web)**, que é o que você projeta na
apresentação. O app mobile/desktop continua apontando para o hospedado — se
quiser eles também no modo local rápido, me peça que eu configuro.
