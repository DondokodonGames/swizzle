// I-GBA-0032v3-riverbank-petal-peck.js
// 川べりの花びらついばみ — 風に舞って逃げる桜の花びらを、ひな鳥をタップの方へ次々羽ばたかせて追いかけ、地面に着く前にくちばしで受け止める
// 操作: タップした所へひな鳥がひと羽ばたき飛ぶ(1回で届くのは少しだけ)。花びらに近づくと花びらが震え、すぐ捕まえないと風に乗ってひな鳥と反対へ逃げる。連続タップで追いすがってくちばしを当てる。タップしないとひな鳥はゆっくり降りる
// 終わり: 20秒以内に8枚受け止めればCLEAR。花びらを3枚地面に落とす/時間切れでGAME OVER。後の花びらほど落ちるのが速く逃げ足も強く、ジグザグに舞い、終盤は2枚同時に降る
// @mechanic: chase
// @theme: cherry_riverbank_chick_petal
// 世界観: 桜並木の川べりで、巣立ったばかりのひな鳥が風に舞い散る花びらを追いかけて羽ばたき、地面に落ちる前にくちばしで一枚ずつ受け止める
// 残るもの: 正誤(CLEAR/GAME OVER) + 受け止めた枚数・落とした枚数・最大連続・スコア
// スタイル: PIXEL HD

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 3層以上のパララックス、左上の光源で陰影を統一、4フレームの細かいアニメ
  var STYLE = { bg: ['#bfe4ff', '#fff2f6'], main: ['#ffc4d8', '#ff8fb4', '#7a5a4a'], accent: ['#ffe14a', '#4ac0e0'] };
  var PETAL_C = STYLE.main[0], PINK = STYLE.main[1], BARK = STYLE.main[2];
  var CHICK_C = STYLE.accent[0], WATER = STYLE.accent[1];

  var LOGO = 'PETAL PECK';
  var NEEDED = 8;
  var DROP_MAX = 3;
  var TIME_LIMIT = 20;
  var GROUND = H * 0.72;
  var CEIL = H * 0.25;
  var CATCH_R = 58, SENSE_R = 230, ALERT_T = 0.5;

  var PHASE = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var phase = PHASE.ATTRACT;

  // ── スプライト(左上光源: L=明部 Y=中間 D=陰) ──
  var CHICK = [
    ['...LLYY...', '..LYYYYY..', '.LYKYYYYOO', '.YYYYYYOO.', 'WWYYYYYD..', '.WWYYYYD..', '.YYYYYDD..', '..YDDDD...', '...F..F...'],
    ['...LLYY...', '..LYYYYY..', '.LYKYYYYOO', 'WWYYYYYOO.', 'WWWYYYYD..', '.YYYYYYD..', '.YYYYYDD..', '..YDDDD...', '...F..F...'],
    ['W..LLYY...', 'WWLYYYYY..', 'WWYKYYYYOO', '.WYYYYYOO.', '.YYYYYYD..', '.YYYYYYD..', '.YYYYYDD..', '..YDDDD...', '...F..F...'],
    ['...LLYY...', '..LYYYYY..', '.LYKYYYYOO', 'WWYYYYYOO.', 'WWWYYYYD..', '.YYYYYYD..', '.YYYYYDD..', '..YDDDD...', '...F..F...'],
  ];
  var CHICK_SAD = ['..........', '...LLYY...', '..LYYYYY..', '.LYKKYYYOO', '.YYYYYYOO.', 'WYYYYYYD..', 'WWYYYYDD..', '..YDDDD...', '..F....F..'];
  var CHICK_PAL = { L: '#fff6b0', Y: CHICK_C, D: '#e0a820', K: '#3a2a20', O: '#ff8a3a', W: '#ffd060', F: '#ff8a3a' };
  var PETAL = [
    ['.PP..', 'PPHP.', 'PPPPP', '.PPPP', '..PP.'],
    ['..P..', '.PHP.', 'PPPPP', '.PPP.', '..P..'],
    ['.....', 'PPHPP', 'PPPPP', '.....', '.....'],
    ['..PP.', '.PHPP', 'PPPPP', 'PPPP.', '.PP..'],
  ];
  var PETAL_PAL = { P: PETAL_C, H: '#ffffff' };
  var PETAL_ALERT = { P: '#ffe0ec', H: '#ffffff' };

  // ── 川べりモデル(本番・デモ共通) ──
  function makeField() { return { cx: W * 0.5, cy: GROUND - 60, dvx: 0, dvy: 0, dash: 0, face: 1, petals: [] }; }
  function addPetal(F, k) {
    F.petals.push({ x: game.random(W * 0.15, W * 0.85), y: H * 0.17, vy: 70 + k * 9, sway: game.random(0, 6), zig: k >= 4 ? 1 : 0,
      gust: 380 + k * 40, state: 'fall', alertT: 0, gx: 0, gy: 0, cool: 0, wasAlert: false, k: k });
  }
  function flapTo(F, x, y) {
    var dx = x - F.cx, dy = y - F.cy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 4) return;
    var reach = Math.min(d, 260);
    F.dvx = dx / d * reach / 0.2; F.dvy = dy / d * reach / 0.2;
    F.dash = 0.2;
    if (Math.abs(dx) > 8) F.face = dx > 0 ? 1 : -1;
  }
  // 戻り値: イベント配列
  function stepField(F, dt) {
    var out = [];
    if (F.dash > 0) {
      var st = Math.min(dt, F.dash);
      F.cx += F.dvx * st; F.cy += F.dvy * st; F.dash -= dt;
    } else if (F.cy < GROUND - 60) {
      F.cy = Math.min(GROUND - 60, F.cy + 140 * dt);
    }
    F.cx = Math.max(60, Math.min(W - 60, F.cx));
    F.cy = Math.max(CEIL, Math.min(GROUND - 40, F.cy));
    var bx = F.cx + F.face * 44, by = F.cy - 6;
    for (var i = F.petals.length - 1; i >= 0; i--) {
      var p = F.petals[i];
      if (p.state === 'ground') continue;
      if (p.cool > 0) p.cool -= dt;
      var sway = Math.sin(game.time.elapsed * (2 + p.zig * 2.5) + p.sway) * (40 + p.zig * 90);
      p.x += (sway + p.gx) * dt;
      p.y += (p.vy + p.gy) * dt;
      p.gx *= Math.pow(0.12, dt); p.gy *= Math.pow(0.1, dt);
      if (p.x < 50) { p.x = 50; p.gx = Math.abs(p.gx); }
      if (p.x > W - 50) { p.x = W - 50; p.gx = -Math.abs(p.gx); }
      var dx = p.x - F.cx, dy = p.y - F.cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (p.state === 'fall' && dist < SENSE_R && p.cool <= 0) { p.state = 'alert'; p.alertT = ALERT_T; p.wasAlert = true; out.push({ kind: 'alert', p: p }); }
      if (p.state === 'alert') {
        p.alertT -= dt;
        if (p.alertT <= 0) {
          var s = dx >= 0 ? 1 : -1;
          p.gx = s * p.gust; p.gy = -170; p.state = 'fall'; p.cool = 0.9;
          out.push({ kind: 'gust', p: p });
        }
      }
      var ex = p.x - bx, ey = p.y - by;
      if (ex * ex + ey * ey < CATCH_R * CATCH_R) {
        F.petals.splice(i, 1);
        out.push({ kind: 'catch', x: p.x, y: p.y, perfect: p.state === 'alert' });
        continue;
      }
      if (p.y >= GROUND - 10) { p.y = GROUND - 10; p.state = 'ground'; out.push({ kind: 'land', p: p }); }
    }
    return out;
  }
  function falling(F) {
    var n = 0;
    for (var i = 0; i < F.petals.length; i++) if (F.petals[i].state !== 'ground') n++;
    return n;
  }

  // ── 描画(パララックス4層) ──
  var drift = 0;
  function drawBank(F) {
    drift = Math.sin(game.time.elapsed * 0.25) * 30;
    game.draw.gradient(0, GROUND, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, '#ffe6ee']]);
    // 光源(左上)の光の筋
    for (var r = 0; r < 4; r++) game.draw.rect(-200 + r * 150 + drift * 0.2, 0, 70, GROUND, '#ffffff', 0.07);
    game.draw.circle(W * 0.12, H * 0.14, 90, '#fffbe0', 0.6);
    game.draw.circle(W * 0.12, H * 0.14, 160, '#fffbe0', 0.18);
    // 第1層: 遠くの山と桜並木
    for (var m = 0; m < 6; m++) game.draw.circle(m * 230 + drift * 0.3, GROUND - 120, 190, '#c8d8f0', 0.8);
    for (var t = 0; t < 9; t++) game.draw.circle(t * 140 + 40 + drift * 0.5, GROUND - 170, 70, '#ffd6e4', 0.9);
    // 第2層: 中景の桜の木
    for (var j = 0; j < 4; j++) {
      var tx = j * 330 + 60 + drift * 0.8;
      game.draw.rect(tx - 18, GROUND - 260, 36, 260, BARK);
      game.draw.rect(tx - 18, GROUND - 260, 12, 260, '#9a7a68');
      game.draw.circle(tx, GROUND - 290, 110, PINK, 0.85);
      game.draw.circle(tx - 30, GROUND - 320, 80, PETAL_C, 0.9);
      game.draw.circle(tx - 50, GROUND - 336, 34, '#ffffff', 0.35);
    }
    // 第3層: 頭上の枝(花びらの出どころ)
    game.draw.rect(0, 232, W, 30, BARK, 0.9);
    for (var c = 0; c < 10; c++) {
      var cx = c * 118 + drift * 1.2;
      game.draw.circle(cx, 290, 70, PINK, 0.95);
      game.draw.circle(cx - 20, 270, 46, PETAL_C);
      game.draw.circle(cx - 34, 258, 16, '#ffffff', 0.5);
    }
    // 第4層: 土手と川
    game.draw.rect(0, GROUND, W, 70, '#8ccf6a');
    game.draw.rect(0, GROUND, W, 12, '#b4e88a');
    for (var g = 0; g < 26; g++) game.draw.rect((g * 47 + drift * 1.6 + 2000) % W, GROUND + 18 + (g % 3) * 14, 6, 16, '#5aa848');
    game.draw.gradient(GROUND + 70, H, [[0, '#7ad0ec'], [1, '#3a90c0']]);
    for (var w = 0; w < 14; w++) {
      var wy = GROUND + 100 + w * 34;
      var wx = ((w * 173 + game.time.elapsed * (40 + w * 6)) % (W + 300)) - 150;
      game.draw.rect(wx, wy, 140, 5, '#ffffff', 0.35);
    }
  }

  function drawPetals(F, hl, hk) {
    for (var i = 0; i < F.petals.length; i++) {
      var p = F.petals[i];
      // 地面の影: 近づくほど濃く大きい(着地の予告)
      var near = Math.max(0, 1 - (GROUND - p.y) / 700);
      if (p.state !== 'ground') {
        game.draw.circle(p.x, GROUND + 6, 10 + near * 26, '#3a5a2a', 0.1 + near * 0.3);
        if (near > 0.8 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.circle(p.x, GROUND + 6, 40, '#ff4a6a', 0.35);
      }
      var fr = p.state === 'ground' ? 2 : Math.floor(game.time.elapsed * 8 + p.sway) % 4;
      var shiver = p.state === 'alert' ? Math.sin(game.time.elapsed * 70) * 6 : 0;
      if (p.state === 'alert') {
        game.draw.circle(p.x, p.y, 44, '#ffffff', 0.35 + 0.25 * Math.sin(game.time.elapsed * 20));
        for (var s = 0; s < 3; s++) game.draw.line(p.x - 70, p.y - 20 + s * 20, p.x - 30, p.y - 20 + s * 20, '#ffffff', 3);
      }
      game.draw.sprite(PETAL[fr], p.state === 'alert' ? PETAL_ALERT : PETAL_PAL, p.x + shiver, p.y, 9, { anchor: 'center' });
      if (p === hl) game.draw.circle(p.x, p.y, 40 + hk * 100, '#ffffff', 0.6 * (1 - hk) + 0.2);
    }
  }

  function drawChick(F, mood) {
    var air = F.cy < GROUND - 62;
    var fr = air || F.dash > 0 ? Math.floor(game.time.elapsed * 16) % 4 : 0;
    var bob = air ? 0 : Math.sin(game.time.elapsed * 5) * 4;
    var hop = mood === 'joy' ? -Math.abs(Math.sin(game.time.elapsed * 9)) * 60 : 0;
    var h = Math.max(0, (GROUND - 40 - F.cy) / (GROUND - CEIL));
    game.draw.circle(F.cx, GROUND + 6, 34 - h * 18, '#3a5a2a', 0.3 - h * 0.15);
    if (mood === 'sad') game.draw.sprite(CHICK_SAD, CHICK_PAL, F.cx, F.cy + 10, 11, { anchor: 'center', flipX: F.face < 0 });
    else game.draw.sprite(CHICK[fr], CHICK_PAL, F.cx, F.cy + bob + hop, 11, { anchor: 'center', flipX: F.face < 0 });
  }

  function ink(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: '#7a3a5a', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col || '#ffffff', bold: true, align: 'center' });
  }

  // ── 状態 ──
  var field, caught, dropped, spawned, combo, maxCombo, perfects, spawnT, timeLeft, countIn, stop, over, won, endT, score, prevBest, celebT;

  function initGame() {
    field = makeField(); caught = 0; dropped = 0; spawned = 0; combo = 0; maxCombo = 0; perfects = 0; spawnT = 0.15;
    timeLeft = TIME_LIMIT; countIn = 0.8; stop = null; over = false; won = false; endT = 0;
    score = 0; prevBest = game.best || 0; celebT = 0;
  }

  function haltThen(p, after) { stop = { t: 0.42, max: 0.42, p: p, after: after }; }

  function handle(evs) {
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.kind === 'alert') game.audio.tone('E6', 0.08, { wave: 'triangle', volume: 0.06, slide: 300 });
      else if (e.kind === 'gust') game.audio.tone('A4', 0.22, { wave: 'sine', volume: 0.07, slide: -260 });
      else if (e.kind === 'catch') {
        caught++; combo++; maxCombo = Math.max(maxCombo, combo);
        if (e.perfect) perfects++;
        score += (e.perfect ? 150 : 100) + combo * 20;
        game.feedback.good(e.x, e.y, { text: e.perfect ? 'PERFECT' : 'NICE', color: PINK, count: 16 });
        game.audio.tone(523 + combo * 60, 0.08, { wave: 'square', volume: 0.06 });
        if (combo === 4) { game.fx.popup('x4', field.cx, field.cy - 120, { color: CHICK_C, size: 60 }); game.audio.play('se_milestone', 0.4); }
        if (caught >= NEEDED) { won = true; wrapUp(); return; }
      } else if (e.kind === 'land') {
        combo = 0;
        game.audio.play('se_tap', 0.3);
        (function (pp) {
          haltThen(pp, function () {
            dropped++;
            game.feedback.bad(pp.x, pp.y - 30, { text: 'MISS', shake: 10 });
            var idx = field.petals.indexOf(pp);
            if (idx >= 0) field.petals.splice(idx, 1);
            if (dropped >= DROP_MAX) { won = false; wrapUp(); }
          });
        })(e.p);
        return;
      }
    }
  }

  // ── 入力 ──
  game.onPress(function (x, y) {
    if (phase === PHASE.ATTRACT) { game.audio.play('se_coin', 0.45); phase = PHASE.PLAYING; initGame(); return; }
    if (phase === PHASE.RESULT) { game.audio.play('se_tap', 0.2); phase = PHASE.ATTRACT; initGame(); demo.t = 0; return; }
    if (countIn > 0 || stop || over) { game.audio.tone('C5', 0.04, { wave: 'triangle', volume: 0.04 }); return; }
    flapTo(field, x, y);
    game.audio.play('se_jump', 0.18);
    game.fx.burst(field.cx, field.cy + 20, { color: '#ffffff', count: 4, speed: 120, size: 8 });
  });

  function wrapUp() {
    if (over) return;
    over = true; endT = 1.4;
    if (won) score += Math.floor(timeLeft * 15) + (DROP_MAX - dropped) * 60;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash('#ffe6ee', 0.3);
  }

  function enterResult() {
    phase = PHASE.RESULT;
    var stats = { caught: caught, dropped: dropped, maxCombo: maxCombo, perfect: perfects, timeLeft: Math.round(timeLeft * 10) / 10 };
    if (won) game.end.success(score, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT: 連続タップで追いすがって1枚目をくちばしで受け、2枚目は手が止まって逃げられ地面へ ──
  var demo = { t: 0, F: null, hx: W * 0.5, hy: H * 0.6, press: 0, tapT: 0, hl: null, k: 0, stage: 0 };
  var DEMO_CYCLE = 4.6;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.F) {
      demo.F = makeField(); demo.F.cx = W * 0.3;
      addPetal(demo.F, 0); demo.F.petals[0].x = W * 0.66; demo.F.petals[0].y = H * 0.32; demo.F.petals[0].vy = 120;
      demo.stage = 0; demo.hl = null; demo.k = 0; demo.tapT = 0.35;
    }
    var F = demo.F;
    if (demo.press > 0) demo.press -= dt;
    var target = null;
    for (var i = 0; i < F.petals.length; i++) if (F.petals[i].state !== 'ground') target = F.petals[i];
    if (demo.stage === 0 && target) {
      demo.tapT -= dt;
      if (demo.tapT <= 0) {
        demo.tapT = 0.2;
        flapTo(F, target.x - F.face * 30, target.y + 10);
        demo.press = 0.12; demo.hx = target.x - 20; demo.hy = target.y + 40;
      }
    }
    if (demo.stage === 1 && cyc > 2.1) {
      addPetal(F, 2);
      var np = F.petals[F.petals.length - 1];
      np.x = W * 0.85; np.y = H * 0.42; np.vy = 380; np.cool = 9;
      demo.stage = 2;
      flapTo(F, W * 0.15, H * 0.5);
      demo.press = 0.14; demo.hx = W * 0.15; demo.hy = H * 0.5;
    }
    var evs = stepField(F, dt);
    for (var j = 0; j < evs.length; j++) {
      if (evs[j].kind === 'catch') { game.feedback.good(evs[j].x, evs[j].y, { text: 'PERFECT', color: PINK, count: 10, volume: 0.2 }); demo.stage = 1; }
      if (evs[j].kind === 'land') { demo.hl = evs[j].p; demo.k = 0; demo.stage = 3; game.feedback.bad(evs[j].p.x, evs[j].p.y - 30, { text: 'MISS', volume: 0.15, shake: 3 }); }
    }
    if (demo.hl) demo.k = Math.min(1, demo.k + dt * 2);
  }

  function drawHud() {
    ink(caught + ' / ' + NEEDED, W * 0.18, 90, 54);
    ink(String(score), W * 0.5, 90, 44, '#fff6b0');
    for (var i = 0; i < DROP_MAX; i++) game.draw.sprite(PETAL[0], i < dropped ? { P: '#9a7a88', H: '#cccccc' } : PETAL_PAL, W * 0.74 + i * 72, 90, 9, { anchor: 'center' });
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 168, W - 140, 22, '#7a3a5a', 0.4);
    game.draw.rect(70, 168, (W - 140) * fr, 22, low ? '#ff4a6a' : '#ffffff');
    if (combo >= 2) ink('x' + combo, W * 0.5, 140, 30, CHICK_C);
  }

  game.onUpdate(function (dt) {
    if (phase === PHASE.ATTRACT) {
      stepDemo(dt);
      drawBank(demo.F);
      drawPetals(demo.F, demo.hl, demo.k);
      drawChick(demo.F, demo.stage === 3 ? 'sad' : '');
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 14 });
      ink(LOGO, W / 2, 90, 76, '#ffffff');
      ink('HI-SCORE ' + (game.best > 0 ? game.best : '-'), W / 2, 170, 34, '#fff6b0');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('► 100円 投入 ◄', W / 2, H * 0.88, 46, '#ffffff');
      else ink('TAP TO START', W / 2, H * 0.88, 40, '#fff6b0');
      return;
    }

    if (phase === PHASE.RESULT) {
      drawBank(field);
      drawChick(field, won ? 'joy' : 'sad');
      ink(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 100, won ? '#ffffff' : '#ff4a6a');
      ink(caught + ' / ' + NEEDED, W / 2, H * 0.43, 60);
      ink('SCORE ' + score, W / 2, H * 0.5, 50);
      if (won && score > prevBest) ink('NEW RECORD', W / 2, H * 0.56, 52, CHICK_C);
      else ink('BEST ' + Math.max(prevBest, score), W / 2, H * 0.56, 40, '#fff6b0');
      if (!won) ink('あと' + (NEEDED - caught) + '枚!', W / 2, H * 0.62, 56, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', W / 2, H * 0.88, 40);
      return;
    }

    // ── PLAYING ──
    var k = 0;
    if (over) {
      endT -= dt;
      if (won) {
        celebT -= dt;
        if (celebT <= 0) { celebT = 0.14; game.fx.burst(game.random(W * 0.1, W * 0.9), game.random(H * 0.25, H * 0.6), { color: game.random(0, 1) < 0.5 ? PETAL_C : CHICK_C, count: 14, speed: 420 }); }
      }
      if (endT <= 0) { enterResult(); return; }
    } else if (stop) {
      stop.t -= dt;
      k = 1 - stop.t / stop.max;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.tone('G5', 0.12, { wave: 'triangle', volume: 0.1 });
    } else {
      timeLeft -= dt;
      var maxActive = spawned >= 6 ? 2 : 1;
      if (falling(field) < maxActive) {
        spawnT -= dt;
        if (spawnT <= 0) { addPetal(field, spawned); spawned++; spawnT = 0.5; game.audio.tone('B5', 0.06, { wave: 'sine', volume: 0.05 }); }
      }
      handle(stepField(field, dt));
      if (!over && !stop && timeLeft <= 0) {
        timeLeft = 0;
        haltThen(null, function () { game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' }); won = false; wrapUp(); });
      }
    }

    drawBank(field);
    drawPetals(field, stop ? stop.p : null, k);
    drawChick(field, stop && stop.p ? 'sad' : (over ? (won ? 'joy' : 'sad') : ''));
    drawHud();
    if (countIn > 0) ink(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, '#ffffff');
  });

  game.onStart(function () {
    game.audio.melody([['A5', 0.5], ['B5', 0.5], ['C6', 1], ['B5', 0.5], ['A5', 0.5], ['F5', 1], ['E5', 0.5], ['F5', 0.5], ['A5', 1], ['E5', 2],
      ['C6', 0.5], ['D6', 0.5], ['E6', 1], ['D6', 0.5], ['C6', 0.5], ['B5', 1], ['A5', 0.5], ['B5', 0.5], ['C6', 1], ['A5', 2]],
      { tempo: 108, wave: 'triangle', volume: 0.05, loop: true, bass: [['A3', 2], ['F3', 2], ['E3', 2], ['A3', 2], ['F3', 2], ['G3', 2], ['E3', 2], ['A3', 2]] });
    phase = PHASE.ATTRACT;
    initGame();
  });
})(game);
