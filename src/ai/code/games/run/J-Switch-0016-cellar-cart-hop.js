// J-Switch-0016-cellar-cart-hop.js
// 酒蔵トロッコ跳び — 地下の熟成洞をトロッコで駆け抜け、転がり出た樽と線路の切れ目は跳び越え、低く垂れた梁は跳ばずにくぐって出口の荷揚げ口まで一気に走る
// 操作: どこでもタップでトロッコが跳ねる。樽・線路の切れ目は跳んで越える。天井から下がった梁の下では跳ばない。宙のぶどうの房を取ると少し加速(社内メモ。画面には出さない)
// 終わり: 一度もぶつからず出口に着けばCLEAR(タイムがスコア)。樽・梁にぶつかる/切れ目に落ちる/時間切れでGAME OVER
// @mechanic: camera_run
// @theme: wine_cellar_cart_run
// 世界観: 収穫祭の朝、丘の下に掘られたぶどう酒蔵の熟成洞で、見習いの樽番の少年が新酒の小樽を積んだトロッコに乗り込み、揺れで転がり出た樽や継ぎ目の外れた線路、低い梁の並ぶ坑道を抜けて、祭りの荷馬車が待つ出口の荷揚げ口へ誰より早く駆け上がる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到着タイム・取ったぶどうの房数・走った距離
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定5色 + 差し色(ランタンの琥珀)1色だけを強く
  var STYLE = { bg: ['#1f1530', '#3a2550'], main: ['#6b2f5a', '#8c6a8f', '#e9d8b4'], accent: ['#ffc933', '#ff5a5a'] };
  var C = { dark: '#1f1530', mid: '#3a2550', wine: '#6b2f5a', stone: '#8c6a8f', cream: '#e9d8b4', amber: '#ffc933', red: '#ff5a5a' };

  var TITLE = 'CELLAR DASH';
  var TIME_LIMIT = 22;
  var COURSE = 10000;
  var RAIL_Y = H * 0.62;
  var CEIL_Y = H * 0.3;
  var CART_X = W * 0.28;
  var CART_W = 150, CART_H = 118;
  var GRAV = 3600, HOP_V = 1350;
  var BEAM_BOTTOM = H * 0.62 - 180;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CART = [
    ['...hhh....', '...hfh....', '..rrrrr...', 'wwwwwwwwww', 'wbbwbbwbbw', 'wwwwwwwwww', '.kk....kk.', '.kk....kk.'],
    ['...hhh....', '...hfh....', '..rrrrr...', 'wwwwwwwwww', 'wbbwbbwbbw', 'wwwwwwwwww', '.k.k..k.k.', '..k....k..']
  ];
  var CART_PAL = { h: '#2a1a12', f: '#f2c8a0', r: C.red, w: C.stone, b: C.wine, k: C.cream };
  var BARREL = ['.cwwwc.', 'cwwwwwc', 'ccccccc', 'cwwwwwc', 'cwwwwwc', 'ccccccc', 'cwwwwwc', '.cwwwc.'];
  var BARREL_PAL = { c: C.dark, w: C.wine };
  var HOT_BARREL_PAL = { c: C.cream, w: '#b04a64' };
  var GRAPES = ['..g..', '.ggg.', 'ppppp', '.ppp.', 'ppppp', '.ppp.', '..p..'];
  var GRAPES_PAL = { g: '#7ad36b', p: '#b04ad8' };
  var LANTERN = [['.aa.', 'aYYa', 'aYYa', '.aa.'], ['.aa.', 'aYaa', 'aaYa', '.aa.']];
  var LANTERN_PAL = { a: C.amber, Y: '#fff2b0' };
  var BAT = [['k...k', 'kk.kk', '.kkk.'], ['.....', 'kkkkk', '.k.k.']];

  var dist, speed, boost, h, vh, obs, grapes, ready, hitStop, crashObj, finished, done, endWait, ok, timeUp, elapsedRun, grapesGot, halfShown, warnPlayed;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.dark, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function buildCourse() {
    obs = []; grapes = [];
    var x = 1100;
    var n = 0;
    while (x < COURSE - 500) {
      var p = x / COURSE;
      var vExp = 560 + 300 * p;
      var r = Math.random();
      var type;
      if (n < 1) type = 'barrel';
      else if (r < 0.34) type = 'barrel';
      else if (r < 0.62) type = 'beam';
      else if (r < 0.86) type = 'gap';
      else type = 'double';
      if (type === 'double') {
        obs.push({ type: 'barrel', x: x, w: 90, warn: false });
        obs.push({ type: 'barrel', x: x + 130, w: 90, warn: false });
        x += 130;
      } else if (type === 'gap') {
        obs.push({ type: 'gap', x: x, w: 150 + 60 * p, warn: false });
      } else if (type === 'beam') {
        obs.push({ type: 'beam', x: x, w: 110, warn: false });
      } else {
        obs.push({ type: 'barrel', x: x, w: 90, warn: false });
      }
      var gapNext = vExp * (1.0 + Math.random() * 0.55);
      if (Math.random() < 0.45) grapes.push({ x: x + gapNext * 0.5, got: false });
      x += gapNext;
      n++;
    }
  }

  function initGame() {
    dist = 0; speed = 560; boost = 0; h = 0; vh = 0;
    ready = 0.8; hitStop = 0; crashObj = null;
    finished = false; done = false; endWait = 0; ok = false; timeUp = false;
    elapsedRun = 0; grapesGot = 0; halfShown = false; warnPlayed = 0;
    buildCourse();
  }

  function hop() {
    if (h > 0.5 || hitStop > 0 || finished) return false;
    vh = HOP_V;
    game.audio.play('se_jump', 0.3);
    game.fx.burst(CART_X, RAIL_Y, { color: C.cream, count: 6, speed: 160 });
    return true;
  }

  function crash(o) {
    if (finished) return;
    crashObj = o;
    hitStop = 0.5;
    finished = true; ok = false;
    game.audio.tone('C2', 0.18, { wave: 'square', volume: 0.14 });
  }

  function finishLine() {
    finished = true; ok = true; done = true; endWait = 1.6;
    game.fx.flash('#fff2b0', 0.25);
    game.feedback.good(CART_X, RAIL_Y - 200, { text: 'FINISH', color: C.amber, size: 70, count: 24 });
    if (state === S.PLAYING) { game.audio.stopBgm(); game.audio.play('se_success', 0.5); }
  }

  function stepRun(dt) {
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && crashObj) {
        game.feedback.bad(CART_X + 60, RAIL_Y - 120, { text: 'MISS', shake: 16 });
        if (state === S.PLAYING) { game.audio.stopBgm(); game.audio.play('se_failure', 0.5); }
        done = true; endWait = 1.3;
      }
      return;
    }
    if (finished) return;
    var p = dist / COURSE;
    if (boost > 0) boost -= dt;
    speed = 560 + 300 * p + (boost > 0 ? 160 : 0);
    dist += speed * dt;
    elapsedRun += dt;
    // 跳ね
    if (h > 0 || vh > 0) {
      vh -= GRAV * dt;
      h += vh * dt;
      if (h <= 0) { h = 0; vh = 0; game.audio.play('se_tap', 0.08); }
    }
    // 障害
    var cx0 = dist + CART_X - CART_W / 2 + 18, cx1 = dist + CART_X + CART_W / 2 - 18;
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      var sx = o.x - dist;
      if (!o.warn && sx - CART_X < speed * 0.7 && sx > CART_X) {
        o.warn = true;
        if (state === S.PLAYING) game.audio.tone(o.type === 'beam' ? 'G5' : 'D5', 0.06, { wave: 'square', volume: 0.05 });
      }
      if (o.x + o.w < cx0 || o.x > cx1) continue;
      if (o.type === 'barrel' && h < 88) { crash(o); return; }
      if (o.type === 'beam' && h > 58) { crash(o); return; }
      if (o.type === 'gap' && h <= 0) {
        var mid = dist + CART_X;
        if (mid > o.x + 20 && mid < o.x + o.w - 20) { crash(o); return; }
      }
    }
    // ぶどう
    for (var g = 0; g < grapes.length; g++) {
      var gr = grapes[g];
      if (gr.got) continue;
      if (Math.abs(gr.x - (dist + CART_X)) < 80 && h > 120) {
        gr.got = true; grapesGot++; boost = 1.4;
        game.feedback.good(CART_X, RAIL_Y - CART_H - h - 60, { text: 'NICE', color: '#d98cff', size: 46 });
        game.audio.play('se_coin', 0.35);
      }
    }
    if (!halfShown && p >= 0.5 && state === S.PLAYING) {
      halfShown = true;
      game.fx.popup('50%', W / 2, H * 0.24, { color: C.amber, size: 64 });
      game.audio.play('se_milestone', 0.4);
    }
    if (dist >= COURSE) finishLine();
  }

  // ---------- 描画 ----------
  function drawTunnel() {
    var t = game.time.elapsed;
    var d = dist || 0;
    game.draw.gradient(230, H * 0.72, [[0, C.dark], [0.5, C.mid], [1, C.dark]]);
    // 遠景のアーチ
    var off = (d * 0.3) % 360;
    for (var i = -1; i < 5; i++) {
      var ax = i * 360 - off;
      game.draw.rect(ax, CEIL_Y + 40, 50, RAIL_Y - CEIL_Y - 40, C.wine, 0.6);
      game.draw.circle(ax + 205, CEIL_Y + 170, 150, C.mid, 0.9);
      game.draw.rect(ax + 55, CEIL_Y + 170, 300, RAIL_Y - CEIL_Y - 170, C.mid, 0.9);
    }
    // 中景の樽棚
    var off2 = (d * 0.6) % 300;
    for (var j = -1; j < 5; j++) {
      var bx = j * 300 - off2 + 60;
      for (var k = 0; k < 2; k++) game.draw.sprite(BARREL, BARREL_PAL, bx + k * 90, RAIL_Y - 150 - k * 70, 10, { alpha: 0.3 });
    }
    // 演出の相手: 奥の線路を走る影のトロッコ
    var rivalX = W * 0.62 + Math.sin(t * 0.5) * 220;
    game.draw.sprite(CART[Math.floor(t * 8) % 2], { h: C.stone, f: C.stone, r: C.stone, w: C.wine, b: C.mid, k: C.stone }, rivalX, RAIL_Y - 250 + Math.sin(t * 9) * 3, 6, { anchor: 'center', alpha: 0.4 });
    game.draw.rect(0, RAIL_Y - 216, W, 6, C.wine, 0.5);
    // 天井と灯り
    game.draw.rect(0, 230, W, CEIL_Y - 230, C.dark);
    var offB = (d * 0.8) % 120;
    for (var row = 0; row < 5; row++) {
      var ry = 250 + row * 64;
      var shift = (row % 2) * 60;
      for (var bc = -1; bc < 11; bc++) game.draw.rect(bc * 120 - offB + shift, ry, 110, 54, row % 2 ? C.mid : '#2c1f40');
    }
    game.draw.rect(0, CEIL_Y - 16, W, 16, C.wine);
    var off3 = (d * 1.0) % 420;
    for (var m = -1; m < 4; m++) {
      var lx = m * 420 - off3 + 200;
      var sw = Math.sin(t * 2 + m) * 10;
      game.draw.line(lx, CEIL_Y, lx + sw, CEIL_Y + 70, C.stone, 4);
      game.draw.circle(lx + sw, CEIL_Y + 95, 70 + Math.sin(t * 7 + m) * 6, C.amber, 0.12);
      game.draw.sprite(LANTERN[Math.floor(t * 4 + m) % 2], LANTERN_PAL, lx + sw, CEIL_Y + 92, 9, { anchor: 'center' });
    }
    game.draw.sprite(BAT[Math.floor(t * 6) % 2], { k: C.stone }, W * 0.8 + Math.sin(t * 1.3) * 90, CEIL_Y + 40 + Math.cos(t * 2.1) * 20, 8, { anchor: 'center' });
    // 線路
    game.draw.rect(0, RAIL_Y, W, H * 0.72 - RAIL_Y, C.wine);
    var off4 = d % 90;
    for (var s = -1; s < 14; s++) game.draw.rect(s * 90 - off4, RAIL_Y + 14, 56, 22, C.mid);
    game.draw.rect(0, RAIL_Y + 4, W, 10, C.stone);
  }

  function drawObstacles() {
    var t = game.time.elapsed;
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      var sx = o.x - dist;
      if (sx > W + 200 || sx + o.w < -200) continue;
      var hit = crashObj === o;
      var blink = o.warn && !hit && sx > CART_X && Math.floor(t * 10) % 2 === 0;
      if (o.type === 'barrel') {
        var bw = hit ? 1.25 : 1;
        game.draw.sprite(BARREL, hit ? { c: '#ffffff', w: '#ffffff' } : HOT_BARREL_PAL, sx + o.w / 2, RAIL_Y - 44 * bw, 12 * bw, { anchor: 'center' });
        if (blink) game.draw.rect(sx - 6, RAIL_Y - 104, o.w + 12, 8, C.amber);
      } else if (o.type === 'beam') {
        game.draw.rect(sx, CEIL_Y, o.w, BEAM_BOTTOM - CEIL_Y, '#5a3a2a');
        game.draw.rect(sx + o.w - 16, CEIL_Y, 16, BEAM_BOTTOM - CEIL_Y, C.dark);
        game.draw.rect(sx - 10, BEAM_BOTTOM - 26, o.w + 20, 26, C.cream);
        if (blink) game.draw.rect(sx - 10, BEAM_BOTTOM + 4, o.w + 20, 8, C.amber);
      } else {
        game.draw.rect(sx, RAIL_Y, o.w, H * 0.72 - RAIL_Y, C.dark);
        game.draw.rect(sx - 14, RAIL_Y + 2, 20, 14, C.stone);
        game.draw.rect(sx + o.w - 6, RAIL_Y + 2, 20, 14, C.stone);
        if (blink) game.draw.rect(sx, RAIL_Y - 12, o.w, 8, C.amber);
      }
      if (hit && hitStop > 0) {
        var k = hitStop / 0.5;
        var cy = o.type === 'beam' ? BEAM_BOTTOM - 60 : RAIL_Y - 40;
        game.draw.circle(sx + o.w / 2, cy, 90 + (1 - k) * 90, '#ffffff', 0.6 * k);
      }
    }
    for (var g = 0; g < grapes.length; g++) {
      var gr = grapes[g];
      var gx = gr.x - dist;
      if (gr.got || gx < -80 || gx > W + 80) continue;
      game.draw.sprite(GRAPES, GRAPES_PAL, gx, RAIL_Y - 330 + Math.sin(game.time.elapsed * 4 + g) * 10, 11, { anchor: 'center' });
    }
  }

  function drawCart() {
    var t = game.time.elapsed;
    var f = h > 0 ? 0 : Math.floor(t * 12) % 2;
    var jig = h > 0 ? 0 : Math.sin(t * 30) * 2;
    var tilt = crashObj ? Math.sin(t * 50) * 6 : 0;
    game.draw.circle(CART_X, RAIL_Y + 6, 60 - Math.min(40, h * 0.15), '#000000', 0.25);
    game.draw.sprite(CART[f], CART_PAL, CART_X + tilt, RAIL_Y - CART_H / 2 - h + jig, 15, { anchor: 'center' });
    if (boost > 0) {
      for (var i = 0; i < 3; i++) game.draw.rect(CART_X - 110 - i * 40, RAIL_Y - 60 - i * 16 - h, 30, 6, '#d98cff', 0.7);
    }
  }

  function drawThumb(pressed) {
    var t = game.time.elapsed;
    game.draw.gradient(H * 0.72, H, [[0, C.mid], [1, C.dark]]);
    for (var i = 0; i < 12; i++) game.draw.rect(i * 96, H * 0.72, 88, 12, C.wine);
    var r = 150 + Math.sin(t * 3) * 8;
    game.draw.circle(W / 2, H * 0.84, r + 24, C.dark);
    game.draw.circle(W / 2, H * 0.84, r, pressed ? C.amber : C.wine);
    game.draw.circle(W / 2, H * 0.84, r * 0.72, C.mid, 0.6);
    // 上向きの記号(跳ねる)
    game.draw.rect(W / 2 - 16, H * 0.84 - 10, 32, 80, C.cream);
    for (var k = 0; k < 5; k++) game.draw.rect(W / 2 - 70 + k * 14, H * 0.84 - 20 - k * 14, 140 - k * 28, 14, C.cream);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.dark);
    var progress = Math.min(1, dist / COURSE);
    game.draw.rect(80, 140, W - 160, 24, C.mid);
    game.draw.rect(80, 140, (W - 160) * progress, 24, C.amber);
    game.draw.sprite(CART[0], CART_PAL, 80 + (W - 160) * progress, 118, 4, { anchor: 'center' });
    game.draw.rect(W - 86, 110, 8, 60, C.cream);
    game.draw.rect(W - 78, 110, 34, 22, C.red);
    txt(elapsedRun.toFixed(1), 80, 72, 56, C.cream, 'left');
    game.draw.sprite(GRAPES, GRAPES_PAL, W - 200, 70, 7, { anchor: 'center' });
    txt('x' + grapesGot, W - 90, 72, 50, '#d98cff', 'center');
  }

  function drawAll(pressed) {
    drawTunnel();
    drawObstacles();
    drawCart();
    drawThumb(pressed);
    game.draw.rect(0, 0, W, H, C.amber, 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.7));
  }

  // ---------- 入力 ----------
  var pressFx = 0;
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); demo.t = 0; return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) { game.audio.play('se_tap', 0.1); return; }
    pressFx = 0.15;
    if (!hop()) {
      game.audio.tone('A3', 0.05, { wave: 'triangle', volume: 0.06 });
      game.fx.burst(CART_X, RAIL_Y - CART_H - h, { color: C.stone, count: 3, speed: 80 });
    }
  });

  // ---------- ATTRACT 実演(本番の stepRun をそのまま使い、AIがタップする) ----------
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, fail: false, tapT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var P = 3.6;
    var cyc = demo.t % P;
    if (cyc < dt || demo.t <= dt) {
      demo.fail = Math.floor(demo.t / P) % 2 === 1;
      dist = 0; speed = 600; boost = 0; h = 0; vh = 0; hitStop = 0; crashObj = null;
      finished = false; done = false; elapsedRun = 0; grapesGot = 0;
      obs = [
        { type: 'barrel', x: 760, w: 90, warn: false },
        { type: 'beam', x: 1480, w: 110, warn: false },
        { type: 'gap', x: 2050, w: 160, warn: false }
      ];
      grapes = [{ x: 820, got: false }];
    }
    if (demo.tapT > 0) demo.tapT -= dt;
    if (!finished && h <= 0) {
      for (var i = 0; i < obs.length; i++) {
        var o = obs[i];
        var ahead = o.x - (dist + CART_X);
        var wantHop = o.type !== 'beam' || demo.fail;
        if (wantHop && ahead > 0 && ahead < 150 && !o.demoDone) {
          o.demoDone = true;
          hop(); demo.tapT = 0.2;
        }
      }
    }
    demo.press = demo.tapT > 0;
    stepRun(dt);
    if (done) { endWait -= dt; }
  }

  game.onUpdate(function(dt) {
    if (dist === undefined) initGame();
    if (pressFx > 0) pressFx -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.dark, 0.85);
      txt(TITLE, W / 2, 88, 80, C.amber);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 176, 36, C.cream);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.amber);
      else txt('INSERT COIN', W / 2, H * 0.965, 36, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawAll(false);
      game.draw.rect(0, H * 0.3, W, H * 0.33, C.dark, 0.85);
      txt(ok ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.36, 96, ok ? C.amber : C.red);
      if (ok) txt(elapsedRun.toFixed(2), W / 2, H * 0.44, 80, C.cream);
      else txt(Math.floor(Math.min(1, dist / COURSE) * 100) + '%', W / 2, H * 0.44, 80, C.cream);
      game.draw.sprite(GRAPES, GRAPES_PAL, W / 2 - 70, H * 0.51, 7, { anchor: 'center' });
      txt('x' + grapesGot, W / 2 + 20, H * 0.51, 48, '#d98cff');
      if (ok && resultScore() >= game.best) txt('NEW RECORD', W / 2, H * 0.565, 50, C.amber);
      else txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.565, 40, C.cream);
      if (!ok) txt('あと' + Math.max(1, Math.ceil((COURSE - dist) / 100)) + 'm!', W / 2, H * 0.61, 46, C.amber);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.cream);
      return;
    }

    // PLAYING
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (done) {
      if (hitStop > 0) stepRun(dt);
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { time: +elapsedRun.toFixed(2), grapes: grapesGot, distance: Math.round(dist / 100) };
        if (ok) game.end.success(resultScore(), stats);
        else game.end.failure(stats);
      }
    } else {
      stepRun(dt);
      if (!finished && elapsedRun >= TIME_LIMIT) {
        timeUp = true; finished = true; done = true; endWait = 1.3;
        game.feedback.bad(CART_X, RAIL_Y - 150, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.5);
      }
    }
    drawAll(pressFx > 0);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, C.amber);
  });

  function resultScore() { return Math.max(0, Math.round((TIME_LIMIT - elapsedRun) * 100)) + grapesGot * 50; }

  game.onStart(function() {
    game.audio.melody([['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['F4', 0.5], ['G4', 0.5], ['A#4', 0.5], ['A4', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['F4', 0.5], ['E4', 0.5], ['G4', 0.5], ['D4', 1]], { tempo: 168, wave: 'square', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
