/**
 * SvgLibrary.ts
 * SVGをBase64エンコードして dataUrl を生成するユーティリティ
 * 外部依存なし。Node.js Buffer を使用。
 */

export function svgToDataUrl(svg: string): string {
  const b64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

// ---- 基本図形ジェネレーター ----

export function circle(color: string, size = 100, opts: { stroke?: string; strokeWidth?: number } = {}): string {
  const r = size / 2 - 3;
  const stroke = opts.stroke ? `stroke="${opts.stroke}" stroke-width="${opts.strokeWidth ?? 2}"` : '';
  return svgToDataUrl(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="${color}" ${stroke}/>` +
    `</svg>`
  );
}

export function ellipse(color: string, w = 100, h = 120, opts: { stroke?: string } = {}): string {
  const stroke = opts.stroke ? `stroke="${opts.stroke}" stroke-width="2"` : '';
  return svgToDataUrl(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
    `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2 - 4}" ry="${h/2 - 4}" fill="${color}" ${stroke}/>` +
    `</svg>`
  );
}

export function rect(color: string, w = 100, h = 80, opts: { rx?: number; stroke?: string } = {}): string {
  const rx = opts.rx ?? 8;
  const stroke = opts.stroke ? `stroke="${opts.stroke}" stroke-width="2"` : '';
  return svgToDataUrl(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="3" y="3" width="${w-6}" height="${h-6}" rx="${rx}" fill="${color}" ${stroke}/>` +
    `</svg>`
  );
}

export function star(color: string, size = 100): string {
  const cx = size / 2, cy = size / 2, r = size * 0.46;
  const points = Array.from({ length: 5 }, (_, i) => {
    const outer = (Math.PI / 2) + (i * 2 * Math.PI / 5);
    const inner = outer + Math.PI / 5;
    return [
      `${(cx + r * Math.cos(outer)).toFixed(1)},${(cy - r * Math.sin(outer)).toFixed(1)}`,
      `${(cx + r * 0.42 * Math.cos(inner)).toFixed(1)},${(cy - r * 0.42 * Math.sin(inner)).toFixed(1)}`
    ];
  }).flat().join(' ');
  return svgToDataUrl(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<polygon points="${points}" fill="${color}"/>` +
    `</svg>`
  );
}

export function diamond(color: string, size = 100): string {
  const h = size / 2;
  return svgToDataUrl(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<polygon points="${h},4 ${size-4},${h} ${h},${size-4} 4,${h}" fill="${color}"/>` +
    `</svg>`
  );
}

export function triangle(color: string, size = 100): string {
  return svgToDataUrl(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<polygon points="${size/2},4 ${size-4},${size-4} 4,${size-4}" fill="${color}"/>` +
    `</svg>`
  );
}

export function balloon(color: string, w = 100, h = 120): string {
  return svgToDataUrl(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
    `<ellipse cx="${w/2}" cy="${h*0.42}" rx="${w/2-4}" ry="${h*0.42-2}" fill="${color}"/>` +
    `<line x1="${w/2}" y1="${h*0.84}" x2="${w/2}" y2="${h-2}" stroke="#999" stroke-width="2"/>` +
    `</svg>`
  );
}

export function face(color: string, size = 100, smile = true): string {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const smilePath = smile
    ? `<path d="M${cx-r*0.4} ${cy+r*0.2} Q${cx} ${cy+r*0.5} ${cx+r*0.4} ${cy+r*0.2}" stroke="#333" stroke-width="3" fill="none"/>`
    : `<path d="M${cx-r*0.4} ${cy+r*0.4} Q${cx} ${cy+r*0.15} ${cx+r*0.4} ${cy+r*0.4}" stroke="#333" stroke-width="3" fill="none"/>`;
  return svgToDataUrl(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>` +
    `<circle cx="${cx-r*0.3}" cy="${cy-r*0.15}" r="${r*0.1}" fill="#333"/>` +
    `<circle cx="${cx+r*0.3}" cy="${cy-r*0.15}" r="${r*0.1}" fill="#333"/>` +
    smilePath +
    `</svg>`
  );
}

export function basket(color = '#8B4513', w = 140, h = 80): string {
  return svgToDataUrl(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="6" y="8" width="${w-12}" height="${h-16}" rx="10" fill="${color}"/>` +
    `<line x1="6" y1="8" x2="${w-6}" y2="8" stroke="#5a2d0c" stroke-width="4"/>` +
    `<line x1="${w*0.33}" y1="8" x2="${w*0.33}" y2="${h-8}" stroke="#5a2d0c" stroke-width="2"/>` +
    `<line x1="${w*0.66}" y1="8" x2="${w*0.66}" y2="${h-8}" stroke="#5a2d0c" stroke-width="2"/>` +
    `</svg>`
  );
}

export function button(label: string, color = '#4CAF50', textColor = '#fff', w = 200, h = 80): string {
  const fontSize = Math.min(28, Math.floor(w / (label.length * 0.7 + 1)));
  return svgToDataUrl(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="4" y="4" width="${w-8}" height="${h-8}" rx="14" fill="${color}"/>` +
    `<text x="${w/2}" y="${h/2+fontSize*0.35}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="${textColor}" font-family="Arial">${label}</text>` +
    `</svg>`
  );
}

export function coin(color = '#FFD700', size = 80): string {
  return svgToDataUrl(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${size/2}" cy="${size/2}" r="${size/2-3}" fill="${color}" stroke="#cc9900" stroke-width="3"/>` +
    `<text x="${size/2}" y="${size*0.62}" text-anchor="middle" font-size="${size*0.38}" font-weight="bold" fill="#cc9900" font-family="Arial">$</text>` +
    `</svg>`
  );
}

export function bomb(size = 90): string {
  return svgToDataUrl(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${size*0.52}" cy="${size*0.56}" r="${size*0.38}" fill="#222"/>` +
    `<line x1="${size*0.52}" y1="${size*0.18}" x2="${size*0.7}" y2="${size*0.05}" stroke="#888" stroke-width="4"/>` +
    `<circle cx="${size*0.7}" cy="${size*0.05}" r="${size*0.07}" fill="#ff6600"/>` +
    `</svg>`
  );
}

// ---- カラーパレット ----

export const COLORS = {
  red:    '#E53935', orange: '#F57C00', yellow: '#FDD835',
  green:  '#43A047', teal:   '#00897B', blue:   '#1E88E5',
  indigo: '#3949AB', purple: '#8E24AA', pink:   '#E91E63',
  brown:  '#6D4C41', gray:   '#757575', lime:   '#C0CA33',
  cyan:   '#00ACC1', amber:  '#FFB300', white:  '#FAFAFA',
};

export const BG_COLORS = {
  sky:    '#87CEEB', night:  '#1a1a2e', dusk:   '#2c1654',
  forest: '#2d5a27', ocean:  '#006994', sunset: '#ff6b35',
  cream:  '#FFF8E7', mint:   '#e0f7e9', lavender: '#e8e0f0',
  dark:   '#1e1e1e', bright: '#fff9c4',
};

export type ColorName = keyof typeof COLORS;
export type BgColorName = keyof typeof BG_COLORS;
