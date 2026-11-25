// I-DS-0027-splinter-extract.js
// とげ抜き摘出 — 刺さったとげを指でつまみ、通路に沿ってまっすぐ引き抜く
// 操作: 刺さったとげの頭をつまみ、表示された引き抜き経路からはみ出さないよう指でなぞって抜く
// 終わり: 規定本数(4本)を全て抜ければ成功。経路を外れて折れれば失敗
// @mechanic: guide_path
// @theme: clinic_splinter_removal
// 世界観: 小さな診療室。手当ての名手が、次々運ばれてくる指に刺さったとげを一本ずつ丁寧に抜き取る
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜き取れた本数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 現実素材を模した質感、金属光沢、丸みの影
  var C = {
    bg: '#e7e2d8', bg2: '#cfc8ba', skin: '#e8b98d', skinDark: '#c99468',
    splinter: '#7a5a34', path: '#f5c68a', pathEdge: '#c98a3e',
    tool: '#c8ccd4', toolRim: '#8890a0',
    good: '#4caf6a', bad: '#d8503c', gold: '#e8b23a', white: '#2c241c', ink: '#ffffff',
  };

  var GAME_TITLE = 'SPLINTER OUT';
  var TOTAL = 4;
  var HALF = 56;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, extracted;
  var ready, hitStop, shake;
  var path, pathLen, progress, cursorX, cursorY, drawing, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000055', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HAND_SPRITE = ['.##.', '####', '.##.', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(W * 0.1, H * 0.2, W * 0.8, H * 0.55, C.skin, 1);
    game.draw.rect(W * 0.1, H * 0.2, W * 0.8, H * 0.55, C.skinDark, 0.12);
  }

  function makePath(seed) {
    var baseX = W * 0.5 + Math.sin(seed * 2.1) * 80;
    var baseY = H * 0.62;
    var dirX = Math.cos(seed * 1.3) * 0.4;
    var pts = [];
    var n = 5;
    for (var i = 0; i < n; i++) {
      pts.push({ x: baseX + dirX * i * 70, y: baseY - i * 78 });
    }
    return pts;
  }

  function segLens(pts) {
    var lens = [], total = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lens.push(d); total += d;
    }
    return { lens: lens, total: total };
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return { dist: Math.hypot(px - cx, py - cy), t: t };
  }

  function evalPoint(pts, lens, px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var r = distToSeg(px, py, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * lens[i - 1]; }
      acc += lens[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  function newSplinter() {
    var pts = makePath(extracted + 1.7);
    var L = segLens(pts);
    return { pts: pts, lens: L.lens, total: L.total };
  }

  function initGame() {
    extracted = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    milestoneShown = false;
    path = newSplinter(); progress = 0; cursorX = path.pts[0].x; cursorY = path.pts[0].y; drawing = false;
  }

  function onDrag(x, y) {
    if (finished || ready > 0 || done) return;
    var r = evalPoint(path.pts, path.lens, x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.3;
      game.feedback.bad(x, y, { text: 'SNAP' });
      shake = 0.28;
      game.audio.play('se_break', 0.4);
      finish();
      return;
    }
    if (r.len > progress) progress = r.len;
    cursorX = x; cursorY = y;
    if (progress >= path.total - 16) {
      extracted++;
      game.feedback.good(x, y, { text: 'OUT!', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && extracted >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.3, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (extracted >= TOTAL) {
        finished = true; ok = true; hitStop = 0.12;
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        path = newSplinter(); progress = 0; drawing = false;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    drawing = true;
    game.audio.play('se_tap', 0.06);
    onDrag(x, y);
  });
  game.onMove(function(x, y) { if (state === S.PLAYING && drawing) onDrag(x, y); });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    drawing = false;
    if (!finished && progress > 4 && progress < path.total - 16) {
      game.feedback.bad(x, y, { text: '' });
      progress = 0;
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  function drawPath(p) {
    for (var j = 1; j < p.pts.length; j++) {
      game.draw.line(p.pts[j - 1].x, p.pts[j - 1].y, p.pts[j].x, p.pts[j].y, C.pathEdge, HALF * 2 + 8);
      game.draw.line(p.pts[j - 1].x, p.pts[j - 1].y, p.pts[j].x, p.pts[j].y, C.path, HALF * 2);
    }
    var tip = p.pts[p.pts.length - 1];
    game.draw.circle(tip.x, tip.y, 20, C.gold);
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { extracted = 0; path = newSplinter(); progress = 0; }
    var target = Math.min(path.total, (cyc / 2.8) * path.total);
    var acc = 0, px = path.pts[0].x, py = path.pts[0].y;
    for (var i = 1; i < path.pts.length; i++) {
      if (target <= acc + path.lens[i - 1]) {
        var t = path.lens[i - 1] > 0 ? (target - acc) / path.lens[i - 1] : 0;
        px = path.pts[i - 1].x + (path.pts[i].x - path.pts[i - 1].x) * t;
        py = path.pts[i - 1].y + (path.pts[i].y - path.pts[i - 1].y) * t;
        break;
      }
      acc += path.lens[i - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 2.8;
    progress = Math.max(progress || 0, target);
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (path === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath(path);
      game.draw.sprite(HAND_SPRITE, { '#': C.tool }, cursorX, cursorY - 40, 10, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
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
      drawPath(path);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(extracted + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - extracted) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(extracted, { extracted: extracted, total: TOTAL });
        else game.end.failure({ extracted: extracted, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath(path);
    if (!finished) game.draw.sprite(HAND_SPRITE, { '#': C.tool }, cursorX, cursorY - 40, 10, { anchor: 'center' });

    txt(extracted + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.skinDark, 0.4);
    game.draw.rect(60, 150, (W - 120) * (extracted / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.35], ['D4', 0.35], ['E4', 0.35], ['C4', 0.7]], { tempo: 118, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
