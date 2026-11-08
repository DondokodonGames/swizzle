// I-GBA-0066v3-hearth-chestnut-flick.js
// 囲炉裏の栗はじき — 炉縁に乗せた栗を指で弾いて灰の上を転がし、光った窪みでぴたりと止めて落とし込む
// 操作: 炉縁の栗のあたりから指を奥へ払う。払う向き=転がる向き、払う速さ=勢い。窪みの上をゆっくり通ると落ちて止まり、速すぎると縁で跳ねて越える。真ん中の火に入ると栗がはぜる(勢いが余って火へ向かうと炎が揺らいでパチッと鳴る)。後半は白く盛った新しい灰が転がりを重くする
// 終わり: 6個のうち4個を光った窪みに入れればCLEAR。3個しくじると(止まり損ね・火に入れる)GAME OVER。18秒で時間切れ
// @mechanic: flick_launch
// @theme: winter_hearth_chestnut_flick
// 世界観: 雪深い冬の夜の囲炉裏端で、綿入れを着た老人が炉縁に並べた栗を指で弾いて灰の上を転がし、火を避けながら光った窪みに落として焼き栗を仕込んでいく
// 残るもの: 正誤(CLEAR/GAME OVER・TIME UP) + 仕込んだ栗の数・ぴったりの数・はぜさせた数・スコア
// スタイル: PIXEL HD

(function (game) {
  var STYLE = { bg: ['#1a1210', '#3a2418', '#5a3a26'], main: ['#b8aaa0', '#8a7e76', '#d8ccc0'], accent: ['#ff8a2a', '#ffd25a', '#c8402a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var DARK = STYLE.bg[0], WOOD = STYLE.bg[1], WOOD2 = STYLE.bg[2];
  var ASH = STYLE.main[0], ASHD = STYLE.main[1], ASHL = STYLE.main[2];
  var FLAME = STYLE.accent[0], GLOW = STYLE.accent[1], EMBER = STYLE.accent[2];
  var INK = '#0c0806', WHITE = '#fff8ec', NUT = '#7a3e1c', NUTL = '#b06a34', TATAMI = '#6a6a3a';

  var TITLE = 'CHESTNUT FLICK';
  var TIME_LIMIT = 18;
  var NEED = 4, MISSES = 3, TOTAL = 6;
  var BX0 = W * 0.08, BX1 = W * 0.92, BY0 = H * 0.17, BY1 = H * 0.7;   // 灰の床
  var START = { x: W / 2, y: H * 0.665 };
  var FIRE = { x: W / 2, y: H * 0.36, r: 105 };
  var HOLLOWS = [
    { x: W * 0.3, y: H * 0.55 }, { x: W * 0.72, y: H * 0.55 },
    { x: W * 0.78, y: H * 0.42 }, { x: W * 0.22, y: H * 0.41 },
    { x: W * 0.7, y: H * 0.26 }, { x: W * 0.3, y: H * 0.25 },
  ];
  var HR = 46, CAP_R = 40, CAP_V = 560;
  var DECEL = 1500;
  var SOFT = [null, null, null, { x: W * 0.62, y: H * 0.45, r: 110 }, { x: W * 0.56, y: H * 0.42, r: 120 }, { x: W * 0.4, y: H * 0.43, r: 130 }];

  var ELDER = [
    ['....wwww....', '...wwwwww...', '...ssssss...', '..sskssks...', '...ssssss...', '...swwwws...', '..cccccccc..', '.cccccccccc.', 'cccrrccrrccc', 'cccrrccrrccc', '.cccccccccc.'],
    ['....wwww....', '...wwwwww...', '...ssssss...', '..sskssks...', '...ssssss...', '...swwwws.ss', '..cccccccss.', '.ccccccccc..', 'cccrrccrrc..', 'cccrrccrrccc', '.cccccccccc.'],
    ['....wwww....', '...wwwwww...', '...ssssss...', '..sksssks...', '...sswwss...', 'ss.swwwws.ss', '.sccccccccs.', '.cccccccccc.', 'cccrrccrrccc', 'cccrrccrrccc', '.cccccccccc.'],
  ];
  var E_PAL = { w: '#e8e4dc', s: '#d8a47a', k: INK, c: '#3a4a6a', r: '#6a3a2a' };
  var NUT_S = ['..n..', '.nnn.', 'nnnnn', 'nnlnn', '.lll.'];
  var SPARK = [['.g.', 'gfg', '.g.'], ['g.g', '.f.', 'g.g']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ni, nut, phase, phT, roasted, misses, perfects, burnt, score, timeLeft, eFrame, eT, flare, warnedFire, drag;
  var ready, halt, over, won, timeUp, endT, resT, sent, prevBest;

  function target() { return HOLLOWS[ni % HOLLOWS.length]; }

  function setupNut(i) {
    ni = i; nut = { x: START.x, y: START.y, vx: 0, vy: 0, moving: false, inH: -1, capV: 0 };
    phase = 'aim'; phT = 0; warnedFire = false;
  }

  function initGame() {
    setupNut(0);
    roasted = []; misses = 0; perfects = 0; burnt = 0; score = 0; timeLeft = TIME_LIMIT;
    eFrame = 0; eT = 0; flare = 0; drag = null;
    ready = 0.8; halt = null; over = false; won = false; timeUp = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
  }

  // ── 弾く(プレイ・デモ共通) ──
  function flick(vx, vy, vol) {
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (vy > -120 || sp < 260) { game.audio.tone(240, 0.05, { wave: 'triangle', volume: 0.04 * vol }); return false; }
    // 向きは真上±55度に収める
    var ang = Math.atan2(vy, vx);
    var lim = 55 * Math.PI / 180;
    var up = -Math.PI / 2;
    ang = Math.max(up - lim, Math.min(up + lim, ang));
    sp = Math.min(2400, sp * 0.95);
    nut.vx = Math.cos(ang) * sp; nut.vy = Math.sin(ang) * sp; nut.moving = true;
    phase = 'roll'; eFrame = 1; eT = 0.3;
    game.audio.play('se_jump', 0.35 * vol);
    game.audio.tone(300 + sp * 0.3, 0.06, { wave: 'square', volume: 0.05 * vol });
    return true;
  }

  function frictionAt(x, y) {
    var s = SOFT[ni];
    if (s && Math.hypot(x - s.x, y - s.y) < s.r) return DECEL * 2.2;
    return DECEL;
  }

  // ── 転がりの1フレーム(プレイ・デモ共通)。結果を返す ──
  function stepNut(dt, vol) {
    if (!nut.moving) return null;
    var sp = Math.hypot(nut.vx, nut.vy);
    var dec = frictionAt(nut.x, nut.y) * dt;
    if (sp <= dec || sp < 25) { nut.vx = 0; nut.vy = 0; nut.moving = false; return settle(); }
    nut.vx -= nut.vx / sp * dec; nut.vy -= nut.vy / sp * dec;
    nut.x += nut.vx * dt; nut.y += nut.vy * dt;
    // 炉縁で跳ね返る
    if (nut.x < BX0 + 24) { nut.x = BX0 + 24; nut.vx = Math.abs(nut.vx) * 0.5; game.audio.tone(180, 0.04, { wave: 'square', volume: 0.05 * vol }); }
    if (nut.x > BX1 - 24) { nut.x = BX1 - 24; nut.vx = -Math.abs(nut.vx) * 0.5; game.audio.tone(180, 0.04, { wave: 'square', volume: 0.05 * vol }); }
    if (nut.y < BY0 + 24) { nut.y = BY0 + 24; nut.vy = Math.abs(nut.vy) * 0.5; game.audio.tone(180, 0.04, { wave: 'square', volume: 0.05 * vol }); }
    if (nut.y > BY1 - 10) { nut.y = BY1 - 10; nut.vy = -Math.abs(nut.vy) * 0.5; }
    // 火へ向かう予告(0.5秒先を読む)
    var sp2 = Math.hypot(nut.vx, nut.vy);
    var tq = Math.min(0.5, sp2 / DECEL);
    var travel = sp2 * tq - 0.5 * DECEL * tq * tq;
    var fx = nut.x + nut.vx / sp2 * travel, fy = nut.y + nut.vy / sp2 * travel;
    if (!warnedFire && Math.hypot(fx - FIRE.x, fy - FIRE.y) < FIRE.r) {
      warnedFire = true; flare = 0.6;
      game.audio.tone(1800, 0.25, { wave: 'sawtooth', volume: 0.04 * vol, slide: -1200 });
    }
    if (Math.hypot(nut.x - FIRE.x, nut.y - FIRE.y) < FIRE.r - 20) { nut.moving = false; return { res: 'burn' }; }
    // 窪み: ゆっくりなら落ちる、速ければ跳ねて越える
    for (var i = 0; i < HOLLOWS.length; i++) {
      var hh = HOLLOWS[i], d = Math.hypot(nut.x - hh.x, nut.y - hh.y);
      if (d < CAP_R) {
        if (sp2 < CAP_V) { nut.capV = sp2; nut.moving = false; nut.x = hh.x; nut.y = hh.y; nut.inH = i; return settle(); }
        if (nut.inH !== -10 - i) { nut.inH = -10 - i; nut.vx *= 0.85; nut.vy *= 0.85; game.audio.tone(420, 0.03, { wave: 'triangle', volume: 0.05 * vol }); }
      } else if (nut.inH === -10 - i) nut.inH = -1;
    }
    return null;
  }

  function settle() {
    if (nut.inH < 0) {
      for (var i = 0; i < HOLLOWS.length; i++) if (Math.hypot(nut.x - HOLLOWS[i].x, nut.y - HOLLOWS[i].y) < CAP_R) { nut.inH = i; nut.capV = 0; }
    }
    if (nut.inH >= 0 && HOLLOWS[nut.inH] === target()) return { res: 'in', perfect: nut.capV < 300 };
    return { res: 'cold' };
  }

  function nextNut() {
    if (roasted.length >= NEED) { finish(true); return; }
    if (ni >= TOTAL - 1) { finish(false); return; }
    setupNut(ni + 1);
    game.audio.tone(660, 0.06, { wave: 'sine', volume: 0.05 });
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 40) + (MISSES - misses) * 150;
    eFrame = ok ? 2 : 0; eT = 9;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 5; i++) game.fx.burst(W * (0.15 + i * 0.18), H * (0.25 + (i % 2) * 0.1), { color: i % 2 ? GLOW : FLAME, count: 16, speed: 400 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { roasted: roasted.length, perfect: perfects, burnt: burnt, misses: misses };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && phase === 'aim') game.audio.tone(320, 0.03, { wave: 'triangle', volume: 0.03 });
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || halt || ready > 0 || phase !== 'aim') return;
    drag = { pts: [{ x: x, y: y, t: game.time.elapsed }] };
    eFrame = 1; eT = 0.15;
    game.audio.tone(520, 0.02, { wave: 'triangle', volume: 0.04 });
  });
  game.onMove(function (x, y) {
    if (!drag || state !== S.PLAYING) return;
    drag.pts.push({ x: x, y: y, t: game.time.elapsed });
    if (drag.pts.length > 12) drag.pts.shift();
    if (drag.pts.length % 4 === 0) game.audio.tone(600, 0.01, { wave: 'triangle', volume: 0.02 });
  });
  game.onRelease(function (x, y) {
    if (!drag || state !== S.PLAYING) { drag = null; return; }
    var pts = drag.pts;
    pts.push({ x: x, y: y, t: game.time.elapsed });
    drag = null;
    if (phase !== 'aim' || over || halt) return;
    var last = pts[pts.length - 1], first = pts[0];
    for (var i = pts.length - 1; i >= 0; i--) { if (last.t - pts[i].t <= 0.12) first = pts[i]; }
    var dtm = Math.max(0.03, last.t - first.t);
    if (!flick((last.x - first.x) / dtm, (last.y - first.y) / dtm, 1)) game.audio.play('se_tap', 0.1);
  });

  // ── 描画 ──
  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, DARK], [0.12, WOOD], [0.75, '#2a1a10'], [1, DARK]]);
    // 奥: 障子と雪明かり(パララックス1)
    for (var s = 0; s < 4; s++) {
      game.draw.rect(60 + s * 250, H * 0.02, 220, H * 0.12, '#cfc6b0', 0.25);
      for (var g = 1; g < 3; g++) game.draw.rect(60 + s * 250 + g * 73, H * 0.02, 4, H * 0.12, WOOD, 0.6);
    }
    for (var f = 0; f < 12; f++) game.draw.rect((f * 97 + t * 20) % W, H * 0.02 + ((f * 61 + t * 40) % (H * 0.12)), 4, 4, WHITE, 0.35);
    // 畳(パララックス2)
    for (var m = 0; m < 4; m++) game.draw.rect(0, H * (0.72 + m * 0.07), W, 6, TATAMI, 0.5);
    // 火明かり(光源)
    var fl = 0.85 + Math.sin(t * 7) * 0.08 + Math.sin(t * 13) * 0.05 + flare * 0.3;
    for (var r = 0; r < 4; r++) game.draw.circle(FIRE.x, FIRE.y, (520 - r * 110) * fl, FLAME, 0.06 + r * 0.02);
  }

  function drawHearth(hl) {
    var t = game.time.elapsed;
    // 炉縁(木枠)と灰
    game.draw.rect(BX0 - 30, BY0 - 30, BX1 - BX0 + 60, BY1 - BY0 + 60, WOOD2);
    game.draw.rect(BX0 - 30, BY0 - 30, BX1 - BX0 + 60, 10, '#7a5436');
    game.draw.rect(BX0, BY0, BX1 - BX0, BY1 - BY0, ASH);
    for (var a = 0; a < 26; a++) game.draw.rect(BX0 + (a * 137) % (BX1 - BX0 - 20), BY0 + (a * 89) % (BY1 - BY0 - 10), 14, 6, a % 2 ? ASHD : ASHL, 0.5);
    // 火に近いほど灰が明るい(光の向きを統一)
    game.draw.circle(FIRE.x, FIRE.y, FIRE.r + 120, GLOW, 0.12);
    // 新しい灰の盛り
    var soft = SOFT[ni];
    if (soft && phase !== 'done') { game.draw.circle(soft.x, soft.y, soft.r, ASHL); game.draw.circle(soft.x - soft.r * 0.3, soft.y - soft.r * 0.3, soft.r * 0.4, WHITE, 0.35); }
    // 窪み
    var tg = target();
    for (var i = 0; i < HOLLOWS.length; i++) {
      var hh = HOLLOWS[i];
      var isT = hh === tg && !over;
      if (isT) game.draw.circle(hh.x, hh.y, HR + 18 + Math.sin(t * 6) * 6, GLOW, 0.45);
      game.draw.circle(hh.x, hh.y, HR, ASHD);
      game.draw.circle(hh.x + 6, hh.y + 8, HR - 12, '#6a5e56');
      if (roasted.indexOf(i) >= 0) game.draw.sprite(NUT_S, { n: '#3a1a0a', l: EMBER }, hh.x, hh.y, 10, { anchor: 'center' });
    }
    // 火(炭と炎、4フレーム)
    game.draw.circle(FIRE.x, FIRE.y, FIRE.r, '#2a1810');
    for (var c = 0; c < 7; c++) {
      var ca = c * 0.9 + 0.3;
      game.draw.circle(FIRE.x + Math.cos(ca) * 50, FIRE.y + Math.sin(ca) * 40, 26, c % 2 ? EMBER : '#4a2414');
    }
    var fr = Math.floor(t * 10) % 4;
    for (var k = 0; k < 5; k++) {
      var fh = 70 + ((k * 31 + fr * 17) % 40) + flare * 60;
      game.draw.circle(FIRE.x - 60 + k * 30, FIRE.y - fh * 0.4, 22 + (k % 2) * 6, FLAME, 0.85);
      game.draw.circle(FIRE.x - 60 + k * 30, FIRE.y - fh * 0.6, 12, GLOW, 0.9);
    }
    for (var sp = 0; sp < 4; sp++) {
      var sy = FIRE.y - ((t * 120 + sp * 60) % 220);
      game.draw.sprite(SPARK[(fr + sp) % 2], { g: GLOW, f: WHITE }, FIRE.x - 40 + sp * 28 + Math.sin(t * 3 + sp) * 10, sy, 5, { anchor: 'center' });
    }
    // 自在鉤と鉄瓶(揺れ)
    var sw = Math.sin(t * 1.2) * 8;
    game.draw.line(FIRE.x, 0, FIRE.x + sw, FIRE.y - 200, INK, 10);
    game.draw.circle(FIRE.x + sw, FIRE.y - 170, 60, '#1a1a1e');
    game.draw.circle(FIRE.x + sw - 20, FIRE.y - 190, 16, '#5a5a66', 0.6);
    // 栗
    if (nut && phase !== 'done') {
      var isH = halt && hl > 0;
      var scl = isH ? 13 + hl * 8 : 11;
      if (isH) game.draw.circle(nut.x, nut.y, 70 * (1 + hl * 0.5), WHITE, 0.5 * hl);
      game.draw.circle(nut.x + 6, nut.y + 10, 26, INK, 0.35);
      game.draw.sprite(NUT_S, { n: isH ? WHITE : NUT, l: isH ? WHITE : NUTL }, nut.x, nut.y, Math.round(scl), { anchor: 'center' });
    }
  }

  function drawElder() {
    var f = eT > 0 ? eFrame : 0;
    game.draw.sprite(ELDER[f], E_PAL, W * 0.5, H * 0.83 + Math.sin(game.time.elapsed * 1.8) * 5, 20, { anchor: 'center' });
    // 横に並べた残りの栗
    for (var i = 0; i < TOTAL - ni - 1 && i < 5; i++) game.draw.sprite(NUT_S, { n: NUT, l: NUTL }, W * 0.12 + i * 52, H * 0.73, 8, { anchor: 'center' });
  }

  function drawHud() {
    for (var i = 0; i < NEED; i++) game.draw.sprite(NUT_S, { n: i < roasted.length ? NUT : '#4a3a30', l: i < roasted.length ? EMBER : '#5a4a40' }, 70 + i * 66, 92, 10, { anchor: 'center' });
    big(String(score), W / 2, 112, 68, WHITE);
    for (var m = 0; m < MISSES; m++) game.draw.circle(W - 80 - m * 64, 92, 22, m < misses ? EMBER : '#4a3a30');
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 180, W - 120, 20, INK, 0.6);
    game.draw.rect(60, 180, (W - 120) * fr, 20, timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? EMBER : GLOW);
    big((ni + 1) + ' / ' + TOTAL, W / 2, H * 0.135, 40, ASHL);
  }

  // ── ATTRACT デモ: 弾いて窪みに入れる → 強すぎて火に入る(実ロジック) ──
  var DEMO_SHOTS = [{ vx: -708, vy: -725, ni: 0 }, { vx: 60, vy: -1500, ni: 1 }, { vx: 784, vy: -699, ni: 1 }];
  var demo = { t: 0, k: 0, gx: 0, gy: 0, press: false, wait: 0, haltT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.4;
    if (cyc < dt || demo.t <= dt) { setupNut(DEMO_SHOTS[0].ni); roasted = []; demo.k = 0; demo.wait = 0.6; demo.haltT = 0; halt = null; }
    if (eT > 0) eT -= dt;
    if (flare > 0) flare -= dt;
    if (demo.haltT > 0) {
      demo.haltT -= dt;
      if (demo.haltT <= 0) { halt = null; game.feedback.bad(nut.x, nut.y, { text: 'MISS', volume: 0.3, shake: 4 }); phase = 'done'; demo.wait = 0.6; }
      return;
    }
    if (phase === 'aim' && demo.k < DEMO_SHOTS.length) {
      demo.wait -= dt;
      var sh = DEMO_SHOTS[demo.k];
      var p = Math.max(0, Math.min(1, 1 - demo.wait / 0.5));
      demo.gx = START.x + sh.vx * 0.12 * p; demo.gy = START.y + 60 + sh.vy * 0.12 * p; demo.press = demo.wait < 0.5;
      if (demo.wait <= 0) { flick(sh.vx, sh.vy, 0.3); demo.k++; demo.press = false; }
    } else if (phase === 'roll') {
      var r = stepNut(dt, 0.3);
      if (r) {
        if (r.res === 'in') { roasted.push(nut.inH); game.feedback.good(nut.x, nut.y, { text: 'GOOD', color: GLOW, volume: 0.3 }); phase = 'done'; demo.wait = 0.6; }
        else { halt = { t: 0.4, max: 0.4 }; demo.haltT = 0.4; }
      }
    } else if (phase === 'done') {
      demo.wait -= dt;
      if (demo.wait <= 0 && demo.k < DEMO_SHOTS.length) { setupNut(DEMO_SHOTS[demo.k].ni); demo.wait = 0.7; }
    }
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var hlA = halt ? Math.max(0, demo.haltT / 0.4) : 0;
      drawRoom();
      drawHearth(hlA);
      drawElder();
      game.draw.hand(demo.gx || START.x, (demo.gy || START.y + 60) + Math.sin(game.time.elapsed * 3) * 4, { press: demo.press, scale: 15 });
      big(TITLE, W / 2, H * 0.075, 96, GLOW);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 42, ASHL);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.97, 46, FLAME);
      else big('INSERT COIN', W / 2, H * 0.97, 40, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.2) sendEnd();
      if (flare > 0) flare -= dt;
      drawRoom();
      drawHearth(0);
      drawElder();
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, INK, 0.8);
      big(won ? 'CLEAR' : timeUp ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.17, 104, won ? GLOW : EMBER);
      big('SCORE ' + score, W / 2, H * 0.22, 56, WHITE);
      big(roasted.length + ' / ' + NEED + '   ★' + perfects, W / 2, H * 0.265, 44, ASHL);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 60, GLOW);
      else big('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.31, 42, ASHL);
      if (!won) big('あと' + Math.max(1, NEED - roasted.length) + '個!', W / 2, H * 0.355, 58, FLAME);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.97, 40, WHITE);
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
        var cause = halt.cause;
        halt = null; misses++;
        game.feedback.bad(nut.x, nut.y, { text: 'MISS' });
        game.audio.play(cause === 'burn' ? 'se_break' : 'se_bad', 0.35);
        if (cause === 'burn') burnt++;
        phase = 'done'; phT = 0.5; eFrame = 0; eT = 0;
        if (misses >= MISSES) finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 4 && Math.floor((timeLeft + dt) * 2) !== Math.floor(timeLeft * 2)) game.audio.tone(990, 0.05, { wave: 'square', volume: 0.05 });
      if (phase === 'roll') {
        var r = stepNut(dt, 1);
        if (r) {
          if (r.res === 'in') {
            var t = target();
            roasted.push(nut.inH);
            var perfect = r.perfect;
            if (perfect) perfects++;
            score += perfect ? 260 : 160;
            game.feedback.good(t.x, t.y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GLOW : ASHL, count: perfect ? 16 : 9 });
            eFrame = 2; eT = 0.6;
            if (roasted.length === 2) { game.fx.popup('+300', W / 2, H * 0.48, { color: GLOW, size: 72 }); game.audio.play('se_milestone', 0.5); score += 300; }
            phase = 'done'; phT = 0.55;
          } else {
            halt = { t: r.res === 'burn' ? 0.5 : 0.35, max: r.res === 'burn' ? 0.5 : 0.35, cause: r.res };
            game.fx.flash(WHITE, 0.12);
          }
        }
      } else if (phase === 'done') {
        phT -= dt;
        if (phT <= 0) nextNut();
      }
      if (!over && timeLeft <= 0) {
        timeLeft = 0; timeUp = true;
        game.fx.flash(WHITE, 0.15);
        game.feedback.bad(nut.x, nut.y, { text: 'TIME UP' });
        finish(false);
      }
    }
    if (eT > 0 && !over) eT -= dt;
    if (flare > 0) flare -= dt;

    drawRoom();
    drawHearth(hl);
    drawElder();
    drawHud();
    if (drag && drag.pts.length > 1) {
      var a = drag.pts[0], b = drag.pts[drag.pts.length - 1];
      game.draw.line(a.x, a.y, b.x, b.y, GLOW, 8);
    }
    if (ni === 0 && phase === 'aim' && ready <= 0 && !over) {
      var k = (game.time.elapsed % 1.2) / 1.2;
      game.draw.hand(START.x - 40 * k, START.y + 80 - 200 * k, { press: k < 0.8, scale: 12, alpha: 0.5 });
    }
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, GLOW);
  });

  game.onStart(function () {
    game.audio.melody([
      ['D4', 1], ['F4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 1],
      ['A4', 0.5], ['G4', 0.5], ['F4', 1], ['D4', 1.5], ['R', 0.5],
      ['G4', 1], ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['D4', 2],
    ], { tempo: 84, wave: 'triangle', volume: 0.05, loop: true, bass: [['D2', 2], ['A2', 2], ['G2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
