// I-GBA-0063v2-exchange-dial-recall.js
// 交換台ダイヤル写し — 呼び出し盤のダイヤルに一瞬ずつ灯った番号の順を覚え、回り続ける指針を同じ順に止めて回線をつなぐ
// 操作: 番号の灯が順に点く間は見て覚えるだけ(指針は止まっている)。灯が消えると指針が回り出すので、覚えた順の番号を指針が指している間に画面のどこかをタップして止める。違う番号で止めると混線して回線を1本失い、同じ番号がもう一度灯る。3回線目は1桁止めるたびに指針の回る向きが逆になる
// 終わり: 3回線(3桁→4桁→5桁)をつなぎ切ればCLEAR。混線2回か、指針の回る保留時間(15秒)を使い切るとGAME OVER
// @mechanic: memory_sequence
// @theme: telephone_exchange_dial_recall
// 世界観: 古い電話交換局の夜勤で、ヘッドセットの交換手が呼び出し盤のダイヤルに一瞬ずつ灯った番号の順を覚え、回り続ける指針を同じ順に止めて3本の回線をつないでいく
// 残るもの: 正誤(CLEAR/GAME OVER・TIME UP) + つないだ回線数・正しく止めた桁数・ぴったり止めた回数・スコア
// スタイル: 90s PRE-RENDER

(function (game) {
  var STYLE = { bg: ['#140f0b', '#2a2018', '#3c3024'], main: ['#c8a46a', '#7a6044', '#efe0c0'], accent: ['#ffb43a', '#d8463a', '#7ad0a0'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var SOOT = STYLE.bg[0], WALNUT = STYLE.bg[1], PANEL = STYLE.bg[2];
  var BRASS = STYLE.main[0], BRONZE = STYLE.main[1], IVORY = STYLE.main[2];
  var AMBER = STYLE.accent[0], RED = STYLE.accent[1], JADE = STYLE.accent[2];
  var INK = '#0a0705', WHITE = '#fff8ea', STEEL = '#8c9198', DIM = '#4a3c2c';

  var TITLE = 'EXCHANGE DIAL';
  var TIME_LIMIT = 15;
  var LINES = 2;
  var CX = W / 2, CY = H * 0.47, R = 300;
  var TAU = Math.PI * 2, STEP = TAU / 10;
  var ROUNDS = [
    { len: 3, lit: 0.5, rev: 1.8, flip: false },
    { len: 4, lit: 0.44, rev: 1.6, flip: false },
    { len: 5, lit: 0.38, rev: 1.5, flip: true },
  ];
  var GAP = 0.12;

  // 交換手(ヘッドセット・3フレーム: 待機 / 見入る / 栓を挿す)
  var OPERATOR = [
    ['....hhhh....', '...hhhhhh...', '..mhffffhm..', '..mhfkfkhm..', '...hffffh...', '....fppf....', '...bbbbbb...', '..bbwwwwbb..', '.bbbwwwwbbb.', '.aabbbbbbaa.', '.aa.bbbb.aa.', '....bbbb....'],
    ['....hhhh....', '...hhhhhh...', '..mhffffhm..', '..mhkfkfhm..', '...hffffh...', '....fppf....', '...bbbbbb...', '..bbwwwwbb..', '.bbbwwwwbbb.', '.aabbbbbbaa.', '.aa.bbbb.aa.', '....bbbb....'],
    ['....hhhh..aa', '...hhhhhh.aa', '..mhffffhma.', '..mhfkfkhma.', '...hffffhb..', '....fppfbb..', '...bbbbbb...', '..bbwwwwb...', '.bbbwwwwb...', '.aabbbbbb...', '.aa.bbbb....', '....bbbb....'],
  ];
  var OP_PAL = { h: '#2a1c14', m: STEEL, f: '#e2b48c', k: INK, p: '#b0584a', b: '#3a4a5a', w: IVORY, a: '#e2b48c' };
  var PLUG = ['.ss.', '.ss.', 'bbbb', 'bbbb', '.bb.', '.bb.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ri, seq, phase, phT, showT, lastShown, inputI, entered, ang, dir, waitT, warned;
  var lines, score, digitsOk, perfects, timeLeft, linked;
  var ready, halt, over, won, timeUp, endT, resT, sent, prevBest, opFrame, opT, glowD, glowT, glowCol;

  // 粒状ノイズ(プリレンダの質感)は固定配置で毎フレーム同じ所に描く
  var GRAIN = [];
  for (var gi = 0; gi < 140; gi++) GRAIN.push({ x: (gi * 397) % W, y: (gi * 911) % H, w: 2 + (gi % 3), a: 0.05 + (gi % 4) * 0.02 });

  function cfg() { return ROUNDS[Math.min(ri, ROUNDS.length - 1)]; }
  function norm(a) { return ((a % TAU) + TAU) % TAU; }
  function digitAng(d) { return -Math.PI / 2 + d * STEP; }
  function digitPos(d, rr) { var a = digitAng(d); return { x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr }; }

  // 指針がいま指している番号と、その中心からのずれ(度)
  function pointing() {
    var rel = norm(ang + Math.PI / 2);
    var k0 = Math.round(rel / STEP);
    var off = (rel - k0 * STEP) * 180 / Math.PI;
    return { d: k0 % 10, off: Math.abs(off) };
  }

  function makeSeq(len, salt) {
    var out = [], prev = -1;
    for (var i = 0; i < len; i++) {
      var d = Math.floor(game.random(0, 10)) % 10;
      if (d === prev) d = (d + 3 + salt) % 10;
      out.push(d); prev = d;
    }
    return out;
  }

  function beginShow() {
    phase = 'show'; showT = 0; lastShown = -1; inputI = 0; entered = []; waitT = 0; warned = false;
    ang = digitAng(0); dir = 1;
  }

  function setupRound(i, fixedSeq) {
    ri = i;
    seq = fixedSeq ? fixedSeq.slice() : makeSeq(ROUNDS[i].len, i);
    beginShow();
  }

  function initGame() {
    setupRound(0);
    lines = LINES; score = 0; digitsOk = 0; perfects = 0; timeLeft = TIME_LIMIT; linked = 0;
    ready = 0.8; halt = null; over = false; won = false; timeUp = false; endT = 0; resT = 0; sent = false;
    prevBest = game.best || 0; opFrame = 0; opT = 0; glowD = -1; glowT = 0; glowCol = AMBER; phT = 0;
  }

  function pitchOf(d) { return [392, 440, 494, 523, 587, 659, 698, 784, 880, 988][d]; }

  // ── 表示フェーズ・入力フェーズ(プレイ・デモ共通) ──
  function stepShow(dt, vol) {
    var c = cfg();
    showT += dt;
    var per = c.lit + GAP;
    var idx = Math.floor(showT / per);
    if (idx >= seq.length) {
      phase = 'input'; waitT = 0; warned = false;
      ang = digitAng((seq[0] + 5) % 10);
      game.audio.tone(330, 0.08, { wave: 'square', volume: 0.05 * vol, slide: 120 });
      return;
    }
    if (idx !== lastShown && showT - idx * per < c.lit) {
      lastShown = idx;
      game.audio.tone(pitchOf(seq[idx]), c.lit * 0.8, { wave: 'triangle', volume: 0.08 * vol });
      opFrame = 1; opT = 0.3;
    }
  }

  function litDigit() {
    if (phase !== 'show') return -1;
    var c = cfg(), per = c.lit + GAP;
    var idx = Math.floor(showT / per);
    if (idx < seq.length && showT - idx * per < c.lit) return seq[idx];
    return -1;
  }

  function stepNeedle(dt, vol) {
    var c = cfg();
    ang += dir * (TAU / c.rev) * dt;
    waitT += dt;
    var limit = c.rev * 2;
    if (!warned && waitT > limit - 0.6) {
      warned = true;
      game.audio.tone(180, 0.5, { wave: 'sawtooth', volume: 0.05 * vol });
    }
    if (waitT >= limit) return 'timeout';
    return null;
  }

  // 指針を止める(タップ1回)。戻り値 'ok' | 'perfect' | 'wrong'
  function pressDial(vol) {
    var p = pointing();
    var want = seq[inputI];
    var pos = digitPos(p.d, R - 70);
    if (p.d !== want) return { res: 'wrong', d: p.d, x: pos.x, y: pos.y };
    var perfect = p.off <= 6;
    entered.push(p.d); inputI++; waitT = 0; warned = false;
    glowD = p.d; glowT = 0.35; glowCol = perfect ? WHITE : JADE;
    opFrame = 2; opT = 0.25;
    game.audio.tone(pitchOf(p.d), 0.12, { wave: 'square', volume: 0.07 * vol });
    game.feedback.good(pos.x, pos.y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? AMBER : JADE, count: perfect ? 16 : 9, volume: 0.55 * vol });
    if (cfg().flip) dir = -dir;
    if (inputI >= seq.length) { phase = 'clear'; phT = 0.8; }
    return { res: perfect ? 'perfect' : 'ok', d: p.d, x: pos.x, y: pos.y };
  }

  function lineDone() {
    linked++;
    var bonus = 300 * (ri + 1);
    score += bonus;
    game.fx.popup('+' + bonus, CX, CY, { color: AMBER, size: 70 });
    game.audio.play('se_milestone', 0.5);
    for (var i = 0; i < 4; i++) game.fx.burst(CX + Math.cos(i * 1.6) * 200, CY + Math.sin(i * 1.6) * 200, { color: i % 2 ? AMBER : JADE, count: 10, speed: 300 });
  }

  function nextRound() {
    if (ri >= ROUNDS.length - 1) { finish(true); return; }
    setupRound(ri + 1);
    game.audio.tone(523, 0.12, { wave: 'triangle', volume: 0.06, slide: 260 });
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 40) + lines * 200;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.12 + i * 0.15), H * (0.3 + (i % 2) * 0.08), { color: i % 2 ? AMBER : WHITE, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { lines: linked, digits: digitsOk, perfect: perfects, crossed: LINES - lines };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0 || phase !== 'input') { game.audio.play('se_tap', 0.06); return; }
    var r = pressDial(1);
    if (r.res === 'wrong') {
      halt = { t: 0.45, max: 0.45, d: r.d, x: r.x, y: r.y, cause: 'wrong' };
      game.fx.flash(WHITE, 0.12);
      game.audio.play('se_break', 0.3);
      return;
    }
    digitsOk++;
    if (r.res === 'perfect') { perfects++; score += 150 * (ri + 1); } else score += 100 * (ri + 1);
    if (phase === 'clear') lineDone();
  });

  // ── 描画 ──
  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawRoom() {
    game.draw.gradient(0, H, [[0, SOOT], [0.14, WALNUT], [0.6, PANEL], [1, SOOT]]);
    // 遠景: 呼び出し盤の列(ジャックとコードが並ぶ)
    for (var col = 0; col < 3; col++) {
      var px = 60 + col * 330;
      game.draw.rect(px, H * 0.13, 300, H * 0.1, WALNUT);
      game.draw.rect(px + 6, H * 0.13 + 6, 288, H * 0.1 - 12, '#221a12');
      for (var j = 0; j < 12; j++) {
        var jx = px + 30 + (j % 6) * 48, jy = H * 0.15 + Math.floor(j / 6) * 70;
        var on = (Math.floor(game.time.elapsed * 1.3 + j * 0.7 + col) % 5) === 0;
        game.draw.circle(jx, jy, 13, on ? AMBER : DIM, on ? 0.9 : 1);
        game.draw.circle(jx, jy + 30, 8, INK);
      }
      for (var k = 0; k < 3; k++) {
        var sx = px + 40 + k * 100, sag = Math.sin(game.time.elapsed * 0.8 + k + col) * 6;
        game.draw.line(sx, H * 0.23, sx + 40, H * 0.255 + sag, '#5a2a22', 6);
        game.draw.line(sx + 40, H * 0.255 + sag, sx + 90, H * 0.23, '#5a2a22', 6);
      }
    }
    // 机の天板(手前)
    game.draw.gradient(H * 0.74, H, [[0, '#4a3624'], [0.08, '#5e4630'], [1, '#2a1e14']]);
    game.draw.rect(0, H * 0.74, W, 6, BRASS, 0.5);
    for (var g = 0; g < GRAIN.length; g++) {
      var gr = GRAIN[g];
      game.draw.rect(gr.x, (gr.y + Math.floor(game.time.elapsed * 7) * 13) % H, gr.w, 1, WHITE, gr.a);
    }
  }

  function drawDial(hl) {
    // 金属の輪(擬似奥行き: 下に落ちる影 + 上に寄ったハイライト)
    game.draw.circle(CX + 10, CY + 18, R + 80, INK, 0.5);
    game.draw.circle(CX, CY, R + 80, BRONZE);
    game.draw.circle(CX, CY - 6, R + 70, BRASS);
    game.draw.circle(CX, CY, R + 56, BRONZE);
    game.draw.circle(CX, CY, R + 40, '#2a2018');
    game.draw.circle(CX - 90, CY - R - 20, 26, WHITE, 0.25);
    var lit = litDigit();
    for (var d = 0; d < 10; d++) {
      var p = digitPos(d, R - 70);
      var isLit = d === lit;
      var isGlow = d === glowD && glowT > 0;
      var isHalt = hl && halt && halt.d === d;
      var rad = isHalt ? 62 + hl * 30 : 52;
      if (isLit) { game.draw.circle(p.x, p.y, 92, AMBER, 0.25); game.draw.circle(p.x, p.y, 74, AMBER, 0.35); }
      game.draw.circle(p.x + 4, p.y + 6, rad, INK, 0.6);
      game.draw.circle(p.x, p.y, rad, isHalt ? WHITE : isLit ? AMBER : isGlow ? glowCol : '#e8d8b4');
      game.draw.circle(p.x - 14, p.y - 16, 12, WHITE, 0.4);
      game.draw.text(String(d), p.x, p.y + 20, { size: 56, color: isHalt ? RED : INK, bold: true, align: 'center' });
    }
    // 指針(表示中は止まって暗い)
    var running = phase === 'input';
    var danger = running && warned;
    var tipX = CX + Math.cos(ang) * (R + 20), tipY = CY + Math.sin(ang) * (R + 20);
    var ncol = danger && Math.floor(game.time.elapsed * 12) % 2 === 0 ? RED : running ? AMBER : STEEL;
    game.draw.line(CX + 8, CY + 10, tipX + 8, tipY + 10, INK, 18);
    game.draw.line(CX, CY, tipX, tipY, ncol, 16);
    game.draw.line(CX, CY, tipX, tipY, WHITE, 4);
    game.draw.circle(tipX, tipY, 20, ncol);
    game.draw.circle(CX, CY, 70, BRONZE);
    game.draw.circle(CX, CY - 4, 56, BRASS);
    game.draw.circle(CX - 16, CY - 22, 14, WHITE, 0.45);
    // 向きの矢印(3回線目は逆転を予告)
    if (running) {
      var ax = CX + Math.cos(ang + dir * 0.35) * (R + 20), ay = CY + Math.sin(ang + dir * 0.35) * (R + 20);
      game.draw.circle(ax, ay, 9, ncol, 0.6);
    }
  }

  function drawTicket() {
    // 入れた桁の帯(進捗)
    var n = seq.length, sw = 110, gap = 18, x0 = CX - (n * sw + (n - 1) * gap) / 2, y0 = H * 0.79;
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (sw + gap);
      var cur = phase === 'input' && i === inputI;
      game.draw.rect(x + 5, y0 + 7, sw, 130, INK, 0.5);
      game.draw.rect(x, y0, sw, 130, cur ? '#fff0c8' : IVORY);
      game.draw.rect(x, y0, sw, 14, cur && Math.floor(game.time.elapsed * 6) % 2 === 0 ? AMBER : BRASS);
      if (i < entered.length) game.draw.text(String(entered[i]), x + sw / 2, y0 + 104, { size: 76, color: INK, bold: true, align: 'center' });
    }
  }

  function drawOperator() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 6;
    game.draw.circle(W * 0.14, H * 0.955, 90, INK, 0.3);
    game.draw.sprite(OPERATOR[opFrame], OP_PAL, W * 0.14, H * 0.885 + bob, 15, { anchor: 'center' });
  }

  function drawHud() {
    for (var i = 0; i < ROUNDS.length; i++) {
      var on = i < linked, cur = i === ri && !over;
      game.draw.circle(80 + i * 76, 92, 30, on ? JADE : cur ? AMBER : DIM);
      game.draw.circle(72 + i * 76, 82, 9, WHITE, 0.45);
    }
    big(String(score), W / 2, 112, 70, WHITE);
    for (var p = 0; p < LINES; p++) game.draw.sprite(PLUG, { s: STEEL, b: p < lines ? RED : DIM }, W - 80 - p * 70, 92, 10, { anchor: 'center' });
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 180, W - 120, 22, INK, 0.6);
    game.draw.rect(60, 180, (W - 120) * fr, 22, timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? RED : BRASS);
  }

  // ── ATTRACT デモ: 3桁が順に灯る → 指針を同じ順に止める(実ロジック) ──
  var DEMO_SEQ = [2, 7, 4];
  var demo = { t: 0, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.2;
    if (cyc < dt || demo.t <= dt) { ri = 0; setupRound(0, DEMO_SEQ); entered = []; glowT = 0; }
    if (phase === 'show') stepShow(dt, 0.3);
    else if (phase === 'input') {
      if (stepNeedle(dt, 0.3) === 'timeout') beginShow();
      var p = pointing();
      if (p.d === seq[inputI] && p.off < 8 && demo.press <= 0) { demo.press = 0.2; pressDial(0.3); }
    } else if (phase === 'clear') {
      phT -= dt;
      if (phT <= 0) phase = 'idle';
    }
    if (demo.press > 0) demo.press -= dt;
    if (glowT > 0) glowT -= dt;
    if (opT > 0) { opT -= dt; if (opT <= 0) opFrame = 0; }
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawRoom();
      drawDial(0);
      drawTicket();
      drawOperator();
      game.draw.hand(W * 0.62, H * 0.86 + Math.sin(game.time.elapsed * 3) * 8, { press: demo.press > 0, scale: 15 });
      big(TITLE, W / 2, H * 0.065, 92, AMBER);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 42, IVORY);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.975, 46, AMBER);
      else big('INSERT COIN', W / 2, H * 0.975, 40, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.2) sendEnd();
      drawRoom();
      drawDial(0);
      drawOperator();
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, INK, 0.8);
      big(won ? 'CLEAR' : timeUp ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.17, 100, won ? AMBER : RED);
      big('SCORE ' + score, W / 2, H * 0.22, 56, WHITE);
      big(linked + ' / ' + ROUNDS.length + '   ' + digitsOk + '   ★' + perfects, W / 2, H * 0.265, 44, IVORY);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 60, AMBER);
      else big('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.31, 42, BRASS);
      if (!won) big('あと' + Math.max(1, seq.length - inputI) + '桁!', W / 2, H * 0.355, 58, RED);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.975, 40, WHITE);
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
        var hx = halt.x, hy = halt.y;
        halt = null;
        lines--;
        game.feedback.bad(hx, hy, { text: 'MISS' });
        if (lines <= 0) finish(false);
        else beginShow();
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (phase === 'show') {
      stepShow(dt, 1);
    } else if (phase === 'input') {
      timeLeft -= dt;
      if (timeLeft <= 4 && Math.floor((timeLeft + dt) * 2) !== Math.floor(timeLeft * 2)) game.audio.tone(990, 0.05, { wave: 'square', volume: 0.05 });
      if (timeLeft <= 0) {
        timeLeft = 0; timeUp = true;
        var tp = digitPos(seq[inputI], R - 70);
        game.fx.flash(WHITE, 0.15);
        game.feedback.bad(tp.x, tp.y, { text: 'TIME UP' });
        finish(false);
      } else if (stepNeedle(dt, 1) === 'timeout') {
        var p = pointing(), pp = digitPos(p.d, R - 70);
        halt = { t: 0.45, max: 0.45, d: p.d, x: pp.x, y: pp.y, cause: 'timeout' };
        game.fx.flash(WHITE, 0.12);
      }
    } else if (phase === 'clear') {
      phT -= dt;
      if (phT <= 0) nextRound();
    }
    if (glowT > 0) glowT -= dt;
    if (opT > 0) { opT -= dt; if (opT <= 0) opFrame = 0; }

    drawRoom();
    drawDial(hl);
    drawTicket();
    drawOperator();
    drawHud();
    if (ri === 0 && inputI === 0 && phase === 'input' && !over && !halt) game.draw.hand(W * 0.62, H * 0.86, { press: Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 12, alpha: 0.5 });
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47 + 30, 120, AMBER);
  });

  game.onStart(function () {
    game.audio.melody([
      ['E4', 0.5], ['G4', 0.5], ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1.5], ['R', 0.5],
      ['C5', 0.5], ['B4', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['E4', 2],
    ], { tempo: 96, wave: 'triangle', volume: 0.05, loop: true, bass: [['E2', 2], ['C3', 2], ['D3', 2], ['B2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
