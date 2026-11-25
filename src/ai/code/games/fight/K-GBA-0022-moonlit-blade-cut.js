// K-GBA-0022-moonlit-blade-cut.js
// 月夜の一閃 — 夜庭に飛来する的を、間合いに入った瞬間だけ刀を振って斬る
// 操作: 的が斬撃ラインに重なった瞬間にスワイプ(方向不問)して斬る。早すぎ/遅すぎは失敗
// 終わり: 規定数(7個)を斬れば成功。3回外せば失敗
// @mechanic: slice
// @theme: moonlit_yard_cut
// 世界観: 夜の道場庭で棒立ちの剣士が、四方八方から飛んでくる的板を間合いぴったりで斬り続ける修練
// 残るもの: 正誤(CLEAR/GAME OVER) + 斬った枚数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きめドット、太い輪郭、少ない色数だがくっきりした陰影
  var C = {
    bg: '#0c1420', bg2: '#182838', ground: '#22344a',
    moon: '#eef4ff', moonGlow: '#3a5878',
    target: '#e8d6a0', targetEdge: '#8a6a34', blade: '#dff0ff',
    good: '#4dffb0', bad: '#ff4d5e', gold: '#ffd93d', white: '#f4f8ff', ink: '#060a10',
  };

  var GAME_TITLE = 'MOONLIT CUT';
  var TOTAL = 7;
  var MAX_MISS = 3;
  var CX = W * 0.5, CY = H * 0.46;
  var HIT_R = 150;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cut, missed, done, endWait, finished;
  var ready, hitStop, shake;
  var target, round, slash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SWORDSMAN = ['..##..', '.####.', '..##..', '#####.', '.##...'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [0.55, C.bg2], [1, C.ground]]);
    game.draw.circle(W * 0.82, H * 0.14, 90, C.moonGlow, 0.4);
    game.draw.circle(W * 0.82, H * 0.14, 60, C.moon);
    for (var i = 0; i < 4; i++) game.draw.rect(0, H * 0.62 + i * 30, W, 2, '#ffffff08');
  }

  function drawSwordsman(swing) {
    game.draw.sprite(SWORDSMAN, { '#': C.white }, CX, H * 0.62, 28, { anchor: 'center' });
    var a = swing ? 40 : 0;
    game.draw.line(CX - 60 - a, H * 0.6 + a * 0.4, CX + 90 - a, H * 0.5 - a * 0.6, C.blade, 10);
  }

  // 的の飛来ライフサイクル: 4方向のどこかから間合いへ直進し、間合い到達→通過で寿命終了
  function newTarget() {
    var ang = game.random(0, Math.PI * 2);
    var dist = 720;
    return {
      sx: CX + Math.cos(ang) * dist, sy: CY + Math.sin(ang) * dist,
      ang: ang, t: 0, dur: Math.max(0.62, 1.05 - round * 0.045),
      telegraphed: false, resolved: false,
    };
  }

  function initGame() {
    cut = 0; missed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; slash = 0;
    target = newTarget();
  }

  function targetPos(k) {
    var p = Math.min(1, k.t / k.dur);
    return { x: k.sx + (CX - k.sx) * p, y: k.sy + (CY - k.sy) * p, p: p };
  }

  function resolveSlash() {
    if (!target || target.resolved || ready > 0 || done || finished) return;
    var pos = targetPos(target);
    var d = Math.hypot(pos.x - CX, pos.y - CY);
    target.resolved = true;
    slash = 0.16;
    if (d <= HIT_R) {
      cut++;
      game.feedback.good(pos.x, pos.y, { text: 'CUT', color: C.good });
      game.fx.burst(pos.x, pos.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      hitStop = 0.1;
      if (cut === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 40 });
      if (cut >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      target = newTarget();
    } else {
      missed++;
      hitStop = 0.3;
      game.feedback.bad(pos.x, pos.y, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      if (missed >= MAX_MISS) { ok = false; finished = true; finish(); return; }
      round++;
      target = newTarget();
    }
  }

  game.onSwipe(function() { if (state === S.PLAYING) resolveSlash(); });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawTarget(k) {
    if (!k) return;
    var pos = targetPos(k);
    if (pos.p > 0.4) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(CX, CY, HIT_R, C.bad, 0.18);
    }
    game.draw.circle(pos.x, pos.y, 40, C.targetEdge);
    game.draw.circle(pos.x, pos.y, 30, C.target);
  }

  var demo = { t: 0, gx: CX + 60, gy: H * 0.62, press: false, k: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.k) { demo.k = newTarget(); demo.k.dur = 0.95; round = 0; }
    demo.k.t += dt;
    target = demo.k; slash = Math.max(0, slash - dt);
    var pos = targetPos(demo.k);
    if (pos.p > 0.55 && pos.p < 0.7 && !demo.k.telegraphed) {
      demo.k.telegraphed = true;
      demo.press = true; slash = 0.16;
      game.feedback.good(pos.x, pos.y, { text: 'CUT', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (pos.p >= 1) { demo.k = null; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawSwordsman(slash > 0);
      drawTarget(target);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
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
      drawSwordsman(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cut + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - cut) + '枚!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cut, { cut: cut, total: TOTAL, missed: missed });
        else game.end.failure({ cut: cut, total: TOTAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      target.t += dt;
      if (target.t / target.dur >= 1 && !target.resolved) {
        target.resolved = true;
        missed++;
        hitStop = 0.3;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.28;
        game.audio.play('se_bad', 0.4);
        if (missed >= MAX_MISS) { ok = false; finished = true; finish(); }
        else { round++; target = newTarget(); }
      }
    }
    if (slash > 0) slash -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawSwordsman(slash > 0);
    if (!finished) drawTarget(target);

    txt(cut + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cut / TOTAL), 16, C.gold);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W - 100 - i * 46, 200, 12, i < missed ? C.bad : C.ink, i < missed ? 1 : 0.4);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 140, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
