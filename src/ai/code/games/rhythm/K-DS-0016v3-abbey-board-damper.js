// K-DS-0016v3-abbey-board-damper.js
// 響き板の余韻止め — 師が打った響き板の足元の押さえ板を合図の拍から踏み続け、板に灯った数の拍ぴったりで離して余韻を断つ
// 操作: 吊られた3枚の響き板のうち、師の木槌が向いた板(1.5拍前に振りかぶる)が合図の拍で鳴る。その板の真下の列(押さえ板)を合図の拍の頭で押し、押している間は板の灯りが1拍に1つずつ消える。最後の灯りが消える拍の頭で離す。押す・離すとも拍の頭からのずれでPERFECT/GOOD。振りかぶり後の早押し・違う列・押し遅れ・早離し・押しすぎはMISS。2回目と4回目は合図と同時に風で灯明が消え、伴奏も拍の灯りも止まるので自分で拍を数える(その回の頭で鎧戸が鳴って予告)
// 終わり: 4回(3拍・2拍・4拍・5拍・約15秒)を通して MISS 2回以内ならCLEAR(判定の点+止めボーナス、灯の消えた回は2倍)。MISS 3回でGAME OVER
// @mechanic: hold_duration
// @theme: abbey_store_board_damper
// 世界観: 山の修道院の楽器庫で、見習い修道士が師の打ち鳴らす響き板の余韻を、拍を数えて決められた長さだけ押さえ板で抱え、ぴたりの拍で手を離して響きを断ち切る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・止めた枚数・灯の消えた回で止めた数
// スタイル: 8bit HANDHELD
var STYLE = { bg: ['#9bbc0f', '#8bac0f'], main: ['#306230', '#0f380f', '#8bac0f'], accent: ['#9bbc0f', '#0f380f'] };

(function(game) {
  // 8bit HANDHELD: 黄緑寄り4階調だけ。低コントラスト、動く物に残像、画面枠を描く
  var W = game.canvas.width;
  var H = game.canvas.height;
  var L0 = '#0f380f', L1 = '#306230', L2 = '#8bac0f', L3 = '#9bbc0f';

  var GAME_TITLE = 'ABBEY HUSH';
  var BPM = 144;
  var SPB = 60 / BPM;
  var INTRO = 4;                 // 1小節の前奏
  var RLEN = 8;                  // 1回 = 2小節
  var CUE_REL = 2;               // 回の3拍目が合図の拍
  var PERFECT_W = 0.07;
  var GOOD_W = 0.15;
  var MISS_MAX = 3;
  var HIT_STOP = 0.45;
  var TIME_LIMIT = 15;
  var ROUNDS = [{ n: 3, b: 1, brk: false }, { n: 2, b: 0, brk: true }, { n: 4, b: 2, brk: false }, { n: 5, b: 1, brk: true }];
  var COLX = [200, 540, 880];
  var BOARD_Y = Math.round(H * 0.44), BEAM_Y = Math.round(H * 0.3), PEDAL_Y = Math.round(H * 0.85), BR = 118;
  var LCD = { x: 36, y: 244, w: W - 72, h: H - 290 };

  // 修道院の歌(オリジナル・ドリア調)。2拍ずつ拍クロックから鳴らすので、灯が消えた瞬間に止められる
  var PHRASE = [
    [['D5', 1], ['F5', 1]], [['E5', 0.5], ['D5', 0.5], ['C5', 1]], [['D5', 1.5], ['A4', 0.5]], [['C5', 1], ['D5', 1]],
    [['F5', 1], ['G5', 1]], [['A5', 1], ['G5', 0.5], ['F5', 0.5]], [['E5', 1], ['C5', 1]], [['D5', 2]],
  ];
  var PBASS = [
    [['D3', 1], ['A2', 1]], [['C3', 1], ['G2', 1]], [['D3', 1], ['A2', 1]], [['C3', 1], ['G2', 1]],
    [['F2', 1], ['C3', 1]], [['A2', 1], ['E3', 1]], [['C3', 1], ['G2', 1]], [['D3', 1], ['A2', 1]],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, readyT, hitStop, flashT, flashX, flashY;
  var r, rs, silent, dark, lampK, swing, swingHist, malletK, shutterT, heldCol, beatGlow, apX;
  var score, perfects, goods, misses, cleared, darkCleared, over, won, outroT, prevBest, milestone;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }
  function cueBeat(i) { return INTRO + i * RLEN + CUE_REL; }
  function cueTime() { return cueBeat(r) * SPB; }
  function relTime() { return (cueBeat(r) + ROUNDS[r].n) * SPB; }
  function colOf(x) { return x < W / 3 ? 0 : (x < W * 2 / 3 ? 1 : 2); }

  function newRound(i) {
    r = i;
    rs = { phase: 'wait', raised: false, result: '', left: ROUNDS[i] ? ROUNDS[i].n : 0, struck: false };
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashT = 0; flashX = 0; flashY = 0;
    silent = false; dark = 0; lampK = 1; swing = [0, 0, 0]; swingHist = [[], [], []]; malletK = 0; shutterT = 0;
    heldCol = -1; beatGlow = 0; apX = COLX[1];
    score = 0; perfects = 0; goods = 0; misses = 0; cleared = 0; darkCleared = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    newRound(0);
    if (isDemo) startClock();
  }

  function playChunk(h) {
    if (!armed || silent) return;
    var p = h % PHRASE.length;
    game.audio.melody(PHRASE[p], { tempo: BPM, wave: 'square', volume: demoMode ? 0.02 : 0.04, bass: PBASS[p], bassWave: 'triangle', bassVolume: demoMode ? 0.04 : 0.08 });
  }

  // ---- 拍クロック(1本だけ) ----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    onBeat(0);
  }

  function onBeat(k) {
    if (k >= INTRO) {
      var ri = Math.floor((k - INTRO) / RLEN), rel = (k - INTRO) % RLEN;
      if (ri < ROUNDS.length) {
        if (rel === 0) {
          if (ri !== r) newRound(ri);
          silent = false;
          if (ROUNDS[ri].brk) {
            // 予告: 鎧戸が風で鳴る(下がる2音 + 鎧戸が揺れる)
            shutterT = RLEN * SPB * 0.4;
            tone(523, 0.1, { wave: 'square', volume: 0.05 * vol() });
            tone(392, 0.18, { wave: 'square', volume: 0.05 * vol(), slide: -120 });
          }
        }
        if (rel === CUE_REL) {
          // 合図の拍: 師が響き板を打つ
          rs.struck = true;
          swing[ROUNDS[ri].b] = 1;
          malletK = 0;
          tone(196, 0.9, { wave: 'triangle', volume: 0.16 * vol() });
          tone(588, 0.5, { wave: 'sine', volume: 0.06 * vol() });
          game.fx.burst(COLX[ROUNDS[ri].b], BOARD_Y, { color: L0, count: 10, speed: 260 });
          if (ROUNDS[ri].brk) { silent = true; }
        }
      } else {
        silent = false;
      }
    }
    // 押さえている間の灯り(1拍に1つ消える)
    if (rs && rs.phase === 'hold') {
      rs.left = Math.max(0, cueBeat(r) + ROUNDS[r].n - k);
      if (!silent) tone(rs.left === 0 ? 1175 : 880, 0.04, { wave: 'square', volume: 0.04 * vol() });
    }
    if (silent) return;
    beatGlow = 1;
    if (k % 2 === 0) playChunk(k / 2);
    if (k % 4 === 0) tone(147, 0.08, { wave: 'triangle', volume: 0.16 * vol() });
    else tone(440, 0.03, { wave: 'square', volume: 0.04 * vol() });
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    dark += ((silent ? 1 : 0) - dark) * Math.min(1, dt * 8);
    if (r >= ROUNDS.length) return;
    var cue = cueTime(), rel = relTime();
    // 1.5拍前: 師が木槌を振りかぶる(予告)
    if (!rs.raised && songT >= cue - 1.5 * SPB) {
      rs.raised = true;
      tone(330, 0.12, { wave: 'square', volume: 0.05 * vol(), slide: 220 });
    }
    if (rs.raised && rs.phase === 'wait') malletK = Math.min(1, (songT - (cue - 1.5 * SPB)) / (1.5 * SPB));
    if (rs.phase === 'wait' && songT > cue + GOOD_W) missAt(COLX[ROUNDS[r].b], PEDAL_Y, 'late');
    if (rs.phase === 'hold' && songT > rel + GOOD_W) missAt(COLX[ROUNDS[r].b], BOARD_Y, 'over');
    if (!demoMode && !over && r === ROUNDS.length - 1 && rs.phase === 'done' && hitStop <= 0) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
  }

  function judge(off) {
    var a = Math.abs(off);
    return a <= PERFECT_W ? 'PERFECT' : (a <= GOOD_W ? 'GOOD' : 'MISS');
  }

  function award(word, x, y) {
    if (word === 'PERFECT') { perfects++; score += 100; game.feedback.good(x, y, { text: 'PERFECT', color: L0, size: 52, count: 10, volume: armed ? 0.25 : 0.001 }); }
    else { goods++; score += 50; game.feedback.good(x, y, { text: 'GOOD', color: L1, size: 44, count: 6, volume: armed ? 0.2 : 0.001 }); }
  }

  function missAt(x, y, why) {
    rs.phase = 'done'; rs.result = why;
    misses++;
    heldCol = -1;
    hitStop = HIT_STOP; flashT = HIT_STOP; flashX = x; flashY = y;
    game.feedback.bad(x, y - 140, { text: 'MISS', shake: demoMode ? 4 : 10, flashColor: L0, volume: armed ? 0.45 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function pressAction(col) {
    if (!running || r >= ROUNDS.length || hitStop > 0) return 'none';
    heldCol = col;
    if (rs.phase !== 'wait') return 'none';
    var off = songT - cueTime();
    if (!rs.raised) return 'none';                       // 振りかぶる前の手すさびは数えない
    var x = COLX[col];
    if (off < -GOOD_W) { missAt(x, PEDAL_Y, 'early'); return 'miss'; }
    if (col !== ROUNDS[r].b) { missAt(x, PEDAL_Y, 'wrong'); return 'miss'; }
    var w = judge(off);
    rs.phase = 'hold';
    rs.left = ROUNDS[r].n;
    award(w, x, BOARD_Y - BR - 40);
    return 'ok';
  }

  function releaseAction() {
    heldCol = -1;
    if (!running || r >= ROUNDS.length || rs.phase !== 'hold') return 'none';
    var off = songT - relTime();
    var x = COLX[ROUNDS[r].b];
    var w = judge(off);
    if (w === 'MISS') { missAt(x, BOARD_Y, 'short'); return 'miss'; }
    rs.phase = 'done'; rs.result = 'ok';
    swing[ROUNDS[r].b] = 0;
    cleared++;
    award(w, x, BOARD_Y - BR - 40);
    var bonus = ROUNDS[r].brk ? 200 : 100;
    score += bonus;
    if (ROUNDS[r].brk) darkCleared++;
    tone(1568, 0.06, { wave: 'square', volume: 0.06 * vol() });
    game.fx.burst(x, BOARD_Y, { color: L3, count: 14, speed: 300 });
    if (!demoMode && cleared === 2 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(cleared + ' / ' + ROUNDS.length, W / 2, Math.round(H * 0.33), { color: L0, size: 80 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false; silent = false;
    game.audio.stopBgm();
    if (ok) {
      score += cleared * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(600, 1100), { color: i % 2 ? L0 : L1, count: 18, speed: 380 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, Math.round(H * 0.3), { color: L0, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || over || readyT > 0) return;
    if (y < LCD.y) { game.audio.play('se_tap', 0.1); return; }
    var res = pressAction(colOf(x));
    if (res === 'ok') game.audio.play('se_tap', 0.3);
    else if (res === 'none') { game.audio.tone(220, 0.04, { wave: 'square', volume: 0.04 }); game.fx.burst(x, y, { color: L1, count: 4, speed: 120 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || over) { heldCol = -1; return; }
    var res = releaseAction();
    if (res === 'none') game.audio.tone(330, 0.03, { wave: 'square', volume: 0.03 });
  });
  game.onTap(function(x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: L2, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var ELDER = [
    ['...hhhh...', '..hhhhhh..', '.hhssssh..', '.hsesesh..', '.hhssssh..', '..hhhhhhm.', '.hhhhhhhm.', 'hhhhhhhh..', 'hhhhhhhh..', '.hhhhhh...', '.hh..hh...'],
    ['...hhhh..m', '..hhhhhhm.', '.hhssssm..', '.hsessmh..', '.hhssssh..', '..hhhhhh..', '.hhhhhhh..', 'hhhhhhhh..', 'hhhhhhhh..', '.hhhhhh...', '.hh..hh...'],
  ];
  var EPAL = { h: L1, s: L2, e: L0, m: L0 };
  var NOVICE = [
    ['..hhhh..', '.hhhhhh.', '.hssssh.', '.hesesh.', '.hhhhhh.', 'hhhhhhhh', 'hhhhhhhh', '.hhhhhh.', '.h....h.'],
    ['..hhhh..', '.hhhhhh.', '.hssssh.', '.hesesh.', 'shhhhhhs', 'hhhhhhhh', '.hhhhhh.', '.hhhhhh.', 'h......h'],
  ];
  var NPAL = { h: L0, s: L2, e: L0 };

  function drawFrame() {
    // 携帯機の画面枠(本体 → 液晶の縁 → 液晶)
    game.draw.gradient(0, H, [[0, L1], [1, L0]]);
    game.draw.rect(LCD.x - 14, LCD.y - 14, LCD.w + 28, LCD.h + 28, L0);
    game.draw.gradient(LCD.y, LCD.y + LCD.h, [[0, L3], [1, L2]]);
    game.draw.rect(0, LCD.y, LCD.x, LCD.h, L0);
    game.draw.rect(LCD.x + LCD.w, LCD.y, W - LCD.x - LCD.w, LCD.h, L0);
  }

  function drawStore(t) {
    // 石壁(タイル反復)
    for (var y = LCD.y + 20; y < LCD.y + LCD.h - 20; y += 72) {
      var off = (Math.floor((y - LCD.y) / 72) % 2) * 60;
      for (var x = LCD.x + off - 60; x < LCD.x + LCD.w; x += 120) game.draw.rect(x + 4, y + 4, 112, 64, L2, 0.45);
    }
    // 鎧戸の窓(右上)。予告で揺れて風の線
    var wx = 760, wy = 300;
    game.draw.rect(wx, wy, 220, 170, L0);
    game.draw.rect(wx + 10, wy + 10, 200, 150, L1);
    var flap = shutterT > 0 ? Math.sin(t * 40) * 26 : 0;
    for (var s = 0; s < 4; s++) game.draw.rect(wx + 14, wy + 16 + s * 36 + flap * (s % 2 ? 0.4 : -0.4), 192, 22, L2);
    if (shutterT > 0) for (var wl = 0; wl < 3; wl++) game.draw.line(wx - 40 - wl * 90, wy + 60 + wl * 40, wx - 160 - wl * 90, wy + 70 + wl * 40, L1, 6);
    // 灯明(左上)。灯の消えた回は火が消えて煙
    var lx = 120, ly = 330;
    game.draw.rect(lx - 10, ly, 20, 90, L0);
    if (dark < 0.5) {
      var fl = 1 + Math.sin(t * 13) * 0.15;
      game.draw.circle(lx, ly - 16, 20 * fl, L1);
      game.draw.circle(lx, ly - 10, 10 * fl, L3);
    } else {
      for (var sm = 0; sm < 3; sm++) game.draw.circle(lx + Math.sin(t * 2 + sm) * 10, ly - 30 - sm * 26 - (t * 30) % 26, 8 + sm * 3, L1, 0.5);
    }
    // 梁と拍の灯(4つ)
    game.draw.rect(LCD.x, BEAM_Y - 22, LCD.w, 44, L0);
    game.draw.rect(LCD.x, BEAM_Y - 22, LCD.w, 8, L1);
    var pos = beatN % 4;
    for (var i = 0; i < 4; i++) {
      var bx = 330 + i * 140, by = BEAM_Y - 70;
      var on = running && !silent && pos === i;
      game.draw.rect(bx - 22, by - 30, 44, 60, L0);
      game.draw.rect(bx - 16, by - 24, 32, 48, on ? L3 : (silent ? L0 : L1));
      if (on && i === 0) game.draw.circle(bx, by, 40, L3, 0.35 * beatGlow);
    }
  }

  function boardOffset(i, tt) { return Math.sin(tt * 18) * swing[i] * 26; }

  function drawBoards(t) {
    var rd = ROUNDS[Math.min(r, ROUNDS.length - 1)];
    for (var i = 0; i < 3; i++) {
      var ox = hitStop > 0 && flashX === COLX[i] ? 0 : boardOffset(i, t);
      var x = COLX[i] + ox, y = BOARD_Y;
      // 残像(前の数フレームの位置を薄く)
      var hist = swingHist[i];
      for (var hh = 0; hh < hist.length; hh++) game.draw.circle(COLX[i] + hist[hh], y, BR, L1, 0.12);
      game.draw.line(COLX[i] - 60, BEAM_Y + 20, x - 50, y - BR + 10, L0, 6);
      game.draw.line(COLX[i] + 60, BEAM_Y + 20, x + 50, y - BR + 10, L0, 6);
      var target = running && rs && r < ROUNDS.length && i === rd.b && (rs.raised || rs.phase === 'hold');
      var hit = flashT > 0 && Math.abs(flashX - COLX[i]) < 2 && flashY === BOARD_Y;
      var sc = hit ? 1 + (flashT / HIT_STOP) * 0.25 : 1;
      game.draw.circle(x, y, (BR + 10) * sc, L0);
      game.draw.circle(x, y, BR * sc, hit ? L3 : L1);
      game.draw.circle(x - 34, y - 34, 30 * sc, L2, 0.6);
      game.draw.circle(x, y, 26 * sc, L0);
      if (target && Math.floor(t * 8) % 2 === 0 && rs.phase === 'wait') game.draw.circle(x, y, BR + 30, L0, 0.25);
      // 灯り(示された拍数)。押さえている間は1拍に1つ消える。灯の消えた回は見えない
      if (i === rd.b && rs && r < ROUNDS.length && rs.phase !== 'done') {
        var n = rd.n, left = rs.phase === 'hold' ? rs.left : n;
        for (var d = 0; d < n; d++) {
          var a = -Math.PI / 2 + (d - (n - 1) / 2) * 0.48;
          var dx = x + Math.cos(a) * (BR - 34), dy = y + Math.sin(a) * (BR - 34) + 10;
          if (dark > 0.5 && rs.phase === 'hold') { game.draw.circle(dx, dy, 13, L0, 0.6); continue; }
          game.draw.circle(dx, dy, 15, L0);
          game.draw.circle(dx, dy, 11, d < left ? L3 : L0);
        }
      }
    }
    // 師(左上の台)。振りかぶると木槌が狙う板へ向く
    var ex = 250, ey = BEAM_Y - 150;
    game.draw.sprite(ELDER[malletK > 0.5 ? 1 : 0], EPAL, ex, ey + Math.sin(t * 1.5) * 3, 11, { anchor: 'center' });
    if (rs && r < ROUNDS.length && malletK > 0) {
      var tx = COLX[rd.b], ty = BOARD_Y - BR;
      var mx = ex + 60 + (tx - ex - 60) * 0.35 * malletK, my = ey + (ty - ey) * 0.35 * malletK;
      game.draw.line(ex + 50, ey, mx, my, L0, 8);
      game.draw.rect(mx - 20, my - 14, 40, 28, L0);
    }
  }

  function drawPedals(t) {
    var rd = ROUNDS[Math.min(r, ROUNDS.length - 1)];
    for (var i = 0; i < 3; i++) {
      var x = COLX[i];
      var down = heldCol === i;
      game.draw.line(x, BOARD_Y + BR + 10, x, PEDAL_Y - 70, L1, 4);
      var py = PEDAL_Y + (down ? 14 : 0);
      var hit = flashT > 0 && flashX === x && flashY === PEDAL_Y;
      var sc = hit ? 1 + (flashT / HIT_STOP) * 0.3 : 1;
      game.draw.rect(x - 130 * sc, py - 60 * sc, 260 * sc, 120 * sc, L0);
      game.draw.rect(x - 118 * sc, py - 48 * sc, 236 * sc, 96 * sc, hit ? L3 : (down ? L1 : L2));
      game.draw.rect(x - 118 * sc, py - 48 * sc, 236 * sc, 14, L3, down ? 0.2 : 0.6);
      if (running && rs && r < ROUNDS.length && i === rd.b && rs.raised && rs.phase === 'wait' && Math.floor(t * 8) % 2 === 0) {
        game.draw.rect(x - 140, py - 70, 280, 8, L0);
        game.draw.rect(x - 140, py + 62, 280, 8, L0);
      }
    }
    // 見習い修道士(押している列へ寄る)
    var want = heldCol >= 0 ? COLX[heldCol] : (rs && r < ROUNDS.length && rs.raised ? COLX[rd.b] : COLX[1]);
    apX += (want - apX) * 0.2;
    var nf = heldCol >= 0 ? 1 : Math.floor(t * 3) % 2;
    game.draw.sprite(NOVICE[nf], NPAL, apX, PEDAL_Y - 180 + (heldCol >= 0 ? 8 : 0), 12, { anchor: 'center' });
  }

  function drawDark() {
    if (dark < 0.02) return;
    game.draw.rect(LCD.x, LCD.y, LCD.w, LCD.h, L0, 0.45 * dark);
  }

  function drawScene(t) {
    drawFrame();
    drawStore(t);
    drawBoards(t);
    drawDark();
    drawPedals(t);
  }

  function drawHud() {
    label('SCORE ' + score, 50, 92, 50, L3, 'left');
    label('BEST ' + prevBest, 50, 160, 30, L2, 'left');
    label(Math.min(r + 1, ROUNDS.length) + ' / ' + ROUNDS.length, W - 50, 92, 54, L3, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.rect(W - 250 + i * 70, 140, 40, 40, i < misses ? L3 : L1);
    var total = (INTRO + ROUNDS.length * RLEN) * SPB;
    game.draw.rect(LCD.x, 208, LCD.w, 12, L1);
    game.draw.rect(LCD.x, 208, LCD.w * Math.min(1, songT / total), 12, L3);
  }

  // ---- ATTRACT: 実ロジックで 1回目ぴったり → 2回目(灯が消える回)押しすぎてMISS → 3回目ぴったり ----
  var demo = { t: 0, press: false, hx: COLX[1], hy: PEDAL_Y + 30 };
  var DEMO_BEATS = INTRO + 3 * RLEN;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = false; }
    if (r < ROUNDS.length && hitStop <= 0) {
      var nt = songT + dt;
      var col = ROUNDS[r].b;
      if (rs.phase === 'wait' && rs.raised && nt >= cueTime() - 0.01) { pressAction(col); demo.press = true; }
      else if (rs.phase === 'hold') {
        var late = r === 1 ? 0.32 : 0;
        if (nt >= relTime() + late - 0.01) { releaseAction(); demo.press = false; }
      }
      if (rs.phase === 'done') { demo.press = false; heldCol = -1; }
      var tx = rs.raised || rs.phase === 'hold' ? COLX[col] : COLX[1];
      demo.hx += (tx + 40 - demo.hx) * Math.min(1, dt * 8);
    }
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (shutterT > 0) shutterT -= dt;
    if (beatGlow > 0) beatGlow -= dt * 4;
    for (var i = 0; i < 3; i++) {
      if (hitStop <= 0 && swing[i] > 0) swing[i] = Math.max(0, swing[i] - dt * 0.5);
      swingHist[i].push(boardOffset(i, t));
      if (swingHist[i].length > 4) swingHist[i].shift();
    }

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      label(GAME_TITLE, W / 2, 110, 84 + Math.sin(t * 3) * 3, L3);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, L2);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, Math.round(H * 0.6), 50, L0);
      else label('TAP TO START', W / 2, Math.round(H * 0.6), 46, L0);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, Math.round(H * 0.26), W - 180, 560, L3, 0.94);
      game.draw.rect(90, Math.round(H * 0.26), W - 180, 12, L0);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, Math.round(H * 0.26) + 130, 100, L0);
      label('SCORE ' + score, W / 2, Math.round(H * 0.26) + 230, 58, L0);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, Math.round(H * 0.26) + 310, 34, L1);
      label(cleared + ' / ' + ROUNDS.length, W / 2, Math.round(H * 0.26) + 380, 44, L1);
      if (won && score > prevBest) label('NEW RECORD', W / 2, Math.round(H * 0.26) + 470, 54, L0);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, Math.round(H * 0.26) + 470, 42, L0);
      if (!won) label('あと' + Math.max(1, ROUNDS.length - cleared) + '枚!', W / 2, Math.round(H * 0.24), 54, L0);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, Math.round(H * 0.95), 40, L3);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, cleared: cleared, darkCleared: darkCleared, perfect: perfects, good: goods, miss: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.6), 110, L0);
    if (over && won) label('FINISH', W / 2, Math.round(H * 0.6), 100, L0);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
