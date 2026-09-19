// GH-DS-0016-arc-shot-trajectory.js
// アークショットトラジェクトリ — 揺れる二つのゲージが合った瞬間にタップし、山越えの一発を放つ
// 操作: 高さゲージと飛距離ゲージが同時に良い値になった瞬間にタップして発射
// 終わり: 3発の合計得点が目標以上ならクリア。届かなければゲームオーバー
// @mechanic: trajectory
// @theme: hilltop_mortar_range
// 世界観: 丘の砲兵陣地。高さと距離、二つの揺れを同時に読み切って、丘向こうの的へ一発を落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 3発合計スコア
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 70s MONO: 白ドット + カラーセロハンの帯、白 + 帯の単色
  var STYLE = {
    bg: ['#141414', '#020202'],
    main: ['#f0f0f0', '#f0f0f0', '#f0f0f0'],
    accent: ['#ffbe3d', '#ff4d4d'],
  };
  var C = {
    bgTop: STYLE.bg[0], bgBot: STYLE.bg[1], ground: '#3a3a3a', wall: '#5a5a5a', wallDark: '#2a2a2a',
    shell: STYLE.main[0], gold: STYLE.accent[0], bad: STYLE.accent[1], good: '#f0f0f0',
    white: '#f0f0f0', ink: '#050505',
  };

  var GAME_TITLE = 'ARC SHOT TRAJECTORY';
  var SHOTS_TOTAL = 3;
  var SCORE_TARGET = 35;
  var LP = { x: W * 0.18, y: H * 0.66 };
  var WALL_X = W * 0.5, WALL_TOP_Y = H * 0.525, WALL_W = 44;
  var TARGET_CX = LP.x + 700, TARGET_HALF = 90;
  var MIN_RANGE = 220, MAX_RANGE = 980;
  var MIN_ARC = 70, MAX_ARC = 430;
  var FLIGHT_TIME = 0.8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var shotIdx, totalScore, freqA, freqB, shell, resultText, resultTextT, warned;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SHELL_SPRITE = ['.#.', '###', '.#.'];
  var TURRET_F = [
    ['..##..', '.####.', '######'],
    ['..##..', '.####.', '######'],
  ];

  function gaugeAngle(t) { return 0.5 + 0.5 * Math.sin(t * freqA); }
  function gaugePower(t) { return 0.5 + 0.5 * Math.sin(t * freqB + 1.1); }

  function computeShot(a, p) {
    var range = MIN_RANGE + p * (MAX_RANGE - MIN_RANGE);
    var peak = MIN_ARC + a * (MAX_ARC - MIN_ARC);
    var xw = WALL_X - LP.x;
    var short = range < xw;
    var yAtWall = LP.y - 4 * peak * (xw / range) * (1 - xw / range);
    var cleared = !short && yAtWall <= WALL_TOP_Y;
    var landX = LP.x + range;
    return { range: range, peak: peak, short: short, cleared: cleared, landX: landX, xw: xw, yAtWall: yAtWall };
  }
  function pathY(x0, range, peak, x) {
    var f = (x - x0) / range;
    return LP.y - 4 * peak * f * (1 - f);
  }

  function startShot() {
    shell = null; resultText = ''; resultTextT = 0; warned = false;
  }

  function initGame() {
    shotIdx = 0; totalScore = 0; freqA = 2.1; freqB = 1.6; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    startShot();
  }

  var runClock = 0;
  // ── 共有ロジック(実演でも本編でもこの関数群を使う) ──────────────────
  function fireShot() {
    if (shell) return;
    var a = gaugeAngle(runClock), p = gaugePower(runClock);
    var res = computeShot(a, p);
    shell = { t: 0, res: res, x0: LP.x };
    game.audio.play('se_jump', 0.5);
  }
  function updateShell(dt) {
    if (!shell) return;
    shell.t += dt;
    var frac = Math.min(1, shell.t / FLIGHT_TIME);
    var endX = shell.res.cleared ? shell.res.landX : (shell.res.short ? LP.x + shell.res.range : WALL_X);
    shell.x = LP.x + (endX - LP.x) * frac;
    shell.y = shell.res.short ? LP.y - Math.sin(frac * Math.PI) * 40 : pathY(LP.x, shell.res.range, shell.res.peak, shell.x);
    var remaining = FLIGHT_TIME - shell.t;
    if (!warned && remaining <= 0.4 && !shell.res.cleared) {
      warned = true;
      game.audio.tone(190, 0.1, { wave: 'square', volume: 0.16, slide: -50 });
    }
    if (frac >= 1) resolveShot();
  }
  function resolveShot() {
    var res = shell.res;
    var gained = 0, label = '';
    if (res.short) {
      label = 'SHORT';
      game.feedback.bad(shell.x, shell.y, { text: 'SHORT' });
      shake = 0.16; hitStop = 0.12;
    } else if (!res.cleared) {
      label = 'WALL';
      game.feedback.bad(WALL_X, WALL_TOP_Y + 40, { text: 'WALL' });
      game.fx.burst(WALL_X, WALL_TOP_Y + 40, { color: C.bad, count: 16, speed: 340 });
      shake = 0.2; hitStop = 0.16;
    } else {
      var offset = Math.abs(res.landX - TARGET_CX);
      if (offset <= 40) { gained = 30; label = 'PERFECT'; }
      else if (offset <= TARGET_HALF) { gained = 15; label = 'GOOD'; }
      else { label = 'MISS'; }
      if (gained > 0) {
        game.feedback.good(res.landX, LP.y, { text: label, color: label === 'PERFECT' ? C.gold : C.good });
        game.fx.burst(res.landX, LP.y, { color: C.gold, count: 18, speed: 360 });
        hitStop = 0.15;
      } else {
        game.feedback.bad(res.landX, LP.y, { text: 'MISS' });
        hitStop = 0.1;
      }
    }
    totalScore += gained;
    resultText = label + (gained > 0 ? ' +' + gained : ''); resultTextT = 1.0;
    shell.done = true;
    if (shotIdx === 1 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('SUBTOTAL ' + totalScore, W / 2, H * 0.16, { color: C.white, size: 36 });
      game.audio.play('se_milestone', 0.35);
    }
  }
  function afterShot() {
    shotIdx++;
    freqA += 0.25; freqB += 0.2;
    if (shotIdx >= SHOTS_TOTAL) { ok = totalScore >= SCORE_TARGET; finish(); }
    else startShot();
  }

  function tapInput() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; runClock = 0; initGame(); demo.t = 0; demo.press = false; return; }
    if (done || ready > 0 || hitStop > 0 || shell) return;
    fireShot();
  }
  game.onTap(function(x, y) { game.audio.play('se_tap', 0.15); tapInput(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  // ── ATTRACT ゴースト実演: fireShot/updateShell を本編と共有 ──
  var demo = { t: 0, gx: LP.x, gy: LP.y - 60, press: false, subT: 0, cycle: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    runClock += dt;
    if (shotIdx === undefined) initGame();
    demo.gx = LP.x; demo.gy = LP.y - 60;
    if (!shell) {
      demo.subT -= dt;
      var goodTiming = demo.cycle % 2 === 0;
      var a = gaugeAngle(runClock), p = gaugePower(runClock);
      var wantHit = goodTiming ? Math.abs(a - 0.6) < 0.06 && Math.abs(p - 0.55) < 0.06 : (demo.subT <= -1.4);
      demo.press = false;
      if (wantHit) { demo.press = true; fireShot(); }
    } else {
      updateShell(dt);
      demo.gx = shell.x; demo.gy = shell.y;
      demo.press = false;
      if (shell.done) {
        demo.subT -= dt;
        if (demo.subT < -0.6) { startShot(); demo.subT = 0; demo.cycle++; }
      }
    }
  }

  function scene() {
    game.draw.gradient(0, H, [[0, C.bgTop], [1, C.bgBot]]);
    game.draw.rect(0, LP.y, W, H - LP.y, C.ground);
    game.draw.rect(WALL_X - WALL_W / 2, WALL_TOP_Y, WALL_W, LP.y - WALL_TOP_Y, C.wallDark);
    game.draw.rect(WALL_X - WALL_W / 2 + 6, WALL_TOP_Y, WALL_W - 12, LP.y - WALL_TOP_Y, C.wall);
    game.draw.rect(TARGET_CX - TARGET_HALF, LP.y - 10, TARGET_HALF * 2, 14, C.accent0());
  }
  C.accent0 = function() { return '#ffbe3d55'; };

  function drawGauges(a, p) {
    var gx = W * 0.5, gy1 = H * 0.86, gy2 = H * 0.90;
    game.draw.rect(gx - 300, gy1, 600, 16, '#00000055');
    game.draw.rect(gx - 300 + 600 * a - 4, gy1 - 3, 8, 22, C.gold);
    game.draw.rect(gx - 300, gy2, 600, 16, '#00000055');
    game.draw.rect(gx - 300 + 600 * p - 4, gy2 - 3, 8, 22, C.good);
  }

  function drawTurret() {
    var f = Math.floor(game.time.elapsed * 3) % 2;
    game.draw.sprite(TURRET_F[f], { '#': C.shell }, LP.x, LP.y - 30, 12, { anchor: 'center' });
  }

  function drawShell(x, y) {
    game.draw.circle(x, LP.y + 4, 14, '#00000030');
    game.draw.sprite(SHELL_SPRITE, { '#': C.shell }, x, y, 10, { anchor: 'center' });
  }

  function drawWarn() {
    if (!shell || !warned || shell.res.cleared) return;
    var flash = Math.floor(game.time.elapsed * 14) % 2 === 0;
    if (!flash) return;
    if (shell.res.short) game.draw.circle(shell.x, LP.y, 30, C.bad, 0.6);
    else game.draw.rect(WALL_X - WALL_W / 2 - 10, WALL_TOP_Y - 10, WALL_W + 20, LP.y - WALL_TOP_Y + 10, C.bad, 0.35);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      scene();
      stepDemo(dt);
      var a = gaugeAngle(runClock), p = gaugePower(runClock);
      drawWarn();
      drawTurret();
      drawShell(shell ? shell.x : LP.x, shell ? shell.y : LP.y - 60);
      drawGauges(a, p);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 15 });
      if (resultTextT > 0) txt(resultText, W / 2, H * 0.40, 42, resultText.indexOf('MISS') >= 0 || resultText.indexOf('WALL') >= 0 || resultText.indexOf('SHORT') >= 0 ? C.bad : C.gold);
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.115, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      scene(); drawTurret(); drawShell(LP.x, LP.y - 60);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt('SCORE ' + totalScore + ' / ' + SCORE_TARGET, W / 2, H * 0.13, 30, C.white);
      txt('BEST ' + Math.max(game.best, totalScore), W / 2, H * 0.17, 26, C.gold);
      if (!ok && totalScore >= SCORE_TARGET - 10) txt('あと' + (SCORE_TARGET - totalScore) + '点!', W / 2, H * 0.21, 26, C.white);
      if (totalScore > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.24, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { score: totalScore, target: SCORE_TARGET };
        if (ok) game.end.success(totalScore, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      runClock += dt;
      if (shell && !shell.done) updateShell(dt);
      else if (shell && shell.done) {
        resultTextT -= dt;
        if (resultTextT <= 0.15) afterShot();
      }
    }
    if (shake > 0) shake -= dt;

    scene();
    var av = gaugeAngle(runClock), pv = gaugePower(runClock);
    drawWarn();
    drawTurret();
    drawShell(shell ? shell.x : LP.x, shell ? shell.y : LP.y - 60);
    if (!shell) drawGauges(av, pv);
    if (resultTextT > 0) txt(resultText, W / 2, H * 0.40, 44, resultText.indexOf('MISS') >= 0 || resultText.indexOf('WALL') >= 0 || resultText.indexOf('SHORT') >= 0 ? C.bad : C.gold);

    txt('SHOT ' + (shotIdx + 1) + ' / ' + SHOTS_TOTAL, W / 2, H * 0.06, 28, C.white);
    txt(totalScore + ' / ' + SCORE_TARGET, W / 2, H * 0.10, 24, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E3', 0.4], ['G3', 0.4], ['B3', 0.4], ['R', 0.3],
      ['E3', 0.4], ['G3', 0.4],
    ], { tempo: 100, wave: 'square', volume: 0.06, loop: true, bass: [['E2', 1], ['B1', 1]] });
    state = S.ATTRACT;
    runClock = 0;
    initGame();
  });
})(game);
