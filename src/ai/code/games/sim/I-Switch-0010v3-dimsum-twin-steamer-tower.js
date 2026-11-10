// I-Switch-0010v3-dimsum-twin-steamer-tower.js
// 点心二つの塔 — 左右の天井口から落ちてくる蒸籠を、両手の親指で二つの台を動かして受け、二本の塔を崩さず積み上げる
// 操作: 画面の左半分を押したまま指を左右に動かすと左の台が指の真下へ、右半分で右の台が動く(両手同時に動かせる)。落ちてくる蒸籠を塔のてっぺんで受ける。真ん中で受けるほど高得点。ずれて積むと塔の重心が片寄り、片寄りすぎると塔が赤く揺れて崩れる。高い塔を速く動かすと上がしなって遅れてついてくる。後半は湯気にあおられて斜めに落ちる蒸籠が混ざる
// 終わり: 22秒以内に左右とも8段積めばCLEAR。受け損ねて床に落とす/塔を崩すのが合わせて3回でGAME OVER(時間切れも)
// @mechanic: stack
// @theme: dimsum_twin_steamer_tower
// 世界観: 点心店の昼どきの厨房で、点心職人が左右の天井口から次々落ちてくる蒸籠を両手の台で受け止め、二つの塔に崩さず積み上げて客席へ出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ段数・PERFECT数・最大連続
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 一回り大きい黒で輪郭を先に描き、内側は明・暗の2色だけ
  var STYLE = { bg: ['#fbe6c8', '#e9c49a'], main: ['#e8b45a', '#b8823a', '#d8402e'], accent: ['#ffffff', '#1a1210'] };
  var C = {
    wall: STYLE.bg[0], wall2: STYLE.bg[1], bamboo: STYLE.main[0], bamboo2: STYLE.main[1], red: STYLE.main[2],
    white: STYLE.accent[0], ink: STYLE.accent[1], steam: '#f4f4f4', tile: '#9ad0c8', tile2: '#78b0a8', gold: '#ffd040', ok: '#58c878',
  };

  var GAME_TITLE = 'TWIN STEAMERS';
  var TIME_LIMIT = 22;
  var GOAL_EACH = 8;
  var LIVES = 3;
  var BASE_Y = 1380;
  var SW = 170, SH = 64;
  var RANGE = [[150, 470], [610, 930]];
  var VENT_Y = 350;
  var WARN_T = 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var towers, falling, warns, dropT, sideNext, playT, lives, score, perfects, combo, maxCombo, readyT, stopT, focus, over, won, outroT,
    milestone, mood, touchX;

  function newTower(i) { return { x: (RANGE[i][0] + RANGE[i][1]) / 2, tx: (RANGE[i][0] + RANGE[i][1]) / 2, vx: 0, lean: 0, st: [], wob: 0, creak: 0, flash: 0 }; }

  function initGame() {
    towers = [newTower(0), newTower(1)];
    falling = []; warns = []; dropT = 0.4; sideNext = 0; playT = 0; lives = LIVES; score = 0; perfects = 0; combo = 0; maxCombo = 0;
    readyT = 0.8; stopT = 0; focus = null; over = false; won = false; outroT = 0; milestone = false; mood = 0; touchX = [null, null];
  }

  function stacked() { return Math.min(GOAL_EACH, towers[0].st.length) + Math.min(GOAL_EACH, towers[1].st.length); }

  // 塔のi段目の中心x(しなり込み)
  function stX(tw, i) {
    var x = tw.x;
    for (var k = 0; k <= i; k++) x += tw.st[k].dx;
    var n = Math.max(1, tw.st.length);
    return x + tw.lean * Math.pow((i + 1) / n, 1.5);
  }
  function topX(tw) { return tw.st.length ? stX(tw, tw.st.length - 1) : tw.x; }
  function topY(tw) { return BASE_Y - tw.st.length * SH; }
  function com(tw) {
    if (!tw.st.length) return 0;
    var s = 0, x = 0;
    for (var i = 0; i < tw.st.length; i++) { x += tw.st[i].dx; s += x; }
    return s / tw.st.length;
  }

  // ---- 落とし方: 序盤は左右交互にゆっくり、中盤は左右ほぼ同時、後半は湯気で斜めに流れる ----
  function scheduleDrop() {
    var need = [towers[0].st.length < GOAL_EACH, towers[1].st.length < GOAL_EACH];
    var side = sideNext;
    if (!need[side]) side = 1 - side;
    if (!need[side]) return 1;
    sideNext = 1 - side;
    var stage = playT < 6 ? 0 : (playT < 13 ? 1 : 2);
    var r = RANGE[side];
    var drift = stage === 2 && game.random(0, 1) < 0.6 ? (game.random(0, 1) < 0.5 ? -1 : 1) * game.random(90, 140) : 0;
    var lo = r[0] + 20 + Math.max(0, -drift), hi = r[1] - 20 - Math.max(0, drift);
    var x = game.random(lo, hi);
    // 台の真上には落とさない(必ず台を動かして受ける)
    var bx = towers[side].x;
    if (Math.abs(x - bx) < 110) x = bx - lo > hi - bx ? game.random(lo, Math.max(lo, bx - 110)) : game.random(Math.min(hi, bx + 110), hi);
    warns.push({ side: side, x: x, t: WARN_T, vx: drift, v: stage === 0 ? 560 : 660 });
    if (stage >= 1 && need[1 - side] && game.random(0, 1) < 0.45) {
      var r2 = RANGE[1 - side];
      warns.push({ side: 1 - side, x: game.random(r2[0] + 20, r2[1] - 20), t: WARN_T + 0.35, vx: 0, v: 620 });
      sideNext = side;
    }
    game.audio.tone(880, 0.05, { wave: 'square', volume: 0.04 });
    return stage === 0 ? 1.05 : (stage === 1 ? 1.15 : 1.0);
  }

  function moveBases(dt) {
    for (var i = 0; i < 2; i++) {
      var tw = towers[i];
      var nx = tw.x + (tw.tx - tw.x) * Math.min(1, dt * 16);
      tw.vx = (nx - tw.x) / Math.max(dt, 0.001);
      tw.x = nx;
      var n = tw.st.length;
      var target = -tw.vx * 0.05 * Math.min(1, n / 6);
      tw.lean += (target - tw.lean) * Math.min(1, dt * 5);
      if (tw.flash > 0) tw.flash -= dt;
    }
  }

  // ---- 進行(本番もデモも同じ)。戻り値: {kind:'miss'|'fall', ...} or null ----
  function stepWorld(dt, demo) {
    playT += dt;
    moveBases(dt);
    dropT -= dt;
    if (dropT <= 0) dropT = scheduleDrop();
    for (var w = warns.length - 1; w >= 0; w--) {
      warns[w].t -= dt;
      if (warns[w].t <= 0) {
        var a = warns[w];
        falling.push({ side: a.side, x: a.x, y: VENT_Y, vx: a.vx, v: a.v, flash: 0 });
        warns.splice(w, 1);
        game.audio.tone(520, 0.06, { wave: 'triangle', volume: 0.05, slide: -160 });
      }
    }
    var ev = null;
    for (var i = falling.length - 1; i >= 0; i--) {
      var f = falling[i];
      f.y += f.v * dt;
      f.x += f.vx * dt;
      var tw = towers[f.side];
      var ty = topY(tw);
      if (f.y + SH / 2 >= ty && f.y - SH / 2 < ty + 20) {
        var dx = f.x - topX(tw);
        if (Math.abs(dx) < SW * 0.6) {
          land(tw, f, dx, demo);
          falling.splice(i, 1);
          continue;
        }
      }
      if (f.y > BASE_Y + 40) { ev = { kind: 'miss', f: f }; falling.splice(i, 1); break; }
    }
    // 重心の片寄り: 警告 → 崩れ
    for (var k = 0; k < 2 && !ev; k++) {
      var t2 = towers[k];
      var c = Math.abs(com(t2));
      t2.wob = c > SW * 0.36 ? (c - SW * 0.36) / (SW * 0.2) : 0;
      if (t2.wob > 0) {
        t2.creak -= dt;
        if (t2.creak <= 0) { t2.creak = 0.3; game.audio.tone(140, 0.08, { wave: 'square', volume: 0.05 }); }
      }
      if (c > SW * 0.56) ev = { kind: 'fall', tw: t2 };
    }
    return ev;
  }

  function land(tw, f, dx, demo) {
    var base = tw.st.length === 0;
    if (base) { tw.st.push({ dx: dx, col: tw.st.length }); tw.x += 0; }
    else tw.st.push({ dx: dx, col: tw.st.length });
    if (base) tw.st[0].dx = 0;
    var ad = base ? 0 : Math.abs(dx);
    var tier = ad < 22 ? 3 : (ad < 60 ? 2 : 1);
    if (tier >= 2) combo++; else combo = 0;
    maxCombo = Math.max(maxCombo, combo);
    var pts = Math.round((tier === 3 ? 150 : (tier === 2 ? 80 : 30)) * (1 + Math.min(8, combo) * 0.1));
    if (!demo) { score += pts; if (tier === 3) perfects++; }
    tw.flash = 0.2; mood = 0.6;
    var x = topX(tw), y = topY(tw);
    game.feedback.good(x, y - 30, { text: tier === 3 ? 'PERFECT' : (tier === 2 ? 'GOOD' : 'NICE'), color: tier === 3 ? C.gold : C.white, size: 40 + tier * 6, sound: tier === 3 ? 'se_coin' : 'se_good', volume: 0.25, count: 4 + tier * 3 });
    game.audio.tone(300 + tw.st.length * 60, 0.05, { wave: 'triangle', volume: 0.05 });
    if (tw.st.length === GOAL_EACH) {
      game.fx.popup(GOAL_EACH + ' / ' + GOAL_EACH, x, y - 120, { color: C.gold, size: 60 });
      game.audio.play('se_milestone', 0.45);
      milestone = true;
    }
  }

  function onFail(ev, demo) {
    combo = 0; mood = -1; stopT = 0.5;
    if (ev.kind === 'miss') {
      focus = { kind: 'miss', x: ev.f.x, y: BASE_Y + 20 };
      game.feedback.bad(ev.f.x, BASE_Y, { text: 'MISS', shake: demo ? 6 : 12 });
    } else {
      var tw = ev.tw;
      focus = { kind: 'fall', tw: tw, x: topX(tw), y: topY(tw) };
      game.feedback.bad(topX(tw), topY(tw), { text: 'MISS', shake: demo ? 8 : 16 });
      // 崩れた塔は土台の2段だけ残る
      tw.st.length = Math.min(tw.st.length, 2);
      for (var i = 0; i < tw.st.length; i++) tw.st[i].dx = 0;
      tw.lean = 0;
    }
    game.audio.play('se_break', 0.4);
    if (!demo) {
      lives--;
      if (lives <= 0) finish(false);
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 200 + Math.max(0, Math.round((TIME_LIMIT - playT) * 40));
      mood = 2;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 2; i++) game.fx.burst(topX(towers[i]), topY(towers[i]), { color: i ? C.red : C.gold, count: 26, speed: 420 });
      game.fx.flash(C.white, 0.25);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力: 左右それぞれの指で台を動かす(マルチタッチ) ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0) { game.audio.play('se_tap', 0.08); return; }
    var side = x < W / 2 ? 0 : 1;
    game.audio.tone(side ? 520 : 440, 0.04, { wave: 'square', volume: 0.04 });
    game.fx.burst(Math.max(RANGE[side][0], Math.min(RANGE[side][1], x)), H * 0.86, { color: C.bamboo, count: 4, speed: 120 });
  });

  function readTouches() {
    touchX = [null, null];
    var tl = game.touches || [];
    for (var i = 0; i < tl.length; i++) {
      if (tl[i].y < 230) continue;
      var side = tl[i].x < W / 2 ? 0 : 1;
      touchX[side] = Math.max(RANGE[side][0], Math.min(RANGE[side][1], tl[i].x));
    }
    for (var s = 0; s < 2; s++) if (touchX[s] !== null) towers[s].tx = touchX[s];
  }

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function toonRect(x, y, w, h, light, dark) {
    game.draw.rect(x - 6, y - 6, w + 12, h + 12, C.ink);
    game.draw.rect(x, y, w, h, light);
    game.draw.rect(x, y + h * 0.55, w, h * 0.45, dark);
  }

  var CHEF_A = ['..wwww..', '.wwwwww.', '.wwwwww.', '..ffff..', '.fefffe.', '..fmmf..', 'wwwwwwww', 'wwwwwwww', '.ww..ww.'];
  var CHEF_B = ['..wwww..', '.wwwwww.', '.wwwwww.', '..ffff..', '.fefffe.', '..fwwf..', 'wwwwwwww', 'wwwwwwww', '.ww..ww.'];
  var CHEF_OOPS = ['.wwwwww.', 'wwwwwwww', '..wwww..', '..ffff..', '.f-ff-f.', '..fooo..', 'wwwwwwww', 'wwwwwwww', 'ww....ww'];
  var CHEF_PAL = { w: C.white, f: '#f6c8a0', e: C.ink, '-': C.ink, m: C.red, o: C.red };
  var BUN = ['.ww.', 'wwww', 'wppw'];

  function drawKitchen() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.wall], [0.6, C.wall2], [1, '#c8986a']]);
    // 遠景のタイル壁
    for (var y = 230; y < 1100; y += 90) for (var x = 0; x < W; x += 90) game.draw.rect(x + 4, y + 4, 82, 82, ((x + y) / 90) % 2 ? C.tile : C.tile2, 0.35);
    // 天井口(左右)
    for (var i = 0; i < 2; i++) {
      var vx = (RANGE[i][0] + RANGE[i][1]) / 2;
      toonRect(vx - 230, VENT_Y - 90, 460, 60, '#7a6a60', '#5a4a40');
      for (var s = 0; s < 3; s++) {
        var sy = VENT_Y - 30 - ((t * 60 + s * 40) % 120);
        game.draw.circle(vx - 120 + s * 120, sy, 26 + s * 4, C.steam, 0.5);
      }
    }
    // 調理台
    toonRect(60, BASE_Y + 40, W - 120, 90, '#c8c8d0', '#9a9aa8');
  }

  function drawSteamer(x, y, hl, lid, wob) {
    var sc = hl ? 1.25 : 1;
    var w = SW * sc, h = SH * sc;
    var sway = wob > 0 ? Math.sin(game.time.elapsed * 30) * 6 * Math.min(1, wob) : 0;
    x += sway;
    toonRect(x - w / 2, y - h / 2, w, h, hl ? C.white : C.bamboo, hl ? '#e0e0e0' : C.bamboo2);
    game.draw.rect(x - w / 2, y - h / 2 + h * 0.3, w, 6, C.ink);
    if (lid) {
      game.draw.rect(x - w / 2 + 10, y - h / 2 - 20, w - 20, 20, C.ink);
      game.draw.rect(x - w / 2 + 16, y - h / 2 - 16, w - 32, 14, C.bamboo);
      game.draw.rect(x - 14, y - h / 2 - 34, 28, 16, C.ink);
    }
  }

  function drawTower(tw, idx) {
    var hl = focus && focus.kind === 'fall' && focus.tw === tw && stopT > 0;
    // 台(トレー)
    toonRect(tw.x - SW / 2 - 20, BASE_Y + 4, SW + 40, 30, C.red, '#a82a1e');
    for (var i = 0; i < tw.st.length; i++) {
      var y = BASE_Y - SH / 2 - i * SH;
      drawSteamer(stX(tw, i), y, hl, i === tw.st.length - 1, tw.wob);
    }
    // 重心の片寄り警告(赤い縁と矢印)
    if (tw.wob > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      var c = com(tw);
      var tx = topX(tw), ty = topY(tw) - 60;
      game.draw.circle(tx, ty, 34, C.red);
      game.draw.rect(tx - 5, ty - 22, 10, 28, C.white);
      game.draw.rect(tx - 5, ty + 12, 10, 10, C.white);
      game.draw.line(tw.x, BASE_Y - 10, tw.x + c, BASE_Y - 10 - tw.st.length * SH, C.red, 8);
    }
    // ゴールの高さ(8段)の旗
    var gy = BASE_Y - GOAL_EACH * SH;
    var done = tw.st.length >= GOAL_EACH;
    game.draw.line(RANGE[idx][0] - 70, gy, RANGE[idx][1] + 70, gy, done ? C.ok : C.red, 6);
    game.draw.rect(idx === 0 ? RANGE[0][0] - 80 : RANGE[1][1] + 40, gy - 50, 40, 30, done ? C.ok : C.red);
  }

  function drawFalling() {
    var t = game.time.elapsed;
    for (var w = 0; w < warns.length; w++) {
      var a = warns[w];
      if (Math.floor(t * 12) % 2 === 0) drawSteamer(a.x, VENT_Y + 10, false, true, 0);
      for (var d = 1; d < 8; d++) game.draw.circle(a.x + a.vx * d * 0.12, VENT_Y + 40 + d * 90, 7, C.red, 0.55);
      if (a.vx !== 0) for (var p = 0; p < 3; p++) game.draw.circle(a.x - (a.vx > 0 ? 1 : -1) * (60 + p * 40), VENT_Y + 30, 30 - p * 6, C.steam, 0.8);
    }
    for (var i = 0; i < falling.length; i++) {
      var f = falling[i];
      var tw = towers[f.side];
      game.draw.rect(f.x - SW * 0.4, topY(tw) - 8, SW * 0.8, 10, C.ink, 0.25);
      drawSteamer(f.x, f.y, false, true, 0);
    }
    if (focus && focus.kind === 'miss' && stopT > 0) {
      game.draw.circle(focus.x, focus.y, 110, C.white, 0.7);
      drawSteamer(focus.x, focus.y, true, false, 0);
    }
  }

  function drawChef() {
    var t = game.time.elapsed;
    var fr = mood < -0.3 ? CHEF_OOPS : (Math.floor(t * 4) % 2 ? CHEF_A : CHEF_B);
    var hop = mood > 1 ? Math.abs(Math.sin(t * 10)) * 26 : Math.sin(t * 2) * 3;
    game.draw.sprite(fr, CHEF_PAL, W / 2, 1520 - hop, 16, { anchor: 'center' });
    for (var i = 0; i < 2; i++) {
      game.draw.line(W / 2 + (i ? 60 : -60), 1530 - hop, towers[i].x, BASE_Y + 40, C.ink, 30);
      game.draw.line(W / 2 + (i ? 60 : -60), 1530 - hop, towers[i].x, BASE_Y + 40, C.white, 18);
    }
  }

  function drawThumbZone() {
    for (var i = 0; i < 2; i++) {
      var ry = H * 0.88;
      toonRect(RANGE[i][0] - 50, ry - 14, RANGE[i][1] - RANGE[i][0] + 100, 28, '#d8d0c8', '#b8b0a8');
      var on = touchX[i] !== null;
      game.draw.circle(towers[i].x, ry, 72, C.ink);
      game.draw.circle(towers[i].x, ry, 64, on ? C.gold : (i ? C.red : C.bamboo));
      game.draw.circle(towers[i].x, ry, 26, C.white);
      game.draw.sprite(BUN, { w: C.white, p: '#f0a0a0' }, towers[i].x, ry + 120, 12, { anchor: 'center' });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.88);
    label(stacked() + ' / ' + GOAL_EACH * 2, 220, 100, 64, C.white);
    label('SCORE ' + score, 220, 182, 36, C.gold);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(BUN, { w: i < lives ? C.white : '#555', p: i < lives ? '#f0a0a0' : '#555' }, 640 + i * 110, 80, 18, { anchor: 'center' });
    var timeLeft = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 160, 440, 30, '#333');
    game.draw.rect(560, 160, 440 * timeLeft, 30, timeLeft < 0.25 ? C.red : C.ok);
  }

  function drawScene() {
    drawKitchen();
    drawChef();
    drawTower(towers[0], 0);
    drawTower(towers[1], 1);
    drawFalling();
    drawThumbZone();
  }

  // ---- ATTRACT: 実ロジックで両手の台を動かして受ける。最後に右の台を止めて落として見せる ----
  var demo = { t: 0, hx: W * 0.3, side: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; moveBases(dt); return; }
    touchX = [null, null];
    for (var s = 0; s < 2; s++) {
      var f = null;
      for (var i = 0; i < falling.length; i++) if (falling[i].side === s && (!f || falling[i].y > f.y)) f = falling[i];
      if (!f) for (var w = 0; w < warns.length; w++) if (warns[w].side === s) f = warns[w];
      if (!f || (cyc > 8 && s === 1)) continue;
      var tw = towers[s];
      var tt = Math.max(0, (topY(tw) - (f.y || VENT_Y)) / (f.v || 600));
      var want = f.x + (f.vx || 0) * tt - (topX(tw) - tw.x) + (s ? 8 : -6);
      tw.tx = Math.max(RANGE[s][0], Math.min(RANGE[s][1], want));
      touchX[s] = tw.tx;
      if (s === demo.side || !touchX[demo.side]) demo.side = s;
    }
    var ev = stepWorld(dt, true);
    if (ev) onFail(ev, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      var hs = touchX[0] !== null && (touchX[1] === null || Math.floor(t * 1.5) % 2 === 0) ? 0 : 1;
      demo.hx += (towers[hs].x - demo.hx) * Math.min(1, dt * 10);
      game.draw.hand(demo.hx, H * 0.88, { press: touchX[hs] !== null, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.88);
      label(GAME_TITLE, W / 2, 105, 86 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.4, 52, C.red);
      else label('TAP TO START', W / 2, H * 0.4, 46, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.24, W, H * 0.24, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 100, won ? C.ok : C.red);
      label('SCORE ' + score, W / 2, H * 0.36, 54, C.white);
      label(stacked() + ' / ' + GOAL_EACH * 2 + '  PERFECT ' + perfects, W / 2, H * 0.405, 38, C.gold);
      if (won && score > game.best) label('NEW RECORD', W / 2, H * 0.45, 48, C.gold);
      else label('BEST ' + Math.max(game.best, won ? score : 0), W / 2, H * 0.45, 36, C.white);
      if (!won) label('あと' + Math.max(1, GOAL_EACH * 2 - stacked()) + '段!', W / 2, H * 0.21, 60, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.52, 36, C.ink);
      return;
    }

    // ---- PLAYING ----
    readTouches();
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      moveBases(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { stacked: stacked(), perfects: perfects, maxCombo: maxCombo, lives: lives };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      moveBases(dt);
      if (readyT <= 0) game.audio.play('se_jump', 0.3);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      var ev = stepWorld(dt, false);
      if (ev) onFail(ev, false);
      if (!over && towers[0].st.length >= GOAL_EACH && towers[1].st.length >= GOAL_EACH) finish(true);
      else if (!over && playT >= TIME_LIMIT) finish(false);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.gold);
    if (over && !won && lives > 0) label('TIME UP', W / 2, H * 0.4, 96, C.red);
    if (over && won) label('FINISH', W / 2, H * 0.4, 100, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5],
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 0.5], ['A4', 2],
    ], { tempo: 144, wave: 'square', volume: 0.045, loop: true, bass: [['A2', 1], ['E2', 1], ['G2', 1], ['D2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
