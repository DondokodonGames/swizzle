// K-GBA-0011v3-snowyard-broom-hold.js
// 雪庭ほうき引き — 木魚の合図の拍でほうきを下ろし、示された拍数ぴったりまで押し続けて離し、雪面の線を石灯籠の前で止める
// 操作: 1回は2小節。1小節目の終わりの木魚の「カン」(合図の拍)に合わせて押し、灯籠の上に出た数の拍だけ押し続け、その数え終わりの拍の頭で離す。押す瞬間と離す瞬間の両方を拍の頭からのずれで判定(PERFECT/GOOD/MISS)。合図前の押し・合図に遅れる・早離し・押しすぎはMISS。後半2回は合図の直後に伴奏も木魚も止まり雪が舞って線の先が隠れるので、自分の中で拍を数え続ける
// 終わり: 4回(2拍・4拍・3拍・4拍)を通して MISS 2回以内ならCLEAR(判定の点+止めボーナス)。MISS 3回でGAME OVER
// @mechanic: hold_duration
// @theme: snow_temple_broom_line
// 世界観: 雪の積もった寺の中庭で、庭掃除の小僧が和尚の木魚の拍に合わせて竹ぼうきを下ろし、決められた拍数だけ掃き進めて石灯籠の手前ぴったりで雪面の線を止める
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・止められた本数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊。真下に柔らかい影。見た目どおりの当たり
  var STYLE = { bg: ['#f3f6fb', '#e3e9f2', '#ffffff'], main: ['#4a6cf7', '#7f97fa', '#2f4fd0'], accent: ['#ff7a59', '#ffd25e'] };
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], snow: STYLE.bg[2],
    blue: STYLE.main[0], blueL: STYLE.main[1], blueD: STYLE.main[2],
    coral: STYLE.accent[0], gold: STYLE.accent[1],
    stone: '#b9c5d8', shade: '#1c2a4a', ink: '#24314f', skin: '#ffe2c8', wood: '#c98b52',
  };

  var GAME_TITLE = 'SNOW BROOM';
  var BPM = 132;
  var SPB = 60 / BPM;
  var BEATS_PER_ROUND = 8;      // 2小節で1回
  var CUE_AT = 3;               // 1小節目の4拍目が合図の拍(最長4拍でも離しは2小節目の中で終わる)
  var PERFECT_W = 0.08;
  var GOOD_W = 0.18;
  var MISS_MAX = 3;
  var TIME_LIMIT = 15;
  var ROUNDS = [{ n: 2, brk: false }, { n: 4, brk: false }, { n: 3, brk: true }, { n: 4, brk: true }];
  var X0 = 170, STEP = 170, LINE_Y = Math.round(H * 0.53);

  // 寺の庭の歌(オリジナル)。4小節 = 16拍
  var SONG = [
    ['D5', 1], ['F5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 1], ['F5', 1], ['D5', 1], ['C5', 2],
    ['D5', 1], ['F5', 1], ['G5', 0.5], ['A5', 0.5], ['C6', 1], ['A5', 1], ['G5', 1], ['D5', 2],
  ];
  var SONG_BASS = [['D3', 2], ['A2', 2], ['D3', 2], ['C3', 2], ['D3', 2], ['A2', 2], ['G2', 2], ['A2', 2]];
  function startSong() {
    game.audio.melody(SONG, { tempo: BPM, wave: 'triangle', volume: 0.05, loop: true, bass: SONG_BASS, bassWave: 'sine', bassVolume: 0.07 });
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, hitStop, flashT, flashX, flashY;
  var r, rs, silent, veil, monkHit, padPress;
  var score, perfects, goods, misses, cleared, over, won, outroT, prevBest, milestone, snow;

  function newRound(i) {
    r = i;
    rs = { phase: 'wait', lineLen: 0, frozen: false, result: '', pressAt: 0 };
    if (ROUNDS[r] && ROUNDS[r].brk) {
      // ブレイク予告: 下降2音 + 和尚が手を合わせる
      game.audio.tone(660, 0.1, { wave: 'sine', volume: 0.08 });
      game.audio.tone(440, 0.16, { wave: 'sine', volume: 0.08 });
    }
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashT = 0; flashX = 0; flashY = 0;
    silent = false; veil = 0; monkHit = 0; padPress = false;
    score = 0; perfects = 0; goods = 0; misses = 0; cleared = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    r = 0; rs = { phase: 'wait', lineLen: 0, frozen: false, result: '', pressAt: 0 };
    if (!snow) { snow = []; for (var i = 0; i < 40; i++) snow.push({ x: game.random(0, W), y: game.random(0, H), s: game.random(3, 9), v: game.random(40, 110) }); }
    if (isDemo) startClock();
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    newRound(0);
    startSong();
    onBeat(0);
  }

  function cueTime() { return (r * BEATS_PER_ROUND + CUE_AT) * SPB; }
  function relTime() { return cueTime() + ROUNDS[r].n * SPB; }

  // ---- 拍クロック(1本だけ) ----
  function onBeat(b) {
    var ri = Math.floor(b / BEATS_PER_ROUND);
    var rel = b - ri * BEATS_PER_ROUND;
    if (ri !== r && ri < ROUNDS.length) {
      newRound(ri);
      if (silent) { silent = false; startSong(); }
    }
    var vol = demoMode ? 0.5 : 1;
    if (rel === CUE_AT && ri < ROUNDS.length) {
      // 合図の拍: 木魚の「カン」
      monkHit = 0.22;
      game.audio.tone(880, 0.28, { wave: 'sine', volume: 0.18 * vol });
      game.audio.tone(1320, 0.12, { wave: 'sine', volume: 0.06 * vol });
      if (ROUNDS[ri].brk) { silent = true; game.audio.stopBgm(); }
      return;
    }
    if (silent) return;
    monkHit = 0.14;
    if (rel === CUE_AT - 1) game.audio.tone(660, 0.06, { wave: 'triangle', volume: 0.09 * vol });
    else if (b % 4 === 0) game.audio.tone(520, 0.05, { wave: 'triangle', volume: 0.12 * vol });
    else game.audio.tone(780, 0.03, { wave: 'triangle', volume: 0.06 * vol });
  }

  function stepped(x) {
    if (x <= 0) return 0;
    var k = Math.floor(x), f = x - k;
    return k + (1 - Math.pow(1 - f, 3));
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    if (r >= ROUNDS.length) return;
    var cue = cueTime(), rel = relTime();
    if (rs.phase === 'hold' && !rs.frozen) rs.lineLen = stepped((songT - cue) / SPB) * STEP;
    if (rs.phase === 'wait' && songT > cue + GOOD_W) { missAt(X0, LINE_Y, 'late'); }
    if (rs.phase === 'hold' && songT > rel + GOOD_W) { missAt(X0 + rs.lineLen, LINE_Y, 'over'); }
    // ブレイク中は雪が舞って線の先が隠れる
    var wantVeil = ROUNDS[r].brk && songT > cue + SPB * 0.5 && rs.phase !== 'done';
    veil += ((wantVeil ? 1 : 0) - veil) * Math.min(1, dt * 6);
    if (!demoMode && !over && r === ROUNDS.length - 1 && rs.phase === 'done' && hitStop <= 0) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT + 1) finish(misses < MISS_MAX);
  }

  function judge(off) {
    var a = Math.abs(off);
    return a <= PERFECT_W ? 'PERFECT' : (a <= GOOD_W ? 'GOOD' : 'MISS');
  }

  function award(word, x, y) {
    if (word === 'PERFECT') { perfects++; score += 100; game.feedback.good(x, y, { text: 'PERFECT', color: C.gold, size: 54, count: 12, volume: 0.3 }); }
    else { goods++; score += 50; game.feedback.good(x, y, { text: 'GOOD', color: C.blueL, size: 46, count: 8, volume: 0.25 }); }
  }

  function missAt(x, y, why) {
    if (rs.phase === 'hold') { rs.frozen = true; }
    rs.phase = 'done'; rs.result = why;
    misses++;
    hitStop = 0.42; flashT = 0.42; flashX = x; flashY = y;
    game.feedback.bad(x, y - 120, { text: 'MISS', shake: demoMode ? 4 : 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function pressAction() {
    if (!running || r >= ROUNDS.length || hitStop > 0) return 'none';
    padPress = true;
    if (rs.phase !== 'wait') return 'none';
    var off = songT - cueTime();
    if (off < -GOOD_W) { missAt(X0, LINE_Y, 'early'); return 'miss'; }
    var w = judge(off);
    rs.phase = 'hold'; rs.pressAt = songT;
    award(w, X0, LINE_Y - 120);
    return 'ok';
  }

  function releaseAction() {
    padPress = false;
    if (!running || r >= ROUNDS.length || rs.phase !== 'hold') return 'none';
    var off = songT - relTime();
    rs.frozen = true;
    var w = judge(off);
    var tipX = X0 + rs.lineLen;
    if (w === 'MISS') { missAt(tipX, LINE_Y, off < 0 ? 'short' : 'over'); return 'miss'; }
    rs.phase = 'done'; rs.result = 'ok';
    cleared++;
    award(w, tipX, LINE_Y - 120);
    score += ROUNDS[r].brk ? 200 : 100;
    game.fx.burst(tipX, LINE_Y, { color: C.snow, count: 16, speed: 300 });
    if (!demoMode && cleared === 2 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(cleared + ' / ' + ROUNDS.length, W / 2, H * 0.26, { color: C.coral, size: 76 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += cleared * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(500, 1000), { color: i % 2 ? C.coral : C.gold, count: 20, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var res = pressAction();
    if (res === 'ok') game.audio.play('se_tap', 0.3);
    else if (res === 'none') game.audio.tone(200, 0.05, { wave: 'sine', volume: 0.05 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || over) { padPress = false; return; }
    var res = releaseAction();
    if (res === 'none') game.audio.tone(300, 0.03, { wave: 'sine', volume: 0.03 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#1c2a4a30', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  // 真下の柔らかい影(楕円を円の重ねで)
  function softShadow(x, y, w) {
    for (var i = -3; i <= 3; i++) game.draw.circle(x + i * w * 0.11, y, w * (0.15 - Math.abs(i) * 0.02), C.shade, 0.06);
  }

  var BOY = [
    ['..bbbb..', '.bbbbbb.', '.bssssb.', '.sesess.', '..ssss..', '.rrrrrr.', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..r..r..'],
    ['..bbbb..', '.bbbbbb.', '.bssssb.', '.sseses.', '..ssss..', '.rrrrrr.', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '.r....r.'],
  ];
  var BPAL = { b: '#2a3550', s: C.skin, e: C.ink, r: C.blue };
  var MONK = [
    ['..ssss..', '.ssssss.', '.sesess.', '..ssss..', '.oooooo.', 'oooooooo', 'oooooooo', '.oooooo.'],
    ['..ssss..', '.ssssss.', '.s-ss-s.', '..ssss..', '.oosooo.', 'ooosoooo', 'oooooooo', '.oooooo.'],
  ];
  var MPAL = { s: C.skin, e: C.ink, '-': C.ink, o: C.blueD };

  function drawYard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky2], [0.3, C.sky], [1, C.snow]]);
    // 本堂(丸い塊の屋根)
    softShadow(W * 0.42, H * 0.335, 520);
    game.draw.rect(W * 0.18, H * 0.22, W * 0.5, H * 0.11, '#dbe3ef');
    for (var i = 0; i < 7; i++) game.draw.circle(W * 0.14 + i * 95, H * 0.205, 70, C.blueL, 0.55);
    game.draw.rect(W * 0.25, H * 0.25, 70, H * 0.08, '#c7d2e3');
    game.draw.rect(W * 0.52, H * 0.25, 70, H * 0.08, '#c7d2e3');
    // 雪の庭面
    game.draw.rect(0, H * 0.34, W, H * 0.42, C.snow);
    for (var k = 0; k < 6; k++) game.draw.circle(80 + k * 190, H * 0.345, 90, C.snow);
    // 縁側と和尚(木魚)
    var mx = W * 0.84, my = H * 0.3;
    softShadow(mx, my + 70, 180);
    var hit = monkHit > 0;
    game.draw.sprite(MONK[silent ? 1 : 0], MPAL, mx, my + Math.sin(t * 2) * 3, 14, { anchor: 'center' });
    game.draw.circle(mx - 96, my + 48, 34, C.wood, 1);
    game.draw.circle(mx - 96, my + 40, 22, hit ? C.gold : '#e0a870', 1);
    if (hit) game.draw.circle(mx - 96, my + 44, 60, C.gold, 0.25);
  }

  function drawBeatLamps() {
    var pos = beatN % 4;
    for (var i = 0; i < 4; i++) {
      var x = W / 2 - 225 + i * 150, y = 300, rr = i === 0 ? 30 : 22;
      var lit = running && !silent && i === pos ? 1 - beatT / SPB : 0;
      softShadow(x, y + rr + 8, rr * 2.4);
      game.draw.circle(x, y, rr + 6, silent ? '#d0d6e0' : '#ffffff');
      game.draw.circle(x, y, rr, silent ? '#c0c8d6' : C.blue, 0.35 + lit * 0.65);
    }
  }

  function drawLine() {
    var t = game.time.elapsed;
    var rd = ROUNDS[Math.min(r, ROUNDS.length - 1)];
    var tx = X0 + rd.n * STEP;
    // 石灯籠(目標)。上に拍数の点と数字
    var lf = flashT > 0 && rs.result === 'over';
    var ls = lf ? 1 + (flashT / 0.42) * 0.35 : 1;
    softShadow(tx + 40, LINE_Y + 60, 130);
    game.draw.rect(tx + 22, LINE_Y - 60 * ls, 36, 110 * ls, lf ? '#ffffff' : C.coral);
    game.draw.circle(tx + 40, LINE_Y - 80 * ls, 46 * ls, lf ? '#ffffff' : C.coral);
    game.draw.circle(tx + 40, LINE_Y - 80 * ls, 18 * ls, C.gold, 0.9);
    for (var d = 0; d < rd.n; d++) game.draw.circle(tx + 40 - (rd.n - 1) * 22 + d * 44, LINE_Y - 170, 13, C.coral, 0.9);
    label(String(rd.n), tx + 40, LINE_Y - 205, 46, C.coral);
    // 拍の目盛り(雪に置いた小石)
    for (var k = 0; k <= rd.n; k++) game.draw.circle(X0 + k * STEP, LINE_Y + 70, 9, C.stone, 0.8);
    // 掃いた線(雪の下の石畳が見える)
    var len = rs.lineLen;
    if (len > 0) {
      game.draw.rect(X0, LINE_Y - 22, len, 44, C.stone);
      game.draw.circle(X0, LINE_Y, 22, C.stone);
      game.draw.circle(X0 + len, LINE_Y, 22, C.stone);
    }
    game.draw.circle(X0, LINE_Y, 14, C.blueL, 0.8);
    // 小僧と竹ぼうき(線の先)
    var bx = X0 + len - 70;
    var sweep = rs.phase === 'hold' && !rs.frozen ? Math.sin(songT / SPB * Math.PI * 2) : 0;
    softShadow(bx, LINE_Y + 40, 150);
    game.draw.line(bx + 20, LINE_Y - 70, bx + 70 + sweep * 20, LINE_Y + 10, C.wood, 10);
    game.draw.circle(bx + 74 + sweep * 20, LINE_Y + 14, 22, '#e8c070');
    game.draw.sprite(BOY[Math.floor(songT / SPB) % 2], BPAL, bx, LINE_Y - 80 + (rs.phase === 'hold' ? Math.abs(sweep) * -6 : Math.sin(t * 3) * 3), 13, { anchor: 'center' });
    // 失敗の白フラッシュ
    if (flashT > 0) {
      var k2 = flashT / 0.42;
      game.draw.circle(flashX, flashY, 40 + (1 - k2) * 140, '#ffffff', 0.8 * k2);
    }
  }

  function drawVeil() {
    if (veil <= 0.01) return;
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.36, W, H * 0.3, '#ffffff', 0.88 * veil);
    for (var i = 0; i < 14; i++) {
      var x = ((i * 157 + t * 260) % (W + 200)) - 100;
      var y = H * 0.4 + (i % 4) * 130 + Math.sin(t * 2 + i) * 30;
      game.draw.circle(x, y, 70 + (i % 3) * 30, '#ffffff', 0.7 * veil);
    }
  }

  function drawSnowfall(dt) {
    for (var i = 0; i < snow.length; i++) {
      var f = snow[i];
      f.y += f.v * dt; f.x += Math.sin(game.time.elapsed + i) * 12 * dt;
      if (f.y > H) { f.y = -10; f.x = game.random(0, W); }
      game.draw.circle(f.x, f.y, f.s, '#ffffff', 0.9);
      game.draw.circle(f.x, f.y, f.s * 0.5, '#c8d4e8', 0.5);
    }
  }

  function drawPad() {
    var x = W / 2, y = H * 0.865;
    var p = padPress || (rs && rs.phase === 'hold' && !rs.frozen);
    var cueSoon = running && rs && rs.phase === 'wait' && songT > cueTime() - SPB;
    softShadow(x, y + 150, 360);
    game.draw.circle(x, y + (p ? 10 : 0), p ? 140 : 152, p ? C.blueD : C.blue);
    game.draw.circle(x - 40, y - 40 + (p ? 10 : 0), 40, '#ffffff', 0.25);
    if (cueSoon && Math.floor(game.time.elapsed * 12) % 2 === 0) game.draw.circle(x, y, 176, C.gold, 0.35);
  }

  function drawScene(dt) {
    drawYard();
    drawBeatLamps();
    drawLine();
    drawVeil();
    drawSnowfall(dt);
    drawPad();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#ffffff', 0.85);
    label('SCORE ' + score, 60, 96, 54, C.ink, 'left');
    label('BEST ' + prevBest, 60, 170, 32, C.blue, 'left');
    label(Math.min(r + 1, ROUNDS.length) + ' / ' + ROUNDS.length, W - 60, 96, 56, C.blue, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.circle(W - 230 + i * 70, 168, 18, i < misses ? C.coral : '#d6dce6');
    var progress = Math.min(1, songT / (ROUNDS.length * BEATS_PER_ROUND * SPB));
    game.draw.rect(0, 222, W, 8, '#d6dce6');
    game.draw.rect(0, 222, W * progress, 8, C.blue);
  }

  // ---- ATTRACT: 実ロジックで1回目はぴったり、2回目は押しすぎてMISS、3回目はブレイクを数え切る ----
  var demo = { t: 0, press: false };
  var DEMO_LEN = 3 * BEATS_PER_ROUND * SPB + 0.3;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); }
    if (r < ROUNDS.length && hitStop <= 0) {
      var nt = songT + dt;
      if (rs.phase === 'wait' && nt >= cueTime() - 0.01) { pressAction(); demo.press = true; }
      else if (rs.phase === 'hold') {
        var late = r === 1 ? 0.3 : 0;
        if (nt >= relTime() + late - 0.01) { releaseAction(); demo.press = false; }
      }
      if (rs.phase === 'done') demo.press = false;
    }
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (monkHit > 0) monkHit -= dt;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(W / 2 + 30, H * 0.865 + 30, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, '#ffffff', 0.85);
      label(GAME_TITLE, W / 2, 112, 80 + Math.sin(t * 3) * 3, C.blue);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 36, C.coral);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.72, 52, C.coral);
      else label('TAP TO START', W / 2, H * 0.72, 46, C.blue);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      game.draw.rect(0, H * 0.27, W, H * 0.3, '#ffffff', 0.9);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.blue : C.coral);
      label('SCORE ' + score, W / 2, H * 0.39, 56, C.ink);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.435, 36, C.blueD);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.49, 50, C.coral);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.49, 38, C.blue);
      if (!won) label('あと' + Math.max(1, ROUNDS.length - cleared) + '本!', W / 2, H * 0.25, 56, C.coral);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.55, 36, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, cleared: cleared, perfect: perfects, good: goods, miss: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene(dt);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 110, C.blue);
    if (over && won) label('FINISH', W / 2, H * 0.44, 100, C.blue);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
