// D-20222026-0051-corridor-drone-rush.js
// コリドードローンラッシュ — 迫るドローン群を連打で押し返し、突破ゲージを満タンにする
// 操作: 制限時間内にできるだけ多く連打して突破ゲージを満たす
// 終わり: 規定回数連打しゲージを満たせば成功。時間切れでゲージ未達なら失敗
// @mechanic: mash
// @theme: corridor_drone_rush
// 世界観: 封鎖された整備回廊を単身で突き進む工作員が、群がる警備ドローンを連打で押し返し出口まで突破する
// 残るもの: 正誤(CLEAR/GAME OVER) + 叩いた回数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体寄りの塊感、平坦色+濃淡2段の疑似ボクセル陰影
  var C = {
    bg: '#1a2230', bg2: '#0d121c', gauge: '#2a3648', gaugeFill: '#ff8f3f',
    good: '#3fd67a', bad: '#ff4d5e', gold: '#ffd23f', ink: '#eef2ff',
  };

  var GAME_TITLE = 'DRONE RUSH';
  var TIME_LIMIT = 10;
  var NEED = 24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO_SPRITE = ['.##.', '####', '.##.', '.#.#'];
  var DRONE_SPRITE = ['#.#', '###', '#.#'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff8f3f', pulse * 0.15);
  }

  var hits, timeLeft, done, endWait, finished, ready, hitStop, shake, punchT;

  function initGame() {
    hits = 0; timeLeft = TIME_LIMIT; punchT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene(mashFlash) {
    // drones bobbing near top, retreat as hits progress
    var n = 4;
    for (var i = 0; i < n; i++) {
      var prog = Math.min(1, hits / NEED);
      var dx = W * (0.2 + i * 0.2);
      var dy = H * 0.32 + Math.sin(game.time.elapsed * 3 + i) * 10 + prog * 120;
      game.draw.sprite(DRONE_SPRITE, { '#': '#ff5a6a' }, dx, dy, 20, { anchor: 'center' });
    }
    var heroY = H * 0.62 + (mashFlash ? -8 : 0);
    game.draw.sprite(HERO_SPRITE, { '#': C.gold }, W * 0.5, heroY, 40, { anchor: 'center' });
  }

  function onMashTap(x, y) {
    if (finished || ready > 0) return;
    hits++;
    punchT = 0.12;
    game.feedback.good(x, y, { text: hits % 6 === 0 ? 'NICE' : '', color: C.good, size: 30 });
    game.audio.play('se_tap', 0.2);
    if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', W * 0.5, H * 0.4, { color: C.gold, size: 34 });
    if (hits >= NEED) {
      finished = true; ok = true; hitStop = 0.3;
      game.fx.burst(W * 0.5, H * 0.5, { color: C.gold, count: 26, speed: 440 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) onMashTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.62, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) initGame();
    demo.press = Math.floor(cyc * 6) % 2 === 0;
    if (demo.press && Math.random() < 0.5 && hits < NEED) {
      hits++;
      game.feedback.good(demo.gx, demo.gy, { text: '', color: C.good });
      game.audio.play('se_tap', 0.1);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hits === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (NEED - hits) + '回!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: NEED });
        else game.end.failure({ hits: hits, need: NEED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (punchT > 0) punchT -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.5, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(punchT > 0);

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.gauge, 1);
    game.draw.rect(60, 150, tbW * Math.min(1, hits / NEED), 16, lowTime ? C.bad : C.gaugeFill);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.15], ['C4', 0.15], ['G4', 0.15], ['C5', 0.3]], { tempo: 170, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
