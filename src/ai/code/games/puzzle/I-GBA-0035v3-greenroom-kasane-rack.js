// I-GBA-0035v3-greenroom-kasane-rack.js
// 楽屋の重ね掛け — 錦絵の襟元に重なる色を内側から読み取り、床に散らばった衣装を着る順に衣桁へ掛けていく
// 操作: 床の衣装を指でつまんで衣桁までドラッグして離す。錦絵の襟の内側の色から順に掛ける。順番違い・見本にない衣装を掛けると演者が首を振って床へ戻る
// 終わり: 3幕(3枚→4枚→5枚)を22秒以内に掛け終えればCLEAR。掛け間違い3回/時間切れでGAME OVER
// @mechanic: drag_sort
// @theme: old_playhouse_greenroom_kasane
// 世界観: 古い芝居小屋の楽屋で、衣装係が錦絵に描かれた襟元の重ね色を手がかりに、演者が下から順に着ていけるよう衣装を衣桁へ並べ替える
// 残るもの: 正誤(CLEAR/GAME OVER) + 掛けた枚数・最大連続・残り秒のスコア
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 褐色〜灰に寄せた低彩度。行灯のブルーム(半透明円の重ね)と四辺のビネット
  var STYLE = { bg: ['#1c1612', '#382c24', '#54443a'], main: ['#a8906c', '#6c5644', '#dccfb4'], accent: ['#e8a85a', '#f6efe0'] };
  var K = {
    ink: '#100c0a', wood: STYLE.main[1], woodHi: STYLE.main[0], paper: STYLE.main[2],
    lamp: STYLE.accent[0], white: STYLE.accent[1], ok: '#a6cc84', ng: '#d8604c',
    tatami: '#6e6640', tatamiHi: '#847a4e', skin: '#efe4d8',
  };
  // 重ね色(低彩度) と その影色
  var KASANE = ['#e6dccb', '#c4837c', '#8f9e5e', '#55708f', '#7d5f8c', '#c9a34e', '#a85a40', '#5f8f86'];
  var KDARK = ['#b0a690', '#8e5650', '#5e6a38', '#344a62', '#523a5e', '#8e6e2a', '#703626', '#3a5f58'];

  var GAME_TITLE = 'KASANE RACK';
  var TIME_LIMIT = 22;
  var ACTS = [{ n: 3, decoy: 0 }, { n: 4, decoy: 1 }, { n: 5, decoy: 2 }];
  var NEEDED = 12;
  var MISS_MAX = 3;
  var RACK_Y = Math.round(H * 0.43);
  var RACK_TOP = Math.round(H * 0.39), RACK_BOT = Math.round(H * 0.63);
  var FLOOR_TOP = Math.round(H * 0.645);
  var ACTOR = { x: 770, y: Math.round(H * 0.19) };
  var PORTRAIT = { x: 285, y: Math.round(H * 0.19) };
  var CELLS = [];
  for (var cr = 0; cr < 3; cr++) for (var cc = 0; cc < 3; cc++) CELLS.push({ x: 190 + cc * 350, y: Math.round(H * 0.69) + cr * 178 });

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var act, order, floor, hung, held, misses, placed, combo, maxCombo, lastPlace, score;
  var timeLeft, readyT, actT, stopT, stopObj, fin, cleared, postT, warnT, joyT, noT, playT, finalScore;

  // 演者の顔(白塗り+紅の目張り)。まばたき・喜び・首振りの差分
  var FACE_A = ['...kkkkkk...', '..kkkkkkkk..', '.kkkkkkkkkk.', '.kkwwwwwwkk.', '.kwwwwwwwwk.', '.wrkwwwwkrw.', '.wwwwwwwwww.', '.wwwwrrwwww.', '..wwwwwwww..', '...wwwwww...'];
  var FACE_B = ['...kkkkkk...', '..kkkkkkkk..', '.kkkkkkkkkk.', '.kkwwwwwwkk.', '.kwwwwwwwwk.', '.wrrwwwwrrw.', '.wwwwwwwwww.', '.wwwwrrwwww.', '..wwwwwwww..', '...wwwwww...'];
  var FACE_JOY = ['...kkkkkk...', '..kkkkkkkk..', '.kkkkkkkkkk.', '.kkwwwwwwkk.', '.kwwwwwwwwk.', '.wkkwwwwkkw.', '.wwwwwwwwww.', '.wwwrkkrwww.', '..wwwrrwww..', '...wwwwww...'];
  var FACE_NO = ['...kkkkkk...', '..kkkkkkkk..', '.kkkkkkkkkk.', '.kkwwwwwwkk.', '.kwkwwwwkwk.', '.wrkwwwwkrw.', '.wwwwwwwwww.', '.wwkkkkkkww.', '..wwwwwwww..', '...wwwwww...'];
  var FACE_PAL = { k: '#1a1410', w: '#f2ece2', r: '#b8443a' };
  var FACE_SEPIA = { k: '#3a2c20', w: '#d8c8a8', r: '#8a5a3a' };
  var LANTERN = ['.kk.', 'llll', 'lLLl', 'lLLl', 'llll', '.kk.'];
  var LANTERN_PAL = { k: '#2a2018', l: '#c88a46', L: '#f4d8a0' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: K.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      if (j > i) j = i;
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function pegX(i, n) { return n <= 1 ? W / 2 : 170 + i * (740 / (n - 1)); }

  function setupAct(n, decoy) {
    var cols = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    order = cols.slice(0, n);
    var dec = cols.slice(n, n + decoy);
    var cells = shuffle(CELLS.slice());
    floor = [];
    var all = order.concat(dec);
    for (var i = 0; i < all.length; i++) {
      var c = cells[i];
      var hx = c.x + game.random(-26, 26), hy = c.y + game.random(-14, 14);
      floor.push({ col: all[i], decoy: i >= n, kind: Math.floor(game.random(0, 3)) % 3, hx: hx, hy: hy, x: hx, y: hy + 400, tx: hx, ty: hy, used: false, flash: 0, ph: game.random(0, 6) });
    }
    hung = []; held = null;
  }

  function initGame() {
    act = 0; misses = 0; placed = 0; combo = 0; maxCombo = 0; lastPlace = -9; score = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; actT = 0; stopT = 0; stopObj = null; fin = false; cleared = false;
    postT = 0; warnT = 0; joyT = 0; noT = 0; playT = 0; finalScore = 0;
    setupAct(ACTS[0].n, ACTS[0].decoy);
  }

  // ---- つまむ・運ぶ・掛ける(本番とデモで共通) ----
  function grab(x, y) {
    var best = null, bd = 125;
    for (var i = 0; i < floor.length; i++) {
      var g = floor[i];
      if (g.used) continue;
      var d = Math.hypot(g.x - x, g.y + 20 - y);
      if (d < bd) { bd = d; best = g; }
    }
    if (!best) return false;
    held = { g: best, ox: best.x - x, oy: best.y - y };
    game.audio.tone('G4', 0.05, { wave: 'triangle', volume: 0.08, slide: 120 });
    return true;
  }

  function carry(x, y) {
    if (!held) return;
    held.g.x = x + held.ox; held.g.y = y + held.oy;
  }

  function release(x, y) {
    if (!held) return;
    var g = held.g;
    held = null;
    if (y > RACK_TOP && y < RACK_BOT) { judge(g); return; }
    g.tx = g.hx; g.ty = g.hy;
    game.audio.play('se_tap', 0.15);
  }

  function judge(g) {
    var n = order.length;
    var px = pegX(hung.length, n), py = RACK_Y + 118;
    if (g.col === order[hung.length]) {
      g.used = true; g.tx = px; g.ty = py; g.flash = 0.3;
      hung.push(g);
      placed++;
      var now = game.time.elapsed;
      combo = now - lastPlace < 2.0 ? combo + 1 : 1;
      lastPlace = now;
      if (combo > maxCombo) maxCombo = combo;
      var pts = 100 * Math.min(4, combo);
      score += pts;
      joyT = 0.45;
      game.feedback.good(px, py - 40, { text: combo >= 2 ? 'x' + combo : 'GOOD', color: K.ok, size: 54 });
      game.fx.popup('+' + pts, px, py - 150, { color: K.lamp, size: 40 });
      if (hung.length >= n) {
        actT = 1.0;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup('NICE', ACTOR.x, ACTOR.y + 40, { color: K.lamp, size: 84 });
        game.fx.burst(ACTOR.x, ACTOR.y + 160, { color: K.lamp, count: 22, speed: 420 });
      }
      return;
    }
    misses++; combo = 0; noT = 0.55;
    g.tx = g.hx; g.ty = g.hy; g.flash = 0.4;
    if (misses >= MISS_MAX) {
      stopT = 0.45;
      stopObj = { kind: 'miss', g: g, x: px, y: py };
      g.x = px; g.y = py; g.tx = px; g.ty = py;
      game.audio.tone('D3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -80 });
      game.fx.flash('#ffffff', 0.12);
      return;
    }
    game.feedback.bad(px, py - 40, { text: 'MISS', color: K.ng, size: 54 });
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 30 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 4; i++) game.fx.burst(200 + i * 230, H * 0.3 + (i % 2) * 120, { color: i % 2 ? K.lamp : K.white, count: 20, speed: 520 });
      game.fx.flash(K.lamp, 0.2);
    }
  }

  function resolveStop() {
    if (!stopObj) return;
    if (stopObj.kind === 'win') { ending(true); return; }
    if (stopObj.g) { stopObj.g.flash = 0; stopObj.g.tx = stopObj.g.hx; stopObj.g.ty = stopObj.g.hy; }
    game.feedback.bad(stopObj.x, stopObj.y - 40, { text: stopObj.kind === 'time' ? 'TIME UP' : 'MISS', color: K.ng, size: 60 });
    ending(false);
  }

  // ---- 入力 ----
  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && actT <= 0; }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    if (!grab(x, y)) game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) {
    if (!held || !canPlay()) return;
    carry(x, y);
    if (Math.random() < 0.06) game.audio.tone('C6', 0.02, { wave: 'sine', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (!held) return;
    if (!canPlay()) { held.g.tx = held.g.hx; held.g.ty = held.g.hy; held = null; game.audio.play('se_tap', 0.1); return; }
    release(x, y);
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 動き ----
  function stepAnim(dt) {
    for (var i = 0; i < floor.length; i++) {
      var g = floor[i];
      if (held && held.g === g) continue;
      g.x += (g.tx - g.x) * Math.min(1, dt * 11);
      g.y += (g.ty - g.y) * Math.min(1, dt * 11);
      if (g.flash > 0) g.flash -= dt;
    }
    if (joyT > 0) joyT -= dt;
    if (noT > 0) noT -= dt;
  }

  // ---- 描画 ----
  function bloom(x, y, r, a) {
    game.draw.circle(x, y, r * 2.4, K.lamp, a * 0.08);
    game.draw.circle(x, y, r * 1.6, K.lamp, a * 0.12);
    game.draw.circle(x, y, r, '#f8dca8', a * 0.18);
  }

  function room(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.35, STYLE.bg[1]], [0.62, STYLE.bg[2]], [0.64, K.tatami], [1, '#4a4430']]);
    // 板壁と長押
    for (var b = 0; b < 9; b++) game.draw.rect(b * 124 + 30, 230, 4, RACK_TOP - 250, K.ink, 0.25);
    game.draw.rect(0, 236, W, 14, K.wood);
    // 暖簾
    for (var n = 0; n < 6; n++) game.draw.rect(n * 182 + 8, 250, 166, 40 + Math.sin(t * 1.3 + n) * 4, n % 2 ? '#5a3a2c' : '#4a2e24');
    // 行灯(ブルーム)
    var fl = 0.85 + Math.sin(t * 7) * 0.08 + Math.sin(t * 2.3) * 0.05;
    game.draw.sprite(LANTERN, LANTERN_PAL, 540, 380 + Math.sin(t * 1.6) * 6, 16, { anchor: 'center' });
    bloom(540, 380 + Math.sin(t * 1.6) * 6, 60, fl);
    // 畳
    game.draw.rect(0, FLOOR_TOP, W, 10, K.ink, 0.5);
    for (var r = 0; r < 4; r++) {
      var yy = FLOOR_TOP + 20 + r * 180;
      game.draw.rect(0, yy, W, 6, K.tatamiHi, 0.6);
      for (var s = 0; s < 30; s++) game.draw.rect((s * 37 + r * 13) % W, yy + 30 + (s % 5) * 28, 22, 2, K.ink, 0.12);
    }
  }

  function vignette() {
    game.draw.rect(0, 0, W, 70, '#000000', 0.38);
    game.draw.rect(0, H - 70, W, 70, '#000000', 0.38);
    game.draw.rect(0, 0, 50, H, '#000000', 0.32);
    game.draw.rect(W - 50, 0, 50, H, '#000000', 0.32);
    game.draw.rect(0, 70, W, 50, '#000000', 0.16);
    game.draw.rect(0, H - 120, W, 50, '#000000', 0.16);
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.07);
  }

  function drawCollar(cx, cy, cols, s, pulse, t, n) {
    var sp = n <= 3 ? 38 : (n === 4 ? 32 : 27), th = sp - 5;
    var outer = cols.length ? KASANE[cols[cols.length - 1]] : K.paper;
    game.draw.rect(cx - 150 * s - 6, cy - 6, 300 * s + 12, 236 * s + 6, K.ink, 0.6);
    game.draw.rect(cx - 150 * s, cy, 300 * s, 230 * s, outer);
    game.draw.rect(cx - 30 * s, cy - 34 * s, 60 * s, 50 * s, K.skin);
    for (var i = cols.length - 1; i >= 0; i--) {
      var w = (30 + i * sp) * s, d = (58 + i * sp) * s;
      game.draw.line(cx - w, cy, cx, cy + d, KASANE[cols[i]], th * s);
      game.draw.line(cx + w, cy, cx, cy + d, KASANE[cols[i]], th * s);
    }
    if (pulse >= 0 && pulse < cols.length) {
      var a = 0.45 + Math.sin(t * 9) * 0.35;
      var pw = (30 + pulse * sp) * s, pd = (58 + pulse * sp) * s;
      game.draw.line(cx - pw, cy, cx, cy + pd, K.white, (th + 12) * s);
      game.draw.line(cx + pw, cy, cx, cy + pd, K.white, (th + 12) * s);
      game.draw.line(cx - pw, cy, cx, cy + pd, KASANE[cols[pulse]], (th - 4) * s);
      game.draw.line(cx + pw, cy, cx, cy + pd, KASANE[cols[pulse]], (th - 4) * s);
      game.draw.circle(cx, cy + pd + 24 * s, 9 + a * 6, K.white, a);
    }
  }

  function drawPortrait(t) {
    var x = PORTRAIT.x, y = PORTRAIT.y;
    game.draw.rect(x - 175, y - 20, 350, 440, K.ink, 0.7);
    game.draw.rect(x - 165, y - 10, 330, 420, K.wood);
    game.draw.rect(x - 150, y + 5, 300, 390, '#cfc0a0');
    game.draw.rect(x - 150, y + 5, 300, 60, '#b8a888', 0.6);
    game.draw.sprite(FACE_A, FACE_SEPIA, x, y + 110, 11, { anchor: 'center' });
    drawCollar(x, y + 190, order, 0.78, hung.length, t, order.length);
    game.draw.circle(x + 120, y + 30, 16, '#a84a3a', 0.85);
    bloom(x, y + 200, 120, 0.25);
  }

  function drawActor(t) {
    var x = ACTOR.x, y = ACTOR.y;
    var shakeX = noT > 0 ? Math.sin(noT * 40) * 18 : 0;
    var hop = joyT > 0 || actT > 0 ? -Math.abs(Math.sin(t * 12)) * 16 : Math.sin(t * 2.2) * 4;
    var face = noT > 0 ? FACE_NO : (joyT > 0 || actT > 0 ? FACE_JOY : (Math.floor(t * 1.2) % 5 === 0 ? FACE_B : FACE_A));
    game.draw.circle(x, y + 420, 170, K.ink, 0.25);
    var cols = [];
    for (var i = 0; i < hung.length; i++) cols.push(hung[i].col);
    drawCollar(x + shakeX, y + 190 + hop, cols, 1.0, -1, t, order.length);
    game.draw.sprite(face, FACE_PAL, x + shakeX, y + 100 + hop, 13, { anchor: 'center' });
    if (stopObj && stopObj.kind === 'win') game.draw.circle(x, y + 220, 200 + (0.4 - stopT) * 300, K.white, 0.3);
  }

  function drawGarment(g, x, y, s, alpha) {
    var flash = g.flash > 0 && Math.floor(g.flash * 20) % 2 === 0;
    var c = flash ? K.white : KASANE[g.col], dk = KDARK[g.col];
    var bodyH = (g.kind === 0 ? 120 : (g.kind === 1 ? 170 : 145)) * s;
    var bw = 112 * s, sw = 58 * s, sh = (g.kind === 2 ? 62 : 86) * s, top = y - 50 * s;
    var a = alpha === undefined ? 1 : alpha;
    game.draw.rect(x - bw / 2 - sw + 12 * s, top + 16 * s, bw + sw * 2, sh, K.ink, 0.3 * a);
    game.draw.rect(x - bw / 2 + 12 * s, top + 16 * s, bw, bodyH, K.ink, 0.3 * a);
    game.draw.rect(x - bw / 2 - sw, top, sw, sh, c, a);
    game.draw.rect(x + bw / 2, top, sw, sh, c, a);
    game.draw.rect(x - bw / 2, top, bw, bodyH, c, a);
    for (var i = 1; i <= 3; i++) game.draw.rect(x - bw / 2, top + bodyH * i / 4, bw, 5 * s, dk, 0.6 * a);
    game.draw.rect(x - bw / 2 - sw, top + sh - 8 * s, sw, 8 * s, dk, 0.7 * a);
    game.draw.rect(x + bw / 2, top + sh - 8 * s, sw, 8 * s, dk, 0.7 * a);
    game.draw.line(x - 28 * s, top, x, top + 56 * s, dk, 12 * s);
    game.draw.line(x + 28 * s, top, x, top + 56 * s, dk, 12 * s);
  }

  function drawRack(t) {
    var n = order.length;
    game.draw.rect(96, RACK_Y - 30, 26, RACK_BOT - RACK_Y + 10, K.wood);
    game.draw.rect(W - 122, RACK_Y - 30, 26, RACK_BOT - RACK_Y + 10, K.wood);
    game.draw.rect(70, RACK_BOT - 24, 80, 20, K.wood);
    game.draw.rect(W - 150, RACK_BOT - 24, 80, 20, K.wood);
    game.draw.rect(70, RACK_Y - 16, W - 140, 22, K.woodHi);
    game.draw.rect(70, RACK_Y + 2, W - 140, 6, K.ink, 0.45);
    for (var i = 0; i < n; i++) {
      var px = pegX(i, n);
      var nxt = i === hung.length && actT <= 0;
      if (nxt) {
        var a = 0.4 + Math.sin(t * 8) * 0.3;
        game.draw.circle(px, RACK_Y - 4, 30, K.white, a);
        game.draw.rect(px - 92, RACK_Y + 20, 184, 200, K.white, a * 0.18);
      }
      game.draw.circle(px, RACK_Y - 4, 13, nxt ? K.white : K.paper);
      for (var d = 0; d <= i; d++) game.draw.circle(px - i * 9 + d * 18, RACK_Y + 236, 5, K.paper, 0.6);
    }
    for (var h = 0; h < hung.length; h++) {
      var g = hung[h];
      game.draw.line(g.x, RACK_Y - 4, g.x, g.y - 40, K.ink, 4);
      drawGarment(g, g.x, g.y, 0.72);
    }
  }

  function drawFloor(t) {
    for (var i = 0; i < floor.length; i++) {
      var g = floor[i];
      if (g.used || (held && held.g === g)) continue;
      var bob = Math.sin(t * 2.4 + g.ph) * 4;
      drawGarment(g, g.x, g.y + bob, 0.85);
    }
    if (held) {
      game.draw.circle(held.g.x, held.g.y + 150, 90, K.ink, 0.25);
      drawGarment(held.g, held.g.x, held.g.y, 0.95);
    }
  }

  function drawHud(t) {
    var lowT = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 30, K.ink, 0.8);
    game.draw.rect(76, 40, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? K.ng : K.lamp);
    out(placed + ' / ' + NEEDED, W / 2, 112, 48, K.white);
    for (var a = 0; a < ACTS.length; a++) {
      var done = a < act || (a === act && actT > 0) || (fin && cleared);
      game.draw.rect(96 + a * 64, 150, 48, 48, K.ink, 0.7);
      game.draw.rect(102 + a * 64, 156, 36, 36, done ? K.lamp : (a === act ? K.paper : K.wood));
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 120 - m * 60, 174, 20, m < misses ? K.ng : K.paper, m < misses ? 1 : 0.5);
    out('' + score, W - 220, 112, 34, K.lamp);
  }

  function drawStop(t) {
    if (!stopObj || stopT <= 0) return;
    if (stopObj.kind === 'miss') {
      var g = stopObj.g, k = 1.25 + (0.45 - stopT) * 0.6;
      game.draw.circle(g.x, g.y, 170, K.white, 0.35);
      g.flash = Math.floor(t * 16) % 2 === 0 ? 0.01 : 0.06;
      drawGarment(g, g.x, g.y, 0.8 * k);
    } else if (stopObj.kind === 'time') {
      game.draw.rect(60, 24, W - 120, 50, K.white, 0.6);
    }
  }

  function drawScene(t) {
    room(t);
    drawPortrait(t);
    drawActor(t);
    drawRack(t);
    drawFloor(t);
  }

  // ---- ATTRACT: 本物の grab/carry/release で 1枚目・2枚目を掛け → 見本にない衣装で首振り → 3枚目で揃う ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, k: -1, sx: 0, sy: 0, plan: [] };
  function findCol(c) { for (var i = 0; i < floor.length; i++) if (floor[i].col === c) return floor[i]; return floor[0]; }
  function findDecoy() { for (var i = 0; i < floor.length; i++) if (floor[i].decoy) return floor[i]; return floor[0]; }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.8;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0; setupAct(3, 1);
      for (var i = 0; i < floor.length; i++) { floor[i].x = floor[i].hx; floor[i].y = floor[i].hy; }
      demo.k = -1; demo.plan = [findCol(order[0]), findCol(order[1]), findDecoy(), findCol(order[2])];
    }
    stepAnim(dt);
    if (actT > 0) actT -= dt;
    var slot = Math.floor(cyc / 1.45), u = cyc - slot * 1.45;
    demo.press = false;
    if (slot < 4) {
      var g = demo.plan[slot];
      var tx = pegX(hung.length, order.length), ty = RACK_Y + 118;
      if (u < 0.42) {
        demo.gx += (g.x - demo.gx) * Math.min(1, dt * 10);
        demo.gy += (g.y + 10 - demo.gy) * Math.min(1, dt * 10);
      } else if (u < 1.05) {
        if (demo.k !== slot) { demo.k = slot; demo.sx = demo.gx; demo.sy = demo.gy; grab(g.x, g.y + 10); }
        var p = (u - 0.42) / 0.63, e = p * p * (3 - 2 * p);
        demo.gx = demo.sx + (tx - demo.sx) * e; demo.gy = demo.sy + (ty - demo.sy) * e;
        demo.press = true;
        carry(demo.gx, demo.gy);
      } else if (held) {
        release(demo.gx, demo.gy);
      }
    } else {
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 3);
      demo.gy += (H * 0.86 - demo.gy) * Math.min(1, dt * 3);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      vignette();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2 + Math.sin(t * 1.5) * 6, H * 0.055, 86, K.lamp);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.098, 38, K.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.955, 48, K.lamp);
      else out('TAP TO START', W / 2, H * 0.955, 40, K.white);
      return;
    }

    if (mode === S.RESULT) {
      stepAnim(dt);
      drawScene(t);
      vignette();
      game.draw.rect(90, H * 0.30, W - 180, 520, K.ink, 0.78);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, cleared ? K.ok : K.ng);
      out('SCORE ' + finalScore, W / 2, H * 0.40, 60, K.white);
      out(placed + ' / ' + NEEDED + '   x' + maxCombo, W / 2, H * 0.45, 44, K.lamp);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.50, 56, K.lamp);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.50, 42, K.paper);
      if (!cleared) out('あと' + (NEEDED - placed) + '枚!', W / 2, H * 0.27, 60, K.lamp);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.955, 40, K.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepAnim(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { placed: placed, misses: misses, maxCombo: maxCombo, acts: act + (cleared ? 1 : 0) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      stepAnim(dt);
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (actT > 0) {
      actT -= dt;
      stepAnim(dt);
      if (actT <= 0) {
        if (act >= ACTS.length - 1) {
          stopT = 0.4; stopObj = { kind: 'win', x: ACTOR.x, y: ACTOR.y + 200 };
          game.audio.play('se_powerup', 0.4);
        } else {
          act++;
          setupAct(ACTS[act].n, ACTS[act].decoy);
          game.audio.play('se_jump', 0.3);
        }
      }
    } else {
      timeLeft -= dt; playT += dt;
      stepAnim(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.08 }); }
      }
      if (timeLeft <= 0) {
        timeLeft = 0;
        if (held) { held.g.tx = held.g.hx; held.g.ty = held.g.hy; held = null; }
        stopT = 0.45; stopObj = { kind: 'time', x: W / 2, y: 200 };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    drawStop(t);
    if (!fin && readyT <= 0 && act === 0 && hung.length === 0 && playT < 1.4 && !held) {
      var first = findCol(order[0]);
      game.draw.hand(first.x, first.y + 10, { press: false, scale: 12, alpha: 0.55 });
    }
    vignette();
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, RACK_Y + 140, 120, K.lamp);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 1], ['F4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 0.5], ['F4', 0.5],
      ['E4', 1], ['R', 0.5], ['B3', 0.5], ['C4', 1], ['E4', 1],
      ['A4', 0.5], ['B4', 0.5], ['C5', 1], ['B4', 0.5], ['A4', 0.5], ['F4', 1], ['E4', 2],
    ], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true, bass: [['E2', 2], ['A2', 2], ['E2', 2], ['B2', 2], ['A2', 2], ['E2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
