// J-3DSDSDSTOP10-0023-meadow-fence-gnats.js
// 牧場の柵塗り — 押している間だけ刷毛が進む。ブヨの群れが横切る間は手を止め、刺されずに柵6枚を塗り切る
// 操作: 画面を押している間ペンキを塗る。画面端に黒い群れが集まったら指を離し、通り過ぎたらまた押す
// 終わり: 制限時間内に6枚塗り切れば成功。群れが通る間に塗っていて2回刺される/時間切れで失敗
// @mechanic: freeze
// @theme: meadow_fence_gnats
// 世界観: 夏の牧場で柵塗りを任された見習い職人が、川べりから湧くブヨの群れが通り過ぎる間だけ刷毛を止め、刺されずに夕方までに柵を塗り上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 塗った柵の枚数と群れをやり過ごした回数
// スタイル: 90s HANDHELD COLOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、太い形、密度を抑える
  var STYLE = { bg: ['#b8c9a3', '#d8dcb8', '#8fa37a'], main: ['#e8e2c8', '#c86b4a'], accent: ['#f0c75e', '#4f6b8f'] };
  var COL = {
    sky: STYLE.bg[1], sky2: STYLE.bg[0], grass: STYLE.bg[2], grass2: '#7a9066',
    wood: '#9a7b5a', woodDark: '#6e5842', paint: STYLE.main[1], paintHi: '#e08c68',
    cream: STYLE.main[0], gold: STYLE.accent[0], blue: STYLE.accent[1], ink: '#3a3f33', swarm: '#2b2a26', bad: '#d94a3a', good: '#6fae5a'
  };

  var GAME_TITLE = 'FENCE & GNATS';
  var TIME_LIMIT = 14;
  var NEEDED = 6;
  var PAINT_RATE = 1 / 0.95;
  var MAX_STINGS = 2;
  var WARN = 0.7;
  var SWEEP = 1.15;
  var FENCE_Y = H * 0.36;
  var FENCE_H = H * 0.3;
  var PLANK_W = 120;
  var GAP = 34;
  var FENCE_X0 = (W - (NEEDED * PLANK_W + (NEEDED - 1) * GAP)) / 2;

  var PAINTER_A = ['..hhhh..', '.hhhhhh.', '..ffff..', '..f..f..', '.bbbbbb.', 'bbbbbbbb', '.bb..bb.', '.kk..kk.'];
  var PAINTER_B = ['..hhhh..', '.hhhhhh.', '..ffff..', '..f..f..', '.bbbbbbr', 'bbbbbbb.', '.bb..bb.', '.kk..kk.'];
  var PAINTER_DUCK = ['........', '..hhhh..', '.hhhhhh.', '..ffff..', 'bbbbbbbb', 'bbbbbbbb', '.bb..bb.', '.kk..kk.'];
  var PAL_PAINTER = { h: '#e8e2c8', f: '#e0b894', b: '#4f6b8f', k: '#3a3f33', r: '#c86b4a' };
  var BRUSH = ['.w.', '.w.', 'ppp', 'ppp'];
  var PAL_BRUSH = { w: '#8a6a4a', p: '#c86b4a' };
  var GNAT_A = ['k.k', '.k.'];
  var GNAT_B = ['.k.', 'k.k'];
  var PAL_GNAT = { k: '#2b2a26' };
  var COW = ['..ww....', 'wwwwwww.', 'wkwwkwww', 'wwwwwwww', '.w.w.w.w'];
  var PAL_COW = { w: '#e8e2c8', k: '#3a3f33' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var paint, plank, holding, stings, dodged, timeLeft, ready, finished, ok, hitStop, endWait, hl, swarm, nextSwarm, swarmN, flinch, paintT, sparkT;
  var silent = false;

  function write(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#5f6b4f', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function plankX(i) { return FENCE_X0 + i * (PLANK_W + GAP); }
  function painterX() { return plankX(Math.min(plank, NEEDED - 1)) + PLANK_W / 2; }

  function initGame() {
    paint = 0; plank = 0; holding = false; stings = 0; dodged = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    finished = false; ok = false; hitStop = 0; endWait = 0; hl = null; swarm = null; nextSwarm = 1.2; swarmN = 0; flinch = 0; paintT = 0; sparkT = 0;
  }

  function finishRound(success, x, y) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45; hl = { x: x, y: y, t: 0 };
    if (!silent) game.audio.stopBgm();
  }

  function spawnSwarm() {
    swarmN++;
    var fake = swarmN > 1 && swarmN % 3 === 0;           // フェイント: 集まるだけで引き返す
    var dir = swarmN % 2 ? 1 : -1;
    swarm = { phase: 'warn', t: 0, dir: dir, x: dir > 0 ? -140 : W + 140, fake: fake, hitDone: false, sawHold: false, worked: holding };
    if (!silent) game.audio.tone(dir > 0 ? 'C3' : 'D3', 0.5, { wave: 'sawtooth', volume: 0.07, slide: 30 });
  }

  function stepWorld(dt) {
    if (finished) return;
    if (flinch > 0) flinch -= dt;
    // 塗り(群れに驚いている間は塗れない)
    if (holding && flinch <= 0 && plank < NEEDED) {
      paint += PAINT_RATE * dt; paintT += dt;
      if (paint >= 1) {
        paint = 0; plank++;
        game.feedback.good(plankX(plank - 1) + PLANK_W / 2, FENCE_Y, { text: plank === NEEDED ? 'PERFECT' : 'GOOD', color: COL.good, sound: silent ? 'se_tap' : 'se_coin', volume: silent ? 0 : 0.45 });
        if (plank === 3) { game.fx.popup('3 / 6', W / 2, H * 0.3, { color: COL.gold, size: 52 }); if (!silent) game.audio.play('se_milestone', 0.4); }
        if (plank >= NEEDED) { finishRound(true, plankX(NEEDED - 1) + PLANK_W / 2, FENCE_Y + FENCE_H / 2); return; }
      }
    }
    // 群れ
    nextSwarm -= dt;
    if (!swarm && nextSwarm <= 0) spawnSwarm();
    if (swarm) {
      swarm.t += dt;
      if (holding) swarm.worked = true;
      if (swarm.phase === 'warn' && swarm.t >= WARN) {
        swarm.phase = swarm.fake ? 'retreat' : 'sweep'; swarm.t = 0;
        if (!silent && !swarm.fake) game.audio.tone('E3', SWEEP, { wave: 'sawtooth', volume: 0.08, slide: -40 });
      }
      if (swarm.phase === 'sweep') {
        var k = swarm.t / SWEEP;
        swarm.x = swarm.dir > 0 ? -140 + (W + 280) * k : W + 140 - (W + 280) * k;
        var over = Math.abs(swarm.x - painterX()) < 170;
        if (over && holding) swarm.sawHold = true;
        if (over && holding && !swarm.hitDone) {
          swarm.hitDone = true; stings++; flinch = 0.6; paint = Math.max(0, paint - 0.35);
          if (stings >= MAX_STINGS) { finishRound(false, painterX(), FENCE_Y + FENCE_H * 0.8); return; }
          game.feedback.bad(painterX(), FENCE_Y + FENCE_H * 0.7, { text: 'MISS', sound: silent ? 'se_tap' : 'se_bad', volume: silent ? 0 : 0.5 });
        }
        if (swarm.t >= SWEEP) {
          if (!swarm.sawHold && swarm.worked) {
            dodged++;
            game.feedback.good(painterX(), FENCE_Y - 40, { text: dodged >= 3 ? 'PERFECT' : 'NICE', color: COL.gold, sound: silent ? 'se_tap' : 'se_good', volume: silent ? 0 : 0.35 });
          }
          swarm = null; nextSwarm = 1.1 + (swarmN % 3) * 0.35;
        }
      } else if (swarm.phase === 'retreat' && swarm.t >= 0.5) {
        swarm = null; nextSwarm = 0.7;
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, COL.sky], [0.3, COL.sky2], [0.72, COL.grass], [1, COL.grass2]]);
    game.draw.rect(0, 0, W, H, '#fff6d8', 0.06 + 0.05 * Math.sin(t * 1.2));
    // 遠くの丘と牛
    game.draw.circle(W * 0.25, H * 0.33, 260, '#a3b88c');
    game.draw.circle(W * 0.8, H * 0.34, 300, '#98ad82');
    game.draw.sprite(COW, PAL_COW, W * 0.8 + Math.sin(t * 0.5) * 30, H * 0.27 + Math.sin(t * 2) * 3, 9, { anchor: 'center', flipX: Math.cos(t * 0.5) < 0 });
    // 川(群れの湧く場所)
    game.draw.rect(0, H * 0.7, W, 26, '#7f9fb0', 0.8);
    game.draw.rect(0, H * 0.7 + 8, W, 4, '#c8d8d8', 0.6 + 0.3 * Math.sin(t * 3));
  }

  function drawFence() {
    game.draw.rect(FENCE_X0 - 30, FENCE_Y + 60, W - 2 * FENCE_X0 + 60, 26, COL.woodDark);
    game.draw.rect(FENCE_X0 - 30, FENCE_Y + FENCE_H - 90, W - 2 * FENCE_X0 + 60, 26, COL.woodDark);
    for (var i = 0; i < NEEDED; i++) {
      var x = plankX(i);
      game.draw.rect(x + 8, FENCE_Y + 10, PLANK_W, FENCE_H, '#5f4c3a', 0.5);
      game.draw.rect(x, FENCE_Y, PLANK_W, FENCE_H, COL.wood);
      game.draw.rect(x + 14, FENCE_Y + 20, 10, FENCE_H - 40, '#8a6d50');
      var fill = i < plank ? 1 : i === plank ? paint : 0;
      if (fill > 0) {
        var fh = FENCE_H * fill;
        game.draw.rect(x, FENCE_Y + FENCE_H - fh, PLANK_W, fh, COL.paint);
        game.draw.rect(x + 12, FENCE_Y + FENCE_H - fh, 14, fh, COL.paintHi);
      }
      if (i === plank && !finished) game.draw.rect(x - 6, FENCE_Y - 18, PLANK_W + 12, 10, COL.gold, 0.5 + 0.4 * Math.sin(game.time.elapsed * 6));
    }
  }

  function drawPainter() {
    var t = game.time.elapsed;
    var px = painterX() + Math.sin(t * 1.3) * 6;
    var py = FENCE_Y + FENCE_H + 90 + Math.sin(t * 2.6) * 5;
    var fr = flinch > 0 || (swarm && swarm.phase !== 'retreat' && !holding) ? PAINTER_DUCK : holding && Math.floor(t * 8) % 2 ? PAINTER_B : PAINTER_A;
    game.draw.rect(px - 80, py + 80, 160, 16, '#5f7050', 0.5);
    game.draw.sprite(fr, PAL_PAINTER, px, py, 20, { anchor: 'center' });
    if (holding && flinch <= 0 && plank < NEEDED) {
      var by = FENCE_Y + FENCE_H - FENCE_H * paint - 20 + Math.sin(t * 20) * 12;
      game.draw.sprite(BRUSH, PAL_BRUSH, plankX(plank) + PLANK_W / 2, by, 14, { anchor: 'center' });
    }
  }

  function drawSwarm() {
    if (!swarm) return;
    var t = game.time.elapsed;
    var cx, cy = FENCE_Y + FENCE_H * 0.55, spread = 150, alpha = 1;
    if (swarm.phase === 'warn') {
      cx = swarm.dir > 0 ? 70 : W - 70;
      spread = 40 + 60 * (swarm.t / WARN);
      // telegraph: 画面端の点滅と群れの影
      if (Math.floor(t * 10) % 2 === 0) game.draw.rect(swarm.dir > 0 ? 0 : W - 36, FENCE_Y - 40, 36, FENCE_H + 80, COL.bad, 0.55);
    } else if (swarm.phase === 'retreat') {
      cx = swarm.dir > 0 ? 70 - swarm.t * 300 : W - 70 + swarm.t * 300;
      alpha = Math.max(0, 1 - swarm.t * 2);
    } else {
      cx = swarm.x;
    }
    game.draw.circle(cx, cy, spread, COL.swarm, 0.18 * alpha);
    for (var i = 0; i < 26; i++) {
      var a = i * 2.4 + t * (5 + (i % 4));
      var r = spread * (0.3 + ((i * 37) % 70) / 100);
      var fr = Math.floor(t * 14 + i) % 2 ? GNAT_A : GNAT_B;
      game.draw.sprite(fr, PAL_GNAT, cx + Math.cos(a) * r, cy + Math.sin(a * 1.3) * r * 0.7, 7, { anchor: 'center', alpha: alpha });
    }
  }

  function drawThumb() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.82, W, H * 0.18, '#6f845c', 0.6);
    // 押しっぱなしの手元パッド(ペンキ缶)
    var cx = W / 2, cy = H * 0.89;
    game.draw.circle(cx, cy + 10, 120, '#4f5f42', 0.6);
    game.draw.circle(cx, cy, 110, holding ? COL.paint : COL.cream);
    game.draw.circle(cx, cy, 78, holding ? COL.paintHi : '#cfc8ac');
    game.draw.circle(cx, cy, 18 + (holding ? 10 * Math.sin(t * 12) : 0), COL.woodDark);
    for (var s = 0; s < MAX_STINGS; s++) game.draw.circle(W * 0.14 + s * 60, H * 0.89, 22, s < MAX_STINGS - stings ? COL.good : COL.bad);
  }

  function drawHud() {
    write(plank + ' / ' + NEEDED, W / 2, H * 0.05, 56, COL.ink);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, W - 160, 22, '#8f9a78');
    game.draw.rect(80, 160, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? COL.bad : COL.blue);
    write('x' + dodged, W * 0.88, H * 0.05, 40, COL.gold);
  }

  function drawFrame() {
    // 携帯機の画面枠
    game.draw.rect(0, 0, W, 10, '#5f6b4f');
    game.draw.rect(0, H - 10, W, 10, '#5f6b4f');
    game.draw.rect(0, 0, 10, H, '#5f6b4f');
    game.draw.rect(W - 10, 0, 10, H, '#5f6b4f');
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    game.draw.circle(hl.x, hl.y, 50 + hl.t * 260, '#ffffff', Math.max(0, 0.6 - hl.t));
    if (!ok) game.draw.sprite(GNAT_A, { k: '#ffffff' }, hl.x + 40, hl.y - 60, 22 + hl.t * 20, { anchor: 'center' });
    else game.draw.sprite(BRUSH, PAL_BRUSH, hl.x, hl.y - 60, 22 + hl.t * 20, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック) ─────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.89, press: false, n: 0, fail: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0; plank = 2; paint = 0.2; nextSwarm = 0.9; swarmN = 0;
      demo.n++; demo.fail = demo.n % 3 === 0;
    }
    silent = true;
    var danger = swarm && swarm.phase !== 'retreat' && (swarm.phase === 'sweep' || swarm.t > 0.2);
    holding = demo.fail ? true : !danger;
    if (demo.fail && stings >= 1) stings = 0;
    demo.press = holding;
    demo.gx = W / 2 + Math.sin(demo.t * 2) * 20; demo.gy = holding ? H * 0.89 : H * 0.84;
    stepWorld(dt);
    silent = false;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function () {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    holding = true;
    if (swarm && swarm.phase === 'sweep') game.audio.tone('B2', 0.1, { wave: 'square', volume: 0.1 });
    else game.audio.play('se_tap', 0.35);
    game.fx.burst(W / 2, H * 0.89, { color: COL.paint, count: 6, speed: 180 });
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !holding) return;
    holding = false;
    game.audio.tone(swarm ? 'G4' : 'D4', 0.06, { wave: 'triangle', volume: 0.08 });
    game.fx.burst(W / 2, H * 0.89, { color: COL.cream, count: 4, speed: 120 });
  });

  // ── ループ(唯一の onUpdate) ───────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (plank === undefined) initGame();
      stepDemo(dt);
      if (finished && hitStop > 0) hitStop -= dt;
      drawScene(); drawFence(); drawPainter(); drawSwarm(); drawThumb(); drawFrame();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      write(GAME_TITLE, W / 2, H * 0.08, 76, COL.paint);
      write('HI-SCORE ' + (game.best || 0), W / 2, H * 0.13, 34, COL.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.965, 44, COL.gold);
      else write('INSERT COIN', W / 2, H * 0.965, 36, COL.cream);
      return;
    }

    if (state === S.RESULT) {
      drawScene(); drawFence(); drawThumb(); drawFrame();
      var sc = plank * 100 + dodged * 50 + (ok ? Math.round(timeLeft * 30) : 0);
      write(ok ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.09, 96, ok ? COL.good : COL.bad);
      write(plank + ' / ' + NEEDED, W / 2, H * 0.15, 52, COL.ink);
      write('SCORE ' + sc, W / 2, H * 0.2, 44, COL.ink);
      if (ok && sc > (game.best || 0)) write('NEW RECORD', W / 2, H * 0.245, 44, COL.gold);
      else write('BEST ' + (game.best || 0), W / 2, H * 0.245, 36, COL.ink);
      if (!ok) write('あと' + (NEEDED - plank) + '枚!', W / 2, H * 0.76, 64, COL.bad);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.965, 38, COL.cream);
      return;
    }

    holding = game.input.pressing && ready <= 0 && !finished;
    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.feedback.good(hl.x, hl.y, { text: 'CLEAR', color: COL.gold, count: 24 }); game.audio.play('se_success', 0.6); }
          else { game.feedback.bad(hl.x, hl.y, { text: 'MISS' }); game.audio.play('se_failure', 0.5); }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { planks: plank, needed: NEEDED, dodged: dodged, stings: stings };
          if (ok) game.end.success(plank * 100 + dodged * 50 + Math.round(timeLeft * 30), stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; finishRound(false, painterX(), FENCE_Y + FENCE_H / 2); }
      else stepWorld(dt);
    }

    drawScene(); drawFence(); drawPainter(); drawSwarm(); drawThumb(); drawHud(); drawFrame();
    if (finished) drawHighlight(dt);
    if (ready > 0) write(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 110, COL.paint);
  });

  game.onStart(function () {
    game.audio.melody([['G4', 0.5], ['B4', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['B4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 1]],
      { tempo: 118, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
