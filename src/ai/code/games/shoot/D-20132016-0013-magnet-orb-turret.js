// D-20132016-0013-magnet-orb-turret.js
// マグネットオーブ — 磁力を帯びたオーブをスライドする発射台から撃ち上げ、同色を3つ以上まとめて割る
// 操作: 天井の色クラスターの下まで発射台をタップで動かし、色が合った瞬間にタップで撃ち上げる
// 終わり: 天井のオーブを規定数割り落とせば成功。オーブが台まで迫れば失敗
// @mechanic: aim_shoot
// @theme: orbital_magnet_forge
// 世界観: 浮遊する鉱石の鍛造炉。天井に磁力で貼り付いたオーブの塊を、動く発射台から同色を狙い撃ちして崩し降ろす
// 残るもの: 正誤(CLEAR/GAME OVER) + 割ったオーブ数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい背景、光の柱と祝祭演出
  var C = {
    bg1: '#1a2a6c', bg2: '#0d1440', beam: '#ffffff', ring: '#ffcc33',
    c1: '#ff4d6d', c2: '#3dd9ff', c3: '#ffd93d', c4: '#5cff7a',
    good: '#5cff7a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#0a0a1a',
  };
  var COLORS = [C.c1, C.c2, C.c3, C.c4];

  var GAME_TITLE = 'MAGNET ORB';
  var TARGET_POPS = 5; // 割るクラスター数
  var MAX_TIME = 18;
  var NEEDED = 5;
  var COLS = 5;
  var GX0 = W * 0.5 - (COLS - 1) * (W * 0.16) / 2;
  var CEIL_Y = H * 0.24;
  var LAUNCH_Y = H * 0.80;
  var DANGER_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var grid, turretCol, popped, timeLeft, shots, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function colX(c) { return GX0 + c * (W * 0.16); }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < COLS; i++) game.draw.rect(colX(i) - 30, 0, 60, H, C.beam, 0.04);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.circle(W * 0.5, CEIL_Y - 60, 220, C.ring, 0.10);
  }

  function newGrid() {
    var g = [];
    for (var c = 0; c < COLS; c++) {
      var rows = 1 + Math.floor(game.random(0, 2)); // 1〜2段
      var col = [];
      for (var r = 0; r < rows; r++) col.push(Math.floor(game.random(0, COLORS.length)));
      g.push(col);
    }
    // 補正: 少なくとも1列は3個以上同色クラスターが作れるように揃える
    var target = Math.floor(game.random(0, COLORS.length));
    g[Math.floor(game.random(0, COLS))] = [target, target];
    return g;
  }

  function initGame() {
    grid = newGrid(); turretCol = Math.floor(COLS / 2); popped = 0; timeLeft = MAX_TIME; shots = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawOrb(c, r, alpha) {
    var y = CEIL_Y + r * 70;
    game.draw.circle(colX(c), y, 46, grid[c] && grid[c][r] !== undefined ? COLORS[grid[c][r]] : '#000', alpha === undefined ? 1 : alpha);
    game.draw.circle(colX(c), y, 46, '#ffffff33');
  }

  function drawTurret() {
    var x = colX(turretCol);
    var sway = Math.sin(game.time.elapsed * 2.4) * 4;
    game.draw.rect(x - 44 + sway, LAUNCH_Y - 10, 88, 30, C.gold);
    game.draw.sprite(['.##.', '####', '.##.'], { '#': C.white }, x + sway, LAUNCH_Y - 40, 12, { anchor: 'center' });
  }

  function currentColAt(c) {
    var col = grid[c];
    return col && col.length ? col[col.length - 1] : -1;
  }

  function fire(px, py) {
    if (done || finished || ready > 0) return;
    var target = currentColAt(turretCol);
    shots++;
    if (target < 0) {
      game.feedback.bad(px, py, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      return;
    }
    var col = grid[turretCol];
    var count = 0;
    for (var i = col.length - 1; i >= 0; i--) { if (col[i] === target) count++; else break; }
    if (count >= 2) {
      // 3つ以上まとめて割る(発射分+既存2以上)
      col.length = col.length - count;
      popped += count;
      hitStop = 0.12;
      game.feedback.good(px, py, { text: 'GOOD', color: C.good });
      game.fx.burst(colX(turretCol), CEIL_Y + col.length * 70, { color: COLORS[target], count: 20, speed: 360 });
      game.audio.play('se_break', 0.5);
      if (popped >= Math.ceil(TARGET_POPS / 2)) { game.fx.popup(popped + ' / ' + TARGET_POPS, W * 0.5, H * 0.45, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (popped >= TARGET_POPS) { ok = true; finished = true; game.audio.play('se_powerup', 0.5); finish(); return; }
    } else {
      game.feedback.bad(px, py, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      shake = 0.12;
    }
    // 磁力で天井が少し降りてくる(時間圧)
    timeLeft -= 0.4;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || done || finished || ready > 0) return;
    var nearest = 0, best = 1e9;
    for (var c = 0; c < COLS; c++) { var d = Math.abs(x - colX(c)); if (d < best) { best = d; nearest = c; } }
    if (y > H * 0.7) {
      turretCol = nearest;
      game.audio.play('se_tap', 0.08);
    } else {
      fire(x, y);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function ceilingDescend() {
    // 危険: 時間が減るほど CEIL_Y が下がる(telegraph: 残り3秒未満で点滅)
    var prog = 1 - Math.max(0, timeLeft) / MAX_TIME;
    return H * 0.24 + prog * (H * 0.16);
  }

  var demo = { t: 0, gx: colX(2), gy: LAUNCH_Y - 40, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var target = -1, tc = turretCol;
    for (var c = 0; c < COLS; c++) { var col = grid[c]; if (col && col.length >= 2 && col[col.length - 1] === col[col.length - 2]) { tc = c; target = col[col.length - 1]; break; } }
    demo.gx = colX(tc); demo.gy = LAUNCH_Y - 40;
    turretCol = tc;
    var phase = cyc % 1.7;
    demo.press = phase > 1.0 && phase < 1.25;
    if (phase > 1.0 && phase < 1.0 + dt * 1.5 && target >= 0 && !done && !finished) fire(demo.gx, LAUNCH_Y);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var c0 = 0; c0 < COLS; c0++) for (var r0 = 0; r0 < (grid[c0] ? grid[c0].length : 0); r0++) drawOrb(c0, r0);
      drawTurret();
      game.draw.hand(demo.gx, demo.gy + 60, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var c1 = 0; c1 < COLS; c1++) for (var r1 = 0; r1 < (grid[c1] ? grid[c1].length : 0); r1++) drawOrb(c1, r1);
      drawTurret();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(popped + ' / ' + TARGET_POPS, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TARGET_POPS - popped) + '個!', W / 2, H * 0.16, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(popped, { popped: popped, shots: shots });
        else game.end.failure({ popped: popped, shots: shots });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      var cy = ceilingDescend();
      if (cy >= DANGER_Y || timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.35;
        game.feedback.bad(W * 0.5, DANGER_Y, { text: 'MISS' });
        shake = 0.3;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    CEIL_Y = ceilingDescend();
    var danger = (H * 0.24 + (H * 0.16) * 0.75) <= CEIL_Y;
    if (danger && Math.floor(game.time.elapsed * 6) % 2 === 0) game.draw.line(0, DANGER_Y, W, DANGER_Y, C.bad, 4);
    for (var c2 = 0; c2 < COLS; c2++) for (var r2 = 0; r2 < (grid[c2] ? grid[c2].length : 0); r2++) drawOrb(c2, r2);
    drawTurret();

    txt(popped + ' / ' + TARGET_POPS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (timeLeft / MAX_TIME), 16, timeLeft < 3 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['C5', 0.3], ['G4', 0.3]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    CEIL_Y = H * 0.24;
    initGame();
  });
})(game);
