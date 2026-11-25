// I-GBA-0010v2-bean-masu-glance.js
// ビーンマス・グランス — 一瞬だけ開く2つの升を見比べ、豆が多かった方の升をすぐに選ぶ
// 操作: 蓋が一瞬開いて閉じたら、豆が多かった側(左右どちらか)の升か手前のざるをタップ
// 終わり: 5回正解でCLEAR。外すとかごが1つ減り、2つとも失うか14秒経過でGAME OVER
// @mechanic: size_judge
// @theme: harvest_bean_sorting_hut
// 世界観: 収穫後の豆の選別小屋で、農家の娘が一瞬だけ開いた2つの升のどちらに豆が多いかを見抜き、多い方をざるに空けて選別を進める(後半は大粒の豆で少ない升が満杯に見える)
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解数・最速の見抜き時間・スコア
// スタイル: HD POST 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り。ブルーム(半透明円の重ね)とビネットでコントラストを潰す
  var STYLE = { bg: ['#2b2219', '#4a3b2c', '#6b5842'], main: ['#b89a6e', '#8c7050', '#d8c7a4'], accent: ['#e8c26a', '#9c5b3f'] };
  var WOOD = STYLE.main[0], WOOD_D = STYLE.main[1], PALE = STYLE.main[2], GOLD = STYLE.accent[0], RUST = STYLE.accent[1];
  var BEAN_A = '#c9a45c', BEAN_B = '#7a4a30';

  var TITLE = 'BEAN GLANCE';
  var TIME_LIMIT = 14;
  var NEEDED = 5;
  var LIVES = 2;
  var ANSWER_WAIT = 2.2;
  var MX = [W * 0.28, W * 0.72], MY = H * 0.5, MS = 300; // 升の中心と一辺
  var SIEVE_Y = H * 0.82;

  var MODE = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = MODE.ATTRACT;

  var GIRL = [
    ['...hhh...', '..hhhhh..', '.hhsssh..', '..sesesh.', '..sssss..', '...rrr...', '.rrrrrrr.', 'r.rrrrr.r', '..rrrrr..'],
    ['...hhh...', '..hhhhh..', '.hhsssh..', '..sesesh.', '..sssss..', '...rrr...', 'rrrrrrrrr', '..rrrrr..', '..rrrrr..'],
  ];
  var GIRL_PAL = { h: '#3a2a20', s: '#e0c09a', e: '#2a1e18', r: '#8a5a48' };
  var BEAN = ['.##.', '####', '####', '.##.'];
  var BIG_BEAN = ['.###.', '#####', '#####', '#####', '.###.'];

  // ── 課題(プレイ・デモ共通) ──
  function makeTask(r, fixed) {
    var more = fixed ? fixed.more : 5 + Math.floor(game.random(0, 6)) + r;
    var diff = fixed ? fixed.diff : Math.max(1, 5 - r);
    var less = more - diff;
    var side = fixed ? fixed.side : (game.random(0, 1) < 0.5 ? 0 : 1);
    var trap = !fixed && r >= 3; // 少ない方を大粒にして満杯に見せる
    var counts = side === 0 ? [more, less] : [less, more];
    var beans = [[], []];
    for (var s = 0; s < 2; s++) {
      var big = trap && counts[s] === less;
      for (var i = 0; i < counts[s]; i++) {
        beans[s].push({ x: game.random(-MS / 2 + 40, MS / 2 - 40), y: game.random(-MS / 2 + 40, MS / 2 - 40), big: big, c: i % 3 === 0 ? BEAN_B : BEAN_A });
      }
    }
    return { counts: counts, side: side, beans: beans, open: fixed ? fixed.open : Math.max(0.42, 0.9 - r * 0.1) };
  }

  // ── 状態 ──
  var round, task, phase, pT, lid, correct, lives, timeLeft, ready, halt, over, won, endT, score, prevBest, chosen, fastest, answerT;

  function initGame() {
    round = 0; correct = 0; lives = LIVES; timeLeft = TIME_LIMIT; ready = 0.8;
    halt = null; over = false; won = false; endT = 0; score = 0; fastest = 9;
    prevBest = game.best || 0;
    newTask();
  }

  function newTask() {
    task = makeTask(round); phase = 'lift'; pT = 0; lid = 0; chosen = -1; answerT = 0;
  }

  function caption(s, x, y, sz, col) {
    game.draw.text(s, x + 2, y + 3, { size: sz, color: '#120d08', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 描画 ──
  function drawHut() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.35, STYLE.bg[2]], [0.62, STYLE.bg[1]], [1, '#1a140e']]);
    // 板壁
    for (var i = 0; i < 9; i++) game.draw.rect(i * 125, 230, 4, H * 0.3, '#1d160f', 0.5);
    // 窓の光(ブルーム)
    var b = 0.08 + 0.02 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(W * 0.62, 300, 260, 200, '#f4e3b8', 0.35);
    game.draw.circle(W * 0.75, 400, 300, '#f4e3b8', b);
    game.draw.circle(W * 0.75, 400, 190, '#f4e3b8', b * 1.3);
    game.draw.circle(W * 0.75, 400, 100, '#fff4d6', b * 1.6);
    // 光の筋
    for (var r = 0; r < 4; r++) game.draw.line(W * 0.65 + r * 60, 500, W * 0.35 + r * 90, H * 0.7, '#f4e3b8', 30);
    game.draw.rect(0, 0, W, H, '#f4e3b8', 0.02);
    // 作業台
    game.draw.rect(0, H * 0.62, W, 30, WOOD_D);
    game.draw.gradient(H * 0.64, H, [[0, '#5a4630'], [1, '#231a12']]);
  }

  function drawVignette() {
    for (var v = 0; v < 6; v++) {
      game.draw.rect(0, 0, 30 + v * 22, H, '#000000', 0.07);
      game.draw.rect(W - 30 - v * 22, 0, 30 + v * 22, H, '#000000', 0.07);
    }
    game.draw.rect(0, H - 120, W, 120, '#000000', 0.2);
  }

  function drawMasu(s, tk, lidT, hl) {
    var x = MX[s], y = MY;
    // 影
    game.draw.rect(x - MS / 2 + 20, y + MS / 2 - 10, MS, 40, '#000000', 0.35);
    // 外枠(手前の面が厚く見える)
    game.draw.rect(x - MS / 2 - 18, y - MS / 2 - 18, MS + 36, MS + 56, WOOD_D);
    game.draw.rect(x - MS / 2 - 18, y - MS / 2 - 18, MS + 36, 18, PALE, 0.6);
    game.draw.rect(x - MS / 2, y - MS / 2, MS, MS, '#2a1f15');
    if (lidT < 1) {
      for (var i = 0; i < tk.beans[s].length; i++) {
        var bn = tk.beans[s][i];
        game.draw.sprite(bn.big ? BIG_BEAN : BEAN, { '#': bn.c }, x + bn.x, y + bn.y, bn.big ? 15 : 9, { anchor: 'center' });
      }
    }
    // 蓋(上に持ち上がる)
    if (lidT > 0) {
      var ly = y - MS / 2 - 18 - (1 - lidT) * 220;
      game.draw.rect(x - MS / 2 - 24, ly + 8, MS + 48, MS * lidT + 10, '#000000', 0.25);
      game.draw.rect(x - MS / 2 - 24, ly, MS + 48, MS * lidT + 10, WOOD);
      game.draw.rect(x - 30, ly + MS * lidT * 0.5 - 12, 60, 24, WOOD_D);
    }
    if (hl) game.draw.rect(x - MS / 2 - 30, y - MS / 2 - 30, MS + 60, MS + 80, '#ffffff', hl);
  }

  function drawSieves(active) {
    for (var s = 0; s < 2; s++) {
      var x = MX[s];
      var a = active ? 1 : 0.5;
      game.draw.circle(x, SIEVE_Y, 170, '#1a130c', 0.5 * a);
      game.draw.circle(x, SIEVE_Y, 150, WOOD, a);
      game.draw.circle(x, SIEVE_Y, 118, WOOD_D, a);
      for (var k = 0; k < 6; k++) game.draw.line(x - 110, SIEVE_Y - 60 + k * 24, x + 110, SIEVE_Y - 60 + k * 24, WOOD, 3);
      if (active) game.draw.circle(x, SIEVE_Y, 160 + 8 * Math.sin(game.time.elapsed * 6), GOLD, 0.12);
    }
  }

  function drawGirl() {
    var fr = Math.floor(game.time.elapsed * 1.6) % 2;
    game.draw.sprite(GIRL[fr], GIRL_PAL, W / 2, H * 0.3 + Math.sin(game.time.elapsed * 2) * 4, 18, { anchor: 'center' });
  }

  function drawCounts(tk) {
    for (var s = 0; s < 2; s++) caption(String(tk.counts[s]), MX[s], MY - MS / 2 - 70, 80, s === tk.side ? GOLD : PALE);
  }

  function drawHud() {
    caption(correct + ' / ' + NEEDED, W * 0.2, 92, 52, PALE);
    caption(String(score), W * 0.5, 92, 44, GOLD);
    for (var i = 0; i < LIVES; i++) game.draw.circle(W * 0.78 + i * 80, 92, 26, i < lives ? GOLD : '#3a2e22');
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 168, W - 120, 18, '#120d08', 0.6);
    game.draw.rect(60, 168, (W - 120) * fr, 18, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RUST : GOLD);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (mode === MODE.ATTRACT) { game.audio.play('se_coin', 0.45); mode = MODE.PLAYING; initGame(); return; }
    if (mode === MODE.RESULT) { game.audio.play('se_tap', 0.2); mode = MODE.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0 || phase !== 'answer') {
      game.audio.play('se_tap', 0.06);
      game.fx.burst(x, y, { color: WOOD, count: 3, speed: 70 });
      return;
    }
    if (y < H * 0.3) { game.audio.play('se_tap', 0.06); return; }
    var s = x < W / 2 ? 0 : 1;
    chosen = s;
    game.audio.play('se_tap', 0.25);
    decide(s);
  });

  function decide(s) {
    phase = 'show'; pT = 0;
    if (s === task.side) {
      correct++;
      fastest = Math.min(fastest, answerT);
      var quick = answerT < 0.6;
      score += 100 + (quick ? 60 : 0) + (task.beans[0].length && task.beans[1 - task.side][0] && task.beans[1 - task.side][0].big ? 80 : 0);
      game.feedback.good(MX[s], MY - 60, { text: quick ? 'PERFECT' : 'GOOD', color: GOLD, count: 16 });
      game.audio.play('se_coin', 0.3);
      if (correct === 3) { game.fx.popup('3 / ' + NEEDED, W / 2, H * 0.24, { color: GOLD, size: 60 }); game.audio.play('se_milestone', 0.35); }
    } else {
      halt = { t: 0.42, max: 0.42, s: s >= 0 ? s : task.side };
    }
  }

  function end(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) score += Math.floor(timeLeft * 30) + lives * 100;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  // ── 課題の進行(プレイ・デモ共通): lift→open→close→answer ──
  function advance(tk, st, dt) {
    st.pT += dt;
    if (st.phase === 'lift') { st.lid = Math.max(0, 1 - st.pT / 0.2); if (st.pT >= 0.2) { st.phase = 'open'; st.pT = 0; game.audio.tone('C5', 0.05, { wave: 'triangle', volume: 0.06 }); } }
    else if (st.phase === 'open') { st.lid = 0; if (st.pT >= tk.open) { st.phase = 'close'; st.pT = 0; } }
    else if (st.phase === 'close') { st.lid = Math.min(1, st.pT / 0.12); if (st.pT >= 0.12) { st.phase = 'answer'; st.pT = 0; game.audio.tone('G4', 0.05, { wave: 'triangle', volume: 0.06 }); } }
  }

  // ── ATTRACT: 蓋が開く→閉じる→手が多い側のざるを押す→数が出る ──
  var demo = { t: 0, tk: null, st: null, gx: W / 2, gy: H * 0.9, press: false, did: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt || !demo.tk) {
      demo.side = demo.side === 0 ? 1 : 0;
      demo.tk = makeTask(0, { more: 10, diff: 4, side: demo.side, open: 0.8 });
      demo.st = { phase: 'lift', pT: 0, lid: 1 };
      demo.did = false;
    }
    if (demo.st.phase !== 'answer' && demo.st.phase !== 'show') advance(demo.tk, demo.st, dt);
    var tx = W / 2, ty = H * 0.92;
    demo.press = false;
    if (demo.st.phase === 'answer' || demo.st.phase === 'show') {
      tx = MX[demo.tk.side]; ty = SIEVE_Y + 20;
      if (cyc > 1.8 && !demo.did) {
        demo.did = true; demo.st.phase = 'show';
        game.feedback.good(MX[demo.tk.side], MY - 60, { text: 'GOOD', color: GOLD, count: 8, volume: 0.2 });
      }
      demo.press = cyc > 1.75 && cyc < 2.05;
    }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 7);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 7);
  }

  game.onUpdate(function (dt) {
    if (mode === MODE.ATTRACT) {
      stepDemo(dt);
      drawHut();
      drawGirl();
      var dl = demo.st.phase === 'show' ? 0 : demo.st.lid;
      drawMasu(0, demo.tk, dl, 0);
      drawMasu(1, demo.tk, dl, 0);
      if (demo.st.phase === 'show') drawCounts(demo.tk);
      drawSieves(demo.st.phase === 'answer');
      drawVignette();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      caption(TITLE, W / 2, H * 0.07, 66, PALE);
      caption('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 36, GOLD);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) caption('► 100円 投入 ◄', W / 2, H * 0.96, 42, GOLD);
      else caption('INSERT COIN', W / 2, H * 0.96, 36, PALE);
      return;
    }

    if (mode === MODE.RESULT) {
      drawHut();
      drawGirl();
      drawMasu(0, task, 0, 0);
      drawMasu(1, task, 0, 0);
      drawSieves(false);
      drawVignette();
      game.draw.rect(70, H * 0.16, W - 140, H * 0.2, '#120d08', 0.75);
      caption(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2, 92, won ? GOLD : RUST);
      caption(correct + ' / ' + NEEDED + '   SCORE ' + score, W / 2, H * 0.26, 42, PALE);
      if (won && score > prevBest) caption('NEW RECORD', W / 2, H * 0.31, 50, GOLD);
      else caption('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.31, 36, WOOD);
      if (!won) caption('あと' + (NEEDED - correct) + '回!', W / 2, H * 0.35, 40, GOLD);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) caption('TAP TO CONTINUE', W / 2, H * 0.96, 36, PALE);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        mode = MODE.RESULT;
        var stats = { correct: correct, lives: lives, fastestMs: fastest < 9 ? Math.round(fastest * 1000) : 0 };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (halt) {
      halt.t -= dt;
      if (halt.t <= 0) {
        lives--;
        game.feedback.bad(MX[halt.s], MY - 60, { text: 'MISS' });
        halt = null;
        if (lives <= 0) { phase = 'show'; pT = 0; end(false); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt;
      var stp = { phase: phase, pT: pT, lid: lid };
      if (phase === 'lift' || phase === 'open' || phase === 'close') { advance(task, stp, dt); phase = stp.phase; pT = stp.pT; lid = stp.lid; }
      else if (phase === 'answer') {
        answerT += dt;
        if (answerT > ANSWER_WAIT) { chosen = -1; decide(-1); }
      } else if (phase === 'show') {
        pT += dt;
        if (pT > 0.6) {
          if (correct >= NEEDED) end(true);
          else { round++; newTask(); }
        }
      }
      if (timeLeft <= 0 && !over) {
        timeLeft = 0;
        game.feedback.bad(W / 2, MY, { text: 'TIME UP' });
        end(false);
      }
    }

    drawHut();
    drawGirl();
    var showOpen = phase === 'show' && !halt;
    for (var s = 0; s < 2; s++) {
      var hl = 0;
      if (halt && halt.s === s) hl = 0.55 * (halt.t / halt.max) + 0.15;
      drawMasu(s, task, showOpen || ready > 0 ? (ready > 0 ? 1 : 0) : lid, hl);
    }
    if (showOpen) drawCounts(task);
    drawSieves(phase === 'answer' && !halt);
    if (phase === 'answer' && !halt) {
      var wf = Math.max(0, 1 - answerT / ANSWER_WAIT);
      game.draw.rect(W * 0.3, H * 0.68, W * 0.4 * wf, 12, GOLD);
    }
    drawVignette();
    drawHud();
    if (ready > 0) caption(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, GOLD);
  });

  game.onStart(function () {
    game.audio.melody([['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1], ['D4', 1], ['E4', 2]], { tempo: 88, wave: 'sine', volume: 0.05, loop: true });
    mode = MODE.ATTRACT;
    initGame();
  });
})(game);
