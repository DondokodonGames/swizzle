// I-Switch2-0013v2-snowhut-radio-peak-send.js
// 雪山無線のひと押し — 回線の点滅がいちばん強くなった瞬間だけ送信キーを1回押す。押したらキーの充電が戻るまで待つ
// 操作: 画面のどこかをタップすると送信キーが下りる。メーターの針が上の目盛り帯まで振り切れる強い点滅の頂点で押す。弱い点滅(針が途中で戻る)には押さない。押すとキーの周りの輪が一周して戻るまで次は押せない(その間に押すとバッテリーを失う)(社内メモ。画面には出さない)
// 終わり: 6回送信して尾根の中継塔を全部ともせばCLEAR。弱い/外れた所で押す・充電中に押すとバッテリーを1つ失い、3つ失うか14秒切れでGAME OVER
// @mechanic: cooldown_tap
// @theme: snowhut_radio_peak_send
// 世界観: 吹雪の雪山の山岳無線小屋で、ヘッドホンをかけた無線係が、雑音まじりに明滅する回線の灯がいちばん強くなる瞬間だけ送信キーを叩き、尾根伝いの中継塔を一つずつともして麓の村へ連絡を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 送信できた回数・PERFECT数・スコア
// スタイル: 8bit HANDHELD

(function(game) {
  var STYLE = { bg: ['#0f380f', '#306230'], main: ['#8bac0f', '#9bbc0f', '#306230'], accent: ['#9bbc0f', '#0f380f'] };
  var C0 = '#0f380f', C1 = '#306230', C2 = '#8bac0f', C3 = '#9bbc0f';
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'PEAK SIGNAL';
  var TIME_LIMIT = 14;
  var NEEDED = 6;
  var BATTERY = 3;
  var PEAK_W = 0.22;
  var LAMP = { x: W * 0.5, y: H * 0.43 };
  var METER = { x: W * 0.5, y: H * 0.66, r: 230 };
  var KEY = { x: W * 0.62, y: H * 0.865 };
  var OP = { x: W * 0.2, y: H * 0.86 };

  var OP_A = ['..kkkkkk..', '.kddddddk.', 'kk.kkkk.kk', 'kd.ssss.dk', 'kd.sese.dk', '...ssss...', '..bbbbbb..', '.kkkkkkkk.', 'kkkkkkkkkk', 'kk.kkkk.kk', '..ss..ss..'];
  var OP_B = ['..kkkkkk..', '.kddddddk.', 'kk.kkkk.kk', 'kd.ssss.dk', 'kd.sksk.dk', '...ssss...', '..bbbbbb..', '.kkkkkkkk.', 'kkkkkkkkkk', 'kk.kkkk.ss', '..ss......'];
  var OP_PAL = { k: C0, d: C1, s: C3, e: C0, b: C1 };
  var TOWER = ['..l..', '.lll.', '..k..', '.k.k.', '.kkk.', 'k.k.k', 'k...k'];
  var BATT = ['.kk.', 'kkkk', 'kffk', 'kffk', 'kffk', 'kkkk'];
  var SPIKE = ['k.k.k', '.kkk.', 'kkkkk', '.kkk.', 'k.k.k'];

  var STATE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var state = STATE.ATTRACT;

  var events = [], clock = 0, cool = 0, coolMax = 1.1, needle = 0.1, trailN = [];
  var sent = 0, batt = BATTERY, perfects = 0, score = 0, streak = 0;
  var left = TIME_LIMIT, count = 0, stopT = 0, holdT = 0, fadeT = 0, celebT = 0, keyDown = 0, flashT = 0;
  var on = false, cleared = false, bestAtStart = 0, failKind = '', cue = -1, snow = [];

  for (var s0 = 0; s0 < 40; s0++) snow.push({ x: (s0 * 251) % W, y: (s0 * 173) % 460, v: 60 + (s0 * 37) % 90 });

  function write(str, x, y, size, color) {
    game.draw.text(str, x + 4, y + 4, { size: size, color: C0, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color || C3, bold: true, align: 'center' });
  }

  // 点滅の予定表: 強い頂点(送る)と弱い頂点(まぎらわしい)。強い頂点どうしが充電より近いこともある
  function buildEvents(seedLen) {
    events = [];
    var t = 1.0, lastStrong = -9;
    while (t < seedLen) {
      var strong = t - lastStrong > 1.6 ? true : game.random(0, 1) < 0.42;
      events.push({ t: t, s: strong ? game.random(0.9, 1.0) : game.random(0.42, 0.66), strong: strong, used: false });
      if (strong) lastStrong = t;
      t += game.random(0.62, 1.15);
    }
  }

  function intensity(t) {
    var v = 0.1 + 0.035 * Math.sin(t * 23) + 0.025 * Math.sin(t * 37 + 1);
    for (var i = 0; i < events.length; i++) {
      var d = (t - events[i].t) / PEAK_W;
      if (d > -3 && d < 3) v += events[i].s * Math.exp(-d * d);
    }
    return Math.max(0, Math.min(1.1, v));
  }

  function nearest(t) {
    var best = null, bd = 9;
    for (var i = 0; i < events.length; i++) {
      var d = Math.abs(t - events[i].t);
      if (d < bd) { bd = d; best = events[i]; }
    }
    return { e: best, d: bd };
  }

  // 実ロジック: 送信キーを押した結果 'perfect' | 'good' | 'early'(充電中) | 'weak'(外れ)
  function pressKey(live) {
    keyDown = 0.18;
    if (cool > 0) { fail('early', live); return 'early'; }
    var n = nearest(clock);
    var res = 'weak';
    if (n.e && n.e.strong && !n.e.used) res = n.d <= 0.1 ? 'perfect' : n.d <= 0.2 ? 'good' : 'weak';
    if (res === 'weak') { fail('weak', live); return res; }
    n.e.used = true;
    coolMax = Math.min(1.5, 1.05 + sent * 0.06); cool = coolMax; flashT = 0.3;
    game.feedback.good(LAMP.x, LAMP.y - 120, { text: res === 'perfect' ? 'PERFECT' : 'GOOD', color: C3, count: res === 'perfect' ? 18 : 10, volume: live ? 1 : 0.4 });
    game.audio.tone(res === 'perfect' ? 'A6' : 'E6', 0.12, { wave: 'square', volume: live ? 0.1 : 0.04 });
    if (!live) return res;
    sent++; streak++;
    if (res === 'perfect') perfects++;
    score += (res === 'perfect' ? 200 : 120) + streak * 30;
    if (sent === 3) { game.fx.popup('3 / ' + NEEDED, W / 2, H * 0.22, { color: C3, size: 60 }); game.audio.play('se_milestone', 0.5); }
    if (streak >= 3 && res === 'perfect') game.audio.play('se_powerup', 0.35);
    if (sent >= NEEDED) { cleared = true; finishRun(); }
    return res;
  }

  function fail(kind, live) {
    failKind = kind; stopT = 0.45; streak = 0;
    if (kind === 'early') cool = coolMax;
    game.feedback.bad(kind === 'early' ? KEY.x : LAMP.x, kind === 'early' ? KEY.y - 150 : LAMP.y - 120, { text: 'MISS', shake: live ? 12 : 4, volume: live ? 1 : 0.4 });
    game.audio.play('se_break', live ? 0.3 : 0.1);
    if (!live) return;
    batt--;
    if (batt <= 0) { cleared = false; finishRun(); }
  }

  // 実ロジック: 時間経過(止め中は進めない)
  function stepRadio(dt) {
    if (keyDown > 0) keyDown -= dt;
    if (flashT > 0) flashT -= dt;
    if (stopT > 0) { stopT -= dt; return; }
    clock += dt;
    if (cool > 0) cool = Math.max(0, cool - dt);
    var target = intensity(clock);
    needle += (target - needle) * Math.min(1, dt * 14);
    trailN.push(needle);
    if (trailN.length > 6) trailN.shift();
    // 予告音: 強い頂点の0.6秒前に一度だけ小さく鳴る
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.strong && i !== cue && clock > e.t - 0.6 && clock < e.t - 0.5) { cue = i; game.audio.tone('C6', 0.03, { wave: 'square', volume: 0.04 }); }
    }
  }

  function finishRun() {
    on = false; holdT = 0.55; celebT = 0;
    game.audio.stopBgm();
    if (cleared) { score += Math.round(left * 40) + batt * 60; game.audio.play('se_success', 0.5); }
    else game.audio.play('se_failure', 0.45);
  }

  function startBgm() {
    game.audio.melody([
      ['A4', 1], ['C5', 0.5], ['E5', 0.5], ['D5', 1], ['B4', 1],
      ['A4', 1], ['G4', 0.5], ['B4', 0.5], ['A4', 2],
    ], { tempo: 96, wave: 'square', volume: 0.04, loop: true, bass: [['A2', 2], ['F2', 2], ['G2', 2], ['E2', 2]] });
  }

  function initGame() {
    sent = 0; batt = BATTERY; perfects = 0; score = 0; streak = 0;
    left = TIME_LIMIT; count = 0.8; stopT = 0; holdT = 0; fadeT = 0; celebT = 0; keyDown = 0; flashT = 0;
    on = false; cleared = false; failKind = ''; clock = 0; cool = 0; coolMax = 1.05; needle = 0.1; trailN = []; cue = -1;
    bestAtStart = game.best || 0;
    buildEvents(TIME_LIMIT + 2);
  }

  game.onTap(function(x, y) {
    if (state === STATE.ATTRACT) { game.audio.play('se_coin', 0.5); state = STATE.PLAYING; initGame(); startBgm(); return; }
    if (state === STATE.RESULT) { state = STATE.ATTRACT; initGame(); demo.t = 0; return; }
    if (!on || stopT > 0) { game.audio.play('se_tap', 0.08); return; }
    game.audio.play('se_tap', 0.25);
    pressKey(true);
  });

  // ── ATTRACT ゴースト実演: 強い頂点だけ押す。2周に1回は充電中に押して失敗を見せる ──
  var demo = { t: 0, gx: KEY.x, gy: KEY.y, press: 0, n: 0, early: false };
  function demoCycle() {
    clock = 0; cool = 0; needle = 0.1; trailN = []; stopT = 0; failKind = ''; cue = -1;
    buildEvents(7);
    demo.early = demo.n % 2 === 1; demo.n++;
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || clock > 6.5) { if (demo.t <= dt) demo.n = 0; demoCycle(); }
    if (demo.press > 0) demo.press -= dt;
    stepRadio(dt);
    if (stopT > 0) return;
    var n = nearest(clock);
    if (cool <= 0 && n.e && n.e.strong && !n.e.used && clock >= n.e.t - 0.02 && clock <= n.e.t + 0.05) { demo.press = 0.2; pressKey(false); }
    else if (demo.early && cool > 0 && cool < coolMax * 0.5) { demo.early = false; demo.press = 0.2; pressKey(false); }
    demo.gy = KEY.y + (demo.press > 0 ? 0 : -40);
  }

  // ── 描画(4階調の緑だけ) ──
  function frameRect(x, y, w, h, c, t) {
    game.draw.rect(x, y, w, t, c); game.draw.rect(x, y + h - t, w, t, c);
    game.draw.rect(x, y, t, h, c); game.draw.rect(x + w - t, y, t, h, c);
  }

  function drawHut(hl) {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C1], [0.36, C1], [0.37, C0], [1, C0]]);
    // 窓の外: 吹雪と尾根の中継塔
    game.draw.rect(60, 250, W - 120, 440, C2);
    for (var r = 0; r < 12; r++) {
      var rx = 60 + r * ((W - 120) / 11);
      var ry = 600 - Math.abs(Math.sin(r * 1.3)) * 120 - (r < 6 ? r * 20 : (11 - r) * 18);
      game.draw.rect(rx - 50, ry, 100, 690 - ry, C1);
    }
    for (var k = 0; k < NEEDED; k++) {
      var tx = 140 + k * ((W - 280) / (NEEDED - 1));
      var ty = 520 - Math.sin(k * 0.9) * 60;
      var lit = k < sent || (state === STATE.ATTRACT && k < (Math.floor(t) % (NEEDED + 1)));
      game.draw.sprite(TOWER, { l: lit ? C3 : C1, k: C0 }, tx, ty, 10, { anchor: 'center' });
      if (lit) game.draw.circle(tx, ty - 30, 26 + 6 * Math.sin(t * 6 + k), C3, 0.5);
    }
    for (var s = 0; s < snow.length; s++) {
      var f = snow[s];
      var sy = 250 + ((f.y + t * f.v) % 440), sx = 60 + ((f.x + t * 90) % (W - 120));
      game.draw.rect(sx, sy, 8, 8, C3, 0.8);
    }
    frameRect(52, 242, W - 104, 456, C0, 14);
    game.draw.rect(W / 2 - 7, 242, 14, 456, C0);
    // 無線機の筐体
    game.draw.rect(40, H * 0.37, W - 80, H * 0.41, C1);
    frameRect(40, H * 0.37, W - 80, H * 0.41, C2, 6);
    for (var v = 0; v < 6; v++) game.draw.rect(80 + v * 26, H * 0.39, 14, 50, C0);
  }

  function drawLamp(hl) {
    var t = game.time.elapsed;
    var I = needle;
    var strong = I > 0.8;
    game.draw.circle(LAMP.x, LAMP.y, 120 + I * 60, C3, 0.12 + I * 0.3);
    game.draw.circle(LAMP.x, LAMP.y, 96, C0);
    game.draw.circle(LAMP.x, LAMP.y, 84, I > 0.55 ? C3 : I > 0.3 ? C2 : C1);
    if (strong) game.draw.circle(LAMP.x, LAMP.y, 60, '#ffffff', 0.25 + 0.2 * Math.sin(t * 30));
    if (flashT > 0) game.draw.circle(LAMP.x, LAMP.y, 150, C3, flashT * 2);
    if (hl && failKind === 'weak') game.draw.circle(LAMP.x, LAMP.y, 170, '#ffffff', 0.45);
  }

  function drawMeter(hl) {
    var t = game.time.elapsed;
    var cx = METER.x, cy = METER.y, r = METER.r;
    game.draw.rect(cx - r - 40, cy - r - 30, (r + 40) * 2, r + 80, C2);
    frameRect(cx - r - 40, cy - r - 30, (r + 40) * 2, r + 80, C0, 8);
    // 目盛り(右端の帯=強い頂点。トゲ印で示す)
    for (var i = 0; i <= 20; i++) {
      var a = Math.PI + (i / 20) * Math.PI;
      var inZone = i >= 16;
      game.draw.line(cx + Math.cos(a) * (r - 30), cy + Math.sin(a) * (r - 30), cx + Math.cos(a) * r, cy + Math.sin(a) * r, inZone ? C0 : C1, inZone ? 10 : 4);
    }
    var za = Math.PI * 1.88;
    game.draw.sprite(SPIKE, { k: C0 }, cx + Math.cos(za) * (r + 6), cy + Math.sin(za) * (r + 6) - 10, 7, { anchor: 'center' });
    // 針(残像つき)
    for (var k = 0; k < trailN.length; k++) {
      var an = Math.PI + Math.min(1, trailN[k]) * Math.PI;
      game.draw.line(cx, cy, cx + Math.cos(an) * (r - 20), cy + Math.sin(an) * (r - 20), C1, 4);
    }
    var ang = Math.PI + Math.min(1, needle) * Math.PI;
    game.draw.line(cx, cy, cx + Math.cos(ang) * (r - 16), cy + Math.sin(ang) * (r - 16), C0, 9);
    game.draw.circle(cx, cy, 20, C0);
    if (hl && failKind === 'weak') game.draw.circle(cx + Math.cos(ang) * (r - 60), cy + Math.sin(ang) * (r - 60), 40, '#ffffff', 0.5);
  }

  function drawKey(hl) {
    var t = game.time.elapsed;
    var ready = cool <= 0 && (state === STATE.ATTRACT || on);
    // 充電の輪(一周で押せる)
    var k = coolMax > 0 ? 1 - cool / coolMax : 1;
    for (var i = 0; i < 30; i++) {
      var a = -Math.PI / 2 + i / 30 * Math.PI * 2;
      var lit = i / 30 < k;
      game.draw.rect(KEY.x + Math.cos(a) * 150 - 9, KEY.y + Math.sin(a) * 150 - 9, 18, 18, lit ? C3 : C1);
    }
    var down = keyDown > 0 ? 14 : 0;
    game.draw.circle(KEY.x, KEY.y + 16, 110, C0);
    game.draw.circle(KEY.x, KEY.y + down, 104, ready ? C2 : C1);
    game.draw.circle(KEY.x, KEY.y + down, 70, ready ? C3 : C1);
    if (ready) game.draw.circle(KEY.x, KEY.y + down, 120, C3, 0.15 + 0.12 * Math.sin(t * 6));
    if (!ready) game.draw.sprite(SPIKE, { k: C0 }, KEY.x, KEY.y + down, 10, { anchor: 'center' });
    if (hl && failKind === 'early') game.draw.circle(KEY.x, KEY.y, 175, '#ffffff', 0.45 + 0.2 * Math.sin(t * 22));
    var op = (stopT > 0 && hl) ? OP_B : Math.floor(t * 2) % 2 ? OP_A : OP_B;
    game.draw.sprite(op, OP_PAL, OP.x, OP.y - (flashT > 0 ? 20 : 0), 15, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 236, C0);
    write(sent + ' / ' + NEEDED, W / 2, 96, 54, C3);
    write(String(score), W - 140, 96, 34, C2);
    for (var i = 0; i < BATTERY; i++) game.draw.sprite(BATT, { k: C2, f: i < batt ? C3 : C0 }, 70 + i * 60, 96, 10, { anchor: 'center' });
    var bw = W - 160;
    var low = left < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 166, bw, 22, C1);
    game.draw.rect(84, 170, (bw - 8) * Math.max(0, left / TIME_LIMIT), 14, low ? C2 : C3);
  }

  function drawAll(hl) {
    drawHut(hl);
    drawLamp(hl);
    drawMeter(hl);
    drawKey(hl);
  }

  game.onUpdate(function(dt) {
    if (state === STATE.ATTRACT) {
      stepDemo(dt);
      drawAll(stopT > 0);
      game.draw.rect(0, 0, W, 236, C0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      write(GAME_TITLE, W / 2, H * 0.055 + bob, 76, C3);
      write('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.1, 32, C2);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.975, 40, C3);
      else write('INSERT COIN', W / 2, H * 0.975, 32, C2);
      return;
    }

    if (state === STATE.RESULT) {
      celebT -= dt;
      if (cleared && celebT <= 0) {
        celebT = 0.3; flashT = 0.2;
        game.fx.burst(game.random(W * 0.15, W * 0.85), game.random(260, 680), { color: C3, count: 14, speed: 360 });
      }
      clock += dt * 0.5;
      needle = cleared ? 0.6 + 0.4 * Math.abs(Math.sin(clock * 4)) : 0.05;
      drawAll(!cleared);
      drawHud();
      write(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 80, cleared ? C3 : C2);
      write('SCORE ' + score, W / 2, H * 0.535, 40, C3);
      if (!cleared) write('あと' + (NEEDED - sent) + '回!', W / 2, H * 0.575, 40, C3);
      else write('PERFECT ' + perfects, W / 2, H * 0.575, 36, C3);
      if (score > bestAtStart && score > 0) write('NEW RECORD', W / 2, H * 0.61, 32, Math.floor(game.time.elapsed * 4) % 2 ? C3 : C2);
      else write('BEST ' + Math.round(game.best || 0), W / 2, H * 0.61, 28, C2);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.975, 32, C3);
      return;
    }

    // ── PLAYING ──
    if (fadeT > 0) {
      fadeT -= dt;
      if (fadeT <= 0) {
        state = STATE.RESULT;
        var stats = { sent: sent, perfect: perfects, battery: batt };
        if (cleared) game.end.success(score, stats); else game.end.failure(stats);
        if (cleared && score > bestAtStart) game.audio.play('se_milestone', 0.5);
      }
    } else if (holdT > 0) {
      holdT -= dt;
      if (holdT <= 0) fadeT = 1.0;
    } else if (count > 0) {
      count -= dt;
      if (count <= 0) { on = true; game.audio.play('se_tap', 0.35); }
    } else if (on) {
      if (stopT <= 0) left -= dt;
      stepRadio(dt);
      if (on && left <= 0) {
        left = 0; cleared = false; failKind = 'weak'; stopT = 0.4;
        game.feedback.bad(LAMP.x, LAMP.y - 120, { text: 'TIME UP', shake: 10 });
        finishRun();
      }
    }

    drawAll((stopT > 0 || holdT > 0) && !cleared);
    drawHud();
    if (count > 0) write(count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 92, C3);
  });

  game.onStart(function() {
    startBgm();
    state = STATE.ATTRACT;
    initGame();
  });
})(game);
