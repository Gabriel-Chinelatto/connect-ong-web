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

    def do_GET(self):
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
    allow_reuse_address = True


if __name__ == '__main__':
    print('Connect ONG em http://localhost:%d  (API -> %s)' % (PORT, BACKEND))
    Server(('0.0.0.0', PORT), Handler).serve_forever()
