// K-DS-0038-busker-finger-snap.js
// バスカースナップ — 一定のビートに合わせて指を鳴らす動作を繰り返す
// 終わり: 規定回数(8回)開閉窓の中でタップし続ければ成功。3回窓を外せば失敗
// 操作: 光る輪が縮んで基準サイズに重なった瞬間にタップして指を鳴らす
// @mechanic: timing_window
// @theme: street_busker_finger_snap
// 世界観: 街角のジャズバスカーが、バンドの一定ビートを指を鳴らしてキープし続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + キープできた拍数と外した回数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒背景に細い発光ラインのみ、塗りはほぼ無し
  var C = {
    bg: '#0a0a0e', line: '#ff8a3d', line2: '#3dd6ff', ring: '#ffcf6a',
    good: '#3dd6ff', bad: '#ff3d5a', gold: '#ffcf6a', white: '#f0f0f5', ink: '#050506',
  };

  var GAME_TITLE = 'FINGER SNAP';
  var TOTAL = 8;
  var MAX_MISS = 3;
  var CX = W * 0.5, CY = H * 0.5;
  var BASE_R = 130;
  var PERIOD = 0.95;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var kept, misses, done, endWait, finished;
  var ready, hitStop, shake;
  var cycleT, resolvedThis, snapT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HAND_OPEN = ['#.#.#', '#.#.#', '#####', '..#..'];
  var HAND_SNAP = ['.....', '..#..', '#####', '..#..'];

  function streetBg() {
    game.draw.gradient(0, H, [[0, '#120a1a'], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.line(120 + i * 170, H * 0.08, 120 + i * 170, H * 0.9, '#ffffff08', 2);
    game.draw.line(0, H * 0.82, W, H * 0.82, C.line, 3);
  }

  function ringR(t) {
    // ring shrinks from big to BASE_R across each period, snapping back after
    var p = (t % PERIOD) / PERIOD;
    return BASE_R + (1 - p) * 240;
  }

  function initGame() {
    kept = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    cycleT = 0; resolvedThis = false; snapT = 0;
  }

  function resolveTap() {
    if (ready > 0 || done || finished || resolvedThis) return;
    var r = ringR(cycleT);
    var diff = Math.abs(r - BASE_R);
    snapT = 0.12;
    if (diff < 34) {
      resolvedThis = true; kept++;
      hitStop = 0.06;
      game.feedback.good(CX, CY, { text: diff < 14 ? 'PERFECT' : 'GOOD', color: C.good });
      game.fx.burst(CX, CY, { color: C.line2, count: 10, speed: 240 });
      game.audio.play('se_good', 0.3);
      if (kept === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, H * 0.28, { color: C.gold, size: 38 });
      if (kept >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      misses++;
      hitStop = 0.12;
      shake = 0.12;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      resolvedThis = true;
      if (misses >= MAX_MISS) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    resolveTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { kept = 0; }
    cycleT = cyc;
    var r = ringR(cycleT);
    var p = (cycleT % PERIOD) / PERIOD;
    if (p < dt / PERIOD * 1.2 && p >= 0) {
      // fresh cycle start; nothing special
    }
    if (Math.abs(r - BASE_R) < 10 && snapT <= 0) {
      snapT = 0.12; demo.press = true;
      game.feedback.good(CX, CY, { text: 'PERFECT', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (snapT > 0) { snapT -= dt; } else { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cycleT === undefined) initGame();
      streetBg();
      stepDemo(dt);
      var r1 = ringR(cycleT);
      game.draw.circle(CX, CY, BASE_R, C.ring, 0.5);
      game.draw.circle(CX, CY, r1, snapT > 0 ? C.line2 : C.line, 1);
      game.draw.sprite(snapT > 0 ? HAND_SNAP : HAND_OPEN, { '#': C.white }, CX, CY + 260, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      streetBg();
      game.draw.circle(CX, CY, BASE_R, C.ring, 0.5);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(kept + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - kept) + '拍!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(kept, { kept: kept, misses: misses, total: TOTAL });
        else game.end.failure({ kept: kept, misses: misses, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var prevCyc = cycleT % PERIOD;
      cycleT += dt;
      var newCyc = cycleT % PERIOD;
      if (newCyc < prevCyc) {
        // period wrapped: if not resolved this cycle, count as miss
        if (!resolvedThis) {
          misses++;
          game.feedback.bad(CX, CY, { text: 'MISS' });
          shake = 0.1;
          game.audio.play('se_bad', 0.25);
          if (misses >= MAX_MISS) { ok = false; finished = true; finish(); }
        }
        resolvedThis = false;
      }
    }
    if (snapT > 0) snapT -= dt;
    if (shake > 0) shake -= dt;

    streetBg();
    if (!finished) {
      var r2 = ringR(cycleT);
      game.draw.circle(CX, CY, BASE_R, C.ring, 0.5);
      game.draw.circle(CX, CY, r2, snapT > 0 ? C.line2 : C.line, 1);
    }
    game.draw.sprite(snapT > 0 ? HAND_SNAP : HAND_OPEN, { '#': C.white }, CX, CY + 260, 20, { anchor: 'center' });

    txt(kept + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    for (var k = 0; k < MAX_MISS; k++) {
      game.draw.circle(W - 90 - k * 44, 158, 12, k < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3]], { tempo: 126, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
