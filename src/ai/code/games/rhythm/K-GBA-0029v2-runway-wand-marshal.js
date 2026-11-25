// K-GBA-0029v2-runway-wand-marshal.js
// 夜間滑走路の誘導灯 — 太鼓の拍ごとに誘導灯を機体の列が進む向きへ払い続け、合図の出た拍で列ごと払う向きを切り替える
// 操作: 画面のどこでも、表拍の頭ごとに先頭機の前に光る矢じりの向き(上下左右)へ指を払う。曲がり角の1拍前に矢じりが赤橙に点滅して笛が鳴るので、次の拍から払う向きを切り替える。向き違い・払い忘れ・早払いはMISSで列がその拍だけ止まる(拍と拍の間の空払いは罰なし)
// 終わり: 18マス先の滑走路端まで列を導けばCLEAR(PERFECT/GOOD/コンボ+曲がり角+残り拍+残り灯)。MISS3回か拍切れ(24拍)でGAME OVER
// @mechanic: swipe_direction
// @theme: night_runway_wand_marshal
// 世界観: 夜間の飛行場の誘導路で、誘導員が両手の誘導灯を太鼓の拍ごとに払い、連なって進む機体の列に曲がる向きを伝えて滑走路端まで導く
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ・導いたマス数
// スタイル: 70s VECTOR

(function(game) {
  var STYLE = { bg: ['#000000', '#020c18'], main: ['#3cf0ff', '#ffb02e', '#7fa8b8'], accent: ['#ff4060', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線だけ。暗い太線→色の中線→明るい細線の3重で発光させ、面は塗らない
  var C = {
    cyan: STYLE.main[0], amber: STYLE.main[1], dim: STYLE.main[2], red: STYLE.accent[0], white: STYLE.accent[1],
    grid: '#0a2232'
  };
  var PC = ['#0b3f4c', C.cyan, '#c8fbff'];
  var PA = ['#4a2e06', C.amber, '#ffe4b0'];
  var PR = ['#4a0a16', C.red, '#ffc4d0'];
  var PD = ['#071a24', '#1e4a5c', C.dim];
  var PW = ['#3a4a52', '#dfffff', C.white];

  var GAME_TITLE = 'WAND MARSHAL';
  var BPM = 100, SPB = 60 / BPM, BAR = SPB * 4;
  var PERFECT_W = 0.07, GOOD_W = 0.15, EARLY_W = 0.26;
  var READY_T = 0.8;
  var TIME_LIMIT = 14.4;                 // 24拍(導入1小節+払い20拍)
  var LIVES = 3;
  var CELL = 170;
  var HEAD_X = W / 2, HEAD_Y = Math.round(H * 0.4);
  var MX = W / 2, MY = Math.round(H * 0.83);
  var LAMP_Y = Math.round(H * 0.7);
  var N_PLANES = 5;
  // 列の道順(0=上 1=右 2=下 3=左)。前半は長い直線、後半ほど曲がり角が詰まる
  var COURSE = [0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 3, 3, 2, 2, 3, 0];
  // デモ: 2回曲がりを決め、3回目の曲がり角(左)で切り替え損ねてMISS→次の拍で取り返す
  var DEMO_COURSE = [0, 0, 1, 1, 1, 0, 3, 3, 0, 0];
  var DEMO_WRONG_AT = 6;
  var DEMO_CYC = 8.6;
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

  // 伴奏(オリジナル): 太鼓の表拍に乗るDマイナー五音の旋律。小節頭で1小節ずつ鳴らして拍クロックに同期
  var TUNE = [
    [['R', 4]],
    [['D4', 1], ['F4', 0.5], ['G4', 0.5], ['A4', 1], ['G4', 1]],
    [['C5', 1], ['A4', 0.5], ['G4', 0.5], ['F4', 1], ['D4', 1]],
    [['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['A4', 1]],
    [['G4', 1], ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 1]],
    [['A4', 1], ['G4', 0.5], ['F4', 0.5], ['D4', 2]]
  ];
  var BASS = [
    [['D2', 1], ['D2', 1], ['D2', 1], ['A2', 1]],
    [['D2', 1], ['A2', 1], ['D2', 1], ['A2', 1]],
    [['F2', 1], ['C3', 1], ['F2', 1], ['C3', 1]],
    [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1]],
    [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1]],
    [['D2', 1], ['A2', 1], ['D2', 2]]
  ];

  // ---- スプライト(1ドットの線画。塗りなし) ----
  // 誘導員: 耳当て付きの帽子・反射ベストのX・脚(拍ごとに足踏み) / 驚き顔
  var MARSHAL = [
    ['...######...', '..#......#..', '.##.o..o.##.', '.##......##.', '..#..##..#..', '...######...', '..#.#..#.#..', '.#...##...#.', '.#..#..#..#.', '.#.#....#.#.', '.##......##.', '..########..', '...#....#...', '...#....#...', '..#......#..', '.##......##.'],
    ['...######...', '..#......#..', '.##.o..o.##.', '.##......##.', '..#..##..#..', '...######...', '..#.#..#.#..', '.#...##...#.', '.#..#..#..#.', '.#.#....#.#.', '.##......##.', '..########..', '...#....#...', '...#...#....', '..#....#....', '.##...##....'],
    ['...######...', '..#......#..', '.##o.oo.o##.', '.##.o..o.##.', '..#.####.#..', '...######...', '..#.#..#.#..', '.#...##...#.', '.#..#..#..#.', '.#.#....#.#.', '.##......##.', '..########..', '...#....#...', '...#....#...', '..#......#..', '.##......##.']
  ];
  var MPAL = { '#': C.amber, o: C.white };
  var MPAL_HIT = { '#': C.white, o: C.red };
  // 機体の線画(機首が上)。線分 [x1,y1,x2,y2]
  var PLANE = [
    [0, -1, 0.14, -0.72], [0.14, -0.72, 0.14, 0.74], [0.14, 0.74, 0, 0.95], [0, 0.95, -0.14, 0.74], [-0.14, 0.74, -0.14, -0.72], [-0.14, -0.72, 0, -1],
    [0.14, -0.16, 0.95, 0.22], [0.95, 0.22, 0.95, 0.34], [0.95, 0.34, 0.14, 0.2],
    [-0.14, -0.16, -0.95, 0.22], [-0.95, 0.22, -0.95, 0.34], [-0.95, 0.34, -0.14, 0.2],
    [0.14, 0.6, 0.42, 0.8], [0.42, 0.8, 0.14, 0.82], [-0.14, 0.6, -0.42, 0.8], [-0.42, 0.8, -0.14, 0.82]
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var course, cells, pos, shown, clock, introBeats, totalBeats, beatRes, lastBeat, cuedBar;
  var lives, score, combo, maxCombo, nP, nG, nM, over, won, outroT, hitStop, demoMode, prevBest;
  var wandDir, wandT, missFx, hitFx, whistledPos, sigT, halfShown, comboShown;
  var beatPulse = 0;
  var touch = null;

  function initRun(demo) {
    demoMode = !!demo;
    var src = demoMode ? DEMO_COURSE : COURSE;
    var flip = !demoMode && game.random(0, 1) < 0.5;
    course = [];
    for (var i = 0; i < src.length; i++) course.push(flip && (src[i] === 1 || src[i] === 3) ? 4 - src[i] : src[i]);
    cells = [{ x: 0, y: 0 }];
    for (var k = 0; k < course.length; k++) cells.push({ x: cells[k].x + DX[course[k]] * CELL, y: cells[k].y + DY[course[k]] * CELL });
    introBeats = demoMode ? 2 : 4;
    totalBeats = introBeats + course.length + (LIVES - 1);
    beatRes = [];
    for (var b = 0; b < totalBeats; b++) beatRes.push(0);
    pos = 0; shown = 0; clock = -READY_T; lastBeat = -99; cuedBar = -1;
    lives = LIVES; score = 0; combo = 0; maxCombo = 0; nP = 0; nG = 0; nM = 0;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best;
    wandDir = -1; wandT = 0; missFx = 0; hitFx = 0; whistledPos = -1; sigT = 0; halfShown = false; comboShown = false;
  }

  function heading() { return pos > 0 ? course[pos - 1] : course[0]; }
  function turnAhead() { return pos < course.length && course[pos] !== heading(); }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function judgeSwipe(dir) {
    wandDir = dir; wandT = 0.3;
    if (over || clock < 0) return 'idle';
    var base = Math.floor(clock / SPB), best = -1, bd = 99;
    for (var k = base; k <= base + 1; k++) {
      if (k < introBeats || k >= totalBeats || beatRes[k]) continue;
      var d = clock - k * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = k; }
    }
    if (best < 0) return 'idle';
    if (Math.abs(bd) <= GOOD_W) {
      if (dir === course[pos]) hitBeat(best, Math.abs(bd) <= PERFECT_W ? 1 : 2);
      else missBeat(best);
      return 'judged';
    }
    if (bd < 0 && -bd <= EARLY_W) { missBeat(best); return 'judged'; }
    return 'idle';
  }

  function hitBeat(b, grade) {
    var turned = pos > 0 && course[pos] !== course[pos - 1];
    beatRes[b] = grade;
    pos++;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nP++; else nG++;
    score += Math.round((grade === 1 ? 100 : 60) * (1 + Math.min(10, combo) * 0.1)) + (turned ? 80 : 0);
    hitFx = 0.25;
    game.feedback.good(HEAD_X, HEAD_Y - 150, { text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.cyan : C.white, size: grade === 1 ? 54 : 44, count: grade === 1 ? 14 : 8, volume: demoMode ? 0 : 0.22 });
    if (!demoMode && combo >= 2) game.audio.tone(392 * Math.pow(2, Math.min(12, combo) / 12), 0.05, { wave: 'triangle', volume: 0.05 });
    if (!demoMode && !halfShown && pos >= Math.ceil(course.length / 2)) {
      halfShown = true;
      game.fx.popup('NICE', W / 2, HEAD_Y - 260, { color: C.amber, size: 80 });
      game.audio.play('se_milestone', 0.45);
    }
    if (!demoMode && !comboShown && combo >= 10) {
      comboShown = true;
      game.fx.popup('COMBO 10', W / 2, HEAD_Y + 230, { color: C.cyan, size: 60 });
    }
    if (pos >= course.length) finishRun(true);
  }

  function missBeat(b) {
    beatRes[b] = 3;
    combo = 0; nM++; lives--;
    missFx = 0.35;
    if (lives <= 0 && !demoMode) {
      hitStop = 0.5;
      game.feedback.bad(HEAD_X, HEAD_Y - 150, { text: 'MISS', shake: 16 });
      game.audio.play('se_break', 0.4);
      finishRun(false);
    } else {
      game.feedback.bad(HEAD_X, HEAD_Y - 150, { text: 'MISS', shake: demoMode ? 3 : 10, volume: demoMode ? 0 : 0.6 });
    }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = ok ? 2.0 : 1.6;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 150 + Math.max(0, totalBeats - Math.ceil(clock / SPB)) * 30;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, HEAD_Y - 80 + (i % 2) * 120, { color: i % 2 ? C.amber : C.cyan, count: 18, speed: 420 });
      game.fx.flash(C.cyan, 0.15);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, perfect: nP, good: nG, miss: nM, maxCombo: maxCombo, cells: pos, total: course.length };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 拍クロック(1つだけ)。小節頭で伴奏、毎拍で太鼓 ----
  function beatClock() {
    var nb = Math.floor((clock + 0.06) / BAR);
    if (!demoMode && nb > cuedBar && nb >= 0 && nb * 4 < totalBeats) {
      cuedBar = nb;
      var r = Math.min(TUNE.length - 1, nb);
      game.audio.melody(TUNE[r], { tempo: BPM, wave: 'triangle', volume: 0.06, bass: BASS[r], bassVolume: 0.09 });
    }
    var bi = Math.floor(clock / SPB);
    if (bi !== lastBeat) {
      lastBeat = bi;
      if (clock >= 0 && bi < totalBeats) {
        beatPulse = 1;
        if (!demoMode) game.audio.tone(bi % 4 === 0 ? 147 : 110, 0.1, { wave: 'triangle', volume: 0.16, slide: -40 });
      }
    }
  }

  function stepRun(dt) {
    clock += dt;
    if (wandT > 0) wandT -= dt;
    if (missFx > 0) missFx -= dt;
    if (hitFx > 0) hitFx -= dt;
    sigT += dt;
    beatClock();
    var target = over && won ? pos + Math.max(0, 2.0 - outroT) * 4 : pos;
    shown += (target - shown) * Math.min(1, dt * 12);
    if (over) return;
    // 曲がり角の合図: 角の手前のマスに着いた瞬間(=1拍前)に笛と点滅
    if (turnAhead() && whistledPos !== pos) {
      whistledPos = pos; sigT = 0;
      if (!demoMode) {
        game.audio.tone(1760, 0.12, { wave: 'square', volume: 0.05, slide: 420 });
        game.audio.tone(2350, 0.08, { wave: 'square', volume: 0.04 });
      }
    }
    for (var b = introBeats; b < totalBeats; b++) {
      if (!beatRes[b] && clock > b * SPB + GOOD_W) {
        missBeat(b);
        if (over) return;
      }
    }
    if (clock >= totalBeats * SPB || clock >= TIME_LIMIT + 0.3) finishRun(false);
  }

  // ---- 入力: 自前のスワイプ判定(指が55px動いた瞬間に向きを確定して拍と比べる) ----
  function fire(dx, dy) {
    var dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    if (hitStop > 0) return 'idle';
    return judgeSwipe(dir);
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    touch = { x: x, y: y, id: id, done: false };
    game.audio.tone(220, 0.03, { wave: 'triangle', volume: 0.03 });
  });

  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || !touch || touch.done || touch.id !== id) return;
    var dx = x - touch.x, dy = y - touch.y;
    if (dx * dx + dy * dy < 55 * 55) return;
    touch.done = true;
    var r = fire(dx, dy);
    // 払った音(空払いは低く短い)
    game.audio.tone(r === 'judged' ? 880 : 330, 0.06, { wave: 'sawtooth', volume: r === 'judged' ? 0.04 : 0.03, slide: r === 'judged' ? 300 : -80 });
    if (r === 'idle') game.fx.burst(MX, MY - 120, { color: C.amber, count: 4, speed: 120 });
  });

  game.onRelease(function(x, y, id) {
    if (!touch || touch.id !== id) return;
    if (state === S.PLAYING && !touch.done) {
      var dx = x - touch.x, dy = y - touch.y;
      if (dx * dx + dy * dy >= 35 * 35) {
        var r = fire(dx, dy);
        game.audio.tone(r === 'judged' ? 880 : 330, 0.06, { wave: 'sawtooth', volume: 0.035, slide: r === 'judged' ? 300 : -80 });
      } else {
        // ただのタップ: 誘導灯が光るだけ(罰なし)
        wandT = 0.12;
        game.fx.burst(MX, MY - 120, { color: C.amber, count: 3, speed: 90 });
      }
    }
    touch = null;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); touch = null; return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function glow(x1, y1, x2, y2, pal, w) {
    game.draw.line(x1, y1, x2, y2, pal[0], w * 3.2);
    game.draw.line(x1, y1, x2, y2, pal[1], w * 1.6);
    game.draw.line(x1, y1, x2, y2, pal[2], Math.max(1, w * 0.55));
  }
  function ring(x, y, r, pal, w, n) {
    var seg = n || 20, lx = x + r, ly = y;
    for (var i = 1; i <= seg; i++) {
      var a = i / seg * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      glow(lx, ly, nx, ny, pal, w);
      lx = nx; ly = ny;
    }
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y + 3, { size: sz, color: '#06222c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function rot(x, y, d) {
    if (d === 1) return [-y, x];
    if (d === 2) return [-x, -y];
    if (d === 3) return [y, -x];
    return [x, y];
  }

  function worldPos(u) {
    if (u <= 0) return { x: 0, y: -u * CELL, d: 0 };
    var n = course.length;
    if (u >= n) {
      var dd = course[n - 1];
      return { x: cells[n].x + DX[dd] * (u - n) * CELL, y: cells[n].y + DY[dd] * (u - n) * CELL, d: dd };
    }
    var i = Math.ceil(u) - 1, f = u - i;
    return { x: cells[i].x + DX[course[i]] * f * CELL, y: cells[i].y + DY[course[i]] * f * CELL, d: course[i] };
  }

  function drawPlane(sx, sy, d, sc, pal, w) {
    for (var i = 0; i < PLANE.length; i++) {
      var s = PLANE[i], a = rot(s[0], s[1], d), b = rot(s[2], s[3], d);
      glow(sx + a[0] * sc, sy + a[1] * sc, sx + b[0] * sc, sy + b[1] * sc, pal, w);
    }
  }

  function chevron(x, y, d, size, pal, w) {
    var t = rot(0, -1, d), l = rot(-0.8, 0, d), r = rot(0.8, 0, d);
    glow(x + l[0] * size, y + l[1] * size, x + t[0] * size, y + t[1] * size, pal, w);
    glow(x + r[0] * size, y + r[1] * size, x + t[0] * size, y + t[1] * size, pal, w);
  }

  function drawField() {
    var t = game.time.elapsed;
    game.draw.clear('#000000');
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    var cam = worldPos(shown);
    var ox = HEAD_X - cam.x, oy = HEAD_Y - cam.y;
    // 駐機場の格子(カメラに合わせて流れる)
    var gx = ((ox % CELL) + CELL) % CELL, gy = ((oy % CELL) + CELL) % CELL;
    for (var x = gx - CELL / 2; x < W; x += CELL) game.draw.line(x, 240, x, H * 0.66, C.grid, 2);
    for (var y = gy - CELL / 2; y < H * 0.66; y += CELL) if (y > 240) game.draw.line(0, y, W, y, C.grid, 2);
    // 誘導路: 通った所は暗く、先の2マスだけ灯る(曲がり角が2拍前に見える)
    var n = course.length;
    var from = Math.max(-6, Math.floor(shown) - 6), to = Math.min(n - 1, pos + 1);
    for (var i = from; i <= to; i++) {
      var A = worldPos(i), B = worldPos(i + 1), d = i < 0 ? 0 : course[i];
      var ax = A.x + ox, ay = A.y + oy, bx = B.x + ox, by = B.y + oy;
      if (Math.max(ay, by) < 230 || Math.min(ay, by) > H * 0.68) continue;
      var ahead = i >= pos;
      var px = -DY[d] * 70, py = DX[d] * 70;
      glow(ax + px, ay + py, bx + px, by + py, ahead ? PC : PD, 1.4);
      glow(ax - px, ay - py, bx - px, by - py, ahead ? PC : PD, 1.4);
      for (var k = 0; k < 3; k++) {
        var f0 = 0.12 + k * 0.3, f1 = f0 + 0.14;
        var lit = ahead && (Math.floor(t * 6) + k) % 3 !== 0;
        glow(ax + (bx - ax) * f0, ay + (by - ay) * f0, ax + (bx - ax) * f1, ay + (by - ay) * f1, lit ? PA : PD, lit ? 2 : 1.2);
      }
    }
    // 滑走路端(残り3マスで見える)
    if (n - pos <= 3 || over) {
      var E = cells[n], fd = course[n - 1];
      var ex = E.x + ox, ey = E.y + oy;
      var ux = DX[fd], uy = DY[fd], vx = -uy, vy = ux;
      var L = 1400, Wd = 130;
      glow(ex + vx * Wd, ey + vy * Wd, ex + vx * Wd + ux * L, ey + vy * Wd + uy * L, PW, 1.6);
      glow(ex - vx * Wd, ey - vy * Wd, ex - vx * Wd + ux * L, ey - vy * Wd + uy * L, PW, 1.6);
      glow(ex + vx * Wd, ey + vy * Wd, ex - vx * Wd, ey - vy * Wd, PW, 1.6);
      for (var s = -2; s <= 2; s++) glow(ex + vx * s * 40 + ux * 30, ey + vy * s * 40 + uy * 30, ex + vx * s * 40 + ux * 110, ey + vy * s * 40 + uy * 110, PW, 1.4);
    }
    // 管制塔の合図灯(右上)
    var tx = W - 130, ty = Math.round(H * 0.17);
    glow(tx - 40, ty + 150, tx - 20, ty + 30, PD, 1.4); glow(tx + 40, ty + 150, tx + 20, ty + 30, PD, 1.4);
    glow(tx - 60, ty + 30, tx + 60, ty + 30, PD, 1.4); glow(tx - 60, ty - 30, tx + 60, ty - 30, PD, 1.4);
    glow(tx - 60, ty - 30, tx - 60, ty + 30, PD, 1.4); glow(tx + 60, ty - 30, tx + 60, ty + 30, PD, 1.4);
    var warn = !over && turnAhead();
    if (warn && Math.floor(sigT * 8) % 2 === 0) { ring(tx, ty, 22, PR, 2, 12); chevron(tx, ty, course[pos], 18, PA, 1.6); }
    else ring(tx, ty, 18, PD, 1.2, 10);
  }

  function drawConvoy() {
    var cam = worldPos(shown);
    var ox = HEAD_X - cam.x, oy = HEAD_Y - cam.y;
    for (var k = N_PLANES - 1; k >= 0; k--) {
      var P = worldPos(shown - k);
      var sx = P.x + ox, sy = P.y + oy;
      if (sy < 200 || sy > H * 0.7) continue;
      var lead = k === 0;
      var flash = lead && missFx > 0;
      var bob = lead ? beatPulse * 6 : 0;
      drawPlane(sx, sy - bob, P.d, flash ? 66 : 52, flash ? PW : (lead ? PC : PD), lead ? 1.5 : 1.2);
      if (flash && hitStop > 0) ring(sx, sy, 90 + (0.5 - hitStop) * 160, PW, 2.2, 16);
    }
    if (over) return;
    // 先頭機の前の矢じり: 次に払う向き。曲がり角の1拍前は赤橙で点滅
    var nd = pos < course.length ? course[pos] : heading();
    var warn = turnAhead();
    var cx = HEAD_X + DX[nd] * 130, cy = HEAD_Y + DY[nd] * 130;
    if (warn) {
      var on = Math.floor(sigT * 8) % 2 === 0;
      chevron(cx, cy, nd, 46, on ? PR : PA, 2.2);
      chevron(cx + DX[nd] * 46, cy + DY[nd] * 46, nd, 46, on ? PA : PR, 2.2);
    } else {
      chevron(cx, cy, nd, 34, PC, 1.6);
    }
    // 拍の頭に向かって縮む輪(次に払う拍)
    var nb = Math.max(introBeats, Math.ceil((clock - GOOD_W) / SPB));
    if (nb < totalBeats && clock > (nb - 1) * SPB - 0.02 && clock >= 0) {
      var q = Math.max(0, Math.min(1, (nb * SPB - clock) / SPB));
      ring(HEAD_X, HEAD_Y, 78 + q * 130, warn ? PA : PC, 1.1, 24);
    }
    if (hitFx > 0) ring(HEAD_X, HEAD_Y, 78 + (0.25 - hitFx) * 300, PW, 1.6, 20);
  }

  function drawMarshal() {
    var t = game.time.elapsed;
    // 拍ランプ(1小節4拍)。いまの拍が灯り、小節頭は赤
    var bi = Math.max(0, lastBeat);
    for (var i = 0; i < 4; i++) {
      var lx = W / 2 - 240 + i * 160;
      var cur = clock >= 0 && bi % 4 === i;
      var sz = 22 + (cur ? beatPulse * 12 : 0);
      var pal = cur ? (i === 0 ? PR : PC) : PD;
      glow(lx - sz, LAMP_Y, lx, LAMP_Y - sz, pal, 1.4); glow(lx, LAMP_Y - sz, lx + sz, LAMP_Y, pal, 1.4);
      glow(lx + sz, LAMP_Y, lx, LAMP_Y + sz, pal, 1.4); glow(lx, LAMP_Y + sz, lx - sz, LAMP_Y, pal, 1.4);
    }
    // 誘導員の立ち位置(誘導路の端の白線)
    glow(80, MY + 130, W - 80, MY + 130, PD, 1.2);
    var frame = missFx > 0 ? 2 : (Math.max(0, lastBeat) % 2);
    var big = hitStop > 0;
    game.draw.sprite(MARSHAL[frame], big ? MPAL_HIT : MPAL, MX, MY - beatPulse * 6, big ? 13 : 11, { anchor: 'center' });
    // 両腕と誘導灯: 払った向きへ振る(動いている間は明るく)
    var pose = wandT > 0 ? wandDir : -1;
    var sh = MY - 30 - beatPulse * 6;
    var hands, wands;
    if (pose === 0) { hands = [[-60, -150], [60, -150]]; wands = [[-10, -130], [10, -130]]; }
    else if (pose === 2) { hands = [[-90, 30], [90, 30]]; wands = [[-50, 120], [50, 120]]; }
    else if (pose === 3) { hands = [[-150, -60], [-40, -90]]; wands = [[-140, -10], [-140, 10]]; }
    else if (pose === 1) { hands = [[40, -90], [150, -60]]; wands = [[140, 10], [140, -10]]; }
    else {
      var sway = Math.sin(t * 2.4) * 10;
      hands = [[-80, 20], [80, 20]]; wands = [[-36 + sway, 96], [36 + sway, 96]];
    }
    var lit = wandT > 0 ? PA : ['#3a2404', '#a86e14', '#ffd690'];
    for (var h = 0; h < 2; h++) {
      var sx = MX + (h ? 46 : -46), hx = MX + hands[h][0], hy = sh + hands[h][1];
      glow(sx, sh, hx, hy, PD, 1.6);
      glow(hx, hy, hx + wands[h][0], hy + wands[h][1], lit, wandT > 0 ? 3.2 : 2.4);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#000000', 0.7);
    glow(0, 228, W, 228, PD, 1.2);
    label('SCORE ' + score, 48, 70, 42, C.cyan, 'left');
    label(Math.min(pos, course.length) + ' / ' + course.length, W / 2, 70, 42, C.amber);
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 70 - i * 70;
      glow(lx - 12, 98, lx + 12, 40, i < lives ? PA : PD, i < lives ? 2.2 : 1.2);
    }
    var prog = Math.min(1, pos / course.length);
    glow(48, 150, W - 48, 150, PD, 1.2);
    if (prog > 0) glow(48, 150, 48 + (W - 96) * prog, 150, PC, 2);
    if (combo >= 3) label('COMBO ' + combo, W - 48, 196, 32, C.white, 'right');
  }

  function drawScene() {
    drawField();
    drawConvoy();
    drawMarshal();
  }

  function drawResult(showTap) {
    var y0 = H * 0.28, y1 = H * 0.62;
    game.draw.rect(60, y0, W - 120, y1 - y0, '#000000', 0.82);
    glow(60, y0, W - 60, y0, PC, 1.4); glow(60, y1, W - 60, y1, PC, 1.4);
    glow(60, y0, 60, y1, PC, 1.4); glow(W - 60, y0, W - 60, y1, PC, 1.4);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.cyan : C.red);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.white);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2, H * 0.448, 34, C.amber);
    label('COMBO ' + maxCombo + '   ' + Math.min(pos, course.length) + ' / ' + course.length, W / 2, H * 0.49, 36, C.cyan);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.535, 54, C.amber);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.535, 40, C.dim);
    if (!won) label('あと' + Math.max(1, course.length - pos) + 'マス!', W / 2, H * 0.575, 44, C.amber);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 34, C.white);
  }

  // ---- ATTRACT: 実ロジックでゴーストが拍ごとに払う。3つ目の曲がり角で切り替え損ねてMISS ----
  var demo = { t: 0, x: MX, y: MY - 200, press: false, k: -1, dir: 0, fired: false, wrongDone: false };
  function demoReset() {
    initRun(true);
    clock = -0.3; demo.k = -1; demo.fired = false; demo.wrongDone = false;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    var bx = MX, by = MY - 220;
    var nb = Math.ceil(clock / SPB);
    var lead = nb * SPB - clock;
    if (!over && nb >= introBeats && nb < totalBeats && lead < 0.2 && demo.k < nb && (demo.fired || demo.k < 0 || demo.k < nb - 1)) {
      demo.k = nb; demo.fired = false;
      var want = course[pos];
      if (pos === DEMO_WRONG_AT && !demo.wrongDone) { want = heading(); demo.wrongDone = true; }
      demo.dir = want;
    }
    var tx = bx, ty = by;
    if (demo.k >= 0 && !demo.fired && !over) {
      var lk = demo.k * SPB - clock;
      var p = Math.max(0, Math.min(1, 1 - lk / 0.2));
      tx = bx + DX[demo.dir] * (-110 + 220 * p); ty = by + DY[demo.dir] * (-110 + 220 * p);
      demo.x = tx; demo.y = ty; demo.press = true;
      // フレームが拍の頭をまたいでも取りこぼさない
      if (lk <= 0.015) { judgeSwipe(demo.dir); demo.fired = true; }
    } else {
      demo.press = false;
      demo.x += (tx - demo.x) * Math.min(1, dt * 6);
      demo.y += (ty - demo.y) * Math.min(1, dt * 6);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!course) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, '#000000', 0.75);
      glow(0, 228, W, 228, PD, 1.2);
      label(GAME_TITLE, W / 2, 88, 84 + Math.sin(t * 3) * 3, C.amber);
      label('HI-SCORE ' + game.best, W / 2, 178, 36, C.cyan);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.62, 52, C.amber);
      else label('TAP TO START', W / 2, H * 0.62, 46, C.cyan);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      stepRun(dt);
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.46, W, 150, '#000000', 0.8);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.amber);
    }
    // 開始時お手本: 導入小節の最後の拍で、最初に払う向きをうっすら手で見せる
    if (!over && clock > (introBeats - 1) * SPB && clock < introBeats * SPB + 0.1) {
      var q = Math.min(1, (clock - (introBeats - 1) * SPB) / SPB);
      var d0 = course[0];
      game.draw.hand(MX + DX[d0] * (-100 + 200 * q), MY - 220 + DY[d0] * (-100 + 200 * q), { press: q > 0.5, scale: 13, alpha: 0.6 });
    }
    if (over && hitStop <= 0 && outroT < 0.8) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
