// I-GBA-0025v2-sandbox-flag-sling.js
// 砂場の旗落とし — ゴムのパチンコ玩具を引く向きと強さで木の実を放り、奥の砂山に立てた小旗を倒していく
// 操作: 画面下半分を押してそのまま下へ引き、離すと木の実が飛ぶ。引く長さ=飛ぶ距離、左右へ引くと逆向きへ飛ぶ。引いている間は弧の出だしだけ点線で見える
// 終わり: 18秒・木の実9個以内に3波5本の小旗を全部倒せばCLEAR。木の実が尽きる/時間切れでGAME OVER。最後の波は吹き流しが示す横風で流される
// @mechanic: slingshot
// @theme: after_rain_park_sandbox_sling
// 世界観: 雨上がりの公園の砂場で、少年がゴムのパチンコ玩具で拾った木の実を飛ばし、遠近の砂山に立てた小旗を水たまりを越えて倒していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 倒した旗の数・使った木の実の数・スコア
// スタイル: 2000s BILLBOARD 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 物は板(sprite)のまま距離で px スケールを変え、真下に楕円の接地影。奥ほど霞ませる
  var STYLE = { bg: ['#9fc8e8', '#e8f2f4'], main: ['#e6c98e', '#c49a5c', '#5f9e4a'], accent: ['#ff5a3c', '#ffffff'] };
  var SAND = STYLE.main[0], SAND_D = STYLE.main[1], LEAF = STYLE.main[2], RED = STYLE.accent[0];

  var LOGO = 'SANDBOX SLING';
  var TOTAL_FLAGS = 5;
  var ACORNS = 9;
  var TIME_LIMIT = 18;
  var MAXPULL = 380;
  var FLAG_H = 1.0;

  var CX = W * 0.5;
  var HORIZON = H * 0.33, FOCAL = 700, CAM_H = 1.7;
  var D0 = 1.4;
  var POUCH_X = CX, POUCH_Y = H * 0.775;

  var WAVES = [
    { flags: [[0.3, 4.2]], wind: 0 },
    { flags: [[-1.1, 5.4], [0.9, 6.6]], wind: 0 },
    { flags: [[-0.5, 7.6], [1.2, 8.6]], wind: 1 },
  ];
  var PUDDLES = [[-0.8, 3.3, 0.6], [1.4, 5.0, 0.5], [0.1, 7.0, 0.7]];

  var MODE = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = MODE.ATTRACT;

  // ── スプライト ──
  var BOY = [
    ['...RRRR...', '..RRRRRR..', '.RRRRRRRR.', '..HHHHHH..', '..HHHHHH..', '...SSSS...', '.TTTTTTTT.', 'TTTTTTTTTT', 'TTTTTTTTTT', 'S.TTTTTT.S', '..BBBBBB..', '..BB..BB..'],
    ['...RRRR...', '..RRRRRR..', '.RRRRRRRR.', 'S.HHHHHH.S', 'S.HHHHHH.S', 'TS.SSSS.ST', '.TTTTTTTT.', 'TTTTTTTTTT', 'TTTTTTTTTT', '..TTTTTT..', '..BBBBBB..', '..BB..BB..'],
  ];
  var BOY_PAL = { R: '#ff5a3c', H: '#4a3020', S: '#f0c090', T: '#3a8ad8', B: '#2a3a6a' };
  var NUT = ['.CCCC.', 'CCCCCC', '.NNNN.', 'NKNNKN', 'NNNNNN', '.NNNN.', '..NN..'];
  var NUT_PAL = { C: '#7a5230', N: '#c88a48', K: '#2a1a10' };
  var FLAG = [
    ['S.......', 'SPPPP...', 'SPPPPPP.', 'SPPPP...', 'S.......', 'S.......', 'S.......', 'S.......', 'S.......', 'S.......'],
    ['........', '...PPP..', '..SPPPPP', '..SPPP..', '..S.....', '.S......', '.S......', 'S.......', 'S.......', 'S.......'],
    ['........', '........', '........', '........', '........', '........', '.....PP.', '....PPPP', 'SSSSSSPP', '........'],
  ];
  var FLAG_PAL = { S: '#6a4a2a', P: RED };
  var TREE = ['...GGGG...', '..GGGGGG..', '.GGGGGGGG.', 'GGGGGGGGGG', 'GGGGGGGGGG', '.GGGGGGGG.', '..GGGGGG..', '....TT....', '....TT....', '....TT....'];

  // ── 投影(世界座標 x=左右m / d=奥行きm / h=高さm → 画面) ──
  function proj(x, d, h) {
    var k = FOCAL / d;
    return { x: CX + x * k, y: HORIZON + (CAM_H - h) * k, k: k };
  }
  function oval(x, y, rx, ry, col, a, half) {
    var step = Math.max(2, Math.round(ry / 5));
    var end = half ? 0 : ry;
    for (var yy = -ry; yy < end; yy += step) {
      var t = (yy + step / 2) / ry;
      var hw = rx * Math.sqrt(Math.max(0, 1 - t * t));
      game.draw.rect(x - hw, y + yy, hw * 2, step, col, a);
    }
  }

  // ── 射的場モデル(本番とデモで別インスタンス) ──
  function makeRange(wind) { return { flags: [], shot: null, wind: wind || 0 }; }
  function addFlag(R, x, d) { R.flags.push({ x: x, d: d, state: 'up', fallT: 0, riseT: 0.45 }); }

  function pullToShot(dx, dy) {
    var len = Math.min(MAXPULL, Math.sqrt(dx * dx + dy * dy));
    var P = len / MAXPULL;
    var dir = Math.max(-0.6, Math.min(0.6, Math.atan2(-dx, Math.max(20, dy))));
    var dl = 2.2 + P * 7.6;
    return { P: P, dir: dir, dl: dl, xl: Math.tan(dir) * (dl - D0), T: 0.5 + 0.45 * P, hmax: 0.8 + 1.6 * P };
  }
  function shotAt(R, sp, s) {
    var drift = R.wind * s * (sp.dl - D0) / 8;
    return { x: sp.xl * s + drift, d: D0 + (sp.dl - D0) * s, h: 0.05 + 4 * sp.hmax * s * (1 - s) };
  }
  function launch(R, dx, dy) {
    var sp = pullToShot(dx, dy);
    R.shot = { sp: sp, s: 0, prev: shotAt(R, sp, 0) };
  }
  // 1フレーム進める。戻り値: null / {kind:'hit', flag} / {kind:'land', x, d, puddle}
  function stepFlight(R, dt) {
    for (var i = 0; i < R.flags.length; i++) {
      var f = R.flags[i];
      if (f.riseT > 0) f.riseT = Math.max(0, f.riseT - dt);
      if (f.state === 'fall') { f.fallT += dt; if (f.fallT > 0.5) f.state = 'down'; }
    }
    var S = R.shot;
    if (!S) return null;
    S.s = Math.min(1, S.s + dt / S.sp.T);
    var cur = shotAt(R, S.sp, S.s);
    for (var j = 0; j < R.flags.length; j++) {
      var fl = R.flags[j];
      if (fl.state !== 'up' || fl.riseT > 0) continue;
      if (S.prev.d < fl.d && cur.d >= fl.d) {
        var u = (fl.d - S.prev.d) / Math.max(0.0001, cur.d - S.prev.d);
        var hx = S.prev.x + (cur.x - S.prev.x) * u, hh = S.prev.h + (cur.h - S.prev.h) * u;
        if (hh < FLAG_H && Math.abs(hx - fl.x) < 0.5) {
          fl.state = 'fall'; fl.fallT = 0; R.shot = null;
          return { kind: 'hit', flag: fl };
        }
      }
    }
    S.prev = cur;
    if (S.s >= 1) {
      R.shot = null;
      for (var k = 0; k < R.flags.length; k++) {
        var g = R.flags[k];
        if (g.state === 'up' && g.d > cur.d && g.d - cur.d < 0.5 && Math.abs(g.x - cur.x) < 0.5) {
          g.state = 'fall'; g.fallT = 0;
          return { kind: 'hit', flag: g };
        }
      }
      var pud = false;
      for (var p = 0; p < PUDDLES.length; p++) {
        var q = PUDDLES[p];
        if (Math.abs(cur.x - q[0]) < q[2] && Math.abs(cur.d - q[1]) < q[2] * 0.6) pud = true;
      }
      return { kind: 'land', x: cur.x, d: cur.d, puddle: pud };
    }
    return null;
  }
  function standing(R) {
    var n = 0;
    for (var i = 0; i < R.flags.length; i++) if (R.flags[i].state === 'up') n++;
    return n;
  }

  // ── 描画 ──
  function drawYard(R, windShow) {
    game.draw.gradient(0, HORIZON + 4, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    game.draw.circle(W * 0.82, H * 0.13, 70, '#fffbe8', 0.9);
    game.draw.circle(W * 0.82, H * 0.13, 120, '#fffbe8', 0.25);
    // 遠景の木(板)と遊具のシルエット
    for (var t = 0; t < 5; t++) game.draw.sprite(TREE, { G: '#8fbf8a', T: '#9a8a7a' }, W * (0.08 + t * 0.21), HORIZON - 70, 12, { anchor: 'center', alpha: 0.75 });
    game.draw.rect(W * 0.18, HORIZON - 120, 8, 120, '#b8c4cc');
    game.draw.rect(W * 0.3, HORIZON - 120, 8, 120, '#b8c4cc');
    game.draw.rect(W * 0.18, HORIZON - 124, W * 0.12 + 8, 8, '#b8c4cc');
    game.draw.gradient(HORIZON, H, [[0, '#d9c49c'], [0.4, SAND], [1, '#d8b678']]);
    // 砂場の木枠(消失点へ収束)
    var l0 = proj(-2.6, 9.8, 0), l1 = proj(-2.6, 1.6, 0), r0 = proj(2.6, 9.8, 0), r1 = proj(2.6, 1.6, 0);
    game.draw.line(l0.x, l0.y, l1.x, l1.y, '#9a6a3a', 14);
    game.draw.line(r0.x, r0.y, r1.x, r1.y, '#9a6a3a', 14);
    game.draw.line(l0.x, l0.y, r0.x, r0.y, '#9a6a3a', 6);
    for (var d = 2; d < 10; d += 1.2) {
      var a = proj(-2.4, d, 0), b = proj(2.4, d, 0);
      game.draw.rect(a.x, a.y, b.x - a.x, 2, SAND_D, 0.25);
    }
    // 水たまり
    for (var p = 0; p < PUDDLES.length; p++) {
      var q = PUDDLES[p], c = proj(q[0], q[1], 0);
      oval(c.x, c.y, q[2] * c.k, q[2] * c.k * 0.22, '#8fb4cc', 0.85);
      oval(c.x - q[2] * c.k * 0.2, c.y - 3, q[2] * c.k * 0.4, q[2] * c.k * 0.06, '#ffffff', 0.6);
    }
    // 吹き流し(横風の向きと強さ)
    var pole = proj(-2.8, 3.2, 0), top = proj(-2.8, 3.2, 1.6);
    game.draw.line(pole.x, pole.y, top.x, top.y, '#7a7a7a', 6);
    var dirW = windShow && R.wind ? (R.wind > 0 ? 1 : -1) : 0;
    for (var s = 0; s < 6; s++) {
      var col = s % 2 ? '#ffffff' : RED;
      if (dirW) {
        var flapW = Math.sin(game.time.elapsed * 16 + s) * 5;
        game.draw.rect(top.x + (dirW > 0 ? s * 30 : -(s + 1) * 30), top.y + flapW, 30, 14, col, 0.95);
      } else {
        var sway = Math.sin(game.time.elapsed * 3 + s * 0.6) * (2 + s * 2);
        game.draw.rect(top.x + 2 + sway, top.y + s * 14, 12, 14, col, 0.95);
      }
    }
  }

  function drawFlagsAndShot(R, hl, hk) {
    var items = [];
    for (var i = 0; i < R.flags.length; i++) items.push({ d: R.flags[i].d, f: R.flags[i] });
    if (R.shot) items.push({ d: shotAt(R, R.shot.sp, R.shot.s).d, shot: true });
    items.sort(function (a, b) { return b.d - a.d; });
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      if (it.f) {
        var f = it.f, g = proj(f.x, f.d, 0);
        var fog = Math.max(0, Math.min(0.45, (f.d - 3) * 0.06));
        oval(g.x, g.y + 2, 0.7 * g.k, 0.32 * g.k, SAND_D, 1, true);
        oval(g.x, g.y - 0.05 * g.k, 0.55 * g.k, 0.22 * g.k, '#f0d8a4', 0.6, true);
        oval(g.x, g.y + 4, 0.3 * g.k, 0.06 * g.k, '#5a4a30', 0.35);
        var rise = f.riseT > 0 ? f.riseT / 0.45 : 0;
        var fr = f.state === 'up' ? 0 : (f.state === 'fall' && f.fallT < 0.18 ? 1 : 2);
        var px = Math.max(2, g.k * 0.1);
        var bob = f.state === 'up' ? Math.sin(game.time.elapsed * 3 + f.x) * 0.02 * g.k : 0;
        game.draw.sprite(FLAG[fr], FLAG_PAL, g.x + px * 3, g.y - px * 5 + rise * px * 10 + bob, px, { anchor: 'center', alpha: 1 - fog * 0.6 });
        if (f.state === 'up' && f.riseT <= 0) {
          var bl = 0.35 + 0.35 * Math.sin(game.time.elapsed * 8);
          game.draw.rect(g.x - px * 0.5, g.y - px * 10, px * 8, 3, '#ffffff', bl);
        }
        if (hl === f) game.draw.circle(g.x + px * 2, g.y - px * 5, (0.6 + hk * 0.8) * g.k, '#ffffff', 0.6 * (1 - hk) + 0.15);
      } else {
        var c = shotAt(R, R.shot.sp, R.shot.s);
        var gs = proj(c.x, c.d, 0), gp = proj(c.x, c.d, c.h);
        oval(gs.x, gs.y, 0.16 * gs.k, 0.05 * gs.k, '#5a4a30', 0.4);
        game.draw.sprite(NUT, NUT_PAL, gp.x, gp.y, Math.max(2, gp.k * 0.024), { anchor: 'center' });
      }
    }
  }

  function drawSling(pdx, pdy, aiming, sp, loaded) {
    var bx = POUCH_X, by = POUCH_Y;
    var tipL = { x: bx - 80, y: by - 40 }, tipR = { x: bx + 80, y: by - 40 };
    var px = bx + pdx, py = by + pdy;
    // 弧の出だしの予告点線
    if (aiming && sp) {
      var R0 = { wind: 0 };
      for (var i = 1; i <= 8; i++) {
        var c = shotAt(R0, sp, i * 0.045), g = proj(c.x, c.d, c.h);
        game.draw.circle(g.x, g.y, 9 - i * 0.6, '#ffffff', 0.85 - i * 0.08);
      }
    }
    game.draw.line(tipL.x, tipL.y, px, py, '#7a3a2a', aiming ? 7 : 9);
    game.draw.line(tipR.x, tipR.y, px, py, '#7a3a2a', aiming ? 7 : 9);
    game.draw.rect(px - 26, py - 12, 52, 26, '#5a3a2a');
    if (aiming || loaded) game.draw.sprite(NUT, NUT_PAL, px, py - 4, 7, { anchor: 'center' });
    game.draw.line(bx, by + 110, bx, by + 20, '#9a6a3a', 26);
    game.draw.line(bx, by + 20, tipL.x, tipL.y, '#9a6a3a', 22);
    game.draw.line(bx, by + 20, tipR.x, tipR.y, '#9a6a3a', 22);
    game.draw.circle(tipL.x, tipL.y, 12, '#b88a5a');
    game.draw.circle(tipR.x, tipR.y, 12, '#b88a5a');
  }

  function drawBoy(aiming, mood) {
    var bob = Math.sin(game.time.elapsed * 3) * 5;
    var jump = mood === 'joy' ? -Math.abs(Math.sin(game.time.elapsed * 10)) * 50 : 0;
    var sag = mood === 'sad' ? 24 : 0;
    oval(CX, H * 0.985, 130, 22, '#5a4a30', 0.3);
    game.draw.sprite(BOY[aiming || mood === 'joy' ? 1 : 0], BOY_PAL, CX, H * 0.905 + bob + jump + sag, 18, { anchor: 'center' });
  }

  function ink(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: '#3a2a1a', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col || '#ffffff', bold: true, align: 'center' });
  }

  // ── 状態 ──
  var range, acorns, knocked, wave, waveIntro, drag, timeLeft, countIn, stop, over, won, endT, score, prevBest, leaves, celebT;

  function initGame() {
    range = makeRange(0);
    acorns = ACORNS; knocked = 0; wave = -1; waveIntro = 0; drag = null;
    timeLeft = TIME_LIMIT; countIn = 0.8; stop = null; over = false; won = false; endT = 0;
    score = 0; prevBest = game.best || 0; celebT = 0;
    leaves = [];
    nextWave();
  }

  function nextWave() {
    wave++;
    var wv = WAVES[wave];
    range.flags = [];
    range.wind = wv.wind ? (game.random(0, 1) < 0.5 ? -0.8 : 0.8) : 0;
    for (var i = 0; i < wv.flags.length; i++) addFlag(range, wv.flags[i][0], wv.flags[i][1]);
    waveIntro = 0.6;
    if (wave > 0) game.audio.play('se_jump', 0.3);
    if (range.wind) game.audio.tone('C4', 0.5, { wave: 'triangle', volume: 0.07, slide: 300 });
    if (wave > 0) judgeOutOfAmmo();
  }

  function haltThen(flag, after) { stop = { t: 0.45, max: 0.45, flag: flag, after: after }; }

  function firstStanding() {
    for (var i = 0; i < range.flags.length; i++) if (range.flags[i].state === 'up') return range.flags[i];
    return null;
  }

  function judgeOutOfAmmo() {
    if (acorns > 0 || range.shot || over || stop) return;
    var f = firstStanding();
    if (!f) return;
    game.audio.play('se_tap', 0.2);
    haltThen(f, function () {
      var g = proj(f.x, f.d, 0.5);
      game.feedback.bad(g.x, g.y, { text: 'MISS' });
      won = false; wrapUp();
    });
  }

  function handleFlight(ev) {
    if (!ev) return;
    if (ev.kind === 'hit') {
      knocked++;
      var g = proj(ev.flag.x, ev.flag.d, 0.6);
      var far = ev.flag.d > 7;
      score += 100 + Math.round(ev.flag.d * 20);
      game.audio.play('se_break', 0.35);
      game.feedback.good(g.x, g.y, { text: far ? 'PERFECT' : 'NICE', color: RED, count: 16 });
      if (standing(range) === 0) {
        if (knocked >= TOTAL_FLAGS) { won = true; wrapUp(); return; }
        if (wave === 1) {
          game.fx.popup(knocked + ' / ' + TOTAL_FLAGS, CX, H * 0.22, { color: '#ffffff', size: 64 });
          game.audio.play('se_milestone', 0.4);
        }
        waveIntro = -0.7;
      }
    } else {
      var l = proj(ev.x, ev.d, 0);
      game.fx.burst(l.x, l.y, { color: ev.puddle ? '#8fb4cc' : SAND_D, count: ev.puddle ? 16 : 10, speed: 260 });
      game.feedback.bad(l.x, l.y, { text: 'MISS', shake: 5 });
    }
    judgeOutOfAmmo();
  }

  // ── 入力 ──
  game.onPress(function (x, y) {
    if (mode === MODE.ATTRACT) { game.audio.play('se_coin', 0.45); mode = MODE.PLAYING; initGame(); return; }
    if (mode === MODE.RESULT) { game.audio.play('se_tap', 0.2); mode = MODE.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || stop || countIn > 0 || waveIntro !== 0 || range.shot || acorns <= 0 || y < H * 0.5) {
      game.audio.tone('A3', 0.05, { wave: 'square', volume: 0.05 });
      return;
    }
    drag = { x0: x, y0: y, dx: 0, dy: 0 };
    game.audio.play('se_tap', 0.15);
  });
  game.onMove(function (x, y) {
    if (mode !== MODE.PLAYING || !drag) return;
    var dx = x - drag.x0, dy = y - drag.y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > MAXPULL) { dx *= MAXPULL / len; dy *= MAXPULL / len; }
    var before = Math.floor(Math.sqrt(drag.dx * drag.dx + drag.dy * drag.dy) / 60);
    drag.dx = dx; drag.dy = dy;
    var after = Math.floor(Math.min(len, MAXPULL) / 60);
    if (after !== before) game.audio.tone(220 + after * 60, 0.03, { wave: 'triangle', volume: 0.05 });
  });
  game.onRelease(function (x, y) {
    if (mode !== MODE.PLAYING || !drag) return;
    var d = drag; drag = null;
    var len = Math.sqrt(d.dx * d.dx + d.dy * d.dy);
    if (len < 40 || d.dy < 25) { game.audio.tone('E3', 0.06, { wave: 'triangle', volume: 0.06 }); return; }
    acorns--;
    launch(range, d.dx, d.dy);
    game.audio.play('se_jump', 0.4);
    game.fx.burst(POUCH_X, POUCH_Y - 30, { color: '#ffffff', count: 6, speed: 160 });
  });

  function wrapUp() {
    if (over) return;
    over = true; drag = null;
    endT = 1.4;
    if (won) score += acorns * 60 + Math.floor(timeLeft * 10);
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash('#ffffff', 0.3);
  }

  function enterResult() {
    mode = MODE.RESULT;
    var stats = { flags: knocked, acornsUsed: ACORNS - acorns, timeLeft: Math.round(timeLeft * 10) / 10 };
    if (won) game.end.success(score, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT ゴースト実演(同じ射的モデル・同じ描画) ──
  var demo = { t: 0, R: null, hx: POUCH_X + 120, hy: POUCH_Y - 160, press: false, pdx: 0, pdy: 0, phase: 0 };
  var DEMO_CYCLE = 5.0;
  var DEMO_A = { dx: -11, dy: 114 }, DEMO_B = { dx: 21, dy: 46 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.R) {
      demo.R = makeRange(0); addFlag(demo.R, 0.3, 4.2); demo.R.flags[0].riseT = 0;
      demo.phase = 0; demo.pdx = 0; demo.pdy = 0;
    }
    var ev = stepFlight(demo.R, dt);
    if (ev && ev.kind === 'hit') { var g = proj(ev.flag.x, ev.flag.d, 0.6); game.feedback.good(g.x, g.y, { text: 'NICE', color: RED, count: 12, volume: 0.2 }); }
    if (ev && ev.kind === 'land') { var l = proj(ev.x, ev.d, 0); game.fx.burst(l.x, l.y, { color: '#8fb4cc', count: 14, speed: 240 }); game.feedback.bad(l.x, l.y, { text: 'MISS', volume: 0.15, shake: 3 }); }
    var aim = null, k;
    if (cyc < 0.4) aim = null;
    else if (cyc < 1.2) { k = (cyc - 0.4) / 0.8; aim = { dx: DEMO_A.dx * k, dy: DEMO_A.dy * k }; }
    else if (demo.phase === 0) { demo.phase = 1; launch(demo.R, DEMO_A.dx, DEMO_A.dy); game.audio.play('se_jump', 0.15); }
    if (cyc > 2.5 && demo.phase === 1) { demo.phase = 2; demo.R.flags[0].state = 'up'; demo.R.flags[0].riseT = 0.45; }
    if (cyc > 2.8 && cyc < 3.5) { k = (cyc - 2.8) / 0.7; aim = { dx: DEMO_B.dx * k, dy: DEMO_B.dy * k }; }
    else if (cyc >= 3.5 && demo.phase === 2) { demo.phase = 3; launch(demo.R, DEMO_B.dx, DEMO_B.dy); game.audio.play('se_jump', 0.15); }
    demo.press = !!aim;
    demo.pdx = aim ? aim.dx : demo.pdx * Math.max(0, 1 - dt * 12);
    demo.pdy = aim ? aim.dy : demo.pdy * Math.max(0, 1 - dt * 12);
    var tx = aim ? POUCH_X + aim.dx : POUCH_X + 120, ty = aim ? POUCH_Y + aim.dy : POUCH_Y - 140;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 12);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 12);
    return aim;
  }

  function stepLeaves(dt, wind) {
    if (wind && leaves.length < 8 && game.random(0, 1) < dt * 6) leaves.push({ x: wind > 0 ? -40 : W + 40, y: game.random(H * 0.36, H * 0.6), v: game.random(240, 380) });
    for (var i = leaves.length - 1; i >= 0; i--) {
      var lf = leaves[i];
      lf.x += (wind > 0 ? 1 : -1) * lf.v * dt;
      lf.y += Math.sin(game.time.elapsed * 6 + i) * 60 * dt;
      if (lf.x < -60 || lf.x > W + 60) leaves.splice(i, 1);
      else game.draw.rect(lf.x, lf.y, 22, 12, LEAF, 0.9);
    }
  }

  function drawHud() {
    ink(knocked + ' / ' + TOTAL_FLAGS, W * 0.2, 92, 54, '#ffffff');
    ink(String(score), CX, 92, 44, '#fff6c8');
    for (var i = 0; i < ACORNS; i++) game.draw.sprite(NUT, NUT_PAL, W * 0.62 + (i % 5) * 70, 70 + Math.floor(i / 5) * 56, 6, { anchor: 'center', alpha: i < acorns ? 1 : 0.2 });
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 182, W - 140, 22, '#3a2a1a', 0.35);
    game.draw.rect(70, 182, (W - 140) * fr, 22, low ? RED : '#ffffff');
  }

  game.onUpdate(function (dt) {
    if (mode === MODE.ATTRACT) {
      var aim = stepDemo(dt);
      drawYard(demo.R, false);
      drawFlagsAndShot(demo.R, null, 0);
      drawSling(demo.pdx, demo.pdy, !!aim, aim ? pullToShot(aim.dx, aim.dy) : null, !demo.R.shot);
      drawBoy(!!aim, '');
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      ink(LOGO, CX, H * 0.07, 76, '#ffffff');
      ink('HI-SCORE ' + (game.best > 0 ? game.best : '-'), CX, H * 0.12, 36, '#fff6c8');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('► 100円 投入 ◄', CX, H * 0.6, 48, '#ffffff');
      else ink('INSERT COIN', CX, H * 0.6, 40, '#fff6c8');
      return;
    }

    if (mode === MODE.RESULT) {
      drawYard(range, range.wind !== 0);
      drawFlagsAndShot(range, null, 0);
      drawSling(0, 0, false, null, false);
      drawBoy(false, won ? 'joy' : 'sad');
      ink(won ? 'CLEAR' : 'GAME OVER', CX, H * 0.2, 100, won ? '#ffffff' : RED);
      ink(knocked + ' / ' + TOTAL_FLAGS, CX, H * 0.27, 60, '#ffffff');
      ink('SCORE ' + score, CX, H * 0.47, 54, '#ffffff');
      if (won && score > prevBest) ink('NEW RECORD', CX, H * 0.53, 54, '#fff6c8');
      else ink('BEST ' + Math.max(prevBest, score), CX, H * 0.53, 40, '#fff6c8');
      if (!won) ink('あと' + (TOTAL_FLAGS - knocked) + '本!', CX, H * 0.6, 56, '#fff6c8');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', CX, H * 0.68, 40, '#ffffff');
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      stepFlight(range, dt);
      if (won) {
        celebT -= dt;
        if (celebT <= 0) { celebT = 0.16; game.fx.burst(game.random(W * 0.1, W * 0.9), game.random(H * 0.35, H * 0.65), { color: game.random(0, 1) < 0.5 ? RED : '#ffffff', count: 14, speed: 460 }); }
      }
      if (endT <= 0) { enterResult(); return; }
    } else if (stop) {
      stop.t -= dt;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.tone('G5', 0.12, { wave: 'square', volume: 0.1 });
    } else {
      timeLeft -= dt;
      if (waveIntro > 0) waveIntro = Math.max(0, waveIntro - dt);
      else if (waveIntro < 0) { waveIntro = Math.min(0, waveIntro + dt); if (waveIntro === 0) nextWave(); }
      handleFlight(stepFlight(range, dt));
      if (!over && !stop && timeLeft <= 0) {
        timeLeft = 0; drag = null;
        var f = firstStanding();
        haltThen(f, function () {
          game.feedback.bad(CX, H * 0.45, { text: 'TIME UP' });
          won = false; wrapUp();
        });
      }
    }

    var sp = drag ? pullToShot(drag.dx, drag.dy) : null;
    drawYard(range, range.wind !== 0);
    drawFlagsAndShot(range, stop ? stop.flag : null, stop ? 1 - stop.t / stop.max : 0);
    stepLeaves(dt, range.wind);
    drawSling(drag ? drag.dx : 0, drag ? drag.dy : 0, !!drag, sp, acorns > 0 && !range.shot);
    drawBoy(!!drag, over ? (won ? 'joy' : 'sad') : '');
    drawHud();
    if (countIn > 0) ink(countIn > 0.35 ? 'READY?' : 'GO!', CX, H * 0.5, 110, '#ffffff');
  });

  game.onStart(function () {
    game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 2],
      ['E5', 0.5], ['G5', 0.5], ['C6', 1], ['B5', 0.5], ['A5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 2]],
      { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 2], ['G2', 2], ['F2', 2], ['G2', 2], ['C3', 2], ['E3', 2], ['F2', 2], ['C3', 2]] });
    mode = MODE.ATTRACT;
    initGame();
  });
})(game);
