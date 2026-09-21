// K-GBA-0028-quarry-boulder-break.js
// 息合わせ割岩 — 相棒の振り上げに合わせ、ハンマーが最高点に来た瞬間だけ叩いて岩を割る。連打は禁物
// 操作: 振り上がるハンマーが頂点で止まった一瞬だけタップする。速すぎる連打はクールダウンで無効
// 終わり: 規定回数(6回)息を合わせて叩ければ成功。3回タイミングを外せば失敗
// @mechanic: cooldown_tap
// @theme: quarry_boulder_break
// 世界観: 採石場で相棒と息を合わせて大槌を振る石割り職人。振り上げの頂点でだけ叩く一撃を、テンポが速まる中で外さずに続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 割れた回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 黒白2色主体、ハッチングで陰影、差し色は1つだけ
  var C = {
    bg: '#eae4d8', bg2: '#d8d0c0', ink: '#1a1610', accent: '#c8482a',
    boulder: '#c8c0ac', boulderCrack: '#1a1610',
    good: '#1a1610', bad: '#c8482a', gold: '#c8482a', white: '#eae4d8',
  };

  var GAME_TITLE = 'BOULDER BREAK';
  var TOTAL = 6;
  var MAX_MISS = 3;
  var HX = W * 0.5, HY = H * 0.46;
  var PEAK_TOL = 0.14;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var broke, missed, done, endWait, finished, ready, hitStop, shake;
  var round, swingT, swingDur, swung, cooldown, cracks;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.bg, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HAMMER_SPRITE = ['######', '######', '..##..', '..##..', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 8; i++) game.draw.line(0, H * 0.7 + i * 24, W, H * 0.7 + i * 24 - 10, C.ink, 1);
  }

  function initGame() {
    broke = 0; missed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; swingT = 0; swingDur = 1.1; swung = false; cooldown = 0; cracks = 0;
  }

  function hammerAngle() {
    // 0→1で振り上げ(頂点)→振り下ろし。頂点はswingT/swingDur = 0.5 付近
    var p = swingT / swingDur;
    return Math.sin(Math.min(1, p) * Math.PI); // 0..1..0
  }

  function tryStrike() {
    if (ready > 0 || done || finished) return;
    if (cooldown > 0) {
      game.audio.play('se_tap', 0.08); // 連打は無効。だが押した反応だけは返す
      return;
    }
    cooldown = 0.35;
    var p = swingT / swingDur;
    var diff = Math.abs(p - 0.5) * swingDur;
    if (diff <= PEAK_TOL) {
      broke++;
      cracks++;
      hitStop = 0.12;
      game.feedback.good(HX, HY, { text: 'BREAK', color: C.good, flashColor: C.accent });
      game.fx.burst(HX, HY, { color: C.accent, count: 16, speed: 340 });
      game.audio.play('se_break', 0.5);
      if (broke === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', HX, HY - 220, { color: C.accent, size: 40 });
      swung = true;
      if (broke >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      swingT = 0; swingDur = Math.max(0.72, 1.1 - round * 0.045); swung = false;
    } else {
      missed++;
      hitStop = 0.3;
      game.feedback.bad(HX, HY, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      if (missed >= MAX_MISS) { ok = false; finished = true; finish(); return; }
      round++;
      swingT = 0; swingDur = Math.max(0.72, 1.1 - round * 0.045); swung = false;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryStrike();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    var a = hammerAngle();
    var lift = -260 * a;
    game.draw.sprite(HAMMER_SPRITE, { '#': C.ink }, HX, HY + lift, 20, { anchor: 'center' });
    var crackR = 60 + cracks * 8;
    game.draw.circle(HX, HY + 160, crackR, C.boulder);
    for (var i = 0; i < cracks; i++) {
      game.draw.line(HX - crackR * 0.6 + i * 20, HY + 130, HX - crackR * 0.3 + i * 26, HY + 190, C.boulderCrack, 3);
    }
    if (a > 0.75) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(HX, HY + lift, 70, C.accent, 0.25);
    }
  }

  var demo = { t: 0, gx: HX, gy: H * 0.72, press: false, dT: 0, dDur: 1.0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { demo.dT = 0; swingT = 0; cracks = 0; demo.press = false; }
    demo.dT += dt;
    swingT = demo.dT; swingDur = demo.dDur;
    var p = demo.dT / demo.dDur;
    if (p > 0.44 && p < 0.56 && !demo.telegraphed) {
      demo.telegraphed = true;
      demo.press = true; cracks = Math.min(4, cracks + 1);
      game.feedback.good(HX, HY, { text: 'BREAK', color: C.good });
      game.audio.play('se_break', 0.3);
    }
    if (p >= 1) { demo.dT = 0; demo.telegraphed = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.ink : C.accent);
      txt(broke + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.accent);
      if (!ok) txt('あと' + (TOTAL - broke) + '!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(broke, { broke: broke, total: TOTAL, missed: missed }); else game.end.failure({ broke: broke, total: TOTAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      swingT += dt;
      if (cooldown > 0) cooldown -= dt;
      if (swingT / swingDur >= 1 && !swung) {
        missed++;
        hitStop = 0.3;
        game.feedback.bad(HX, HY, { text: 'MISS' });
        shake = 0.28;
        game.audio.play('se_bad', 0.4);
        if (missed >= MAX_MISS) { ok = false; finished = true; finish(); }
        else { round++; swingT = 0; swingDur = Math.max(0.72, 1.1 - round * 0.045); swung = false; }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene();

    txt(broke + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.bg2);
    game.draw.rect(60, 150, (W - 120) * (broke / TOTAL), 16, C.accent);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W - 100 - i * 46, 200, 12, i < missed ? C.accent : C.bg2, 1);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.8, 58, C.accent);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.3], ['D3', 0.3], ['A3', 0.3], ['D4', 0.6]], { tempo: 118, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
