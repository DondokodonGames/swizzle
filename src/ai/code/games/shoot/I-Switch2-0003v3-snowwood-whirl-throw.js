// I-Switch2-0003v3-snowwood-whirl-throw.js
// 振り向き雪玉 — 背を向けて雪玉を丸める少年が笛の合図で振り向いた一瞬、木陰から滑り出る雪だるまの的へ雪玉を1つだけ当てる
// 操作: 少年が振り向いている間(下の帯が縮む間)に的をタップすると、その点へ雪玉が弧を描いて飛ぶ。1回振り向くごとに1球だけ。遠い的ほど届くまで時間がかかるので動く先を狙う。木の幹の陰にいる的には当たらない。振り向く0.5秒前に笛が鳴り、的が出てくる木の枝から雪がこぼれる
// 終わり: 18秒のうちに6個当てればCLEAR。外す/振り向いている間に投げないが3回、または時間切れでGAME OVER
// @mechanic: aim_shoot
// @theme: winter_woods_snowball_whirl
// 世界観: 冬の雑木林で、雪合戦の少年が雪壁の陰で雪玉を丸め、仲間の笛で振り向きざまに、木陰からそりで押し出される雪だるまの的へ雪玉を当てていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 当てた数・頭に当てたPERFECT数・雪うさぎ・外した数・スコア
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 物は板のまま距離でスケール、真下に楕円の接地影、奥ほど霞ませる
  var STYLE = { bg: ['#9db6d6', '#eef4fa'], main: ['#ffffff', '#4a3a30', '#2f6fb8'], accent: ['#ff5a3a', '#ffd23a'] };
  var SNOW = STYLE.main[0], BARK = STYLE.main[1], COAT = STYLE.main[2], RED = STYLE.accent[0], GOLD = STYLE.accent[1];
  var INK = '#1c2433', SHADE = '#8ea2bf', FOG = '#e4ecf6', MISSC = '#ff3b5a';

  var GAME_TITLE = 'SNOW WHIRL';
  var TIME_LIMIT = 18;
  var NEEDED = 6;
  var MAX_MISS = 3;
  var LANES = [{ y: 700, s: 0.55, v: 190, pts: 300 }, { y: 870, s: 0.78, v: 250, pts: 200 }, { y: 1080, s: 1.0, v: 310, pts: 100 }];
  var TRUNKS = [[150, 470, 760, 980], [90, 380, 700, 1000], [200, 560, 900]];
  var BOY_X = W / 2, BOY_Y = H * 0.775, HAND_Y = H * 0.72, BACK_LEN = 0.75;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var phase, phaseT, winLen, turnI, targets, tele, teleDone, ball, thrown, throwT, fumbleT, turnT;
  var stopT, stopKind, hl, hits, perfects, misses, rabbits, score, finalScore, timeLeft, readyT, fin, cleared, postT;
  var joyT, sadT, warnT, endWhy, puffs;

  // 少年: 正面(雪玉を丸める) / 背中(林を向く) / 投げ
  var BOY_FRONT = ['....rrrr....', '...rrrrrr...', '...rwrrwr...', '...ssssss...', '...skssks...', '...ssssss...', '..cccccccc..', '.cccccccccc.', '.mmcwwwwcmm.', '.mmcwwwwcmm.', '..cccccccc..', '..cccccccc..'];
  var BOY_FRONT2 = ['....rrrr....', '...rrrrrr...', '...rwrrwr...', '...ssssss...', '...skssks...', '...ssssss...', '..cccccccc..', '.cccccccccc.', '..mmwwwwmm..', '..mmwwwwmm..', '..cccccccc..', '..cccccccc..'];
  var BOY_BACK = ['....rrrr....', '...rrrrrr...', '...rrrrrr...', '...hhhhhh...', '...hhhhhh...', '....hhhh....', '..cccccccc..', '.cccccccccc.', 'mccccccccccm', 'm.cccccccc.m', '..cccccccc..', '..cccccccc..'];
  var BOY_THROW = ['.........mm.', '....rrrr.mm.', '...rrrrrrc..', '...rrrrrrc..', '...hhhhhhc..', '...hhhhhc...', '..cccccccc..', '.cccccccccc.', 'mcccccccccc.', 'm.cccccccc..', '..cccccccc..', '..cccccccc..'];
  var BOY_PAL = { r: RED, w: SNOW, s: '#f6cfa8', k: INK, h: '#4a2e1e', c: COAT, m: '#3fa05a' };
  // 雪だるまの的(バケツ帽)と金の雪うさぎ
  var SNOWMAN = ['...kkkk...', '...kkkk...', '..kkkkkk..', '...wwww...', '..wwbwbw..', '..wwwoww..', '...wwww...', '.wwwwwwww.', 'wwwwbwwwww', 'wwwwwwwwww', 'wwwwbwwwww', '.wwwwwwww.'];
  var SNOWMAN_PAL = { k: '#d0453a', w: SNOW, b: INK, o: '#ff8a2a' };
  var RABBIT = ['.gg..gg.', '..g..g..', '.wwwwww.', 'wwrwwwww', 'wwwwwwww', '.wwwwww.'];
  var RABBIT_PAL = { g: '#3fa05a', w: '#fff6c8', r: RED };

  function out(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: INK, bold: true });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true });
  }
  function oval(cx, cy, rx, ry, col, a) {
    for (var dy = -ry; dy < ry; dy += 3) {
      var v = (dy + 1.5) / ry, hw = rx * Math.sqrt(Math.max(0, 1 - v * v));
      game.draw.rect(cx - hw, cy + dy, hw * 2, 3, col, a);
    }
  }
  function scaleAt(y) { return Math.max(0.5, Math.min(1.05, 0.55 + (y - 700) / 380 * 0.45)); }

  // 次の振り向きで出てくる的を決める(demoK: ATTRACT用の固定配置)
  function planTurn(demoK) {
    tele = [];
    var n = demoK !== undefined ? 1 : turnI < 2 ? 1 : turnI < 5 ? 2 : 3;
    var used = {};
    for (var i = 0; i < n; i++) {
      var rabbit = demoK === undefined && turnI >= 3 && i === 0 && Math.random() < 0.4;
      var li = demoK !== undefined ? 1 : rabbit ? 0 : Math.floor(Math.random() * 3);
      var tr = TRUNKS[li], ti = demoK !== undefined ? 1 : Math.floor(Math.random() * tr.length);
      if (used[li + '_' + ti]) { ti = (ti + 1) % tr.length; }
      used[li + '_' + ti] = true;
      tele.push({ li: li, x: tr[ti], dir: tr[ti] < W / 2 ? 1 : -1, rabbit: rabbit });
    }
  }

  function openWindow() {
    phase = 'win'; winLen = Math.max(0.95, 1.5 - turnI * 0.06); phaseT = winLen; thrown = false; turnT = 0.18;
    targets = [];
    for (var i = 0; i < tele.length; i++) {
      var tl = tele[i], L = LANES[tl.li];
      targets.push({ li: tl.li, x: tl.x, dir: tl.dir, v: L.v * (1 + turnI * 0.06) * (tl.rabbit ? 1.6 : 1), rabbit: tl.rabbit, alive: true, hitT: 0 });
    }
    game.audio.tone('E5', 0.07, { wave: 'triangle', volume: 0.1, slide: 320 });
  }

  function closeWindow() {
    phase = 'back'; phaseT = BACK_LEN; teleDone = false; turnI++; turnT = 0.18;
    for (var i = 0; i < targets.length; i++) targets[i].alive = false;
  }

  function initGame() {
    turnI = 0; targets = []; tele = []; ball = null; thrown = false; throwT = 0; fumbleT = 0; turnT = 0; puffs = [];
    hits = 0; perfects = 0; misses = 0; rabbits = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; hl = null;
    fin = false; cleared = false; postT = 0; joyT = 0; sadT = 0; warnT = 0; endWhy = '';
    phase = 'back'; phaseT = BACK_LEN; teleDone = false;
  }

  function fumble() {
    fumbleT = 0.25;
    game.audio.tone('E3', 0.06, { wave: 'square', volume: 0.07 });
  }

  // 投げる(本番もデモも同じ処理)
  function throwAt(x, y) {
    if (phase !== 'win' || thrown || stopT > 0 || fin) { fumble(); return; }
    thrown = true; throwT = 0.25;
    var dur = 0.16 + Math.max(0, Math.min(1, (1450 - y) / 900)) * 0.22;
    ball = { x0: BOY_X + 50, y0: HAND_Y, x: x, y: y, p: 0, dur: dur };
    phaseT = Math.max(phaseT, dur + 0.3);
    game.audio.tone('A4', 0.08, { wave: 'triangle', volume: 0.12, slide: 420 });
  }

  function hiddenByTrunk(tg) {
    var L = LANES[tg.li], tr = TRUNKS[tg.li];
    for (var i = 0; i < tr.length; i++) if (Math.abs(tg.x - tr[i]) < 34 * L.s) return true;
    return false;
  }

  function land(x, y) {
    var got = null, head = false;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (!tg.alive || hiddenByTrunk(tg)) continue;
      var L = LANES[tg.li], s = L.s;
      if (tg.rabbit) {
        if (Math.hypot(x - tg.x, y - (L.y - 30 * s)) < 60 * s) { got = tg; head = true; }
      } else if (Math.hypot(x - tg.x, y - (L.y - 80 * s)) < 46 * s) { got = tg; head = true; }
      else if (Math.hypot(x - tg.x, y - (L.y - 30 * s)) < 64 * s) { got = tg; head = false; }
      if (got) break;
    }
    puffs.push({ x: x, y: y, t: 0.5, s: scaleAt(y) });
    if (got) {
      got.alive = false; got.hitT = 0.6;
      hits++; joyT = 0.6;
      if (head) perfects++;
      if (got.rabbit) rabbits++;
      var pts = got.rabbit ? 500 : Math.round(LANES[got.li].pts * (head ? 1.5 : 1));
      if (mode === S.PLAYING) score += pts;
      game.feedback.good(x, y - 60, { text: got.rabbit ? 'NICE' : head ? 'PERFECT' : 'GOOD', color: GOLD, size: 60 });
      game.fx.popup('+' + pts, x, y - 140, { color: COAT, size: 44 });
      game.fx.burst(x, y, { color: SNOW, count: 16, speed: 380 });
      if (hits === 3 && mode === S.PLAYING) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE', W / 2, H * 0.24, { color: GOLD, size: 96 });
      }
      if (mode === S.PLAYING && hits >= NEEDED) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); return; }
      phaseT = Math.min(phaseT, 0.3);
    } else {
      // 外れ: 止めて着弾点を白く大きく
      stopT = 0.38; stopKind = 'miss'; hl = { x: x, y: y };
      game.fx.flash(SNOW, 0.12);
      game.audio.tone('C3', 0.2, { wave: 'square', volume: 0.08, slide: -40 });
    }
  }

  function resolveStop() {
    if (stopKind === 'win') { ending(true); return; }
    misses++; sadT = 0.8;
    var px = stopKind === 'miss' ? hl.x : BOY_X, py = stopKind === 'miss' ? hl.y : BOY_Y - 160;
    game.feedback.bad(px, py - 40, { text: 'MISS', color: MISSC, size: 60 });
    if (mode === S.PLAYING && misses >= MAX_MISS) { endWhy = 'miss'; ending(false); return; }
    if (stopKind === 'late') closeWindow();
    else phaseT = Math.min(phaseT, 0.25);
  }

  function stepTurn(dt, demoK) {
    if (throwT > 0) throwT -= dt;
    if (fumbleT > 0) fumbleT -= dt;
    if (turnT > 0) turnT -= dt;
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    for (var p = puffs.length - 1; p >= 0; p--) { puffs[p].t -= dt; if (puffs[p].t <= 0) puffs.splice(p, 1); }
    for (var h = 0; h < targets.length; h++) if (targets[h].hitT > 0) targets[h].hitT -= dt;
    if (fin) return;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    if (ball) {
      ball.p += dt / ball.dur;
      if (ball.p >= 1) { var b = ball; ball = null; land(b.x, b.y); if (stopT > 0) return; }
    }
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (tg.alive) tg.x += tg.dir * tg.v * dt;
    }
    phaseT -= dt;
    if (phase === 'back') {
      if (!teleDone && phaseT <= 0.55) {
        planTurn(demoK); teleDone = true;
        game.audio.tone('A6', 0.08, { wave: 'sine', volume: 0.1 });
        game.audio.tone('E6', 0.12, { wave: 'sine', volume: 0.08 });
      }
      if (phaseT <= 0) openWindow();
    } else if (phaseT <= 0) {
      if (!thrown && !ball) {
        // 投げずに振り向きが終わった: 縮んだ帯を光らせて止める
        stopT = 0.35; stopKind = 'late';
        game.fx.flash(SNOW, 0.1);
        game.audio.tone('G2', 0.25, { wave: 'square', volume: 0.08 });
      } else if (!ball) closeWindow();
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 30) + (MAX_MISS - misses) * 100 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(120 + i * 170, H * 0.3 + (i % 2) * 140, { color: i % 2 ? GOLD : SNOW, count: 18, speed: 460 });
      game.fx.flash(SNOW, 0.2);
      joyT = 3;
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    if (y < 240) { game.audio.play('se_tap', 0.08); return; }
    if (y > 1300) { fumble(); return; }
    throwAt(x, y);
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; startBgm(); return; }
  });

  // ---- 描画 ----
  function drawTree(x, L, t, li) {
    var s = L.s, top = L.y - 520 * s;
    oval(x, L.y, 70 * s, 16 * s, SHADE, 0.5);
    game.draw.rect(x - 18 * s, top, 36 * s, 520 * s, BARK);
    game.draw.rect(x - 18 * s, top, 10 * s, 520 * s, '#6a5444');
    for (var b = 0; b < 3; b++) {
      var by = top + 60 * s + b * 110 * s, side = b % 2 ? 1 : -1;
      game.draw.line(x, by + 50 * s, x + side * 120 * s, by, BARK, Math.max(3, 12 * s));
      game.draw.rect(x + side * 120 * s - (side > 0 ? 70 * s : 0), by - 12 * s, 70 * s, 12 * s, SNOW);
    }
    game.draw.rect(x - 24 * s, top - 10 * s, 48 * s, 16 * s, SNOW);
    // 予告: この木から的が出る → 枝の雪がこぼれる
    if (phase === 'back' && teleDone) {
      for (var i = 0; i < tele.length; i++) {
        if (tele[i].li !== li || tele[i].x !== x) continue;
        for (var f = 0; f < 6; f++) {
          var fy = top + ((t * 500 + f * 70) % (300 * s + 80));
          game.draw.rect(x + (f % 3 - 1) * 40 * s + tele[i].dir * 50 * s, fy, 14 * s, 14 * s, SNOW);
        }
        if (Math.floor(t * 10) % 2 === 0) game.draw.circle(x, top - 30 * s, 16 * s, GOLD);
      }
    }
  }

  function drawTarget(tg, t) {
    var L = LANES[tg.li], s = L.s;
    if (!tg.alive && tg.hitT <= 0) return;
    if (tg.hitT > 0) {
      var k = 1 - tg.hitT / 0.6;
      for (var p = 0; p < 6; p++) game.draw.circle(tg.x + Math.cos(p) * k * 120 * s, L.y - 50 * s - Math.sin(p * 2) * k * 80 * s, 26 * s * (1 - k), SNOW);
      game.draw.rect(tg.x - 30 * s, L.y - 140 * s - k * 220 * s, 60 * s, 40 * s, '#d0453a');
      return;
    }
    oval(tg.x, L.y + 4, 64 * s, 14 * s, SHADE, 0.6);
    game.draw.rect(tg.x - 60 * s, L.y - 6 * s, 120 * s, 12 * s, '#b07a4a');
    if (tg.rabbit) {
      game.draw.circle(tg.x, L.y - 30 * s, 70 * s, GOLD, 0.25 + Math.sin(t * 12) * 0.1);
      game.draw.sprite(RABBIT, RABBIT_PAL, tg.x, L.y - 34 * s, 16 * s, { anchor: 'center', flipX: tg.dir < 0 });
    } else {
      var wob = Math.sin(t * 14 + tg.x) * 3 * s;
      game.draw.sprite(SNOWMAN, SNOWMAN_PAL, tg.x + wob, L.y - 66 * s, 11 * s, { anchor: 'center' });
    }
  }

  function drawWorld(t) {
    game.draw.clear(FOG);
    game.draw.gradient(0, 600, [[0, STYLE.bg[0]], [1, FOG]]);
    for (var m = 0; m < 5; m++) game.draw.circle(80 + m * 240, 600, 170 + (m % 2) * 60, '#c7d6ea');
    game.draw.gradient(560, H, [[0, STYLE.bg[1]], [1, '#bfcfe4']]);
    for (var g = 0; g < 7; g++) game.draw.rect(0, 600 + g * g * 22, W, 3, '#d6e2f0');
    for (var li = 0; li < 3; li++) {
      var L = LANES[li];
      for (var i = 0; i < targets.length; i++) if (targets[i].li === li) drawTarget(targets[i], t);
      for (var k = 0; k < TRUNKS[li].length; k++) drawTree(TRUNKS[li][k], L, t, li);
      if (li === 0) game.draw.rect(0, 300, W, 460, FOG, 0.35);
    }
    // 背を向けている間は林が暗い(見ていない)
    if (phase === 'back' || stopKind === 'late' && stopT > 0) game.draw.rect(0, 240, W, 1000, '#5a6e90', 0.28);
    // 着弾の雪煙
    for (var p = 0; p < puffs.length; p++) {
      var pf = puffs[p], r = (1 - pf.t / 0.5) * 70 * pf.s;
      game.draw.circle(pf.x, pf.y, 20 * pf.s + r, SNOW, pf.t / 0.5);
    }
    if (stopT > 0 && stopKind === 'miss' && hl) {
      var big = 1 + (0.38 - stopT) * 3;
      game.draw.circle(hl.x, hl.y, 44 * big, Math.floor(t * 16) % 2 ? SNOW : MISSC, 0.8);
    }
    // 降る雪
    for (var f = 0; f < 26; f++) {
      var fx = (f * 173 + Math.sin(t + f) * 40) % W, fy = (f * 263 + t * (80 + f % 5 * 20)) % H;
      game.draw.rect(fx, fy, 8, 8, SNOW, 0.85);
    }
  }

  function drawBoy(t) {
    var fr;
    if (phase === 'win' || turnT > 0) fr = throwT > 0 ? BOY_THROW : BOY_BACK;
    else fr = Math.floor(t * 4) % 2 ? BOY_FRONT : BOY_FRONT2;
    var bob = joyT > 0 ? -Math.abs(Math.sin(t * 12)) * 20 : sadT > 0 ? 18 : Math.sin(t * 3) * 3;
    var wig = fumbleT > 0 ? Math.sin(t * 60) * 10 : 0;
    game.draw.sprite(fr, BOY_PAL, BOY_X + wig, BOY_Y + bob, 15, { anchor: 'center', flipX: turnT > 0 && Math.floor(t * 30) % 2 === 0 });
    // 雪壁
    for (var r = 0; r < 3; r++) for (var c = 0; c < 7; c++) {
      var bx = 130 + c * 120 + (r % 2) * 60, by = H * 0.79 + r * 52;
      game.draw.rect(bx, by, 112, 48, r === 0 ? SNOW : '#e6eef8');
      game.draw.rect(bx, by + 40, 112, 8, SHADE, 0.5);
    }
    // 振り向きの残り帯(縮むバー)
    var ratio = phase === 'win' ? Math.max(0, phaseT / winLen) : 0;
    var flashBar = stopT > 0 && stopKind === 'late' && Math.floor(t * 16) % 2 === 0;
    game.draw.rect(140, H * 0.885, W - 280, 34, INK, 0.75);
    game.draw.rect(146, H * 0.885 + 6, (W - 292) * ratio, 22, flashBar ? MISSC : ratio < 0.35 ? RED : GOLD);
    if (flashBar) game.draw.rect(140, H * 0.885, W - 280, 34, MISSC, 0.6);
    // 手元の雪玉(1振り向き1球)
    if (!thrown || phase === 'back') game.draw.circle(BOY_X - 120, H * 0.86, 26, SNOW);
    // 飛んでいる雪玉
    if (ball) {
      var p = Math.min(1, ball.p), bx2 = ball.x0 + (ball.x - ball.x0) * p, by2 = ball.y0 + (ball.y - ball.y0) * p - Math.sin(Math.PI * p) * 220;
      var r2 = 24 * (1 + (scaleAt(ball.y) - 1) * p);
      oval(bx2, ball.y0 + (ball.y - ball.y0) * p + 20, r2, r2 * 0.3, SHADE, 0.5);
      game.draw.circle(bx2, by2, r2, SNOW);
      game.draw.circle(bx2 - r2 * 0.3, by2 - r2 * 0.3, r2 * 0.35, '#ffffff');
    }
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 30, W - 120, 22, INK, 0.7);
    game.draw.rect(60, 30, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? MISSC : COAT);
    for (var i = 0; i < NEEDED; i++) {
      var cx = W / 2 - 250 + i * 100;
      game.draw.circle(cx, 120, 30, i < hits ? SNOW : '#7f93b0', i < hits ? 1 : 0.5);
      game.draw.rect(cx - 22, 82, 44, 18, i < hits ? '#d0453a' : '#5a6e90');
    }
    out(hits + ' / ' + NEEDED, W / 2, 205, 40, SNOW);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(60 + m * 54, 160, 40, 40, m < misses ? MISSC : '#5a6e90');
    out('' + score, W - 140, 205, 44, SNOW);
  }

  function drawScene(t) {
    drawWorld(t);
    drawBoy(t);
  }

  // ---- ATTRACT: 本物の stepTurn()/throwAt() で実演。1回目は動く先を狙って頭にPERFECT、2回目は今いる所へ投げて外す ----
  var demo = { t: 0, x: W * 0.6, y: H * 0.6, press: false, k: 0, done: false, wasPhase: '' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.k = 0; demo.done = false; demo.wasPhase = 'back'; }
    stepTurn(dt, demo.k);
    if (phase === 'win' && demo.wasPhase !== 'win') demo.done = false;
    if (phase === 'back' && demo.wasPhase === 'win') demo.k = Math.min(1, demo.k + 1);
    demo.wasPhase = phase;
    var tx = W * 0.6, ty = H * 0.6;
    demo.press = false;
    if (phase === 'win' && targets.length && !demo.done) {
      var tg = targets[0], L = LANES[tg.li], s = L.s, el = winLen - phaseT;
      var dur = 0.16 + Math.max(0, Math.min(1, (1450 - (L.y - 80 * s)) / 900)) * 0.22;
      if (demo.k === 0) { tx = tg.x + tg.dir * tg.v * dur; ty = L.y - 80 * s; }
      else { tx = tg.x - tg.dir * 30 * s; ty = L.y - 80 * s; }
      var fireAt = demo.k === 0 ? 0.45 : 0.4;
      if (el > fireAt - 0.12) demo.press = true;
      if (el >= fireAt) { throwAt(tx, ty); demo.done = true; }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 10);
    demo.y += (ty - demo.y) * Math.min(1, dt * 10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 110 + Math.sin(t * 2) * 6, 96, SNOW);
      out('HI-SCORE ' + game.best, W / 2, 190, 38, GOLD);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, GOLD);
      else out('TAP TO START', W / 2, H * 0.975, 40, SNOW);
      return;
    }

    if (mode === S.RESULT) {
      stepTurn(0);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 540, INK, 0.88);
      game.draw.rect(90, H * 0.3, W - 180, 10, cleared ? GOLD : MISSC);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? GOLD : MISSC);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, SNOW);
      out(hits + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, SNOW);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, GOLD);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, GOLD);
      if (!cleared) out('あと' + (NEEDED - hits) + '個!', W / 2, H * 0.27, 64, MISSC);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, SNOW);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepTurn(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { hits: hits, perfect: perfects, rabbits: rabbits, misses: misses, turns: turnI };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepTurn(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: MISSC, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, GOLD);
  });

  function startBgm() {
    game.audio.melody([
      ['G5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['B5', 1], ['G5', 1],
      ['A5', 0.5], ['F5', 0.5], ['A5', 0.5], ['D6', 0.5], ['C6', 2],
      ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['E6', 0.5], ['D6', 1], ['B5', 1],
      ['C6', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 2],
    ], { tempo: 138, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 2], ['G2', 2], ['F2', 2], ['C3', 2], ['A2', 2], ['E2', 2], ['F2', 2], ['G2', 2]] });
  }

  game.onStart(function() {
    startBgm();
    mode = S.ATTRACT;
    initGame();
  });
})(game);
