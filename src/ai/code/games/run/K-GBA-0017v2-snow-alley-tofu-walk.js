// K-GBA-0017v2-snow-alley-tofu-walk.js
// 粉雪路地の豆腐売り — 足音の拍ごとに左右の足で一歩ずつ歩き、坂の上から転がる樽は拍の頭で両足そろえて跳び越える
// 操作: 画面の左半分=左足、右半分=右足。拍の頭ごとに左→右→左…と交互に押して一歩進む(光る足跡が次の足)。樽が足元に来る拍は左右を同時に押して跳ぶ。足違い・拍外れ・片足だけはMISS
// 終わり: 8小節(32拍)を歩き切ればCLEAR(判定の点+樽越え+残りの豆腐)。滑る・樽にぶつかるが4回でGAME OVER
// @mechanic: camera_run
// @theme: snowy_castle_town_tofu_peddler
// 世界観: 粉雪の舞う城下の路地。天秤棒に豆腐桶を担いだ豆腐売りが足音の拍ごとに一歩ずつ売り歩き、坂の上の酒蔵から転がってくる空き樽を両足で跳び越えて路地を抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・跳び越えた樽の数・最大コンボ
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var STYLE = { bg: ['#1e2a44', '#8592b0'], main: ['#2c4a8a', '#a8743f', '#f2efe6'], accent: ['#ffc65a', '#d8402e'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 物は板(sprite)のまま距離で px を変え、真下に楕円の接地影。奥のものほど霧色に寄せて彩度を落とす
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], indigo: STYLE.main[0], wood: STYLE.main[1], snow: STYLE.main[2],
    lamp: STYLE.accent[0], red: STYLE.accent[1],
    fog: '#9aa6c2', plaster: '#e6dccb', beam: '#4a3226', roof: '#3a3f52', stone: '#cdd4e2', stone2: '#b2bbcd',
    track: '#7d879e', ink: '#0e1320', white: '#ffffff', good: '#5ad08a', gold: '#ffe08a', pad: '#26314a', pad2: '#34405e'
  };

  var GAME_TITLE = 'TOFU WALK';
  var BPM = 104, SPB = 60 / BPM;
  var PERFECT_W = 0.07, GOOD_W = 0.15, PAIR_W = 0.12;
  var READY_T = 0.8;
  var LIVES = 4;
  var FIRST = 2, LAST = 33;                 // 拍2〜33 の32拍を歩く(拍0〜1は足音の前ノリ)
  var BARRELS = [9, 13, 15, 17, 19, 21, 24, 25, 27, 29, 31, 33];
  var TIME_LIMIT = 20.5;
  var HZ = 640, KY = 1320, KX = 840, HW = 1600, Z0 = 2;   // 地平線と奥行き射影
  var SELLER_Y = 1300;
  var BARREL_V = 5.8;                       // 樽の相対速度(奥行き/秒): 3拍前に霧の奥から現れる
  var PAD_Y = Math.round(H * 0.776), PAD_H = 350;
  var DEMO_FROM = 5.5, DEMO_TO = 14.5, DEMO_FAIL = 13;
  var DEMO_CYC = (DEMO_TO - DEMO_FROM) * SPB;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 伴奏(オリジナル): 雪の朝の物売りの節。ベースが毎拍(=足音)を刻む
  var TUNE = [
    [['D5', 0.5], ['F5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['F5', 1]],
    [['D5', 0.5], ['C5', 0.5], ['D5', 1], ['F5', 1], ['R', 1]],
    [['A5', 0.5], ['C6', 0.5], ['A5', 1], ['G5', 0.5], ['F5', 0.5], ['G5', 1]],
    [['F5', 0.5], ['D5', 0.5], ['C5', 1], ['D5', 1.5], ['R', 0.5]]
  ];
  var BASS = [
    [['D3', 1], ['A2', 1], ['D3', 1], ['A2', 1]],
    [['Bb2', 1], ['F2', 1], ['Bb2', 1], ['F2', 1]],
    [['F2', 1], ['C3', 1], ['F2', 1], ['C3', 1]],
    [['C3', 1], ['G2', 1], ['A2', 1], ['A2', 1]]
  ];

  // ---- スプライト(後ろ姿の豆腐売り: 頬かむり・半纏・天秤棒と二つの桶) ----
  var TOP = [
    '..........hhhh..........',
    '.........hhhhhh.........',
    '.........hhkkhh.........',
    '..........kkkk..........',
    'pppppppppppppppppppppppp',
    '.r.......iiiiii.......r.',
    '.r......iiiiiiii......r.',
    '.r......iwiiiiwi......r.',
    '.r......iiiiiiii......r.',
    'bbbb....iiiiiiii....bbbb',
    'bWWb.....iiiiii.....bWWb',
    'bbbb.....nnnnnn.....bbbb'
  ];
  var SELLER_L = TOP.concat(['.bb......nn..nn......bb.', '.........nn..nn.........', '.........gg..nn.........', '.............gg.........']);
  var SELLER_R = TOP.concat(['.bb......nn..nn......bb.', '.........nn..nn.........', '.........nn..gg.........', '.........gg.............']);
  var SELLER_AIR = TOP.concat(['.bb.....nn....nn.....bb.', '........gg....gg........', '........................', '........................']);
  var SELLER_SLIP = TOP.concat(['.bb.....nn....nn.....bb.', '.......nn......nn.......', '......gg........gg......', '........................']);
  var SELLER_PAL = { h: '#f0ece0', k: '#2a1a12', p: '#8a5a32', r: '#6a5040', i: '#2c4a8a', w: '#e8e8f0', b: '#a8743f', W: '#ffffff', n: '#1c2440', g: '#c8a070' };
  var SELLER_WHITE = { h: '#ffffff', k: '#ffffff', p: '#ffffff', r: '#ffffff', i: '#ffffff', w: '#ffffff', b: '#ffffff', W: '#ffffff', n: '#ffffff', g: '#ffffff' };

  // 転がってくる空き樽(正面から見た横倒しの樽。板目の筋が手前へ流れる2コマ)
  var BARREL_A = ['..oo######oo..', '.oo########oo.', 'oo##########oo', 'o#----------#o', 'o############o', 'o############o', 'o#----------#o', '.oo########oo.', '..oo######oo..'];
  var BARREL_B = ['..oo######oo..', '.oo########oo.', 'oo----------oo', 'o############o', 'o############o', 'o#----------#o', 'o############o', '.oo########oo.', '..oo######oo..'];
  var BARREL_PAL = { o: '#3a3438', '#': '#9a6a3a', '-': '#6e4a28' };
  var BARREL_WHITE = { o: '#ffffff', '#': '#ffffff', '-': '#ffffff' };
  var LANTERN = ['..kk..', '.rrrr.', 'rrwwrr', 'rrrrrr', 'rrwwrr', '.rrrr.', '..kk..'];
  var LANTERN_PAL = { k: '#2a2020', r: '#d8402e', w: '#ffd27a' };
  var CASTLE = ['.....##.....', '....####....', '..########..', '.....ww.....', '...######...', '.##########.', '....wwww....', '..########..', '############', '...wwwwww...', '...wwwwww...', '..ssssssss..', '.ssssssssss.'];
  var FOOT = ['..#.#.##..', '..........', '..######..', '.########.', '.########.', '.#######..', '..######..', '..#####...', '..........', '..#####...', '..######..', '..#####...'];
  var TOFU = ['bbbbbbb', 'bwwwwwb', 'bwwwwwb', 'bwwwwwb', 'bbbbbbb'];
  var TOFU_PAL = { b: '#7fa6d8', w: '#ffffff' };
  var TOFU_DIM = { b: '#3a4868', w: '#26314a' };
  var CHEVRON = ['...##...', '..####..', '.##..##.', '##....##'];

  // ---- 色(奥ほど霧色へ寄せる) ----
  var mixCache = {};
  function mix(a, b, t) {
    var key = a + b + t;
    if (mixCache[key]) return mixCache[key];
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    var g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    var bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    var out = '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
    mixCache[key] = out;
    return out;
  }
  function fogPal(pal, t) { var o = {}; for (var k in pal) o[k] = mix(pal[k], C.fog, t); return o; }
  function fogLevel(z) { return z < 4 ? 0 : (z < 8 ? 1 : 2); }
  var BARREL_FOG = [BARREL_PAL, fogPal(BARREL_PAL, 0.3), fogPal(BARREL_PAL, 0.6)];
  var LANTERN_FOG = [LANTERN_PAL, fogPal(LANTERN_PAL, 0.3), fogPal(LANTERN_PAL, 0.6)];
  var CASTLE_PAL = fogPal({ '#': '#3a3f52', w: '#e6dccb', s: '#5a5e6e' }, 0.55);

  // ---- 状態 ----
  var res, nextFoot, lives, score, combo, maxCombo, nP, nG, nM, jumped, clock, lastBeat, cuedBar;
  var pending, over, won, outroT, hitStop, demoMode, prevBest, failBeat;
  var camZ, camTarget, airT, slipT, flashT, padFlash, stepFrame, warnLine;
  var beatPulse = 0;
  var flakes = [];
  for (var fi = 0; fi < 70; fi++) flakes.push({ x: game.random(0, W), y: game.random(0, 1450), z: game.random(0.2, 1), p: game.random(0, 6) });

  function isBarrel(k) { return BARRELS.indexOf(k) >= 0; }

  function initRun(demo) {
    demoMode = !!demo;
    res = {}; nextFoot = 0; lives = LIVES; score = 0; combo = 0; maxCombo = 0; nP = 0; nG = 0; nM = 0; jumped = 0;
    clock = -READY_T; lastBeat = -99; cuedBar = -1; pending = null;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best; failBeat = FIRST;
    camZ = 0; camTarget = 0; airT = 9; slipT = 9; flashT = 0; padFlash = [0, 0]; stepFrame = 0; warnLine = 0;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 判定(拍の頭からのずれ) ----
  function grade(ad) { return ad <= PERFECT_W ? 1 : 2; }

  function hit(k, g, isJump) {
    res[k] = g;
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (g === 1) nP++; else nG++;
    score += Math.round((g === 1 ? 100 : 50) * (1 + Math.min(20, combo) * 0.05)) + (isJump ? 60 : 0);
    camTarget += 0.5;
    if (isJump) { jumped++; airT = 0; sfx('se_jump', 0.3); } else stepFrame = 1 - stepFrame;
    game.feedback.good(540, SELLER_Y - 330, { text: g === 1 ? 'PERFECT' : 'GOOD', color: g === 1 ? C.gold : C.good, size: g === 1 ? 54 : 44, count: isJump ? 14 : 6, volume: demoMode ? 0 : 0.3 });
    if (!demoMode && combo % 8 === 0) {
      game.fx.popup(combo + ' COMBO', 540, 420, { color: C.lamp, size: 70 });
      sfx('se_milestone', 0.4);
    }
  }

  function miss(k, kind) {
    if (k !== null) res[k] = 3;
    combo = 0; nM++;
    if (!demoMode) lives--;
    slipT = 0; flashT = 0.3;
    var last = !demoMode && lives <= 0;
    if (kind === 'barrel') sfx('se_break', 0.35);
    game.feedback.bad(540, SELLER_Y - 300, { text: 'MISS', shake: last ? 18 : (demoMode ? 3 : 9), volume: demoMode ? 0 : 0.5 });
    if (last) { hitStop = 0.45; failBeat = k === null ? FIRST : k; finish(false); }
  }

  function stray(foot) {
    combo = 0;
    game.fx.burst(foot === 0 ? 285 : 795, PAD_Y + 60, { color: '#7d879e', count: 4, speed: 90 });
    sfx('se_tap', 0.15);
  }

  function press(foot) {
    padFlash[foot] = 0.14;
    if (over) return;
    tone(foot === 0 ? 300 : 340, 0.05, { wave: 'triangle', volume: 0.12 });   // 下駄の音(押した瞬間)
    var t = clock;
    if (pending) {
      // 樽の拍: 片足を押した直後にもう片方 → 両足そろえて跳ぶ
      if (pending.foot !== foot) {
        var pk = pending.k, ad2 = Math.abs(t - pk * SPB);
        var g = grade(Math.min(GOOD_W, (pending.ad + ad2) / 2));
        pending = null;
        hit(pk, g, true);
      }
      return;
    }
    if (t < FIRST * SPB - GOOD_W) { stray(foot); return; }
    var k = Math.round(t / SPB), ad = Math.abs(t - k * SPB);
    if (k < FIRST || k > LAST || ad > GOOD_W) { stray(foot); return; }
    if (res[k]) return;                        // 同じ拍の二度押しは無視
    if (isBarrel(k)) { pending = { k: k, foot: foot, t: t, ad: ad }; return; }
    var right = foot === nextFoot;
    nextFoot = 1 - nextFoot;
    if (right) hit(k, grade(ad), false); else miss(k, 'slip');
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    if (ok) {
      score += lives * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 700 + (i % 2) * 140, { color: [C.lamp, C.snow, C.red][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.white, 0.15);
      sfx('se_success', 0.55);
    } else {
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, perfect: nP, good: nG, miss: nM, barrels: jumped, maxCombo: maxCombo };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', 540, H * 0.24, { color: C.lamp, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 拍クロック: 毎拍に足音、小節頭で節を出す。樽の1拍前(0.58秒前)に予告音
  function beatClock() {
    var nb = Math.floor((clock + 0.06) / (4 * SPB));
    if (!demoMode && nb > cuedBar && nb >= 0 && nb * 4 <= LAST) {
      cuedBar = nb;
      var i = nb % TUNE.length;
      game.audio.melody(TUNE[i], { tempo: BPM, wave: 'square', volume: 0.035, bass: BASS[i], bassVolume: 0.07 });
    }
    var bi = Math.floor(clock / SPB);
    if (bi !== lastBeat) {
      lastBeat = bi;
      if (clock >= 0 && bi <= LAST) {
        beatPulse = 1;
        tone(bi % 4 === 0 ? 1180 : 880, 0.03, { wave: 'square', volume: 0.05 });
        if (!demoMode && bi === FIRST + 16) {
          // 折り返し(16拍)のマイルストーン
          game.fx.popup('16 / 32', 540, 520, { color: C.snow, size: 60 });
          sfx('se_milestone', 0.4);
        }
        if (isBarrel(bi + 1) && !res[bi + 1]) {
          warnLine = 0.65;
          tone('E6', 0.06, { wave: 'square', volume: 0.07 });
          tone('B5', 0.09, { wave: 'square', volume: 0.05 });
        }
      }
    }
  }

  function stepRun(dt) {
    clock += dt;
    airT += dt; slipT += dt;
    if (flashT > 0) flashT -= dt;
    if (warnLine > 0) warnLine -= dt;
    if (padFlash[0] > 0) padFlash[0] -= dt;
    if (padFlash[1] > 0) padFlash[1] -= dt;
    camZ += (camTarget - camZ) * Math.min(1, dt * 10);
    beatClock();
    if (over) return;
    if (pending && clock - pending.t > PAIR_W) {
      var pk = pending.k;
      pending = null;
      miss(pk, 'barrel');                      // 片足だけ → 樽に足をとられる
      if (over) return;
    }
    for (var k = FIRST; k <= LAST; k++) {
      if (res[k] || (pending && pending.k === k)) continue;
      if (clock <= k * SPB + GOOD_W) break;
      if (isBarrel(k)) miss(k, 'barrel');
      else { nextFoot = 1 - nextFoot; miss(k, 'slip'); }
      if (over) return;
    }
    if (clock > LAST * SPB + GOOD_W + 0.15 || clock > TIME_LIMIT) finish(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0) return;
    var foot = x < W / 2 ? 0 : 1;
    game.fx.burst(x, Math.max(y, PAD_Y), { color: C.snow, count: 3, speed: 70 });
    press(foot);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function roundRect(x, y, w, h, r, col, a) {
    game.draw.rect(x + r, y, w - r * 2, h, col, a);
    game.draw.rect(x, y + r, r, h - r * 2, col, a);
    game.draw.rect(x + w - r, y + r, r, h - r * 2, col, a);
    game.draw.circle(x + r, y + r, r, col, a); game.draw.circle(x + w - r, y + r, r, col, a);
    game.draw.circle(x + r, y + h - r, r, col, a); game.draw.circle(x + w - r, y + h - r, r, col, a);
  }
  function ring(x, y, r, col, wdt) {
    var n = 28, px = x + r, py = y;
    for (var i = 1; i <= n; i++) {
      var a = i / n * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      game.draw.line(px, py, nx, ny, col, wdt || 8);
      px = nx; py = ny;
    }
  }
  function ellipse(x, y, rx, ry, col, a) {
    var step = Math.max(2, ry / 5);
    for (var dy = -ry; dy < ry; dy += step) {
      var m = dy + step / 2, w = rx * Math.sqrt(Math.max(0, 1 - (m * m) / (ry * ry)));
      game.draw.rect(x - w, y + dy, w * 2, step, col, a);
    }
  }
  function gy(z) { return HZ + KY / z; }
  function gx(u, z) { return 540 + u * KX / z; }

  function drawSky() {
    game.draw.gradient(0, HZ + 6, [[0, C.sky0], [0.7, C.sky1], [1, C.fog]]);
    for (var m = 0; m < 6; m++) game.draw.rect(m * 200 - 40, HZ - 60 - (m % 3) * 26, 240, 66 + (m % 3) * 26, '#6c7896', 0.5);
    game.draw.sprite(CASTLE, CASTLE_PAL, 540, HZ - 70, 7, { anchor: 'center' });
  }

  function drawGround() {
    for (var y = HZ; y < 1470; y += 6) {
      var z = KY / (y + 3 - HZ);
      var band = Math.floor((z + camZ) * 2) & 1;
      var lvl = Math.round(Math.min(0.8, z / 16) * 8) / 8;
      game.draw.rect(0, y, W, 6, mix(band ? C.stone : C.stone2, C.fog, lvl));
      var tw = 0.3 * KX / z;
      game.draw.rect(540 - tw, y, tw * 2, 6, C.track, 0.3 * (1 - lvl));
    }
  }

  function drawWalls() {
    var NS = 34, zf = 16, zn = 0.85;
    for (var i = 0; i < NS; i++) {
      var za = zf * Math.pow(zn / zf, i / NS), zb = zf * Math.pow(zn / zf, (i + 1) / NS), zm = (za + zb) / 2;
      var base = gy(zm), hh = HW / zm;
      var house = Math.floor((zm + camZ) / 1.6);
      var lvl = Math.max(0, Math.round(Math.min(0.85, (zm - 1) / 13) * 8) / 8);
      var body = mix(house % 3 === 1 ? C.beam : C.plaster, C.fog, lvl);
      var skirt = mix(C.beam, C.fog, lvl), eave = mix(C.roof, C.fog, lvl), snowc = mix(C.snow, C.fog, lvl);
      var post = Math.floor((zb + camZ) / 1.6) !== house;
      for (var s = -1; s <= 1; s += 2) {
        var xa = gx(s, za), xb = gx(s, zb);
        var x0 = Math.min(xa, xb), w = Math.abs(xb - xa) + 1;
        if (x0 > W || x0 + w < 0) continue;
        game.draw.rect(x0, base - hh, w, hh, body);
        game.draw.rect(x0, base - hh * 0.3, w, hh * 0.3, skirt);
        game.draw.rect(x0, base - hh * 1.08, w, hh * 0.1, eave);
        game.draw.rect(x0, base - hh * 1.12, w, hh * 0.045, snowc);
        game.draw.rect(x0, base - hh * 0.05, w, hh * 0.06, snowc);
        if (post) game.draw.rect(xb - (s < 0 ? 0 : 6 * Z0 / zb), base - hh * 1.04, 6 * Z0 / zb, hh * 1.04, skirt);
      }
    }
  }

  function drawLanterns() {
    var first = Math.floor((camZ - 0.8) / 1.6);
    for (var h = first + 11; h >= first; h--) {
      var z = h * 1.6 + 0.8 - camZ;
      if (z < 1.0 || z > 15) continue;
      var s = (h % 2 === 0) ? -1 : 1;
      var x = gx(s * 0.86, z), y = gy(z) - 0.62 * HW / z;
      var lv = fogLevel(z);
      game.draw.circle(x, y, 70 * Z0 / z, C.lamp, 0.14 - lv * 0.03);
      game.draw.sprite(LANTERN, LANTERN_FOG[lv], x, y, 9 * Z0 / z, { anchor: 'center' });
    }
  }

  function barrelZ(k) { return Z0 + (k * SPB - clock) * BARREL_V; }

  function drawBarrels(front) {
    for (var i = BARRELS.length - 1; i >= 0; i--) {
      var k = BARRELS[i], r = res[k], z = barrelZ(k), alpha = 1;
      if (r === 3) {
        var since = Math.max(0, clock - k * SPB);
        if (since > 0.5) continue;
        z = Math.max(z, Z0 + 0.35);
        alpha = 1 - since / 0.5;
      }
      if (z > 15 || z < 0.75) continue;
      if (front !== (z < Z0)) continue;
      var px = 13 * Z0 / z, yb = gy(z);
      ellipse(540, yb, 95 * Z0 / z, 15 * Z0 / z, '#000000', 0.28 * alpha);
      var tArr = k * SPB - clock;
      if (!r && tArr > 0 && tArr < 0.65 && Math.floor(game.time.elapsed * 12) % 2 === 0) {
        game.draw.circle(540, yb - 4.5 * px, 9 * px, C.red, 0.35);
      }
      var white = r === 3 && (hitStop > 0 || flashT > 0.1);
      var big = white ? 1.15 : 1;
      var spr = Math.floor(clock / 0.09) % 2 ? BARREL_A : BARREL_B;
      game.draw.sprite(spr, white ? BARREL_WHITE : BARREL_FOG[fogLevel(z)], 540, yb - 4.5 * px * big, px * big, { anchor: 'center', alpha: alpha });
    }
  }

  function drawSeller() {
    var art, yoff = 0, px = 14, pal = SELLER_PAL;
    var inAir = airT < 0.42;
    if (slipT < 0.35) art = SELLER_SLIP;
    else if (inAir) { art = SELLER_AIR; yoff = -Math.sin(airT / 0.42 * Math.PI) * 170; }
    else art = stepFrame ? SELLER_R : SELLER_L;
    var bob = inAir ? 0 : -beatPulse * 6;
    var sh = inAir ? 1 - Math.sin(airT / 0.42 * Math.PI) * 0.4 : 1;
    ellipse(540, SELLER_Y, 125 * sh, 18 * sh, '#000000', 0.3);
    // 樽の予告線(足元に赤い線が点滅)
    if (warnLine > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.rect(140, SELLER_Y + 24, 800, 10, C.red, 0.8);
    var white = hitStop > 0 || flashT > 0.15;
    if (white) { pal = SELLER_WHITE; px = 16; game.draw.circle(540, SELLER_Y - 100, 170, C.white, 0.35); }
    var jx = slipT < 0.35 ? Math.sin(slipT * 60) * 10 : 0;
    game.draw.sprite(art, pal, 540 + jx, SELLER_Y + yoff + bob - 8 * px, px, { anchor: 'center' });
  }

  function drawFlakes(dt) {
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += (60 + f.z * 160) * dt;
      f.x += Math.sin(game.time.elapsed * 1.3 + f.p) * 30 * dt * f.z;
      if (f.y > 1460) { f.y = -10; f.x = game.random(0, W); }
      game.draw.circle(f.x, f.y, 2 + f.z * 6, C.white, 0.35 + f.z * 0.5);
    }
  }

  function nextAction() {
    for (var k = FIRST; k <= LAST; k++) {
      if (res[k] || (pending && pending.k === k)) continue;
      if (clock <= k * SPB + GOOD_W) return k;
    }
    return -1;
  }

  function drawPads() {
    game.draw.gradient(1460, H, [[0, '#1a2236'], [1, '#0b0f1a']]);
    var nk = nextAction();
    var both = nk >= 0 && isBarrel(nk);
    var lead = nk >= 0 ? nk * SPB - clock : 9;
    for (var f = 0; f < 2; f++) {
      var cx = f === 0 ? 285 : 795, cy = PAD_Y + PAD_H / 2;
      var on = nk >= 0 && !over && (both || f === nextFoot);
      var rim = padFlash[f] > 0 ? C.gold : (on ? (both ? C.red : C.lamp) : C.pad);
      roundRect(cx - 240, PAD_Y, 480, PAD_H, 40, rim);
      roundRect(cx - 226, PAD_Y + 14, 452, PAD_H - 28, 30, padFlash[f] > 0 ? '#4a5878' : C.pad2);
      game.draw.sprite(FOOT, { '#': on ? C.snow : '#56627e' }, cx, cy, 18, { anchor: 'center', flipX: f === 1 });
      if (on && lead > 0 && lead < SPB * 1.2) ring(cx, cy, 80 + lead / (SPB * 1.2) * 150, both ? C.red : C.lamp, 8);
    }
    if (both && !over) {
      var lift = Math.sin(game.time.elapsed * 10) * 8;
      game.draw.sprite(CHEVRON, { '#': C.red }, 540, PAD_Y + PAD_H / 2 - 40 + lift, 12, { anchor: 'center' });
      game.draw.sprite(CHEVRON, { '#': C.red }, 540, PAD_Y + PAD_H / 2 + 30 + lift, 12, { anchor: 'center' });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.72);
    label('SCORE ' + score, 40, 64, 40, C.snow, 'left');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(TOFU, i < lives ? TOFU_PAL : TOFU_DIM, W - 70 - i * 84, 64, 9, { anchor: 'center' });
    var bi = Math.floor(clock / SPB);
    for (var b = 0; b < 4; b++) {
      var on = clock >= 0 && ((bi % 4) + 4) % 4 === b;
      game.draw.circle(W / 2 - 105 + b * 70, 128, (b === 0 ? 17 : 13) + (on ? beatPulse * 8 : 0), on ? C.lamp : '#3a4868');
    }
    var progress = Math.max(0, Math.min(1, (clock - FIRST * SPB) / ((LAST - FIRST) * SPB)));
    game.draw.rect(40, 170, W - 80, 18, '#2a3450');
    game.draw.rect(40, 170, (W - 80) * progress, 18, C.lamp);
    game.draw.sprite(BARREL_A, BARREL_PAL, W - 210, 210, 3, { anchor: 'center' });
    label(jumped + ' / ' + BARRELS.length, W - 40, 210, 28, C.snow, 'right');
    if (combo >= 4) label(combo + ' COMBO', 40, 210, 28, C.gold, 'left');
  }

  function drawScene(dt) {
    drawSky();
    drawGround();
    drawWalls();
    drawLanterns();
    drawBarrels(false);
    // 拍ごとに足元に広がる輪(目に見える拍)
    if (beatPulse > 0.05) ellipse(540, SELLER_Y + 4, 150 + (1 - beatPulse) * 120, 22 + (1 - beatPulse) * 14, C.lamp, beatPulse * 0.25);
    drawSeller();
    drawBarrels(true);
    drawFlakes(dt);
    drawPads();
  }

  function drawResult(showTap) {
    var top = H * 0.27;
    game.draw.rect(60, top, W - 120, H * 0.4, C.ink, 0.86);
    game.draw.rect(60, top, W - 120, 8, won ? C.lamp : C.red);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 96, won ? C.lamp : C.red);
    label('SCORE ' + score, W / 2, H * 0.37, 60, C.snow);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2, H * 0.42, 34, C.gold);
    game.draw.sprite(BARREL_A, BARREL_PAL, W / 2 - 150, H * 0.465, 5, { anchor: 'center' });
    label(jumped + ' / ' + BARRELS.length, W / 2 + 30, H * 0.465, 44, C.snow);
    label('COMBO ' + maxCombo, W / 2, H * 0.51, 38, C.lamp);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.555, 56, C.lamp);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.555, 42, C.snow);
    if (!won) label('あと' + Math.max(1, LAST - failBeat + 1) + '拍!', W / 2, H * 0.60, 48, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.645, 34, C.snow);
  }

  // ---- ATTRACT: 実ロジックで左右交互に歩き、樽は両足で跳ぶ。次の樽は片足だけでMISSになる失敗例 ----
  var demo = { t: 0, k: 6, press: 0, two: false, hx: 285, hy: PAD_Y + 140 };
  function demoReset() {
    initRun(true);
    clock = DEMO_FROM * SPB; lastBeat = Math.floor(clock / SPB);
    for (var k = FIRST; k < 6; k++) res[k] = 1;
    demo.k = 6; demo.press = 0; demo.two = false;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    if (demo.k <= DEMO_TO - 0.5 && clock >= demo.k * SPB) {
      var k = demo.k;
      if (isBarrel(k) && k !== DEMO_FAIL) { press(0); press(1); demo.two = true; }
      else { demo.hx = nextFoot === 0 ? 285 : 795; press(nextFoot); demo.two = false; }
      demo.press = 0.16; demo.k++;
    }
    if (demo.press > 0) demo.press -= dt;
    else if (demo.k <= DEMO_TO - 0.5) {
      demo.two = isBarrel(demo.k) && demo.k !== DEMO_FAIL;
      demo.hx += ((nextFoot === 0 ? 285 : 795) - demo.hx) * Math.min(1, dt * 14);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!res) initRun(true);
      stepDemo(dt);
      drawScene(dt);
      var pr = demo.press > 0;
      if (demo.two) {
        game.draw.hand(300, PAD_Y + (pr ? 170 : 110), { press: pr, scale: 14 });
        game.draw.hand(810, PAD_Y + (pr ? 170 : 110), { press: pr, scale: 14 });
      } else {
        game.draw.hand(demo.hx + 15, PAD_Y + (pr ? 170 : 110), { press: pr, scale: 14 });
      }
      game.draw.rect(0, 0, W, 230, C.ink, 0.72);
      label(GAME_TITLE, W / 2 + 4, 92, 92 + Math.sin(t * 3) * 3, C.red);
      label(GAME_TITLE, W / 2, 86, 92 + Math.sin(t * 3) * 3, C.snow);
      label('HI-SCORE ' + game.best, W / 2, 186, 36, C.lamp);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.4, 54, C.lamp);
      else label('TAP TO START', W / 2, H * 0.4, 48, C.snow);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt; airT += dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene(hitStop > 0 ? 0 : dt);
    drawHud();
    if (clock < 0) {
      game.draw.rect(140, H * 0.44, W - 280, 150, C.ink, 0.8);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44 + 75, 96, C.lamp);
    }
    // 開始時お手本: 最初の拍の直前に左足パッドへ手を1回出す
    if (!over && clock > (FIRST - 0.9) * SPB && clock < FIRST * SPB + 0.12) {
      game.draw.hand(300, PAD_Y + (clock >= FIRST * SPB - 0.05 ? 170 : 110), { press: clock >= FIRST * SPB - 0.05, scale: 13, alpha: 0.75 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
