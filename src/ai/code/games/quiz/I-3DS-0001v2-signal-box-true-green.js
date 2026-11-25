// I-3DS-0001v2-signal-box-true-green.js
// 信号所の青見極め — 次々灯る灯のうち「自分の線の信号機・いちばん上・青緑・点きっぱなし」の本物だけに旗を上げる
// 操作: 灯が点いた瞬間に見極め、本物の発車の青なら画面をタップして旗を上げる。黄・赤・隣の線の青・黄緑・ホタルの光には手を出さず見送る
// 終わり: 10回の合図を通しで見極めればCLEAR。偽物に旗を上げる/本物を見逃す/早押しが合わせて3回でGAME OVER
// @mechanic: judge
// @theme: rail_signal_box_true_green
// 世界観: 夜の小さな鉄道の信号所で、見習い駅員が自分の線の信号機に点いた灯を見極め、発車の青のときだけ旗を上げて待っている列車を送り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 得点(見極めた数・反応の速さ)
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 褐色〜灰に寄せ、ブルーム(半透明円の重ね)とビネット
  var STYLE = { bg: ['#1e1a17', '#3a322b', '#5a4c3e'], main: ['#8a7a66', '#c9a46a', '#d06a3a'], accent: ['#2fe6c8', '#f2e6d0'] };
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], ground: STYLE.bg[2], steel: STYLE.main[0], brass: STYLE.main[1], ours: STYLE.main[2],
    go: STYLE.accent[0], cream: STYLE.accent[1], lime: '#c4e83c', amber: '#f2b230', red: '#ef4a3a', neigh: '#8a62c0',
    ink: '#120f0d', bad: '#ff5a4a', ok: '#7fe0a0',
  };

  var GAME_TITLE = 'TRUE GREEN';
  var TRIALS = 10;
  var LIVES = 3;
  var TIME_LIMIT = 15;
  var PRE = 0.45, POST = 0.25;

  var MAST = { x: 400, top: 330, lamps: [410, 525, 640], r: 46 };
  var NB = { x: 830, top: 470, lamps: [510, 572, 634], r: 26 };
  var FLAG_BTN = { x: W / 2, y: Math.round(H * 0.86), r: 150 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var seq, idx, tr, lives, score, combo, maxCombo, rights, wrongs, readyT, over, won, stopT, outroT, focus, playT, milestoneHit;
  var flagUp = 0, trainGo = 0, nod = 0;

  // 段ごとに混ざる偽物が増える(1段: 赤・黄 / 2段: 隣の線 / 3段: 黄緑・ホタル)。窓も狭まる
  function buildSeq() {
    var stages = [
      { n: 4, real: 2, fakes: ['red', 'yellow'], win: 0.95 },
      { n: 3, real: 2, fakes: ['neighbor', 'yellow'], win: 0.8 },
      { n: 3, real: 2, fakes: ['lime', 'firefly', 'neighbor'], win: 0.65 },
    ];
    var out = [];
    for (var s = 0; s < stages.length; s++) {
      var st = stages[s];
      var kinds = [];
      for (var i = 0; i < st.n; i++) kinds.push(i < st.real ? 'go' : st.fakes[Math.floor(game.random(0, st.fakes.length)) % st.fakes.length]);
      for (var k = kinds.length - 1; k > 0; k--) { var j = Math.floor(game.random(0, k + 1)) % (k + 1); var tmp = kinds[k]; kinds[k] = kinds[j]; kinds[j] = tmp; }
      if (s === 0 && kinds[0] !== 'go') { for (var q = 1; q < kinds.length; q++) if (kinds[q] === 'go') { kinds[q] = kinds[0]; kinds[0] = 'go'; break; } }
      if (s === 2 && kinds.indexOf('lime') < 0) kinds[kinds.indexOf('go') === 0 ? 1 : 0] = 'lime';
      for (var m = 0; m < kinds.length; m++) out.push({ kind: kinds[m], win: st.win, stage: s });
    }
    return out;
  }

  function startTrial(i) {
    idx = i;
    var d = seq[i];
    tr = { kind: d.kind, win: d.win, phase: 'pre', t: 0, wasLit: false, ffx: 0 };
    game.audio.tone(d.stage === 2 ? 'D5' : 'A4', 0.04, { wave: 'square', volume: 0.06 });
  }

  function initGame() {
    seq = buildSeq();
    lives = LIVES; score = 0; combo = 0; maxCombo = 0; rights = 0; wrongs = 0;
    readyT = 0.8; over = false; won = false; stopT = 0; outroT = 0; focus = null; playT = 0; milestoneHit = false;
    flagUp = 0; trainGo = 0; nod = 0;
    startTrial(0);
  }

  function isGo() { return tr.kind === 'go'; }

  // 偽物の正体の位置(失敗の因果提示に使う)
  function lampSpot(kind) {
    if (kind === 'neighbor') return { x: NB.x, y: NB.lamps[0], r: NB.r };
    if (kind === 'yellow') return { x: MAST.x, y: MAST.lamps[1], r: MAST.r };
    if (kind === 'red') return { x: MAST.x, y: MAST.lamps[2], r: MAST.r };
    if (kind === 'firefly') return { x: MAST.x + tr.ffx, y: MAST.lamps[0], r: 30 };
    return { x: MAST.x, y: MAST.lamps[0], r: MAST.r };
  }

  function loseLife(spot, demo) {
    combo = 0; wrongs++;
    focus = spot;
    stopT = 0.45;
    nod = -1;
    if (demo) { game.feedback.bad(spot.x, spot.y, { text: 'MISS', shake: 6 }); return; }
    lives--;
    if (lives <= 0) {
      over = true; won = false; outroT = 1.3;
      game.feedback.bad(spot.x, spot.y, { text: 'MISS', shake: 16 });
      game.audio.stopBgm();
      game.audio.play('se_failure', 0.5);
    } else {
      game.feedback.bad(spot.x, spot.y, { text: 'MISS', shake: 10 });
    }
  }

  function raiseFlag(demo) {
    flagUp = 0.5;
    game.audio.play('se_jump', 0.3);
    if (tr.phase !== 'lit') {
      // 早押し(灯る前)
      loseLife({ x: MAST.x, y: MAST.lamps[0], r: MAST.r }, demo);
      tr.phase = 'post'; tr.t = 0;
      return;
    }
    if (isGo()) {
      var speed = Math.max(0, 1 - tr.t / tr.win);
      var pts = 100 + Math.round(speed * 100) + combo * 10;
      combo++; rights++; if (combo > maxCombo) maxCombo = combo;
      score += pts;
      trainGo = 0.9; nod = 1;
      game.feedback.good(MAST.x, MAST.lamps[0], { text: speed > 0.6 ? 'PERFECT' : 'GOOD', color: C.go, size: 56 });
      game.audio.tone('C6', 0.12, { wave: 'triangle', volume: 0.1, slide: 300 });
      if (!demo && combo === 4 && !milestoneHit) {
        milestoneHit = true;
        game.fx.popup('x4 COMBO', W / 2, H * 0.45, { color: C.brass, size: 64 });
        game.audio.play('se_milestone', 0.5);
      }
      tr.phase = 'post'; tr.t = 0;
    } else {
      loseLife(lampSpot(tr.kind), demo);
      tr.phase = 'post'; tr.t = 0;
    }
  }

  // 1試行を進める(本番もデモも同じ)。戻り値: 試行が終わったか
  function stepTrial(dt, demo) {
    tr.t += dt;
    if (tr.kind === 'firefly') tr.ffx = -260 + (tr.phase === 'lit' ? tr.t / tr.win : (tr.phase === 'post' ? 1 : 0)) * 520;
    if (tr.phase === 'pre' && tr.t >= PRE) {
      tr.phase = 'lit'; tr.t = 0; tr.wasLit = true;
      game.audio.tone('G5', 0.05, { wave: 'sine', volume: 0.08 });
    } else if (tr.phase === 'lit' && tr.t >= tr.win) {
      if (isGo()) loseLife({ x: MAST.x, y: MAST.lamps[0], r: MAST.r }, demo);
      else {
        // 見送り成功
        combo++; rights++; if (combo > maxCombo) maxCombo = combo;
        score += 50;
        nod = 1;
        game.fx.popup('NICE', lampSpot(tr.kind).x, lampSpot(tr.kind).y - 80, { color: C.ok, size: 44 });
        game.audio.play('se_coin', 0.25);
      }
      tr.phase = 'post'; tr.t = 0;
    } else if (tr.phase === 'post' && tr.t >= POST) {
      return true;
    }
    return false;
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0 || stopT > 0) return;
    if (tr.phase === 'post') { game.audio.tone(220, 0.03, { wave: 'triangle', volume: 0.04 }); return; }
    raiseFlag(false);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function bloom(x, y, r, col, k) {
    game.draw.circle(x, y, r * 2.6, col, 0.08 * k);
    game.draw.circle(x, y, r * 1.8, col, 0.16 * k);
    game.draw.circle(x, y, r * 1.25, col, 0.3 * k);
  }

  var ATTEND_A = ['..nnnn..', '.nnnnnn.', 'bbbbbbbb', '..ssss..', '.sesses.', '..smms..', '.uuuuuu.', 'uuuyyuuu', '.uuuuuu.', '..pp.pp.', '..kk.kk.'];
  var ATTEND_B = ['..nnnn..', '.nnnnnn.', 'bbbbbbbb', '..ssss..', '.sesses.', '..sffs..', '.uuuuuu.', 'uuuyyuuu', '.uuuuuu.', '..pp.pp.', '.kk...kk'];
  var TRAIN = ['.oooooooooo.', 'oowwwoowwwoo', 'owweewweewwo', 'owwwwoowwwwo', 'oooooooooooo', 'oyyoooooyyoo', 'oooommmmoooo', 'gg........gg'];
  var FIREFLY = ['.w.w.', 'wbbbw', '.bgb.', '..g..'];

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.4, [[0, C.sky], [1, C.sky2]]);
    // 遠くの街の灯(ぼけ)
    for (var i = 0; i < 9; i++) {
      var bx = (i * 137 + 60) % W, by = H * 0.33 + (i % 3) * 30;
      game.draw.circle(bx, by, 26 + (i % 2) * 14, i % 3 === 0 ? '#c98a4a' : '#7a6a5a', 0.18 + Math.sin(t * 1.3 + i) * 0.05);
    }
    game.draw.gradient(H * 0.4, H, [[0, C.ground], [1, '#2a241f']]);
    // 線路(奥へ収束)
    var vx = 560, vy = H * 0.4;
    var rails = [[-420, -150], [60, 330], [600, 840], [1060, 1330]];
    for (var r = 0; r < rails.length; r++) {
      game.draw.line(vx + (rails[r][0] - vx) * 0.12, vy, rails[r][0], H, '#6e655a', 6);
      game.draw.line(vx + (rails[r][1] - vx) * 0.12, vy, rails[r][1], H, '#6e655a', 6);
    }
    for (var s = 0; s < 14; s++) {
      var f = Math.pow(s / 14, 1.8);
      var yy = vy + (H - vy) * f;
      game.draw.rect(0, yy, W, 4 + f * 10, '#3e352c', 0.6);
    }
    // ホーム
    game.draw.rect(0, H * 0.69, W, 40, '#9a8c78');
    game.draw.rect(0, H * 0.69 + 40, W, 18, '#d8c23a', 0.7);
  }

  function lampColor(i, ours) {
    // 灯っている間と、その後の見せ止め(hit-stop)・余韻の間は点けたまま
    if (!tr.wasLit || tr.phase === 'pre') return null;
    var k = tr.kind;
    if (ours) {
      if (i === 0 && k === 'go') return C.go;
      if (i === 0 && k === 'lime') return C.lime;
      if (i === 1 && k === 'yellow') return C.amber;
      if (i === 2 && k === 'red') return C.red;
    } else if (i === 0 && k === 'neighbor') return C.go;
    return null;
  }

  function drawMast(m, ours, scale) {
    var t = game.time.elapsed;
    var hw = 70 * scale;
    game.draw.rect(m.x - 10 * scale, m.top, 20 * scale, H * 0.7 - m.top, C.steel);
    game.draw.rect(m.x - 10 * scale, m.top + 470 * scale, 20 * scale, 40 * scale, ours ? C.ours : C.neigh);
    game.draw.rect(m.x - hw - 6, m.top - 6, hw * 2 + 12, (m.lamps[2] - m.top) + m.r + 46 * scale, '#4a4038');
    game.draw.rect(m.x - hw, m.top, hw * 2, (m.lamps[2] - m.top) + m.r + 34 * scale, C.ink);
    for (var i = 0; i < 3; i++) {
      var col = lampColor(i, ours);
      game.draw.circle(m.x, m.lamps[i], m.r + 6 * scale, '#2a2420');
      game.draw.circle(m.x, m.lamps[i], m.r, col || '#24201c');
      if (col) {
        bloom(m.x, m.lamps[i], m.r, col, 1);
        game.draw.circle(m.x - m.r * 0.3, m.lamps[i] - m.r * 0.3, m.r * 0.3, '#ffffff', 0.5);
      }
      game.draw.rect(m.x - m.r - 8 * scale, m.lamps[i] - m.r - 12 * scale, (m.r + 8 * scale) * 2, 12 * scale, '#3a322b');
    }
    // 予告: 継電器の豆ランプが点滅(灯る直前)
    if (tr.phase === 'pre' && Math.floor(t * 16) % 2 === 0 && ours) {
      game.draw.circle(m.x + hw + 26, m.top + 30, 14, C.brass);
      bloom(m.x + hw + 26, m.top + 30, 10, C.brass, 0.6);
    } else if (ours) game.draw.circle(m.x + hw + 26, m.top + 30, 14, '#4a4038');
  }

  function drawFirefly() {
    if (tr.kind !== 'firefly' || tr.phase === 'pre') return;
    var t = game.time.elapsed;
    var x = MAST.x + tr.ffx, y = MAST.lamps[0] + Math.sin(t * 9) * 18;
    var lit = tr.phase === 'lit';
    if (lit) bloom(x, y + 18, 22, C.go, 0.9);
    game.draw.sprite(FIREFLY, { w: '#d8d8e0', b: '#3a3020', g: lit ? C.go : '#556' }, x, y, 12, { anchor: 'center', flipX: Math.floor(t * 8) % 2 === 0 });
  }

  // 正解の手本カード(自分の線の帯色・最上段・青緑)
  function drawRefCard() {
    var x = 930, y = 330;
    game.draw.rect(x - 84, y - 84, 168, 220, '#d8ccb4');
    game.draw.rect(x - 76, y - 76, 152, 204, '#f2e6d0');
    game.draw.rect(x - 8, y + 30, 16, 92, C.steel);
    game.draw.rect(x - 8, y + 70, 16, 18, C.ours);
    game.draw.rect(x - 34, y - 62, 68, 108, C.ink);
    game.draw.circle(x, y - 38, 18, C.go);
    bloom(x, y - 38, 14, C.go, 0.7 + Math.sin(game.time.elapsed * 4) * 0.2);
    game.draw.circle(x, y - 2, 14, '#24201c');
    game.draw.circle(x, y + 30, 14, '#24201c');
  }

  function drawTrain() {
    var t = game.time.elapsed;
    var shift = trainGo > 0 ? (0.9 - trainGo) * -900 : 0;
    var x = 250 + shift, y = H * 0.6 + Math.sin(t * 6) * 2;
    if (trainGo <= 0 || trainGo > 0.15) {
      game.draw.sprite(TRAIN, { o: C.ours, w: '#e8dcc4', e: '#2a2a3a', y: '#ffe9a0', m: '#5a3a2a', g: '#222' }, x, y, 18, { anchor: 'center' });
      bloom(x - 63, y + 18, 14, '#ffe9a0', 0.5);
      bloom(x + 63, y + 18, 14, '#ffe9a0', 0.5);
    }
  }

  function drawAttendant() {
    var t = game.time.elapsed;
    var x = 760, y = H * 0.63 + (nod > 0 ? -Math.abs(Math.sin(t * 12)) * 16 : 0);
    var fr = Math.floor(t * 3) % 2 === 0 ? ATTEND_A : ATTEND_B;
    game.draw.circle(x, y + 104, 60, C.ink, 0.3);
    game.draw.sprite(fr, { n: '#2a3a5a', b: C.brass, s: '#e8c8a0', e: C.ink, m: nod < 0 ? '#4a2a2a' : '#c0504a', f: '#c0504a', u: '#2a3a5a', y: C.brass, p: '#20283a', k: C.ink }, x, y, 16, { anchor: 'center' });
    // 旗: 上げた瞬間だけ頭上へ
    var up = flagUp > 0;
    var hx = x + 70, hy = up ? y - 150 : y + 10;
    game.draw.line(x + 50, y, hx, hy, '#c8b89a', 8);
    var wave = Math.sin(t * 14) * 10;
    game.draw.rect(hx, hy - 4, 90, 60 + wave * 0.3, up ? C.go : '#6a8a6a');
    game.draw.rect(hx, hy - 4, 90, 8, '#ffffff', 0.4);
  }

  function drawFlagButton(pressing) {
    var b = FLAG_BTN;
    var pulse = tr.phase === 'lit' ? 1 + Math.sin(game.time.elapsed * 14) * 0.04 : 1;
    game.draw.circle(b.x, b.y + 12, b.r, C.ink, 0.5);
    game.draw.circle(b.x, b.y, b.r * pulse, pressing ? C.go : '#6a5c4c');
    game.draw.circle(b.x, b.y, b.r * pulse - 14, pressing ? '#9ff0de' : '#8a7a66');
    game.draw.circle(b.x, b.y, b.r * pulse + 8, '#ffffff', tr.phase === 'lit' ? 0.18 : 0.06);
    game.draw.line(b.x - 40, b.y + 70, b.x - 40, b.y - 70, C.cream, 10);
    game.draw.rect(b.x - 40, b.y - 70, 100, 64, C.go);
  }

  function vignette() {
    game.draw.rect(0, 0, W, 90, '#000000', 0.35);
    game.draw.rect(0, H - 90, W, 90, '#000000', 0.35);
    game.draw.rect(0, 0, 70, H, '#000000', 0.3);
    game.draw.rect(W - 70, 0, 70, H, '#000000', 0.3);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.6);
    label('SCORE ' + score, 280, 80, 46, C.cream);
    for (var i = 0; i < LIVES; i++) {
      var on = i < lives;
      game.draw.circle(760 + i * 90, 64, 28, on ? C.brass : '#3a322b');
      if (on) bloom(760 + i * 90, 64, 18, C.brass, 0.4);
    }
    for (var k = 0; k < TRIALS; k++) {
      var col = k < idx ? C.ok : (k === idx ? C.cream : '#4a4038');
      game.draw.rect(120 + k * 70, 150, 50, 30, col);
    }
    label(Math.min(idx + 1, TRIALS) + ' / ' + TRIALS, 900, 180, 38, C.cream);
    if (tr.phase === 'lit' && !over) {
      var left = Math.max(0, 1 - tr.t / tr.win);
      game.draw.rect(120, 200, (W - 240) * left, 12, left < 0.3 ? C.bad : C.go);
    }
  }

  function drawScene() {
    drawWorld();
    drawMast(NB, false, 0.6);
    drawMast(MAST, true, 1);
    drawFirefly();
    drawRefCard();
    drawTrain();
    drawAttendant();
    if (focus && stopT > 0) {
      game.draw.circle(focus.x, focus.y, focus.r * 2.2, '#ffffff', 0.55);
      game.draw.circle(focus.x, focus.y, focus.r * 1.4, '#ffffff', 0.8);
    }
    vignette();
  }

  // ---- ATTRACT: 実ロジックで3回見せる(本物→旗、隣の線→見送り、黄緑→つい旗を上げてMISS) ----
  var demo = { t: 0, x: FLAG_BTN.x, y: FLAG_BTN.y, press: 0, step: 0 };
  var DEMO_SEQ = [{ kind: 'go', win: 0.9, stage: 0 }, { kind: 'neighbor', win: 0.9, stage: 1 }, { kind: 'lime', win: 0.9, stage: 2 }];
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || !seq || seq.length !== 3 || seq[0] !== DEMO_SEQ[0]) {
      initGame(); readyT = 0; lives = 99; seq = DEMO_SEQ; startTrial(0);
    }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; }
    else if (stepTrial(dt, true)) {
      var ni = (idx + 1) % 3;
      if (ni === 0) { score = 0; combo = 0; }
      startTrial(ni);
    }
    var wantPress = tr.phase === 'lit' && stopT <= 0 && ((tr.kind === 'go' && tr.t > 0.32) || (tr.kind === 'lime' && tr.t > 0.22));
    if (wantPress) { demo.press = 0.2; raiseFlag(true); }
    if (demo.press > 0) demo.press -= dt;
    var hover = tr.phase === 'lit' && tr.kind !== 'go' && tr.kind !== 'lime';
    demo.x = FLAG_BTN.x + (hover ? Math.sin(demo.t * 5) * 40 : 0);
    demo.y = FLAG_BTN.y + (demo.press > 0 ? 0 : -60);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (flagUp > 0) flagUp -= dt;
    if (trainGo > 0) trainGo -= dt;
    nod += (0 - nod) * Math.min(1, dt * 2.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      drawFlagButton(demo.press > 0);
      game.draw.hand(demo.x, demo.y, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.6);
      label(GAME_TITLE, W / 2, 105, 86 + Math.sin(t * 3) * 3, C.go);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.755, 50, C.brass);
      else label('TAP TO START', W / 2, H * 0.755, 44, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawFlagButton(false);
      game.draw.rect(0, H * 0.36, W, H * 0.24, C.ink, 0.7);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 96, won ? C.go : C.bad);
      label('SCORE ' + score, W / 2, H * 0.48, 54, C.cream);
      label(rights + ' / ' + TRIALS, W / 2, H * 0.53, 40, C.ok);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.385, 48, C.brass);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.385, 36, C.cream);
      if (!won) label('あと' + Math.max(1, TRIALS - idx) + '回!', W / 2, H * 0.575, 44, C.brass);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.64, 36, C.cream);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      if (stopT > 0) stopT -= dt;
      else {
        outroT -= dt;
        if (outroT <= 0) {
          state = S.RESULT;
          var stats = { right: rights, wrong: wrongs, maxCombo: maxCombo };
          if (won) game.end.success(score, stats);
          else game.end.failure(stats);
        }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { game.audio.play('se_tap', 0.4); startTrial(0); }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      playT += dt;
      if (stepTrial(dt, false) && !over) {
        if (idx + 1 >= TRIALS || playT > TIME_LIMIT + 3) {
          over = true; won = lives > 0; outroT = 1.5;
          game.audio.stopBgm();
          game.audio.play('se_success', 0.55);
          game.fx.burst(MAST.x, MAST.lamps[0], { color: C.go, count: 30, speed: 460 });
          game.fx.burst(760, H * 0.6, { color: C.brass, count: 24, speed: 380 });
          game.fx.flash(C.go, 0.2);
          trainGo = 0.9; nod = 1;
        } else startTrial(idx + 1);
      }
    }

    drawScene();
    drawFlagButton(flagUp > 0.3);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 100, C.brass);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 1],
      ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['E4', 2],
    ], { tempo: 84, wave: 'triangle', volume: 0.05, loop: true, bass: [['E2', 2], ['C2', 2], ['D2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
