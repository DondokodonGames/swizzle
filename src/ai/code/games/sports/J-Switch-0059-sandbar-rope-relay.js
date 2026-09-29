// J-Switch-0059-sandbar-rope-relay.js
// 中州の縄渡しリレー — 頭上で回す錘つきの縄を、放物線を読んで放ち、次の中州の杭の輪に掛けて渡る。自分の区間の3本を渡り切って次の走者へ
// 操作: タップで回している錘を放す。放した瞬間の向きへ飛び、山なりに落ちる。杭の上の輪を通れば掛かる。後半は吹き流しの向きに風で流れる(社内メモ。画面には出さない)
// 終わり: 3本の杭に掛けて渡り、次の走者に縄を渡せばCLEAR。時間切れでGAME OVER
// @mechanic: trajectory
// @theme: river_sandbar_rope_relay
// 世界観: 雨季の大河に点々と続く中州を縄一本でつなぐ渡し守のリレーで、第2走者を任された見習いの少年が、錘つきの縄を放って次の中州の杭に掛けては渡り、自分の区間の3本を越えて対岸の次の走者へ縄を手渡す
// 残るもの: 正誤(CLEAR/GAME OVER) + 掛けた数・投げた回数・区間タイム
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 巨大キャラ、床影、間合いで見せる
  var STYLE = { bg: ['#6ab0e0', '#a8d8f0', '#3a7aa0'], main: ['#c8a060', '#8a6a3a', '#f0d8a0'], accent: ['#e0402a', '#ffe060'] };
  var C = {
    sky1: '#4a90d0', sky2: '#b8e0f8', river1: '#3a7aa0', river2: '#1e4a6a', foam: '#e8f6ff', sand: '#e8c888', sandD: '#b8904a', grass: '#6a9a3a',
    post: '#7a5230', rope: '#f0e0b0', weight: '#5a5a62', skin: '#f0c090', hat: '#e8c860', shirt: '#e0402a', pants: '#3a4a7a', ink: '#141820', white: '#ffffff', bad: '#e0402a', gold: '#ffe060'
  };

  var GAME_TITLE = 'ROPE RELAY';
  var TIME_LIMIT = 18;
  var LEGS = 3;
  var GRAV = 1500;
  var GY = H * 0.6;
  var WATER_Y = H * 0.655;
  var KX = W * 0.2;
  var R_SWING = 120;
  var RING = 58;
  var LEG_SET = [
    { D: 560, dy: -30, wind: 0 },
    { D: 680, dy: 50, wind: 0 },
    { D: 600, dy: -110, wind: -260 }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, leg, phi, omega, shot, lastPath, cross, throws, perfects, hitStop, outro, ok, focus, camX, handoff, legT, legTimes, milestone;

  // ── sprites ───────────────────────────────────────────────────────
  var KID = [
    ['...hhhh...', '.hhhhhhhh.', '...ssss...', '...sksk...', '...ssss...', '..rrrrrr.s', '.srrrrrr.s', '..rrrrrr..', '..pppppp..', '..pp..pp..', '..pp..pp..', '.sss..sss.'],
    ['...hhhh...', '.hhhhhhhh.', '...ssss...', '...sksk...', '...ssss...', 's.rrrrrr..', 's.rrrrrr..', '..rrrrrr..', '..pppppp..', '..pp..pp..', '.pp....pp.', 'sss....sss']
  ];
  var MATE = ['..hh..', '.hhhh.', '..ss..', '.rrrr.', '.rrrr.', '.p..p.', '.p..p.'];
  var FLAG = ['kyyyy', 'kyyy.', 'kyy..', 'k....', 'k....', 'k....'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function legInfo(i) {
    var L = LEG_SET[Math.min(i, LEG_SET.length - 1)];
    var hx = KX + 20, hy = GY - 200;
    var tx = KX + L.D, ty = GY + L.dy - 170;
    // 45度で放ったとき輪に届く速さ(少し余裕を持たせる)
    var dx = tx - hx, dyv = ty - hy;
    var vx2 = GRAV * dx * dx / (2 * Math.max(60, dx + dyv));
    return { hx: hx, hy: hy, tx: tx, ty: ty, v: Math.sqrt(vx2 * 2) * 1.12, wind: L.wind, D: L.D, dy: L.dy };
  }

  function launch(p, L) {
    var wx = L.hx + Math.cos(p) * R_SWING, wy = L.hy + Math.sin(p) * R_SWING;
    return { x: wx, y: wy, vx: -Math.sin(p) * L.v, vy: Math.cos(p) * L.v };
  }

  // 放物線の予測(デモと判定用)
  function simulate(p, L) {
    var s = launch(p, L), best = 1e9;
    for (var k = 0; k < 160; k++) {
      var dt = 1 / 60;
      s.vx += L.wind * dt; s.vy += GRAV * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      var d = Math.hypot(s.x - L.tx, s.y - L.ty);
      if (d < best) best = d;
      if (s.y > WATER_Y) break;
    }
    return best;
  }
  function bestPhi(L) {
    var bp = -Math.PI * 0.75, bd = 1e9;
    for (var i = 0; i <= 120; i++) {
      var p = -Math.PI + i * Math.PI / 120;
      var d = simulate(p, L);
      if (d < bd) { bd = d; bp = p; }
    }
    return bp;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; leg = 0; phi = 0; omega = 3.4;
    shot = null; lastPath = []; cross = 0; throws = 0; perfects = 0; hitStop = 0; outro = 0; ok = false; focus = null;
    camX = 0; handoff = 0; legT = 0; legTimes = []; milestone = false;
  }

  // 回転・飛行・渡り(実プレイ・デモ共用)
  function stepRope(dt, isDemo) {
    var L = legInfo(leg);
    if (cross > 0) {
      cross -= dt;
      camX += (L.D / 0.9) * dt;
      if (cross <= 0) {
        camX = 0; leg++; phi = -Math.PI * 0.2; lastPath = [];
        omega = 3.4 + leg * 0.45;
        if (!isDemo) { legTimes.push(Math.round(legT * 10) / 10); legT = 0; }
        if (leg >= LEGS) { if (isDemo) { leg = 0; omega = 3.4; } else { handoff = 1; finish(true); } }
      }
      return;
    }
    phi += omega * dt;
    if (phi > Math.PI) phi -= Math.PI * 2;
    if (!shot) return;
    var s = shot;
    s.vx += L.wind * dt; s.vy += GRAV * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    s.path.push({ x: s.x, y: s.y });
    s.best = Math.min(s.best, Math.hypot(s.x - L.tx, s.y - L.ty));
    if (Math.hypot(s.x - L.tx, s.y - L.ty) < RING) {
      hooked(s, isDemo);
    } else if (s.y > WATER_Y || s.x > W + 200 || s.x < -200) {
      splash(s, isDemo);
    }
  }

  function throwNow(isDemo) {
    if (shot || cross > 0) return false;
    var L = legInfo(leg);
    var s = launch(phi, L);
    s.path = []; s.best = 1e9; s.pred = simulate(phi, L);
    shot = s;
    if (!isDemo) { throws++; game.audio.play('se_jump', 0.4); }
    return true;
  }

  function hooked(s, isDemo) {
    var L = legInfo(leg);
    var perf = s.pred < 24;
    shot = null; cross = 0.9;
    if (isDemo) { game.fx.burst(L.tx, L.ty, { color: C.gold, count: 8, speed: 180 }); return; }
    if (perf) perfects++;
    game.feedback.good(L.tx, L.ty - 110, { text: perf ? 'PERFECT' : 'GOOD', color: C.gold, count: perf ? 16 : 10 });
    game.audio.play('se_coin', 0.4);
    if (!milestone && leg === 0) {
      milestone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('1 / ' + LEGS, W / 2, H * 0.25, { color: C.white, size: 70 });
    } else if (leg === 1) {
      game.fx.popup('2 / ' + LEGS, W / 2, H * 0.25, { color: C.white, size: 70 });
    }
  }

  function splash(s, isDemo) {
    lastPath = s.path.filter(function(p, i) { return i % 4 === 0; });
    shot = null;
    game.fx.burst(Math.max(40, Math.min(W - 40, s.x)), WATER_Y, { color: C.foam, count: isDemo ? 8 : 16, speed: 300 });
    if (isDemo) return;
    focus = { x: Math.max(40, Math.min(W - 40, s.x)), y: WATER_Y, t: 0.4 };
    hitStop = 0.35;
    game.feedback.bad(Math.max(120, Math.min(W - 120, s.x)), WATER_Y - 120, { text: 'MISS', color: C.bad });
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) {
      game.fx.flash(C.gold, 0.25);
      game.fx.burst(W * 0.6, GY - 200, { color: C.gold, count: 30, speed: 420 });
      game.audio.play('se_success', 0.6);
    } else {
      focus = { x: KX, y: GY - 150, t: 0.6 };
      game.feedback.bad(KX + 120, GY - 380, { text: 'TIME UP', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase === 'play' && hitStop <= 0 && throwNow(false)) { game.audio.play('se_tap', 0.25); return; }
    game.audio.tone('E3', 0.04, { wave: 'triangle', volume: 0.03 });
    game.fx.burst(x, y, { color: C.foam, count: 3, speed: 80 });
  });

  // ── demo(放物線を読んで放つ。1周に1回、早すぎて川へ落とす)──
  var demo = { t: 0, gx: W * 0.6, gy: H * 0.86, press: 0, target: 0, early: false };
  var DEMO_CYC = 9;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { leg = 0; omega = 3.4; phi = -Math.PI * 0.2; shot = null; cross = 0; camX = 0; lastPath = []; demo.early = false; demo.target = bestPhi(legInfo(0)); }
    var before = phi;
    stepRope(dt, true);
    if (cross > 0 && cross - dt <= 0) demo.target = bestPhi(legInfo((leg + 1) % LEGS));
    if (demo.press > 0) demo.press -= dt;
    if (!shot && cross <= 0) {
      var aim = demo.target;
      if (!demo.early && cyc > 1) aim -= 0.9;
      var crossed = before < aim && phi >= aim;
      if (crossed) { throwNow(true); demo.press = 0.2; if (aim !== demo.target) demo.early = true; }
    }
    demo.gx = W * 0.6 + Math.sin(demo.t * 0.9) * 30;
    demo.gy = H * 0.86 - (demo.press > 0 ? 16 : 0);
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawRiver() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.45, C.sky2], [0.62, C.river1], [1, C.river2]]);
    // 遠くの岸と雨雲
    for (var c = 0; c < 5; c++) game.draw.circle(((c * 260 - t * 12) % (W + 300)) + 150, H * 0.16 + (c % 2) * 40, 110, C.white, 0.35);
    game.draw.rect(0, H * 0.5, W, 30, C.grass, 0.5);
    // 川の流れ
    for (var i = 0; i < 18; i++) {
      var fx = ((i * 137 + t * 160) % (W + 200)) - 100, fy = WATER_Y + 20 + (i % 6) * 70;
      game.draw.rect(fx, fy, 90, 6, C.foam, 0.35);
    }
    var L = legInfo(leg < LEGS ? leg : LEGS - 1);
    // 今いる中州
    var ox = -camX;
    game.draw.rect(ox + KX - 260, GY + 40, 420, 26, C.ink, 0.25);
    game.draw.rect(ox + KX - 240, GY, 400, 60, C.sand);
    game.draw.rect(ox + KX - 240, GY + 50, 400, 14, C.sandD);
    // 次の中州と杭と輪
    var nx = ox + L.tx;
    var gy2 = GY + L.dy;
    game.draw.rect(nx - 170, gy2 + 40, 360, 26, C.ink, 0.25);
    game.draw.rect(nx - 160, gy2, 330, WATER_Y - gy2 + 30, C.sand);
    game.draw.rect(nx - 160, WATER_Y + 16, 330, 14, C.sandD);
    game.draw.rect(nx - 14, L.ty, 28, gy2 - L.ty, C.post);
    var ringPulse = 1 + 0.06 * Math.sin(t * 5);
    game.draw.circle(nx, L.ty, RING * ringPulse, C.gold, 0.25);
    game.draw.circle(nx, L.ty, 30, C.post);
    game.draw.circle(nx, L.ty, 18, C.sand);
    // 吹き流し(風の向き)
    if (L.wind !== 0) {
      var fl = FLAG;
      game.draw.sprite(fl, { k: C.post, y: C.gold }, nx + 110 + Math.sin(t * 8) * 4, gy2 - 60, 14, { anchor: 'center', flipX: L.wind < 0 });
      for (var w = 0; w < 5; w++) game.draw.rect(((W - (t * 300 + w * 230) % (W + 200))), H * 0.3 + w * 60, 70, 4, C.white, 0.5);
    }
    // 対岸の次の走者(最後の区間)
    if (leg === LEGS - 1 || handoff > 0) game.draw.sprite(MATE, { h: C.hat, s: C.skin, r: '#3aa04a', p: C.pants }, nx + 60, gy2 - 60 + Math.sin(t * 3) * 5, 14, { anchor: 'center' });
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(t * 1.3));
  }

  function drawThrower() {
    var t = game.time.elapsed;
    var L = legInfo(leg < LEGS ? leg : LEGS - 1);
    var ox = -camX;
    var kx = KX + ox + (cross > 0 ? (0.9 - cross) / 0.9 * L.D : 0);
    var ky = GY - 110 + (cross > 0 ? Math.sin((0.9 - cross) / 0.9 * Math.PI) * -80 : Math.sin(t * 2.5) * 4);
    // 床影
    game.draw.rect(kx - 80, GY + 30, 160, 16, C.ink, 0.3);
    game.draw.sprite(KID[Math.floor(t * 3) % 2], { h: C.hat, s: C.skin, k: C.ink, r: C.shirt, p: C.pants }, kx, ky, 18, { anchor: 'center' });
    // 縄: 回転中は錘、渡り中は張った縄
    if (cross > 0) {
      game.draw.line(KX + ox + 20, L.hy, ox + L.tx, L.ty, C.rope, 6);
    } else if (!shot) {
      var wx = L.hx + ox + Math.cos(phi) * R_SWING, wy = L.hy + Math.sin(phi) * R_SWING;
      game.draw.line(L.hx + ox, L.hy, wx, wy, C.rope, 5);
      game.draw.circle(wx, wy, 22, C.ink);
      game.draw.circle(wx, wy, 18, C.weight);
      game.draw.circle(L.hx + ox, L.hy, R_SWING, C.white, 0.08);
    } else {
      game.draw.line(L.hx, L.hy, shot.x, shot.y, C.rope, 3);
      game.draw.circle(shot.x, shot.y, 22, C.ink);
      game.draw.circle(shot.x, shot.y, 18, C.weight);
    }
    // 前回外した軌跡
    for (var i = 0; i < lastPath.length; i++) game.draw.circle(lastPath[i].x, lastPath[i].y, 6, C.white, 0.35);
    if (focus && focus.t > 0 && Math.floor(t * 14) % 2 === 0) game.draw.circle(focus.x, focus.y, 90, C.bad, 0.4);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.65);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 70, 96, 56, C.white, 'left');
    txt(Math.min(leg, LEGS) + ' / ' + LEGS, W / 2, 96, 66, C.gold);
    for (var i = 0; i < LEGS; i++) game.draw.rect(W - 230 + i * 66, 70, 50, 40, i < leg ? C.gold : '#4a5a6a');
    game.draw.rect(60, 170, W - 120, 18, '#4a5a6a');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, timeLeft < 4 ? C.bad : C.gold);
    // 親指ゾーン(岸の石)
    game.draw.rect(0, H * 0.8, W, H * 0.2, C.ink, 0.3);
  }

  function score() { return leg * 300 + perfects * 80 + Math.round(Math.max(0, timeLeft) * 30) - Math.max(0, throws - leg) * 30; }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (focus && focus.t > 0 && phase !== 'stop') focus.t -= dt;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawRiver(); drawThrower();
      game.draw.rect(0, H * 0.8, W, H * 0.2, C.ink, 0.3);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.65);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 100 + Math.sin(t * 2) * 6, 84, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, 190, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawRiver(); drawThrower();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.36, 48, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.4, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      phi += omega * dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt; legT += dt;
        stepRope(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { hooked: Math.min(leg, LEGS), throws: throws, perfect: perfects, legTimes: legTimes.join('/') };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawRiver(); drawThrower(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, C.gold);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.25, W, H * 0.17, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.35, 44, C.white);
      if (ok && score() > game.best) txt('NEW RECORD', W / 2, H * 0.395, 42, C.gold);
      else if (!ok) txt('あと' + Math.max(1, LEGS - leg) + '本!', W / 2, H * 0.395, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.395, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 1], ['A4', 0.5], ['B4', 0.5], ['D5', 1], ['B4', 1],
      ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 2]
    ], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 2], ['E2', 2], ['C2', 2], ['D2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
