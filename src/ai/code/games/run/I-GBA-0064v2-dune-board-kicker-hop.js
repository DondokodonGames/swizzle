// I-GBA-0064v2-dune-board-kicker-hop.js
// 砂丘ボード跳び — 夏の砂丘を板で滑り降り続け、埋まった流木をタップで跳び越える。背の高い流木の山は手前の砂のこぶで跳んで越える
// 操作: 少年は自動で斜面を滑り降りる。タップで跳ぶ(地面にいる時だけ)。赤い布の立った砂のこぶの上で跳ぶと大きく高く跳べ、その先の背の高い流木の山を越えられる。こぶ以外で跳ぶと低い跳びになる
// 終わり: 3つの砂丘を滑り切って浜に着けばCLEAR。流木にぶつかるたび麦わら帽子を1つ失い、3つ失うとGAME OVER
// @mechanic: camera_run
// @theme: summer_dune_sandboard_hop
// 世界観: 夏の海辺の砂丘で、麦わら帽子の少年が板に乗って斜面を滑り降り続け、砂に埋まった流木を跳び越え、砂のこぶを踏み切りにして流木の山を大跳びで越えながら浜まで下りきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 越えた流木の数・大跳びの数・ぶつかった数・スコア
// スタイル: 90s HANDHELD COLOR

(function (game) {
  var STYLE = { bg: ['#b8c8c0', '#d8d0b0', '#e8dcb8'], main: ['#c8aa78', '#a08458', '#6a5a48'], accent: ['#c85a48', '#4a7a8a', '#f0e8c8'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var SKY = STYLE.bg[0], HAZE = STYLE.bg[1], PALE = STYLE.bg[2];
  var SAND = STYLE.main[0], SANDD = STYLE.main[1], WOOD = STYLE.main[2];
  var CLOTH = STYLE.accent[0], SEA = STYLE.accent[1], CREAM = STYLE.accent[2];
  var INK = '#2a2620', WHITE = '#f8f4e8';

  var TITLE = 'DUNE HOP';
  var TIME_LIMIT = 22;
  var HATS = 3;
  var U = 120;                 // 1単位のpx
  var PX = W * 0.28;           // 少年の画面x
  var GY = H * 0.6;            // 少年の位置の地面y
  var SLOPE = 0.26;            // 斜面の傾き(右下がり)
  var G = 30, VJ = 8, VJ_BIG = 11.5;
  var COLL = 0.55, KZONE = 0.6;
  var LOW_H = 0.45, TALL_H = 1.4;
  var SPEEDS = [6, 7.5, 9];
  var BOUNDS = [30, 66, 112];
  var GOAL = 112;
  // [種類, 位置] — こぶ(kick)の後ろには速さに合わせて背の高い流木の山(tall)を置く
  var COURSE_SPEC = [
    ['low', 7], ['low', 12.5], ['low', 17], ['kick', 22],
    ['low', 35], ['low', 39.5], ['kick', 44], ['low', 54], ['kick', 58.5],
    ['low', 71], ['low', 76], ['kick', 81], ['low', 92], ['low', 97], ['kick', 102],
  ];
  var DEMO_SPEC = [['low', 5], ['kick', 10], ['low', 16.5], ['low', 21]];

  var BOY = [
    ['...yyyyy...', '..yyyyyyy..', 'yyyyyyyyyyy', '...sssss...', '...skssk...', '....sss....', '..rrrrrrr..', '.s.rrrrr.s.', '...rrrrr...', '...bb.bb...', '..bb...bb..', 'wwwwwwwwwww'],
    ['...yyyyy...', '..yyyyyyy..', 'yyyyyyyyyyy', '...sssss...', '...skssk...', '....sss....', '.srrrrrrrs.', '...rrrrr...', '...rrrrr...', '...bbbbb...', '..bb...bb..', 'wwwwwwwwwww'],
    ['...yyyyy...', '..yyyyyyy..', 'yyyyyyyyyyy', 's..sssss..s', '.s.skssk.s.', '..s.sss.s..', '...rrrrr...', '...rrrrr...', '..bb...bb..', '.bb.....bb.', '...........', 'wwwwwwwwwww'],
    ['...........', '.yyy.......', 'yyyyy..sss.', '.yyy..skss.', '......ssss.', '..rrrrrr...', '.srrrrrrrs.', '..bb..bb...', '.bb....bb..', 'wwwww......', '.....wwwwww', '...........'],
  ];
  var BOY_PAL = { y: '#e8c868', s: '#e0b088', k: INK, r: CLOTH, b: SEA, w: WOOD };
  var LOG = ['..wwwwwwww..', '.wwddwwwwdw.', 'wwwwwwddwwww', '.wwdwwwwwww.', '..wwwwwwww..'];
  var PILE = ['....cc....', '...cccc...', '..wwwwww..', '.wwdwwdww.', 'wwwwwwwwww', '.wdwwwwdw.', 'wwwwwwwwww', '.wwdwwdww.', 'wwwwwwwwww', '.wwwwwwww.'];
  var HAT = ['..yyyy..', '.yyyyyy.', 'yyrrrryy', 'yyyyyyyy'];
  var GULL = [['w.....w', '.w...w.', '..w.w..', '...w...'], ['.......', 'ww...ww', '..w.w..', '...w...']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var course, dist, py, vy, grounded, jumpFrom, bigJump, stun, si, hats, score, cleared, bigs, hits;
  var ready, halt, over, won, endT, resT, sent, prevBest, elapsed, lastCross;

  function buildCourse(spec) {
    var out = [];
    for (var i = 0; i < spec.length; i++) {
      var t = spec[i][0], x = spec[i][1];
      out.push({ type: t, x: x, done: false, hit: false });
      if (t === 'kick') out.push({ type: 'tall', x: x + speedAt(x) * 0.385, done: false, hit: false, warned: false });
    }
    return out;
  }
  function stageAt(x) { for (var i = 0; i < BOUNDS.length; i++) if (x < BOUNDS[i]) return i; return BOUNDS.length - 1; }
  function speedAt(x) { return SPEEDS[stageAt(x)]; }

  function initGame() {
    course = buildCourse(COURSE_SPEC);
    dist = 0; py = 0; vy = 0; grounded = true; jumpFrom = 0; bigJump = false; stun = 0; si = 0;
    hats = HATS; score = 0; cleared = 0; bigs = 0; hits = 0; elapsed = 0; lastCross = 0;
    ready = 0.8; halt = null; over = false; won = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
  }

  function nearKick() {
    for (var i = 0; i < course.length; i++) {
      var o = course[i];
      if (o.type === 'kick' && Math.abs(dist - o.x) <= KZONE) return o;
    }
    return null;
  }

  // ── 跳ぶ(プレイ・デモ共通) ──
  function tryJump(vol) {
    if (!grounded || stun > 0) { game.audio.tone(220, 0.04, { wave: 'triangle', volume: 0.03 * vol }); return false; }
    var k = nearKick();
    grounded = false; jumpFrom = dist; bigJump = !!k;
    vy = k ? VJ_BIG : VJ;
    if (k) {
      game.audio.play('se_powerup', 0.4 * vol);
      game.fx.burst(PX, groundY(PX), { color: SAND, count: 14, speed: 360 });
    } else {
      game.audio.play('se_jump', 0.35 * vol);
      game.fx.burst(PX, groundY(PX), { color: SAND, count: 6, speed: 200 });
    }
    return true;
  }

  // ── 走りの1フレーム(プレイ・デモ共通)。ぶつかった物を返す ──
  function stepRun(dt, vol, speedOverride) {
    var sp = speedOverride || speedAt(dist);
    if (stun > 0) { stun -= dt; sp *= 0.4; }
    dist += sp * dt;
    if (!grounded) {
      py += vy * dt; vy -= G * dt;
      if (py <= 0) { py = 0; vy = 0; grounded = true; game.audio.tone(140, 0.06, { wave: 'triangle', volume: 0.05 * vol }); }
    }
    for (var i = 0; i < course.length; i++) {
      var o = course[i];
      if (o.done || o.hit || o.type === 'kick') continue;
      if (o.type === 'tall' && !o.warned && o.x - dist < 6.5) {
        o.warned = true;
        game.audio.tone(880, 0.08, { wave: 'square', volume: 0.05 * vol });
        game.audio.tone(660, 0.12, { wave: 'square', volume: 0.04 * vol });
      }
      var h = o.type === 'tall' ? TALL_H : LOW_H;
      if (Math.abs(o.x - dist) < COLL && py < h && stun <= 0) { o.hit = true; return o; }
      if (o.x + COLL < dist) {
        o.done = true;
        if (stun > 0) continue;
        var sx = PX + (o.x - dist) * U, sy = groundY(sx) - 40;
        if (o.type === 'tall') {
          if (state === S.PLAYING) { score += 250; bigs++; }
          game.feedback.good(sx, sy - 120, { text: 'NICE', color: CLOTH, count: 14, volume: 0.5 * vol });
        } else {
          var close = o.x - jumpFrom <= 1.1;
          if (state === S.PLAYING) score += close ? 150 : 100;
          game.feedback.good(sx, sy - 60, { text: close ? 'PERFECT' : 'GOOD', color: close ? CLOTH : SEA, count: close ? 12 : 7, volume: 0.45 * vol });
        }
        if (state === S.PLAYING) cleared++;
      }
    }
    return null;
  }

  function crossStage(vol) {
    var s = stageAt(dist);
    if (s !== si) {
      si = s;
      if (state === S.PLAYING) {
        score += 300;
        game.fx.popup('+300', W / 2, H * 0.36, { color: CLOTH, size: 70 });
        game.audio.play('se_milestone', 0.5 * vol);
        for (var i = 0; i < 4; i++) game.fx.burst(W * (0.2 + i * 0.2), H * 0.3, { color: i % 2 ? CREAM : CLOTH, count: 10, speed: 300 });
      }
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += hats * 200;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.1 + i * 0.16), H * (0.3 + (i % 2) * 0.1), { color: i % 2 ? CREAM : SEA, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { logs: cleared, big: bigs, hits: hits, meters: Math.floor(Math.min(dist, GOAL)) };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    tryJump(1);
  });

  // ── 描画 ──
  function bumpAt(sx) {
    var b = 0;
    for (var i = 0; i < course.length; i++) {
      var o = course[i];
      if (o.type !== 'kick') continue;
      var kx = PX + (o.x - dist) * U, d = (sx - kx) / (U * 0.95);
      if (d > -1 && d < 1) b = Math.max(b, (1 - d * d) * 0.38 * U);
    }
    return b;
  }
  function groundY(sx) { return GY + (sx - PX) * SLOPE - bumpAt(sx); }

  function drawWorld() {
    game.draw.gradient(0, H, [[0, SKY], [0.3, HAZE], [0.5, PALE], [1, PALE]]);
    game.draw.circle(W * 0.8, H * 0.12, 90, CREAM);
    // 遠景: 海と遠い砂丘(ゆっくり流れる)
    game.draw.rect(0, H * 0.25, W, 46, SEA, 0.55);
    for (var wv = 0; wv < 6; wv++) game.draw.rect(((wv * 210 + game.time.elapsed * 25) % (W + 100)) - 50, H * 0.255 + (wv % 2) * 14, 60, 4, WHITE, 0.6);
    for (var d = 0; d < 6; d++) {
      var dx = ((d * 260 - dist * 12) % (W + 520) + W + 520) % (W + 520) - 260;
      game.draw.circle(dx, H * 0.44 + (d % 2) * 30, 210 + (d % 3) * 40, '#d0bc90');
    }
    for (var gl = 0; gl < 2; gl++) {
      var gx = ((gl * 500 + game.time.elapsed * 60) % (W + 200)) - 100;
      game.draw.sprite(GULL[Math.floor(game.time.elapsed * 4 + gl) % 2], { w: WHITE }, gx, H * (0.17 + gl * 0.05), 7, { anchor: 'center' });
    }
    // 浜(ゴールが近づくと右下に海が来る)
    var seaX = PX + (GOAL - dist) * U;
    // 斜面: 縦の帯で塗る
    for (var x = 0; x < W; x += 12) {
      var gy = groundY(x + 6);
      var col = x + 6 > seaX ? SEA : SAND;
      game.draw.rect(x, gy, 12, H - gy, col);
      if (x + 6 <= seaX) game.draw.rect(x, gy, 12, 8, PALE);
    }
    // 風紋(流れる斜線)
    for (var r = 0; r < 10; r++) {
      var rx = ((r * 150 - dist * U) % W + W) % W, ry = groundY(rx) + 60 + (r % 3) * 70;
      game.draw.line(rx, ry, rx + 60, ry + 16, SANDD, 5);
    }
    // 砂丘の境目の旗竿
    for (var b = 0; b < BOUNDS.length; b++) {
      var bx = PX + (BOUNDS[b] - dist) * U;
      if (bx < -50 || bx > W + 50) continue;
      var by = groundY(bx);
      game.draw.line(bx, by, bx, by - 260, WOOD, 10);
      game.draw.rect(bx, by - 260, 70, 44, b === BOUNDS.length - 1 ? SEA : CREAM);
    }
  }

  function drawObstacles(hl) {
    for (var i = 0; i < course.length; i++) {
      var o = course[i];
      var sx = PX + (o.x - dist) * U;
      if (sx < -150 || sx > W + 150) continue;
      var gy = groundY(sx);
      if (o.type === 'kick') {
        var ready2 = Math.abs(dist - o.x) <= KZONE && grounded;
        game.draw.line(sx + 40, gy - 10, sx + 40, gy - 150, WOOD, 6);
        var flap = Math.sin(game.time.elapsed * 10) * 8;
        game.draw.rect(sx + 40, gy - 150, 56 + flap, 32, ready2 ? CREAM : CLOTH);
        if (ready2) game.draw.circle(sx, gy - 10, 70, CREAM, 0.35);
        continue;
      }
      var isHalt = halt && halt.o === o;
      var sc = isHalt ? 1 + hl * 0.5 : 1;
      game.draw.rect(sx - 60, gy - 6, 120, 12, INK, 0.2);
      if (o.type === 'low') {
        game.draw.sprite(LOG, { w: isHalt ? WHITE : o.hit ? '#9a8a78' : WOOD, d: INK }, sx, gy - 18 * sc, Math.round(11 * sc), { anchor: 'center' });
      } else {
        var warn = !o.done && !o.hit && o.x - dist < 6.5 && Math.floor(game.time.elapsed * 8) % 2 === 0;
        game.draw.sprite(PILE, { w: isHalt ? WHITE : o.hit ? '#9a8a78' : WOOD, d: INK, c: warn ? CREAM : CLOTH }, sx, gy - 84 * sc, Math.round(17 * sc), { anchor: 'center' });
      }
      if (isHalt) game.draw.circle(sx, gy - 60, 90 * sc, WHITE, 0.35 * hl);
    }
  }

  function drawBoy() {
    var gy = groundY(PX);
    var shadowW = Math.max(30, 70 - py * 20);
    game.draw.rect(PX - shadowW, gy - 4, shadowW * 2, 10, INK, 0.25);
    var fr = stun > 0 ? 3 : !grounded ? 2 : Math.floor(game.time.elapsed * 8) % 2;
    var y = gy - py * U - 66;
    game.draw.sprite(BOY[fr], BOY_PAL, PX, y, 12, { anchor: 'center' });
    if (grounded && stun <= 0) for (var s = 0; s < 3; s++) game.draw.circle(PX - 70 - s * 30, gy - 6 - s * 10 - Math.sin(game.time.elapsed * 20 + s) * 6, 10 - s * 2, PALE, 0.8);
  }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawHud() {
    for (var i = 0; i < HATS; i++) game.draw.sprite(HAT, { y: i < hats ? '#e8c868' : '#9a9488', r: i < hats ? CLOTH : '#7a746a' }, 70 + i * 90, 90, 9, { anchor: 'center' });
    big(String(score), W / 2, 112, 68, WHITE);
    for (var s = 0; s < BOUNDS.length; s++) game.draw.circle(W - 210 + s * 70, 90, 24, s < si ? CLOTH : s === si ? CREAM : '#9a9488');
  }

  function drawProgress() {
    // 親指ゾーン: 3つの砂丘の道のり
    var x0 = 90, x1 = W - 90, y = H * 0.9;
    game.draw.rect(x0, y - 14, x1 - x0, 28, INK, 0.25);
    var prev = 0;
    for (var b = 0; b < BOUNDS.length; b++) {
      var bx = x0 + (x1 - x0) * BOUNDS[b] / GOAL;
      game.draw.rect(x0 + (x1 - x0) * prev / GOAL, y - 10, bx - (x0 + (x1 - x0) * prev / GOAL) - 6, 20, b < si ? CLOTH : CREAM, 0.8);
      prev = BOUNDS[b];
    }
    var px = x0 + (x1 - x0) * Math.min(1, dist / GOAL);
    game.draw.sprite(HAT, { y: '#e8c868', r: CLOTH }, px, y - 40, 8, { anchor: 'center' });
    big(Math.floor(Math.min(dist, GOAL)) + ' / ' + GOAL, W / 2, H * 0.86, 40, INK);
  }

  // ── ATTRACT デモ: 流木を跳ぶ → こぶで大跳び → 最後の流木はわざと遅れてぶつかる ──
  var demo = { t: 0, press: 0, haltT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) {
      course = buildCourse(DEMO_SPEC); dist = 0; py = 0; vy = 0; grounded = true; stun = 0; si = 0; demo.haltT = 0; halt = null;
    }
    if (demo.press > 0) demo.press -= dt;
    if (demo.haltT > 0) { demo.haltT -= dt; if (demo.haltT <= 0) { halt = null; stun = 0.6; game.feedback.bad(PX + 40, groundY(PX) - 80, { text: 'MISS', volume: 0.3, shake: 4 }); } return; }
    if (dist > 25) return;
    for (var i = 0; i < course.length; i++) {
      var o = course[i];
      if (o.done || o.hit) continue;
      if (o.type === 'kick' && Math.abs(dist - o.x) < 0.15 && grounded) { demo.press = 0.2; tryJump(0.3); break; }
      if (o.type === 'low' && o.x < 20 && o.x - dist <= 1.0 && o.x - dist > 0.6 && grounded) { demo.press = 0.2; tryJump(0.3); break; }
    }
    var hit = stepRun(dt, 0.3, 6);
    if (hit) { halt = { t: 0.45, max: 0.45, o: hit }; demo.haltT = 0.45; }
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var hlA = halt ? Math.max(0, demo.haltT / 0.45) : 0;
      drawWorld();
      drawObstacles(hlA);
      drawBoy();
      game.draw.hand(W * 0.62, H * 0.8 + Math.sin(game.time.elapsed * 3) * 8, { press: demo.press > 0, scale: 15 });
      big(TITLE, W / 2, H * 0.07, 104, CLOTH);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 42, INK);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.96, 46, CLOTH);
      else big('INSERT COIN', W / 2, H * 0.96, 40, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.2) sendEnd();
      drawWorld();
      drawObstacles(0);
      drawBoy();
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, INK, 0.75);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.17, 104, won ? CREAM : CLOTH);
      big('SCORE ' + score, W / 2, H * 0.22, 56, WHITE);
      big(cleared + '   ★' + bigs + '   ' + Math.floor(Math.min(dist, GOAL)) + ' / ' + GOAL, W / 2, H * 0.265, 44, CREAM);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 60, CREAM);
      else big('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.31, 42, PALE);
      if (!won) big('あと' + Math.max(1, Math.ceil(GOAL - dist)) + 'm!', W / 2, H * 0.355, 58, CLOTH);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.96, 40, WHITE);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    if (over) {
      endT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        var o = halt.o, sx = PX + (o.x - dist) * U;
        halt = null; hats--; hits++; stun = 0.6;
        game.feedback.bad(sx, groundY(sx) - 80, { text: 'MISS' });
        game.audio.play('se_break', 0.35);
        if (hats <= 0) finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      elapsed += dt;
      var hit = stepRun(dt, 1);
      crossStage(1);
      if (hit) { halt = { t: 0.45, max: 0.45, o: hit }; game.fx.flash(WHITE, 0.12); }
      else if (dist >= GOAL) finish(true);
      else if (elapsed >= TIME_LIMIT) finish(false);
    }

    drawWorld();
    drawObstacles(hl);
    drawBoy();
    drawHud();
    drawProgress();
    if (dist < 5 && !over && ready <= 0) game.draw.hand(W * 0.62, H * 0.8, { press: Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 12, alpha: 0.5 });
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, CLOTH);
  });

  game.onStart(function () {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 1.5], ['R', 0.5],
      ['D5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 1], ['B4', 1], ['G4', 2],
    ], { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: [['G2', 1], ['D3', 1], ['C3', 1], ['D3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
