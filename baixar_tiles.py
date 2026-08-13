#!/usr/bin/env python3
"""
Pre-carga do cache de mapa para a FEIRA (roda com internet, uma vez).

Baixa os tiles do CARTO/OpenStreetMap para tiles-cache/:
  - Brasil inteiro nos zooms 4 a 7 (visao por estado/area do mapa da web);
  - Regiao de Limeira/Campinas/Piracicaba nos zooms 8 a 13 (visao de detalhe).

Com isso o mapa da web funciona SEM internet no estande (o serve.py serve
esses arquivos pela rota /tiles/). Rodar de novo e seguro: pula o que ja tem.

Uso:  python baixar_tiles.py
"""
import math
import os
import sys
import time
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
DESTINO = os.path.join(AQUI, 'tiles-cache')
UPSTREAM = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/%d/%d/%d.png'

# (nome, lat_min, lat_max, lon_min, lon_max, zoom_min, zoom_max)
AREAS = [
    ('Brasil', -34.0, 5.5, -74.5, -33.5, 4, 7),
    ('Limeira/Campinas', -23.3, -22.2, -47.9, -46.7, 8, 13),
]


def tile_x(lon, z):
    return int((lon + 180.0) / 360.0 * (1 << z))


def tile_y(lat, z):
    rad = math.radians(lat)
    return int((1.0 - math.log(math.tan(rad) + 1.0 / math.cos(rad)) / math.pi) / 2.0 * (1 << z))


def main():
    baixados = pulados = erros = 0
    for nome, lat_min, lat_max, lon_min, lon_max, z_min, z_max in AREAS:
        for z in range(z_min, z_max + 1):
            x0, x1 = tile_x(lon_min, z), tile_x(lon_max, z)
            # y cresce para o SUL: lat_max (norte) da o y menor
            y0, y1 = tile_y(lat_max, z), tile_y(lat_min, z)
            total = (x1 - x0 + 1) * (y1 - y0 + 1)
            print(f'{nome} z{z}: {total} tiles')
            for x in range(x0, x1 + 1):
                for y in range(y0, y1 + 1):
                    arq = os.path.join(DESTINO, str(z), str(x), f'{y}.png')
                    if os.path.isfile(arq):
                        pulados += 1
                        continue
                    try:
                        req = urllib.request.Request(
                            UPSTREAM % (z, x, y),
                            headers={'User-Agent': 'ConnectONG-feira/1.0'})
                        with urllib.request.urlopen(req, timeout=20) as resp:
                            dado = resp.read()
                        os.makedirs(os.path.dirname(arq), exist_ok=True)
                        with open(arq, 'wb') as f:
                            f.write(dado)
                        baixados += 1
                        time.sleep(0.05)  # gentileza com o servidor gratuito
                    except Exception as ex:
                        erros += 1
                        print(f'  erro em {z}/{x}/{y}: {ex}', file=sys.stderr)
    print(f'\nPronto: {baixados} baixados, {pulados} ja existiam, {erros} erros.')
    return 1 if erros and not baixados else 0


if __name__ == '__main__':
    sys.exit(main())
