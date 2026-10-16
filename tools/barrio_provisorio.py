#!/usr/bin/env python3
"""Genera juego/datos/mapas/muldraugh.txt PROVISORIO: 6 manzanas de casas estilo Muldraugh
(una planta, revestimiento, patio con cerco) mientras no haya capturas del mapa original.
Se reemplaza por el mapa copiado de las referencias cuando estén.

Uso: python3 tools/barrio_provisorio.py [semilla]
"""
import random
import sys
from pathlib import Path

SEMILLA = int(sys.argv[1]) if len(sys.argv) > 1 else 1993
rnd = random.Random(SEMILLA)

CALLE, VEREDA = 6, 1
MZ_W, MZ_H = 26, 24          # manzana sin vereda
COLS, FILAS = 3, 2
W = COLS * MZ_W + (COLS + 1) * (CALLE + 2 * VEREDA)
H = FILAS * MZ_H + (FILAS + 1) * (CALLE + 2 * VEREDA)
PISOS = 2

casillas = [[[' '] * W for _ in range(H)] for _ in range(PISOS)]
norte = [[[' '] * W for _ in range(H + 1)] for _ in range(PISOS)]   # borde norte de (x,y)
oeste = [[[' '] * (W + 1) for _ in range(H)] for _ in range(PISOS)]  # borde oeste de (x,y)
objetos = []
inicio = None


def rect(z, x0, y0, w, h, c):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            casillas[z][y][x] = c


def caja(z, x0, y0, w, h, c='-', v='|'):
    for x in range(x0, x0 + w):
        norte[z][y0][x] = c
        norte[z][y0 + h][x] = c
    for y in range(y0, y0 + h):
        oeste[z][y][x0] = v
        oeste[z][y][x0 + w] = v


# Suelo base: pasto, calles y veredas.
rect(0, 0, 0, W, H, ',')
paso = CALLE + 2 * VEREDA
for i in range(COLS + 1):
    x = i * (MZ_W + paso)
    rect(0, x, 0, VEREDA, H, '_')
    rect(0, x + VEREDA, 0, CALLE, H, '=')
    rect(0, x + VEREDA + CALLE, 0, VEREDA, H, '_')
for j in range(FILAS + 1):
    y = j * (MZ_H + paso)
    rect(0, 0, y, W, VEREDA, '_')
    rect(0, 0, y + VEREDA, W, CALLE, '=')
    rect(0, 0, y + VEREDA + CALLE, W, VEREDA, '_')

MUEBLES_COCINA = ['a', 'b', 'm']
MUEBLES_LIVING = ['d', 'l', 'e']
MUEBLES_DORM = ['c', 'n', 'q', 'j']
MUEBLES_BAÑO = ['g', 'h', 'i']
ARMAS = ['bate', 'palo_amasar', 'sarten', 'cuchillo_cocina', 'martillo', 'hacha_bombero',
         'palanca', 'palo_golf', 'destornillador', 'pala']


def casa(x0, y0, w, h, frente_sur, dos_pisos=False):
    """Casa de w×h con living+cocina adelante y dormitorio+baño atrás."""
    global inicio
    rect(0, x0, y0, w, h, '.')
    caja(0, x0, y0, w, h)
    # Pared interior que separa frente y fondo, con una puerta.
    medio = y0 + h // 2
    for x in range(x0, x0 + w):
        norte[0][medio][x] = '-'
    norte[0][medio][x0 + w // 2] = 'D'
    # Pared que separa dormitorio y baño en el fondo.
    bx = x0 + w - 3
    fondo = range(y0, medio) if frente_sur else range(medio, y0 + h)
    for y in fondo:
        oeste[0][y][bx] = '|'
    oeste[0][list(fondo)[len(fondo) // 2]][bx] = 'D'
    # Puerta de calle y ventanas.
    yf = y0 + h if frente_sur else y0
    norte[0][yf][x0 + 2] = 'D'
    for x in range(x0 + 4, x0 + w - 1, 3):
        norte[0][yf][x] = 'W'
    yb = y0 if frente_sur else y0 + h
    norte[0][yb][x0 + 1] = 'W'
    norte[0][yb][x0 + w - 2] = 'W'
    oeste[0][y0 + 1][x0] = 'W'
    oeste[0][y0 + h - 2][x0 + w] = 'W'
    # Muebles.
    frente = range(medio, y0 + h) if frente_sur else range(y0, medio)
    fr = list(frente)
    fo = list(fondo)
    for i, m in enumerate(MUEBLES_COCINA):
        casillas[0][fr[-1] if frente_sur else fr[0]][x0 + w - 1 - i] = m
    casillas[0][fr[0] if frente_sur else fr[-1]][x0] = MUEBLES_LIVING[0]
    casillas[0][fr[0] if frente_sur else fr[-1]][x0 + 1] = MUEBLES_LIVING[1]
    casillas[0][fo[0]][x0] = 'c'
    casillas[0][fo[-1]][x0] = 'n'
    casillas[0][fo[0]][x0 + w - 1] = 'g'
    casillas[0][fo[-1]][x0 + w - 1] = 'h'
    if dos_pisos:
        rect(1, x0, y0, w, h, '.')
        caja(1, x0, y0, w, h)
        for x in range(x0 + 2, x0 + w - 1, 3):
            norte[1][y0][x] = 'W'
            norte[1][y0 + h][x] = 'W'
        sx, sy = x0 + w // 2 - 2, fr[1] if frente_sur else fr[-2]
        casillas[0][sy][sx] = 's' if frente_sur else 'S'
    # Objetos: un arma y una venda por casa.
    libres = [(x, y) for y in range(y0, y0 + h) for x in range(x0, x0 + w)
              if casillas[0][y][x] == '.']
    ax, ay = rnd.choice(libres)
    objetos.append((ax, ay, 0, rnd.choice(ARMAS)))
    vx, vy = rnd.choice(libres)
    objetos.append((vx, vy, 0, 'venda'))
    if inicio is None:
        ix, iy = rnd.choice([p for p in libres if p != (ax, ay) and p != (vx, vy)])
        casillas[0][iy][ix] = '@'
        inicio = (ix, iy)


# Cada manzana: 2 filas de lotes (frente norte y frente sur), 2-3 casas por fila.
dos_pisos_hecha = False
for j in range(FILAS):
    for i in range(COLS):
        mx = i * (MZ_W + paso) + paso
        my = j * (MZ_H + paso) + paso
        lotes = rnd.choice([[8, 9, 9], [13, 13], [9, 8, 9]])
        x = mx
        for k, lw in enumerate(lotes):
            for fila in (0, 1):
                ly = my if fila == 0 else my + MZ_H // 2
                frente_sur = fila == 1
                cw = lw - 2
                ch = rnd.choice([7, 8, 8, 9])
                cy = ly + (MZ_H // 2 - ch - 3 if frente_sur else 3)
                dos = (not dos_pisos_hecha and cw >= 7 and ch >= 8)
                casa(x + 1, cy, cw, ch, frente_sur, dos)
                dos_pisos_hecha = dos_pisos_hecha or dos
                # Cerco del fondo del lote y árbol en el patio.
                yfondo = ly + MZ_H // 2 if fila == 0 else ly
                for fx in range(x, x + lw):
                    norte[0][yfondo][fx] = 'f'
                tx = x + rnd.randrange(lw)
                ty = (ly + MZ_H // 2 - 2) if fila == 0 else ly + 1
                if casillas[0][ty][tx] == ',':
                    casillas[0][ty][tx] = 'T'
            x += lw

lineas = [f"# {W} {H} {PISOS}",
          "; PROVISORIO generado por tools/barrio_provisorio.py: reemplazar por Muldraugh copiado de las referencias"]
for z in range(PISOS):
    lineas.append(f"== piso {z}")
    for y in range(H + 1):
        fila = ''.join('+' + norte[z][y][x] for x in range(W)) + '+'
        lineas.append(fila.rstrip())
        if y < H:
            fila = ''.join(oeste[z][y][x] + casillas[z][y][x] for x in range(W)) + oeste[z][y][W]
            lineas.append(fila.rstrip())
lineas.append("== objetos")
lineas += [f"{x} {y} {z} {i}" for x, y, z, i in objetos]
salida = Path(__file__).resolve().parent.parent / "juego/datos/mapas/muldraugh.txt"
salida.parent.mkdir(parents=True, exist_ok=True)
salida.write_text('\n'.join(lineas) + '\n')
print(f"{salida}: {W}x{H}, {len(objetos) // 2} casas, inicio {inicio}")
