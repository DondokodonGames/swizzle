// I-Switch-0011-rope-bridge-porter.js
// ロープブリッジ・ポーター — 荷物を担いだ運び屋が渓谷の吊り橋を渡る。指でなぞって板から落ちないよう誘導する
// 操作: 吊り橋の板の上を、はみ出さないよう指でなぞって荷物を対岸まで運ぶ。突風が来たら押し戻されるので押し返すように動かす
// 終わり: 対岸まで運べば成功。橋の外にはみ出せば失敗
// @mechanic: guide_path
// @theme: canyon_rope_bridge_porter
// 世界観: 渓谷にかかる古い吊り橋。荷物を担いだ運び屋が、突風で揺れる板の上を踏み外さずに対岸の集落まで荷物を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: PIXEL HD
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度ドットの質感、彩度は中〜高、輪郭にわずかな陰影
  var C = {
    bg: '#3a5068', bg2: '#20303f', plank: '#8a6a42', plankEdge: '#5c4529',
    rope: '#3a2c1c', gap: '#0e1a26', porter: '#e8c98a', porterDark: '#a6844a',
    good: '#5cffb0', bad: '#ff5c6e', gold: '#ffd24d', white: '#ffffff', ink: '#0a0f16',
  };

  var GAME_TITLE = 'ROPE BRIDGE';
  var HALF = 92;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var BASE_PTS = [
    { x: W * 0.5, y: H * 0.84 },
    { x: W * 0.5, y: H * 0.70 },
    { x: W * 0.42, y: H * 0.56 },
    { x: W * 0.58, y: H * 0.44 },
    { x: W * 0.45, y: H * 0.32 },
    { x: W * 0.5, y: H * 0.18 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < BASE_PTS.length; i++) {
    var d = Math.hypot(BASE_PTS[i].x - BASE_PTS[i - 1].x, BASE_PTS[i].y - BASE_PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var progress, cursorX, cursorY, done, endWait, finished;
  var ready, hitStop, shake, wind, windT, windTelegraphed, milestoneHit;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PORTER = ['.##.', '####', '.##.', '#..#'];

  function windOffset() { return Math.sin(wind) * 46; }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, '#ffffff05');
  }

  function pathPts() {
    var off = windOffset();
    var pts = [];
    for (var i = 0; i < BASE_PTS.length; i++) pts.push({ x: BASE_PTS[i].x + off * (i / BASE_PTS.length), y: BASE_PTS[i].y });
    return pts;
  }

  function drawPath() {
    var PTS = pathPts();
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.plankEdge, HALF * 2 + 10);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.plank, HALF * 2);
    }
    game.draw.line(PTS[0].x - HALF, PTS[0].y + 10, PTS[PTS.length - 1].x - HALF, PTS[PTS.length - 1].y, C.rope, 5);
    game.draw.line(PTS[0].x + HALF, PTS[0].y + 10, PTS[PTS.length - 1].x + HALF, PTS[PTS.length - 1].y, C.rope, 5);
    game.draw.circle(PTS[0].x, PTS[0].y, HALF * 0.5, C.gold);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, HALF * 0.5, C.good);
    if (windTelegraphed) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) txt('!', W * 0.9, H * 0.2, 60, C.bad);
    }
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
    var PTS = pathPts();
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      var r = distToSeg(px, py, PTS[i - 1].x, PTS[i - 1].y, PTS[i].x, PTS[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * SEG_LEN[i - 1]; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  function initGame() {
    progress = 0; cursorX = BASE_PTS[0].x; cursorY = BASE_PTS[0].y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    wind = 0; windT = 1.2; windTelegraphed = false; milestoneHit = false;
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
      if (!milestoneHit && afterPct >= 50) { milestoneHit = true; game.fx.popup('50 / 100', x, y - 60, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
    }
    cursorX = x; cursorY = y;
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
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepWind(dt) {
    windT -= dt;
    if (windT <= 0.5 && !windTelegraphed) { windTelegraphed = true; game.audio.play('se_tap', 0.2); }
    if (windT <= 0) { wind += dt * 3.2; windTelegraphed = false; windT = game.random(1.4, 2.4); }
    else if (wind !== 0) wind *= 0.9;
  }

  var demo = { t: 0, gx: BASE_PTS[0].x, gy: BASE_PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { progress = 0; wind = 0; windT = 1.0; windTelegraphed = false; }
    stepWind(dt);
    var target = Math.min(TOTAL_LEN, (cyc / 4.0) * TOTAL_LEN);
    var PTS = pathPts();
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
    demo.gx = px; demo.gy = py; demo.press = cyc < 4.0;
    progress = Math.max(progress || 0, target);
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      game.draw.sprite(PORTER, { '#': C.porter }, cursorX, cursorY, 14, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath();
      game.draw.sprite(PORTER, { '#': ok ? C.porter : C.bad }, cursorX, cursorY, 14, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
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
    } else if (!finished) {
      stepWind(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    if (!finished) game.draw.sprite(PORTER, { '#': C.porter }, cursorX, cursorY, 14, { anchor: 'center' });

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
