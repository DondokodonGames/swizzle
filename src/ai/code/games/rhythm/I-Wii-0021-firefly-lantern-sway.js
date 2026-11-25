// I-Wii-0021-firefly-lantern-sway.js
// ランタン・スウェイ — 夜の川辺で提灯を一定のリズムで揺らし、蛍の群れを拍に乗せて集める
// 操作: 画面下の拍の光に合わせてタップし、提灯を一定のリズムで揺らし続ける
// 終わり: 8拍のうち6拍以上PERFECT/GOODで乗れれば成功。MISSが3回で失敗
// @mechanic: rhythm
// @theme: firefly_riverside_lantern
// 世界観: 夜の川辺で蛍使いが提灯を一定のリズムで揺らし続け、拍に合わせて蛍の群れを呼び寄せる
// 残るもの: 正誤(CLEAR/GAME OVER) + 拍に乗れた回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色ライン
  var C = {
    bg: '#050014', bg2: '#0e0026', neon: '#ff2ec4', neon2: '#00e5ff',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#03010a',
  };

  var GAME_TITLE = 'LANTERN SWAY';
  var CX = W * 0.5, LANTERN_Y = H * 0.42;
  var TEMPO = 96; // bpm
  var BEAT_SEC = 60 / TEMPO;
  var TOTAL_BEATS = 14;
  var NEED_GOOD = 10;
  var MAX_MISS = 3;
  var HIT_TOL = 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CHARMER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      var fx = (i * 173 + Math.sin(game.time.elapsed * 1.3 + i) * 40) % W;
      var fy = H * 0.2 + (i * 97) % (H * 0.35);
      game.draw.circle(fx, fy, 5, C.gold, 0.6);
    }
    game.draw.sprite(CHARMER, { '#': C.neon2 }, W * 0.5, H * 0.86, 10, { anchor: 'center' });
  }

  var songT, beatIdx, lastJudged, good, misses, done, endWait, finished, lean;
  var ready, hitStop, shake;

  function initGame() {
    songT = 0; beatIdx = 0; lastJudged = -1; good = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; lean = 0;
  }

  function currentBeatPhase() {
    var b = songT / BEAT_SEC;
    var nearest = Math.round(b);
    return { nearest: nearest, err: b - nearest };
  }

  function hitBeat(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || hitStop > 0) return;
    var ph = currentBeatPhase();
    if (ph.nearest === lastJudged || ph.nearest >= TOTAL_BEATS) return;
    var errSec = Math.abs(ph.err) * BEAT_SEC;
    if (errSec <= HIT_TOL) {
      lastJudged = ph.nearest;
      good++;
      lean = ph.err > 0 ? -18 : 18;
      var perfect = errSec <= 0.06;
      game.feedback.good(x, y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.good });
      game.fx.burst(CX, LANTERN_Y, { color: C.gold, count: 12, speed: 260 });
      game.audio.play('se_good', 0.35);
      if (good === Math.ceil(NEED_GOOD / 2)) game.fx.popup('あと' + (NEED_GOOD - good) + '拍!', CX, LANTERN_Y - 220, { color: C.gold, size: 34 });
    } else {
      game.audio.play('se_tap', 0.1);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    hitBeat(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawLantern() {
    var lx = CX + lean;
    game.draw.line(CX, LANTERN_Y - 160, lx, LANTERN_Y, C.neon2, 6);
    game.draw.circle(lx, LANTERN_Y + 40, 60, C.neon, 0.85);
    game.draw.circle(lx, LANTERN_Y + 40, 34, C.gold, 0.9);
    // beat pulse ring in thumb zone
    var ph = currentBeatPhase();
    var pulse = Math.max(0, 1 - Math.abs(ph.err) * 2.2);
    game.draw.circle(CX, H * 0.7, 90 + pulse * 40, C.neon2, 0.15 + pulse * 0.3);
    game.draw.circle(CX, H * 0.7, 70, C.neon, 0.9);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.7, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (BEAT_SEC * 4);
    if (cyc < dt || demo.t <= dt) { songT = 0; lastJudged = -1; }
    songT = cyc;
    var ph = currentBeatPhase();
    lean += (0 - lean) * Math.min(1, dt * 5);
    if (Math.abs(ph.err) * BEAT_SEC <= 0.05 && ph.nearest !== lastJudged) {
      lastJudged = ph.nearest;
      lean = 16;
      demo.press = true;
      game.feedback.good(CX, LANTERN_Y, { text: 'PERFECT', color: C.gold, sound: false });
      game.audio.play('se_good', 0.15);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawLantern();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawLantern();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(good + ' / ' + NEED_GOOD, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEED_GOOD - good) + '拍!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(good, { good: good, misses: misses });
        else game.end.failure({ good: good, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); songT = 0; lastJudged = -1; }
    } else if (!finished) {
      songT += dt;
      var ph = currentBeatPhase();
      if (ph.nearest > lastJudged + 1 || (ph.nearest > lastJudged && ph.err > HIT_TOL / BEAT_SEC)) {
        var missedBeat = lastJudged + 1;
        if (missedBeat < TOTAL_BEATS) {
          lastJudged = missedBeat;
          misses++;
          hitStop = 0.22;
          game.feedback.bad(CX, LANTERN_Y, { text: 'MISS' });
          shake = 0.2;
          game.audio.play('se_bad', 0.35);
          if (misses >= MAX_MISS) { ok = false; finished = true; finish(); }
        }
      }
      if (!finished && (ph.nearest >= TOTAL_BEATS - 1 && ph.err > 0.3)) {
        ok = good >= NEED_GOOD; finished = true; hitStop = ok ? 0.15 : 0; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLantern();

    txt(good + ' / ' + NEED_GOOD, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (good / NEED_GOOD), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['E5', 0.5]], { tempo: TEMPO, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
