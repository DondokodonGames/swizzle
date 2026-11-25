// K-DS-0039-jump-clap-sync.js
// ジャンプクラップシンク — 掛け声の山に合わせて両手で同時に画面を叩き、跳びながら手を叩く動きを揃える
// 操作: 中央のゲージが山の頂点に来た瞬間、画面上の2箇所を同時に(2本指で)タップする
// 終わり: 規定回数(6回)全て正しいタイミングで両手タップを決めれば成功。1回でも外せば失敗
// @mechanic: pinch_zone
// @theme: jump_clap_sync
// 世界観: 独自デザインの応援団員がスタンドで跳ねながら手拍子を打つ。掛け声の山に合わせて両手を同時に打ち鳴らす一体感の芸
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えられた回数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい単色背景、太いアウトラインと柔らかい丸影
  var C = {
    bg: '#ffb23a', bg2: '#ff8a1a', stand: '#ffffff', standDark: '#e8c890',
    gauge: '#3a3a3a', gaugeFill: '#3ad4ff', good: '#2ad46a', bad: '#e8243a',
    gold: '#ffffff', white: '#2a1808', ink: '#2a1808',
  };

  var GAME_TITLE = 'JUMP CLAP';
  var TOTAL = 6;
  var CX = W * 0.5, CY = H * 0.42;
  var LX = W * 0.28, RX = W * 0.72, HY = H * 0.85;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, done, endWait, finished;
  var ready, hitStop, shake, round, beatT, beatDur, jumpFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000055', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FAN_DOWN = ['.##.', '####', '.##.', '#..#'];
  var FAN_UP = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.standDark, 0.5);
  }

  function newBeatDur() {
    var n = Math.min(round, TOTAL - 1);
    return Math.max(1.0, 1.7 - n * 0.1);
  }

  function initGame() {
    hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; jumpFlash = 0;
    beatT = 0; beatDur = 1.7;
  }

  function peakVal() {
    // 0→1→0 の山。頂点付近が正解窓
    var p = beatT / beatDur;
    return Math.sin(Math.min(1, p) * Math.PI);
  }

  function resolveClap() {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.05);
    var v = peakVal();
    if (v > 0.86) {
      hits++; hitStop = 0.08; jumpFlash = 0.18;
      game.feedback.good(CX, CY, { text: 'SYNC!', color: C.good });
      game.fx.burst(LX, HY, { color: C.gaugeFill, count: 10, speed: 260 });
      game.fx.burst(RX, HY, { color: C.gaugeFill, count: 10, speed: 260 });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('FIRED UP!', CX, CY - 220, { color: C.good, size: 36 });
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      beatT = 0; beatDur = newBeatDur();
    } else {
      failClap();
    }
  }

  function failClap() {
    hitStop = 0.3;
    game.feedback.bad(CX, CY, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (game.touches && game.touches.length >= 2) { resolveClap(); return; }
    game.audio.play('se_tap', 0.04);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(v, jumped) {
    var lift = jumped ? -50 : 0;
    game.draw.sprite(jumped ? FAN_UP : FAN_DOWN, { '#': C.ink }, CX, CY + 30 + lift, 30, { anchor: 'center' });
    // ゲージ(山)
    game.draw.rect(CX - 220, HY + 70, 440, 20, C.gauge, 0.3);
    game.draw.rect(CX - 220, HY + 70, 440 * v, 20, C.gaugeFill);
    if (v > 0.7) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) { game.draw.circle(LX, HY, 66, C.gaugeFill, 0.3); game.draw.circle(RX, HY, 66, C.gaugeFill, 0.3); }
    }
    game.draw.circle(LX, HY, 50, C.stand);
    game.draw.circle(RX, HY, 50, C.stand);
  }

  var demo = { t: 0, gx1: LX, gx2: RX, gy: HY, press: false, bt: 0, bd: 1.3 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { round = 0; demo.bt = 0; demo.bd = 1.3; demo.hit = false; }
    demo.bt += dt;
    beatT = demo.bt; beatDur = demo.bd;
    var v = peakVal();
    if (v > 0.86 && !demo.hit) {
      demo.hit = true; demo.press = true; jumpFlash = 0.18;
      game.feedback.good(CX, CY, { text: 'SYNC!', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (demo.bt >= demo.bd) { demo.bt = 0; demo.press = false; demo.hit = false; }
  }

  game.onUpdate(function(dt) {
    if (jumpFlash > 0) jumpFlash -= dt;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var v0 = peakVal();
      drawScene(v0, jumpFlash > 0);
      game.draw.hand(demo.gx1, demo.gy, { press: demo.press, scale: 22 });
      game.draw.hand(demo.gx2, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.1, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 24, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(0, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.15, 32, C.white);
      if (!ok) txt('あと' + (TOTAL - hits) + '回!', W / 2, H * 0.2, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
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
      beatT += dt;
      if (beatT >= beatDur) failClap();
    }
    if (shake > 0) shake -= dt;

    bg();
    var v = peakVal();
    if (!finished) drawScene(v, jumpFlash > 0);
    else drawScene(0, false);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.08, 32, C.white);
    game.draw.rect(60, 170, W - 120, 16, '#00000030');
    game.draw.rect(60, 170, (W - 120) * (hits / TOTAL), 16, C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 58, C.white);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F#4', 0.4], ['A4', 0.4], ['D5', 0.8]], { tempo: 136, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
