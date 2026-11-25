// J-GC4-0015-onsen-bubble-stomp.js
// 湯玉ふみ — 石畳の湯穴からぽこっと湧いて横すべりする湯玉を、狙ったところへ下駄で踏んで押し戻す
// 操作: 湧いた湯玉をタップすると、その地点に下駄が踏み下ろされる(動く湯玉の行き先を狙う)
// 終わり: 制限時間内に12個踏めばCLEAR。時間切れでGAME OVER
// @mechanic: aim_shoot
// @theme: hot_spring_bubble_stomp
// 世界観: 湯けむりの温泉街で、広場の石畳から湧き出して転がる湯玉を、下駄番の子が踏んで湯穴へ押し戻し、広場を湯びたしから守る
// 残るもの: 正誤(CLEAR/GAME OVER) + 踏んだ数・最大コンボのスコア
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、タイル反復背景
  var STYLE = { bg: ['#0f0f2a', '#3c5a8c', '#7c9cc8'], main: ['#a0a0b8', '#d8d8e8'], accent: ['#f8b800', '#e84848'] };
  var C = {
    night: '#0f0f2a', dusk: '#3c5a8c', stone: '#8c8ca8', stone2: '#a0a0b8', grout: '#4c4c68',
    water: '#7cd8f8', waterHi: '#e8f8ff', steam: '#f0f0f0', wood: '#a05028', gold: '#f8b800',
    good: '#58d858', bad: '#e84848', ink: '#fcfcfc', black: '#000000'
  };

  var GAME_TITLE = 'YUDAMA STOMP';
  var TIME_LIMIT = 16;
  var NEEDED = 12;
  var FIELD_TOP = Math.round(H * 0.3);
  var FIELD_BOT = Math.round(H * 0.74);
  var HUD_Y = Math.round(H * 0.06);
  var HIT_R = 92;

  var VENTS = [];
  for (var vi = 0; vi < 8; vi++) {
    VENTS.push({ x: 180 + (vi % 4) * 240, y: FIELD_TOP + 170 + Math.floor(vi / 4) * 380 + (vi % 2) * 70 });
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BUBBLE = [
    ['..wwww..', '.wbbbbw.', 'wbhbbbbw', 'wbkbbkbw', 'wbbbbbbw', 'wbbmmbbw', '.wbbbbw.', '..wwww..'],
    ['..wwww..', '.wbbbbw.', 'wbhbbbbw', 'wbbbbbbw', 'wbkbbkbw', 'wbbmmbbw', '.wbbbbw.', '..wwww..']
  ];
  var BUB_PAL = { w: '#e8f8ff', b: '#7cd8f8', h: '#fcfcfc', k: '#0f0f2a', m: '#e84848' };
  var GOLD_PAL = { w: '#fcfcfc', b: '#f8b800', h: '#fcfcfc', k: '#0f0f2a', m: '#e84848' };
  var GETA = ['.wwwwww.', 'wwwwwwww', 'wwrrrrww', 'wwwrrwww', 'wwwwwwww', 'wwwwwwww', '.kk..kk.', '.kk..kk.'];
  var GETA_PAL = { w: '#c87840', r: '#e84848', k: '#502810' };
  var LANTERN = ['.kk.', 'rrrr', 'ryyr', 'rrrr', '.kk.'];
  var LANTERN_PAL = { k: '#000000', r: '#e84848', y: '#f8b800' };

  var bubbles, stomps, missFx, hits, combo, maxCombo, golds, score, timeLeft, spawnT;
  var ready, hitStop, finished, done, endWait, ok, milestone, flashT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    bubbles = []; stomps = []; missFx = [];
    hits = 0; combo = 0; maxCombo = 0; golds = 0; score = 0; timeLeft = TIME_LIMIT; spawnT = 0.3;
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false; milestone = 0; flashT = 0;
  }

  function freeVent() {
    for (var tries = 0; tries < 10; tries++) {
      var v = Math.floor(Math.random() * VENTS.length);
      var busy = false;
      for (var i = 0; i < bubbles.length; i++) if (bubbles[i].vent === v) busy = true;
      if (!busy) return v;
    }
    return -1;
  }

  // 湯玉: 湯気で予告(warn) → 湧く → 横すべり → 沈む
  function spawnBubble() {
    var v = freeVent();
    if (v < 0) return;
    var lvl = Math.min(1, hits / NEEDED);
    bubbles.push({
      vent: v, x: VENTS[v].x, y: VENTS[v].y, warn: 0.55, life: 1.35 - lvl * 0.3,
      vx: game.random(-1, 1) * (70 + lvl * 190), rise: 0, gold: Math.random() < 0.12, bob: Math.random() * 6
    });
  }

  function stompAt(x, y, isDemo) {
    stomps.push({ x: x, y: y, t: 0.22 });
    game.audio.play('se_tap', 0.35);
    var best = -1, bd = 1e9;
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      if (b.warn > 0) continue;
      var d = Math.hypot(b.x - x, b.y - 40 * b.rise - y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0 && bd < HIT_R) {
      var b2 = bubbles.splice(best, 1)[0];
      combo++; if (combo > maxCombo) maxCombo = combo;
      hits++;
      var mult = Math.min(4, 1 + Math.floor(combo / 3));
      var pts = (b2.gold ? 300 : 100) * mult;
      if (b2.gold) golds++;
      score += pts;
      var perfect = bd < HIT_R * 0.35;
      game.feedback.good(b2.x, b2.y - 60, { text: perfect ? 'PERFECT' : (mult > 1 ? 'x' + mult : 'GOOD'), color: b2.gold ? C.gold : C.good, count: 12 });
      game.fx.burst(b2.x, b2.y, { color: C.water, count: 10, speed: 260 });
      if (!isDemo && hits % 4 === 0 && hits < NEEDED) {
        game.audio.play('se_milestone', 0.4);
        game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.28, { color: C.gold, size: 56 });
      }
      if (!isDemo && hits >= NEEDED && !finished) winGame(b2.x, b2.y);
    } else {
      combo = 0;
      missFx.push({ x: x, y: y, t: 0.4 });
      game.feedback.bad(x, y, { text: 'MISS', color: C.bad, shake: 3 });
    }
  }

  function stepWorld(dt, isDemo) {
    spawnT -= dt;
    var lvl = Math.min(1, hits / NEEDED);
    if (spawnT <= 0) {
      spawnBubble();
      if (lvl > 0.5 && Math.random() < 0.5) spawnBubble();
      spawnT = 0.7 - lvl * 0.25;
    }
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.bob += dt * 8;
      if (b.warn > 0) { b.warn -= dt; continue; }
      b.rise = Math.min(1, b.rise + dt * 6);
      b.life -= dt;
      b.x += b.vx * dt;
      if (b.x < 90 || b.x > W - 90) b.vx = -b.vx;
      if (b.life <= 0) {
        bubbles.splice(i, 1);
        if (!isDemo) { combo = 0; game.audio.play('se_bad', 0.12); }
      }
    }
    for (var s = stomps.length - 1; s >= 0; s--) { stomps[s].t -= dt; if (stomps[s].t <= 0) stomps.splice(s, 1); }
    for (var m = missFx.length - 1; m >= 0; m--) { missFx[m].t -= dt; if (missFx[m].t <= 0) missFx.splice(m, 1); }
    if (flashT > 0) flashT -= dt;
  }

  function winGame(x, y) {
    finished = true; ok = true; hitStop = 0.4; flashT = 0.4;
    score += Math.round(timeLeft * 20);
    game.feedback.good(x, y, { text: 'CLEAR', color: C.gold, count: 30, flashColor: '#fcfcfc' });
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    finished = true; ok = false; hitStop = 0.5; flashT = 0.5;
    game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP', color: C.bad, shake: 10 });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.2;
    game.audio.stopBgm();
  }

  function drawField() {
    var t = game.time.elapsed;
    game.draw.gradient(0, FIELD_TOP, [[0, C.night], [1, C.dusk]]);
    game.draw.rect(0, 0, W, H, '#7cd8f8', 0.03 + 0.03 * Math.sin(t * 1.5));
    // 遠景: 旅館の屋根と提灯
    for (var r = 0; r < 5; r++) {
      var rx = r * 240 - 30;
      game.draw.rect(rx, FIELD_TOP - 150, 200, 24, '#3c3c58');
      game.draw.rect(rx + 20, FIELD_TOP - 126, 160, 126, '#282840');
      game.draw.rect(rx + 70, FIELD_TOP - 90, 60, 60, C.gold, 0.5 + 0.2 * Math.sin(t * 3 + r));
      game.draw.sprite(LANTERN, LANTERN_PAL, rx + 190, FIELD_TOP - 170 + Math.sin(t * 2 + r) * 8, 8, { anchor: 'center' });
    }
    // 石畳(タイル反復)
    for (var ty = FIELD_TOP; ty < H; ty += 80) {
      var odd = Math.floor((ty - FIELD_TOP) / 80) % 2;
      for (var tx = -40 * odd; tx < W; tx += 120) {
        game.draw.rect(tx, ty, 116, 76, ((tx + ty) / 40) % 2 ? C.stone : C.stone2);
      }
      game.draw.rect(0, ty + 76, W, 4, C.grout);
    }
    // 湯穴
    for (var v = 0; v < VENTS.length; v++) {
      game.draw.circle(VENTS[v].x, VENTS[v].y, 58, C.grout);
      game.draw.circle(VENTS[v].x, VENTS[v].y, 44, '#285878');
      game.draw.circle(VENTS[v].x, VENTS[v].y - 6, 30 + Math.sin(t * 4 + v) * 3, C.water, 0.6);
    }
    // 下駄箱(親指ゾーン)
    game.draw.rect(0, FIELD_BOT + 20, W, H - FIELD_BOT, '#502810');
    for (var g = 0; g < 5; g++) {
      game.draw.rect(60 + g * 200, FIELD_BOT + 90, 160, 200, C.wood);
      game.draw.sprite(GETA, GETA_PAL, 140 + g * 200, FIELD_BOT + 190 + Math.sin(t * 2 + g) * 4, 10, { anchor: 'center' });
    }
  }

  function drawActors() {
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      if (b.warn > 0) {
        // 予告: 湯気がゆらゆら立ち上る
        var a = 0.4 + 0.4 * Math.sin(game.time.elapsed * 30);
        game.draw.circle(b.x, b.y - 40 - (0.55 - b.warn) * 120, 26, C.steam, a);
        game.draw.circle(b.x + 20, b.y - 70 - (0.55 - b.warn) * 90, 18, C.steam, a * 0.7);
        continue;
      }
      var sy = b.y - 40 * b.rise + Math.sin(b.bob) * 6;
      game.draw.circle(b.x, b.y + 20, 44, '#285878', 0.4);
      var fade = b.life < 0.3 ? b.life / 0.3 : 1;
      game.draw.sprite(BUBBLE[Math.floor(b.bob / 2) % 2], b.gold ? GOLD_PAL : BUB_PAL, b.x, sy, 14 * (0.6 + 0.4 * b.rise), { anchor: 'center', alpha: fade });
    }
    for (var s = 0; s < stomps.length; s++) {
      var st = stomps[s];
      var drop = Math.max(0, st.t - 0.12) * 900;
      game.draw.circle(st.x, st.y + 20, 60, C.black, 0.25);
      game.draw.sprite(GETA, GETA_PAL, st.x, st.y - drop, 16, { anchor: 'center' });
    }
    for (var m = 0; m < missFx.length; m++) {
      game.draw.circle(missFx[m].x, missFx[m].y, 70 * (1.4 - missFx[m].t), C.bad, missFx[m].t);
    }
    if (flashT > 0) game.draw.rect(0, FIELD_TOP, W, FIELD_BOT - FIELD_TOP, '#fcfcfc', flashT * 0.8);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.black, 0.55);
    txt(hits + ' / ' + NEEDED, 60, HUD_Y + 20, 60, C.ink, 'left');
    txt('SCORE ' + score, W - 60, HUD_Y, 40, C.gold, 'right');
    if (combo >= 3) txt('COMBO ' + combo, W - 60, HUD_Y + 60, 36, C.good, 'right');
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 184, W - 120, 22, C.grout);
    game.draw.rect(60, 184, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.bad : C.water);
  }

  // ---- ATTRACT デモ: 手が実際に湯玉を狙って踏む ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: 0, n: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      demo.n++;
      if (demo.t <= dt || hits >= NEEDED - 2) initGame();
    }
    stepWorld(dt, true);
    var target = null;
    for (var i = 0; i < bubbles.length; i++) if (bubbles[i].warn <= 0 && bubbles[i].life > 0.25) { target = bubbles[i]; break; }
    var aimX = target ? target.x + target.vx * 0.15 : W / 2, aimY = target ? target.y - 40 : H * 0.55;
    demo.gx += (aimX - demo.gx) * Math.min(1, dt * 9);
    demo.gy += (aimY - demo.gy) * Math.min(1, dt * 9);
    demo.cool -= dt;
    if (target && demo.cool <= 0 && Math.hypot(aimX - demo.gx, aimY - demo.gy) < 30) {
      // 4回に1回は狙いが遅れて外す例
      var off = (demo.n + hits) % 4 === 3 ? 150 : 0;
      stompAt(demo.gx + off, demo.gy, true);
      demo.press = 0.2; demo.cool = 0.45;
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished || ready > 0) { game.audio.play('se_tap', 0.15); return; }
    stompAt(x, y, false);
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bubbles === undefined) initGame();
      stepDemo(dt);
      drawField();
      drawActors();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, H * 0.06, W, H * 0.13, C.black, 0.5);
      txt(GAME_TITLE, W / 2, H * 0.12, 88, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.165, 40, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 34, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawField();
      game.draw.rect(0, H * 0.3, W, H * 0.3, C.black, 0.6);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.38, 100, ok ? C.gold : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.44, 52, C.ink);
      txt(hits + ' / ' + NEEDED + '  COMBO ' + maxCombo, W / 2, H * 0.49, 40, C.water);
      if (!ok && hits < NEEDED) txt('あと' + (NEEDED - hits) + '個!', W / 2, H * 0.54, 48, C.bad);
      else if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.54, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.54, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { hits: hits, maxCombo: maxCombo, golds: golds };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0 && !finished) { timeLeft = 0; loseGame(); }
    }

    drawField();
    drawActors();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['F4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 1],
      ['A4', 0.5], ['G4', 0.5], ['F4', 0.5], ['E4', 0.5], ['D4', 1], ['A3', 1]
    ], { tempo: 160, wave: 'square', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
