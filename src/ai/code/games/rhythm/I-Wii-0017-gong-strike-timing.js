// I-Wii-0017-gong-strike-timing.js
// ゴングストライクタイミング — 打ち手を振り上げ、輪が的に重なった瞬間だけ下へ振り下ろして鳴らす
// 操作: 縮んでくる輪が中央の的にちょうど重なった瞬間に、打ち手を下へスワイプして叩く
// 終わり: 8回の合図のうち規定回数を的の窓内で打てれば成功。窓を外して打つ/打たずに逃すと即失敗
// @mechanic: timing_window
// @theme: festival_gong_bench
// 世界観: 祭り囃子の楽屋裏。太鼓打ちの弟子が師匠の合図の輪に合わせ、ゴングを的確な瞬間に打ち鳴らす稽古をする
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中させた回数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 背景2〜3層(空グラデ+遠景シルエット+近景)、大きめキャラ、暗色輪郭+ハイライト。もっとも汎用
  var C = {
    bg: '#2a1030', bg2: '#4a1a44', tentDark: '#1a0a20', gong: '#d4a03c', gongDark: '#8a5c14',
    ring: '#ff9d3d', ringOk: '#3dd67a', good: '#3dd67a', bad: '#ff5040',
    gold: '#ffd24d', white: '#fff0e0', ink: '#140510',
  };

  var GAME_TITLE = 'GONG STRIKE';
  var CX = W * 0.5, CY = H * 0.44;
  var TOTAL = 8;
  var NEED_HITS = 6;
  var RING_START = 260, RING_TARGET = 100, RING_TOL = 22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, hits, ringR, closing, resolved, done, endWait, finished, ready, hitStop, shake, strikeFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000040', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRUMMER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.circle(CX, CY, 340, C.tentDark, 0.3);
    game.draw.sprite(DRUMMER, { '#': C.ink }, W * 0.22, H * 0.5, 18, { anchor: 'center', alpha: 0.5 });
  }

  var RING_SPEED = 130; // px/s

  function initRound() {
    ringR = RING_START; closing = true; resolved = false; strikeFlash = 0;
  }

  function initGame() {
    round = 0; hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    initRound();
  }

  function drawGong(color) {
    game.draw.circle(CX, CY, RING_TARGET + 20, C.gongDark);
    game.draw.circle(CX, CY, RING_TARGET, color);
    game.draw.circle(CX, CY, ringR, 'transparent', 0);
    game.draw.circle(CX, CY, ringR + 4, C.ring, 0.9);
  }

  function strike() {
    if (resolved || done || ready > 0 || finished) return;
    resolved = true;
    var diff = Math.abs(ringR - RING_TARGET);
    if (diff <= RING_TOL) {
      hits++;
      strikeFlash = 0.15;
      game.feedback.good(CX, CY, { text: 'HIT', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 220, { color: C.gold, size: 34 });
      hitStop = 0.1;
      nextRoundOrEnd();
    } else {
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      hitStop = 0.3;
      ok = false; finished = true; finish();
    }
  }

  function nextRoundOrEnd() {
    round++;
    if (round >= TOTAL) {
      ok = hits >= NEED_HITS; finished = true; finish(); return;
    }
    initRound();
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || dir !== 'down') return;
    strike();
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) strike();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.20, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { ringR = RING_START; }
    if (cyc < 1.6) {
      ringR = RING_START - (RING_START - RING_TARGET) * (cyc / 1.6);
      demo.press = false;
      demo.gy = H * 0.20;
    } else if (cyc < 1.75) {
      demo.press = true;
      demo.gy = H * 0.34;
    } else {
      demo.press = false;
      demo.gy = H * 0.20;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGong(C.gong);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGong(ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_HITS - hits) + '打!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (closing) {
        ringR -= RING_SPEED * dt;
        if (ringR <= RING_TARGET - RING_TOL - 30) {
          if (!resolved) {
            resolved = true;
            game.feedback.bad(CX, CY, { text: 'MISS' });
            shake = 0.3; game.audio.play('se_bad', 0.4); hitStop = 0.3;
            ok = false; finished = true; finish();
          }
        }
      }
    }
    if (strikeFlash > 0) strikeFlash -= dt;
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawGong(strikeFlash > 0 ? C.white : C.gong);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000030', 1);
    game.draw.rect(60, 150, (W - 120) * (round / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['A3', 0.3], ['D4', 0.3], ['F4', 0.6]], { tempo: 128, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
