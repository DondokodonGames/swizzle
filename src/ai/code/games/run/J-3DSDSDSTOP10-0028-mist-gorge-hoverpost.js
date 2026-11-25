// J-3DSDSDSTOP10-0028-mist-gorge-hoverpost.js
// 霧谷のホバー便 — 押している間だけ浮き上がり、離すと沈むホバー艇で岩柱の隙間を抜け、浮かぶ郵便筒を12本拾う
// 操作: 画面を押し続けると艇が上昇、離すと下降する。岩柱や谷の天井・底に触れないよう高さを保ちつつ郵便筒に重なる
// 終わり: 郵便筒を12本拾えば成功。岩に触れる/時間切れで失敗
// @mechanic: dodge
// @theme: mist_gorge_hoverpost
// 世界観: 霧の立ちこめる峡谷を行き来する郵便ホバー艇の乗り手が、浮力ひとつで岩柱の隙間をくぐり抜け、風に流された郵便筒を回収して回る
// 残るもの: 正誤(CLEAR/GAME OVER) + 拾った郵便筒の数と飛行距離
// スタイル: 70s VECTOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 暗い地に発光する線画のみ(塗りを使わない)。発光色は緑・シアン・マゼンタ
  var STYLE = { bg: ['#000814', '#001428', '#000000'], main: ['#39ff88', '#3fd8ff'], accent: ['#ff4fd8', '#fff36a'] };
  var COL = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1], green: STYLE.main[0], cyan: STYLE.main[1], magenta: STYLE.accent[0], yellow: STYLE.accent[1],
    glowG: 'rgba(57,255,136,0.25)', glowC: 'rgba(63,216,255,0.25)', glowM: 'rgba(255,79,216,0.3)', white: '#ffffff', red: '#ff4a4a'
  };

  var GAME_TITLE = 'HOVERPOST';
  var TIME_LIMIT = 20;
  var NEEDED = 12;
  var TOP = H * 0.2, BOT = H * 0.78;
  var SX = W * 0.26, SW = 104, SH = 56;
  var THRUST = 2100, GRAVITY = 1400, VMAX = 900;

  // 線画スプライト(輪郭のみ)
  var SKIFF_A = ['..gggggg..', '.g......g.', 'gggggggggg', 'g.c....c.g', '.gggggggg.', '..c.c.c...'];
  var SKIFF_B = ['..gggggg..', '.g......g.', 'gggggggggg', 'g..c..c..g', '.gggggggg.', '...c.c.c..'];
  var PAL_SKIFF = { g: COL.green, c: COL.cyan };
  var TUBE = ['.yyyy.', 'y....y', 'y.yy.y', 'y....y', '.yyyy.'];
  var PAL_TUBE = { y: COL.yellow };
  var BIRD_A = ['m...m', '.m.m.', '..m..'];
  var BIRD_B = ['.....', 'mm.mm', '..m..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var y, vy, thrust, pillars, tubes, spawnT, tubeT, scroll, speed, dist, got, timeLeft, ready, finished, ok, hitStop, endWait, hl, flightT, hitRect;
  var silent = false;

  function vtext(str, x, yy, sz, color) {
    game.draw.text(str, x, yy, { size: sz + 4, color: 'rgba(255,255,255,0.12)', bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, yy, { size: sz, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function glowLine(x1, y1, x2, y2, color, glow) {
    game.draw.line(x1, y1, x2, y2, glow, 14);
    game.draw.line(x1, y1, x2, y2, color, 4);
  }

  function initGame() {
    y = (TOP + BOT) / 2; vy = 0; thrust = false; pillars = []; tubes = []; spawnT = 0.6; tubeT = 1.1;
    scroll = 0; speed = 470; dist = 0; got = 0; timeLeft = TIME_LIMIT; ready = 0.8; finished = false; ok = false;
    hitStop = 0; endWait = 0; hl = null; flightT = 0; hitRect = null;
  }

  function finishRound(success, x, yy) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45; hl = { x: x, y: yy, t: 0 };
    if (!silent) game.audio.stopBgm();
  }

  function spawnPillar() {
    var k = Math.min(1, flightT / 16);
    var gapH = 610 - 140 * k;
    var prev = pillars.length ? pillars[pillars.length - 1].gapY : (TOP + BOT) / 2;
    var lo = Math.max(TOP + gapH / 2 + 30, prev - 280), hi = Math.min(BOT - gapH / 2 - 30, prev + 280);
    var gapY = game.random(lo, hi);
    pillars.push({ x: W + 80, w: 120, gapY: gapY, gapH: gapH, warned: false });
    // 隙間の中に1本(高さは隙間の上寄り/下寄りに散らす)
    tubes.push({ x: W + 140, y: gapY + game.random(-0.3, 0.3) * gapH, taken: false, bob: game.random(0, 6) });
  }

  function spawnTube() {
    // 柱と柱の間: 前後の隙間の中間の高さに置く(寄り道すると次の柱に間に合わない位置もある)
    if (pillars.length < 1) return;
    var last = pillars[pillars.length - 1];
    var mid = pillars.length > 1 ? (pillars[pillars.length - 2].gapY + last.gapY) / 2 : last.gapY;
    tubes.push({ x: last.x + 360, y: mid + game.random(-120, 120), taken: false, bob: game.random(0, 6) });
  }

  function stepWorld(dt) {
    if (finished) return;
    flightT += dt;
    speed = 470 + Math.min(230, flightT * 13);
    // 浮力(押している間だけ上昇)
    vy += (thrust ? -THRUST : GRAVITY) * dt;
    vy = Math.max(-VMAX, Math.min(VMAX, vy));
    y += vy * dt;
    var dx = speed * dt;
    scroll += dx; dist += dx;
    spawnT -= dt; tubeT -= dt;
    if (spawnT <= 0) { spawnPillar(); spawnT = Math.max(1.1, 1.5 - flightT * 0.02); }
    if (tubeT <= 0) { spawnTube(); tubeT = 2.3; }
    var i;
    for (i = pillars.length - 1; i >= 0; i--) {
      var p = pillars[i];
      p.x -= dx;
      if (p.x < -200) { pillars.splice(i, 1); continue; }
      var top = p.gapY - p.gapH / 2, bot = p.gapY + p.gapH / 2;
      if (game.hit.rect(SX - SW / 2, y - SH / 2, SW, SH, p.x, 0, p.w, top) ) { hitRect = { x: p.x, y: TOP, w: p.w, h: top - TOP }; finishRound(false, SX, y); return; }
      if (game.hit.rect(SX - SW / 2, y - SH / 2, SW, SH, p.x, bot, p.w, H)) { hitRect = { x: p.x, y: bot, w: p.w, h: BOT - bot }; finishRound(false, SX, y); return; }
    }
    if (y - SH / 2 < TOP || y + SH / 2 > BOT) { hitRect = { x: SX - 120, y: y < TOP + 40 ? TOP - 10 : BOT - 10, w: 240, h: 20 }; finishRound(false, SX, y); return; }
    for (i = tubes.length - 1; i >= 0; i--) {
      var t = tubes[i];
      t.x -= dx;
      if (t.x < -100) { tubes.splice(i, 1); continue; }
      if (!t.taken && game.hit.circle(SX, y, 60, t.x, t.y, 44)) {
        t.taken = true; got++;
        game.feedback.good(t.x, t.y, { text: got === NEEDED ? 'PERFECT' : 'GOOD', color: COL.yellow, sound: silent ? 'se_tap' : 'se_coin', volume: silent ? 0 : 0.45 });
        if (got === NEEDED / 2) { game.fx.popup(got + ' / ' + NEEDED, W / 2, H * 0.26, { color: COL.cyan, size: 56 }); if (!silent) game.audio.play('se_milestone', 0.45); }
        if (got >= NEEDED) { finishRound(true, t.x, t.y); return; }
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, COL.bg1], [0.5, COL.bg2], [1, STYLE.bg[2]]]);
    game.draw.rect(0, 0, W, H, COL.cyan, 0.02 + 0.02 * Math.sin(t * 1.5));
    // 遠景の稜線(ベクター線)
    var off = (scroll * 0.2) % 240;
    for (var i = -1; i < 6; i++) {
      var bx = i * 240 - off;
      game.draw.line(bx, TOP + 60, bx + 120, TOP + 10, 'rgba(63,216,255,0.35)', 3);
      game.draw.line(bx + 120, TOP + 10, bx + 240, TOP + 60, 'rgba(63,216,255,0.35)', 3);
    }
    // 霧の横線
    for (var m = 0; m < 5; m++) {
      var my = TOP + 80 + m * 140 + Math.sin(t + m) * 10;
      var mx = (m * 311 - scroll * 0.5) % (W + 400);
      if (mx < -400) mx += W + 400;
      game.draw.line(mx, my, mx + 300, my, 'rgba(255,255,255,0.12)', 3);
    }
    // 谷の天井と底
    glowLine(0, TOP, W, TOP, COL.cyan, COL.glowC);
    glowLine(0, BOT, W, BOT, COL.cyan, COL.glowC);
    var hoff = scroll % 80;
    for (var h = -1; h < W / 80 + 1; h++) {
      game.draw.line(h * 80 - hoff, TOP, h * 80 - hoff - 40, TOP - 40, 'rgba(63,216,255,0.5)', 2);
      game.draw.line(h * 80 - hoff, BOT, h * 80 - hoff - 40, BOT + 40, 'rgba(63,216,255,0.5)', 2);
    }
  }

  function drawPillars() {
    var t = game.time.elapsed;
    for (var i = 0; i < pillars.length; i++) {
      var p = pillars[i], top = p.gapY - p.gapH / 2, bot = p.gapY + p.gapH / 2;
      // 画面に入る直前は右端で予告点滅
      if (p.x > W - 20 && Math.floor(t * 12) % 2 === 0) glowLine(W - 12, top - 80, W - 12, top, COL.magenta, COL.glowM);
      if (p.x > W - 20 && Math.floor(t * 12) % 2 === 0) glowLine(W - 12, bot, W - 12, bot + 80, COL.magenta, COL.glowM);
      glowLine(p.x, TOP, p.x, top, COL.magenta, COL.glowM);
      glowLine(p.x + p.w, TOP, p.x + p.w, top, COL.magenta, COL.glowM);
      glowLine(p.x, top, p.x + p.w, top, COL.magenta, COL.glowM);
      glowLine(p.x, bot, p.x + p.w, bot, COL.magenta, COL.glowM);
      glowLine(p.x, bot, p.x, BOT, COL.magenta, COL.glowM);
      glowLine(p.x + p.w, bot, p.x + p.w, BOT, COL.magenta, COL.glowM);
      for (var hy = TOP + 30; hy < top; hy += 60) game.draw.line(p.x, hy, p.x + p.w, hy + 30, 'rgba(255,79,216,0.4)', 2);
      for (var gy = bot + 30; gy < BOT; gy += 60) game.draw.line(p.x, gy, p.x + p.w, gy + 30, 'rgba(255,79,216,0.4)', 2);
    }
  }

  function drawTubes() {
    var t = game.time.elapsed;
    for (var i = 0; i < tubes.length; i++) {
      var tb = tubes[i];
      if (tb.taken) continue;
      game.draw.circle(tb.x, tb.y + Math.sin(t * 3 + tb.bob) * 8, 46, 'rgba(255,243,106,0.12)');
      game.draw.sprite(TUBE, PAL_TUBE, tb.x, tb.y + Math.sin(t * 3 + tb.bob) * 8, 12, { anchor: 'center' });
    }
  }

  function drawSkiff() {
    var t = game.time.elapsed;
    var tilt = Math.max(-1, Math.min(1, vy / VMAX));
    game.draw.sprite(Math.floor(t * 10) % 2 ? SKIFF_A : SKIFF_B, PAL_SKIFF, SX + Math.sin(t * 1.3) * 4, y + tilt * 6, 11, { anchor: 'center' });
    if (thrust) for (var k = 0; k < 3; k++) game.draw.line(SX - 30 + k * 30, y + 40, SX - 30 + k * 30 + game.random(-6, 6), y + 80 + game.random(0, 30), COL.cyan, 3);
  }

  function drawBirds() {
    var t = game.time.elapsed;
    for (var b = 0; b < 3; b++) {
      var bx = W - ((t * 90 + b * 380) % (W + 200)) + 100;
      game.draw.sprite(Math.floor(t * 5 + b) % 2 ? BIRD_A : BIRD_B, { m: 'rgba(255,255,255,0.5)' }, bx, TOP - 70 - b * 20 + Math.sin(t * 2 + b) * 10, 8, { anchor: 'center' });
    }
  }

  function drawThumb() {
    var t = game.time.elapsed;
    var cx = W / 2, cy = H * 0.9, r = 100 + (thrust ? 16 : 6 * Math.sin(t * 3));
    game.draw.circle(cx, cy, r + 14, thrust ? COL.glowG : 'rgba(57,255,136,0.08)');
    for (var a = 0; a < 16; a++) {
      var a1 = (a / 16) * Math.PI * 2, a2 = ((a + 1) / 16) * Math.PI * 2;
      game.draw.line(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cx + Math.cos(a2) * r, cy + Math.sin(a2) * r, COL.green, 4);
    }
    glowLine(cx, cy + 40, cx, cy - 40, COL.green, COL.glowG);
    glowLine(cx, cy - 40, cx - 28, cy - 12, COL.green, COL.glowG);
    glowLine(cx, cy - 40, cx + 28, cy - 12, COL.green, COL.glowG);
  }

  function drawHud() {
    vtext(got + ' / ' + NEEDED, W / 2, H * 0.05, 56, COL.yellow);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.line(80, 170, W - 80, 170, 'rgba(63,216,255,0.3)', 16);
    game.draw.line(80, 170, 80 + (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 170, low ? COL.red : COL.green, 12);
    vtext(Math.floor(dist / 100) + 'm', W * 0.86, H * 0.05, 36, COL.cyan);
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    var rr = 60 + hl.t * 320;
    game.draw.circle(hl.x, hl.y, rr, 'rgba(255,255,255,' + Math.max(0, 0.5 - hl.t).toFixed(2) + ')');
    if (!ok && hitRect) {
      var flash = Math.floor(hl.t * 16) % 2 === 0 ? COL.white : COL.red;
      game.draw.line(hitRect.x, hitRect.y, hitRect.x + hitRect.w, hitRect.y, flash, 8);
      game.draw.line(hitRect.x, hitRect.y + hitRect.h, hitRect.x + hitRect.w, hitRect.y + hitRect.h, flash, 8);
      game.draw.line(hitRect.x, hitRect.y, hitRect.x, hitRect.y + hitRect.h, flash, 8);
      game.draw.line(hitRect.x + hitRect.w, hitRect.y, hitRect.x + hitRect.w, hitRect.y + hitRect.h, flash, 8);
    }
    game.draw.sprite(ok ? TUBE : SKIFF_A, ok ? PAL_TUBE : { g: COL.white, c: COL.red }, hl.x, hl.y, 14 + hl.t * 10, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック) ─────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, n: 0, fail: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; spawnT = 0.1; tubeT = 0.4; demo.n++; demo.fail = demo.n % 3 === 0; }
    silent = true;
    // 次の柱の隙間(なければ郵便筒)に高さを合わせる
    var target = (TOP + BOT) / 2, i;
    for (i = 0; i < pillars.length; i++) if (pillars[i].x + pillars[i].w > SX - SW) { target = pillars[i].gapY; break; }
    for (i = 0; i < tubes.length; i++) if (!tubes[i].taken && tubes[i].x > SX && tubes[i].x < SX + 260) { target = tubes[i].y; break; }
    var predicted = y + vy * 0.18;
    thrust = demo.fail && cyc > 1.6 ? false : predicted > target;
    demo.gx = W / 2; demo.gy = thrust ? H * 0.9 : H * 0.87;
    stepWorld(dt);
    if (finished && hitStop > 0) hitStop -= dt;
    silent = false;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function () {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function () {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_jump', 0.25);
    game.fx.burst(SX, y + 40, { color: COL.cyan, count: 6, speed: 180 });
  });
  game.onRelease(function () {
    if (state !== S.PLAYING || finished) return;
    game.audio.tone(thrust ? 'D4' : 'A3', 0.05, { wave: 'triangle', volume: 0.07 });
  });

  // ── ループ(唯一の onUpdate) ───────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (y === undefined) initGame();
      stepDemo(dt);
      drawBack(); drawBirds(); drawPillars(); drawTubes(); drawSkiff(); drawThumb();
      if (finished) drawHighlight(dt);
      game.draw.hand(demo.gx, demo.gy, { press: thrust, scale: 14 });
      vtext(GAME_TITLE, W / 2, H * 0.07, 80, COL.green);
      vtext('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 34, COL.cyan);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) vtext('► 100円 投入 ◄', W / 2, H * 0.975, 42, COL.yellow);
      else vtext('INSERT COIN', W / 2, H * 0.975, 36, COL.green);
      return;
    }

    if (state === S.RESULT) {
      drawBack(); drawPillars(); drawThumb();
      var sc = got * 100 + Math.floor(dist / 100) * 2 + (ok ? Math.round(timeLeft * 20) : 0);
      vtext(ok ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.09, 100, ok ? COL.green : COL.red);
      vtext(got + ' / ' + NEEDED, W / 2, H * 0.15, 52, COL.yellow);
      vtext('SCORE ' + sc, W / 2, H * 0.2, 44, COL.cyan);
      if (ok && sc > (game.best || 0)) vtext('NEW RECORD', W / 2, H * 0.245, 46, COL.yellow);
      else vtext('BEST ' + (game.best || 0), W / 2, H * 0.245, 36, COL.cyan);
      if (!ok) vtext('あと' + (NEEDED - got) + '本!', W / 2, H * 0.5, 64, COL.magenta);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) vtext('TAP TO CONTINUE', W / 2, H * 0.975, 38, COL.green);
      return;
    }

    thrust = game.input.pressing && ready <= 0 && !finished;
    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.feedback.good(hl.x, hl.y, { text: 'CLEAR', color: COL.yellow, count: 26 }); game.audio.play('se_success', 0.6); }
          else { game.feedback.bad(hl.x, hl.y, { text: 'MISS' }); game.audio.play('se_failure', 0.5); }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { tubes: got, needed: NEEDED, meters: Math.floor(dist / 100) };
          if (ok) game.end.success(got * 100 + Math.floor(dist / 100) * 2 + Math.round(timeLeft * 20), stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; finishRound(false, SX, y); }
      else stepWorld(dt);
    }

    drawBack(); drawBirds(); drawPillars(); drawTubes(); drawSkiff(); drawThumb(); drawHud();
    if (finished) drawHighlight(dt);
    if (ready > 0) vtext(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, COL.yellow);
  });

  game.onStart(function () {
    game.audio.melody([['E5', 0.5], ['B4', 0.5], ['E5', 0.5], ['G5', 0.5], ['F#5', 1], ['D5', 0.5], ['B4', 0.5], ['E5', 1]],
      { tempo: 138, wave: 'sawtooth', volume: 0.035, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
