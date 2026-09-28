// J-GC4-0037-haystage-balloon-shove.js
// 干し草台の紙風船押し — 降りてくる巨大な紙風船を横から突いて落下点をずらし、丸い台の外へ押し出す
// 操作: 風船をタップすると、タップした側と反対方向へ押される(横をつけば横へ、下をつけば奥へ)。影が台の外へ出れば押し出し成功
// 終わり: 制限時間内に規定数を押し出せばCLEAR。台の上に3個着地させる/時間切れでGAME OVER
// @mechanic: push_out
// @theme: festival_balloon_haystage
// 世界観: 春祭りの夜明け、丘の丸い干し草台で眠る子羊の上に祭りの巨大紙風船がふわふわ降りてくる。見張り番は風船を突いて落下点をずらし、台の外の草地へ流し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し出した風船の数・残りハート
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形、上下に情報を分ける
  var STYLE = { bg: ['#fde7f0', '#dff3ff', '#e7f8dc'], main: ['#f7c6d9', '#bfe3f7', '#fff3b8'], accent: ['#ff7aa8', '#7ac8ff'] };
  var C = {
    sky1: '#cfeeff', sky2: '#fde7f0', grass: '#c9efb4', grass2: '#b2e39a', hay: '#f7e3a1', hay2: '#e9cd7a', rim: '#ffffff',
    ink: '#6a4d6e', pink: '#ff8fb5', blue: '#86ccff', mint: '#8fe3c0', lemon: '#ffe98a', gold: '#ffc93c',
    shadow: '#7a6a3a', bad: '#ff5f7e', good: '#58d39a', white: '#ffffff'
  };

  var GAME_TITLE = 'BALLOON SHOVE';
  var TIME_LIMIT = 22;
  var NEEDED = 8;
  var HEARTS = 3;
  var CX = W / 2, CY = H * 0.6, RX = 440, RY = 190;
  var START_ALT = 980;
  var BAL_R = 105;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phase, ready, timeLeft, balloons, spawnT, pushed, hearts, pushes, hitStop, outro, ok, focus, midShown, elapsedPlay;

  // ── sprites ───────────────────────────────────────────────────────
  var LAMB = [
    ['..wwwww..', '.wwwwwww.', 'wwwwwwwww', 'wfffwwwww', 'fefffwwww', '.fffwwwww', '..w.w.w.w'],
    ['..wwwww..', '.wwwwwww.', 'wwwwwwwww', 'wfffwwwww', 'fzfffwwww', '.fffwwwww', '..w.w.w.w']
  ];
  var LAMB_PAL = { w: '#ffffff', f: '#f3d6c8', e: '#6a4d6e', z: '#6a4d6e' };
  var BALLOON = [
    '..pppppp..',
    '.pppppppp.',
    'pphppppppp',
    'pphhpppppp',
    'pppppppppp',
    'pppppppppp',
    'bbbbbbbbbb',
    '.pppppppp.',
    '..pppppp..',
    '...pppp...',
    '....ss....'
  ];
  var HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
  var PUFF = [['.w.', 'www', '.w.'], ['w.w', '.w.', 'w.w']];
  var ZZ = ['zzz', '..z', '.z.', 'zzz'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x, y + 3, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function norm(gx, gy) {
    var dx = (gx - CX) / RX, dy = (gy - CY) / RY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; balloons = []; spawnT = 0.3; pushed = 0; hearts = HEARTS;
    pushes = 0; hitStop = 0; outro = 0; ok = false; focus = null; midShown = false; elapsedPlay = 0;
  }

  var PASTELS = [C.pink, C.blue, C.mint, C.lemon];
  function spawn() {
    var ang = game.random(0, Math.PI * 2), r = game.random(0.05, 0.6);
    var gold = elapsedPlay > 6 && Math.random() < 0.2;
    balloons.push({
      gx: CX + Math.cos(ang) * RX * r, gy: CY + Math.sin(ang) * RY * r, vx: 0, vy: 0,
      alt: START_ALT, fall: 190 + Math.min(150, elapsedPlay * 8), col: gold ? C.gold : PASTELS[Math.floor(game.random(0, 4)) % 4],
      gold: gold, out: false, warned: false, squash: 0, gone: false
    });
  }

  // タップ位置から風船の中心へ向かう向きへ押す(実プレイ・デモ共用)
  function pushBalloon(b, tx, ty) {
    var bx = b.gx, by = b.gy - b.alt;
    var dx = bx - tx, dy = by - ty;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var power = b.gold ? 150 : 270;
    b.vx += (dx / d) * power;
    b.vy += (dy / d) * power * 0.45;
    b.alt = Math.min(START_ALT, b.alt + 70);
    b.squash = 0.25;
    pushes++;
  }

  function tapAt(x, y) {
    var best = null, bestD = 1e9;
    for (var i = 0; i < balloons.length; i++) {
      var b = balloons[i];
      if (b.out || b.gone) continue;
      var dx = x - b.gx, dy = y - (b.gy - b.alt - 20);
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < BAL_R * 1.25 && d < bestD) { best = b; bestD = d; }
    }
    if (best) {
      pushBalloon(best, x, y);
      game.audio.play('se_jump', 0.35);
      game.fx.burst(x, y, { color: C.white, count: 6, speed: 200 });
      return true;
    }
    return false;
  }

  function stepBalloons(dt, isDemo) {
    var retain = Math.pow(0.5, dt);
    for (var i = balloons.length - 1; i >= 0; i--) {
      var b = balloons[i];
      if (b.squash > 0) b.squash -= dt;
      b.gx += b.vx * dt; b.gy += b.vy * dt;
      b.vx *= retain; b.vy *= retain;
      if (b.out) {
        b.alt += 260 * dt;
        if (b.alt > START_ALT + 400) balloons.splice(i, 1);
        continue;
      }
      if (b.gone) {
        b.squash -= dt;
        if (b.squash < -0.6) balloons.splice(i, 1);
        continue;
      }
      b.alt -= b.fall * dt;
      if (!b.warned && b.alt < 260) {
        b.warned = true;
        if (!isDemo) game.audio.tone('E6', 0.08, { wave: 'square', volume: 0.05 });
      }
      if (norm(b.gx, b.gy) > 1.02) {
        b.out = true; b.vx *= 1.4; b.vy *= 1.4;
        if (!isDemo) {
          pushed += b.gold ? 2 : 1;
          game.feedback.good(b.gx, b.gy - b.alt, { text: b.gold ? 'PERFECT' : 'GOOD', color: b.gold ? C.gold : C.good, count: b.gold ? 20 : 10 });
          if (!midShown && pushed >= NEEDED / 2) {
            midShown = true;
            game.audio.play('se_milestone', 0.5);
            game.fx.popup(pushed + ' / ' + NEEDED, CX, H * 0.2, { color: C.pink, size: 64 });
          }
          if (pushed >= NEEDED) finish(true, b);
        } else {
          game.fx.burst(b.gx, b.gy - b.alt, { color: C.good, count: 8, speed: 220 });
        }
        continue;
      }
      if (b.alt <= 0) {
        b.alt = 0; b.gone = true; b.squash = 0;
        if (!isDemo) {
          hearts--;
          game.audio.play('se_break', 0.4);
          if (hearts <= 0) { finish(false, b); }
          else game.feedback.bad(b.gx, b.gy - 60, { text: 'MISS' });
        } else {
          game.fx.burst(b.gx, b.gy, { color: b.col, count: 10, speed: 260 });
        }
      }
    }
  }

  function finish(win, b) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.5; focus = b || null;
    game.audio.stopBgm();
    if (win) {
      game.fx.flash(C.lemon, 0.25);
      game.audio.play('se_success', 0.6);
    } else {
      game.feedback.bad(b ? b.gx : CX, b ? b.gy - 60 : CY, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play') return;
    if (!tapAt(x, y)) {
      // 空振り: 小さな風のひと吹きだけ
      game.audio.play('se_tap', 0.2);
      game.fx.burst(x, y, { color: C.white, count: 3, speed: 90 });
    }
  });

  // ── demo(一番低い風船を、中心側から外へ突く)──────────────────────
  var demo = { t: 0, gx: CX, gy: H * 0.85, press: false, cool: 0.4 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5;
    if (cyc < dt || demo.t <= dt) { balloons = []; spawnT = 0; elapsedPlay = 3; }
    elapsedPlay += dt;
    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = 1.6; }
    stepBalloons(dt, true);
    demo.cool -= dt;
    demo.press = demo.cool > 0.2;
    if (demo.cool <= 0) {
      var low = null;
      for (var i = 0; i < balloons.length; i++) {
        var b = balloons[i];
        if (b.out || b.gone || b.alt > 700) continue;
        if (!low || b.alt < low.alt) low = b;
      }
      if (low) {
        // 中心側を突く = 外へ押す
        var ox = low.gx - CX, oy = (low.gy - CY) * 2;
        var od = Math.sqrt(ox * ox + oy * oy) || 1;
        if (od < 30) { ox = 1; oy = 0; od = 1; }
        demo.gx = low.gx - ox / od * 70; demo.gy = low.gy - low.alt - 20 - oy / od * 40;
        pushBalloon(low, demo.gx, demo.gy);
        demo.cool = 0.45;
      } else {
        demo.gx = CX + Math.sin(demo.t) * 120; demo.gy = H * 0.86;
      }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky2], [0.35, C.sky1], [0.45, C.grass], [1, C.grass2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(t * 1.2));
    // 遠くの丘と旗
    for (var i = 0; i < 6; i++) {
      var fx = (i * 210 + t * 12) % (W + 100) - 50;
      game.draw.circle(fx, H * 0.43, 90, '#b8e6a0', 0.8);
    }
    // 干し草台(楕円を横ストリップで塗る)
    for (var k = -RY - 18; k <= RY + 18; k += 6) {
      var w = (RX + 18) * Math.sqrt(Math.max(0, 1 - (k / (RY + 18)) * (k / (RY + 18))));
      game.draw.rect(CX - w, CY + k + 24, w * 2, 6, C.hay2);
    }
    for (var j = -RY; j <= RY; j += 6) {
      var w2 = RX * Math.sqrt(Math.max(0, 1 - (j / RY) * (j / RY)));
      game.draw.rect(CX - w2 - 6, CY + j, w2 * 2 + 12, 6, C.rim);
      game.draw.rect(CX - w2, CY + j, w2 * 2, 6, (Math.floor((j + RY) / 18) % 2) ? C.hay : '#f3dc92');
    }
  }

  function drawLamb() {
    var t = game.time.elapsed;
    var fr = LAMB[Math.floor(t * 1.5) % 2];
    var bob = Math.sin(t * 2) * 5;
    game.draw.sprite(fr, LAMB_PAL, CX, CY - 40 + bob, 14, { anchor: 'center' });
    var zf = (t * 0.6) % 1;
    game.draw.sprite(ZZ, { z: C.ink }, CX + 90 + zf * 40, CY - 110 - zf * 80, 6, { anchor: 'center', alpha: 1 - zf });
  }

  function drawBalloons() {
    var t = game.time.elapsed;
    var list = balloons.slice().sort(function(a, b) { return a.gy - b.gy; });
    // 影を先に全部
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.gone && b.squash < -0.3) continue;
      var near = 1 - Math.min(1, b.alt / START_ALT);
      var blink = b.alt < 260 && !b.out && Math.floor(t * 12) % 2 === 0;
      var sr = 40 + near * 70;
      var inside = norm(b.gx, b.gy) <= 1;
      for (var k = -3; k <= 3; k++) {
        var w = sr * Math.sqrt(1 - (k / 3.5) * (k / 3.5));
        game.draw.rect(b.gx - w, b.gy + k * sr * 0.1, w * 2, sr * 0.1 + 1, blink ? C.bad : C.shadow, (inside ? 0.25 : 0.1) + near * 0.3);
      }
    }
    for (var j = 0; j < list.length; j++) {
      var bb = list[j];
      var sway = Math.sin(t * 2 + bb.gx * 0.01) * 12;
      var sq = bb.squash > 0 ? 1 + bb.squash : 1;
      var isFocus = focus === bb && phase === 'stop';
      var px = isFocus ? 22 : 20;
      if (bb.gone) {
        if (bb.squash > -0.3) game.draw.sprite(PUFF[Math.floor(t * 10) % 2], { w: bb.col }, bb.gx, bb.gy - 30, 30, { anchor: 'center', alpha: 0.8 });
        continue;
      }
      var y = bb.gy - bb.alt - 20;
      // 落下点へ伸びる点線(どこに落ちるかの予告)
      if (!bb.out) {
        for (var dy = y + 190; dy < bb.gy - 10; dy += 40) game.draw.rect(bb.gx - 3, dy, 6, 18, bb.alt < 260 ? C.bad : C.ink, 0.35);
      }
      game.draw.line(bb.gx + sway, y + 110, bb.gx, y + 170, C.ink, 3);
      game.draw.sprite(BALLOON, { p: bb.col, h: '#ffffff', b: '#ffffff', s: C.ink }, bb.gx + sway, y, px * sq, { anchor: 'center' });
      if (isFocus && Math.floor(t * 14) % 2 === 0) game.draw.circle(bb.gx + sway, y, BAL_R * 1.2, '#ffffff', 0.5);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, '#ffffff', 0.55);
    game.draw.rect(0, 222, W, 6, C.pink, 0.6);
    txt(pushed + ' / ' + NEEDED, W / 2, 90, 64, C.ink);
    for (var i = 0; i < HEARTS; i++) {
      game.draw.sprite(HEART, { r: i < hearts ? C.bad : '#e6d6e6' }, 70 + i * 70, 90, 10, { anchor: 'center' });
    }
    game.draw.rect(60, 170, W - 120, 20, '#f0e0ec');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 5 ? C.bad : C.blue);
    // 親指ゾーン: パステルの芝と花
    var t = game.time.elapsed;
    for (var f = 0; f < 7; f++) {
      var fx = 90 + f * 150, fy = H * 0.88 + Math.sin(t * 2 + f) * 8;
      game.draw.circle(fx, fy, 16, PASTELS[f % 4], 0.9);
      game.draw.circle(fx, fy, 6, '#ffffff');
    }
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawLamb(); drawBalloons();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 225, '#ffffff', 0.55);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 72, C.pink);
      txt('HI-SCORE ' + game.best, W / 2, 175, 36, C.ink);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 44, C.pink);
      else txt('INSERT COIN', W / 2, H * 0.94, 36, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawLamb();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 90, ok ? C.good : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, C.ink);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      timeLeft -= dt; elapsedPlay += dt;
      spawnT -= dt;
      var live = 0;
      for (var i = 0; i < balloons.length; i++) if (!balloons[i].out && !balloons[i].gone) live++;
      if (spawnT <= 0 && live < 2 + Math.floor(elapsedPlay / 8)) { spawn(); spawnT = Math.max(0.9, 1.9 - elapsedPlay * 0.06); }
      stepBalloons(dt, false);
      if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false, null); }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      stepBalloons(dt, true);
      if (outro <= 0) {
        state = S.RESULT;
        var score = pushed * 100 + hearts * 50;
        var stats = { pushed: pushed, hearts: hearts, pushes: pushes };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorld(); drawLamb(); drawBalloons(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 96, C.pink);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.28, W, H * 0.18, '#ffffff', 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, ok ? C.good : C.bad);
      txt('SCORE ' + (pushed * 100 + hearts * 50), W / 2, H * 0.39, 44, C.ink);
      if (ok && pushed * 100 + hearts * 50 > game.best) txt('NEW RECORD', W / 2, H * 0.43, 40, C.pink);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - pushed) + '個!', W / 2, H * 0.43, 44, C.bad);
      else txt('BEST ' + game.best, W / 2, H * 0.43, 36, C.ink);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['F5', 0.5], ['A5', 1],
      ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 1.5], ['R', 0.5]
    ], { tempo: 128, wave: 'sine', volume: 0.07, loop: true, bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
