// K-DS-0017v3-toybox-jack-spring.js
// びっくり箱の早跳ね — おもちゃ箱の蓋の鍵穴灯が拍を刻む中、拍に食い込む裏の8分で蓋が開いて光の色が変わる瞬間に、ライバルの人形たちより早く跳ね出す
// 操作: 画面のどこでも押すと手前のびっくり人形が跳ね出す。蓋の留め金が1.5拍前からカチカチ鳴り、鍵穴灯のまわりの8つの点のうち蓋が開く裏の8分が点滅する(予告)。蓋が開いて灯りが青に変わる瞬間に押す。開いた瞬間からのずれでPERFECT/GOOD、奥の3体より早ければ一番乗りの冠。予告中の早押し(閉じた蓋に頭をぶつける)・押し遅れはMISS。予告なしに灯りが黄色くちらつくのは蓋のがたつき(押すとMISS)。後半ほどライバルが速くなる
// 終わり: 30拍(約14秒・蓋が開く9回)を終えて MISS 2回以内ならCLEAR(判定の点+冠ボーナス)。MISS 3回でGAME OVER
// @mechanic: reaction_duel
// @theme: toybox_jack_spring_race
// 世界観: 夜の子ども部屋のおもちゃ箱の中で、ばね仕掛けのびっくり人形たちが鍵穴の灯りが刻む拍を聞きながら潜み、蓋が開く瞬間を狙って誰より先に跳ね出そうと競う
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・一番乗りの冠の数・最速の反応秒
// スタイル: 80s NEON
var STYLE = { bg: ['#05051a', '#160c46'], main: ['#00f0ff', '#ff2bd6', '#ffe94a'], accent: ['#ffffff', '#7b5cff'] };

(function(game) {
  // 80s NEON: 濃紺〜黒グラデに発光4色(シアン・マゼンタ・イエロー・白)。同色の太い半透明線を重ねた疑似グロー、点滅が命
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1],
    cyan: STYLE.main[0], pink: STYLE.main[1], yellow: STYLE.main[2],
    white: STYLE.accent[0], violet: STYLE.accent[1], ink: '#05051a', red: '#ff3d5a',
  };

  var GAME_TITLE = 'JACK POP';
  var BPM = 126;
  var SPB = 60 / BPM;
  var E8 = SPB / 2;                     // 8分 = 拍クロックの半分
  var GO = [3.5, 6.5, 9.5, 13.5, 15.5, 19.5, 22.5, 25.5, 28.5];   // 蓋が開く(すべて裏の8分=食い)
  var DECOY = [11.5, 17.5];                                        // 予告なしのがたつき
  var RIVAL_BEST = [0.19, 0.18, 0.16, 0.15, 0.14, 0.13, 0.12, 0.11, 0.1];   // 後半ほど奥の人形が速い
  var TOTAL_BEATS = 30;
  var TELE = 1.5;                       // 予告の拍数(約0.71秒)
  var PERFECT_W = 0.07;
  var GOOD_W = 0.18;
  var DECOY_W = 0.22;
  var MISS_MAX = 3;
  var HIT_STOP = 0.45;
  var TIME_LIMIT = 14.6;
  var LID_Y = Math.round(H * 0.13), LID_H = Math.round(H * 0.13);
  var LAMP_X = W / 2, LAMP_Y = LID_Y + LID_H / 2;
  var RIVAL_Y = Math.round(H * 0.47), PLAYER_Y = Math.round(H * 0.74);
  var RIVAL_X = [220, 540, 860];

  // 跳ねるシンコペーションの歌(オリジナル)。小節頭で1小節ずつ鳴らす
  var MEL = [
    [['E5', 0.5], ['G5', 1], ['A5', 0.5], ['R', 0.5], ['G5', 1], ['E5', 0.5]],
    [['D5', 0.5], ['E5', 1], ['G5', 1], ['E5', 0.5], ['D5', 1]],
    [['C5', 0.5], ['E5', 1], ['G5', 0.5], ['R', 0.5], ['A5', 1], ['G5', 0.5]],
    [['E5', 1.5], ['D5', 1], ['C5', 1.5]],
  ];
  var BASS = [
    [['A2', 1.5], ['A2', 0.5], ['R', 0.5], ['E3', 1], ['G2', 0.5]],
    [['G2', 1.5], ['G2', 0.5], ['R', 0.5], ['D3', 1], ['G2', 0.5]],
    [['F2', 1.5], ['F2', 0.5], ['R', 0.5], ['C3', 1], ['F2', 0.5]],
    [['E2', 1.5], ['E2', 0.5], ['R', 0.5], ['B2', 1], ['E2', 0.5]],
  ];

  var EVENTS = [];
  for (var gi = 0; gi < GO.length; gi++) EVENTS.push({ b: GO[gi], kind: 'go', i: gi });
  for (var di = 0; di < DECOY.length; di++) EVENTS.push({ b: DECOY[di], kind: 'decoy', i: di });
  EVENTS.sort(function(a, b) { return a.b - b.b; });

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, e8N, e8T, songT, readyT, hitStop, flashT, evs;
  var lampPulse, lampMode, lampModeT, lidOpen, lidShake, latchT, teleE8, me, rivals, crownOwner, crownT;
  var score, combo, perfects, goods, misses, crowns, fastest, over, won, outroT, prevBest, milestone;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; e8N = 0; e8T = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashT = 0;
    evs = [];
    for (var i = 0; i < EVENTS.length; i++) evs.push({ b: EVENTS[i].b, kind: EVENTS[i].kind, i: EVENTS[i].i, res: '', opened: false });
    lampPulse = 0; lampMode = 'beat'; lampModeT = 0; lidOpen = 0; lidShake = 0; latchT = 0; teleE8 = -1;
    me = { up: 0, popAt: -9, bonk: false, wiggle: 0 };
    rivals = [{ up: 0, popAt: -9 }, { up: 0, popAt: -9 }, { up: 0, popAt: -9 }];
    crownOwner = -2; crownT = 0;
    score = 0; combo = 0; perfects = 0; goods = 0; misses = 0; crowns = 0; fastest = 9;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ。8分に割って刻む) ----
  function startClock() {
    running = true; e8N = 0; e8T = 0; songT = 0;
    onEighth(0);
  }

  function rivalDelay(ev, j) {
    var base = RIVAL_BEST[ev.i];
    var rank = (j - ev.i % 3 + 3) % 3;    // 一番速い人形は回ごとに入れ替わる
    return base + rank * 0.04;
  }

  function onEighth(e) {
    var beat = e / 2;
    if (beat >= TOTAL_BEATS) return;
    // 伴奏: 小節頭で1小節、拍で太鼓、8分でハイハット
    if (e % 8 === 0 && armed && e + 8 <= TOTAL_BEATS * 2) {
      var bar = (e / 8) % 4;
      game.audio.melody(MEL[bar], { tempo: BPM, wave: 'square', volume: demoMode ? 0.02 : 0.04, bass: BASS[bar], bassWave: 'sawtooth', bassVolume: demoMode ? 0.025 : 0.05 });
    }
    tone(5200, 0.015, { wave: 'square', volume: 0.012 * vol() });
    if (e % 2 === 0) {
      lampPulse = 1;
      if (e % 4 === 0) tone(70, 0.1, { wave: 'sine', volume: 0.22 * vol(), slide: -30 });
      else tone(200, 0.05, { wave: 'square', volume: 0.06 * vol() });
    }
    for (var i = 0; i < evs.length; i++) {
      var ev = evs[i];
      var ce = Math.round(ev.b * 2);
      if (ev.kind === 'go' && e >= ce - TELE * 2 && e < ce) {
        // 予告: 留め金がカチカチ鳴り、開く8分の点が点滅
        latchT = 0.12; teleE8 = ce % 8;
        tone(1800 + (e - ce + 3) * 300, 0.03, { wave: 'square', volume: 0.07 * vol() });
      }
      if (e === ce) {
        ev.opened = true;
        if (ev.kind === 'go') {
          lampMode = 'open'; lampModeT = SPB * 0.9; lidOpen = 1; teleE8 = -1;
          tone(1320, 0.05, { wave: 'square', volume: 0.1 * vol() });
          tone(1760, 0.08, { wave: 'triangle', volume: 0.08 * vol() });
          game.fx.burst(LAMP_X, LID_Y + LID_H, { color: C.cyan, count: 14, speed: 360 });
        } else {
          lampMode = 'rattle'; lampModeT = 0.25; lidShake = 0.3;
          tone(150, 0.06, { wave: 'square', volume: 0.08 * vol() });
          tone(170, 0.06, { wave: 'square', volume: 0.08 * vol() });
        }
      }
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    e8T += dt;
    while (e8T >= E8) { e8T -= E8; e8N++; onEighth(e8N); }
    songT = e8N * E8 + e8T;
    for (var i = 0; i < evs.length; i++) {
      var ev = evs[i];
      var c = ev.b * SPB;
      if (ev.kind === 'go') {
        for (var j = 0; j < 3; j++) {
          var rt = c + rivalDelay(ev, j);
          if (rivals[j].popAt < rt - 0.01 && songT >= rt && songT < rt + 0.2) {
            rivals[j].popAt = songT;
            tone(500 + j * 90, 0.08, { wave: 'triangle', volume: 0.04 * vol(), slide: 400 });
            // 手前の人形より先に跳ねた一番速い人形が冠を取る
            if (ev.res !== 'ok' && rivalDelay(ev, j) === RIVAL_BEST[ev.i]) { crownOwner = j; crownT = SPB * 1.2; }
          }
        }
        if (!ev.res && songT > c + GOOD_W) { ev.res = 'miss'; missFx('asleep'); }
      } else if (!ev.res && songT > c + DECOY_W) {
        ev.res = 'pass';
        game.fx.popup('NICE', LAMP_X, LID_Y + LID_H + 70, { color: C.yellow, size: 40 });
        score += 30;
      }
    }
    if (!demoMode && !over && songT > TOTAL_BEATS * SPB - 0.1) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
  }

  function missFx(why) {
    misses++; combo = 0;
    hitStop = HIT_STOP; flashT = HIT_STOP;
    if (why === 'early' || why === 'fooled') { me.bonk = true; me.popAt = songT; }
    game.feedback.bad(W / 2, PLAYER_Y - 300, { text: 'MISS', shake: demoMode ? 4 : 12, volume: armed ? 0.45 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  // 押した瞬間の判定(入力とデモで共通)
  function tapAction() {
    if (!running || over || hitStop > 0) return 'none';
    for (var i = 0; i < evs.length; i++) {
      var ev = evs[i];
      if (ev.res) continue;
      var c = ev.b * SPB;
      var off = songT - c;
      if (ev.kind === 'go') {
        if (songT < c - TELE * SPB || off > GOOD_W) continue;
        if (off < -PERFECT_W) { ev.res = 'miss'; missFx('early'); return 'miss'; }
        ev.res = 'ok';
        me.bonk = false; me.popAt = songT;
        combo++;
        var react = Math.max(0, off);
        if (react < fastest) fastest = react;
        var first = off < RIVAL_BEST[ev.i];
        if (Math.abs(off) <= PERFECT_W) {
          perfects++; score += 100 + Math.min(combo, 8) * 10;
          game.feedback.good(W / 2, PLAYER_Y - 360, { text: 'PERFECT', color: C.cyan, size: 56, count: 14, volume: armed ? 0.25 : 0.001 });
        } else {
          goods++; score += 50;
          game.feedback.good(W / 2, PLAYER_Y - 360, { text: 'GOOD', color: C.pink, size: 46, count: 8, volume: armed ? 0.2 : 0.001 });
        }
        if (first) {
          crowns++; score += 100; crownOwner = -1; crownT = SPB * 1.2;
          tone(2093, 0.1, { wave: 'square', volume: 0.06 * vol() });
          if (!demoMode && crowns === 4 && !milestone) {
            milestone = true;
            game.audio.play('se_milestone', 0.45);
            game.fx.popup(crowns + ' / ' + GO.length, W / 2, Math.round(H * 0.38), { color: C.yellow, size: 84 });
          }
        }
        if (armed) game.audio.play('se_jump', 0.3 * vol());
        return 'ok';
      }
      if (off >= -0.1 && off <= DECOY_W) { ev.res = 'miss'; missFx('fooled'); return 'miss'; }
    }
    return 'none';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += crowns * 50;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(700, 1300), { color: i % 2 ? C.cyan : C.pink, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, Math.round(H * 0.38), { color: C.yellow, size: 72 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || over || readyT > 0) return;
    var r = tapAction();
    if (r === 'none') {
      // 何もない時の手すさび: 箱がかたっと揺れるだけ
      me.wiggle = 0.2;
      game.audio.tone(330, 0.03, { wave: 'square', volume: 0.04 });
      game.fx.burst(x, y, { color: C.violet, count: 4, speed: 120 });
    }
  });
  game.onTap(function(x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz + 2, color: col + '55', bold: true, align: align || 'center' });
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function glowLine(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, col + '22', w * 4);
    game.draw.line(x1, y1, x2, y2, col + '55', w * 2);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function glowBox(x, y, w, h, col, lw) {
    glowLine(x, y, x + w, y, col, lw); glowLine(x + w, y, x + w, y + h, col, lw);
    glowLine(x + w, y + h, x, y + h, col, lw); glowLine(x, y + h, x, y, col, lw);
  }
  function glowDot(x, y, r, col, a) {
    game.draw.circle(x, y, r * 1.7, col, 0.12 * a);
    game.draw.circle(x, y, r * 1.25, col, 0.3 * a);
    game.draw.circle(x, y, r, col, a);
  }

  var JACK = [
    ['....yy....', '...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '.wwwwwwww.', 'wwkwwwwkww', 'wwwwwwwwww', 'wwrwwwwrww', '.wwrrrrww.', '..wwwwww..', '.cccccccc.', 'c.c.c.c.c.'],
    ['....yy....', '...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '.wwwwwwww.', 'wkkwwwwkkw', 'wwwwwwwwww', 'wwwwrrwwww', '.wwwrrwww.', '..wwwwww..', '.cccccccc.', 'c.c.c.c.c.'],
    ['....yy....', '...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '.wwwwwwww.', 'ww-wwww-ww', 'wwwwwwwwww', 'wwwrrrrwww', '.wwwwwwww.', '..wwwwww..', '.cccccccc.', 'c.c.c.c.c.'],
  ];
  var CROWN = ['y.y.y', 'yyyyy', 'yyyyy'];
  var RIVAL_COL = [C.pink, C.yellow, C.white];

  function drawRoom(t) {
    game.draw.gradient(0, H, [[0, C.bg0], [0.5, C.bg1], [1, C.bg0]]);
    // 箱の内側の奥行き(遠近の線)と床のネオングリッド
    var vx = W / 2, vy = Math.round(H * 0.56);
    for (var i = 0; i <= 10; i++) {
      var x = -200 + i * 148;
      game.draw.line(x, H, vx + (x - vx) * 0.25, vy, C.violet + '66', 3);
    }
    for (var k = 0; k < 9; k++) {
      var f = (k + (songT / SPB) % 1) / 9;
      var y = vy + (H - vy) * f * f;
      game.draw.line(0, y, W, y, C.violet + '55', 3);
    }
    // 壁の積み木と星のシール(点滅)
    for (var s = 0; s < 14; s++) {
      var sx = 60 + (s * 233) % 980, sy = LID_Y + LID_H + 60 + (s * 131) % 420;
      var on = Math.floor(t * 3 + s) % 3 === 0;
      game.draw.circle(sx, sy, on ? 6 : 3, s % 2 ? C.cyan : C.pink, on ? 0.9 : 0.4);
    }
  }

  function drawLid(t) {
    var shake = lidShake > 0 ? Math.sin(t * 90) * 10 : 0;
    var open = lidOpen;
    // 蓋が開くと上から光が差す
    if (open > 0) {
      for (var r = 0; r < 6; r++) game.draw.line(LAMP_X - 400 + r * 160, LID_Y + LID_H, LAMP_X - 600 + r * 240, H * 0.7, C.cyan + '18', 90);
      game.draw.rect(60, LID_Y + LID_H, W - 120, 40 * open, C.cyan, 0.85);
    }
    game.draw.rect(40 + shake, LID_Y - open * 40, W - 80, LID_H, '#0c0a2a');
    glowBox(40 + shake, LID_Y - open * 40, W - 80, LID_H, C.pink, 5);
    for (var p = 0; p < 6; p++) glowLine(120 + p * 170 + shake, LID_Y + 30 - open * 40, 180 + p * 170 + shake, LID_Y + LID_H - 30 - open * 40, C.violet, 2);
    // 留め金(予告で光る)
    var lc = latchT > 0 ? C.white : C.yellow;
    game.draw.rect(LAMP_X - 70 + shake, LID_Y + LID_H - 18 - open * 40, 140, 30, lc, latchT > 0 ? 1 : 0.6);
    // 鍵穴灯(合図灯): 拍でマゼンタ、開くと青、がたつきは黄色
    var col = lampMode === 'open' ? C.cyan : (lampMode === 'rattle' ? (Math.floor(t * 30) % 2 ? C.yellow : C.ink) : C.pink);
    var a = lampMode === 'beat' ? 0.35 + lampPulse * 0.65 : 1;
    glowDot(LAMP_X + shake, LAMP_Y - open * 40, 52, col, a);
    game.draw.circle(LAMP_X + shake, LAMP_Y - 10 - open * 40, 14, C.ink);
    game.draw.rect(LAMP_X - 7 + shake, LAMP_Y - 10 - open * 40, 14, 34, C.ink);
    // 1小節8分の点(今の8分が白、予告の8分が青く点滅)
    var cur = running ? e8N % 8 : -1;
    for (var q = 0; q < 8; q++) {
      var qx = LAMP_X - 350 + q * 100, qy = LID_Y + LID_H + 80;
      var onBeat = q % 2 === 0;
      var tele = q === teleE8 && Math.floor(t * 12) % 2 === 0;
      var dc = tele ? C.cyan : (q === cur ? C.white : (onBeat ? C.pink : C.violet));
      glowDot(qx, qy, onBeat ? 16 : 11, dc, q === cur || tele ? 1 : 0.4);
    }
  }

  function spring(x, yBase, h, col, wd) {
    var n = 8, px = x, py = yBase;
    for (var i = 1; i <= n; i++) {
      var nx = x + (i % 2 ? wd : -wd) * (i === n ? 0 : 1), ny = yBase - h * i / n;
      glowLine(px, py, nx, ny, col, 4);
      px = nx; py = ny;
    }
  }

  function jackUp(j, t) {
    var dtp = songT - j.popAt;
    if (dtp < 0 || dtp > 0.62) return 0;
    if (dtp < 0.1) return dtp / 0.1;
    if (dtp < 0.45) return 1 + Math.sin((dtp - 0.1) * 30) * 0.06 * (1 - (dtp - 0.1) / 0.35);
    return 1 - (dtp - 0.45) / 0.17;
  }

  function drawBox(x, y, w, h, col, up, rise, px, frame, hatCol, crown, flash) {
    var top = y - h / 2;
    var headY = top - 10 - rise * up;
    if (up > 0.02) spring(x, top, rise * up, col, w * 0.12);
    var pal = { y: C.yellow, h: hatCol, w: flash ? C.white : '#f4eaff', k: C.ink, '-': C.ink, r: C.pink, c: col };
    if (up > 0.02 || flash) game.draw.sprite(JACK[frame], pal, x, headY - px * 5, px * (flash ? 1.3 : 1), { anchor: 'center' });
    if (crown) game.draw.sprite(CROWN, { y: C.yellow }, x, headY - px * 13, px * 1.2, { anchor: 'center' });
    game.draw.rect(x - w / 2, top, w, h, '#0c0a2a');
    glowBox(x - w / 2, top, w, h, col, 5);
    glowLine(x - w / 2, top + 22, x + w / 2, top + 22, col, 2);
    game.draw.circle(x, y + 10, h * 0.18, col, 0.5);
  }

  function drawJacks(t) {
    for (var j = 0; j < 3; j++) {
      var ru = jackUp(rivals[j], t);
      drawBox(RIVAL_X[j], RIVAL_Y, 180, 130, RIVAL_COL[j], ru, 170, 8, 1, RIVAL_COL[j], crownOwner === j && crownT > 0, false);
    }
    var up = jackUp(me, t);
    var flash = flashT > 0 && me.bonk;
    if (flash) up = Math.max(up, 0.25);
    var wig = me.wiggle > 0 ? Math.sin(t * 60) * 8 : 0;
    var fr = flash ? 2 : (up > 0.5 ? 1 : 0);
    drawBox(W / 2 + wig, PLAYER_Y, 320, 230, C.cyan, up, 330, 15, fr, C.cyan, crownOwner === -1 && crownT > 0, flash);
    if (flash) glowDot(W / 2, PLAYER_Y - 200, 70 * (1 + flashT), C.red, 0.4);
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.16); }

  function drawScene(t) {
    drawRoom(t);
    drawLid(t);
    drawJacks(t);
    scanlines();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, LID_Y - 20, C.ink, 0.85);
    label('SCORE ' + score, 50, 96, 52, C.white, 'left');
    label('BEST ' + prevBest, 50, 164, 30, C.cyan, 'left');
    game.draw.sprite(CROWN, { y: C.yellow }, W - 260, 92, 12, { anchor: 'center' });
    label(String(crowns), W - 170, 112, 56, C.yellow, 'center');
    for (var m = 0; m < MISS_MAX; m++) glowDot(W - 210 + m * 64, 172, 14, m < misses ? C.red : C.violet, m < misses ? 1 : 0.4);
    game.draw.rect(0, LID_Y - 24, W * Math.min(1, songT / (TOTAL_BEATS * SPB)), 6, C.pink);
  }

  // ---- ATTRACT: 実ロジックで 開いた瞬間ぴったり(冠) → 少し遅れてGOOD(冠は奥の人形)→ がたつきにつられてMISS → ぴったり ----
  var demo = { t: 0, press: 0, done: {} };
  var DEMO_BEATS = 15;
  var DEMO_TAPS = [[3.5, 0], [6.5, 0.04], [9.5, 0.17], [11.5, 0.05], [13.5, 0]];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = {}; }
    for (var i = 0; i < DEMO_TAPS.length; i++) {
      var at = DEMO_TAPS[i][0] * SPB + DEMO_TAPS[i][1];
      if (!demo.done[i] && songT + dt >= at) { demo.done[i] = true; demo.press = 0.18; tapAction(); }
    }
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (lampPulse > 0) lampPulse -= dt * 4;
    if (lampModeT > 0) { lampModeT -= dt; if (lampModeT <= 0) lampMode = 'beat'; }
    if (lidOpen > 0 && lampMode !== 'open') lidOpen = Math.max(0, lidOpen - dt * 4);
    if (lidShake > 0) lidShake -= dt;
    if (latchT > 0) latchT -= dt;
    if (crownT > 0) crownT -= dt;
    if (me.wiggle > 0) me.wiggle -= dt;
    if (demo.press > 0) demo.press -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(W / 2 + 60, PLAYER_Y + 190, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, LID_Y - 20, C.ink, 0.85);
      label(GAME_TITLE, W / 2, 112, 88 + Math.sin(t * 3) * 3, C.cyan);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, C.yellow);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, Math.round(H * 0.94), 50, C.pink);
      else label('TAP TO START', W / 2, Math.round(H * 0.94), 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      var ry = Math.round(H * 0.3);
      game.draw.rect(70, ry, W - 140, 600, C.ink, 0.88);
      glowBox(70, ry, W - 140, 600, won ? C.cyan : C.red, 4);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, ry + 130, 100, won ? C.cyan : C.red);
      label('SCORE ' + score, W / 2, ry + 230, 58, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, ry + 310, 34, C.pink);
      game.draw.sprite(CROWN, { y: C.yellow }, W / 2 - 150, ry + 370, 12, { anchor: 'center' });
      label(crowns + ' / ' + GO.length, W / 2 - 20, ry + 390, 44, C.yellow, 'left');
      if (fastest < 9) label((Math.round(fastest * 100) / 100).toFixed(2), W / 2 + 230, ry + 390, 40, C.cyan);
      if (won && score > prevBest) label('NEW RECORD', W / 2, ry + 490, 54, C.yellow);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, ry + 490, 42, C.yellow);
      if (!won) label('あと' + Math.max(1, GO.length - perfects - goods) + '回!', W / 2, ry - 50, 54, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, Math.round(H * 0.94), 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, crowns: crowns, perfect: perfects, good: goods, miss: misses, fastest: fastest < 9 ? Math.round(fastest * 1000) / 1000 : null };
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
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.36), 110, C.yellow);
    if (over && won) label('FINISH', W / 2, Math.round(H * 0.36), 100, C.cyan);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
