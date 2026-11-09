// Raw DEFLATE decoder (RFC 1951), synchronous, used to unpack the embedded map data at start-up.
// The build stores large data as base64 of zlib's deflateRaw output; this keeps index.html about half the size.
function inflateRaw(src) {
  let pos = 0,
    bit = 0,
    out = new Uint8Array(src.length * 4),
    n = 0;
  const need = (k) => {
    if (n + k <= out.length) return;
    const o = new Uint8Array(Math.max(out.length * 2, n + k));
    o.set(out);
    out = o;
  };
  const bits = (k) => {
    let v = 0;
    for (let i = 0; i < k; i++) {
      v |= ((src[pos] >> bit) & 1) << i;
      if (++bit === 8) ((bit = 0), pos++);
    }
    return v;
  };
  // canonical Huffman table: counts per length + symbols sorted by code
  const table = (lens) => {
    const count = new Uint16Array(16),
      offs = new Uint16Array(16),
      sym = new Uint16Array(lens.length);
    for (const l of lens) count[l]++;
    count[0] = 0;
    for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1];
    lens.forEach((l, s) => l && (sym[offs[l]++] = s));
    return { count, sym };
  };
  const decode = (t) => {
    let code = 0,
      first = 0,
      index = 0;
    for (let len = 1; len < 16; len++) {
      code |= bits(1);
      const c = t.count[len];
      if (code - first < c) return t.sym[index + code - first];
      index += c;
      first = (first + c) << 1;
      code <<= 1;
    }
    throw new Error('bad deflate data');
  };
  const LB = [
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
  ];
  const LE = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DB = [
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
    8193, 12289, 16385, 24577,
  ];
  const DE = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const fixedL = table([...Array(288)].map((_, i) => (i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8)));
  const fixedD = table(Array(30).fill(5));
  let last = 0;
  while (!last) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      if (bit) ((bit = 0), pos++);
      const len = src[pos] | (src[pos + 1] << 8);
      pos += 4;
      need(len);
      out.set(src.subarray(pos, pos + len), n);
      n += len;
      pos += len;
      continue;
    }
    let lt = fixedL,
      dt = fixedD;
    if (type === 2) {
      const hlit = bits(5) + 257,
        hdist = bits(5) + 1,
        hclen = bits(4) + 4;
      const order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
      const cl = new Array(19).fill(0);
      for (let i = 0; i < hclen; i++) cl[order[i]] = bits(3);
      const ct = table(cl);
      const lens = [];
      while (lens.length < hlit + hdist) {
        const s = decode(ct);
        if (s < 16) lens.push(s);
        else if (s === 16) {
          const p = lens[lens.length - 1];
          for (let r = 3 + bits(2); r; r--) lens.push(p);
        } else for (let r = s === 17 ? 3 + bits(3) : 11 + bits(7); r; r--) lens.push(0);
      }
      lt = table(lens.slice(0, hlit));
      dt = table(lens.slice(hlit));
    } else if (type !== 1) throw new Error('bad deflate block');
    for (;;) {
      const s = decode(lt);
      if (s < 256) {
        need(1);
        out[n++] = s;
      } else if (s === 256) break;
      else {
        const len = LB[s - 257] + bits(LE[s - 257]);
        const ds = decode(dt);
        const dist = DB[ds] + bits(DE[ds]);
        need(len);
        for (let i = 0; i < len; i++, n++) out[n] = out[n - dist];
      }
    }
  }
  return out.subarray(0, n);
}
// base64 (deflateRaw) -> text
function unpackText(b64) {
  const bin = atob(b64),
    u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(inflateRaw(u));
}
const JSPDF_Z = /*__JSPDF_Z__*/ '';
// jsPDF (PDF export) is unpacked the first time it is needed
function loadJsPDF() {
  if (!window.jspdf && JSPDF_Z) (0, eval)(unpackText(JSPDF_Z));
  return window.jspdf;
}
// base64 (deflateRaw) -> parsed JSON
function unpackJSON(b64) {
  const bin = atob(b64),
    u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(inflateRaw(u)));
}
