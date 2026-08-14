/**
 * OLA6 PIEZA D — el cifrado de la copia local.
 *
 * La ficha de emergencia guarda datos médicos en el teléfono para poder abrir
 * sin red y sin sesión. Ese cifrado se escribió a mano porque el proyecto no
 * tiene paquete de cripto y meter uno obliga a build nativo. Escrito a mano
 * significa que hay que demostrarlo, no confiar en él:
 *
 *   · SHA-256 y HMAC-SHA256 contra la implementación de node.
 *   · ChaCha20 contra el vector de la RFC 8439 §2.4.2.
 *   · base64 contra Buffer.
 *   · El sobre: abre con su llave, no abre con otra, detecta manipulación.
 */
import { describe, it, expect } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import {
  sha256, hmacSha256, chacha20, utf8Encode, utf8Decode,
  base64Encode, base64Decode, bytesToHex, hexToBytes,
  sealLocal, openLocal, randomKeyHex,
} from '../local-crypto-core';

describe('SHA-256', () => {
  // Los largos frontera del padding: 55/56 y 63/64/65 son donde truena todo
  // el mundo que implementa esto a mano.
  it.each([0, 1, 55, 56, 63, 64, 65, 119, 120, 1000, 5000])('largo %i igual que node', (n) => {
    const buf = Buffer.alloc(n);
    for (let i = 0; i < n; i++) buf[i] = (i * 31 + 7) & 0xff;
    expect(bytesToHex(sha256(new Uint8Array(buf)))).toBe(createHash('sha256').update(buf).digest('hex'));
  });
});

describe('HMAC-SHA256', () => {
  it.each([1, 32, 64, 65, 200])('llave de %i bytes igual que node', (kl) => {
    const key = Buffer.alloc(kl, 0xab);
    const msg = Buffer.from('ficha de emergencia ATP '.repeat(9));
    expect(bytesToHex(hmacSha256(new Uint8Array(key), new Uint8Array(msg))))
      .toBe(createHmac('sha256', key).update(msg).digest('hex'));
  });
});

describe('ChaCha20', () => {
  it('reproduce el vector de la RFC 8439 §2.4.2', () => {
    const key = new Uint8Array(32);
    for (let i = 0; i < 32; i++) key[i] = i;
    const nonce = hexToBytes('000000000000004a00000000');
    const pt = "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.";
    expect(bytesToHex(chacha20(key, nonce, 1, utf8Encode(pt)))).toBe(
      '6e2e359a2568f98041ba0728dd0d6981e97e7aec1d4360c20a27afccfd9fae0bf91b65c5524733ab8f593dabcd62b357'
      + '1639d624e65152ab8f530c359f0861d807ca0dbf500d6a6156a38e088a22b65e52bc514d16ccf806818ce91ab779373'
      + '65af90bbf74a35be6b40b8eedf2785e42874d',
    );
  });

  it('cifrar y descifrar son la misma función', () => {
    const key = hexToBytes(randomKeyHex());
    const nonce = hexToBytes(randomKeyHex()).slice(0, 12);
    const datos = utf8Encode('Alérgica a penicilina');
    expect(bytesToHex(chacha20(key, nonce, 1, chacha20(key, nonce, 1, datos)))).toBe(bytesToHex(datos));
  });
});

describe('UTF-8 y base64', () => {
  it('sobrevive a acentos, eñes y emoji', () => {
    const raro = 'Alérgica a penicilina · niña 😀 ñÑ áéíóú «cardio»';
    expect(utf8Decode(utf8Encode(raro))).toBe(raro);
  });

  it.each([0, 1, 2, 3, 4, 5, 100, 101, 102])('base64 de %i bytes igual que Buffer', (n) => {
    const b = new Uint8Array(n);
    for (let i = 0; i < n; i++) b[i] = (i * 77) & 0xff;
    expect(base64Encode(b)).toBe(Buffer.from(b).toString('base64'));
    expect(bytesToHex(base64Decode(base64Encode(b)))).toBe(bytesToHex(b));
  });
});

describe('el sobre local', () => {
  const contenido = JSON.stringify({ sangre: 'O+', alergias: ['penicilina'], nota: 'ñandú 😀' });

  it('abre con su llave', () => {
    const k = randomKeyHex();
    expect(openLocal(k, sealLocal(k, contenido))).toBe(contenido);
  });

  it('NO abre con otra llave', () => {
    expect(openLocal(randomKeyHex(), sealLocal(randomKeyHex(), contenido))).toBeNull();
  });

  it('detecta que le movieron un byte al criptograma', () => {
    const k = randomKeyHex();
    const partes = sealLocal(k, contenido).split('.');
    const ct = base64Decode(partes[2]);
    ct[0] ^= 1;
    expect(openLocal(k, [partes[0], partes[1], base64Encode(ct), partes[3]].join('.'))).toBeNull();
  });

  it.each(['', 'nada', 'atp1.a.b.c', 'otro.formato.aqui.va'])('basura (%s) devuelve null sin tronar', (blob) => {
    expect(openLocal(randomKeyHex(), blob)).toBeNull();
  });

  it('el nonce no se repite entre escrituras', () => {
    const k = randomKeyHex();
    const nonces = new Set(Array.from({ length: 200 }, () => sealLocal(k, 'x').split('.')[1]));
    expect(nonces.size).toBe(200);
  });
});
