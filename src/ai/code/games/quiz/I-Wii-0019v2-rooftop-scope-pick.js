// I-Wii-0019v2-rooftop-scope-pick.js
// 屋上スコープ選び — 屋上に並んだ2本の望遠鏡のうち、光る星により近い向きの1本を瞬時に選ぶ
// 操作: 2本の望遠鏡のうち、筒の向きが星により近い方(その真下の台座か望遠鏡そのもの)をタップ。選ぶと両方の視線が空へ伸びて答え合わせ。後半は雲が星を隠すので一瞬で見て覚える
// 終わり: 15秒以内に8つの星を記録すればCLEAR。遠い方を選ぶ/星の輪が縮み切る(迷う)のが3回、または時間切れでGAME OVER
// @mechanic: size_judge
// @theme: rooftop_star_party_scopes
// 世界観: 大学の屋上観測会で、天文サークルの学生が星が昇るたびに架台の2本の望遠鏡を見比べ、目標の星により近い角度を向いている方を覗いて観測記録をつけていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 記録した星の数・最大連続・スコア
// スタイル: 70s VECTOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光線だけ。基調はシアン/グリーン/白、差し色はアンバー
  var STYLE = { bg: ['#000006', '#020a1a'], main: ['#3cf2ff', '#7dff9a', '#e8fbff'], accent: ['#ffb43c', '#ff4a6a'] };
  var CY = STYLE.main[0], GR = STYLE.main[1], WH = STYLE.main[2], AMB = STYLE.accent[0], RED = STYLE.accent[1];

  var TITLE = 'SCOPE PICK';
  var TIME_LIMIT = 15;
  var NEEDED = 8;
  var LIVES = 3;
  var ROOF_Y = Math.round(H * 0.68);
  var TUBE_L = 190;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 学生(ベクター調の単色ドット)。見上げ / 指さし の2フレーム
  var STUDENT = [
    ['..ggg..', '.g...g.', '.g.g.g.', '..ggg..', '...g...', '.ggggg.', 'g..g..g', '...g...', '..g.g..', '.g...g.'],
    ['..ggg..', '.g...g.', '.g.g.g.', '..ggg..', '...g..g', '.gggggg', 'g..g...', '...g...', '..g.g..', '.g...g.'],
  ];
  var LOGBOOK = ['wwwww', 'w...w', 'w.w.w', 'w...w', 'wwwww'];

  // ── 描画ヘルパー(線だけで描く) ──
  function glow(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, col + '33', w * 3);
    game.draw.line(x1, y1, x2, y2, col + '88', w * 1.8);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function ring(x, y, r, col, w, seg) {
    var n = seg || 28;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }
  function arcRing(x, y, r, frac, col, w) {
    var n = Math.max(1, Math.floor(36 * frac));
    for (var i = 0; i < n; i++) {
      var a0 = -Math.PI / 2 + i / 36 * Math.PI * 2, a1 = -Math.PI / 2 + (i + 1) / 36 * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }
  function starShape(x, y, r, col, w, rot) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var rr = i % 2 === 0 ? r : r * 0.42, a = rot - Math.PI / 2 + i * Math.PI / 5;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    for (var k = 0; k < 10; k++) glow(pts[k][0], pts[k][1], pts[(k + 1) % 10][0], pts[(k + 1) % 10][1], col, w);
  }
  function txt(s, x, y, sz, col) {
    game.draw.text(s, x, y + 3, { size: sz, color: col + '55', bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center', font: 'monospace' });
  }

  var FAR = [];
  for (var fi = 0; fi < 40; fi++) FAR.push({ x: (fi * 263) % W, y: 250 + (fi * 397) % 900, p: fi * 0.7 });

  function drawSky(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.62, STYLE.bg[1]], [1, '#000000']]);
    for (var i = 0; i < FAR.length; i++) {
      var f = FAR[i], tw = 0.5 + 0.5 * Math.sin(t * 2 + f.p);
      game.draw.line(f.x - 3, f.y, f.x + 3, f.y, tw > 0.6 ? WH : '#5a7a8a', 2);
    }
    // 遠景の街明かりの稜線(線だけ)
    var prevX = 0, prevY = ROOF_Y - 120;
    for (var x = 60; x <= W; x += 60) {
      var y = ROOF_Y - 120 - ((x * 7) % 5) * 22 - (x % 180 === 0 ? 60 : 0);
      game.draw.line(prevX, prevY, x, prevY, '#1d4a5a', 3);
      game.draw.line(x, prevY, x, y, '#1d4a5a', 3);
      prevX = x; prevY = y;
    }
    // 屋上の手すりと床
    glow(0, ROOF_Y, W, ROOF_Y, CY, 3);
    for (var r = 40; r < W; r += 90) game.draw.line(r, ROOF_Y, r, ROOF_Y - 50, '#2a8a9a', 3);
    game.draw.line(0, ROOF_Y - 50, W, ROOF_Y - 50, '#2a8a9a', 3);
    for (var g = 0; g < 6; g++) {
      var yy = ROOF_Y + 40 + g * g * 9;
      game.draw.line(0, yy, W, yy, '#12303a', 2);
    }
  }

  // ── 出題生成(本番とデモ共通) ──
  function rad(d) { return d * Math.PI / 180; }
  function wrapDeg(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }
  function makeRound(r) {
    var sx = 200 + Math.random() * 680, sy = 420 + Math.random() * 460;
    var leftX = 170 + Math.random() * 200, rightX = 710 + Math.random() * 200;
    var scopes = [
      { x: leftX, y: ROOF_Y - 70 - Math.random() * 60 },
      { x: rightX, y: ROOF_Y - 70 - Math.random() * 60 },
    ];
    var good = Math.random() < 0.5 ? 0 : 1;
    var diff = Math.max(9, 30 - r * 3);
    var eGood = (1 + Math.random() * 4) * (Math.random() < 0.5 ? -1 : 1);
    var eBad = (Math.abs(eGood) + diff + Math.random() * 4) * (Math.random() < 0.5 ? -1 : 1);
    for (var i = 0; i < 2; i++) {
      var s = scopes[i];
      var toStar = Math.atan2(sy - s.y, sx - s.x) * 180 / Math.PI;
      var e = i === good ? eGood : eBad;
      var a = toStar + e;
      if (a > -12) a = toStar - Math.abs(e);
      if (a < -168) a = toStar + Math.abs(e);
      s.ang = a; s.err = Math.abs(wrapDeg(a - toStar));
    }
    good = scopes[0].err <= scopes[1].err ? 0 : 1;
    return {
      sx: sx, sy: sy, scopes: scopes, good: good,
      limit: Math.max(1.6, 2.6 - r * 0.12),
      cloud: r >= 4, gold: r === 3 || r === 7,
      cloudDir: Math.random() < 0.5 ? -1 : 1,
    };
  }

  function cloudCover(rd, t) {
    // 0.8秒で星を覆う(0.6秒前から輪郭が近づいて見える=予告)
    if (!rd.cloud) return 0;
    return Math.max(0, Math.min(1, t / 0.8));
  }

  function drawCloud(rd, t) {
    if (!rd.cloud) return;
    var k = cloudCover(rd, t);
    var cx = rd.sx + rd.cloudDir * (1 - k) * 520, cy = rd.sy;
    var puffs = [[-120, 10, 80], [-40, -30, 100], [60, -10, 95], [140, 20, 70], [10, 40, 90]];
    for (var i = 0; i < puffs.length; i++) ring(cx + puffs[i][0], cy + puffs[i][1], puffs[i][2], k >= 1 ? '#7a8aa0' : '#9ab0c8', 4, 22);
    if (k >= 1) {
      // 覆い終えた雲はハッチで塗りつぶし(星を完全に隠す)
      for (var hy = -110; hy <= 110; hy += 14) {
        var half = Math.sqrt(Math.max(0, 1 - (hy * hy) / (130 * 130))) * 200;
        game.draw.line(cx - half, cy + hy, cx + half, cy + hy, '#26324a', 10);
      }
    }
  }

  function drawStar(rd, t, shrink) {
    var k = cloudCover(rd, t);
    var col = rd.gold ? AMB : WH;
    var blink = Math.floor(t * 8) % 2 === 0;
    if (k < 1) {
      var pulse = 1 + Math.sin(t * 9) * 0.08;
      starShape(rd.sx, rd.sy, 44 * pulse, col, 4, t * 0.6);
      ring(rd.sx, rd.sy, 70 * pulse, blink ? WH : col, 3, 24);
      if (rd.gold) for (var g = 0; g < 4; g++) {
        var ga = t * 3 + g * Math.PI / 2;
        glow(rd.sx + Math.cos(ga) * 95, rd.sy + Math.sin(ga) * 95, rd.sx + Math.cos(ga) * 115, rd.sy + Math.sin(ga) * 115, AMB, 3);
      }
    }
    // 残り時間リング(星の輪が縮む)
    if (shrink !== null) arcRing(rd.sx, rd.sy, 110, shrink, shrink < 0.3 && blink ? RED : CY, 6);
  }

  function drawScope(s, hl, col, pressed) {
    var a = rad(s.ang);
    var sc = 1 + hl * 0.25;
    var ex = s.x + Math.cos(a) * TUBE_L * sc, ey = s.y + Math.sin(a) * TUBE_L * sc;
    var bx = s.x - Math.cos(a) * 60 * sc, by = s.y - Math.sin(a) * 60 * sc;
    // 三脚
    glow(s.x, s.y, s.x - 70, ROOF_Y + 30, col, 3);
    glow(s.x, s.y, s.x + 70, ROOF_Y + 30, col, 3);
    glow(s.x, s.y, s.x, ROOF_Y + 40, col, 3);
    // 筒(太い発光線2本+口径の輪)
    var nx = -Math.sin(a) * 16 * sc, ny = Math.cos(a) * 16 * sc;
    glow(bx + nx, by + ny, ex + nx, ey + ny, hl > 0 ? WH : col, 4);
    glow(bx - nx, by - ny, ex - nx, ey - ny, hl > 0 ? WH : col, 4);
    glow(ex + nx * 1.3, ey + ny * 1.3, ex - nx * 1.3, ey - ny * 1.3, hl > 0 ? WH : col, 5);
    ring(s.x, s.y, 12, col, 3, 10);
    // 親指ゾーンの台座パッド(押せる領域は縁を光らせる)
    var py = Math.round(H * 0.81);
    var bob = Math.sin(game.time.elapsed * 4 + s.x) * 6;
    var pc = pressed ? WH : (Math.floor(game.time.elapsed * 3) % 2 === 0 ? col : '#1f7f8a');
    glow(s.x - 120, py + bob, s.x + 120, py + bob, pc, 4);
    glow(s.x - 120, py + 110 + bob, s.x + 120, py + 110 + bob, pc, 4);
    glow(s.x - 120, py + bob, s.x - 120, py + 110 + bob, pc, 4);
    glow(s.x + 120, py + bob, s.x + 120, py + 110 + bob, pc, 4);
    ring(s.x, py + 55 + bob, 30, pc, 4, 16);
    game.draw.line(s.x, ROOF_Y + 40, s.x, py + bob, col + '44', 2);
  }

  function drawSight(rd, s, col, k) {
    // 視線(答え合わせ): 筒の先から空へ伸びる点線
    var a = rad(s.ang);
    var len = 1300 * k;
    for (var d = TUBE_L; d < TUBE_L + len; d += 46) {
      var d2 = Math.min(d + 24, TUBE_L + len);
      glow(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, s.x + Math.cos(a) * d2, s.y + Math.sin(a) * d2, col, 3);
    }
  }

  function drawStudent(x, y, frame, sad) {
    var bob = Math.sin(game.time.elapsed * 5) * 5;
    game.draw.sprite(STUDENT[frame], { g: sad ? RED : GR }, x, y + bob, 12, { anchor: 'center', flipX: x > W / 2 });
  }

  // ── ゲーム状態 ──
  var round, rd, rt, phase, phaseT, picked, lives, logged, timeLeft, ready, over, won, endT, score, combo, maxCombo, prevBest, flashT;

  function initGame() {
    round = 0; lives = LIVES; logged = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    over = false; won = false; endT = 0; score = 0; combo = 0; maxCombo = 0; flashT = 0;
    prevBest = game.best || 0;
    nextRound();
  }
  function nextRound() {
    rd = makeRound(round);
    rt = 0; phase = 'aim'; phaseT = 0; picked = -1;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) score += Math.floor(timeLeft * 40) + lives * 150;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function judgePick(i) {
    picked = i;
    if (i === rd.good) {
      combo++; maxCombo = Math.max(maxCombo, combo);
      logged++;
      var left = Math.max(0, rd.limit - rt);
      var pts = Math.floor((100 + left * 60) * (1 + Math.min(combo - 1, 4) * 0.25) * (rd.gold ? 2 : 1));
      score += pts;
      var perfect = rt < rd.limit * 0.45;
      game.feedback.good(rd.scopes[i].x, rd.scopes[i].y - 230, { text: perfect ? 'PERFECT' : 'GOOD', color: rd.gold ? AMB : GR, count: 16 });
      if (rd.gold) game.audio.play('se_powerup', 0.35);
      if (combo >= 3) game.fx.popup('x' + combo, rd.sx, rd.sy - 150, { color: AMB, size: 56 });
      if (logged === Math.ceil(NEEDED / 2)) { game.fx.popup(logged + ' / ' + NEEDED, W / 2, 320, { color: CY, size: 64 }); game.audio.play('se_milestone', 0.4); }
      phase = 'reveal'; phaseT = 0.55;
    } else {
      combo = 0;
      game.audio.play('se_tap', 0.3);
      phase = 'stop'; phaseT = 0.45;
    }
  }

  function loseLife() {
    lives--;
    game.feedback.bad(rd.scopes[picked >= 0 ? picked : rd.good].x, ROOF_Y - 260, { text: 'MISS' });
    game.audio.play('se_break', 0.25);
    phase = 'reveal'; phaseT = 0.6;
  }

  function pickAt(x) {
    var d0 = Math.abs(x - rd.scopes[0].x), d1 = Math.abs(x - rd.scopes[1].x);
    return d0 <= d1 ? 0 : 1;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.45); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || ready > 0 || phase !== 'aim') { game.audio.play('se_tap', 0.05); return; }
    if (y < 230) return;
    flashT = 0.12;
    judgePick(pickAt(x));
  });

  // ── ATTRACT ゴースト実演: 正しい方を選ぶ → 次は遠い方を選んで失敗 ──
  var demo = { t: 0, rd: null, rt: 0, phase: 'aim', phaseT: 0, pick: -1, gx: W / 2, gy: 1700, press: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt || !demo.rd) { demo.n = 0; demo.rd = makeRound(1); demo.rt = 0; demo.phase = 'aim'; demo.pick = -1; }
    demo.rt += dt;
    if (demo.press > 0) demo.press -= dt;
    var target = demo.n === 0 ? demo.rd.good : 1 - demo.rd.good;
    var tx = demo.rd.scopes[target].x, ty = 1615;
    if (demo.phase === 'aim') {
      if (demo.rt > 0.5) { demo.gx += (tx - demo.gx) * Math.min(1, dt * 6); demo.gy += (ty - demo.gy) * Math.min(1, dt * 6); }
      if (demo.rt > 1.2) {
        demo.pick = target; demo.press = 0.25;
        if (target === demo.rd.good) { game.feedback.good(tx, demo.rd.scopes[target].y - 230, { text: 'GOOD', color: GR, count: 10, volume: 0.2 }); demo.phase = 'reveal'; demo.phaseT = 0.9; }
        else { game.audio.play('se_tap', 0.1); demo.phase = 'stop'; demo.phaseT = 0.45; }
      }
    } else if (demo.phase === 'stop') {
      demo.phaseT -= dt;
      if (demo.phaseT <= 0) { game.feedback.bad(tx, ROOF_Y - 260, { text: 'MISS', volume: 0.2, shake: 4 }); demo.phase = 'reveal'; demo.phaseT = 0.9; }
    } else if (demo.phase === 'reveal') {
      demo.phaseT -= dt;
      if (demo.phaseT <= 0 && demo.n === 0) { demo.n = 1; demo.rd = makeRound(2); demo.rt = 0; demo.phase = 'aim'; demo.pick = -1; }
    }
  }

  function drawRoundScene(r, t, ph, pk, phT, live) {
    drawCloud(r, t);
    var shrink = ph === 'aim' ? Math.max(0, 1 - t / r.limit) : null;
    drawStar(r, t, shrink);
    var revealK = ph === 'reveal' ? 1 : (ph === 'stop' ? 0.6 : 0);
    for (var i = 0; i < 2; i++) {
      var s = r.scopes[i];
      var col = CY;
      if (ph !== 'aim') col = i === r.good ? GR : RED;
      var hl = (ph === 'stop' && i === pk) ? Math.min(1, phT / 0.45) : 0;
      if (revealK > 0) drawSight(r, s, col, revealK);
      drawScope(s, hl, col, live && flashT > 0 && pickAt(game.input.x) === i);
    }
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) {
      var x = 110 + i * 70, y = 90;
      if (i < logged) starShape(x, y, 24, AMB, 3, 0);
      else ring(x, y, 12, '#2a5a6a', 3, 10);
    }
    txt(logged + ' / ' + NEEDED, W - 150, 80, 44, WH);
    txt(String(score), W - 150, 140, 36, AMB);
    for (var l = 0; l < LIVES; l++) ring(110 + l * 60, 150, 20, l < lives ? CY : RED, 4, 14);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    glow(60, 205, 60 + (W - 120) * fr, 205, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : CY, 5);
  }

  function drawResultPanel() {
    glow(90, 300, W - 90, 300, won ? GR : RED, 4);
    glow(90, 720, W - 90, 720, won ? GR : RED, 4);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 380, 96, won ? GR : RED);
    txt(logged + ' / ' + NEEDED + '  x' + maxCombo, W / 2, 480, 44, WH);
    txt('SCORE ' + score, W / 2, 550, 48, AMB);
    if (score > prevBest && prevBest > 0) txt('NEW RECORD', W / 2, 620, 54, AMB);
    else txt('BEST ' + Math.max(prevBest, score), W / 2, 620, 36, CY);
    if (!won) txt('あと' + (NEEDED - logged) + '個!', W / 2, 680, 48, AMB);
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawSky(t);
      drawRoundScene(demo.rd, demo.rt, demo.phase, demo.pick, demo.phaseT, false);
      drawStudent(W / 2, H * 0.77, demo.phase === 'aim' ? 0 : 1, demo.phase === 'stop');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      game.draw.sprite(LOGBOOK, { w: AMB }, W / 2 - 330, 150, 10, { anchor: 'center' });
      txt(TITLE, W / 2, H * 0.08, 84, CY);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 240, 36, AMB);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, AMB);
      else txt('TAP TO START', W / 2, H * 0.96, 40, WH);
      return;
    }

    if (state === S.RESULT) {
      drawSky(t);
      drawStudent(W / 2, H * 0.77, won ? 1 : 0, !won);
      drawResultPanel();
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 36, WH);
      return;
    }

    // ── PLAYING ──
    if (flashT > 0) flashT -= dt;
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { stars: logged, maxCombo: maxCombo, lives: lives };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      if (phase !== 'stop') timeLeft -= dt;
      rt += dt;
      if (phase === 'aim' && rd.cloud && rt - dt < 0.8 && rt >= 0.8) game.audio.tone('E3', 0.2, { wave: 'triangle', volume: 0.05, slide: -60 });
      if (phase === 'aim' && rt >= rd.limit) { combo = 0; picked = -1; phase = 'stop'; phaseT = 0.45; game.audio.tone('A2', 0.2, { wave: 'square', volume: 0.06 }); }
      else if (phase === 'stop') { phaseT -= dt; if (phaseT <= 0) loseLife(); }
      else if (phase === 'reveal') {
        phaseT -= dt;
        if (phaseT <= 0) {
          if (logged >= NEEDED) finish(true);
          else if (lives <= 0) finish(false);
          else { round++; nextRound(); }
        }
      }
      if (timeLeft <= 0 && !over) { timeLeft = 0; game.feedback.bad(W / 2, 700, { text: 'TIME UP' }); finish(false); }
    }

    drawSky(t);
    drawRoundScene(rd, ready > 0 ? 0 : rt, ready > 0 ? 'aim' : phase, picked, phaseT, true);
    drawStudent(W / 2, H * 0.77, phase === 'aim' ? 0 : 1, phase === 'stop');
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 110, AMB);
    if (over) drawResultPanel();
  });

  game.onStart(function () {
    game.audio.melody([
      ['E4', 1], ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['F#4', 1], ['R', 0.5], ['D4', 0.5], ['E4', 1], ['G4', 1], ['B3', 2],
    ], { tempo: 104, wave: 'triangle', volume: 0.05, loop: true, bass: [['E2', 2], ['C3', 2], ['D3', 2], ['B2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
