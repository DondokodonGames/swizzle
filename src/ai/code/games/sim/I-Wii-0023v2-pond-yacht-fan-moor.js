// I-Wii-0023v2-pond-yacht-fan-moor.js
// 池のヨット係留 — 指で大きくあおいで風を送り、浮かぶ模型ヨットを押して係留ブイの輪の中に止める
// 操作: 指を押して滑らせて離すと、滑らせた向きに風が吹く(長く速く滑らせるほど強い。風はヨットの近くで滑らせるほど効く)。軽く叩くとその場所から小さく風が出てヨットを押し返す。輪の中でヨットがほぼ止まると係留できる
// 終わり: 3艘を22秒以内に輪へ係留すればCLEAR。時間切れでGAME OVER(岸に強くぶつけると時間が減る)
// @mechanic: push_out
// @theme: park_pond_model_yacht_moor
// 世界観: 夏の公園の池で、模型ヨット愛好家が大きなうちわで帆に風を送り、池に流された仲間のヨットを1艘ずつ係留ブイの輪の中へ押し入れて止める
// 残るもの: 正誤(CLEAR/GAME OVER) + 係留した艘数・ぴたり止め回数・スコア
// スタイル: 8bit PC MONITOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・8色ベタ・細い線・テキスト枠のUI
  var STYLE = { bg: ['#0000aa', '#000055'], main: ['#00aaaa', '#ffffff', '#aa5500'], accent: ['#ffff55', '#aa0000'] };
  var BLUE = STYLE.bg[0], CYAN = STYLE.main[0], WHITE = STYLE.main[1], BROWN = STYLE.main[2], YEL = STYLE.accent[0], RED = STYLE.accent[1];
  var GREEN = '#00aa00', GREY = '#aaaaaa', BLACK = '#000000', MAG = '#aa00aa';

  var TITLE = 'YACHT MOOR';
  var TIME_LIMIT = 22;
  var NEEDED = 3;
  var POND = { l: 80, r: W - 80, t: Math.round(H * 0.14), b: Math.round(H * 0.7) };
  var BOAT_R = 34;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var YACHT = [
    ['....w....', '...ww....', '..www....', '.wwwwm...', 'wwwwwmm..', '....m....', 'bbbbbbbbb', '.bkbbkbb.', '..bbbbb..'],
    ['....w....', '....ww...', '....www..', '...mwwww.', '..mmwwwww', '....m....', 'bbbbbbbbb', '.bkbbkbb.', '..bbbbb..'],
  ];
  var YPAL = [{ w: WHITE, m: BROWN, b: RED, k: WHITE }, { w: YEL, m: BROWN, b: BLUE, k: WHITE }, { w: WHITE, m: BROWN, b: GREEN, k: WHITE }];
  var MAN = [
    ['...hhh....', '..hhhhh...', '..fffff...', '..fkfkf...', '...fff....', '.sssssss..', 's.sssss.uu', '..sssss.uu', '..ppppp.u.', '..p...p...', '.pp...pp..'],
    ['...hhh..uu', '..hhhhh.uu', '..fffff.u.', '..fkfkf.f.', '...fff..f.', '.sssssssf.', 's.sssss...', '..sssss...', '..ppppp...', '..p...p...', '.pp...pp..'],
    ['...hhh....', '..hhhhh...', '..fffff...', '..fkfkf...', '...fff....', 'fsssssss..', 'f.sssss...', 'uusssss...', 'uuppppp...', 'u.p...p...', '.pp...pp..'],
  ];
  var MPAL = { h: BROWN, f: '#ffaa88', k: BLACK, s: WHITE, p: BLUE, u: YEL };

  function txt(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: BLACK, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center', font: 'monospace' });
  }
  function frame(x, y, w, h, col) {
    game.draw.rect(x, y, w, h, BLACK);
    game.draw.line(x, y, x + w, y, col, 3); game.draw.line(x, y + h, x + w, y + h, col, 3);
    game.draw.line(x, y, x, y + h, col, 3); game.draw.line(x + w, y, x + w, y + h, col, 3);
    game.draw.line(x + 8, y + 8, x + w - 8, y + 8, col, 1); game.draw.line(x + 8, y + h - 8, x + w - 8, y + h - 8, col, 1);
  }
  function ringLine(x, y, r, seg, colA, colB, w) {
    for (var i = 0; i < seg; i++) {
      var a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, i % 2 ? colA : colB, w);
    }
  }

  // ── 3艘の段取り(本番) ──
  var LEVELS = [
    { ring: { x: W / 2, y: POND.t + 330, r: 100 }, start: { x: W / 2, y: POND.b - 160 }, drift: 0, pads: [], spout: null },
    { ring: { x: 300, y: POND.t + 280, r: 95 }, start: { x: W - 300, y: POND.b - 170 }, drift: 55, pads: [{ x: 560, y: POND.t + 560, r: 70 }, { x: 760, y: POND.t + 420, r: 56 }], spout: null },
    { ring: { x: W - 290, y: POND.t + 300, r: 88 }, start: { x: 300, y: POND.b - 160 }, drift: -35, pads: [{ x: 420, y: POND.t + 380, r: 60 }], spout: { x: W - 470, y: POND.t + 470, period: 2.3 } },
  ];

  // ── 物理(本番・デモ共通) ──
  function makeBoat(x, y) { return { x: x, y: y, vx: 0, vy: 0, still: 0, tilt: 0 }; }
  function gust(b, x0, y0, x1, y1, dur) {
    var dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 40) {
      // 軽く叩く: その場所から小さな風(ヨットを押し返す)
      var ex = b.x - x1, ey = b.y - y1, d = Math.sqrt(ex * ex + ey * ey);
      if (d > 320 || d < 1) return 0;
      var p = 230 * (1 - d / 320);
      b.vx += ex / d * p; b.vy += ey / d * p;
      return p;
    }
    var ux = dx / len, uy = dy / len;
    // 風はなぞりの終点から向きに沿って扇形に広がる。ヨットが近くて前方にあるほど強い
    var bx = b.x - x0, by = b.y - y0;
    var along = bx * ux + by * uy, side = Math.abs(-bx * uy + by * ux);
    if (along < -60 || along > len + 520) return 0;
    var spread = 120 + Math.max(0, along) * 0.45;
    if (side > spread) return 0;
    var speed = len / Math.max(0.08, dur);
    var power = Math.min(900, len * 1.1 + speed * 0.1) * (1 - side / spread * 0.6) * (along > len ? 1 - (along - len) / 620 : 1);
    b.vx += ux * power; b.vy += uy * power;
    return power;
  }
  // 戻り値: 'bonk' | null
  function stepBoat(b, dt, lv, spoutOn) {
    var res = null;
    b.vx += (lv.drift || 0) * dt;
    if (spoutOn && lv.spout) {
      var sx = b.x - lv.spout.x, sy = b.y - lv.spout.y, sd = Math.sqrt(sx * sx + sy * sy);
      if (sd < 220 && sd > 1) { b.vx += sx / sd * 900 * dt; b.vy += sy / sd * 900 * dt; }
    }
    for (var i = 0; i < lv.pads.length; i++) {
      var pd = lv.pads[i], px = b.x - pd.x, py = b.y - pd.y, d = Math.sqrt(px * px + py * py);
      if (d < pd.r + BOAT_R && d > 1) {
        var push = pd.r + BOAT_R - d;
        b.x += px / d * push; b.y += py / d * push;
        var vn = b.vx * px / d + b.vy * py / d;
        if (vn < 0) { b.vx -= 1.6 * vn * px / d; b.vy -= 1.6 * vn * py / d; }
      }
    }
    var drag = Math.exp(-1.35 * dt);
    b.vx *= drag; b.vy *= drag;
    b.x += b.vx * dt; b.y += b.vy * dt;
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (b.x < POND.l + BOAT_R) { b.x = POND.l + BOAT_R; if (b.vx < -380) res = 'bonk'; b.vx = -b.vx * 0.45; }
    if (b.x > POND.r - BOAT_R) { b.x = POND.r - BOAT_R; if (b.vx > 380) res = 'bonk'; b.vx = -b.vx * 0.45; }
    if (b.y < POND.t + BOAT_R) { b.y = POND.t + BOAT_R; if (b.vy < -380) res = 'bonk'; b.vy = -b.vy * 0.45; }
    if (b.y > POND.b - BOAT_R) { b.y = POND.b - BOAT_R; if (b.vy > 380) res = 'bonk'; b.vy = -b.vy * 0.45; }
    b.tilt += (Math.max(-1, Math.min(1, b.vx / 300)) - b.tilt) * Math.min(1, dt * 6);
    return { bonk: res, speed: sp };
  }
  function inRing(b, ring) { var dx = b.x - ring.x, dy = b.y - ring.y; return Math.sqrt(dx * dx + dy * dy) < ring.r - BOAT_R * 0.5; }

  // ── 描画 ──
  function drawPond(t, lv, spoutPhase) {
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [1, BLACK]]);
    // 芝生(市松ディザ)
    for (var y = 0; y < H; y += 24) for (var x = (y / 24) % 2 * 24; x < W; x += 48) {
      if (y > POND.t - 30 && y < POND.b + 30 && x > POND.l - 30 && x < POND.r + 30) continue;
      game.draw.rect(x, y, 24, 24, '#005500');
    }
    game.draw.rect(POND.l - 24, POND.t - 24, POND.r - POND.l + 48, POND.b - POND.t + 48, GREY);
    for (var s = POND.l - 24; s < POND.r + 24; s += 48) { game.draw.line(s, POND.t - 24, s, POND.t, BLACK, 2); game.draw.line(s + 24, POND.b, s + 24, POND.b + 24, BLACK, 2); }
    game.draw.rect(POND.l, POND.t, POND.r - POND.l, POND.b - POND.t, BLUE);
    // 水面のさざ波(流れの向きに動く)
    var drift = lv ? lv.drift : 0;
    for (var r = 0; r < 18; r++) {
      var ry = POND.t + 40 + r * 52;
      var off = ((t * (20 + drift * 2) + r * 97) % 260 + 260) % 260;
      for (var k = -1; k < 5; k++) {
        var rx = POND.l + off + k * 260;
        if (rx > POND.l && rx + 60 < POND.r) game.draw.line(rx, ry, rx + 60, ry, CYAN, 2);
      }
    }
    if (lv) {
      for (var i = 0; i < lv.pads.length; i++) {
        var p = lv.pads[i];
        game.draw.circle(p.x, p.y, p.r, GREEN);
        game.draw.line(p.x, p.y, p.x + p.r, p.y, BLUE, 6);
        game.draw.circle(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.25, '#55ff55');
      }
      if (lv.spout) {
        var sp = lv.spout;
        // 噴き上げ0.7秒前から泡が立つ(予告) → 噴き上げ中は外へ押し出す
        if (spoutPhase > 0.55 && spoutPhase < 0.85) for (var bb = 0; bb < 6; bb++) game.draw.circle(sp.x + Math.cos(bb + t * 9) * 50, sp.y + Math.sin(bb * 2 + t * 7) * 40, 10, Math.floor(t * 10) % 2 ? WHITE : RED);
        if (spoutPhase >= 0.85) { ringLine(sp.x, sp.y, 220 * (spoutPhase - 0.85) / 0.15 + 40, 24, WHITE, CYAN, 4); game.draw.circle(sp.x, sp.y, 46, WHITE); }
        game.draw.circle(sp.x, sp.y, 20, GREY);
      }
    }
  }

  function drawRing(ring, t, lit) {
    var bob = Math.sin(t * 2.5) * 6;
    ringLine(ring.x, ring.y + bob, ring.r, 16, lit ? YEL : RED, WHITE, 12);
    ringLine(ring.x, ring.y + bob, ring.r - 14, 32, CYAN, CYAN, 1);
    if (Math.floor(t * 4) % 2 === 0) ringLine(ring.x, ring.y + bob, ring.r + 16, 32, WHITE, WHITE, 2);
  }

  function drawBoat(b, pal, t, hl) {
    var fr = Math.abs(b.vx) + Math.abs(b.vy) > 60 ? Math.floor(t * 8) % 2 : (b.tilt > 0 ? 1 : 0);
    var sc = hl ? 1.5 : 1;
    if (hl) game.draw.circle(b.x, b.y, 80, WHITE);
    game.draw.circle(b.x, b.y + 30, BOAT_R + 6, '#000055');
    game.draw.sprite(YACHT[fr], pal, b.x, b.y, 11 * sc, { anchor: 'center' });
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > 80) for (var w = 1; w < 4; w++) game.draw.line(b.x - b.vx / sp * (40 + w * 22) - 14, b.y - b.vy / sp * (40 + w * 22) + 30, b.x - b.vx / sp * (40 + w * 22) + 14, b.y - b.vy / sp * (40 + w * 22) + 30, WHITE, 2);
  }

  function drawWind(wd) {
    if (!wd || wd.t <= 0) return;
    var dx = wd.x1 - wd.x0, dy = wd.y1 - wd.y0, len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var ux = dx / len, uy = dy / len, k = 1 - wd.t / 0.45;
    for (var i = -3; i <= 3; i++) {
      var ox = -uy * i * 40 * (1 + k * 2), oy = ux * i * 40 * (1 + k * 2);
      var sx = wd.x1 + ux * k * 420 + ox, sy = wd.y1 + uy * k * 420 + oy;
      game.draw.line(sx - ux * 90, sy - uy * 90, sx, sy, i % 2 ? WHITE : CYAN, 3);
    }
  }

  function drawMan(fan, live) {
    var x = W * 0.5, y = H * 0.82;
    frame(60, H * 0.745, W - 120, H * 0.205, live ? CYAN : GREY);
    game.draw.sprite(MAN[fan], MPAL, x, y + 40, 13, { anchor: 'center' });
  }

  // ── ゲーム状態 ──
  var lvNo, lv, boat, moored, timeLeft, ready, over, won, endT, score, perfects, prevBest, stroke, wind, halt, fanF, spoutT, moorT, dockT, bonks;

  function initGame() {
    lvNo = 0; moored = 0; timeLeft = TIME_LIMIT; ready = 0.8; over = false; won = false; endT = 0; score = 0; perfects = 0;
    prevBest = game.best || 0; stroke = null; wind = null; halt = null; fanF = 0; bonks = 0;
    startLevel();
  }
  function startLevel() { lv = LEVELS[lvNo]; boat = makeBoat(lv.start.x, lv.start.y); spoutT = 0; moorT = 0; dockT = 0; }
  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) score += Math.floor(timeLeft * 50);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }
  function spoutPhase(tt) { return lv && lv.spout ? (tt % lv.spout.period) / lv.spout.period : 0; }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.45); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || ready > 0 || halt || dockT > 0) return;
    stroke = { x0: x, y0: y, x: x, y: y, t: 0 };
    fanF = 1;
    game.audio.play('se_tap', 0.2);
  });
  game.onMove(function (x, y) {
    if (!stroke || state !== S.PLAYING) return;
    var moved = Math.abs(x - stroke.x) + Math.abs(y - stroke.y);
    stroke.x = x; stroke.y = y;
    if (moved > 30) { fanF = fanF === 1 ? 2 : 1; game.audio.tone(200 + Math.random() * 60, 0.03, { wave: 'sawtooth', volume: 0.02 }); }
  });
  game.onRelease(function (x, y) {
    if (!stroke || state !== S.PLAYING) { stroke = null; return; }
    var p = gust(boat, stroke.x0, stroke.y0, x, y, stroke.t);
    wind = { x0: stroke.x0, y0: stroke.y0, x1: x, y1: y, t: 0.45 };
    if (Math.abs(x - stroke.x0) + Math.abs(y - stroke.y0) < 40) wind = { x0: x, y0: y, x1: boat.x, y1: boat.y, t: 0.3 };
    stroke = null; fanF = 0;
    game.audio.tone(p > 0 ? 'D4' : 'A2', 0.18, { wave: 'sawtooth', volume: p > 0 ? 0.06 : 0.03, slide: p > 0 ? 300 : -60 });
    if (p > 300) game.fx.burst(boat.x, boat.y, { color: WHITE, count: 6, speed: 200 });
  });

  // ── ATTRACT ゴースト実演: 強すぎて岸にぶつける(失敗) → 戻して輪の中でぴたり(成功) ──
  var DEMO_LV = { ring: { x: W / 2, y: POND.t + 500, r: 100 }, drift: 0, pads: [], spout: null };
  var demo = { t: 0, boat: null, step: 0, gx: W / 2, gy: H * 0.6, press: false, moored: false, hl: 0, windD: null };
  var DEMO_STROKES = [
    { at: 0.6, x0: W / 2, y0: POND.t + 660, x1: W / 2, y1: POND.t + 240, dur: 0.1 },
    { at: 2.6, x0: W / 2, y0: POND.t + 40, x1: W / 2, y1: POND.t + 200, dur: 0.1 },
  ];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt || !demo.boat) { demo.boat = makeBoat(W / 2, POND.t + 220); demo.step = 0; demo.moored = false; demo.hl = 0; demo.windD = null; }
    if (demo.hl > 0) { demo.hl -= dt; if (demo.hl <= 0) game.feedback.bad(demo.boat.x, demo.boat.y - 120, { text: 'MISS', volume: 0.2, shake: 4 }); return; }
    var st = DEMO_STROKES[demo.step];
    demo.press = false;
    if (st) {
      var lead = cyc - (st.at - 0.35);
      if (lead > 0) {
        var k = Math.min(1, lead / 0.35);
        demo.gx = st.x0 + (st.x1 - st.x0) * k; demo.gy = st.y0 + (st.y1 - st.y0) * k; demo.press = k < 1;
        if (k >= 1) { gust(demo.boat, st.x0, st.y0, st.x1, st.y1, st.dur); demo.windD = { x0: st.x0, y0: st.y0, x1: st.x1, y1: st.y1, t: 0.45 }; demo.step++; }
      }
    }
    if (demo.windD) demo.windD.t -= dt;
    var r = stepBoat(demo.boat, dt, DEMO_LV, false);
    if (r.bonk) demo.hl = 0.35;
    if (!demo.moored && inRing(demo.boat, DEMO_LV.ring) && r.speed < 110 && demo.step >= 2) {
      demo.moored = true;
      game.feedback.good(demo.boat.x, demo.boat.y - 120, { text: 'GOOD', color: YEL, count: 10, volume: 0.2 });
    }
    if (demo.moored) { demo.boat.vx *= 0.8; demo.boat.vy *= 0.8; demo.boat.x += (DEMO_LV.ring.x - demo.boat.x) * dt * 3; demo.boat.y += (DEMO_LV.ring.y - demo.boat.y) * dt * 3; }
  }

  function drawHud() {
    frame(30, 24, W - 60, 200, CYAN);
    for (var i = 0; i < NEEDED; i++) {
      game.draw.sprite(YACHT[0], i < moored ? YPAL[i] : { w: GREY, m: GREY, b: GREY, k: BLACK }, 110 + i * 120, 100, 7, { anchor: 'center' });
    }
    txt(moored + ' / ' + NEEDED, W / 2 + 40, 92, 56, WHITE);
    txt(String(score), W - 170, 92, 44, YEL);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(70, 170, W - 140, 22, BLUE);
    game.draw.rect(70, 170, (W - 140) * fr, 22, timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : CYAN);
  }

  function drawResult() {
    frame(90, H * 0.24, W - 180, 400, won ? YEL : RED);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24 + 90, 96, won ? YEL : RED);
    txt(moored + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.24 + 185, 40, WHITE);
    if (score > prevBest && prevBest > 0) txt('NEW RECORD ' + score, W / 2, H * 0.24 + 260, 48, YEL);
    else txt('SCORE ' + score + '  BEST ' + Math.max(prevBest, score), W / 2, H * 0.24 + 260, 40, CYAN);
    if (!won) txt('あと' + (NEEDED - moored) + '艘!', W / 2, H * 0.24 + 340, 54, YEL);
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawPond(t, DEMO_LV, 0);
      drawRing(DEMO_LV.ring, t, demo.moored);
      drawBoat(demo.boat, YPAL[0], t, demo.hl > 0);
      drawWind(demo.windD);
      drawMan(demo.press ? 1 + Math.floor(t * 8) % 2 : 0, true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(TITLE, W / 2, H * 0.06, 88, YEL);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.105, 38, WHITE);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, YEL);
      else txt('TAP TO START', W / 2, H * 0.975, 40, WHITE);
      return;
    }
    if (state === S.RESULT) {
      drawPond(t, lv, 0);
      drawRing(lv.ring, t, false);
      drawBoat(boat, YPAL[lvNo % 3], t, false);
      drawMan(0, false);
      drawResult();
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 36, WHITE);
      return;
    }

    // ── PLAYING ──
    if (stroke) stroke.t += dt;
    if (wind) wind.t -= dt;
    var hl = false;
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { moored: moored, perfect: perfects, bonks: bonks };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (halt) {
      halt.t -= dt; hl = true;
      if (halt.t <= 0) { game.feedback.bad(boat.x, boat.y - 120, { text: 'MISS' }); timeLeft -= 1; halt = null; }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else if (dockT > 0) {
      // 係留の演出: ロープを掛けて次の艘へ
      dockT -= dt;
      boat.x += (lv.ring.x - boat.x) * Math.min(1, dt * 6); boat.y += (lv.ring.y - boat.y) * Math.min(1, dt * 6);
      if (dockT <= 0) {
        if (moored >= NEEDED) finish(true);
        else { lvNo++; startLevel(); game.audio.play('se_powerup', 0.25); }
      }
    } else {
      timeLeft -= dt;
      spoutT += dt;
      var ph = spoutPhase(spoutT);
      if (lv.spout && ph > 0.55 && spoutPhase(spoutT - dt) <= 0.55) game.audio.tone('E2', 0.4, { wave: 'square', volume: 0.04, slide: 80 });
      var spoutOn = lv.spout && ph >= 0.85;
      var r = stepBoat(boat, dt, lv, spoutOn);
      if (r.bonk) { bonks++; halt = { t: 0.35 }; game.audio.play('se_break', 0.3); }
      if (inRing(boat, lv.ring) && r.speed < 120) {
        moorT += dt;
        if (moorT >= 0.35) {
          moored++;
          var dc = Math.sqrt((boat.x - lv.ring.x) * (boat.x - lv.ring.x) + (boat.y - lv.ring.y) * (boat.y - lv.ring.y));
          var perfect = dc < lv.ring.r * 0.35;
          if (perfect) perfects++;
          score += perfect ? 400 : 250;
          game.feedback.good(boat.x, boat.y - 130, { text: perfect ? 'PERFECT' : 'GOOD', color: YEL, count: 18 });
          game.audio.play('se_coin', 0.35);
          if (moored === 2) { game.fx.popup(moored + ' / ' + NEEDED, W / 2, H * 0.4, { color: YEL, size: 70 }); game.audio.play('se_milestone', 0.4); }
          dockT = 0.7;
        }
      } else moorT = 0;
      if (timeLeft <= 0 && !over) { timeLeft = 0; game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' }); finish(false); }
    }

    drawPond(t, lv, spoutPhase(spoutT));
    drawRing(lv.ring, t, moorT > 0 || dockT > 0);
    if (dockT > 0) game.draw.line(lv.ring.x, lv.ring.y, boat.x, boat.y, BROWN, 6);
    drawBoat(boat, YPAL[lvNo % 3], t, hl);
    drawWind(wind);
    if (stroke) { game.draw.line(stroke.x0, stroke.y0, stroke.x, stroke.y, YEL, 4); game.draw.circle(stroke.x, stroke.y, 22, YEL); }
    drawMan(fanF, true);
    // 開始時お手本: ヨットの後ろから輪の方へなぞる手
    if (ready <= 0 && lvNo === 0 && timeLeft > TIME_LIMIT - 1.4 && !stroke && Math.abs(boat.vx) + Math.abs(boat.vy) < 20) {
      var hk = (t * 1.2) % 1;
      game.draw.hand(boat.x, boat.y + 140 - hk * 260, { press: true, scale: 12, alpha: 0.7 });
    }
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, YEL);
    if (over) drawResult();
  });

  game.onStart(function () {
    game.audio.melody([
      ['G4', 1], ['B4', 0.5], ['D5', 0.5], ['G5', 1], ['F#5', 0.5], ['E5', 0.5], ['D5', 1], ['B4', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 2],
    ], { tempo: 112, wave: 'square', volume: 0.045, loop: true, bass: [['G2', 2], ['C3', 2], ['D3', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
