// I-GBA-0043v3-keyhole-blank-pick.js
// 合鍵ブランク選び — 鍵穴の幅に近いほうの合鍵を瞬時に見比べ、指で押し上げて差し込む
// 操作: 左右に吊るされた2本の鍵のうち、刃の太さが鍵穴の幅により近いほうに指を置いて上へ弾く。近い鍵は回り、遠い鍵は詰まるかガタつく
// 終わり: 7本の錠をさばけば成功。外れや時間切れで鍵札を失い、3枚なくなると失敗
// @mechanic: size_judge
// @theme: keysmith_blank_match
// 世界観: 商店街の合鍵屋で、鍵職人が客の持ち込んだ錠の鍵穴を見て、吊るした2本の鍵のどちらの刃が鍵穴の幅に近いかを見比べ、合うほうを差し込んで回す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(開けた錠の数と速さ)
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒地に白ドット。画面の帯ごとに単色のセロハンを重ねる。矩形波の単音と無音の間
  var STYLE = { bg: ['#000000', '#0b0b0b'], main: ['#ffffff', '#bdbdbd', '#6e6e6e'], accent: ['#ffb000', '#33d6ff'] };
  var C = { black: STYLE.bg[0], dark: STYLE.bg[1], white: STYLE.main[0], gray: STYLE.main[1], dim: STYLE.main[2], amber: STYLE.accent[0], cyan: STYLE.accent[1], good: '#7dff7a', bad: '#ff4a3a' };

  var GAME_TITLE = 'KEY BLANK';
  var ROUNDS = 7;
  var NEEDED = 7;
  var TIME_LIMIT = 14;          // size_judge = F族 8〜15s
  var WINDOWS = [2.0, 1.9, 1.75, 1.6, 1.5, 1.4, 1.3];
  var MARGINS = [30, 25, 21, 17, 14, 11, 9];   // 遠い鍵と近い鍵の差(px)。だんだん僅差に
  var LIVES = 3;

  var LOCK_X = W / 2, HOLE_Y = Math.round(H * 0.29), SLOT_LEN = 150;
  var KEY_TIP_Y = Math.round(H * 0.6), BLADE_LEN = 300;
  var KEY_XS = [Math.round(W * 0.27), Math.round(W * 0.73)];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var slotW, keys, roundIdx, windowT, phase, phaseT, choice, lives, opened, score, timeLeft;
  var countIn, freeze, over, won, endT, grabbed, grabY0, bolt, tickDone, milestoneDone, prevBest, lastPerfect, workT;

  function mono(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.dim, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: color || C.white, bold: true, align: 'center', font: 'monospace' });
  }

  // 鍵職人(前掛け・やすり)— 白1色のドット
  var SMITH = [
    ['..####..', '.######.', '.#.##.#.', '.######.', '..#..#..', '...##...', '.######.', '#.####.#', '#.####.#', '..####..', '..#..#..', '.##..##.'],
    ['..####..', '.######.', '.#.##.#.', '.######.', '..#..#..', '...##...', '.######.', '#.####..', '..####.#', '..####.#', '..#..#..', '.##..##.'],
    ['#.####.#', '#######.', '.#.##.#.', '.######.', '..####..', '...##...', '.######.', '..####..', '..####..', '..####..', '..#..#..', '.##..##.'],
    ['..####..', '.######.', '.######.', '.#.##.#.', '..####..', '...##...', '..####..', '.######.', '#.####.#', '..####..', '.#....#.', '##....##'],
  ];
  var TAG = ['.###.', '#...#', '#...#', '#####', '#####', '#####'];

  function initGame() {
    lives = LIVES; opened = 0; score = 0; roundIdx = 0; timeLeft = TIME_LIMIT;
    countIn = 0.8; freeze = 0; over = false; won = false; endT = 0; grabbed = -1; bolt = 0;
    milestoneDone = false; prevBest = game.best; lastPerfect = false; workT = 0;
    newRound(0, null);
  }

  // パターン: 0=片方細く片方太く 1=両方細い 2=両方太い。近い鍵(正解)の位置もランダム
  function newRound(i, fixed) {
    var m = MARGINS[Math.min(i, MARGINS.length - 1)];
    slotW = fixed ? 62 : Math.round(game.random(50, 76));
    var near = slotW + (fixed ? 3 : Math.round(game.random(-4, 4)));
    var pattern = fixed ? 0 : Math.floor(game.random(0, 3));
    var far;
    if (pattern === 0) far = near <= slotW ? slotW + (slotW - near) + m : slotW - (near - slotW) - m;
    else if (pattern === 1) { near = slotW - Math.abs(near - slotW); far = near - m; }
    else { near = slotW + Math.abs(near - slotW); far = near + m; }
    far = Math.max(22, Math.min(118, far));
    var nearSide = fixed ? fixed.side : (game.random(0, 1) < 0.5 ? 0 : 1);
    keys = [{}, {}];
    keys[nearSide] = { bw: near, right: true };
    keys[1 - nearSide] = { bw: far, right: false };
    for (var k = 0; k < 2; k++) { keys[k].lift = 0; keys[k].mode = 'hang'; keys[k].t = 0; keys[k].flash = 0; keys[k].swing = game.random(0, 6); }
    windowT = WINDOWS[Math.min(i, WINDOWS.length - 1)];
    phase = 'choose'; phaseT = windowT; choice = -1; tickDone = false; bolt = 0;
  }

  function keyTipPos(k) {
    var K = keys[k];
    if (K.mode === 'fly' || K.mode === 'in' || K.mode === 'jam' || K.mode === 'rattle') {
      var t = Math.min(1, K.t / 0.22);
      var tx = LOCK_X, ty = targetTipY(K);
      var sx = KEY_XS[k], sy = KEY_TIP_Y - K.lift;
      var wob = K.mode === 'rattle' ? Math.sin(game.time.elapsed * 40) * (K.bw < slotW ? (slotW - K.bw) * 0.5 : 0) : 0;
      return { x: sx + (tx - sx) * t + wob * t, y: sy + (ty - sy) * t };
    }
    var sway = Math.sin(game.time.elapsed * 1.7 + K.swing) * 6;
    return { x: KEY_XS[k] + sway, y: KEY_TIP_Y - K.lift };
  }

  function targetTipY(K) {
    if (K.bw > slotW + 4) return HOLE_Y + SLOT_LEN + 46; // 入らず手前で止まる
    return HOLE_Y + 10;
  }

  // 差し込む(本番・デモ共通の判定)
  function insert(k) {
    if (phase !== 'choose') return;
    choice = k; phase = 'insert'; phaseT = 0.55;
    var K = keys[k];
    K.t = 0;
    K.mode = K.right ? 'fly' : (K.bw > slotW ? 'jam' : 'rattle');
    game.audio.play('se_jump', 0.3);
  }

  function resolveChoice() {
    var K = keys[choice];
    var tip = keyTipPos(choice);
    if (K.right) {
      K.mode = 'in';
      var gain = 100 + Math.round(Math.max(0, phaseLeftAtChoice) * 80);
      if (state === S.PLAYING) { opened++; score += gain; }
      lastPerfect = Math.abs(K.bw - slotW) <= 2;
      game.feedback.good(LOCK_X, HOLE_Y - 90, { text: lastPerfect ? 'PERFECT' : 'GOOD', color: C.good, size: 64 });
      game.audio.tone('C6', 0.05, { wave: 'square', volume: 0.12 });
      if (state === S.PLAYING && !milestoneDone && opened === 4) {
        milestoneDone = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(opened + ' / ' + NEEDED, W / 2, H * 0.47, { color: C.amber, size: 64 });
      }
      phase = 'show'; phaseT = 0.45; bolt = 0;
    } else {
      K.flash = 1;
      freeze = 0.4;
      game.audio.play('se_break', 0.4);
      game.feedback.bad(tip.x, tip.y, { text: 'MISS', color: C.bad });
      if (state === S.PLAYING) lives--;
      phase = 'show'; phaseT = 0.55;
    }
  }
  var phaseLeftAtChoice = 0;

  function timeoutRound() {
    // 時間切れ: 正しかった鍵を点滅させて見せる
    var k = keys[0].right ? 0 : 1;
    keys[k].flash = 1; freeze = 0.4;
    var tip = keyTipPos(k);
    game.feedback.bad(tip.x, tip.y + 120, { text: 'MISS', color: C.bad });
    if (state === S.PLAYING) lives--;
    phase = 'show'; phaseT = 0.6; choice = -1;
  }

  function advance() {
    if (state !== S.PLAYING) return;
    if (lives <= 0) { over = true; won = false; return finish(); }
    roundIdx++;
    if (roundIdx >= ROUNDS) { over = true; won = true; return finish(); }
    newRound(roundIdx, null);
  }

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.5);
    if (won) {
      score += lives * 150;
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(140, 940), game.random(400, 1200), { color: i % 2 ? C.amber : C.cyan, count: 20, speed: 420 });
    }
  }

  function stepLock(dt) {
    for (var k = 0; k < 2; k++) {
      var K = keys[k];
      if (K.mode !== 'hang') K.t += dt;
      if (K.flash > 0) K.flash = Math.max(0, K.flash - dt * 2);
      if (K.mode === 'hang' && grabbed !== k && K.lift > 0) K.lift = Math.max(0, K.lift - dt * 900);
    }
    if (phase === 'choose') {
      phaseT -= dt;
      if (!tickDone && phaseT < 0.5) { tickDone = true; game.audio.tone(1400, 0.05, { wave: 'square', volume: 0.1 }); }
      if (phaseT <= 0) timeoutRound();
    } else if (phase === 'insert') {
      phaseT -= dt;
      if (phaseT <= 0.3) resolveChoice();
    } else if (phase === 'show') {
      phaseT -= dt;
      if (keys[choice] && keys[choice].mode === 'in') bolt = Math.min(1, bolt + dt * 5);
      if (phaseT <= 0) advance();
    }
  }

  // ── 描画 ──
  function drawShop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.black], [1, C.dark]]);
    // 壁に吊られた鍵の影(遠景・白ドット)
    for (var i = 0; i < 14; i++) {
      var x = 60 + i * 74, y = 300 + (i % 3) * 18 + Math.sin(t * 1.3 + i) * 3;
      game.draw.rect(x, y, 4, 40, C.dim);
      game.draw.circle(x + 2, y + 50, 10, C.dim);
    }
    for (var d = 0; d < 40; d++) game.draw.rect((d * 97 + Math.floor(t * 3) * 13) % W, (d * 223) % H, 3, 3, '#ffffff', 0.12);
  }

  function drawLock() {
    // 錠の座金(白)と鍵穴(黒)
    var px = LOCK_X, py = HOLE_Y + 40;
    game.draw.rect(px - 170, py - 230, 340, 470, C.gray);
    game.draw.rect(px - 158, py - 218, 316, 446, C.white);
    for (var s = 0; s < 4; s++) game.draw.circle(px + (s % 2 ? 130 : -130), py + (s < 2 ? -190 : 200), 12, C.gray);
    var r = slotW * 0.82;
    game.draw.circle(px, HOLE_Y, r, C.black);
    game.draw.rect(px - slotW / 2, HOLE_Y, slotW, SLOT_LEN, C.black);
    // かんぬき(開くとスライド)
    game.draw.rect(px + 158 + bolt * 120 - 120, py + 60, 120, 36, C.gray);
    // 制限時間: 鍵穴を囲む収縮リング
    if (phase === 'choose' && (state === S.PLAYING || state === S.ATTRACT)) {
      var frac = Math.max(0, phaseT / windowT);
      var low = phaseT < 0.5 && Math.floor(game.time.elapsed * 10) % 2 === 0;
      var n = 24, lit = Math.ceil(n * frac);
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        game.draw.circle(px + Math.cos(a) * 205, HOLE_Y + 70 + Math.sin(a) * 205, 9, i < lit ? (low ? C.black : C.dim) : '#ffffff22');
      }
    }
  }

  function drawKey(k) {
    var K = keys[k];
    var tip = keyTipPos(k);
    var bw = K.bw;
    var sc = K.flash > 0 ? 1 + K.flash * 0.2 : 1;
    var w = bw * sc;
    var inside = K.mode === 'in' || K.mode === 'fly';
    var turn = K.mode === 'in' ? Math.max(0.25, 1 - bolt * 0.75) : 1;  // 回すと刃が細く見える
    // 刃(白い座金の上でも形が見えるよう灰の縁取り)
    game.draw.rect(tip.x - (w * turn) / 2 - 5, tip.y - 5, w * turn + 10, BLADE_LEN * sc + 10, C.dim);
    game.draw.rect(tip.x - (w * turn) / 2, tip.y, w * turn, BLADE_LEN * sc, C.white);
    game.draw.rect(tip.x - 3, tip.y + 20, 6, BLADE_LEN * sc - 40, C.gray);
    if (!inside) for (var n = 0; n < 4; n++) game.draw.rect(tip.x - w / 2 - 10, tip.y + 30 + n * 46, 10, 22, C.white);
    // 持ち手(輪)
    var by = tip.y + BLADE_LEN * sc + 56;
    game.draw.circle(tip.x, by, 64 * sc, C.white);
    game.draw.circle(tip.x, by, 30 * sc, C.black);
    if (K.flash > 0) game.draw.rect(tip.x - w, tip.y - 10, w * 2, BLADE_LEN + 140, '#ffffff', K.flash * 0.4);
    // 吊りフック
    if (K.mode === 'hang') game.draw.line(KEY_XS[k], H - 120, tip.x, by + 64, C.dim, 4);
  }

  function drawProof() {
    // 正解の根拠: 鍵穴の上に2本の刃の幅を重ねて見せる
    if (phase !== 'show') return;
    var y = HOLE_Y + SLOT_LEN + 30;
    game.draw.rect(LOCK_X - slotW / 2, y, slotW, 18, C.black);
    for (var k = 0; k < 2; k++) {
      var K = keys[k];
      var yy = y + 30 + k * 28;
      game.draw.rect(LOCK_X - K.bw / 2, yy, K.bw, 14, K.right ? C.black : C.dim);
    }
  }

  function drawSmith() {
    var t = game.time.elapsed;
    var f;
    if (state === S.RESULT) f = won ? SMITH[2] : SMITH[3];
    else if (phase === 'show' && choice >= 0 && keys[choice].mode === 'in') f = SMITH[2];
    else if (freeze > 0 || (phase === 'show' && choice >= 0)) f = SMITH[3];
    else f = SMITH[Math.floor(t * 4) % 2];
    game.draw.sprite(f, { '#': C.white }, W / 2, H * 0.86 + Math.sin(t * 3) * 4, 14, { anchor: 'center' });
  }

  function bands() {
    // セロハン帯: 上=琥珀、下=空色
    game.draw.rect(0, 0, W, 250, C.amber, 0.28);
    game.draw.rect(0, Math.round(H * 0.75), W, H - Math.round(H * 0.75), C.cyan, 0.2);
  }

  function hud() {
    mono(String(score), 160, 80, 52);
    mono(opened + ' / ' + NEEDED, W - 170, 80, 46);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(TAG, { '#': i < lives ? C.white : C.dim }, W / 2 - 70 + i * 70, 80, 9, { anchor: 'center' });
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(80, 176, W - 160, 14, C.dim);
    game.draw.rect(80, 176, (W - 160) * frac, 14, C.white);
  }

  function drawWorld() {
    drawShop(); drawLock();
    for (var k = 0; k < 2; k++) drawKey(k);
    drawProof(); drawSmith();
  }

  // ── 入力: 鍵に指を置いて上へ弾く ──
  function keyUnder(x, y) {
    for (var k = 0; k < 2; k++) {
      var tip = keyTipPos(k);
      if (Math.abs(x - tip.x) < 130 && y > tip.y - 60 && y < tip.y + BLADE_LEN + 160) return k;
    }
    return -1;
  }
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.n = -1; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (countIn > 0 || freeze > 0 || phase !== 'choose' || over) { game.audio.play('se_tap', 0.06); return; }
    var k = keyUnder(x, y);
    if (k >= 0) { grabbed = k; grabY0 = y; game.audio.tone(440, 0.04, { wave: 'square', volume: 0.1 }); }
    else game.audio.play('se_tap', 0.1);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || grabbed < 0) return;
    var up = Math.max(0, grabY0 - y);
    keys[grabbed].lift = Math.min(160, up);
    if (up > 70 && phase === 'choose') {
      phaseLeftAtChoice = phaseT;
      var k = grabbed; grabbed = -1;
      insert(k);
    } else if (Math.random() < 0.1) game.audio.tone(300 + up * 3, 0.02, { wave: 'square', volume: 0.05 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || grabbed < 0) return;
    var up = grabY0 - y;
    var k = grabbed; grabbed = -1;
    if (up > 40 && phase === 'choose') { phaseLeftAtChoice = phaseT; insert(k); }
    else game.audio.play('se_tap', 0.12);
  });

  // ── ATTRACT: 近い鍵を弾き上げて開ける周 → 遠い鍵を選んで詰まらせる周 ──
  var demo = { t: 0, n: -1, gx: W / 2, gy: H * 0.9, press: false, pick: 0 };
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      demo.n++;
      newRound(0, { side: demo.n % 2 === 0 ? 1 : 0 });
      phaseT = 9; windowT = 9;
      demo.pick = demo.n % 2 === 0 ? (keys[0].right ? 0 : 1) : (keys[0].right ? 1 : 0);
    }
    if (freeze > 0) freeze -= dt;
    else stepLock(dt);
    var tip = keyTipPos(demo.pick);
    var hx = tip.x, hy = tip.y + BLADE_LEN + 40;
    demo.press = false;
    if (cyc < 0.9) {
      demo.gx += (hx - demo.gx) * Math.min(1, dt * 5); demo.gy += (hy - demo.gy) * Math.min(1, dt * 5);
    } else if (cyc < 1.25 && phase === 'choose') {
      var t = (cyc - 0.9) / 0.35;
      keys[demo.pick].lift = t * 80;
      demo.gx = hx; demo.gy = KEY_TIP_Y + BLADE_LEN + 40 - t * 80; demo.press = true;
      if (t > 0.9) { phaseLeftAtChoice = 1; insert(demo.pick); }
    } else {
      demo.gy += (H * 0.93 - demo.gy) * Math.min(1, dt * 2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!keys) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      bands();
      mono(GAME_TITLE, W / 2, H * 0.05, 84, C.white);
      mono('HI-SCORE ' + game.best, W / 2, H * 0.1, 36, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) mono('► 100円 投入 ◄', W / 2, H * 0.97, 42, C.white);
      else mono('INSERT COIN', W / 2, H * 0.97, 38, C.gray);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      bands();
      mono(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.05, 90, won ? C.good : C.bad);
      mono('SCORE ' + score, W / 2, H * 0.1, 52);
      if (score > prevBest && prevBest > 0) mono('NEW RECORD', W / 2, H * 0.68, 56, C.amber);
      else mono('BEST ' + Math.max(prevBest, score), W / 2, H * 0.68, 42);
      if (!won) mono('あと' + (NEEDED - opened) + '本!', W / 2, H * 0.72, 50, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) mono('TAP TO CONTINUE', W / 2, H * 0.97, 40);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { opened: opened, lives: lives, rounds: Math.min(ROUNDS, roundIdx + 1) };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (freeze > 0) {
      freeze -= dt;
    } else if (!over) {
      if (phase === 'choose') timeLeft -= dt;
      stepLock(dt);
      if (timeLeft <= 0 && !over) {
        timeLeft = 0; lives = 0; over = true; won = false;
        game.feedback.bad(LOCK_X, HOLE_Y, { text: 'TIME UP', color: C.bad });
        finish();
      }
    }

    drawWorld();
    hud();
    bands();
    if (countIn > 0) mono(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, C.amber);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.25], ['R', 0.75], ['E5', 0.25], ['R', 0.75], ['C5', 0.25], ['R', 0.25], ['D5', 0.25], ['R', 1.25],
    ], { tempo: 120, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 1], ['R', 1], ['E2', 1], ['R', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
