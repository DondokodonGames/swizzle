// GH-PS2-0034-tile-swap.js
// タイルスワップ — 相手が見ていない隙に牌をすり替える。見られたら終わり
// 操作: 相手の目が閉じている(見ていない)間にタップしてすり替える。見られている時に押すと即アウト
// 終わり: 3回すり替えれば成功。見られて押すと失敗。何回目で終わったかが残る
// @mechanic: timing_window
// @theme: night_table
// 世界観: 夜の卓、対面の相手の目だけが光る。長く見て、短く逸らす。逸らす直前にわずかに覗くフェイントもある
// 残るもの: 成功/失敗 + すり替えた回数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 70s VECTOR: 黒地に発光する線画のみ。塗りを使わない
  var C = {
    bg: '#05050a', line: '#39ff6a', line2: '#39ff6a', danger: '#ff3a4a', gold: '#ffd400', white: '#e8ffe8',
  };

  var GAME_TITLE = 'TILE SWAP';
  var SWAPS_NEEDED = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, swaps = 0, elapsedRound = 0;

  var phase, phaseT, done, endWait, caught;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var EY = H * 0.30;

  function vline(x1, y1, x2, y2, glow) {
    game.draw.line(x1, y1, x2, y2, C.line, glow ? 3 : 5);
  }

  function tableBg() {
    game.draw.gradient(0, H, [[0, '#0a0e14'], [0.4, C.bg], [1, '#020204']]);
    // CRTスキャンバー(縦に大きく帯移動。画面全体で動きを作りつつ黒地は保つ)
    var scanY = (game.time.elapsed * 480) % (H + 300) - 150;
    game.draw.rect(0, scanY, W, 260, C.line, 0.16);
    game.draw.rect(0, scanY, W, 4, C.line, 0.5);
    game.draw.rect(0, scanY + 256, W, 4, C.line, 0.5);
    // 卓(輪郭のみ)
    game.draw.line(W * 0.12, H * 0.62, W * 0.88, H * 0.62, C.line, 3);
    game.draw.line(W * 0.12, H * 0.62, W * 0.06, H * 0.95, C.line, 3);
    game.draw.line(W * 0.88, H * 0.62, W * 0.94, H * 0.95, C.line, 3);
    game.draw.line(W * 0.06, H * 0.95, W * 0.94, H * 0.95, C.line, 3);
    // 隅の監視カメラ(モチーフ)
    game.draw.sprite(CAM_SPRITE, CAM_PAL, W * 0.10, H * 0.22, 10, { anchor: 'center' });
    game.draw.sprite(CAM_SPRITE, CAM_PAL, W * 0.90, H * 0.22, 10, { anchor: 'center' });
    // 中央線(奥行き)
    for (var i = 1; i < 5; i++) {
      var fx = W * 0.12 + (W * 0.76) * (i / 5);
      var fx2 = W * 0.06 + (W * 0.88) * (i / 5);
      vline(fx, H * 0.62, fx2, H * 0.95, true);
    }
  }

  function drawEyes(open, sz) {
    var w = 90 * sz;
    // 顔輪郭
    game.draw.circle(W / 2, EY, 150 * sz, C.line, 0);
    game.draw.line(W / 2 - 160 * sz, EY - 40 * sz, W / 2 - 160 * sz, EY + 60 * sz, C.line, 3);
    game.draw.line(W / 2 + 160 * sz, EY - 40 * sz, W / 2 + 160 * sz, EY + 60 * sz, C.line, 3);
    game.draw.line(W / 2 - 160 * sz, EY - 40 * sz, W / 2 + 160 * sz, EY - 40 * sz, C.line, 3);
    if (open) {
      game.draw.circle(W / 2 - 70 * sz, EY, 26 * sz, C.danger, 0.0);
      game.draw.line(W / 2 - 70 * sz - w * 0.3, EY, W / 2 - 70 * sz + w * 0.3, EY, C.danger, 6);
      game.draw.line(W / 2 + 70 * sz - w * 0.3, EY, W / 2 + 70 * sz + w * 0.3, EY, C.danger, 6);
      game.draw.circle(W / 2 - 70 * sz, EY, 12 * sz, C.danger, 0.9);
      game.draw.circle(W / 2 + 70 * sz, EY, 12 * sz, C.danger, 0.9);
    } else {
      game.draw.line(W / 2 - 70 * sz - w * 0.3, EY, W / 2 - 70 * sz + w * 0.3, EY, C.line, 4);
      game.draw.line(W / 2 + 70 * sz - w * 0.3, EY, W / 2 + 70 * sz + w * 0.3, EY, C.line, 4);
    }
  }

  var CAM_SPRITE = ['.#.', '###', '.#.'];
  var CAM_PAL = { '#': C.line };

  var TILE_ROW = [];
  function initTiles() {
    TILE_ROW = [];
    for (var i = 0; i < 6; i++) TILE_ROW.push({ x: W * (0.16 + i * 0.135), swapped: false });
  }

  function drawTiles() {
    for (var i = 0; i < TILE_ROW.length; i++) {
      var t = TILE_ROW[i], y = H * 0.80, tw = 64, th = 92;
      var col = t.swapped ? C.gold : C.line;
      game.draw.line(t.x - tw / 2, y - th / 2, t.x + tw / 2, y - th / 2, col, 3);
      game.draw.line(t.x + tw / 2, y - th / 2, t.x + tw / 2, y + th / 2, col, 3);
      game.draw.line(t.x + tw / 2, y + th / 2, t.x - tw / 2, y + th / 2, col, 3);
      game.draw.line(t.x - tw / 2, y + th / 2, t.x - tw / 2, y - th / 2, col, 3);
      if (t.swapped) game.draw.circle(t.x, y, 14, C.gold, 0.9);
    }
  }

  function newPhase() {
    var r = Math.random();
    if (r < 0.62) { phase = 'watch'; phaseT = 1.1 + Math.random() * 0.7; }
    else if (r < 0.80) { phase = 'fake'; phaseT = 0.22; }
    else { phase = 'away'; phaseT = 0.55 + Math.random() * 0.35; }
  }

  function initGame() {
    swaps = 0; done = false; endWait = 0; caught = false; elapsedRound = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    initTiles();
    newPhase();
  }

  function attemptSwap() {
    if (done || ready > 0 || hitStop > 0 || caught) return;
    if (phase === 'away') {
      var target = TILE_ROW[Math.min(TILE_ROW.length - 1, swaps)];
      if (target) target.swapped = true;
      swaps++;
      hitStop = 0.10;
      game.feedback.good(target ? target.x : W / 2, H * 0.80, { text: 'SWAP', color: C.gold });
      game.fx.burst(target ? target.x : W / 2, H * 0.80, { color: C.gold, count: 12, speed: 320 });
      game.audio.play('se_success', 0.35);
      if (swaps >= SWAPS_NEEDED) { ok = true; caught = true; finish(); }
      else { game.fx.popup(swaps + ' / ' + SWAPS_NEEDED, W / 2, H * 0.40, { color: C.gold, size: 50 }); newPhase(); }
    } else {
      caught = true; ok = false;
      game.feedback.bad(W / 2, EY, { text: 'MISS' });
      game.fx.burst(W / 2, EY, { color: C.danger, count: 18, speed: 400 });
      shake = 0.3;
      game.audio.play('se_failure', 0.5);
      finish();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5);
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    game.audio.play('se_tap', 0.1);
    attemptSwap();
  });

  // ── ATTRACT ゴースト実演: 見ている間は待ち、逸らした瞬間だけタップ ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.80, press: false, phase: 'watch', phaseT: 1.3 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.phaseT -= dt;
    if (demo.phaseT <= 0) {
      if (demo.phase === 'watch') { demo.phase = 'away'; demo.phaseT = 0.7; }
      else { demo.phase = 'watch'; demo.phaseT = 1.3; }
    }
    demo.press = demo.phase === 'away' && demo.phaseT < 0.55 && demo.phaseT > 0.40;
    if (demo.press) { game.feedback.good(W / 2, H * 0.80, { text: 'SWAP', color: C.gold }); }
    drawEyes(demo.phase === 'watch', 1);
    drawTiles();
    game.draw.hand(demo.gx, demo.gy - 60, { press: demo.press, scale: 15 });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (TILE_ROW.length === 0) initTiles();
      tableBg();
      stepDemo(dt);
      txt(GAME_TITLE, W / 2, H * 0.10, 58, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.98, 32, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.98, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      tableBg();
      drawEyes(false, 1);
      drawTiles();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 60, ok ? C.line : C.danger);
      txt(swaps + ' / ' + SWAPS_NEEDED, W / 2, H * 0.17, 44, C.gold);
      var best = Math.max(game.best, swaps);
      if (ok) txt('NEW RECORD', W / 2, H * 0.23, 34, (swaps >= best && swaps > 0) ? C.gold : C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 34, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ swaps: swaps });
        else game.end.failure({ swaps: swaps });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!caught) {
      elapsedRound += dt;
      phaseT -= dt;
      if (phaseT <= 0) newPhase();
    }
    if (shake > 0) shake -= dt;

    tableBg();
    drawEyes(phase === 'watch' || phase === 'fake', 1);
    drawTiles();

    txt(swaps + ' / ' + SWAPS_NEEDED, W / 2, H * 0.06, 40, C.gold);
    if (phase === 'away') game.draw.circle(W / 2, EY, 180, C.line, 0.06 + 0.04 * Math.sin(game.time.elapsed * 10));

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 84, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
