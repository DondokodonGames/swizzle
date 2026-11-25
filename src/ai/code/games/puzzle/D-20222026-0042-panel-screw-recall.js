// D-20222026-0042-panel-screw-recall.js
// パネルスクリューリコール — 光った順番を目に焼き付け、色分けされたねじを同じ順に引き抜いて板を外す
// 操作: 光る順番をよく見て覚え、同じ順にねじをタップして引き抜く
// 終わり: 順番通りに全て引き抜けば成功。順番を間違える/時間切れは失敗
// @mechanic: memory_sequence
// @theme: panel_screw_recall
// 世界観: 分解整備を任された整備士が、光って見せる順番を焼き付け、色分けされたねじを同じ順に引き抜いて板を外す
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き抜いた数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg: '#1c2438', bg2: '#0e1220', panel: '#3a4460', panelDk: '#242c44',
    s0: '#ff5a5a', s1: '#5ad0ff', s2: '#ffd24d', s3: '#8affa0', s4: '#c88aff',
    good: '#8ac878', bad: '#ff4d5e', gold: '#ffd24d', ink: '#eef2ff',
  };
  var SCOL = [C.s0, C.s1, C.s2, C.s3, C.s4];

  var GAME_TITLE = 'SCREW RECALL';
  var MAX_TIME = 16;
  var N = 5;
  var SHOW_GAP = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#080a12', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SCREW_S = ['.##.', '####', '.##.'];
  var MECH_S = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.1);
    game.draw.sprite(MECH_S, { '#': '#8a94b0' }, W * 0.5, H * 0.16, 14, { anchor: 'center' });
  }

  var CX = W * 0.5, CY = H * 0.46, RING_R = 300;
  function screwPos(i) {
    var ang = -Math.PI / 2 + (i / N) * Math.PI * 2;
    return { x: CX + Math.cos(ang) * RING_R, y: CY + Math.sin(ang) * RING_R * 0.72 };
  }

  var order, removed, phase, phaseT, showIdx, flashT, inputIdx, roundClock;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    order = [0, 1, 2, 3, 4].sort(function() { return Math.random() - 0.5; });
    removed = []; phase = 'show'; phaseT = 0; showIdx = 0; flashT = 0; inputIdx = 0; roundClock = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    bg();
    game.draw.circle(CX, CY, 150, C.panelDk);
    game.draw.circle(CX, CY, 100, C.panel);
    for (var i = 0; i < N; i++) {
      if (removed.indexOf(i) >= 0) continue;
      var p = screwPos(i);
      var isFlash = phase === 'show' && order[showIdx] === i && flashT > 0;
      var glow = isFlash ? 0.5 + 0.4 * Math.sin(game.time.elapsed * 14) : 0;
      if (glow > 0) game.draw.circle(p.x, p.y, 50, '#ffffff', glow);
      game.draw.circle(p.x, p.y, 36, SCOL[i]);
      game.draw.sprite(SCREW_S, { '#': '#1c2438' }, p.x, p.y, 8, { anchor: 'center' });
    }
  }

  function tickShow(dt) {
    phaseT += dt;
    flashT = SHOW_GAP * 0.6 - (phaseT % SHOW_GAP);
    if (phaseT >= SHOW_GAP) {
      phaseT = 0;
      game.audio.play('se_tap', 0.2);
      showIdx += 1;
      if (showIdx >= N) { phase = 'input'; inputIdx = 0; game.audio.play('se_powerup', 0.3); }
    }
  }

  function tapScrew(x, y) {
    if (phase !== 'input') return;
    var hitI = -1;
    for (var i = 0; i < N; i++) {
      if (removed.indexOf(i) >= 0) continue;
      var p = screwPos(i);
      if (Math.hypot(x - p.x, y - p.y) < 60) { hitI = i; break; }
    }
    if (hitI < 0) { game.audio.play('se_tap', 0.1); return; }
    if (hitI !== order[inputIdx]) {
      finished = true; ok = false; hitStop = 0.35; shake = 0.3;
      var pp = screwPos(hitI);
      game.feedback.bad(pp.x, pp.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    removed.push(hitI);
    var pos = screwPos(hitI);
    game.feedback.good(pos.x, pos.y, { text: 'GOOD', color: C.good });
    game.fx.burst(pos.x, pos.y, { color: SCOL[hitI], count: 16, speed: 320 });
    game.audio.play('se_good', 0.4);
    inputIdx += 1;
    if (inputIdx === Math.ceil(N * 0.5)) {
      game.fx.popup('NICE', CX, CY - 220, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    if (inputIdx >= N) {
      finished = true; ok = true; hitStop = 0.3;
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) tapScrew(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (phase === 'show') { tickShow(dt); demo.gx = CX; demo.gy = CY - 260; demo.press = false; }
    else if (phase === 'input' && inputIdx < N) {
      var p = screwPos(order[inputIdx]);
      demo.gx = p.x; demo.gy = p.y;
      demo.press = Math.floor(cyc * 3) % 3 === 0;
      if (demo.press && Math.random() < 0.5 && !finished) tapScrew(p.x, p.y);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (order === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 34, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 42, ok ? C.good : C.bad);
      txt(removed.length + ' / ' + N, W / 2, H * 0.14, 24, C.gold);
      if (!ok) txt('あと' + Math.max(1, N - removed.length) + '本!', W / 2, H * 0.18, 20, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(removed.length, { removed: removed.length, needed: N });
        else game.end.failure({ removed: removed.length, needed: N });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (phase === 'show') tickShow(dt);
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(removed.length + ' / ' + N, W / 2, H * 0.06, 26, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.panelDk, 0.6);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 48, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 130, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
