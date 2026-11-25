// I-Switch-0011v3-teaslope-basket-ridge.js
// 茶畑の畦わたり — 背負いかごが傾いた側をタップして押し戻し、勢いのついた揺れを打ち消しながら急斜面の細い畦を渡り切る
// 操作: かごが右へ傾いたら画面の右半分、左へ傾いたら左半分をタップすると、その側を手で支えてかごを反対へ押し戻す。1回のタップは角度ではなく揺れの勢いを変えるので、押しすぎると反対へ振れる。谷側(暗い方)へは常に引っぱられ、畦の曲がり目で谷側が入れ替わる。傾いた踏み石(赤くちらつく)を踏むと、石の傾いた側へかごがぐらっと振られる。新芽の光る茶株の横を通ると葉が摘まれてかごが重くなり、揺れが大きく戻りにくくなる
// 終わり: 18秒歩いて畦の先の茶小屋に着けばCLEAR。かごが限界(40度)まで傾いて葉をこぼすのが3回でGAME OVER
// @mechanic: balance
// @theme: teaslope_basket_ridge
// 世界観: 茶畑の急斜面で、茶摘み娘が新芽を摘んで重くなっていく背負いかごの傾きを手で戻しながら、谷側が入れ替わる細い畦を茶小屋まで渡る
// 残るもの: 正誤(CLEAR/GAME OVER) + 摘んだ新芽の数・水平を保った秒数・こぼした回数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 板(sprite)のまま距離で px スケールを変える。真下に楕円の接地影。奥ほど彩度を落とす
  var STYLE = { bg: ['#a8d8f0', '#e8f4e0', '#3a6a2a'], main: ['#4a9a3a', '#7ac85a', '#c89a5a'], accent: ['#ffffff', '#1a2a18'] };
  var C = {
    sky: STYLE.bg[0], haze: STYLE.bg[1], valley: STYLE.bg[2], tea: STYLE.main[0], tea2: STYLE.main[1], soil: STYLE.main[2],
    white: STYLE.accent[0], ink: STYLE.accent[1], red: '#e84a3a', gold: '#ffd84a', bud: '#c8ff6a', stone: '#9a9a8a', wood: '#7a5a3a',
  };

  var GAME_TITLE = 'TEA RIDGE';
  var TIME_LIMIT = 18;
  var LIVES = 3;
  var LIMIT_DEG = 40;
  var HZ = 640, GIRL_Y = 1240, K = 4, U = 600, CX = W / 2;
  var WALK = 300;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var a, w, dist, playT, lives, load, buds, stones, items, steadyT, steadyAcc, score, readyT, stopT, over, won, outroT, push, pushSide,
    milestone, mood, spills, creakT, lastSide;

  function initGame() {
    a = 0; w = 0; dist = 0; playT = 0; lives = LIVES; load = 0; buds = 0; steadyT = 0; steadyAcc = 0; score = 0;
    readyT = 0.8; stopT = 0; over = false; won = false; outroT = 0; push = 0; pushSide = 1; milestone = false; mood = 0; spills = 0; creakT = 0;
    lastSide = valleySide(0);
    items = [];
    // 新芽の茶株(左右)と傾いた踏み石を道沿いに置く
    for (var d = 500; d < WALK * TIME_LIMIT - 200; d += game.random(380, 520)) items.push({ d: d, kind: 'bud', side: game.random(0, 1) < 0.5 ? -1 : 1, done: false });
    for (var s = 1300; s < WALK * TIME_LIMIT - 300; s += game.random(1000, 1300)) items.push({ d: s, kind: 'stone', side: game.random(0, 1) < 0.5 ? -1 : 1, done: false, warned: false });
  }

  // 谷側: -1=左が谷 / 1=右が谷。約4.5秒ごとに入れ替わる
  function valleySide(dd) { return Math.floor(dd / (WALK * 4.5)) % 2 === 0 ? 1 : -1; }
  // 畦の左右のうねり(谷側の入れ替わりでカーブする)
  function curveAt(dd) { return Math.sin(dd / 900) * 260 + Math.sin(dd / 380) * 60; }
  function scl(z) { return 1 / (1 + K * Math.max(-0.2, z)); }
  function yOf(z) { return HZ + (GIRL_Y - HZ) * scl(z); }
  function xOf(lat, z) { return CX + (curveAt(dist + z * U) - curveAt(dist) + lat) * scl(z); }

  function tap(side, demo) {
    var imp = 46 / (1 + load * 0.05);
    w += side > 0 ? -imp : imp;
    push = 0.2; pushSide = side;
    game.audio.tone(side > 0 ? 494 : 440, 0.05, { wave: 'triangle', volume: 0.05 });
    if ((side > 0 && a > 3) || (side < 0 && a < -3)) {
      if (Math.abs(a) > 18) game.feedback.good(CX + side * 160, GIRL_Y - 300, { text: 'GOOD', color: C.gold, size: 38, sound: 'se_good', volume: 0.15, count: 4 });
    } else if (Math.abs(a) > 6 && !demo) {
      // 傾いていない側を押した(逆に煽った)
      game.audio.tone(200, 0.06, { wave: 'square', volume: 0.04 });
    }
  }

  // ---- 進行(本番もデモも同じ)。戻り値: true=限界まで傾いた ----
  function stepWorld(dt, demo) {
    playT += dt;
    dist += WALK * dt;
    if (push > 0) push -= dt;
    var vs = valleySide(dist);
    if (vs !== lastSide) {
      lastSide = vs;
      game.audio.tone(330, 0.12, { wave: 'triangle', volume: 0.05, slide: vs > 0 ? 120 : -120 });
    }
    var Kun = 1.5 + load * 0.08;
    w += (22 * vs + Kun * a) * dt;
    w *= Math.max(0, 1 - 0.5 * dt);
    a += w * dt;
    // 水平の時間
    if (Math.abs(a) < 8) {
      steadyT += dt; steadyAcc += dt;
      if (steadyAcc >= 2) {
        steadyAcc = 0;
        if (!demo) score += 100;
        game.fx.popup('PERFECT', CX, GIRL_Y - 520, { color: C.gold, size: 44 });
        game.audio.tone(880, 0.06, { wave: 'square', volume: 0.04 });
      }
    } else steadyAcc = 0;
    if (Math.abs(a) > LIMIT_DEG * 0.7) {
      creakT -= dt;
      if (creakT <= 0) { creakT = 0.25; game.audio.tone(150, 0.07, { wave: 'square', volume: 0.05 }); }
    }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.done) continue;
      var z = (it.d - dist) / U;
      if (it.kind === 'stone' && !it.warned && (it.d - dist) / WALK < 0.7) {
        it.warned = true;
        game.audio.tone(260, 0.1, { wave: 'square', volume: 0.06 });
      }
      if (z <= 0) {
        it.done = true;
        if (it.kind === 'bud') {
          load++; buds++;
          if (!demo) score += 50;
          game.audio.play('se_coin', 0.25);
          game.fx.burst(xOf(it.side * 200, 0), GIRL_Y - 120, { color: C.bud, count: 8, speed: 220 });
          if (!demo && buds === 6 && !milestone) {
            milestone = true;
            game.fx.popup('6 / ' + items.filter(function(q) { return q.kind === 'bud'; }).length, CX, H * 0.36, { color: C.bud, size: 64 });
            game.audio.play('se_milestone', 0.45);
          }
        } else {
          w += it.side * 70;
          game.audio.play('se_jump', 0.25);
          game.fx.shake(6, 0.15);
        }
      }
    }
    return Math.abs(a) > LIMIT_DEG;
  }

  function onSpill(demo) {
    stopT = 0.5; mood = -1;
    game.feedback.bad(CX + (a > 0 ? 160 : -160), GIRL_Y - 320, { text: 'MISS', shake: demo ? 6 : 14 });
    game.audio.play('se_break', 0.35);
    if (!demo) {
      lives--; spills++;
      load = Math.max(0, load - 2);
      if (lives <= 0) finish(false);
    }
  }

  function resetTilt() { a = 0; w = 0; }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 200 + Math.round(steadyT * 30);
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(CX, GIRL_Y - 350, { color: C.bud, count: 30, speed: 460 });
      game.fx.burst(CX, GIRL_Y - 350, { color: C.gold, count: 22, speed: 360 });
      game.fx.flash(C.white, 0.25);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0) { game.audio.play('se_tap', 0.08); return; }
    tap(x < W / 2 ? -1 : 1, false);
    game.fx.burst(x < W / 2 ? W * 0.22 : W * 0.78, H * 0.87, { color: C.tea2, count: 4, speed: 140 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var BUSH = ['..gggg..', '.gGggGg.', 'gggGgggg', 'gGggggGg', '.gggggg.', '..tttt..'];
  var BUSH_BUD = ['..bbbb..', '.gbggbg.', 'gggbgggg', 'gGggggGg', '.gggggg.', '..tttt..'];
  // 後ろ姿の茶摘み娘(かごは別に描く)。左右へ体を寄せるコマ
  var GIRL_C = ['..kkkk..', '.kkkkkk.', '.kkkkkk.', '..kssk..', '.rrrrrr.', 'rrrrrrrr', 'r.rrrr.r', '..bbbb..', '..bbbb..', '..b..b..', '.kk..kk.'];
  var GIRL_L = ['.kkkk...', 'kkkkkk..', 'kkkkkk..', '.kssk...', 'rrrrrr..', 'rrrrrrrr', 'r.rrrr.r', '..bbbb..', '..bbbb..', '..b..b..', '.kk..kk.'];
  var GIRL_PAL = { k: '#3a2a2a', s: '#f0c8a0', r: '#4a6ac8', b: '#2a3a6a' };

  function drawField() {
    var t = game.time.elapsed;
    var vs = valleySide(dist);
    game.draw.gradient(0, HZ, [[0, C.sky], [1, C.haze]]);
    // 遠景: 霞む山並み
    for (var m = 0; m < 5; m++) game.draw.circle(100 + m * 230, HZ + 30, 160 + (m % 2) * 50, '#9ac0b0', 0.6);
    // 斜面: 谷側は暗く落ち込み、山側は茶の畝が上る
    var vx = vs > 0 ? CX + 60 : 0, vw = CX - 60;
    game.draw.gradient(HZ, H, [[0, '#6a9a8a'], [1, C.valley]]);
    game.draw.rect(vs > 0 ? 0 : CX + 60, HZ, CX - 60, H - HZ, '#7ab060');
    for (var r = 0; r < 14; r++) {
      var z = ((r * 0.12 - (dist / U) % 0.12) + 0.12);
      var y = yOf(z);
      var ry = Math.max(4, 22 * scl(z));
      game.draw.rect(vs > 0 ? 0 : CX + 60, y, CX - 60, ry, C.tea, 0.7);
    }
    for (var c = 0; c < 4; c++) game.draw.circle(vx + vw * (0.2 + c * 0.2), HZ + 120 + Math.sin(t + c) * 4, 26, '#c8d8c8', 0.4);
    // 畦(細い土の道): 奥から手前へ帯で
    for (var yy = HZ; yy < H; yy += 10) {
      var s = (yy - HZ) / (GIRL_Y - HZ);
      if (s <= 0.02) continue;
      var zz = (1 / s - 1) / K;
      var x = xOf(0, zz);
      var half = 120 * s;
      var band = Math.floor((zz * U + dist) / 80) % 2 === 0;
      game.draw.rect(x - half, yy, half * 2, 10, band ? C.soil : '#b0844a');
      game.draw.rect(x + vs * half - (vs > 0 ? 0 : 6 * s + 2), yy, 6 * s + 2, 10, C.ink, 0.5);
    }
  }

  function drawItems() {
    var t = game.time.elapsed;
    var list = items.filter(function(it) { return !it.done && it.d - dist < U * 1.6; });
    list.sort(function(p, q) { return q.d - p.d; });
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var z = (it.d - dist) / U;
      var s = scl(z);
      var y = yOf(z);
      if (it.kind === 'bud') {
        var x = xOf(it.side * 230, z);
        game.draw.circle(x, y + 6 * s, 70 * s, C.ink, 0.25);
        game.draw.sprite(BUSH_BUD, { g: C.tea, G: C.tea2, b: Math.floor(t * 6) % 2 ? C.bud : C.white, t: C.wood }, x, y - 40 * s, Math.max(2, 18 * s), { anchor: 'center', alpha: Math.min(1, 0.5 + s) });
      } else {
        var sx = xOf(0, z);
        var warn = it.warned && Math.floor(t * 12) % 2 === 0;
        game.draw.circle(sx, y + 6 * s, 70 * s, C.ink, 0.3);
        game.draw.rect(sx - 70 * s, y - 20 * s, 140 * s, 30 * s, warn ? C.red : C.stone);
        game.draw.line(sx - 70 * s, y - 20 * s - it.side * 16 * s, sx + 70 * s, y - 20 * s + it.side * 16 * s, warn ? C.white : '#6a6a5a', Math.max(2, 10 * s));
      }
    }
    // 道の両脇の普通の茶株(リズムよく流れる)
    for (var b = 0; b < 8; b++) {
      var zb = ((b * 0.2 - (dist / U) % 0.2) + 0.2);
      var sb = scl(zb);
      for (var side = -1; side <= 1; side += 2) {
        if (side === valleySide(dist) && b % 2 === 0) continue;
        var bx = xOf(side * 330, zb);
        game.draw.circle(bx, yOf(zb) + 6 * sb, 60 * sb, C.ink, 0.2);
        game.draw.sprite(BUSH, { g: C.tea, G: C.tea2, t: C.wood }, bx, yOf(zb) - 36 * sb, Math.max(2, 16 * sb), { anchor: 'center', alpha: Math.min(1, 0.45 + sb) });
      }
    }
    // 茶小屋(ゴール)
    var zg = (WALK * TIME_LIMIT - dist) / U;
    if (zg < 2.5) {
      var sg = scl(zg), gx = xOf(0, zg), gy = yOf(zg);
      game.draw.rect(gx - 220 * sg, gy - 300 * sg, 440 * sg, 300 * sg, C.wood);
      game.draw.rect(gx - 260 * sg, gy - 360 * sg, 520 * sg, 80 * sg, '#5a3a2a');
      game.draw.rect(gx - 60 * sg, gy - 180 * sg, 120 * sg, 180 * sg, '#3a2a1a');
      if (Math.floor(t * 4) % 2 === 0) game.draw.circle(gx, gy - 400 * sg, 22 * sg + 6, C.gold);
    }
  }

  function drawGirl() {
    var t = game.time.elapsed;
    var lean = a > 6 ? -1 : (a < -6 ? 1 : 0);
    var step = Math.floor(t * 5) % 2;
    var bob = Math.abs(Math.sin(t * 10)) * 6;
    var hop = mood > 1 ? Math.abs(Math.sin(t * 10)) * 30 : 0;
    var gy = GIRL_Y - bob - hop;
    game.draw.circle(CX, GIRL_Y + 40, 90, C.ink, 0.3);
    // かご: 肩を支点に傾く(線で描く)
    var rad = a * Math.PI / 180;
    var px = CX, py = gy - 150;
    var tx = px + Math.sin(rad) * 230, ty = py - Math.cos(rad) * 230;
    var hl = stopT > 0;
    game.draw.line(px, py, tx, ty, C.ink, 196);
    game.draw.line(px, py, tx, ty, hl ? C.white : '#c89a5a', 180);
    for (var k = 1; k < 4; k++) {
      var ax = px + Math.sin(rad) * 57 * k, ay = py - Math.cos(rad) * 57 * k;
      game.draw.line(ax - Math.cos(rad) * 90, ay - Math.sin(rad) * 90, ax + Math.cos(rad) * 90, ay + Math.sin(rad) * 90, '#9a7040', 8);
    }
    game.draw.line(tx - Math.cos(rad) * 104, ty - Math.sin(rad) * 104, tx + Math.cos(rad) * 104, ty + Math.sin(rad) * 104, C.ink, 32);
    game.draw.line(tx - Math.cos(rad) * 98, ty - Math.sin(rad) * 98, tx + Math.cos(rad) * 98, ty + Math.sin(rad) * 98, '#7a5030', 22);
    // 背負い紐
    game.draw.line(px - 50, py + 30, px - 40, py - 40, '#5a3a20', 12);
    game.draw.line(px + 50, py + 30, px + 40, py - 40, '#5a3a20', 12);
    // 摘んだ新芽の山(重さ)
    var pile = Math.min(10, load);
    for (var p = 0; p < pile; p++) {
      var off = (p % 4 - 1.5) * 40, up = Math.floor(p / 4) * 26;
      game.draw.circle(tx + Math.cos(rad) * off + Math.sin(rad) * up, ty + Math.sin(rad) * off - Math.cos(rad) * up, 28, p % 2 ? C.tea2 : C.bud);
    }
    if (hl) game.draw.circle(tx, ty, 150, C.white, 0.4);
    var fr = lean !== 0 ? GIRL_L : GIRL_C;
    game.draw.sprite(fr, GIRL_PAL, CX, gy, 18, { anchor: 'center', flipX: lean < 0 || (lean === 0 && step === 1) });
    // 支えている手
    if (push > 0) game.draw.circle(px + pushSide * 110, py - 120, 34, '#f0c8a0');
  }

  function drawGauge() {
    // 傾き計: 半円のメーター。赤い所が限界
    var gx = CX, gy = 520, r = 200;
    for (var d = -60; d <= 60; d += 4) {
      var rd = d * Math.PI / 180;
      var col = Math.abs(d) >= LIMIT_DEG ? C.red : (Math.abs(d) >= LIMIT_DEG * 0.7 ? C.gold : C.white);
      game.draw.circle(gx + Math.sin(rd) * r, gy - Math.cos(rd) * r, 10, col, 0.85);
    }
    var ra = Math.max(-60, Math.min(60, a)) * Math.PI / 180;
    game.draw.line(gx, gy, gx + Math.sin(ra) * (r - 20), gy - Math.cos(ra) * (r - 20), C.ink, 14);
    game.draw.line(gx, gy, gx + Math.sin(ra) * (r - 20), gy - Math.cos(ra) * (r - 20), Math.abs(a) > LIMIT_DEG * 0.7 ? C.red : C.gold, 8);
    game.draw.circle(gx, gy, 16, C.ink);
    // 谷側の矢印(引っぱられる向き)
    var vs = valleySide(dist);
    for (var i = 0; i < 3; i++) game.draw.circle(gx + vs * (240 + i * 30), gy - 60, 12 - i * 3, C.valley);
  }

  function drawPads() {
    for (var i = 0; i < 2; i++) {
      var side = i === 0 ? -1 : 1;
      var px = i === 0 ? W * 0.22 : W * 0.78, py = H * 0.87;
      var on = push > 0 && pushSide === side;
      var need = side > 0 ? a > 12 : a < -12;
      game.draw.circle(px, py + 10, 112, C.ink, 0.6);
      game.draw.circle(px, py, 112, on ? C.gold : (need && Math.floor(game.time.elapsed * 8) % 2 === 0 ? '#ffe8a0' : C.white));
      // かごを支える手のひら + 押し戻す向き
      game.draw.circle(px, py + 10, 46, '#f0c8a0');
      for (var a2 = 0; a2 < 3; a2++) game.draw.circle(px - side * (40 + a2 * 26), py - 60 + a2 * 8, 12, C.tea);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.85);
    var progress = Math.min(1, dist / (WALK * TIME_LIMIT));
    label(buds + ' / ' + items.filter(function(q) { return q.kind === 'bud'; }).length, 200, 100, 60, C.bud);
    label('SCORE ' + score, 200, 182, 36, C.gold);
    for (var i = 0; i < LIVES; i++) {
      game.draw.circle(620 + i * 100, 70, 36, C.white);
      game.draw.circle(620 + i * 100, 70, 30, i < lives ? C.tea2 : '#555');
    }
    game.draw.rect(560, 150, 440, 30, '#333');
    game.draw.rect(560, 150, 440 * progress, 30, C.tea2);
    game.draw.circle(560 + 440 * progress, 165, 18, C.gold);
  }

  function drawScene() {
    drawField();
    drawItems();
    drawGirl();
    drawGauge();
    drawPads();
  }

  // ---- ATTRACT: 実ロジックで傾いた側を押し戻して渡る。最後に手を止めてこぼして見せる ----
  var demo = { t: 0, cool: 0, side: 1, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resetTilt(); return; }
    demo.cool -= dt;
    var pred = a + w * 0.35;
    if (demo.cool <= 0 && cyc < 7 && Math.abs(pred) > 6) {
      var side = pred > 0 ? 1 : -1;
      tap(side, true); demo.cool = 0.24; demo.side = side; demo.press = 0.15;
    }
    if (stepWorld(dt, true)) onSpill(true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.side < 0 ? W * 0.22 : W * 0.78, H * 0.87, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      label(GAME_TITLE, W / 2, 105, 92 + Math.sin(t * 3) * 3, C.bud);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.36, 52, C.red);
      else label('TAP TO START', W / 2, H * 0.36, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.26, W, H * 0.24, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, won ? C.bud : C.red);
      label('SCORE ' + score, W / 2, H * 0.38, 54, C.white);
      label(buds + ' / ' + items.filter(function(q) { return q.kind === 'bud'; }).length + '  PERFECT ' + Math.round(steadyT) + '秒', W / 2, H * 0.425, 38, C.gold);
      if (won && score > game.best) label('NEW RECORD', W / 2, H * 0.47, 48, C.gold);
      else label('BEST ' + Math.max(game.best, won ? score : 0), W / 2, H * 0.47, 36, C.white);
      if (!won) label('あと' + Math.max(1, Math.round((WALK * TIME_LIMIT - dist) / 100)) + 'm!', W / 2, H * 0.23, 60, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.54, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { buds: buds, steadySec: Math.round(steadyT), spills: spills };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resetTilt();
    } else {
      if (stepWorld(dt, false)) onSpill(false);
      if (!over && playT >= TIME_LIMIT) finish(true);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, C.gold);
    if (over && won) label('FINISH', W / 2, H * 0.36, 100, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 1], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5],
      ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 2],
    ], { tempo: 104, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 2], ['A2', 2], ['G2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
