// I-GBA-0058v3-monsoon-alley-fruit-basket.js
// 雨季の路地の果物かご — 頭にかごを乗せた売り子が、頭上を通り過ぎる日よけ布から垂れる雨だれをよけて市場の路地を歩き抜ける
// 操作: 画面の左半分/右半分を押し続けるとその向きへ歩み寄る(離すと惰性で止まる)。速く動いている最中に急に逆へ切り返すと、頭のかごが揺れて果物がこぼれる
// 終わり: 18秒歩き抜いて路地の出口の屋台に着けばCLEAR。雨だれに打たれる/かごを揺らしすぎるたびに果物を1つ失い、3つ全部失うとGAME OVER
// @mechanic: dodge
// @theme: monsoon_market_alley_basket
// 世界観: 雨季の市場の路地で、頭に果物かごを乗せた売り子が、路地をまたいで張られた日よけ布のたるみから落ちる雨だれを先読みしてよけ、かごを揺らさず出口の屋台まで運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 残った果物の数・かすった雨だれの数・歩いた距離・スコア
// スタイル: MODE7 PSEUDO

(function (game) {
  var STYLE = { bg: ['#4e5a66', '#7d8a94', '#a9b4ba'], main: ['#5a4a3e', '#2e3a44', '#e04a6a'], accent: ['#ffb43a', '#8fe0ff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var STORM = STYLE.bg[0], MIST = STYLE.bg[1], PALE = STYLE.bg[2];
  var WALL = STYLE.main[0], STONE = STYLE.main[1], SCARF = STYLE.main[2];
  var MANGO = STYLE.accent[0], DROP = STYLE.accent[1];
  var INK = '#12161a', WHITE = '#f4f6f6', RED = '#ff4a4a', LANTERN = '#e8402a';

  var TITLE = 'RAINY ALLEY';
  var TIME_LIMIT = 18;
  var FRUITS = 3;
  var HORIZON = H * 0.3, F = 1000, CAM = 1.29, ZV = 1.6, Z_FAR = 9.5, V = 2.6, TARP_T = 2.1;
  var X_MAX = 0.68, ACC = 5, MAX_V = 1.3, FRIC = 3, HIT_R = 0.16, GRAZE_R = 0.3;
  var LANES = [-0.6, -0.3, 0, 0.3, 0.6];
  var PATTERNS = [[2], [0, 4], [1, 3], [2, 4], [0, 1], [3, 4], [0, 2, 4], [1, 2], [2, 3, 4], [0, 1, 3], [1, 3, 4], [0, 2, 3], [0, 1, 4], [1, 2, 4], [0, 2, 3], [2, 3, 4]];
  var TARP_COLS = [['#2a7ab0', '#7ac0e0'], ['#d0702a', '#f0b060'], ['#3a9a5a', '#8ad09a'], ['#9a3a6a', '#d080a8']];

  var VENDOR = [
    ['.a..kkkk..a.', '.a.kkkkkk.a.', '.a.kkkkkk.a.', '.a..ssss..a.', '.aawwwwwwaa.', '...wwwwww...', '...wwwwww...', '...rrrrrr...', '..pppppppp..', '..pppppppp..', '.pppppppppp.', '.pppppppppp.', '..ff....ff..'],
    ['.a..kkkk..a.', '.a.kkkkkk.a.', '.a.kkkkkk.a.', '.a..ssss..a.', '.aawwwwwwaa.', '...wwwwww...', '...wwwwww...', '...rrrrrr...', '..pppppppp..', '..pppppppp..', '.pppppppppp.', '..pppppppp..', '...ff..ff...'],
  ];
  var V_PAL = { k: SCARF, s: '#a8704a', a: '#a8704a', w: '#f0e0c0', r: '#3a8a5a', p: '#4a5ab0', f: '#2a1a10' };
  var FRUIT_COL = [MANGO, '#8ad040', '#ff6a4a'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var px, pvx, wob, fruits, tarps, streams, clock, timeLeft, grazes, score, ready, halt, over, won, endT, resT, sent, prevBest;
  var holdDir, warnT, falling, section, hitFlash, demoMode;

  function D(z) { return F / Math.max(0.2, z); }
  function sx(X, z) { return W / 2 + D(z) * X; }

  function buildTarps(fixed) {
    if (fixed) return fixed;
    var list = [], t = 2.6;
    for (var i = 0; i < PATTERNS.length; i++) {
      list.push({ arrive: t, drips: PATTERNS[i], col: TARP_COLS[i % 4], warned: false, fell: false, gate: false });
      t += Math.max(0.85, 1.5 - i * 0.05);
      if (i === 2 || i === 6) { list.push({ arrive: t - 0.45, drips: [], col: TARP_COLS[1], warned: true, fell: false, gate: true }); }
      if (t > TIME_LIMIT - 0.6) break;
    }
    return list;
  }

  function initGame() {
    px = 0; pvx = 0; wob = 0; fruits = FRUITS; tarps = buildTarps(); streams = []; clock = 0; timeLeft = TIME_LIMIT;
    grazes = 0; score = 0; ready = 0.8; halt = null; over = false; won = false; endT = 0; resT = 0; sent = false;
    prevBest = game.best || 0; holdDir = 0; warnT = 0; falling = []; section = 0; hitFlash = 0;
  }

  // ── 歩きとかごの揺れ(プレイ・デモ共通) ──
  function stepVendor(dt, vol) {
    var ax = 0;
    if (holdDir !== 0) ax = holdDir * ACC;
    else if (pvx !== 0) ax = -Math.sign(pvx) * Math.min(FRIC, Math.abs(pvx) / dt);
    // 動いている向きと逆に力をかけた分だけかごが揺れる
    if (holdDir !== 0 && pvx * ax < 0) wob += -pvx * ax * 0.9 * dt;
    pvx = Math.max(-MAX_V, Math.min(MAX_V, pvx + ax * dt));
    px += pvx * dt;
    if (px < -X_MAX) { px = -X_MAX; pvx = 0; }
    if (px > X_MAX) { px = X_MAX; pvx = 0; }
    wob = Math.max(0, wob - 0.55 * dt);
    if (wob > 0.6) {
      warnT -= dt;
      if (warnT <= 0) { warnT = 0.2; game.audio.tone(260, 0.06, { wave: 'square', volume: 0.05 * vol, slide: -60 }); }
    }
    return wob >= 1;
  }

  function tarpZ(tp, t) { return ZV + (tp.arrive - t) * V; }

  // 布が頭上を過ぎた瞬間に雨だれが落ちる。当たり/かすりを判定
  function stepTarps(t, vol) {
    var hit = null;
    for (var i = 0; i < tarps.length; i++) {
      var tp = tarps[i];
      var z = tarpZ(tp, t);
      if (!tp.warned && z - ZV < V * 0.65 && z > ZV) {
        tp.warned = true;
        game.audio.tone(980, 0.07, { wave: 'triangle', volume: 0.05 * vol });
      }
      if (!tp.fell && z <= ZV) {
        tp.fell = true;
        if (tp.gate) {
          section++;
          if (state === S.PLAYING) { game.fx.popup(section + ' / 3', W / 2, H * 0.34, { color: WHITE, size: 72 }); game.audio.play('se_milestone', 0.4); }
          continue;
        }
        var best = 9;
        for (var k = 0; k < tp.drips.length; k++) {
          var X = LANES[tp.drips[k]];
          streams.push({ X: X, t: 0.35 });
          best = Math.min(best, Math.abs(px - X));
          if (Math.abs(px - X) < HIT_R) hit = X;
        }
        if (!hit && best < GRAZE_R) {
          grazes++;
          if (state === S.PLAYING) score += 50;
          game.feedback.good(sx(px, ZV), H * 0.5, { text: 'NICE', color: DROP, count: 8, volume: 0.4 * vol });
          game.audio.play('se_coin', 0.25 * vol);
        } else if (!hit) {
          game.audio.tone(520, 0.05, { wave: 'sine', volume: 0.04 * vol });
        }
      }
    }
    return hit;
  }

  function loseFruit(kind, vol) {
    fruits--;
    var fx = sx(px, ZV);
    falling.push({ x: fx + (kind === 'wob' ? (Math.random() < 0.5 ? -1 : 1) * 80 : 0), y: H * 0.54, vx: game.random(-200, 200), vy: -300, c: FRUIT_COL[Math.max(0, fruits)] });
    wob = 0.25;
    game.feedback.bad(fx, H * 0.5, { text: 'MISS', volume: 0.6 * vol });
    game.audio.play('se_break', 0.3 * vol);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) score += fruits * 300 + Math.floor(TIME_LIMIT * 10);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.1 + i * 0.16), H * (0.3 + (i % 2) * 0.12), { color: i % 2 ? MANGO : DROP, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { fruits: fruits, grazes: grazes, meters: Math.floor((TIME_LIMIT - timeLeft) * V * 10) / 10 };
    if (won) game.end.success(Math.floor(score), stats); else game.end.failure(stats);
  }

  function readHold() {
    var l = false, r = false, ts = game.touches;
    for (var i = 0; i < ts.length; i++) { if (ts[i].x < W / 2) l = true; else r = true; }
    holdDir = l && !r ? -1 : r && !l ? 1 : 0;
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING) return;
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    var dir = x < W / 2 ? -1 : 1;
    hitFlash = 0;
    game.audio.tone(dir < 0 ? 300 : 360, 0.05, { wave: 'triangle', volume: 0.06, slide: dir * 80 });
    if (pvx * dir < -0.6) game.fx.burst(sx(px, ZV), H * 0.55, { color: MANGO, count: 3, speed: 120 });
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (!over && !halt) game.audio.tone(240, 0.03, { wave: 'sine', volume: 0.03 });
  });

  // ── 描画(MODE7: 横ストリップを奥ほど圧縮) ──
  function drawAlley(t) {
    game.draw.gradient(0, HORIZON + 2, [STORM, MIST, PALE]);
    for (var b = 0; b < 9; b++) game.draw.rect(b * 130 - 20, HORIZON - 60 - (b * 41) % 70, 120, 80 + (b * 41) % 70, '#5f6b74');
    var scroll = t * V;
    // 床
    for (var y = HORIZON + 2; y < H; y += 4) {
      var z = F * CAM / (y - HORIZON);
      var band = Math.floor((z + scroll) * 1.6) % 2 === 0;
      var fog = Math.min(1, z / Z_FAR);
      game.draw.rect(0, y, W, 4, band ? STONE : '#3a4852');
      if (fog > 0.4) game.draw.rect(0, y, W, 4, PALE, (fog - 0.4) * 0.8);
      // 壁(左右から消失点へ)
      var wx = (y - HORIZON) / CAM * 0.95;
      var shop = Math.floor((z + scroll) / 1.4) % 3;
      var wc = shop === 0 ? WALL : shop === 1 ? '#6a5040' : '#4a3e34';
      game.draw.rect(0, y, W / 2 - wx, 4, wc);
      game.draw.rect(W / 2 + wx, y, W / 2 - wx, 4, wc);
    }
    // 床の雨の筋(中央の溝)
    game.draw.line(W / 2, HORIZON, W / 2 - 40, H, '#26323a', 6);
    for (var y2 = 0; y2 < HORIZON; y2 += 4) {
      var wx2 = (HORIZON - y2) / (3 - CAM) * 0.95;
      game.draw.rect(0, y2, W / 2 - wx2, 4, '#4a3e34');
      game.draw.rect(W / 2 + wx2, y2, W / 2 - wx2, 4, '#3e342c');
    }
    // 店先の柱と提灯が手前へ流れる
    for (var p = 0; p < 7; p++) {
      var pz = Z_FAR - ((scroll + p * 1.4) % (Z_FAR - 1.0));
      var d = D(pz);
      var fy = HORIZON + d * CAM, ty = HORIZON - d * (2.6 - CAM);
      for (var s = -1; s <= 1; s += 2) {
        var x = W / 2 + s * d * 0.95;
        game.draw.line(x, fy, x, ty, '#2a221c', Math.max(2, d * 0.05));
        game.draw.circle(x - s * d * 0.08, HORIZON - d * (1.9 - CAM), Math.max(3, d * 0.07), LANTERN);
        game.draw.circle(x - s * d * 0.08, HORIZON - d * (1.9 - CAM), Math.max(5, d * 0.12), MANGO, 0.15);
      }
    }
  }

  function drawTarps(t, hl) {
    for (var i = tarps.length - 1; i >= 0; i--) {
      var tp = tarps[i];
      var z = tarpZ(tp, t);
      if (z > Z_FAR || z < ZV - 0.25) continue;
      var d = D(z);
      var y = HORIZON - d * (TARP_T - CAM);
      var x0 = W / 2 - d * 0.95, x1 = W / 2 + d * 0.95;
      var th = Math.max(3, d * 0.07);
      var sag = d * 0.06;
      if (tp.gate) {
        game.draw.line(x0, HORIZON + d * CAM, x0, y, LANTERN, th);
        game.draw.line(x1, HORIZON + d * CAM, x1, y, LANTERN, th);
        game.draw.line(x0 - th, y, x1 + th, y, LANTERN, th * 1.6);
        for (var g = 0; g < 5; g++) game.draw.circle(x0 + (x1 - x0) * (g + 0.5) / 5, y + th * 2, th * 0.9, MANGO);
        continue;
      }
      var n = 8;
      for (var k = 0; k < n; k++) {
        var a = k / n, b2 = (k + 1) / n;
        var ya = y + Math.sin(a * Math.PI) * sag, yb = y + Math.sin(b2 * Math.PI) * sag;
        game.draw.line(x0 + (x1 - x0) * a, ya, x0 + (x1 - x0) * b2, yb, k % 2 ? tp.col[0] : tp.col[1], th);
      }
      var near = z - ZV < V * 0.65;
      for (var q = 0; q < tp.drips.length; q++) {
        var X = LANES[tp.drips[q]];
        var dx = sx(X, z);
        var ay = y + Math.sin(((X + 0.95) / 1.9) * Math.PI) * sag + th;
        var blink = near && Math.floor(t * 12) % 2 === 0;
        game.draw.circle(dx, ay + d * 0.02, Math.max(3, d * 0.035), blink ? RED : DROP);
        if (blink) game.draw.circle(dx, ay + d * 0.02, Math.max(6, d * 0.07), WHITE, 0.4);
        // 床の予告: 落ちる場所の波紋
        var fy = HORIZON + d * CAM;
        game.draw.circle(dx, fy, Math.max(3, d * 0.06), near ? RED : DROP, near ? 0.6 : 0.35);
      }
    }
    for (var s = 0; s < streams.length; s++) {
      var st = streams[s];
      var x = sx(st.X, ZV);
      var col = hl && Math.abs(st.X - px) < HIT_R ? WHITE : DROP;
      game.draw.line(x, 40, x, H * 0.72, col, hl && col === WHITE ? 30 : 16);
      game.draw.circle(x, H * 0.72, 40 * (1 - st.t), DROP, 0.5);
    }
  }

  function drawVendor(hl) {
    var x = sx(px, ZV), feet = HORIZON + D(ZV) * CAM;
    for (var s = -2; s <= 2; s++) game.draw.circle(x + s * 34, feet + 6, 30, INK, 0.25);
    var fr = VENDOR[Math.floor(game.time.elapsed * 6) % 2];
    game.draw.sprite(fr, V_PAL, x, feet - 143, 22, { anchor: 'center' });
    // 頭上のかご(揺れで傾く)
    var ang = Math.sin(game.time.elapsed * 14) * wob * 0.35 + pvx * 0.05;
    var cy = feet - 300, bw = 120, bh = 60;
    var ca = Math.cos(ang), sa = Math.sin(ang);
    function pt(dx, dy) { return { x: x + dx * ca - dy * sa, y: cy + dx * sa + dy * ca }; }
    var c1 = pt(-bw, -bh / 2), c2 = pt(bw, -bh / 2), c3 = pt(bw * 0.7, bh / 2), c4 = pt(-bw * 0.7, bh / 2);
    var bc = hl ? WHITE : '#b07a3a';
    for (var r = 0; r < 5; r++) {
      var k = r / 4;
      var l = { x: c1.x + (c4.x - c1.x) * k, y: c1.y + (c4.y - c1.y) * k }, rr = { x: c2.x + (c3.x - c2.x) * k, y: c2.y + (c3.y - c2.y) * k };
      game.draw.line(l.x, l.y, rr.x, rr.y, r % 2 ? '#8a5a2a' : bc, 14);
    }
    for (var f = 0; f < fruits; f++) {
      var fp = pt(-60 + f * 60 + Math.sin(game.time.elapsed * 14 + f) * wob * 20, -bh / 2 - 26);
      game.draw.circle(fp.x, fp.y, 34, FRUIT_COL[f]);
      game.draw.circle(fp.x - 10, fp.y - 10, 10, WHITE, 0.5);
    }
    if (wob > 0.6 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.circle(x, cy - 30, 170, RED, 0.18);
  }

  function drawFalling(dt) {
    for (var i = falling.length - 1; i >= 0; i--) {
      var f = falling[i];
      f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 1500 * dt;
      if (f.y > H * 0.76) { f.y = H * 0.76; f.vy = 0; f.vx *= 0.9; }
      game.draw.circle(f.x, f.y, 30, f.c);
    }
  }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawPads() {
    for (var i = 0; i < 2; i++) {
      var dir = i === 0 ? -1 : 1;
      var cx = i === 0 ? W * 0.18 : W * 0.82, cy = H * 0.86;
      var on = holdDir === dir;
      game.draw.circle(cx, cy, 120, on ? MANGO : '#2a3238', on ? 0.85 : 0.7);
      game.draw.circle(cx, cy, 120, WHITE, Math.floor(game.time.elapsed * 3) % 2 === 0 ? 0.12 : 0.05);
      for (var a = 0; a < 3; a++) {
        var tipX = cx + dir * (a * 30 - 10), armX = tipX - dir * 60;
        game.draw.line(armX, cy - 40, tipX, cy, WHITE, 12);
        game.draw.line(tipX, cy, armX, cy + 40, WHITE, 12);
      }
    }
  }

  function drawHud() {
    for (var f = 0; f < FRUITS; f++) game.draw.circle(80 + f * 80, 90, 30, f < fruits ? FRUIT_COL[f] : '#2a3036');
    big(String(Math.floor(score)), W / 2, 90, 60, WHITE);
    big(Math.floor((TIME_LIMIT - timeLeft) * V) + 'm', W - 130, 90, 48, DROP);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 176, W - 120, 22, INK, 0.6);
    game.draw.rect(60 + (W - 120) * (1 - fr), 176, (W - 120) * fr, 22, timeLeft < 4 ? MANGO : DROP);
    game.draw.circle(W - 60, 187, 20, LANTERN);
    // かご揺れメーター
    game.draw.rect(W / 2 - 150, 222, 300, 18, INK, 0.6);
    game.draw.rect(W / 2 - 150, 222, 300 * Math.min(1, wob), 18, wob > 0.6 ? RED : MANGO);
  }

  function drawGoal() {
    if (timeLeft > 3.2 || over && !won) return;
    var z = ZV + timeLeft * V + 0.6;
    var d = D(z), fy = HORIZON + d * CAM, ty = HORIZON - d * (2.4 - CAM);
    game.draw.rect(W / 2 - d * 0.7, ty, d * 1.4, fy - ty, '#c0502a');
    game.draw.rect(W / 2 - d * 0.7, ty, d * 1.4, d * 0.25, MANGO);
    for (var i = 0; i < 4; i++) game.draw.circle(W / 2 - d * 0.5 + i * d * 0.33, fy - d * 0.35, d * 0.1, FRUIT_COL[i % 3]);
    if (Math.floor(game.time.elapsed * 4) % 2 === 0) game.draw.rect(W / 2 - d * 0.75, ty - d * 0.1, d * 1.5, d * 0.08, WHITE, 0.7);
  }

  // ── ATTRACT デモ: 先読みで安全な列へ寄る → 3枚目で寄り遅れて打たれる ──
  var demo = { t: 0, fail: false };
  function demoPlan() {
    var next = null;
    for (var i = 0; i < tarps.length; i++) { if (!tarps[i].fell && !tarps[i].gate) { next = tarps[i]; break; } }
    if (!next) return px;
    var bestX = px, bestD = 9;
    for (var l = 0; l < LANES.length; l++) {
      var bad = false;
      for (var k = 0; k < next.drips.length; k++) if (Math.abs(LANES[l] - LANES[next.drips[k]]) < HIT_R + 0.08) bad = true;
      if (!bad && Math.abs(LANES[l] - px) < bestD) { bestD = Math.abs(LANES[l] - px); bestX = LANES[l]; }
    }
    return bestX;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) {
      px = 0; pvx = 0; wob = 0; fruits = FRUITS; streams = []; falling = [];
      tarps = buildTarps([
        { arrive: 1.3, drips: [2], col: TARP_COLS[0], warned: false, fell: false, gate: false },
        { arrive: 2.5, drips: [0, 1], col: TARP_COLS[1], warned: false, fell: false, gate: false },
        { arrive: 3.5, drips: [1, 2], col: TARP_COLS[2], warned: false, fell: false, gate: false },
      ]);
    }
    clock = cyc;
    var goal = cyc > 2.6 ? px : demoPlan();
    holdDir = Math.abs(goal - px) > 0.06 ? (goal > px ? 1 : -1) : 0;
    if (holdDir !== 0 && Math.abs(goal - px) < 0.2 && Math.abs(pvx) > 0.6) holdDir = 0;
    stepVendor(dt, 0.3);
    var hit = stepTarps(cyc, 0.3);
    if (hit !== null) loseFruit('drip', 0.3);
  }

  game.onUpdate(function (dt) {
    for (var s = streams.length - 1; s >= 0; s--) { streams[s].t -= dt; if (streams[s].t <= 0) streams.splice(s, 1); }
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAlley(demo.t);
      drawTarps(clock, 0);
      drawVendor(0);
      drawFalling(dt);
      drawPads();
      var hx = holdDir < 0 ? W * 0.18 : W * 0.82;
      game.draw.hand(holdDir === 0 ? W / 2 : hx, H * 0.86, { press: holdDir !== 0, scale: 15 });
      big(TITLE, W / 2, H * 0.085, 96, WHITE);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.125, 40, MANGO);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.965, 44, MANGO);
      else big('INSERT COIN', W / 2, H * 0.965, 38, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.1) sendEnd();
      drawAlley(clock);
      drawGoal();
      drawVendor(0);
      drawFalling(dt);
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, INK, 0.75);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.165, 104, won ? MANGO : RED);
      big('SCORE ' + Math.floor(score), W / 2, H * 0.22, 56, WHITE);
      big(fruits + ' / ' + FRUITS + '   NICE x' + grazes, W / 2, H * 0.265, 42, DROP);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 58, MANGO);
      else big('BEST ' + Math.max(prevBest, Math.floor(score)), W / 2, H * 0.31, 40, PALE);
      if (!won) big('あと' + Math.max(1, Math.ceil(timeLeft * V)) + 'm!', W / 2, H * 0.36, 60, RED);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.965, 38, WHITE);
      return;
    }

    // ── PLAYING ──
    readHold();
    var hl = 0, frozen = false;
    if (over) {
      endT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      frozen = true;
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        var kind = halt.kind;
        halt = null;
        loseFruit(kind, 1);
        if (fruits <= 0) finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      clock += dt;
      timeLeft -= dt;
      score += dt * 10;
      var tipped = stepVendor(dt, 1);
      var hit = stepTarps(clock, 1);
      if (hit !== null) { halt = { t: 0.45, max: 0.45, kind: 'drip' }; game.fx.flash(WHITE, 0.12); }
      else if (tipped) { halt = { t: 0.4, max: 0.4, kind: 'wob' }; game.fx.flash(WHITE, 0.12); }
      else if (timeLeft <= 0) { timeLeft = 0; finish(true); }
    }

    drawAlley(clock);
    drawGoal();
    drawTarps(clock, hl);
    drawVendor(hl);
    drawFalling(frozen ? 0 : dt);
    drawPads();
    drawHud();
    if (ready <= 0 && clock < 0.9 && !over) game.draw.hand(W * 0.82, H * 0.86, { press: true, scale: 13, alpha: 0.6 });
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, MANGO);
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1.5], ['R', 0.5],
    ], { tempo: 126, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1], ['G2', 1], ['D3', 1], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
