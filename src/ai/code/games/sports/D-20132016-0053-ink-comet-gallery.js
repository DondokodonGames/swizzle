// D-20132016-0053-ink-comet-gallery.js
// インク彗星ギャラリー — 指で描いた線に沿ってインクの彗星を走らせ、色的すべてに当てる
// 操作: 指で線を描くと彗星がその軌跡をなぞって進む。危険な赤いゾーンには触れない
// 終わり: 制限時間内に色的を全て彗星で光らせれば成功。赤いゾーンをなぞると失敗、時間切れも失敗
// @mechanic: trace
// @theme: carnival_ink_gallery
// 世界観: 移動見世物の的当て小屋。指先から放たれるインクの彗星を自分で描いた軌跡で導き、並んだ色的をすべて光らせる射手
// 残るもの: 正誤(CLEAR/GAME OVER) + 点灯させた的の数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 塗りなし、線のみ2〜3重ねで発光、黒地
  var C = {
    bg: '#020204', line1: '#ff2e6a', line2: '#2ee0ff', line3: '#ffe23a',
    t1: '#ff5a5a', t2: '#5affea', t3: '#ffe45a', t4: '#8a5aff', t5: '#5aff8a',
    bad: '#ff2e2e', white: '#f4f4f4', ink: '#020204', gold: '#ffd400', good: '#5aff8a',
  };
  var TARGET_COLORS = [C.t1, C.t2, C.t3, C.t4, C.t5];

  var GAME_TITLE = 'INK COMET';
  var TARGETS = [
    { x: W * 0.22, y: H * 0.30, r: 60 },
    { x: W * 0.78, y: H * 0.28, r: 60 },
    { x: W * 0.5, y: H * 0.20, r: 58 },
    { x: W * 0.30, y: H * 0.48, r: 56 },
    { x: W * 0.70, y: H * 0.50, r: 56 },
  ];
  var DANGER = { x: W * 0.5, y: H * 0.62, r: 90 };
  var TIME_LIMIT = 11;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hit, cometX, cometY, timeLeft, trail;
  var done, endWait, finished, ready, hitStop, shake, dragging;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COMET_SPRITE = ['.#.', '###', '.#.'];

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, '#0a0510'], [0.5, C.bg], [1, '#000000']]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(elapsed * 1.4));
    for (var i = 0; i < 6; i++) game.draw.line(0, i * (H / 6), W, i * (H / 6), '#ffffff', 1);
  }

  function drawDanger(elapsed) {
    var blink = Math.floor(elapsed * 6) % 2 === 0;
    game.draw.circle(DANGER.x, DANGER.y, DANGER.r, C.bad, blink ? 0.32 : 0.16);
    game.draw.circle(DANGER.x, DANGER.y, DANGER.r, C.bad, 0.6);
    game.draw.circle(DANGER.x, DANGER.y, DANGER.r - 8, C.bad, 0.4);
  }

  function drawTargets(elapsed) {
    for (var i = 0; i < TARGETS.length; i++) {
      var t = TARGETS[i];
      var sway = Math.sin(elapsed * 1.6 + i) * 4;
      if (hit[i]) {
        game.draw.circle(t.x, t.y + sway, t.r, TARGET_COLORS[i], 0.9);
        game.draw.circle(t.x, t.y + sway, t.r - 14, C.white, 0.7);
      } else {
        game.draw.circle(t.x, t.y + sway, t.r, TARGET_COLORS[i], 0.22);
        game.draw.circle(t.x, t.y + sway, t.r, TARGET_COLORS[i], 0.7);
        game.draw.circle(t.x, t.y + sway, t.r - 20, TARGET_COLORS[i], 0.35);
      }
    }
  }

  function initGame() {
    hit = [false, false, false, false, false];
    cometX = W * 0.5; cometY = H * 0.86;
    timeLeft = TIME_LIMIT; trail = [];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; dragging = false;
  }

  function countHit() { var c = 0; for (var i = 0; i < hit.length; i++) if (hit[i]) c++; return c; }

  function onTraceMove(x, y) {
    if (finished) return;
    cometX = x; cometY = y;
    trail.push({ x: x, y: y });
    if (trail.length > 18) trail.shift();
    if (Math.hypot(x - DANGER.x, y - DANGER.y) < DANGER.r) {
      ok = false; finished = true; hitStop = 0.4; shake = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      finish();
      return;
    }
    for (var i = 0; i < TARGETS.length; i++) {
      if (hit[i]) continue;
      var t = TARGETS[i];
      if (Math.hypot(x - t.x, y - t.y) < t.r) {
        hit[i] = true;
        game.feedback.good(t.x, t.y, { text: '', color: TARGET_COLORS[i], count: 14, sound: 'se_coin', volume: 0.3 });
        if (countHit() === 3) game.fx.popup('あと2!', W * 0.5, H * 0.10, { color: C.gold, size: 30 });
        if (countHit() >= TARGETS.length) {
          ok = true; finished = true;
          game.feedback.good(W * 0.5, H * 0.3, { text: 'CLEAR' });
          finish();
        }
      }
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { dragging = true; trail = []; onTraceMove(x, y); game.audio.play('se_tap', 0.08); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && dragging) onTraceMove(x, y); });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { dragging = false; game.audio.play('se_tap', 0.03); } });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(cometX, cometY, { text: 'TIME UP' });
      finish();
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.5;
    if (cyc < dt || demo.t <= dt) { hit = [false, false, false, false, false]; }
    var path = [
      { x: W * 0.5, y: H * 0.86 },
      { x: TARGETS[3].x, y: TARGETS[3].y },
      { x: TARGETS[0].x, y: TARGETS[0].y },
      { x: TARGETS[2].x, y: TARGETS[2].y },
      { x: TARGETS[1].x, y: TARGETS[1].y },
      { x: TARGETS[4].x, y: TARGETS[4].y },
    ];
    var segT = 4.6 / (path.length - 1);
    var idx = Math.min(path.length - 2, Math.floor(cyc / segT));
    var p = Math.min(1, (cyc - idx * segT) / segT);
    var a = path[idx], b = path[idx + 1];
    demo.gx = a.x + (b.x - a.x) * p;
    demo.gy = a.y + (b.y - a.y) * p;
    demo.press = cyc < 4.6;
    cometX = demo.gx; cometY = demo.gy;
    for (var i = 0; i < TARGETS.length; i++) {
      if (!hit[i] && Math.hypot(demo.gx - TARGETS[i].x, demo.gy - TARGETS[i].y) < TARGETS[i].r) hit[i] = true;
    }
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (hit === undefined) initGame();
      stepDemo(dt);
      bg(el);
      drawDanger(el);
      drawTargets(el);
      game.draw.sprite(COMET_SPRITE, { '#': C.line3 }, cometX, cometY, 10, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(el);
      drawDanger(el);
      drawTargets(el);
      game.draw.sprite(COMET_SPRITE, { '#': ok ? C.good : C.bad }, cometX, cometY, 10, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(countHit() + ' / ' + TARGETS.length, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (TARGETS.length - countHit()) + '個!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var c = countHit();
        if (ok) game.end.success(c, { hit: c, total: TARGETS.length }); else game.end.failure({ hit: c, total: TARGETS.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg(el);
    drawDanger(el);
    drawTargets(el);
    for (var i = 1; i < trail.length; i++) {
      game.draw.line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y, C.line2, 6);
    }
    var flash = hitStop > 0 && Math.floor(hitStop * 30) % 2 === 0;
    game.draw.sprite(COMET_SPRITE, { '#': flash ? C.white : C.line3 }, cometX, cometY, flash ? 14 : 10, { anchor: 'center' });

    txt(countHit() + ' / ' + TARGETS.length, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.4]], { tempo: 150, wave: 'sawtooth', volume: 0.055, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
