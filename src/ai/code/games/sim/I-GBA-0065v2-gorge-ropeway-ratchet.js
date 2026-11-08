// I-GBA-0065v2-gorge-ropeway-ratchet.js
// 渓谷ロープウェイ巻き上げ — 手回しの巻き上げ機をひと回しするたび歯止めが上がる。歯止めがカチリと戻った合図のたびに1回ずつ回して籠を上の駅まで昇らせる
// 操作: タップで巻き上げ機をひと回し(籠が一段昇る)。回すと歯止めが跳ね上がり、ゆっくり下りて歯に噛む(カチリと鳴り小さな灯が点く)まで次は回せない。噛む前に回すと歯車が滑って籠が一段ずり落ち、歯止めの戻りも遅れる。灯が点いた直後に回すほど高得点。谷風(吹き流しがぴんと張って笛が鳴る)の間は歯止めが一度跳ね返ってから噛むので、灯を見て待つ
// 終わり: 3つの籠(4段・5段・7段)を15秒以内に上の駅まで上げればCLEAR。滑らせる(早回し)3回か時間切れでGAME OVER
// @mechanic: cooldown_tap
// @theme: gorge_ropeway_hand_winch
// 世界観: 深い渓谷のロープウェイ小屋で、機械番が手回しの巻き上げ機を歯止めが戻るたびに一段ずつ回し、対岸の崖の上の駅まで村人を乗せた籠を3回上げる
// 残るもの: 正誤(CLEAR/GAME OVER・TIME UP) + 上げた籠の数・回した段数・灯の直後に回せた回数・滑らせた回数・スコア
// スタイル: 8bit HANDHELD

(function (game) {
  var STYLE = { bg: ['#9bbc0f', '#8bac0f'], main: ['#306230', '#0f380f'], accent: ['#c4dc5c'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var L3 = STYLE.bg[0], L2 = STYLE.bg[1], L1 = STYLE.main[0], L0 = STYLE.main[1], GLOW = STYLE.accent[0];

  var TITLE = 'ROPEWAY WINCH';
  var TIME_LIMIT = 15;
  var JAMS = 3;
  var ROUNDS = [
    { need: 4, cool: 0.5, gusts: [] },
    { need: 5, cool: 0.46, gusts: [1.4] },
    { need: 7, cool: 0.42, gusts: [0.9, 3.1] },
  ];
  var GUST_LEN = 1.5, WARN = 0.7;
  var CAB0 = { x: W * 0.14, y: H * 0.6 }, CAB1 = { x: W * 0.86, y: H * 0.22 };
  var WX = W * 0.56, WY = H * 0.835, WR = 150;           // 歯車
  var PVX = WX + 250, PVY = WY - 150;                     // 歯止めの支点

  var KEEPER = [
    ['...ddddd...', '..ddddddd..', '...lllll...', '...ldlld...', '...lllll...', '..ddddddd..', '.dddddddddl', '.dd.ddd.ll.', '....ddd....', '...dd.dd...', '..dd...dd..'],
    ['...ddddd...', '..ddddddd..', '...lllll...', '...ldlld...', '...lllll...', '..ddddddd..', '.ddddddddd.', '.dd.dddddll', '....ddd..ll', '...dd.dd...', '..dd...dd..'],
    ['...ddddd...', '..ddddddd..', '...lllll...', '...dlldl...', '...lllll...', 'l.ddddddd.l', '.ddddddddd.', '...ddddd...', '....ddd....', '...dd.dd...', '..dd...dd..'],
  ];
  var RIDER = [['.ddd.', 'dllld', '.lll.', 'ddddd', 'd.d.d'], ['.ddd.', 'dldld', '.lll.', 'ddddd', '.d.d.']];
  var TREE = [['..d..', '.ddd.', 'ddddd', '.ddd.', 'ddddd', '..l..', '..l..'], ['...d.', '..ddd', '.dddd', '..ddd', '.dddd', '..l..', '..l..']];
  var WRENCH = ['.d.d', '.ddd', '..d.', '..d.', '..d.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ri, notch, shown, cool, coolMax, seated, seatT, bounced, rt, warned, gust, phase, phT;
  var jams, score, cabins, cranks, perfects, timeLeft, spin, kFrame, kT, trail, trailT;
  var ready, halt, over, won, timeUp, endT, resT, sent, prevBest;

  function cfg() { return ROUNDS[Math.min(ri, ROUNDS.length - 1)]; }

  function setupRound(i) {
    ri = i; notch = 0; shown = 0; cool = 0; coolMax = 0.5; seated = true; seatT = 1; bounced = false;
    rt = 0; warned = {}; gust = false; phase = 'crank'; phT = 0; trail = []; trailT = 0;
  }

  function initGame() {
    setupRound(0);
    jams = JAMS; score = 0; cabins = 0; cranks = 0; perfects = 0; timeLeft = TIME_LIMIT; spin = 0; kFrame = 2; kT = 0;
    ready = 0.8; halt = null; over = false; won = false; timeUp = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
  }

  function gustAt(t) {
    var g = cfg().gusts;
    for (var i = 0; i < g.length; i++) if (t >= g[i] && t < g[i] + GUST_LEN) return true;
    return false;
  }
  function gustSoon(t) {
    var g = cfg().gusts;
    for (var i = 0; i < g.length; i++) if (t >= g[i] - WARN && t < g[i]) return true;
    return false;
  }

  // ── 歯止めの戻り(プレイ・デモ共通) ──
  function stepPawl(dt, vol) {
    rt += dt;
    gust = gustAt(rt);
    var g = cfg().gusts;
    for (var i = 0; i < g.length; i++) {
      if (!warned[i] && rt >= g[i] - WARN) { warned[i] = true; game.audio.tone(1300, 0.6, { wave: 'triangle', volume: 0.04 * vol, slide: -500 }); }
    }
    if (seated) { seatT += dt; return; }
    cool -= dt;
    if (cool <= 0) {
      if (gust && !bounced) {
        bounced = true; cool = 0.32; coolMax = 0.8;
        game.audio.tone(520, 0.02, { wave: 'triangle', volume: 0.04 * vol });
        return;
      }
      cool = 0; seated = true; seatT = 0;
      game.audio.tone(1500, 0.03, { wave: 'square', volume: 0.09 * vol });
      game.audio.tone(760, 0.04, { wave: 'square', volume: 0.05 * vol });
    }
  }

  // 巻き上げ機をひと回し。'perfect' | 'good' | 'jam'
  function crank(vol) {
    if (!seated) return 'jam';
    var perfect = seatT <= 0.15;
    notch++; spin += Math.PI * 2 / 12;
    seated = false; bounced = false;
    coolMax = cfg().cool + game.random(-0.1, 0.12);
    cool = coolMax;
    kFrame = 1; kT = 0.18;
    var c = cabPos(notch / cfg().need);
    game.audio.play('se_tap', 0.25 * vol);
    game.feedback.good(PVX - 40, PVY - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GLOW : L3, count: perfect ? 12 : 6, volume: 0.45 * vol });
    game.fx.burst(c.x, c.y, { color: L3, count: 4, speed: 160 });
    if (notch >= cfg().need) { phase = 'arrive'; phT = 0.75; }
    return perfect ? 'perfect' : 'good';
  }

  function jam(vol) {
    if (notch > 0) notch--;
    spin -= Math.PI * 2 / 12;
    seated = false; bounced = true;
    coolMax = cfg().cool + 0.45; cool = coolMax;
    kFrame = 2; kT = 0.4;
    game.audio.play('se_break', 0.3 * vol);
  }

  function arrived() {
    cabins++;
    var bonus = 300 * (ri + 1);
    score += bonus;
    game.fx.popup('+' + bonus, CAB1.x - 120, CAB1.y - 60, { color: L0, size: 64 });
    game.audio.play('se_milestone', 0.5);
    game.fx.burst(CAB1.x, CAB1.y, { color: GLOW, count: 18, speed: 380 });
  }

  function nextRound() {
    if (ri >= ROUNDS.length - 1) { finish(true); return; }
    setupRound(ri + 1);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 50) + jams * 100;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 5; i++) game.fx.burst(W * (0.15 + i * 0.18), H * (0.3 + (i % 2) * 0.08), { color: i % 2 ? GLOW : L3, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { cabins: cabins, notches: cranks, perfect: perfects, slips: JAMS - jams };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0 || phase !== 'crank') { game.audio.tone(300, 0.03, { wave: 'square', volume: 0.03 }); return; }
    var r = crank(1);
    if (r === 'jam') {
      halt = { t: 0.35, max: 0.35 };
      game.fx.flash(L3, 0.12);
      return;
    }
    cranks++;
    if (r === 'perfect') { perfects++; score += 160; } else score += 100;
    if (phase === 'arrive') arrived();
  });

  // ── 描画 ──
  function cabPos(p) { return { x: CAB0.x + (CAB1.x - CAB0.x) * p, y: CAB0.y + (CAB1.y - CAB0.y) * p }; }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: L0, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawGorge() {
    game.draw.gradient(0, H, [[0, L3], [0.5, L2], [1, L2]]);
    // 遠い山並み(段々の矩形)
    for (var m = 0; m < 9; m++) {
      var mx = m * 130 - 20, mh = 60 + ((m * 53) % 5) * 30;
      for (var s = 0; s < 4; s++) game.draw.rect(mx + s * 14, H * 0.32 - mh + s * 18, 150 - s * 28, mh - s * 18 + 40, L2);
    }
    // 雲(ゆっくり流れる)
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 400 + game.time.elapsed * (gust ? 160 : 20)) % (W + 300)) - 150;
      game.draw.rect(cx, H * (0.14 + c * 0.04), 140, 24, L3);
      game.draw.rect(cx + 30, H * (0.14 + c * 0.04) - 16, 80, 20, L3);
    }
    // 渓谷: 左の崖(下)と右の崖(上)
    game.draw.rect(0, H * 0.6, W * 0.24, H * 0.13, L1);
    game.draw.rect(W * 0.76, H * 0.22, W * 0.24, H * 0.51, L1);
    for (var r = 0; r < 6; r++) game.draw.rect(W * 0.76 + 20, H * 0.26 + r * 90, 60, 12, L0, 0.5);
    // 谷底の川
    game.draw.rect(W * 0.24, H * 0.7, W * 0.52, H * 0.03, L0);
    for (var w = 0; w < 5; w++) game.draw.rect(W * 0.26 + ((w * 110 + game.time.elapsed * 60) % (W * 0.48)), H * 0.71, 40, 6, L2);
    // 崖の上の木(谷風でしなる)
    var bent = gust || (gustSoon(rt) && Math.floor(game.time.elapsed * 8) % 2 === 0) ? 1 : 0;
    game.draw.sprite(TREE[bent], { d: L0, l: L1 }, W * 0.82, H * 0.22 - 50, 12, { anchor: 'center' });
    game.draw.sprite(TREE[bent], { d: L0, l: L1 }, W * 0.94, H * 0.22 - 40, 10, { anchor: 'center' });
    // 駅舎
    game.draw.rect(CAB0.x - 120, CAB0.y - 40, 150, 120, L0);
    game.draw.rect(CAB0.x - 140, CAB0.y - 60, 190, 26, L1);
    game.draw.rect(CAB1.x - 30, CAB1.y - 60, 160, 90, L0);
    game.draw.rect(CAB1.x - 50, CAB1.y - 80, 200, 26, L1);
    // 吹き流し(谷風の予告)
    var wsx = W * 0.3, wsy = H * 0.55;
    game.draw.line(wsx, wsy, wsx, wsy - 120, L0, 6);
    var stretch = gust ? 1 : gustSoon(rt) ? 0.7 : 0.25;
    for (var k = 0; k < 4; k++) {
      var droop = (1 - stretch) * k * 14 + Math.sin(game.time.elapsed * (gust ? 30 : 4) + k) * 4;
      game.draw.rect(wsx + k * 30 * (0.4 + stretch), wsy - 120 + droop, 28, 22, k % 2 ? L3 : L0);
    }
  }

  function drawCable(hl) {
    game.draw.line(CAB0.x, CAB0.y - 50, CAB1.x, CAB1.y - 50, L0, 6);
    var p = shown / cfg().need;
    var c = cabPos(p);
    var sway = (gust ? Math.sin(game.time.elapsed * 14) * 18 : Math.sin(game.time.elapsed * 2) * 4);
    // 残像
    for (var i = 0; i < trail.length; i++) {
      var tq = trail[i];
      game.draw.rect(tq.x - 72 + tq.s, tq.y + 20, 144, 116, L1, 0.15 + i * 0.07);
    }
    game.draw.circle(c.x, c.y - 50, 18, L0);
    game.draw.line(c.x, c.y - 50, c.x + sway, c.y + 20, L0, 7);
    var col = hl > 0 ? L3 : L1;
    game.draw.rect(c.x - 76 + sway, c.y + 16, 152, 124, L0);
    game.draw.rect(c.x - 66 + sway, c.y + 26, 132, 104, col);
    game.draw.rect(c.x - 56 + sway, c.y + 34, 112, 44, L3);
    game.draw.sprite(RIDER[Math.floor(game.time.elapsed * 3) % 2], { d: L0, l: L2 }, c.x + sway, c.y + 78, 11, { anchor: 'center' });
  }

  function drawWinch(hl) {
    // 親指ゾーン: 巻き上げ機(歯車・歯止め・ハンドル)と機械番
    game.draw.rect(0, H * 0.74, W, H * 0.26, L1);
    game.draw.rect(0, H * 0.74, W, 8, L0);
    var sc = hl > 0 ? 1 + hl * 0.12 : 1;
    game.draw.circle(WX, WY, (WR + 22) * sc, L0);
    game.draw.circle(WX, WY, WR * sc, hl > 0 ? L3 : L2);
    for (var t = 0; t < 12; t++) {
      var a = spin + t * Math.PI / 6;
      game.draw.circle(WX + Math.cos(a) * (WR + 14) * sc, WY + Math.sin(a) * (WR + 14) * sc, 18, L0);
    }
    game.draw.circle(WX, WY, 40, L0);
    var ha = spin * 1.0 - Math.PI / 2;
    var hx = WX + Math.cos(ha) * 110, hy = WY + Math.sin(ha) * 110;
    game.draw.line(WX, WY, hx, hy, L0, 16);
    game.draw.circle(hx, hy, 22, L1);
    // 歯止め: 上がっている量 = 残りクールダウン
    var lift = seated ? 0 : Math.max(0, Math.min(1, cool / coolMax));
    var pa = (160 + lift * 48) * Math.PI / 180;
    var tipX = PVX + Math.cos(pa) * 135, tipY = PVY + Math.sin(pa) * 135;
    game.draw.line(PVX, PVY, tipX, tipY, hl > 0 ? L3 : L0, hl > 0 ? 34 : 24);
    game.draw.circle(tipX, tipY, hl > 0 ? 26 : 16, hl > 0 ? L3 : L0);
    game.draw.circle(PVX, PVY, 26, L0);
    game.draw.circle(PVX, PVY, 12, L3);
    // 噛んだ合図の灯
    var lamp = seated && phase === 'crank';
    game.draw.circle(PVX + 80, PVY - 60, 34, L0);
    game.draw.circle(PVX + 80, PVY - 60, 24, lamp ? GLOW : L1);
    if (lamp && seatT < 0.2) game.draw.circle(PVX + 80, PVY - 60, 50 + seatT * 100, GLOW, 0.5 - seatT * 2);
    // 機械番
    var fr = kT > 0 ? kFrame : seated ? 0 : 2;
    game.draw.sprite(KEEPER[fr], { d: L0, l: L3 }, WX - 290, H * 0.86 + Math.sin(game.time.elapsed * 2.5) * 4, 17, { anchor: 'center' });
  }

  function drawHud() {
    for (var i = 0; i < ROUNDS.length; i++) {
      game.draw.rect(54 + i * 76, 66, 56, 48, L0);
      game.draw.rect(60 + i * 76, 72, 44, 36, i < cabins ? GLOW : i === ri ? L2 : L1);
    }
    big(String(score), W / 2, 112, 68, L3);
    for (var j = 0; j < JAMS; j++) game.draw.sprite(WRENCH, { d: j < jams ? L0 : L2 }, W - 80 - j * 70, 90, 10, { anchor: 'center' });
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 180, W - 120, 22, L0);
    game.draw.rect(64, 184, (W - 128) * fr, 14, timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? L1 : GLOW);
    big(notch + ' / ' + cfg().need, W / 2, H * 0.115 + 60, 44, L0);
  }

  function drawBezel() {
    game.draw.rect(0, 0, W, 20, L0);
    game.draw.rect(0, H - 20, W, 20, L0);
    game.draw.rect(0, 0, 20, H, L0);
    game.draw.rect(W - 20, 0, 20, H, L0);
  }

  // ── ATTRACT デモ: 灯が点くたびに回す → 1度だけ早回しして滑る ──
  var demo = { t: 0, press: 0, jammed: false, haltT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { setupRound(0); spin = 0; demo.jammed = false; demo.haltT = 0; halt = null; }
    if (demo.press > 0) demo.press -= dt;
    if (kT > 0) kT -= dt;
    if (demo.haltT > 0) {
      demo.haltT -= dt;
      if (demo.haltT <= 0) { halt = null; jam(0.3); game.feedback.bad(PVX, PVY, { text: 'MISS', volume: 0.3, shake: 4 }); }
      return;
    }
    if (phase === 'arrive') { phT -= dt; return; }
    stepPawl(dt, 0.3);
    if (!demo.jammed && notch === 2 && !seated && cool < coolMax * 0.5) {
      demo.jammed = true; demo.press = 0.2; demo.haltT = 0.35; halt = { t: 0.35, max: 0.35 };
      return;
    }
    if (seated && seatT > 0.08 && demo.press <= 0) { demo.press = 0.2; crank(0.3); }
  }

  function stepTrail(dt) {
    shown += (notch - shown) * Math.min(1, dt * 12);
    trailT += dt;
    if (trailT > 0.06) {
      trailT = 0;
      var c = cabPos(shown / cfg().need);
      trail.push({ x: c.x, y: c.y, s: gust ? Math.sin(game.time.elapsed * 14) * 18 : 0 });
      if (trail.length > 4) trail.shift();
    }
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepTrail(dt);
      var hlA = halt ? Math.max(0, demo.haltT / 0.35) : 0;
      drawGorge();
      drawCable(0);
      drawWinch(hlA);
      game.draw.hand(W * 0.74, H * 0.9 + Math.sin(game.time.elapsed * 3) * 6, { press: demo.press > 0, scale: 15 });
      drawBezel();
      big(TITLE, W / 2, H * 0.065, 90, L0);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 42, L1);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.975, 46, L3);
      else big('INSERT COIN', W / 2, H * 0.975, 40, GLOW);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.2) sendEnd();
      stepTrail(dt);
      drawGorge();
      drawCable(0);
      drawWinch(0);
      drawBezel();
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, L0, 0.85);
      big(won ? 'CLEAR' : timeUp ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.17, 104, won ? GLOW : L3);
      big('SCORE ' + score, W / 2, H * 0.22, 56, L3);
      big(cabins + ' / ' + ROUNDS.length + '   ' + cranks + '   ★' + perfects, W / 2, H * 0.265, 44, L2);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 60, GLOW);
      else big('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.31, 42, L2);
      if (!won) big('あと' + Math.max(1, cfg().need - notch) + '段!', W / 2, H * 0.355, 58, GLOW);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.975, 40, L3);
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
        halt = null; jams--;
        jam(1);
        game.feedback.bad(PVX, PVY, { text: 'MISS' });
        if (jams <= 0) finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 4 && Math.floor((timeLeft + dt) * 2) !== Math.floor(timeLeft * 2)) game.audio.tone(990, 0.05, { wave: 'square', volume: 0.05 });
      if (phase === 'arrive') {
        phT -= dt;
        if (phT <= 0) nextRound();
      } else {
        stepPawl(dt, 1);
      }
      if (timeLeft <= 0 && !over) {
        timeLeft = 0; timeUp = true;
        game.fx.flash(L3, 0.15);
        game.feedback.bad(cabPos(shown / cfg().need).x, cabPos(shown / cfg().need).y, { text: 'TIME UP' });
        finish(false);
      }
    }
    if (kT > 0) kT -= dt;
    stepTrail(dt);

    drawGorge();
    drawCable(hl);
    drawWinch(hl);
    drawHud();
    drawBezel();
    if (cranks === 0 && ri === 0 && ready <= 0 && !over) game.draw.hand(W * 0.74, H * 0.9, { press: seated && Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 12, alpha: 0.5 });
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 120, L0);
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1.5], ['R', 0.5],
      ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['D5', 1], ['A4', 2],
    ], { tempo: 120, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['F2', 2], ['G2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
