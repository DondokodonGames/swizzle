// J-N6434-0057-tether-hound-roundup.js
// つなぎ犬の子ヤギ集め — 杭に鎖でつながれた牧羊犬を飛びかからせ、鎖の届く輪の中に来た子ヤギだけを捕まえる
// 操作: タップした所へ犬が飛びかかる(鎖の長さより先へは届かない)。空振りすると鎖がからまって少し動けない
// 終わり: 制限時間内に子ヤギ6頭ぶんを囲いへ戻せば成功(鈴付きは2頭ぶん)。時間切れで失敗
// @mechanic: chase
// @theme: tethered_sheepdog_roundup
// 世界観: 嵐で柵が壊れた夕暮れの牧場。杭に鎖でつながれた老いた牧羊犬が、鎖の輪の内側へ迷い込んだ子ヤギを見計らって飛びかかり、日が落ちる前に囲いへ戻す
// 残るもの: 正誤(CLEAR/GAME OVER) + 捕まえた頭数・空振り数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質・粒状ノイズ、背景は1枚絵として描く
  var STYLE = { bg: ['#1c1a24', '#3b3325'], main: ['#8c8f99', '#c9ccd6', '#5a4a36'], accent: ['#e8b04a', '#d8584a'] };
  var C = { ground: '#4a4230', groundDark: '#2e2a20', metal: '#9aa0ad', metalHi: '#e3e7f0', ink: '#141218',
    gold: '#e8b04a', red: '#d8584a', good: '#9fd86a', white: '#f2efe6', fence: '#6b5638' };

  var GAME_TITLE = 'TETHER ROUNDUP';
  var TIME_LIMIT = 18;
  var NEEDED = 6;
  var STAKE = { x: 540, y: H * 0.46 };
  var CHAIN_R = 330;
  var CATCH_R = 82;
  var LUNGE_T = 0.22;
  var BACK_T = 0.3;
  var TANGLE_T = 0.6;
  var FIELD = { x0: 90, x1: 990, y0: H * 0.19, y1: H * 0.74 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var dog, goats, penned, lunges, whiffs, bellUsed, timeLeft, ready, hitStop, finished, ok, done, endWait, score, flashGoat;
  var grain = [];
  for (var gi = 0; gi < 90; gi++) grain.push({ x: Math.random() * W, y: Math.random() * H });

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: '#000000', bold: true, align: align || 'center', font: 'serif' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'serif' });
  }

  var DOG_A = ['.bb.....', 'bbbb...t', 'bKbbbbbt', '.bbhhbb.', '..bbbbb.', '..b..b..'];
  var DOG_B = ['.bb.....', 'bbbb..t.', 'bKbbbbbt', '.bbhhbb.', '.bbbbbb.', '.b....b.'];
  var DOG_PAL = { b: '#b8946a', K: '#141218', h: '#e3e7f0', t: '#5a4a36' };
  var GOAT_A = ['h....', 'ww...', 'wwwww', '.wwww', '.w..w'];
  var GOAT_B = ['h....', 'ww...', 'wwwww', '.wwww', 'w..w.'];
  var GOAT_PAL = { w: '#e9e2d0', h: '#8c8f99' };
  var BELL_PAL = { w: '#f2e2a8', h: '#e8b04a' };
  var CROW = ['.kk.', 'kkkk', '.k.k'];

  function spawnGoat(bell) {
    var side = Math.floor(game.random(0, 3.99));
    var x = side === 0 ? FIELD.x0 : side === 1 ? FIELD.x1 : game.random(FIELD.x0, FIELD.x1);
    var y = side < 2 ? game.random(FIELD.y0, FIELD.y1) : (side === 2 ? FIELD.y0 : FIELD.y1);
    var g = { x: x, y: y, tx: x, ty: y, sp: game.random(90, 140) * (bell ? 1.35 : 1), flee: 0, react: 0, bell: !!bell, ph: Math.random() * 6 };
    pickTarget(g);
    return g;
  }
  function pickTarget(g) {
    var a = Math.random() * Math.PI * 2, r = game.random(150, 520);
    g.tx = Math.max(FIELD.x0, Math.min(FIELD.x1, STAKE.x + Math.cos(a) * r));
    g.ty = Math.max(FIELD.y0, Math.min(FIELD.y1, STAKE.y + Math.sin(a) * r));
  }

  function initGame() {
    dog = { x: STAKE.x, y: STAKE.y + 60, mode: 'rest', t: 0, sx: 0, sy: 0, ex: 0, ey: 0, face: 1 };
    goats = [spawnGoat(false), spawnGoat(false), spawnGoat(false), spawnGoat(false)];
    penned = 0; lunges = 0; whiffs = 0; bellUsed = false; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0;
    finished = false; ok = false; done = false; endWait = 0; score = 0; flashGoat = null;
  }

  // 飛びかかる — プレイもデモもここを通る
  function lunge(x, y, live) {
    if (dog.mode !== 'rest') return false;
    var dx = x - STAKE.x, dy = y - STAKE.y, d = Math.hypot(dx, dy) || 1;
    var taut = d > CHAIN_R;
    var r = Math.min(CHAIN_R, d);
    dog.mode = 'lunge'; dog.t = 0; dog.sx = dog.x; dog.sy = dog.y;
    dog.ex = STAKE.x + dx / d * r; dog.ey = STAKE.y + dy / d * r; dog.taut = taut;
    dog.face = dog.ex >= dog.x ? 1 : -1;
    lunges++;
    // 近くの子ヤギは一拍遅れて逃げ出す
    for (var i = 0; i < goats.length; i++) {
      var g = goats[i];
      if (Math.hypot(g.x - dog.ex, g.y - dog.ey) < 280) { g.react = 0.12; g.flee = 0.55; }
    }
    if (live) game.audio.play('se_jump', 0.35);
    return true;
  }

  function landLunge(live) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < goats.length; i++) {
      var d = Math.hypot(goats[i].x - dog.x, goats[i].y - dog.y);
      if (d < CATCH_R && d < bd) { bd = d; best = i; }
    }
    if (best >= 0) {
      var g = goats[best];
      var worth = g.bell ? 2 : 1;
      penned += worth; score += 100 * worth;
      flashGoat = { x: g.x, y: g.y, t: 0.35, bell: g.bell };
      goats.splice(best, 1);
      if (penned < NEEDED) {
        var wantBell = !bellUsed && penned >= 2;
        if (wantBell) bellUsed = true;
        goats.push(spawnGoat(wantBell));
      }
      dog.mode = 'back'; dog.t = 0; dog.sx = dog.x; dog.sy = dog.y;
      if (live) {
        game.feedback.good(dog.x, dog.y - 70, { text: worth > 1 ? 'NICE' : 'GOOD', color: worth > 1 ? C.gold : C.good });
        game.audio.play('se_coin', 0.4);
        if (penned >= 3 && penned - worth < 3) { game.audio.play('se_milestone', 0.5); game.fx.popup(Math.min(penned, NEEDED) + ' / ' + NEEDED, W / 2, H * 0.16, { color: C.gold, size: 64 }); }
        if (penned >= NEEDED) { finished = true; ok = true; hitStop = 0.45; score += Math.round(timeLeft * 30); }
      }
    } else {
      whiffs++;
      dog.mode = 'tangle'; dog.t = 0;
      if (live) {
        if (dog.taut) game.audio.play('se_break', 0.3);
        game.feedback.bad(dog.x, dog.y - 60, { text: 'MISS', shake: 5 });
      }
    }
  }

  function stepWorld(dt, live) {
    dog.t += dt;
    if (dog.mode === 'lunge') {
      var k = Math.min(1, dog.t / LUNGE_T);
      var e = 1 - (1 - k) * (1 - k);
      dog.x = dog.sx + (dog.ex - dog.sx) * e; dog.y = dog.sy + (dog.ey - dog.sy) * e;
      if (k >= 1) landLunge(live);
    } else if (dog.mode === 'back' || (dog.mode === 'tangle' && dog.t > TANGLE_T)) {
      if (dog.mode === 'tangle') { dog.mode = 'back'; dog.t = 0; dog.sx = dog.x; dog.sy = dog.y; }
      var kb = Math.min(1, dog.t / BACK_T);
      var rx = STAKE.x + (dog.sx - STAKE.x) * 0.25, ry = STAKE.y + (dog.sy - STAKE.y) * 0.25;
      dog.x = dog.sx + (rx - dog.sx) * kb; dog.y = dog.sy + (ry - dog.sy) * kb;
      if (kb >= 1) { dog.mode = 'rest'; dog.t = 0; }
    }
    for (var i = 0; i < goats.length; i++) {
      var g = goats[i];
      g.ph += dt * 8;
      var tx = g.tx, ty = g.ty, sp = g.sp;
      if (g.react > 0) { g.react -= dt; }
      else if (g.flee > 0) {
        g.flee -= dt;
        var ax = g.x - dog.x, ay = g.y - dog.y, ad = Math.hypot(ax, ay) || 1;
        tx = g.x + ax / ad * 200; ty = g.y + ay / ad * 200; sp = g.sp * 2.1;
      }
      var dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
      if (d < 12) { if (g.flee <= 0) pickTarget(g); }
      else { g.x += dx / d * sp * dt; g.y += dy / d * sp * dt; g.face = dx >= 0 ? 1 : -1; }
      g.x = Math.max(FIELD.x0, Math.min(FIELD.x1, g.x));
      g.y = Math.max(FIELD.y0, Math.min(FIELD.y1, g.y));
    }
    if (flashGoat) { flashGoat.t -= dt; if (flashGoat.t <= 0) flashGoat = null; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
    if (finished || ready > 0) return;
    if (!lunge(x, y, true)) {
      game.audio.tone(dog.mode === 'tangle' ? 180 : 420, 0.05, { wave: 'square', volume: 0.04 });
      game.fx.burst(dog.x, dog.y, { color: C.metal, count: 3, speed: 90 });
    } else {
      game.audio.play('se_tap', 0.2);
    }
  });

  // ── ATTRACT: 本物の lunge/stepWorld で、輪の内側の子ヤギを狙う。3回に1回は輪の外へ空振り ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: false, cd: 0.6, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.cd = 0.6; demo.n = 0; }
    stepWorld(dt, false);
    demo.cd -= dt;
    var tgt = null, bd = 1e9;
    for (var i = 0; i < goats.length; i++) {
      var d = Math.hypot(goats[i].x - STAKE.x, goats[i].y - STAKE.y);
      if (d < CHAIN_R - 20 && d < bd) { bd = d; tgt = goats[i]; }
    }
    var wantWhiff = demo.n % 3 === 2;
    var aimX = tgt && !wantWhiff ? tgt.x : STAKE.x + 420, aimY = tgt && !wantWhiff ? tgt.y : STAKE.y - 260;
    demo.gx += (aimX - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (aimY + 30 - demo.gy) * Math.min(1, dt * 6);
    demo.press = demo.cd < 0.12 && demo.cd > -0.1;
    if (demo.cd <= 0 && dog.mode === 'rest' && (tgt || wantWhiff)) {
      lunge(aimX, aimY, false);
      demo.n++; demo.cd = 0.95;
    }
  }

  function drawScene(t) {
    var pulse = 0.06 + 0.04 * Math.sin(t * 1.1);
    game.draw.gradient(0, H, [[0, '#2a2233'], [0.16, '#6b4a3a'], [0.2, C.ground], [1, C.groundDark]]);
    // 遠景の納屋(1枚絵)
    game.draw.rect(W * 0.62, H * 0.06, 300, 150, '#241e1a');
    game.draw.rect(W * 0.62 + 110, H * 0.06 + 70, 80, 80, '#e8b04a', 0.25 + pulse);
    game.draw.rect(W * 0.08, H * 0.1, 200, 90, '#2c2520');
    // 柵
    for (var f = 0; f < 12; f++) {
      var fx = 40 + f * 92;
      game.draw.rect(fx, H * 0.165, 14, 60, C.fence);
    }
    game.draw.rect(0, H * 0.18, W, 10, C.fence);
    // 地面の陰影と光
    game.draw.circle(STAKE.x, STAKE.y, 520, '#000000', 0.12);
    game.draw.circle(STAKE.x - 120, STAKE.y - 160, 300, '#e8b04a', 0.05 + pulse * 0.3);
    // 鎖の届く輪(点線)
    for (var a = 0; a < 48; a++) {
      var ang = a / 48 * Math.PI * 2 + t * 0.05;
      game.draw.circle(STAKE.x + Math.cos(ang) * CHAIN_R, STAKE.y + Math.sin(ang) * CHAIN_R, 5, C.metalHi, 0.25 + 0.1 * Math.sin(t * 2 + a));
    }
    // 囲い(親指ゾーン)
    game.draw.rect(90, H * 0.8, W - 180, 190, '#3a2e22');
    for (var p = 0; p < 9; p++) game.draw.rect(90 + p * ((W - 180) / 8) - 6, H * 0.79, 14, 210, C.fence);
    // 見物のカラス(演出AI)
    game.draw.sprite(CROW, { k: '#141218' }, W * 0.2 + Math.sin(t * 0.8) * 12, H * 0.155 + Math.abs(Math.sin(t * 3)) * -8, 9, { anchor: 'center' });
    // 粒状ノイズ
    for (var gI = 0; gI < grain.length; gI++) {
      var gp = grain[gI];
      game.draw.rect((gp.x + t * 97 * (gI % 5)) % W, (gp.y + t * 53 * (gI % 3)) % H, 3, 3, gI % 2 ? '#ffffff' : '#000000', 0.08);
    }
  }

  function drawActors(t) {
    // 鎖
    var links = 14;
    for (var l = 0; l <= links; l++) {
      var k = l / links;
      var sag = dog.mode === 'lunge' ? 0 : Math.sin(k * Math.PI) * 18;
      var lx = STAKE.x + (dog.x - STAKE.x) * k, ly = STAKE.y + (dog.y - STAKE.y) * k + sag;
      game.draw.circle(lx, ly, 8, C.ink);
      game.draw.circle(lx - 2, ly - 2, 5, dog.mode === 'tangle' ? C.red : C.metal);
    }
    game.draw.circle(STAKE.x, STAKE.y, 22, C.ink);
    game.draw.circle(STAKE.x - 4, STAKE.y - 4, 15, C.metalHi);
    // 子ヤギ
    for (var i = 0; i < goats.length; i++) {
      var g = goats[i];
      var fr = Math.floor(g.ph) % 2 ? GOAT_A : GOAT_B;
      game.draw.circle(g.x, g.y + 26, 34, '#000000', 0.25);
      if (g.bell) game.draw.circle(g.x, g.y, 50, C.gold, 0.18 + 0.12 * Math.sin(t * 8));
      game.draw.sprite(fr, g.bell ? BELL_PAL : GOAT_PAL, g.x, g.y + Math.sin(g.ph) * 3, 13, { anchor: 'center', flipX: g.face > 0 });
    }
    // 犬
    var dfr = (dog.mode === 'lunge' || Math.floor(t * 4) % 2) ? DOG_B : DOG_A;
    var bob = dog.mode === 'rest' ? Math.sin(t * 2.4) * 4 : 0;
    game.draw.circle(dog.x, dog.y + 34, 40, '#000000', 0.3);
    game.draw.sprite(dfr, DOG_PAL, dog.x + (dog.mode === 'tangle' ? Math.sin(t * 50) * 5 : 0), dog.y + bob, 14, { anchor: 'center', flipX: dog.face < 0 });
    if (flashGoat) {
      game.draw.circle(flashGoat.x, flashGoat.y, 70 + (0.35 - flashGoat.t) * 120, C.white, flashGoat.t * 2);
      game.draw.sprite(GOAT_A, flashGoat.bell ? BELL_PAL : GOAT_PAL, flashGoat.x, flashGoat.y, 18, { anchor: 'center' });
    }
  }

  function drawPen(t) {
    for (var i = 0; i < Math.min(penned, NEEDED); i++) {
      var px = 170 + (i % 6) * 145, py = H * 0.84 + Math.sin(t * 3 + i) * 5 + 60;
      game.draw.sprite(i % 2 ? GOAT_A : GOAT_B, GOAT_PAL, px, py, 11, { anchor: 'center' });
    }
  }

  function drawHud() {
    txt(Math.min(penned, NEEDED) + ' / ' + NEEDED, W / 2, 80, 66, C.white);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(90, 150, W - 180, 20, C.ink, 0.8);
    game.draw.rect(90, 150, (W - 180) * Math.max(0, timeLeft / TIME_LIMIT), 20, lowTime ? C.red : C.gold);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (dog === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      drawPen(t);
      drawActors(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 70, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.1, 34, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawPen(t);
      game.draw.rect(0, H * 0.34, W, H * 0.3, C.ink, 0.8);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.good : C.red);
      txt(Math.min(penned, NEEDED) + ' / ' + NEEDED + '   MISS ' + whiffs, W / 2, H * 0.47, 44, C.white);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.53, 48, C.gold);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.59, 46, C.good);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.59, 36, C.white);
      } else {
        txt('あと' + (NEEDED - penned) + '頭!', W / 2, H * 0.53, 52, C.gold);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.59, 36, C.white);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { goats: Math.min(penned, NEEDED), lunges: lunges, miss: whiffs }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ goats: penned, lunges: lunges, miss: whiffs }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (flashGoat) flashGoat.t = Math.max(0.05, flashGoat.t - dt * 0.5);
      if (hitStop <= 0) {
        if (ok) game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.good, count: 28 });
        else game.feedback.bad(dog.x, dog.y - 60, { text: 'TIME UP' });
        done = true; endWait = 0.9;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, true);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.45;
        flashGoat = goats.length ? { x: goats[0].x, y: goats[0].y, t: 0.35, bell: goats[0].bell } : null;
      }
    }

    drawScene(t);
    drawPen(t);
    drawActors(t);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, C.gold);
  });

  function music() {
    game.audio.melody([['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['F4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1]], { tempo: 128, wave: 'sawtooth', volume: 0.035, loop: true, bass: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);
