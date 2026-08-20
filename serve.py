#!/usr/bin/env python3
"""
Connect ONG - servidor de MESMA ORIGEM (web + proxy da API).

Entrega os arquivos estaticos do app E encaminha qualquer outra rota para o
backend Spring (localhost:8080). Com isso o front e a API ficam na MESMA origem:
- Nao ha CORS (requisicao same-origin).
- Basta um unico endereco/tunel -> funciona em HTTPS (microfone, PWA, Web Share,
  notificacoes) e de QUALQUER rede quando exposto por um tunel (ex.: cloudflared).

Uso:
    python serve.py [porta]        # padrao 8090, backend em localhost:8080
    python serve.py 8090 http://localhost:8080

O header Origin/Referer NAO e repassado ao backend, para o Spring nao aplicar
regra de CORS (trata como requisicao normal do proprio servidor).
"""
import os
import sys
import socket
import http.server
import socketserver
import urllib.request
import urllib.error

WEB_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
BACKEND = (sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8080').rstrip('/')

# Rotas estaticas: se o caminho casa com um arquivo existente sob WEB_DIR (ou '/'),
# servimos o arquivo; qualquer outra coisa vai para o backend.
_HOP = {'transfer-encoding', 'connection', 'content-encoding', 'content-length', 'keep-alive'}


def is_static(path):
    p = path.split('?', 1)[0].split('#', 1)[0]
    if p in ('/', '/index.html', '/manifest.json', '/sw.js', '/favicon.ico'):
        return True
    rel = p.lstrip('/')
    if not rel or '..' in rel:
        return p == '/'
    return os.path.isfile(os.path.join(WEB_DIR, rel.replace('/', os.sep)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=WEB_DIR, **k)

    def _proxy(self):
        url = BACKEND + self.path
        length = int(self.headers.get('Content-Length', 0) or 0)
        body = self.rfile.read(length) if length else None
        headers = {}
        for k, v in self.headers.items():
            lk = k.lower()
            if lk in _HOP or lk in ('host', 'origin', 'referer', 'accept-encoding'):
                continue
            headers[k] = v
        req = urllib.request.Request(url, data=body, method=self.command, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                self._relay(resp.status, resp.getheaders(), resp.read())
        except urllib.error.HTTPError as e:
            self._relay(e.code, list(e.headers.items()), e.read())
        except Exception as ex:  # backend fora do ar, timeout, etc.
            msg = ('{"erro":"Backend indisponivel: %s"}' % ex).encode('utf-8')
            self._relay(502, [('Content-Type', 'application/json')], msg)

    def _relay(self, status, headers, data):
        try:
            self.send_response(status)
            for k, v in headers:
                if k.lower() in _HOP:
                    continue
                self.send_header(k, v)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(data)
        except (BrokenPipeError, ConnectionAbortedError):
            pass

    # ------------------------------------------------------------------
    # Mapa OFFLINE para a feira: o app (rodando local) pede os tiles por
    # /tiles/{z}/{x}/{y}.png. Servimos do cache em disco (tiles-cache/); se
    # nao tiver e houver internet, buscamos no CARTO e guardamos. Assim o
    # mapa funciona mesmo sem Wi-Fi no estande (pre-carga: baixar_tiles.py).
    # ------------------------------------------------------------------
    _TILES_DIR = os.path.join(WEB_DIR, 'tiles-cache')
    _TILES_UPSTREAM = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/%s'

    def _tile(self):
        rel = self.path.split('?', 1)[0][len('/tiles/'):]
        partes = rel.split('/')
        if len(partes) != 3 or '..' in rel or not rel.endswith('.png'):
            return self._relay(404, [('Content-Type', 'text/plain')], b'tile invalido')
        arq = os.path.join(self._TILES_DIR, *partes)
        if not os.path.isfile(arq):
            try:
                req = urllib.request.Request(
                    self._TILES_UPSTREAM % rel,
                    headers={'User-Agent': 'ConnectONG-feira/1.0'})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    dado = resp.read()
                os.makedirs(os.path.dirname(arq), exist_ok=True)
                with open(arq, 'wb') as f:
                    f.write(dado)
            except Exception:
                # Sem internet e sem cache: devolve um PNG transparente 1x1
                # para o Leaflet nao encher o console de erro.
                dado = (b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
                        b'\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'
                        b'\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01'
                        b'\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')
                return self._relay(200, [('Content-Type', 'image/png')], dado)
        with open(arq, 'rb') as f:
            dado = f.read()
        return self._relay(200, [('Content-Type', 'image/png'),
                                 ('Cache-Control', 'public, max-age=604800')], dado)

    def do_GET(self):
        if self.path.startswith('/tiles/'):
            return self._tile()
        if is_static(self.path):
            return super().do_GET()
        return self._proxy()

    def do_HEAD(self):
        if is_static(self.path):
            return super().do_HEAD()
        return self._proxy()

    def do_POST(self):
        return self._proxy()

    def do_PUT(self):
        return self._proxy()

    def do_DELETE(self):
        return self._proxy()

    def do_PATCH(self):
        return self._proxy()

    def do_OPTIONS(self):
        return self._proxy()

    def log_message(self, *a):
        pass  # silencioso


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    # SO_REUSEADDR significa coisas DIFERENTES em cada sistema:
    #   - Linux/macOS: so reaproveita porta em TIME_WAIT (o que queremos, para
    #     religar o servidor logo depois de parar);
    #   - WINDOWS: deixa ligar numa porta que OUTRO PROCESSO ja esta usando, sem
    #     erro nenhum. O serve.py imprimia "Connect ONG em http://localhost:8090"
    #     como se estivesse tudo certo, mas quem respondia o navegador podia ser
    #     o outro programa — foi assim que o site apareceu como "HTTP ERROR 501"
    #     no computador da apresentacao (2026-08-20). Por isso, no Windows,
    #     desligamos e checamos a porta antes (ver porta_ocupada).
    allow_reuse_address = (os.name != 'nt')


def porta_ocupada(porta):
    """True se alguem JA esta atendendo nesta porta (nao somos nos)."""
    with socket.socket() as s:
        s.settimeout(0.4)
        return s.connect_ex(('127.0.0.1', porta)) == 0


def como_liberar(porta):
    if os.name == 'nt':
        return ('  Para ver quem esta ocupando e liberar (PowerShell):\n'
                '    Get-NetTCPConnection -LocalPort %d -State Listen |\n'
                '      ForEach-Object { Get-Process -Id $_.OwningProcess }\n'
                '    Get-NetTCPConnection -LocalPort %d -State Listen |\n'
                '      ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n'
                '  (costuma ser um "dartvm"/"python" sobrando de outra vez)' % (porta, porta))
    return '  Para ver quem esta ocupando:  lsof -i :%d' % porta


if __name__ == '__main__':
    # Pasta errada: sem index.html isto aqui nao e o site.
    if not os.path.isfile(os.path.join(WEB_DIR, 'index.html')):
        print('ERRO: nao achei index.html em %s' % WEB_DIR)
        print('      Rode o serve.py de dentro da pasta do site.')
        sys.exit(1)

    if porta_ocupada(PORT):
        print('ERRO: a porta %d JA ESTA OCUPADA por outro programa.' % PORT)
        print('      Se abrir o navegador agora, quem responde e ELE, nao o site')
        print('      (foi o que deu "HTTP ERROR 501" no dia da apresentacao).')
        print(como_liberar(PORT))
        print('      Ou use outra porta:  python serve.py %d %s' % (PORT + 1, BACKEND))
        sys.exit(1)

    try:
        servidor = Server(('0.0.0.0', PORT), Handler)
    except OSError as e:
        print('ERRO: nao consegui ligar na porta %d (%s).' % (PORT, e))
        print(como_liberar(PORT))
        sys.exit(1)

    # Dica de velocidade: no Windows, "localhost" resolve IPv6 primeiro e o
    # navegador perde ~2s por requisicao ate cair para IPv4. Por 127.0.0.1 e
    # instantaneo.
    print('Connect ONG em http://127.0.0.1:%d  (API -> %s)' % (PORT, BACKEND))
    print('(prefira 127.0.0.1 a localhost: no Windows e MUITO mais rapido)')
    servidor.serve_forever()
