// J-N6434-0031-clockface-hand-hop.js
// 大時計の針渡り — チクタクと刻んで近づく針に、隣へ並ぶ拍ぴったりで跳び移り、文字盤から落ちずに渡り続ける
// 操作: 画面のどこでもタップ。拍に合わせて針が1目盛りずつ寄ってくるので、隣に並ぶ拍(チャイム)でタップして跳ぶ(社内メモ。画面には出さない)
// 終わり: 9回跳び移れば成功。拍ズレ3回で足を踏み外す/時間切れで失敗
// @mechanic: rhythm
// @theme: clocktower_hand_hop
// 世界観: 時計塔の点検係のぜんまいネズミが、止まりかけた大時計の文字盤の上で、拍を刻んで寄ってくる針へ次々と跳び移り、落ちずに見回りをやり遂げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳び移った回数・PERFECT数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きはスプライトの拡大率で、位置は接地影で示す
  var STYLE = { bg: ['#241a44', '#5a3d7a', '#d08c5c'], main: ['#f4e6c4', '#a47c48', '#3b2a1b'], accent: ['#ffd23f', '#ff5a5f'] };
  var C = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], sky3: STYLE.bg[2],
    face: STYLE.main[0], rim: STYLE.main[1], ink: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1], white: '#ffffff', good: '#8cf5a8', far: '#3d2c5c'
  };

  var GAME_TITLE = 'CLOCKFACE HOP';
  var TIME_LIMIT = 15;
  var NEEDED = 9;
  var LIVES = 3;
  var BPM = 126;
  var BEAT = 60 / BPM;
  var PATTERN = [3, 3, 2, 3, 2, 2, 3, 2, 2, 3, 2, 2]; // 変拍子: 針が隣に並ぶまでの拍数
  var STEP = 0.36;        // 1拍で寄ってくる角度
  var GAP = 0.44;         // 跳び移るときの針どうしの間隔
  var CX = W / 2, CY = H * 0.45, R = 410, TIP = R * 0.84;
  var PERFECT_WIN = 0.075, GOOD_WIN = 0.19;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var MOUSE_A = ['..##....', '.####...', '########', '#o######', '.######k', '..#..#.k'];
  var MOUSE_B = ['..##....', '.####...', '########', '#o######', '.######k', '.#....#k'];
  var MOUSE_PAL = { '#': '#c9ccd6', 'o': '#241a44', 'k': '#ffd23f' };
  var GEAR = ['..#..#..', '.######.', '##....##', '.#.##.#.', '.#.##.#.', '##....##', '.######.', '..#..#..'];
  var TOWER = ['..##..', '.####.', '.#..#.', '.####.', '.#..#.', '.####.', '######'];
  var CLOUD = ['..####...', '.#######.', '#########'];

  var clk, nextBeat, beatOrigin, curA, nextA, nextTarget, nextAlpha;
  var phase, cycN, cycBeat, hopT, restBeats, patIdx;
  var hops, perfects, misses, lives, timeLeft, ready, hitStop, finished, ok, done, endWait;
  var hopAnim, hopFrom, hopTo, stumble, falling, fallY, drops, lastJudge, lastJudgeT, flashHand;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#1a1030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function tipX(a, r) { return CX + Math.cos(a) * (r || TIP); }
  function tipY(a, r) { return CY + Math.sin(a) * (r || TIP); }

  function initGame() {
    clk = 0; beatOrigin = 0; nextBeat = BEAT;
    curA = -Math.PI / 2 + 0.2;
    patIdx = 0; hops = 0; perfects = 0; misses = 0; lives = LIVES;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    hopAnim = 0; hopFrom = curA; hopTo = curA; stumble = 0; falling = false; fallY = 0;
    drops = []; lastJudge = ''; lastJudgeT = 0; flashHand = 0;
    startCycle();
  }

  function startCycle() {
    cycN = PATTERN[patIdx % PATTERN.length];
    patIdx++;
    cycBeat = 0;
    nextTarget = curA - GAP - cycN * STEP;
    nextA = nextTarget - 0.5;
    nextAlpha = 0;
    hopT = -1;
    restBeats = 0;
    phase = 'approach';
  }

  function sfxTone(note, dur, vol, wave) {
    if (state === S.PLAYING) game.audio.tone(note, dur, { wave: wave || 'square', volume: vol });
  }

  function onBeat(beatTime) {
    if (phase === 'approach') {
      cycBeat++;
      nextTarget = curA - GAP - (cycN - cycBeat) * STEP;
      if (cycBeat >= cycN) {
        hopT = beatTime; phase = 'window';
        sfxTone('E6', 0.12, 0.07, 'triangle');   // チャイム = 跳ぶ拍
      } else {
        sfxTone(cycBeat % 2 ? 'C5' : 'G4', 0.05, 0.05, 'square'); // チク・タク
      }
    } else if (phase === 'rest') {
      restBeats--;
      sfxTone('G4', 0.04, 0.03, 'square');
      if (restBeats <= 0) startCycle();
    }
  }

  // 次に跳ぶべき拍の時刻(まだ無ければ -1)
  function upcomingHop() {
    if (phase === 'window') return hopT;
    if (phase === 'approach' && cycBeat === cycN - 1) return nextBeat;
    return -1;
  }

  function mousePos() {
    var a = curA, lift = 0;
    if (hopAnim > 0) {
      var k = 1 - hopAnim;
      a = hopFrom + (hopTo - hopFrom) * k;
      lift = Math.sin(k * Math.PI) * 90;
    }
    var x = tipX(a), y = tipY(a) - 46 - lift + fallY;
    if (stumble > 0) x += Math.sin(stumble * 60) * 14;
    return { x: x, y: y, lift: lift };
  }

  function doHop() {
    if (finished || falling) return;
    var ht = upcomingHop();
    var d = ht >= 0 ? clk - ht : 99;
    var p = mousePos();
    if (Math.abs(d) <= GOOD_WIN) {
      var perfect = Math.abs(d) <= PERFECT_WIN;
      drops.push({ a: curA, v: 0, alpha: 1 });
      hopFrom = curA; hopTo = curA - GAP; curA = hopTo; hopAnim = 1;
      hops++;
      if (perfect) perfects++;
      lastJudge = perfect ? 'PERFECT' : 'GOOD'; lastJudgeT = 0.6;
      flashHand = 0.25;
      restBeats = d < 0 ? 2 : 1;
      phase = 'rest';
      if (state === S.PLAYING) {
        game.audio.play('se_jump', 0.4);
        game.audio.tone(perfect ? 'C6' : 'A5', 0.08, { wave: 'triangle', volume: 0.06, slide: 200 });
      }
      game.feedback.good(p.x, p.y - 40, { text: lastJudge, color: perfect ? C.gold : C.good, size: 50, sound: state === S.PLAYING ? 'se_good' : 'se_tap', volume: 0.2 });
      if (hops === Math.ceil(NEEDED / 2) && state === S.PLAYING) {
        game.fx.popup(hops + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.gold, size: 54 });
        game.audio.play('se_milestone', 0.4);
      }
      if (hops >= NEEDED) {
        finished = true; ok = true; hitStop = 0.5;
        game.fx.burst(p.x, p.y, { color: C.gold, count: 26, speed: 460 });
      }
    } else {
      loseLife(p, 'early');
    }
  }

  function loseLife(p, why) {
    misses++; lives--;
    stumble = 0.35;
    lastJudge = 'MISS'; lastJudgeT = 0.6;
    game.feedback.bad(p.x, p.y - 30, { text: 'MISS', shake: 10 });
    if (why === 'late') {
      drops.push({ a: nextA, v: 0, alpha: 1 });
      phase = 'rest'; restBeats = 1;
    }
    if (lives <= 0) {
      finished = true; ok = false; falling = true; hitStop = 0.55;
      game.fx.flash('#ffffff', 0.15);
    }
  }

  function simulate(dt) {
    clk += dt;
    while (clk >= nextBeat) { var bt = nextBeat; nextBeat += BEAT; onBeat(bt); }
    // 針は拍でカチッと寄る(短いイーズ)
    nextA += (nextTarget - nextA) * Math.min(1, dt * 22);
    nextAlpha = Math.min(1, nextAlpha + dt * 4);
    if (phase === 'window' && clk > hopT + GOOD_WIN) loseLife(mousePos(), 'late');
    if (hopAnim > 0) hopAnim = Math.max(0, hopAnim - dt * 5);
    if (stumble > 0) stumble -= dt;
    if (flashHand > 0) flashHand -= dt;
    if (lastJudgeT > 0) lastJudgeT -= dt;
    for (var i = drops.length - 1; i >= 0; i--) {
      var dr = drops[i];
      dr.v += dt * 5;
      dr.a += (Math.PI / 2 - dr.a) * Math.min(1, dt * dr.v * 0.6);
      dr.alpha -= dt * 1.6;
      if (dr.alpha <= 0) drops.splice(i, 1);
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.55, C.sky2], [1, C.sky3]]);
    game.draw.rect(0, 0, W, H, C.gold, 0.03 + 0.03 * Math.sin(t * 1.4));
    // 遠景の塔(奥ほど小さく淡い=ビルボード)
    for (var i = 0; i < 5; i++) {
      var sc = 6 + i * 3;
      var bx = ((i * 263 + t * (6 + i * 4)) % (W + 200)) - 100;
      game.draw.sprite(TOWER, { '#': i < 2 ? C.far : '#4a3468' }, bx, H * 0.78 - sc * 7 + Math.sin(t + i) * 4, sc, { alpha: 0.5 + i * 0.1 });
    }
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 390 + t * 22) % (W + 300)) - 150;
      game.draw.sprite(CLOUD, { '#': '#f6d1b0' }, cx, H * (0.1 + c * 0.05) + Math.cos(t * 0.7 + c) * 8, 12, { alpha: 0.35 });
    }
  }

  function drawHandBeam(a, color, width, alpha) {
    var steps = 6;
    for (var s = 0; s < steps; s++) {
      var r0 = (TIP + 30) * s / steps, r1 = (TIP + 30) * (s + 1) / steps;
      game.draw.line(tipX(a, r0), tipY(a, r0), tipX(a, r1), tipY(a, r1), color, width - s * 2);
    }
    game.draw.circle(tipX(a, TIP + 30), tipY(a, TIP + 30), width * 0.7, color, alpha);
  }

  function drawClock() {
    var t = game.time.elapsed;
    // 文字盤の接地影 → 盤面
    game.draw.circle(CX + 18, CY + 26, R + 26, '#120a24', 0.45);
    game.draw.circle(CX, CY, R + 26, C.rim);
    game.draw.circle(CX, CY, R, C.face);
    game.draw.circle(CX, CY, R * 0.62, '#eadbb4');
    for (var h = 0; h < 12; h++) {
      var a = h * Math.PI / 6;
      var lit = (hops > 0 && h < hops);
      game.draw.circle(tipX(a, R - 36), tipY(a, R - 36), h % 3 === 0 ? 16 : 10, lit ? C.gold : C.ink);
    }
    // 落ちていく古い針
    for (var i = 0; i < drops.length; i++) drawHandBeam(drops[i].a, '#8a6a44', 22, Math.max(0, drops[i].alpha));
    // 寄ってくる針(狙う物: 明滅+白縁)
    var ht = upcomingHop();
    var blink = 0.5 + 0.5 * Math.sin(t * 14);
    if (phase === 'approach' || phase === 'window') {
      drawHandBeam(nextA, '#ffffff', 34, 0.25 + 0.4 * blink * nextAlpha);
      drawHandBeam(nextA, C.gold, 26, nextAlpha);
    }
    // 自分が乗っている針
    drawHandBeam(curA, flashHand > 0 ? '#ffffff' : C.rim, 28, 1);
    game.draw.sprite(GEAR, { '#': C.ink }, CX, CY, 9, { anchor: 'center' });
    game.draw.circle(CX, CY, 14, C.gold);
    // 拍の接近リング(跳ぶ拍で針先にぴったり重なる)
    if (ht >= 0) {
      var k = Math.max(0, (ht - clk) / BEAT);
      var tx = tipX(curA - GAP), ty = tipY(curA - GAP);
      game.draw.circle(tx, ty, 34 + k * 150, '#ffffff', 0.12 + 0.18 * (1 - k));
      game.draw.circle(tx, ty, 30, C.gold, 0.5 + 0.5 * blink);
    }
  }

  function drawMouse() {
    var p = mousePos();
    var sh = Math.max(0.2, 1 - p.lift / 140);
    if (!falling) game.draw.circle(p.x, tipY(hopAnim > 0 ? hopFrom + (hopTo - hopFrom) * (1 - hopAnim) : curA) - 8, 30 * sh, '#000000', 0.25 * sh);
    var frame = Math.floor(game.time.elapsed * 6) % 2 === 0 ? MOUSE_A : MOUSE_B;
    var bob = Math.sin(game.time.elapsed * 5) * 4;
    game.draw.sprite(frame, MOUSE_PAL, p.x, p.y + bob, 14, { anchor: 'center', flipX: hopAnim > 0 });
    if (hitStop > 0 && finished) {
      game.draw.circle(p.x, p.y, 70 + Math.sin(game.time.elapsed * 30) * 8, '#ffffff', 0.35);
      game.draw.sprite(frame, MOUSE_PAL, p.x, p.y, 18, { anchor: 'center' });
    }
  }

  function drawPendulum() {
    // 親指ゾーン: 拍の振り子(端に着いた瞬間が拍)
    var px = W / 2, py = H * 0.76;
    var ph = (clk - beatOrigin) / BEAT;
    var sw = Math.cos(Math.PI * ph) * 0.45;
    var bx = px + Math.sin(sw) * 230, by = py + Math.cos(sw) * 230;
    game.draw.rect(px - 250, py - 20, 500, 18, C.rim);
    game.draw.line(px, py, bx, by, C.ink, 10);
    var ht = upcomingHop();
    var hot = ht >= 0 && Math.abs(ht - clk) < 0.12;
    game.draw.circle(bx, by, 52, hot ? C.gold : C.rim);
    game.draw.circle(bx, by, 34, hot ? '#ffffff' : C.face);
    game.draw.rect(60, H * 0.87, W - 120, 8, C.rim, 0.6);
  }

  function drawHud() {
    txt(hops + ' / ' + NEEDED, W / 2, 70, 48, C.face);
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 124, bw, 20, '#1a1030', 0.7);
    game.draw.rect(80, 124, bw * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? C.red : C.gold);
    for (var i = 0; i < LIVES; i++) {
      game.draw.sprite(GEAR, { '#': i < lives ? C.gold : '#4a3a5a' }, 110 + i * 84, 196, 7, { anchor: 'center' });
    }
    game.draw.sprite(MOUSE_A, MOUSE_PAL, W - 130, 196, 6, { anchor: 'center' });
    if (lastJudgeT > 0) txt(lastJudge, W / 2, H * 0.16, 44, lastJudge === 'MISS' ? C.red : C.gold);
  }

  function drawScene() {
    drawBackdrop();
    drawClock();
    drawMouse();
    drawPendulum();
  }

  // ── ATTRACT ゴースト実演(実ロジック: 2回ぴったり跳び、3回目はわざと遅れてMISS) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, hopsDone: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.hopsDone = 0; }
    simulate(dt);
    var ht = upcomingHop();
    demo.press = false;
    if (ht >= 0 && clk >= ht && phase === 'window' && demo.hopsDone < 2) {
      demo.hopsDone++;
      doHop();
    }
    if (ht >= 0 && Math.abs(clk - ht) < 0.15 && demo.hopsDone <= 2) demo.press = true;
    if (lives < LIVES) lives = LIVES; // 実演では落ちない
    var p = mousePos();
    demo.gx = p.x + 80; demo.gy = p.y + 120;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) { game.audio.play('se_tap', 0.1); return; }
    game.audio.play('se_tap', 0.15);
    doHop();
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (clk === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07, 64, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 36, C.face);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.93, 46, C.gold);
      else txt('TAP TO START', W / 2, H * 0.93, 40, C.face);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawResult();
      return;
    }

    // PLAYING
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var score = hops * 100 + perfects * 50;
        if (ok) game.end.success(score, { hops: hops, perfect: perfects, miss: misses });
        else game.end.failure({ hops: hops, perfect: perfects, miss: misses });
        return;
      }
      if (falling) fallY += dt * 900;
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        if (ok) { game.audio.play('se_success', 0.5); game.fx.burst(W / 2, H * 0.4, { color: C.gold, count: 40, speed: 600 }); }
        else { game.audio.play('se_failure', 0.5); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) {
        game.audio.play('se_tap', 0.3);
        clk = 0; beatOrigin = 0; nextBeat = BEAT;
        game.audio.melody([['C4', 1], ['G4', 1], ['E4', 1], ['G4', 1], ['A3', 1], ['E4', 1], ['C4', 1], ['E4', 1]], { tempo: BPM, wave: 'triangle', volume: 0.04, loop: true });
      }
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.5;
        var mp = mousePos();
        game.feedback.bad(mp.x, mp.y, { text: 'TIME UP' });
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, C.gold);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 90, ok ? C.gold : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, '#120a24', 0.45);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 96, ok ? C.gold : C.red);
    txt(hops + ' / ' + NEEDED, W / 2, H * 0.33, 64, C.face);
    txt('PERFECT ' + perfects, W / 2, H * 0.39, 44, C.gold);
    var score = hops * 100 + perfects * 50;
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.45, 52, C.good);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.45, 40, C.face);
    if (!ok && NEEDED - hops > 0) txt('あと' + (NEEDED - hops) + '回!', W / 2, H * 0.51, 52, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 40, C.face);
  }

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['C5', 1], ['B4', 0.5], ['G4', 0.5], ['E4', 1]], { tempo: 110, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
