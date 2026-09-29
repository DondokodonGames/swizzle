// J-Switch-0012-marble-ring-sling.js
// 縁台のビー玉はじき — ゴムひもで大玉を引き絞って放ち、チョークの輪に陣取る顔つきビー玉を輪の外へ弾き飛ばす。一発で2個出せば連鎖
// 操作: 大玉に指を置いて手前へ引き、狙う向きと反対に引いて離す。引いた長さが強さ。引いたまま3秒たつとゴムが外れて空撃ち(社内メモ。画面には出さない)
// 終わり: 6発以内に5個を輪の外へ出せばCLEAR。玉切れ/時間切れでGAME OVER
// @mechanic: slingshot
// @theme: dusk_marble_ring
// 世界観: 夕暮れの駄菓子屋の軒先、縁台にチョークで描いた輪の中に居座る顔つきビー玉の一団を、ビー玉遊びの名人の子がゴムひもで引き絞った大玉で一つずつ輪の外へ弾き出し、店じまいの鐘までに輪を空っぽにする
// 残るもの: 正誤(CLEAR/GAME OVER) + 輪から出した数・連鎖(NICE)数・使った玉数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 被写界深度のぼけ、ブルーム、鏡面ハイライトと柔らかい影
  var STYLE = { bg: ['#2a1e3a', '#8a4a5a', '#e89a6a'], main: ['#b07a4a', '#8a5a34', '#d9a878'], accent: ['#ffe27a', '#ff5a6a'] };
  var C = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], sky3: STYLE.bg[2], wood: STYLE.main[0], woodD: STYLE.main[1], woodL: STYLE.main[2],
    chalk: '#fff8ec', gold: STYLE.accent[0], bad: STYLE.accent[1], ink: '#1a1020', white: '#ffffff', good: '#6ae0a0',
    big: '#5ac8ff', bigD: '#1a6a9a', band: '#e84a3a', bokeh: '#ffcf8a'
  };
  var TINTS = ['#ff7a9a', '#9a7aff', '#7ae0c0', '#ffb04a', '#6ab0ff'];

  var GAME_TITLE = 'MARBLE RING';
  var TIME_LIMIT = 20;
  var NEEDED = 5;
  var SHOTS = 6;
  var CX = W / 2, CY = H * 0.42, RING = 320;
  var BR = 60, MR = 38, BIG_MASS = 2.2;
  var SLX = W / 2, SLY = H * 0.78;
  var MAX_PULL = 270, PULL_TIMEOUT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FACE = ['k.k', '...', '.m.'];
  var FACE_HIT = ['k.k', '...', 'mmm'];
  var KID = ['..hhhh..', '.hhhhhh.', '.hssssh.', '.sksksh.', '..ssss..', '.cccccc.', 'cccccccc', 'c.cccc.c', '..p..p..', '..p..p..'];
  var BELL = ['..g..', '.ggg.', '.ggg.', 'ggggg', '..k..'];

  var st, readyT, timeLeft, big, balls, shotsLeft, outs, nices, shotOuts, pull, aiming, stopT, outroT, win, focus, halfShown, rolling;

  function initGame() {
    st = 'ready'; readyT = 0.8; timeLeft = TIME_LIMIT; shotsLeft = SHOTS; outs = 0; nices = 0; shotOuts = 0;
    big = { x: SLX, y: SLY, vx: 0, vy: 0, home: true, back: 0 };
    balls = [];
    var guard = 0;
    while (balls.length < NEEDED && guard++ < 300) {
      var a = game.random(0, Math.PI * 2), r = game.random(40, RING - 90);
      var nx = CX + Math.cos(a) * r, ny = CY + Math.sin(a) * r * 0.9;
      var ok = true;
      for (var i = 0; i < balls.length; i++) if (Math.hypot(balls[i].x - nx, balls[i].y - ny) < MR * 2.6) ok = false;
      if (ok) balls.push({ x: nx, y: ny, vx: 0, vy: 0, out: false, gone: false, tint: TINTS[balls.length], gold: balls.length === 2, hitT: 0 });
    }
    pull = null; aiming = 0; stopT = 0; outroT = 0; win = false; focus = null; halfShown = false; rolling = false;
  }

  function roll(o, dt) {
    o.x += o.vx * dt; o.y += o.vy * dt;
    var k = Math.pow(0.55, dt);
    o.vx *= k; o.vy *= k;
    var sp = Math.hypot(o.vx, o.vy);
    if (sp > 0) { var d = Math.min(sp, 380 * dt); o.vx -= o.vx / sp * d; o.vy -= o.vy / sp * d; }
  }

  function collide(a, ra, ma, b, rb, mb) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= ra + rb || d === 0) return false;
    var nx = dx / d, ny = dy / d, over = ra + rb - d;
    a.x -= nx * over * mb / (ma + mb); a.y -= ny * over * mb / (ma + mb);
    b.x += nx * over * ma / (ma + mb); b.y += ny * over * ma / (ma + mb);
    var rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (rel <= 0) return false;
    var j = (1.92 * rel) / (1 / ma + 1 / mb);
    a.vx -= j / ma * nx; a.vy -= j / ma * ny;
    b.vx += j / mb * nx; b.vy += j / mb * ny;
    return rel;
  }

  function shoot(px, py, isDemo) {
    // 引いた向きの反対へ、引いた長さに比例した速さで放つ
    var dx = SLX - px, dy = SLY - py, len = Math.hypot(dx, dy);
    if (len < 30) { big.x = SLX; big.y = SLY; return false; }
    var p = Math.min(len, MAX_PULL);
    big.vx = dx / len * p * 6.2; big.vy = dy / len * p * 6.2;
    big.x = SLX; big.y = SLY; big.home = false;
    shotsLeft--; shotOuts = 0; rolling = true;
    if (!isDemo) game.audio.play('se_jump', 0.4);
    return true;
  }

  function stepTable(dt, isDemo) {
    if (big.back > 0) {
      big.back -= dt;
      big.x += (SLX - big.x) * Math.min(1, dt * 8); big.y += (SLY - big.y) * Math.min(1, dt * 8);
      if (big.back <= 0) { big.x = SLX; big.y = SLY; big.home = true; }
    }
    if (!big.home && big.back <= 0) roll(big, dt);
    for (var i = 0; i < balls.length; i++) { var b = balls[i]; if (!b.gone) roll(b, dt); if (b.hitT > 0) b.hitT -= dt; }
    for (var p = 0; p < balls.length; p++) {
      var bp = balls[p];
      if (bp.gone) continue;
      if (!big.home && big.back <= 0) {
        var rel = collide(big, BR, BIG_MASS, bp, MR, 1);
        if (rel) { bp.hitT = 0.4; if (!isDemo) { game.audio.tone(900 + rel * 0.2, 0.05, { wave: 'triangle', volume: 0.06 }); game.fx.burst(bp.x, bp.y, { color: C.white, count: 5, speed: 120 }); } }
      }
      for (var q = p + 1; q < balls.length; q++) {
        if (balls[q].gone) continue;
        if (collide(bp, MR, 1, balls[q], MR, 1) && !isDemo) game.audio.tone(1300, 0.04, { wave: 'triangle', volume: 0.05 });
      }
    }
    // 輪の外に出たか
    for (var o = 0; o < balls.length; o++) {
      var bo = balls[o];
      if (!bo.out && Math.hypot(bo.x - CX, (bo.y - CY) / 0.9) > RING) knockOut(bo, isDemo);
      if (bo.out && (bo.x < -80 || bo.x > W + 80 || bo.y < 200 || bo.y > H * 0.72)) bo.gone = true;
    }
    if (!big.home && big.back <= 0) {
      var sp = Math.hypot(big.vx, big.vy);
      var away = big.x < -60 || big.x > W + 60 || big.y < 180 || big.y > H * 0.9;
      var allStill = true;
      for (var s = 0; s < balls.length; s++) if (!balls[s].gone && Math.hypot(balls[s].vx, balls[s].vy) > 12) allStill = false;
      if ((sp < 14 || away) && allStill) {
        big.vx = 0; big.vy = 0; big.back = 0.35; rolling = false;
        if (shotOuts >= 2) {
          nices++;
          if (!isDemo) game.feedback.good(W / 2, H * 0.62, { text: 'NICE', color: C.gold, count: 18 });
        }
      }
    }
  }

  function knockOut(b, isDemo) {
    b.out = true; outs++; shotOuts++;
    if (isDemo) { game.fx.burst(b.x, b.y, { color: b.tint, count: 10, speed: 220 }); return; }
    game.audio.play(b.gold ? 'se_coin' : 'se_break', 0.4);
    game.feedback.good(b.x, b.y - 60, { text: b.gold ? 'PERFECT' : 'GOOD', color: b.gold ? C.gold : C.good, count: b.gold ? 18 : 10 });
    if (!halfShown && outs === 3) {
      halfShown = true; game.audio.play('se_milestone', 0.5);
      game.fx.popup(outs + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.gold, size: 72 });
    }
    if (outs >= NEEDED) { focus = b; finish(true, false); }
  }

  function finish(ok, isDemo) {
    if (isDemo) return;
    win = ok; st = 'stop'; stopT = 0.55; pull = null;
    game.audio.stopBgm();
    if (ok) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else game.audio.play('se_failure', 0.6);
  }

  // ── 入力 ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || st !== 'play') return;
    if (!big.home || shotsLeft <= 0) { game.audio.tone('D3', 0.05, { wave: 'triangle', volume: 0.03 }); return; }
    if (y < H * 0.55) { game.fx.burst(x, y, { color: C.chalk, count: 3, speed: 60 }); return; }
    pull = { x: x, y: y }; aiming = 0;
    game.audio.play('se_tap', 0.25);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pull) return;
    var before = pullPoint().len;
    pull.x = x; pull.y = y;
    var now = pullPoint().len;
    // ゴムのきしみ音: 引き量の節目ごとに音程が上がる。満杯で強く鳴る
    if (Math.floor(now / 60) !== Math.floor(before / 60)) game.audio.tone(300 + now * 2, 0.04, { wave: 'triangle', volume: 0.04 });
    if (now >= MAX_PULL && before < MAX_PULL) game.audio.play('se_powerup', 0.3);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pull) return;
    var p = pull; pull = null;
    if (st !== 'play') return;
    if (!shoot(p.x, p.y, false)) game.audio.tone('E3', 0.04, { wave: 'triangle', volume: 0.03 });
  });

  function pullPoint() {
    if (!pull) return null;
    var dx = pull.x - SLX, dy = pull.y - SLY, len = Math.hypot(dx, dy);
    if (len < 1) return { x: SLX, y: SLY, len: 0 };
    var l = Math.min(len, MAX_PULL);
    return { x: SLX + dx / len * l, y: SLY + dy / len * l, len: l };
  }

  // ── ATTRACT デモ(狙った玉の中心へ引き絞る。3発目は弱すぎて届かない) ─────
  var demo = { t: 0, gx: SLX, gy: SLY, press: false, n: 0, wait: 0.5, tx: 0, ty: 0, k: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); st = 'play'; demo.n = 0; demo.wait = 0.5; pull = null; }
    if (shotsLeft <= 0 && big.home) { initGame(); st = 'play'; }
    stepTable(dt, true);
    if (big.home && !pull) {
      demo.wait -= dt;
      demo.press = false;
      demo.gx += (SLX - demo.gx) * Math.min(1, dt * 6); demo.gy += (SLY - demo.gy) * Math.min(1, dt * 6);
      if (demo.wait <= 0) {
        var tgt = null, bestD = 1e9;
        for (var i = 0; i < balls.length; i++) if (!balls[i].out) { var d = Math.hypot(balls[i].x - SLX, balls[i].y - SLY); if (d < bestD) { bestD = d; tgt = balls[i]; } }
        if (!tgt) return;
        var ux = (tgt.x - SLX) / bestD, uy = (tgt.y - SLY) / bestD;
        var weak = demo.n % 3 === 2;
        demo.tx = SLX - ux * (weak ? 70 : 250); demo.ty = SLY - uy * (weak ? 70 : 250);
        pull = { x: SLX, y: SLY }; demo.k = 0; demo.n++;
      }
    } else if (pull) {
      demo.k += dt / 0.6;
      pull.x = SLX + (demo.tx - SLX) * Math.min(1, demo.k); pull.y = SLY + (demo.ty - SLY) * Math.min(1, demo.k);
      demo.gx = pull.x; demo.gy = pull.y; demo.press = true;
      if (demo.k >= 1.15) { shoot(pull.x, pull.y, true); pull = null; demo.wait = 0.6; }
    } else {
      demo.press = false;
    }
  }

  // ── 描画 ─────────────────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.12, C.sky2], [0.2, C.sky3], [0.21, C.woodD], [1, C.woodD]]);
    // 遠景のぼけた軒先の灯り(被写界深度)
    for (var b = 0; b < 9; b++) {
      var bx = (b * 137 + 60) % W, by = H * 0.12 + (b % 3) * 40;
      game.draw.circle(bx, by, 46 + (b % 3) * 14, C.bokeh, 0.12 + 0.06 * Math.sin(t * 1.3 + b));
    }
    game.draw.sprite(BELL, { g: C.gold, k: C.ink }, W * 0.88, H * 0.14 + Math.sin(t * 2) * 6, 12, { anchor: 'center' });
    // 縁台の板(ストリップ塗り+木目)
    for (var y = Math.round(H * 0.21); y < H * 0.74; y += 90) {
      game.draw.rect(0, y, W, 84, C.wood);
      game.draw.rect(0, y + 84, W, 6, C.woodD);
      for (var g = 0; g < 4; g++) game.draw.rect(((y * 7 + g * 290) % W), y + 20 + g * 14, 220, 3, C.woodL, 0.4);
    }
    // チョークの輪
    for (var a = 0; a < 48; a++) {
      var a1 = a / 48 * Math.PI * 2, a2 = (a + 1) / 48 * Math.PI * 2;
      game.draw.line(CX + Math.cos(a1) * RING, CY + Math.sin(a1) * RING * 0.9, CX + Math.cos(a2) * RING, CY + Math.sin(a2) * RING * 0.9, C.chalk, a % 2 ? 7 : 5);
    }
    // 手前の地面(親指ゾーン)
    game.draw.gradient(H * 0.74, H, [[0, '#4a3040'], [1, '#221828']]);
    game.draw.rect(0, 0, W, H, C.bokeh, 0.02 + 0.02 * Math.sin(t * 1.5));
  }

  function drawMarble(x, y, r, col, face, glow) {
    game.draw.circle(x + r * 0.25, y + r * 0.35, r * 1.02, C.ink, 0.35);
    if (glow) game.draw.circle(x, y, r * 1.8, col, 0.2);
    game.draw.circle(x, y, r, col);
    game.draw.circle(x - r * 0.1, y - r * 0.1, r * 0.8, C.white, 0.18);
    game.draw.circle(x - r * 0.35, y - r * 0.4, r * 0.24, C.white, 0.85);
    if (face) game.draw.sprite(face, { k: C.ink, m: C.ink }, x, y + r * 0.15, Math.max(4, r / 5), { anchor: 'center' });
  }

  function drawPieces() {
    var t = game.time.elapsed;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.gone) continue;
      var bob = b.out ? 0 : Math.sin(t * 3 + i) * 3;
      if (focus === b && Math.floor(t * 14) % 2 === 0) game.draw.circle(b.x, b.y, MR * 2.2, C.white, 0.5);
      drawMarble(b.x + Math.sin(t * 2 + i) * 1.5, b.y + bob, MR, b.gold ? C.gold : b.tint, b.hitT > 0 ? FACE_HIT : FACE, b.gold);
    }
    // ゴムひも
    var pp = pullPoint();
    var bx = pp ? pp.x : big.x, by = pp ? pp.y : big.y;
    if (big.home || pp) {
      game.draw.line(SLX - 170, SLY - 20, bx, by, C.band, 10);
      game.draw.line(SLX + 170, SLY - 20, bx, by, C.band, 10);
    }
    game.draw.rect(SLX - 186, SLY - 60, 30, 120, C.woodD); game.draw.rect(SLX + 156, SLY - 60, 30, 120, C.woodD);
    if (pp && pp.len > 20) {
      var ux = (SLX - pp.x) / pp.len, uy = (SLY - pp.y) / pp.len;
      for (var d = 1; d <= 6; d++) game.draw.circle(SLX + ux * d * pp.len * 0.55, SLY + uy * d * pp.len * 0.55, 10 - d, C.chalk, 0.8 - d * 0.1);
      if (aiming > 2) game.draw.circle(bx, by, BR * 1.5, C.bad, 0.3 + 0.3 * Math.sin(t * 20));
    }
    var ready = big.home && st === 'play' && !pp;
    if (ready) game.draw.circle(big.x, big.y, BR + 18 + Math.sin(t * 6) * 6, C.white, 0.3);
    drawMarble(bx, by + (ready ? Math.sin(t * 4) * 4 : 0), BR, C.big, null, true);
    game.draw.circle(bx, by, BR * 0.5, C.bigD, 0.35);
    // 名人の子
    var cheer = st === 'stop' && win ? Math.abs(Math.sin(t * 10)) * 30 : 0;
    game.draw.sprite(KID, { h: '#3a2a1a', s: '#ffd0a0', k: C.ink, c: '#ff8a4a', p: '#3a4a8a' }, W * 0.13, H * 0.86 - cheer + Math.sin(t * 2) * 4, 14, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.72);
    txt(outs + ' / ' + NEEDED, W / 2, 88, 66, C.gold);
    txt(String(Math.ceil(timeLeft)), 64, 88, 50, C.white, 'left');
    game.draw.rect(60, 172, W - 120, 20, '#4a3a4a');
    game.draw.rect(60, 172, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.gold);
    for (var s = 0; s < SHOTS; s++) drawMarble(W * 0.62 + s * 62, H * 0.95, 22, s < shotsLeft ? C.big : '#4a4a5a', null, false);
  }

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function scoreNow() { return outs * 200 + nices * 150 + shotsLeft * 120 + Math.round(timeLeft * 10) + (balls.length > 2 && balls[2].out ? 200 : 0); }

  // ── ループ ───────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (st === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawPieces();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 225, C.ink, 0.72);
      txt(GAME_TITLE, W / 2, 86 + Math.sin(t * 2) * 6, 76, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, 176, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawPieces();
      if (win) for (var f = 0; f < 12; f++) game.draw.circle((f * 157 + t * 200) % W, (f * 233 + t * 280) % (H * 0.7), 14, TINTS[f % 5], 0.8);
      game.draw.rect(0, H * 0.14, W, H * 0.2, C.ink, 0.8);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.19, 96, win ? C.gold : C.bad);
      txt('SCORE ' + (win ? scoreNow() : 0), W / 2, H * 0.25, 46, C.white);
      if (win && scoreNow() >= game.best) txt('NEW RECORD', W / 2, H * 0.3, 42, C.gold);
      else if (!win) txt('あと' + Math.max(1, NEEDED - outs) + '個!', W / 2, H * 0.3, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.3, 38, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 38, C.white);
      return;
    }

    if (st === 'ready') {
      readyT -= dt;
      if (readyT <= 0) { st = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (st === 'play') {
      timeLeft -= dt;
      if (pull) {
        aiming += dt;
        if (aiming > PULL_TIMEOUT) {
          // 引きっぱなし: ゴムが外れて空撃ち(1発消費)
          pull = null; shotsLeft--; aiming = 0;
          game.feedback.bad(SLX, SLY - 100, { text: 'MISS', color: C.bad });
        }
      }
      stepTable(dt, false);
      if (st === 'play') {
        if (timeLeft <= 0) {
          timeLeft = 0;
          game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP', color: C.bad });
          finish(false, false);
        } else if (shotsLeft <= 0 && big.home && !rolling) {
          game.feedback.bad(SLX, SLY - 100, { text: 'MISS', color: C.bad });
          finish(false, false);
        }
      }
    } else if (st === 'stop') {
      stopT -= dt;
      stepTable(dt * 0.25, true);
      if (stopT <= 0) { st = 'outro'; outroT = 1.3; }
    } else if (st === 'outro') {
      outroT -= dt;
      stepTable(dt, true);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { out: outs, nice: nices, shots: SHOTS - shotsLeft };
        if (win) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorld(); drawPieces(); drawHud();
    if (st === 'ready') txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 100, C.gold);
    if (st === 'outro') {
      game.draw.rect(0, H * 0.58, W, 150, C.ink, 0.8);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.62, 92, win ? C.gold : C.bad);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1], ['A4', 1],
      ['F#4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['B4', 1], ['G4', 1]
    ], { tempo: 112, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 2], ['A2', 2], ['D2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
