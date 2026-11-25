// D-20132016-0017-glade-hopper-dash.js
// グレードホッパー — 森を自動で駆ける小さな生き物を、開いた光の門の間だけタップして跳ばせる
// 操作: 根っこの障害物の手前で光る門が開いた瞬間にタップしてジャンプさせる
// 終わり: 規定数の門を全て正しい窓でジャンプできれば成功。窓を外すか間に合わなければ失敗
// @mechanic: timing_window
// @theme: forest_glade_courier
// 世界観: 光る森の小道を駆ける伝令の小さな生き物。根っこの前で開く光の門を見極め、正しい窓でジャンプして届け物を運びきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳び越えた門数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var C = {
    sky1: '#bdeb9a', sky2: '#5fae5a', trunk: '#4a3320', leaf: '#3f8f3a', leafDark: '#2c6b2a',
    root: '#5a4022', gateOpen: '#8dffb0', gateClosed: '#3a4a3a', gateWarn: '#ffdd55',
    good: '#37d97a', bad: '#ff3d5a', gold: '#ffcc33', white: '#123014', ink: '#e8ffe0',
  };

  var GAME_TITLE = 'GLADE HOPPER';
  var TOTAL = 6;
  var CX = W * 0.5;
  var GROUND_Y = H * 0.72;
  var GATE_Y = H * 0.50;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, done, endWait, finished;
  var ready, hitStop, shake, round, gate, jumpT, jumping;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#123014', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    for (var i = 0; i < 6; i++) {
      var x = (i * 190 + Math.sin(game.time.elapsed * 0.4 + i) * 8) % W;
      game.draw.circle(x, H * 0.12 + (i % 3) * 40, 60, C.leaf, 0.5);
      game.draw.circle(x + 30, H * 0.12 + (i % 3) * 40, 44, C.leafDark, 0.5);
    }
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#2c4a20');
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  // 窓の開閉タイムライン: 0..dur。open=[o0,o1] が正解窓、外はミス
  function newGate() {
    var dur = Math.max(1.2, 2.0 - round * 0.1);
    return { t: 0, dur: dur, o0: dur * 0.52, o1: dur * 0.78, resolved: false };
  }

  function initGame() {
    cleared = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; gate = newGate(); jumpT = 0; jumping = false;
  }

  function drawCreature(jumpH) {
    var bob = jumping ? 0 : Math.sin(game.time.elapsed * 5) * 4;
    var y = GROUND_Y - 20 - jumpH - bob;
    var frame = Math.floor(game.time.elapsed * 4) % 2 === 0 ? ['.##.', '####', '.##.', '#.#.'] : ['.##.', '####', '.##.', '.#.#'];
    game.draw.circle(CX, GROUND_Y - 4, 28, '#00000025');
    game.draw.sprite(frame, { '#': C.gold }, CX, y, 15, { anchor: 'center' });
  }

  function drawGate(g) {
    var p = g.t / g.dur;
    var openNow = p >= g.o0 / g.dur && p <= g.o1 / g.dur;
    var soon = p >= (g.o0 / g.dur - 0.22) && p < g.o0 / g.dur;
    var col = openNow ? C.gateOpen : (soon ? C.gateWarn : C.gateClosed);
    var blinkA = soon ? (0.5 + 0.5 * Math.sin(game.time.elapsed * 14)) : 1;
    game.draw.rect(CX - 90, GATE_Y - 130, 22, 260, col, blinkA);
    game.draw.rect(CX + 68, GATE_Y - 130, 22, 260, col, blinkA);
    game.draw.rect(CX - 90, GATE_Y - 140, 180, 18, col, blinkA);
    game.draw.rect(CX - 60, GROUND_Y - 18, 120, 20, C.root);
  }

  function attemptJump() {
    if (done || finished || ready > 0 || jumping) return;
    var p = gate.t / gate.dur;
    var openNow = p >= gate.o0 / gate.dur && p <= gate.o1 / gate.dur;
    if (openNow && !gate.resolved) {
      gate.resolved = true;
      jumping = true; jumpT = 0.5;
      hitStop = 0.06;
      game.feedback.good(CX, GATE_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_jump', 0.5);
      cleared++;
      if (cleared === Math.ceil(TOTAL / 2)) { game.fx.popup(cleared + ' / ' + TOTAL, CX, H * 0.3, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (cleared >= TOTAL) { ok = true; finished = true; game.audio.play('se_success', 0.5); finish(); return; }
      round++;
      gate = newGate();
    } else if (!gate.resolved) {
      gate.resolved = true;
      hitStop = 0.35;
      game.feedback.bad(CX, GATE_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.05);
    attemptJump();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: GATE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!gate) { gate = newGate(); round = 0; }
    if (!jumping) gate.t += dt;
    var p = gate.t / gate.dur;
    var mid = (gate.o0 + gate.o1) / 2 / gate.dur;
    demo.press = p > mid - 0.06 && p < mid + 0.06;
    if (demo.press && !gate.resolved) attemptJump();
    if (jumping) {
      jumpT -= dt;
      if (jumpT <= 0) jumping = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cleared === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGate(gate);
      var jh = jumping ? Math.sin((0.5 - Math.max(0, jumpT)) / 0.5 * Math.PI) * 170 : 0;
      drawCreature(jh);
      game.draw.hand(demo.gx, demo.gy + 260, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 24, '#123014');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.white);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, '#123014');
      return;
    }

    if (state === S.RESULT) {
      bg(); drawCreature(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.11, 28, C.white);
      if (!ok) txt('あと' + (TOTAL - cleared) + '本!', W / 2, H * 0.16, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL });
        else game.end.failure({ cleared: cleared, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (jumping) {
        jumpT -= dt;
        if (jumpT <= 0) jumping = false;
      } else {
        gate.t += dt;
        if (gate.t >= gate.dur && !gate.resolved) {
          gate.resolved = true;
          hitStop = 0.35;
          game.feedback.bad(CX, GATE_Y, { text: 'MISS' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawGate(gate);
    var jh2 = jumping ? Math.sin((0.5 - Math.max(0, jumpT)) / 0.5 * Math.PI) * 170 : 0;
    drawCreature(jh2);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000030');
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['C6', 0.5]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
