// I-Switch2-0006-twin-drummer-beat.js
// ツインドラマービート — 提灯祭りの双子太鼓打ちが、息を合わせて同じ拍で桴を振り下ろす
// 操作: 太鼓の上に光る輪が縮んで太鼓の縁に重なった瞬間にタップする
// 終わり: 規定拍数(6拍)を全て合わせられれば成功。拍を外せば失敗
// @mechanic: rhythm
// @theme: lantern_festival_twin_drum
// 世界観: 夏祭りの櫓の上、双子の打ち手が一つの大太鼓を挟んで向かい合い、同じ拍で桴を打ち下ろす奉納演奏
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせられた拍数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒縁+平坦な彩色、セル画調
  var C = {
    bg: '#2a1a10', bg2: '#3c2416', wood: '#6b3a1e', woodEdge: '#2a1206',
    drum: '#c94b2b', drumEdge: '#1a0800', ring: '#ffd23a', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#fff6e6', ink: '#140800',
  };

  var GAME_TITLE = 'TWIN DRUM BEAT';
  var TOTAL = 6;
  var DX = W * 0.5, DY = H * 0.46;
  var DRUM_R = 190;
  var BEAT_DUR = 1.15;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, done, endWait, finished;
  var ready, hitStop, shake;
  var beat; // {t, resolved}

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRUMMER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) {
      game.draw.circle(W * (0.15 + i * 0.24), H * 0.1, 16, C.ring, 0.5);
    }
    game.draw.rect(0, H * 0.72, W, H * 0.3, C.woodEdge, 0.5);
  }

  function newBeat() { return { t: 0, resolved: false }; }

  function initGame() {
    hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    beat = newBeat();
  }

  function attemptHit() {
    if (!beat || beat.resolved || ready > 0 || done || finished) return;
    var p = beat.t / BEAT_DUR;
    var correct = p > 0.78 && p < 1.0;
    beat.resolved = true;
    hitStop = correct ? 0.1 : 0.3;
    if (correct) {
      hits++;
      game.feedback.good(DX, DY, { text: 'PERFECT', color: C.good });
      game.fx.burst(DX, DY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      game.audio.tone('C5', 0.15, { wave: 'square', volume: 0.15 });
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', DX, DY - 260, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(DX, DY, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
    beat = newBeat();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); attemptHit(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(b) {
    game.draw.circle(DX, DY, DRUM_R + 30, C.woodEdge);
    game.draw.circle(DX, DY, DRUM_R, C.drum);
    game.draw.circle(DX, DY, DRUM_R - 20, C.drumEdge, 0.3);
    if (b) {
      var p = b.t / BEAT_DUR;
      // telegraph: 輪が縮んで太鼓に近づく。0.6-0.8s前相当(p>0.55)から警告点滅
      var ringR = DRUM_R + 260 * (1 - Math.min(1, p));
      game.draw.circle(DX, DY, ringR, C.ring, p > 0.55 ? 0.9 : 0.45);
    }
    game.draw.sprite(DRUMMER, { '#': C.white }, DX - 220, DY, 22, { anchor: 'center' });
    game.draw.sprite(DRUMMER, { '#': C.gold }, DX + 220, DY, 22, { anchor: 'center', flipX: true });
  }

  var demo = { t: 0, gx: DX, gy: H * 0.86, press: false, b: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.b) demo.b = newBeat();
    demo.b.t += dt;
    beat = demo.b;
    var p = demo.b.t / BEAT_DUR;
    if (p > 0.78 && p < 0.9 && !demo.pressed) {
      demo.pressed = true; demo.press = true;
      game.feedback.good(DX, DY, { text: 'PERFECT', color: C.good });
      game.audio.play('se_good', 0.25);
      game.audio.tone('C5', 0.15, { wave: 'square', volume: 0.1 });
    }
    if (p >= 1) { demo.b = null; demo.press = false; demo.pressed = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(beat);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '拍!', W / 2, H * 0.18, 26, C.white);
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
      beat.t += dt;
      if (beat.t / BEAT_DUR >= 1 && !beat.resolved) {
        beat.resolved = true;
        hitStop = 0.3;
        game.feedback.bad(DX, DY, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene(beat);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['D4', 0.4], ['A4', 0.4], ['D5', 0.8]], { tempo: 118, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
