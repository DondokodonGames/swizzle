// I-DS-0001v2-seawall-trolley-gap-hop.js
// 海の高架トロッコ跳び — 海の上の高架線路を走り続ける点検トロッコで、途切れたレールの切れ目をタップで跳び越え、広い切れ目は空中でもう一度タップしてひと伸びして終着駅まで進む
// 操作: トロッコは自動で奥へ走る。タップで跳ぶ(レールの上にいる時だけ)。跳んでいる間にもう一度タップすると1回だけ空中でひと伸びする。切れ目の手前には紅白の板が立ち、板が2枚並ぶのは広い切れ目(ひと伸びが要る)。切れ目の縁ぎりぎりで跳ぶほど高得点
// 終わり: 3つの区間を走り抜けて終着駅に着けばCLEAR。切れ目に落ちるたび予備の車輪を1つ失い、2つ失うとGAME OVER
// @mechanic: camera_run
// @theme: seaside_viaduct_trolley_gap_hop
// 世界観: 朝の海沿いの高架線路で、点検係を乗せた小型トロッコが、嵐で途切れたレールの切れ目を跳び越え、ひと伸びして広い切れ目も渡りながら駅から駅へ終着駅まで走る
// 残るもの: 正誤(CLEAR/GAME OVER) + 越えた切れ目の数・ひと伸びで越えた数・ぎりぎり跳びの数・落ちた数・スコア
// スタイル: MODE7 PSEUDO

(function (game) {
  var STYLE = { bg: ['#7ec8f0', '#d8f0f8', '#2a78b8'], main: ['#1e5a9a', '#3a8ac8', '#5a4a3a'], accent: ['#e8382a', '#f8f4e8', '#ffc83a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var SKY = STYLE.bg[0], HAZE = STYLE.bg[1], SEA = STYLE.bg[2];
  var SEA1 = STYLE.main[0], SEA2 = STYLE.main[1], TIE = STYLE.main[2];
  var RED = STYLE.accent[0], WHITE = STYLE.accent[1], GOLD = STYLE.accent[2];
  var INK = '#101820', RAIL = '#c8ccd4', PILLAR = '#7a8a9a';

  var TITLE = 'SEA RAIL HOP';
  var TIME_LIMIT = 22;
  var SPARES = 2;
  var HOR = H * 0.3, YB = H * 0.74, Z0 = 3, HW0 = 250, CX = W / 2;
  var VJ = 8, BOOST = 6, GRAV = 32;
  var NARROW = 1.6, WIDE = 3.8;
  var SPEEDS = [7, 8.5, 10];
  var BOUNDS = [36, 76, 128];
  var GOAL = 128;
  var COURSE_SPEC = [
    ['n', 8], ['n', 15], ['w', 22], ['n', 30],
    ['n', 42], ['w', 49], ['n', 56.5], ['n', 61], ['w', 68],
    ['w', 82], ['n', 91], ['n', 97.5], ['w', 104], ['n', 113], ['w', 119],
  ];
  var DEMO_SPEC = [['n', 6], ['w', 12], ['n', 19], ['w', 25]];

  var CART = [
    ['....kkkk....', '...kkkkkk...', '...cccccc...', '....cccc..l.', '..bbbbbbbbl.', '.bbbbbbbbbb.', 'mmmmmmmmmmmm', 'm.mmmmmmmm.m', '.ww......ww.', '.ww......ww.'],
    ['....kkkk....', '...kkkkkk...', '...cccccc...', '....cccc....', '..bbbbbbbbll', '.bbbbbbbbbb.', 'mmmmmmmmmmmm', 'm.mmmmmmmm.m', '.ww......ww.', '.ww......ww.'],
    ['c...kkkk...c', '.c.kkkkkk.c.', '..ccccccc...', '....cccc....', '..bbbbbbbb..', '.bbbbbbbbbb.', 'mmmmmmmmmmmm', 'm.mmmmmmmm.m', '.ww......ww.', '............'],
  ];
  var C_PAL = { k: GOLD, c: '#f0c8a0', b: '#2a5a9a', m: RED, w: INK, l: TIE };
  var WHEEL = ['.ww.', 'wiiw', 'wiiw', '.ww.'];
  var GULL = [['w...w', '.w.w.', '..w..'], ['.....', 'ww.ww', '..w..']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var gaps, dist, py, vy, grounded, boosted, jumpFrom, blink, si, spares, score, cleared, boosts, tight, falls, elapsed, pumpT;
  var ready, halt, over, won, endT, resT, sent, prevBest;

  function stageAt(x) { for (var i = 0; i < BOUNDS.length; i++) if (x < BOUNDS[i]) return i; return BOUNDS.length - 1; }
  function speedAt(x) { return SPEEDS[stageAt(x)]; }

  function buildGaps(spec) {
    var out = [];
    for (var i = 0; i < spec.length; i++) {
      var len = spec[i][0] === 'w' ? WIDE : NARROW;
      out.push({ wide: spec[i][0] === 'w', s: spec[i][1], e: spec[i][1] + len, done: false, fell: false, warned: false });
    }
    return out;
  }

  function initGame() {
    gaps = buildGaps(COURSE_SPEC);
    dist = 0; py = 0; vy = 0; grounded = true; boosted = false; jumpFrom = 0; blink = 0; si = 0;
    spares = SPARES; score = 0; cleared = 0; boosts = 0; tight = 0; falls = 0; elapsed = 0; pumpT = 0;
    ready = 0.8; halt = null; over = false; won = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
  }

  function gapAt(x) { for (var i = 0; i < gaps.length; i++) if (x > gaps[i].s && x < gaps[i].e) return gaps[i]; return null; }

  // ── 跳ぶ / ひと伸び(プレイ・デモ共通) ──
  function hop(vol) {
    if (grounded) {
      grounded = false; boosted = false; vy = VJ; jumpFrom = dist;
      game.audio.play('se_jump', 0.35 * vol);
      game.fx.burst(CX, YB, { color: WHITE, count: 6, speed: 200 });
      return 'jump';
    }
    if (!grounded && !boosted) {
      boosted = true; vy = Math.max(vy, 0) + BOOST;
      game.audio.play('se_powerup', 0.35 * vol);
      game.fx.burst(CX, YB - py * 40 + 40, { color: GOLD, count: 10, speed: 260 });
      return 'boost';
    }
    game.audio.tone(240, 0.04, { wave: 'triangle', volume: 0.03 * vol });
    return 'none';
  }

  // ── 走りの1フレーム(プレイ・デモ共通)。落ちた切れ目を返す ──
  function stepRun(dt, vol, sp) {
    var v = sp || speedAt(dist);
    dist += v * dt;
    pumpT += dt * v * 0.4;
    if (blink > 0) blink -= dt;
    if (!grounded) {
      py += vy * dt; vy -= GRAV * dt;
      if (py <= 0) {
        py = 0; vy = 0;
        if (!gapAt(dist)) { grounded = true; game.audio.tone(160, 0.05, { wave: 'square', volume: 0.06 * vol }); }
      }
    }
    for (var i = 0; i < gaps.length; i++) {
      var g = gaps[i];
      if (g.done || g.fell) continue;
      if (!g.warned && g.s - dist < 8) {
        g.warned = true;
        game.audio.tone(g.wide ? 1320 : 990, 0.07, { wave: 'square', volume: 0.04 * vol });
        if (g.wide) game.audio.tone(1320, 0.07, { wave: 'square', volume: 0.04 * vol });
      }
      if (dist > g.s && dist < g.e && py <= 0 && blink <= 0) { g.fell = true; grounded = false; return g; }
      if (dist >= g.e && grounded) {
        g.done = true;
        if (blink > 0) continue;
        var sx = CX, sy = YB - 200;
        if (g.wide) {
          if (state === S.PLAYING) { score += 250; boosts++; }
          game.feedback.good(sx, sy, { text: 'NICE', color: GOLD, count: 14, volume: 0.5 * vol });
        } else {
          var close = g.s - jumpFrom <= 0.8;
          if (state === S.PLAYING) { score += close ? 160 : 100; if (close) tight++; }
          game.feedback.good(sx, sy, { text: close ? 'PERFECT' : 'GOOD', color: close ? RED : WHITE, count: close ? 12 : 7, volume: 0.45 * vol });
        }
        if (state === S.PLAYING) cleared++;
      }
    }
    return null;
  }

  function crossStage() {
    var s = stageAt(dist);
    if (s !== si) {
      si = s;
      score += 300;
      game.fx.popup('+300', CX, H * 0.4, { color: GOLD, size: 72 });
      game.audio.play('se_milestone', 0.5);
      for (var i = 0; i < 4; i++) game.fx.burst(W * (0.2 + i * 0.2), H * 0.34, { color: i % 2 ? GOLD : WHITE, count: 10, speed: 300 });
    }
  }

  function respawn(g) {
    dist = g.e + 0.4; py = 0; vy = 0; grounded = true; boosted = false; blink = 0.5;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += spares * 200 + Math.max(0, Math.floor((TIME_LIMIT - elapsed) * 30));
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.1 + i * 0.16), H * (0.3 + (i % 2) * 0.08), { color: i % 2 ? GOLD : RED, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { gaps: cleared, boosted: boosts, edgeJumps: tight, falls: falls, meters: Math.floor(Math.min(dist, GOAL)) };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    hop(1);
  });

  // ── 描画(床は横1pxストリップ相当の帯を奥ほど圧縮) ──
  function zToY(z) { return HOR + (YB - HOR) * Z0 / (z + Z0); }
  function scl(z) { return Z0 / (z + Z0); }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HOR, [[0, SKY], [1, HAZE]]);
    game.draw.circle(W * 0.78, HOR - 150, 70, WHITE, 0.9);
    // 遠景の島影
    for (var k = 0; k < 4; k++) game.draw.circle(W * (0.1 + k * 0.28), HOR + 40, 90 + (k % 2) * 40, '#6aa0c0');
    for (var gl = 0; gl < 2; gl++) game.draw.sprite(GULL[Math.floor(t * 4 + gl) % 2], { w: WHITE }, ((gl * 480 + t * 70) % (W + 200)) - 100, HOR - 220 + gl * 60, 7, { anchor: 'center' });
    // 海の床(奥ほど帯が細い)
    for (var y = HOR; y < H; y += 6) {
      var z = Z0 * (YB - HOR) / Math.max(1, y - HOR) - Z0;
      var band = Math.floor((z + dist) * 0.8) % 2;
      game.draw.rect(0, y, W, 6, band ? SEA1 : SEA2);
    }
    game.draw.rect(0, HOR, W, 4, HAZE);
    for (var s = 0; s < 8; s++) {
      var sz = ((s * 3.7 - dist) % 30 + 30) % 30;
      var sy = zToY(sz), sc = scl(sz);
      game.draw.rect(CX + (s % 2 ? 1 : -1) * (300 + s * 40) * sc - 30 * sc, sy, 60 * sc, Math.max(2, 6 * sc), WHITE, 0.6);
    }
  }

  function inGapWorld(w) { for (var i = 0; i < gaps.length; i++) if (w > gaps[i].s && w < gaps[i].e) return gaps[i]; return null; }

  function drawTrack() {
    var base = Math.floor(dist);
    // 橋脚(奥から手前へ)
    for (var p = 34; p >= -1; p--) {
      var w = base + p;
      if (w % 3 !== 0 || inGapWorld(w)) continue;
      var z = w - dist; if (z < -0.9) continue;
      var y = zToY(z), sc = scl(z);
      game.draw.rect(CX - HW0 * sc * 1.3, y, 36 * sc, 150 * sc, PILLAR);
      game.draw.rect(CX + HW0 * sc * 1.3 - 36 * sc, y, 36 * sc, 150 * sc, PILLAR);
    }
    // 枕木
    for (var i = 34; i >= -1; i--) {
      var wi = base + i;
      if (inGapWorld(wi)) continue;
      var zi = wi - dist; if (zi < -0.9) continue;
      var yi = zToY(zi), si2 = scl(zi);
      game.draw.rect(CX - HW0 * si2 * 1.3, yi, HW0 * si2 * 2.6, Math.max(2, 18 * si2), TIE);
    }
    // レール(0.5刻みの線分、切れ目は描かない)
    for (var k = 60; k >= -2; k--) {
      var w0 = base + k * 0.5, w1 = w0 + 0.5;
      if (inGapWorld(w0 + 0.25)) continue;
      var z0 = w0 - dist, z1 = w1 - dist;
      if (z1 < -0.9) continue;
      z0 = Math.max(-0.9, z0);
      var y0 = zToY(z0), y1 = zToY(z1), s0 = scl(z0), s1 = scl(z1);
      for (var side = -1; side <= 1; side += 2) game.draw.line(CX + side * HW0 * s0, y0, CX + side * HW0 * s1, y1, RAIL, Math.max(2, 14 * s0));
    }
    // 切れ目の手前の紅白板(広い切れ目は2枚)
    for (var g = 0; g < gaps.length; g++) {
      var gp = gaps[g];
      var boards = gp.wide ? [gp.s - 1, gp.s - 1.8] : [gp.s - 1];
      for (var b = 0; b < boards.length; b++) {
        var zb = boards[b] - dist;
        if (zb < -0.5 || zb > 30) continue;
        var yb = zToY(zb), sb = scl(zb);
        var flash = zb < 6 && Math.floor(game.time.elapsed * 10) % 2 === 0;
        for (var sd = -1; sd <= 1; sd += 2) {
          var bx = CX + sd * HW0 * sb * 1.45;
          game.draw.line(bx, yb, bx, yb - 200 * sb, WHITE, Math.max(2, 10 * sb));
          for (var st = 0; st < 3; st++) game.draw.rect(bx - 50 * sb, yb - 200 * sb + st * 30 * sb, 100 * sb, 30 * sb, (st % 2 === 0) !== flash ? RED : WHITE);
        }
      }
    }
    // 駅のホーム(区間の境目と終着)
    for (var bd = 0; bd < BOUNDS.length; bd++) {
      var zs = BOUNDS[bd] - dist;
      if (zs < -1 || zs > 30) continue;
      var ys = zToY(zs), ss = scl(zs);
      game.draw.rect(CX + HW0 * ss * 1.6, ys - 60 * ss, 260 * ss, 60 * ss, bd === BOUNDS.length - 1 ? GOLD : WHITE);
      game.draw.rect(CX + HW0 * ss * 1.6 + 100 * ss, ys - 260 * ss, 20 * ss, 200 * ss, INK);
      game.draw.rect(CX + HW0 * ss * 1.6 + 40 * ss, ys - 300 * ss, 140 * ss, 60 * ss, bd === BOUNDS.length - 1 ? RED : SEA);
    }
  }

  function drawCart(hl) {
    var lift = py * 40;
    var shw = 150 * Math.max(0.4, 1 - py * 0.25);
    if (!gapAt(dist) || py > 0) game.draw.rect(CX - shw, YB + 6, shw * 2, 16, INK, 0.35);
    if (blink > 0 && Math.floor(blink * 12) % 2 === 0) return;
    var fr = !grounded ? 2 : Math.floor(pumpT * 2) % 2;
    var sc = hl > 0 ? 16 + Math.round(hl * 8) : 16;
    var y = YB - lift - 74;
    if (hl > 0) { game.draw.circle(CX, y, 160 * (1 + hl * 0.4), WHITE, 0.5 * hl); y += (1 - hl) * 60; }
    game.draw.sprite(CART[fr], hl > 0 ? { k: WHITE, c: WHITE, b: WHITE, m: WHITE, w: WHITE, l: WHITE } : C_PAL, CX, y, sc, { anchor: 'center' });
    if (boosted && !grounded) for (var p = 0; p < 3; p++) game.draw.circle(CX + (p - 1) * 60, y + 100 + p % 2 * 20, 16 - p * 3, GOLD, 0.7);
  }

  function drawHud() {
    for (var i = 0; i < SPARES; i++) game.draw.sprite(WHEEL, { w: i < spares ? INK : '#8a96a0', i: i < spares ? GOLD : '#b8c0c8' }, 70 + i * 74, 92, 14, { anchor: 'center' });
    big(String(score), W / 2, 112, 68, WHITE);
    for (var s = 0; s < BOUNDS.length; s++) game.draw.circle(W - 210 + s * 70, 90, 24, s < si ? GOLD : s === si ? WHITE : '#8aa8c0');
    // 親指ゾーン: 路線図
    var x0 = 90, x1 = W - 90, y = H * 0.9;
    game.draw.rect(x0, y - 8, x1 - x0, 16, INK, 0.5);
    for (var b = 0; b < BOUNDS.length; b++) game.draw.circle(x0 + (x1 - x0) * BOUNDS[b] / GOAL, y, 22, b < si ? GOLD : WHITE);
    for (var g = 0; g < gaps.length; g++) game.draw.rect(x0 + (x1 - x0) * gaps[g].s / GOAL - 3, y - 18, 6, 36, gaps[g].fell ? RED : gaps[g].done ? GOLD : gaps[g].wide ? RED : WHITE, 0.8);
    game.draw.circle(x0 + (x1 - x0) * Math.min(1, dist / GOAL), y, 16, RED);
    big(Math.floor(Math.min(dist, GOAL)) + ' / ' + GOAL, W / 2, H * 0.865, 40, WHITE);
  }

  // ── ATTRACT デモ: 狭い切れ目を跳ぶ → 広い切れ目は空中でひと伸び → 最後はひと伸びせずに落ちる ──
  var demo = { t: 0, press: 0, haltT: 0, haltG: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { gaps = buildGaps(DEMO_SPEC); dist = 0; py = 0; vy = 0; grounded = true; boosted = false; blink = 0; si = 0; demo.haltT = 0; halt = null; }
    if (demo.press > 0) demo.press -= dt;
    if (demo.haltT > 0) {
      demo.haltT -= dt;
      if (demo.haltT <= 0) { halt = null; game.feedback.bad(CX, YB - 140, { text: 'MISS', volume: 0.3, shake: 4 }); respawn(demo.haltG); }
      return;
    }
    if (dist > 31) return;
    for (var i = 0; i < gaps.length; i++) {
      var g = gaps[i];
      if (g.done || g.fell) continue;
      var lead = g.s - dist;
      if (grounded && lead > 0.3 && lead < 0.55) { demo.press = 0.18; hop(0.3); break; }
      if (!grounded && !boosted && g.wide && g.s < 24 && vy < 1 && dist < g.e) { demo.press = 0.18; hop(0.3); break; }
      break;
    }
    var fell = stepRun(dt, 0.3, 7);
    if (fell) { halt = { t: 0.45, max: 0.45 }; demo.haltT = 0.45; demo.haltG = fell; }
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var hlA = halt ? Math.max(0, demo.haltT / 0.45) : 0;
      drawWorld();
      drawTrack();
      drawCart(hlA);
      game.draw.hand(W * 0.74, H * 0.84 + Math.sin(game.time.elapsed * 3) * 8, { press: demo.press > 0, scale: 15 });
      big(TITLE, W / 2, H * 0.07, 100, RED);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 42, INK);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.96, 46, GOLD);
      else big('INSERT COIN', W / 2, H * 0.96, 40, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.2) sendEnd();
      drawWorld();
      drawTrack();
      drawCart(0);
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, INK, 0.8);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.17, 104, won ? GOLD : RED);
      big('SCORE ' + score, W / 2, H * 0.22, 56, WHITE);
      big(cleared + '   ★' + boosts + '   ' + Math.floor(Math.min(dist, GOAL)) + ' / ' + GOAL, W / 2, H * 0.265, 44, HAZE);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 60, GOLD);
      else big('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.31, 42, HAZE);
      if (!won) big('あと' + Math.max(1, Math.ceil(GOAL - dist)) + 'm!', W / 2, H * 0.355, 58, GOLD);
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
        var g = halt.g;
        halt = null; spares--; falls++;
        game.feedback.bad(CX, YB - 140, { text: 'MISS' });
        game.audio.play('se_break', 0.35);
        if (spares <= 0) finish(false);
        else respawn(g);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      elapsed += dt;
      var fell = stepRun(dt, 1);
      crossStage();
      if (fell) { halt = { t: 0.45, max: 0.45, g: fell }; game.fx.flash(WHITE, 0.12); }
      else if (dist >= GOAL && grounded) finish(true);
      else if (elapsed >= TIME_LIMIT) finish(false);
    }

    drawWorld();
    drawTrack();
    drawCart(hl);
    drawHud();
    if (dist < 6 && !over && ready <= 0) game.draw.hand(W * 0.74, H * 0.8, { press: Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 12, alpha: 0.5 });
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, RED);
  });

  game.onStart(function () {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1],
      ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1.5], ['R', 0.5],
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['C6', 1], ['G5', 2],
    ], { tempo: 156, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
