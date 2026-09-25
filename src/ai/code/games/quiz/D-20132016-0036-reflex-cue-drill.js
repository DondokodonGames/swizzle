// D-20132016-0036-reflex-cue-drill.js
// 反応キュードリル — 出た合図の型どおりに素早くこなし、5連続成功を目指す
// 操作: 中央に出た合図(指マーク/砂時計/矢印)に合わせてタップ/ホールド/スワイプする
// 終わり: 5回連続で正しく反応すれば成功。誤反応か遅れが1回でもあれば失敗
// @mechanic: judge
// @theme: dojo_cue_trial
// 世界観: 山寺の道場。師範が次々に出す型の合図(タップ/ホールド/スワイプ)へ即座に応じ、免許皆伝を目指す修行僧
// 残るもの: 正誤(CLEAR/GAME OVER) + 連続成功数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: フラットな塗り、太い丸角風の矩形、影なし
  var C = {
    bg: '#eef2f5', bg2: '#dce4ea', panel: '#ffffff', ink: '#22303c',
    accent: '#3a7bfd', good: '#22c55e', bad: '#ef4444', gold: '#f5a623', white: '#ffffff',
  };

  var GAME_TITLE = 'CUE DRILL';
  var TOTAL = 5;
  var CX = W * 0.5, CY = H * 0.42;
  var WINDOW = 1.4;
  var HOLD_NEED = 0.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var streak, done, endWait, finished;
  var ready, hitStop, shake;
  var cue, cueT, resolved, holdT, holding;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MONK = ['.####.', '#.##.#', '.####.', '..##..', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 7; i++) {
      var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3 + i * 0.7);
      game.draw.rect(0, i * (H / 7), W, 2, '#ffffff', 0.3 + pulse);
    }
    game.draw.circle(CX, CY, 340, C.panel, 0.5);
  }

  function newCue() {
    var types = ['TAP', 'HOLD', 'SWIPE'];
    var t = types[Math.floor(Math.random() * types.length)];
    var dir = t === 'SWIPE' ? (Math.random() < 0.5 ? 'left' : 'right') : null;
    return { type: t, dir: dir, telegraphed: false };
  }

  function initGame() {
    streak = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    cue = newCue(); cueT = 0; resolved = false; holdT = 0; holding = false;
  }

  function drawCueIcon(c, t) {
    var alpha = Math.min(1, t / 0.15);
    if (c.type === 'TAP') {
      var pr = (t * 2.2) % 1;
      game.draw.circle(CX, CY, 60, C.accent, alpha);
      game.draw.circle(CX, CY, 60 + pr * 60, C.accent, alpha * (1 - pr) * 0.6);
    } else if (c.type === 'HOLD') {
      game.draw.circle(CX, CY, 70, C.gold, alpha);
      var frac = Math.min(1, holding ? holdT / HOLD_NEED : 0);
      game.draw.rect(CX - 60, CY + 90, 120, 18, C.ink, 0.2 * alpha);
      game.draw.rect(CX - 60, CY + 90, 120 * frac, 18, C.good, alpha);
    } else {
      var ax = c.dir === 'left' ? -1 : 1;
      game.draw.line(CX - ax * 90, CY, CX + ax * 90, CY, C.accent, 22);
      game.draw.line(CX + ax * 90, CY, CX + ax * 50, CY - 40, C.accent, 22);
      game.draw.line(CX + ax * 90, CY, CX + ax * 50, CY + 40, C.accent, 22);
    }
  }

  function pass(cx, cy) {
    resolved = true; streak++;
    hitStop = 0.1;
    game.feedback.good(cx, cy, { text: 'NICE', color: C.good });
    game.audio.play('se_good', 0.35);
    if (streak === Math.ceil(TOTAL / 2)) game.fx.popup('あと' + (TOTAL - streak) + '!', CX, CY - 200, { color: C.gold, size: 38 });
    if (streak >= TOTAL) { ok = true; finished = true; finish(); return; }
    cue = newCue(); cueT = 0; holdT = 0; holding = false;
  }

  function fail(cx, cy) {
    resolved = true;
    hitStop = 0.3;
    game.feedback.bad(cx, cy, { text: 'MISS' });
    shake = 0.25;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished || resolved) return;
    if (cue.type === 'TAP') pass(x, y); else fail(x, y);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || done || finished || resolved) return;
    if (cue.type === 'SWIPE' && dir === cue.dir) pass(CX, CY); else fail(CX, CY);
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.06);
    if (ready > 0 || done || finished || resolved) return;
    if (cue.type === 'HOLD') holding = true;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) { holding = false; return; }
    if (resolved) { holding = false; return; }
    if (cue.type === 'HOLD') {
      if (holdT >= HOLD_NEED) pass(x, y); else fail(x, y);
    }
    holding = false;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.7;
    if (cyc < dt || demo.t <= dt) { cue = newCue(); cueT = 0; }
    cueT += dt;
    if (cyc < 0.9) {
      demo.press = false;
      if (cue.type === 'SWIPE') demo.gx = CX + (cue.dir === 'left' ? -1 : 1) * Math.min(220, cueT * 400);
      else demo.gx = CX;
    } else if (cyc < 1.15) {
      demo.press = true;
      if (cue.type === 'HOLD') holdT = Math.min(HOLD_NEED, (cyc - 0.9) / 0.2 * HOLD_NEED);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cue === undefined) initGame();
      bg();
      stepDemo(dt);
      game.draw.sprite(MONK, { '#': C.ink }, CX, H * 0.85, 18, { anchor: 'center' });
      drawCueIcon(cue, cueT);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(MONK, { '#': C.ink }, CX, H * 0.85, 18, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(streak + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - streak) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(streak, { streak: streak, total: TOTAL });
        else game.end.failure({ streak: streak, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      cueT += dt;
      if (cue.type === 'HOLD' && holding) holdT += dt;
      if (cueT >= WINDOW && !resolved) fail(CX, CY);
    }
    if (shake > 0) shake -= dt;

    bg();
    game.draw.sprite(MONK, { '#': C.ink }, CX, H * 0.85, 18, { anchor: 'center' });
    if (!finished) drawCueIcon(cue, cueT);

    txt(streak + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * (streak / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
