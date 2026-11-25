// I-3DS-0005-causeway-marble-guide.js
// コーズウェイマーブル — 宙に浮く回廊の細道から落とさぬよう、玉を指で導いて奥の受け皿へ届ける
// 操作: 玉に指を重ねてドラッグし続け、細道からはみ出さないよう奥の受け皿まで導く
// 終わり: 受け皿に届けば成功。道の外(隙間)に落とせば失敗
// @mechanic: guide_path
// @theme: floating_causeway_marble
// 世界観: 霧の谷に浮かぶ石造りの回廊。転がる玉を指で支えながら、細く曲がる道を外れずに奥の受け皿まで送り届ける運搬係
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 奥へ収束する擬似遠近の帯、地平線の淡い光
  var C = {
    sky: '#1a2440', sky2: '#0c1228', horizon: '#4a6aa0', fog: '#c9d8ff',
    path: '#3a4a6a', pathEdge: '#5a76ac', gap: '#0a0e1c',
    marble: '#ffe08a', marbleShade: '#c8962e', accent: '#7fd4ff',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0f4ff', ink: '#080a14',
  };

  var GAME_TITLE = 'CAUSEWAY';
  var HALF = 78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.5, y: H * 0.88 },
    { x: W * 0.62, y: H * 0.74 },
    { x: W * 0.30, y: H * 0.66 },
    { x: W * 0.72, y: H * 0.54 },
    { x: W * 0.28, y: H * 0.44 },
    { x: W * 0.58, y: H * 0.34 },
    { x: W * 0.40, y: H * 0.24 },
    { x: W * 0.50, y: H * 0.14 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var progress, marbleX, marbleY, held, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MARBLE_SPRITE = ['.##.', '####', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky2], [0.4, C.sky], [1, '#0a0e1c']]);
    game.draw.rect(0, H * 0.02, W, 3, C.horizon, 0.3);
    for (var i = 0; i < 6; i++) {
      var y = H * (0.05 + i * 0.03);
      game.draw.rect(0, y, W, 1, C.fog, 0.06);
    }
  }

  function drawPath() {
    game.draw.rect(0, 0, W, H, C.gap);
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.pathEdge, HALF * 2 + 10);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.path, HALF * 2);
    }
    for (var j2 = 0; j2 < PTS.length; j2 += 1) {
      game.draw.circle(PTS[j2].x, PTS[j2].y, 6, '#ffffff10');
    }
    game.draw.circle(PTS[0].x, PTS[0].y, HALF * 0.55, C.accent);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, HALF * 0.6, C.gold);
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return { dist: Math.hypot(px - cx, py - cy), t: t };
  }

  function evalPoint(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      var r = distToSeg(px, py, PTS[i - 1].x, PTS[i - 1].y, PTS[i].x, PTS[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * SEG_LEN[i - 1]; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  function initGame() {
    progress = 0; marbleX = PTS[0].x; marbleY = PTS[0].y;
    held = false; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.15;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var beforePct = Math.round((progress / TOTAL_LEN) * 100);
      progress = r.len;
      var afterPct = Math.round((progress / TOTAL_LEN) * 100);
      if (beforePct < 50 && afterPct >= 50) game.fx.popup('50 / 100', x, y - 60, { color: C.gold, size: 36 });
    }
    marbleX = x; marbleY = y;
    if (progress >= TOTAL_LEN - 20) {
      finished = true; ok = true; hitStop = 0.1;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    var r = evalPoint(x, y);
    if (r.dist <= HALF && r.len <= progress + 60) {
      held = true; game.audio.play('se_tap', 0.05); onDrag(x, y);
    } else {
      game.audio.play('se_tap', 0.03);
      game.fx.burst(x, y, { color: C.accent, count: 6, speed: 140 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !held) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });
  game.onRelease(function() { held = false; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.2) * TOTAL_LEN);
    var acc = 0, px = PTS[0].x, py = PTS[0].y;
    for (var i = 1; i < PTS.length; i++) {
      if (target <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (target - acc) / SEG_LEN[i - 1] : 0;
        px = PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t;
        py = PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t;
        break;
      }
      acc += SEG_LEN[i - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.2;
    progress = Math.max(progress || 0, target);
    marbleX = px; marbleY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      game.draw.sprite(MARBLE_SPRITE, { '#': C.marble }, marbleX, marbleY, 10, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath();
      game.draw.sprite(MARBLE_SPRITE, { '#': ok ? C.marble : C.bad }, marbleX, marbleY, 10, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round((progress / TOTAL_LEN) * 100) + ' / ' + 100, W / 2, H * 0.12, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    if (!finished) game.draw.sprite(MARBLE_SPRITE, { '#': C.marble }, marbleX, marbleY, 10, { anchor: 'center' });

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / ' + 100, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
