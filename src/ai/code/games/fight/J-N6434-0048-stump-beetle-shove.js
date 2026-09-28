// J-N6434-0048-stump-beetle-shove.js
// 切り株土俵の甲虫押し — 押しながら角に力を溜め、相手の大コガネが前脚を上げて重心が浮いた一瞬に放って土俵の外へ押し出す
// 操作: 押し続けると角に力が溜まる(踏ん張って押し負けにくくなる)。離すと突き上げる。相手が浮いた瞬間に離すと大きく押し返せる
// 終わり: 相手を切り株の縁の外へ出せばCLEAR。自分が縁から落ちる/時間切れでGAME OVER
// @mechanic: hold_charge
// @theme: stump_beetle_shove
// 世界観: 夏祭りの境内の切り株土俵で、子どもが育てた小さなカブトムシが、横綱格の大コガネの前脚が浮く一瞬を待って溜めた角を突き上げ、土俵の外へ押し出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 決まった突き上げの数と残り時間のスコア
// スタイル: 80s ISO
var STYLE = { bg: ['#10243a', '#2e5a4a'], main: ['#b07a44', '#7a4e26', '#d8a868'], accent: ['#ffd23f', '#ff5a3c'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg1: '#10243a', bg2: '#2e5a4a', top: '#d8a868', ring: '#b07a44', side: '#7a4e26', sideD: '#553518',
    gold: '#ffd23f', red: '#ff5a3c', ink: '#0c0f18', white: '#ffffff', blue: '#2a3f8f', blueL: '#5a7ad8', leaf: '#3f8f4a', green: '#6fe08a',
  };

  var GAME_TITLE = 'STUMP SHOVE';
  var TIME_LIMIT = 14;
  var NEEDED = 3;
  var CX = W * 0.5, CY = H * 0.46;
  var RX = 430, RY = 215;
  var SPAN = 330;
  var CHARGE_T = 0.8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KABUTO = [
    '..........hh',
    '.........hh.',
    '..bbbbb.hh..',
    '.bBBBBBbhh..',
    'bBBBBBBBbb..',
    'bBBBBBBBBbk.',
    '.bbbbbbbbbb.',
    '.l.l..l.l...',
  ];
  var KOGANE_A = [
    '...gggggg...',
    '.gGGGGGGGGg.',
    'gGGGGGGGGGGg',
    'gGGGGGGGGGGg',
    'kgggggggggg.',
    '.gggggggggg.',
    '..l..l..l...',
  ];
  var KOGANE_UP = [
    '....gggggg..',
    '..gGGGGGGGg.',
    '.gGGGGGGGGGg',
    'l.GGGGGGGGGg',
    'lkgggggggggg',
    '..ggggggggg.',
    '.....l..l...',
  ];
  var KID = ['..hhhh..', '.hhhhhh.', '.hffffh.', '..fkfk..', '..ffff..', '.rrrrrr.', 'r.rrrr.r'];

  var pos, charge, holding, timeLeft, ready, hitStop, focus, pendingEnd, finished, ok, endWait;
  var oppPhase, oppT, shoves, recoil, oppKnock, score, dust;

  function initGame() {
    pos = 0; charge = 0; holding = false;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; focus = null; pendingEnd = null; finished = false; ok = false; endWait = 0;
    oppPhase = 'push'; oppT = 1.5; shoves = 0; recoil = 0; oppKnock = 0; score = 0; dust = [];
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function contactX() { return CX + pos * SPAN; }

  function stepOpp(dt, prog) {
    oppT -= dt;
    if (oppPhase === 'push') {
      if (oppT <= 0) { oppPhase = 'rear'; oppT = 0.5; game.audio.tone('G3', 0.15, { wave: 'sawtooth', volume: 0.06, slide: 120 }); }
    } else if (oppPhase === 'rear') {
      if (oppT <= 0) { oppPhase = 'lift'; oppT = 0.45 - prog * 0.1; game.audio.play('se_powerup', 0.2); }
    } else if (oppPhase === 'lift') {
      if (oppT <= 0) {
        oppPhase = 'push'; oppT = 1.3 + game.random(0, 0.9) - prog * 0.4;
        pos -= 0.05; // 前脚を下ろす踏み込み
        for (var i = 0; i < 4; i++) dust.push({ x: contactX() + 120, y: CY + 40, vx: game.random(-120, 200), vy: game.random(-200, -60), life: 0.5 });
      }
    }
  }

  function release(demoMode) {
    var c = charge;
    charge = 0; holding = false;
    if (oppPhase === 'lift') {
      var push = 0.12 + 0.36 * c;
      pos += push; shoves++; oppKnock = 0.35;
      score += Math.round(100 * c) + 50;
      oppPhase = 'push'; oppT = 1.1 + game.random(0, 0.8);
      game.audio.play('se_jump', 0.35);
      game.feedback.good(contactX(), CY - 170, { text: c > 0.95 ? 'PERFECT' : 'GOOD', color: c > 0.95 ? C.gold : C.green, count: 14 });
      if (!demoMode && shoves === 2) { game.audio.play('se_milestone', 0.4); game.fx.popup('NICE', W / 2, H * 0.24, { color: C.gold, size: 64 }); }
    } else {
      pos -= 0.1; recoil = 0.3;
      game.feedback.bad(contactX(), CY - 170, { text: 'MISS', shake: 6 });
    }
  }

  function stepWorld(dt, prog, demoMode) {
    stepOpp(dt, prog);
    if (holding) {
      var before = charge;
      charge = Math.min(1, charge + dt / CHARGE_T);
      if (before < 1 && charge >= 1) game.audio.tone('C6', 0.08, { wave: 'square', volume: 0.06 });
    }
    // 相手は常に押してくる。溜めている間は踏ん張って押し負けにくい
    pos -= (holding ? 0.035 : 0.075) * (1 + prog * 0.5) * dt;
    if (recoil > 0) recoil -= dt;
    if (oppKnock > 0) oppKnock -= dt;
    for (var i = dust.length - 1; i >= 0; i--) {
      var d = dust[i]; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 600 * dt; d.life -= dt;
      if (d.life <= 0) dust.splice(i, 1);
    }
    if (pos >= 1) {
      if (demoMode) { game.feedback.good(contactX(), CY - 170, { text: 'CLEAR', count: 10 }); pos = 0; return; }
      pos = 1; focus = { opp: true }; hitStop = 0.45; pendingEnd = 'clear'; finished = true;
      score += Math.round(timeLeft * 20);
    } else if (pos <= -1) {
      if (demoMode) { game.feedback.bad(contactX(), CY - 170, { text: 'MISS', shake: 4 }); pos = 0; return; }
      pos = -1; focus = { me: true }; hitStop = 0.5; pendingEnd = 'fail'; finished = true;
      game.audio.play('se_break', 0.4);
    }
  }

  // 菱形の土俵(横1pxストリップ走査で塗る代わりに 6px 帯で)
  function diamond(cx, cy, rx, ry, color, alpha) {
    for (var y = -ry; y <= ry; y += 6) {
      var w = rx * (1 - Math.abs(y) / ry);
      game.draw.rect(cx - w, cy + y, w * 2, 6, color, alpha);
    }
  }

  function drawBg(pulse) {
    game.draw.gradient(0, H, [[0, C.bg1], [0.6, C.bg2], [1, C.bg1]]);
    game.draw.rect(0, 0, W, H, C.gold, pulse);
    // 境内の等角グリッド(地面)
    for (var gx = -8; gx < 16; gx++) {
      var x0 = gx * 140;
      game.draw.line(x0, H * 0.62, x0 + 560, H * 0.9, C.leaf, 2);
      game.draw.line(x0 + 560, H * 0.62, x0, H * 0.9, C.leaf, 2);
    }
    // 提灯
    for (var l = 0; l < 5; l++) {
      var lx = W * (0.1 + l * 0.2), sw = Math.sin(game.time.elapsed * 1.5 + l) * 8;
      game.draw.line(lx, H * 0.12, lx + sw, H * 0.16, C.side, 3);
      game.draw.circle(lx + sw, H * 0.17, 26, C.red, 0.85 + 0.15 * Math.sin(game.time.elapsed * 3 + l));
    }
    // 切り株 (側面→上面)
    diamond(CX, CY + 70, RX, RY, C.sideD);
    for (var s = 0; s < 70; s += 6) diamond(CX, CY + 70 - s, RX, RY, s % 12 ? C.side : C.sideD);
    diamond(CX, CY, RX, RY, C.ring);
    diamond(CX, CY, RX - 40, RY - 20, C.top);
    for (var r = 1; r < 4; r++) diamond(CX, CY, (RX - 40) * r / 4, (RY - 20) * r / 4, C.ring, 0.35);
    // 縁のしるし
    game.draw.circle(CX - SPAN - 60, CY, 14, C.red);
    game.draw.circle(CX + SPAN + 60, CY, 14, C.red);
  }

  function drawBeetles(pose) {
    var cx = contactX();
    var bob = Math.sin(game.time.elapsed * 5) * 4;
    var sway = Math.cos(game.time.elapsed * 2.1) * 3;
    // 影で高さを示す
    game.draw.circle(cx - 120, CY + 40, 90, C.ink, 0.3);
    game.draw.circle(cx + 150, CY + 40, 120, C.ink, 0.3);
    // 相手
    var up = oppPhase === 'lift' || oppPhase === 'rear' && oppT < 0.25;
    var rearShake = oppPhase === 'rear' ? Math.sin(game.time.elapsed * 40) * 6 : 0;
    var knock = oppKnock > 0 ? oppKnock * 90 : 0;
    var hlO = focus && focus.opp;
    if (oppPhase === 'rear') {
      var bl = Math.floor(game.time.elapsed * 14) % 2 === 0;
      game.draw.circle(cx + 150, CY - 180, 30, C.red, bl ? 0.9 : 0.35);
      game.draw.rect(cx + 144, CY - 250, 12, 40, C.red, bl ? 0.9 : 0.35);
    }
    if (oppPhase === 'lift') game.draw.circle(cx + 150, CY - 40, 150, C.white, 0.25 + 0.15 * Math.sin(game.time.elapsed * 25));
    if (hlO) game.draw.circle(cx + 150, CY - 40, 190, C.white, 0.6);
    game.draw.sprite(up ? KOGANE_UP : KOGANE_A, { g: '#b8871f', G: C.gold, k: C.ink, l: C.ink }, cx + 150 + rearShake + knock + sway, CY - 40 - (up ? 40 : 0) + bob, hlO ? 26 : 22, { anchor: 'center' });
    // 自分
    var hlM = focus && focus.me;
    if (hlM) game.draw.circle(cx - 120, CY - 40, 150, C.white, 0.6);
    var lean = holding ? -charge * 30 : 0;
    var jolt = recoil > 0 ? -recoil * 80 : 0;
    var flip = pose === 'down';
    game.draw.sprite(KABUTO, { h: C.ink, b: C.ink, B: holding && charge >= 1 ? C.blueL : C.blue, k: C.white, l: C.ink }, cx - 120 + lean + jolt + sway, CY - 40 + bob - (pose === 'cheer' ? Math.abs(Math.sin(game.time.elapsed * 7)) * 60 : 0), 20, { anchor: 'center', flipY: flip });
    if (holding) game.draw.circle(cx - 20, CY - 110, 20 + charge * 40, C.gold, 0.3 + 0.4 * charge);
    for (var i = 0; i < dust.length; i++) game.draw.circle(dust[i].x, dust[i].y, 12, C.top, dust[i].life * 1.5);
  }

  function drawButton(active) {
    var bx = W / 2, by = H * 0.84;
    var kb = Math.sin(game.time.elapsed * 2.6) * 4;
    game.draw.sprite(KID, { h: C.ink, f: '#f2c9a0', k: C.ink, r: C.red }, W * 0.13, H * 0.84 + kb, 16, { anchor: 'center' });
    game.draw.circle(bx, by + 10, 150, C.ink, 0.35);
    game.draw.circle(bx, by, 150, holding ? C.gold : C.ring, active ? 0.95 : 0.6);
    game.draw.circle(bx, by, 150 * charge, C.red, 0.85);
    game.draw.circle(bx, by, 60, C.top);
    game.draw.sprite(KABUTO, { h: C.ink, b: C.ink, B: C.blue, k: C.white, l: C.ink }, bx, by, 8, { anchor: 'center' });
    if (charge >= 1 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.circle(bx, by, 170, C.white, 0.3);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.1, C.ink, 0.6);
    // 押し合いメーター(土俵の位置)
    var mx = W * 0.12, mw = W * 0.5;
    game.draw.rect(mx, H * 0.03, mw, 40, C.sideD);
    game.draw.rect(mx + mw / 2, H * 0.03, 4, 40, C.white);
    game.draw.circle(mx + mw / 2 + pos * mw / 2, H * 0.03 + 20, 26, pos > 0 ? C.green : C.red);
    for (var i = 0; i < NEEDED; i++) game.draw.circle(W * 0.72 + i * 60, H * 0.05, 20, i < shoves ? C.gold : C.side);
    txt(shoves + '', W * 0.92, H * 0.05, 50, C.gold);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.088, W - 120, 16, C.sideD);
    game.draw.rect(60, H * 0.088, (W - 120) * frac, 16, low ? C.red : C.gold);
  }

  // ── ATTRACTデモ: 予告で押し始め、浮いた瞬間に離す。2回目はわざと早く離して押し返される ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; oppT = 0.8; demo.n = 0; }
    if (!holding && (oppPhase === 'rear' || (oppPhase === 'push' && oppT < 0.5))) { holding = true; game.audio.play('se_tap', 0.15); }
    var early = demo.n === 1;
    if (holding && ((oppPhase === 'lift' && oppT < 0.3 && !early) || (early && oppPhase === 'rear' && oppT < 0.2))) {
      demo.n++;
      release(true);
    }
    stepWorld(dt, 0.2, true);
    demo.press = holding;
    demo.gx = W / 2 + Math.sin(demo.t * 2) * 10;
    demo.gy = H * 0.84;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0.2) return;
    if (!holding) {
      holding = true;
      game.audio.play('se_tap', 0.15);
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || finished || !holding) return;
    game.audio.tone('A4', 0.05, { wave: 'square', volume: 0.05 });
    release(false);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !finished) game.fx.burst(x, y, { color: C.top, count: 3, speed: 120 });
  });

  function finishNow() {
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(contactX() + 150, CY - 150, { text: 'CLEAR', color: C.gold, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      game.feedback.bad(contactX() - 120, CY - 150, { text: pendingEnd === 'time' ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2; pendingEnd = null;
  }

  game.onUpdate(function(dt) {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.7);

    if (state === S.ATTRACT) {
      if (pos === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse);
      drawBeetles('');
      drawButton(true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, H * 0.12, C.ink, 0.55);
      txt(GAME_TITLE, W / 2, H * 0.045, 80, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.095, 38, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawBg(pulse);
      drawBeetles(ok ? 'cheer' : 'down');
      if (ok && Math.floor(game.time.elapsed * 5) % 2 === 0) game.fx.burst(game.random(W * 0.2, W * 0.8), H * 0.3, { color: C.gold, count: 4 });
      game.draw.rect(0, H * 0.62, W, H * 0.26, C.ink, 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.67, 100, ok ? C.gold : C.red);
      txt('SCORE ' + score, W / 2, H * 0.74, 56, C.white);
      if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.8, 48, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.8, 42, C.white);
      if (!ok) txt('あと' + Math.max(1, Math.round((1 - pos) * 50)) + '%!', W / 2, H * 0.85, 46, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { shoves: shoves });
        else game.end.failure({ shoves: shoves });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, Math.min(1, (TIME_LIMIT - timeLeft) / TIME_LIMIT), false);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'time'; hitStop = 0.45; focus = { me: true }; holding = false;
        game.fx.popup('TIME UP', W / 2, H * 0.25, { color: C.red, size: 80 });
      }
    }

    drawBg(pulse);
    drawBeetles('');
    drawButton(!finished && ready <= 0);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 0.5], ['G4', 0.5],
      ['E4', 0.5], ['D4', 0.5], ['E4', 1], [0, 1],
    ], { tempo: 120, wave: 'square', volume: 0.06, loop: true, bass: [['E2', 2], ['A2', 2], ['B2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
