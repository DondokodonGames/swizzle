// K-DS-0010v2-gorge-pool-brother-dive.js
// 淵の兄弟ダイブ — 兄が指で示した拍数だけ構えを押し続け、兄の跳ぶ拍で離して淵へ同時に飛び込む。音の抜ける小節も拍を数える
// 操作: 1回は2小節。1拍目に兄が上げた指の数(N)を見る。兄が跳ぶ拍(2小節目の3拍目)のちょうどN拍前の拍の頭で押してかがみ、押し続けて兄が跳ぶ拍の頭で離す。押す瞬間と離す瞬間の両方を拍の頭からのずれで判定(PERFECT/GOOD/MISS)。早押し・遅押し・早離し・押しすぎはMISS。2回目以降は伴奏と拍の灯が途中で抜ける(抜ける拍は白抜きの灯で予告)ので、無音の間も自分で拍を数える
// 終わり: 4回(3拍・2拍・4拍・5拍)を飛び終えて MISS 2回以内ならCLEAR(判定の点+そろい飛びボーナス)。MISS 3回でGAME OVER
// @mechanic: hold_duration
// @theme: gorge_pool_brother_dive
// 世界観: 夏の渓流の岩場で、川遊びの兄弟が淵の上の岩に並び、兄の指で示された拍数だけかがんで構え続け、兄の跳ぶ拍で手を離して深い淵へ息を合わせて飛び込む
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・そろって飛べた回数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var STYLE = { bg: ['#c4eaf8', '#aee0f3', '#ffffff'], main: ['#27b1a1', '#1d6f93', '#97a6b2'], accent: ['#ff8a3d', '#ffd23f'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影もグラデもほぼ無いベタ塗り。丸角・大きい余白・アイコン的な形。判定はUIの色の変化で見せる
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], white: STYLE.bg[2],
    pool: STYLE.main[0], deep: STYLE.main[1], rock: STYLE.main[2],
    orange: STYLE.accent[0], yellow: STYLE.accent[1],
    rock2: '#7d8d99', leaf: '#62c48e', leaf2: '#45a978', ink: '#22333e', skin: '#f6c89c', red: '#ff5a5f', mute: '#d3dee6', fall: '#e9f8ff'
  };

  var GAME_TITLE = 'BROTHER DIVE';
  var BPM = 132;
  var SPB = 60 / BPM;
  var RB = 8;                 // 1回 = 2小節
  var SIG = 6;                // 兄が跳ぶ拍(2小節目の3拍目)
  var PERFECT_W = 0.07;
  var GOOD_W = 0.15;
  var LEAD = 0.06;            // melody は0.06秒遅れて鳴るので先に積む
  var MISS_MAX = 3;
  var TIME_LIMIT = 15;        // 32拍 = 14.5秒
  var DIVE_T = 0.6;
  var ROUNDS = [{ n: 3, brk: 0 }, { n: 2, brk: 1 }, { n: 4, brk: 2 }, { n: 5, brk: 2 }];
  var DEMO_ROUNDS = [{ n: 3, brk: 0 }, { n: 2, brk: 1 }, { n: 4, brk: 2 }];

  var LEDGE_Y = Math.round(H * 0.43), POOL_Y = Math.round(H * 0.6), ROCK_R = 600;
  var OB_X = 520, YB_X = 380;
  var PAD_X = 140, PAD_Y = Math.round(H * 0.78), PAD_W = 800, PAD_H = 290;
  var LAMP_Y = 262, LAMP_S = 92, LAMP_G = 22;

  // 渓流の夏の歌(オリジナル)。1拍ずつ切り出して拍クロックから積む(抜ける拍は積まない)
  var MEL = [
    [['E5', 0.5], ['G5', 0.5]], [['A5', 1]], [['G5', 0.5], ['E5', 0.5]], [['D5', 1]],
    [['C5', 0.5], ['D5', 0.5]], [['E5', 0.5], ['G5', 0.5]], [['C6', 0.75], ['R', 0.25]], [['A5', 0.5], ['G5', 0.5]],
    [['E5', 0.5], ['D5', 0.5]], [['C5', 1]], [['D5', 0.5], ['E5', 0.5]], [['G5', 1]],
    [['A5', 0.5], ['C6', 0.5]], [['A5', 0.5], ['G5', 0.5]], [['E6', 0.75], ['R', 0.25]], [['D6', 0.5], ['C6', 0.5]]
  ];
  var BAS = ['C3', 'G2', 'A2', 'E2', 'F2', 'G2', 'C3', 'G2', 'A2', 'E2', 'F2', 'C3', 'F2', 'G2', 'C3', 'G2'];

  // ---- スプライト(兄弟は同じ型、大きさと海パンの色で描き分け) ----
  var KID_STAND = ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sesses..', '...smms...', '..ssssss..', '.s.ssss.s.', '.s.ssss.s.', '.s.tttt.s.', '...tttt...', '...s..s...', '...s..s...', '..ss..ss..'];
  var KID_SHOW = ['...hhhh..s', '..hhhhhh.s', '..hssssh.s', '..sesses.s', '...smms..s', '..sssssss.', '.s.ssss...', '.s.ssss...', '.s.tttt...', '...tttt...', '...s..s...', '...s..s...', '..ss..ss..'];
  var KID_WIND = ['..........', '..........', '...hhhh...', '..hhhhhh..', '..hssssh..', '..sesses..', '...smms...', 'ss.ssss.ss', '...ssss...', '...tttt...', '..ss..ss..', '.ss....ss.', '.ss....ss.'];
  var KID_AIR = ['....ss....', '....ss....', '...hhhh...', '..hhhhhh..', '..hssssh..', '..sesses..', '...ssss...', '...ssss...', '...ssss...', '...tttt...', '...tttt...', '...s..s...', '...s..s...'];
  var KID_OOPS = ['s..hhhh..s', '.shhhhhhs.', '..hssssh..', '..seesse..', '...smms...', '..ssssss..', '...ssss...', '...ssss...', '...tttt...', '...tttt...', '...s..s...', '..s....s..', '.ss....ss.'];
  var KID_SWIM = ['s........s', '.s.hhhh.s.', '..hhhhhh..', '..hssssh..', '..sesses..', '...smms...'];
  var PAL_OB = { h: C.ink, s: C.skin, e: C.ink, m: '#d77a5a', t: C.orange };
  var PAL_YB = { h: '#4a3524', s: C.skin, e: C.ink, m: '#d77a5a', t: C.yellow };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, list, running, songT, beatN, schedB, readyT, hitStop, flashT, flashX, flashY, beatPulse;
  var r, rs, ob, yb, score, perfects, goods, misses, syncs, over, won, outroT, prevBest, milestone, padDown, ripples;

  function totalBeats() { return list.length * RB; }
  function rd() { return list[Math.min(r, list.length - 1)]; }
  function pressBeat() { return SIG - rd().n; }
  function pressT() { return (r * RB + pressBeat()) * SPB; }
  function sigT() { return (r * RB + SIG) * SPB; }
  function silentAt(ri, i) {
    var q = list[ri];
    if (!q) return false;
    if (q.brk === 1) return i >= SIG - q.n && i <= SIG;
    if (q.brk === 2) return i >= 1 && i <= SIG;
    return false;
  }
  function silentBeat(b) { return silentAt(Math.floor(b / RB), b % RB); }

  // デモ中は音を出さない(ジェスチャー前に積んだ音が開始タップで一斉に鳴るのを防ぐ)
  function sfxTone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }
  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }

  function playBeatMusic(b) {
    if (demoMode || silentBeat(b)) return;
    var k = b % 16;
    game.audio.melody(MEL[k], { tempo: BPM, wave: 'square', volume: 0.045, bass: [[BAS[k], 0.5], ['R', 0.5]], bassWave: 'triangle', bassVolume: 0.08 });
  }

  function newKid(x) { return { mode: 'stand', t: 0, x0: x, splashed: false }; }

  function newRound(ri) {
    r = ri;
    rs = { phase: 'wait', pressAt: 0, g1: '', result: '', windup: false };
    ob = newKid(OB_X); ob.mode = 'show';
    yb = newKid(YB_X);
    var q = list[ri];
    if (!demoMode) {
      // 兄の指の数だけ短い合図音。中抜きの回は最後に下がる2音
      var pips = [];
      for (var k = 0; k < q.n; k++) { pips.push(['E6', 0.125]); pips.push(['R', 0.125]); }
      if (q.brk) { pips.push(['R', 0.25]); pips.push(['B5', 0.25]); pips.push(['E5', 0.5]); }
      game.audio.melody(pips, { tempo: BPM, wave: 'square', volume: 0.05 });
    }
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    list = demoMode ? DEMO_ROUNDS : ROUNDS;
    running = false; songT = 0; beatN = 0; schedB = 0;
    readyT = demoMode ? 0 : 0.8;
    hitStop = 0; flashT = 0; flashX = 0; flashY = 0; beatPulse = 0;
    score = 0; perfects = 0; goods = 0; misses = 0; syncs = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; padDown = false;
    ripples = [];
    r = 0; rs = { phase: 'wait', pressAt: 0, g1: '', result: '', windup: false };
    ob = newKid(OB_X); yb = newKid(YB_X);
    if (demoMode) startClock();
  }

  function startClock() {
    running = true; songT = 0; beatN = 0; schedB = 0;
    onBeat(0);
  }

  // ---- 拍クロック(1本だけ) ----
  function onBeat(b) {
    var ri = Math.floor(b / RB), i = b % RB;
    if (ri >= list.length) return;
    if (i === 0) newRound(ri);
    if (i === SIG) { ob.mode = 'air'; ob.t = 0; sfx('se_jump', 0.35); }
    if (silentAt(ri, i)) return;
    beatPulse = 1;
    sfxTone(i % 4 === 0 ? 1047 : 784, 0.03, { wave: 'triangle', volume: i % 4 === 0 ? 0.08 : 0.045 });
  }

  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < totalBeats() && songT >= schedB * SPB - LEAD) { playBeatMusic(schedB); schedB++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; onBeat(beatN); }
    if (beatN >= totalBeats()) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
      return;
    }
    // 予告: 跳ぶ1.5拍前(約0.68秒)に兄が腕を引いてかがむ
    if (!rs.windup && songT >= sigT() - 1.5 * SPB) {
      rs.windup = true; ob.mode = 'wind'; ob.t = 0;
      if (!silentAt(r, SIG - 1)) sfxTone(523, 0.3, { wave: 'sine', volume: 0.07, slide: 520 });
    }
    if (rs.phase === 'wait' && songT > pressT() + GOOD_W) missAt('late');
    else if (rs.phase === 'hold' && songT > sigT() + GOOD_W) missAt('over');
    if (!demoMode && !over && songT > TIME_LIMIT + 0.5) finish(misses < MISS_MAX);
  }

  function judge(off) {
    var a = Math.abs(off);
    return a <= PERFECT_W ? 'PERFECT' : (a <= GOOD_W ? 'GOOD' : 'MISS');
  }

  function good(x, y, text, col, sz) {
    if (demoMode) { game.fx.popup(text, x, y, { color: col, size: sz }); game.fx.burst(x, y, { color: col, count: 8, speed: 260 }); return; }
    game.feedback.good(x, y, { text: text, color: col, size: sz, count: 10, volume: 0.3 });
  }

  function award(w, x, y) {
    if (w === 'PERFECT') { perfects++; score += 100; good(x, y, 'PERFECT', C.orange, 54); }
    else { goods++; score += 50; good(x, y, 'GOOD', C.deep, 46); }
  }

  function missAt(why) {
    misses++;
    rs.phase = 'done'; rs.result = why;
    yb.mode = (why === 'short' || why === 'over') ? 'air' : 'oops'; yb.t = 0;
    hitStop = 0.42; flashT = 0.42; flashX = YB_X; flashY = LEDGE_Y - 80;
    if (demoMode) { game.fx.popup('MISS', YB_X, LEDGE_Y - 220, { color: C.red, size: 54 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(YB_X, LEDGE_Y - 220, { text: 'MISS', shake: 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function pressAction() {
    padDown = true;
    if (!running || r >= list.length || hitStop > 0 || rs.phase !== 'wait') return 'none';
    var off = songT - pressT();
    var w = judge(off);
    if (w === 'MISS') { missAt(off < 0 ? 'early' : 'late'); return 'miss'; }
    rs.phase = 'hold'; rs.pressAt = songT; rs.g1 = w;
    yb.mode = 'wind'; yb.t = 0;
    award(w, YB_X, LEDGE_Y - 230);
    return 'ok';
  }

  function releaseAction() {
    padDown = false;
    if (!running || r >= list.length || rs.phase !== 'hold') return 'none';
    var off = songT - sigT();
    var w = judge(off);
    if (w === 'MISS') { missAt(off < 0 ? 'short' : 'over'); return 'miss'; }
    rs.phase = 'done'; rs.result = 'ok';
    yb.mode = 'air'; yb.t = 0;
    award(w, YB_X + 60, LEDGE_Y - 230);
    syncs++;
    score += list[r].brk ? 200 : 100;
    game.fx.burst(OB_X - 70, LEDGE_Y - 60, { color: C.yellow, count: 14, speed: 320 });
    if (!demoMode && syncs === 2 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(syncs + ' / ' + list.length, W / 2, H * 0.36, { color: C.orange, size: 80 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    if (ok) {
      score += (MISS_MAX - misses) * 50;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(260, 960), game.random(900, 1150), { color: i % 2 ? C.yellow : C.white, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 子どもの動き ----
  function kidPos(k, dx) {
    if (k.mode === 'air') {
      var u = Math.min(1, k.t / DIVE_T);
      if (k.t >= DIVE_T) return [k.x0 + dx, POOL_Y + 18 + Math.sin(game.time.elapsed * 4 + k.x0) * 6];
      return [k.x0 + dx * u, LEDGE_Y + (POOL_Y - LEDGE_Y) * u * u - 170 * Math.sin(Math.PI * u)];
    }
    return [k.x0, LEDGE_Y];
  }
  function tickKid(k, dx, dt) {
    k.t += dt;
    if (k.mode === 'air' && !k.splashed && k.t >= DIVE_T) {
      k.splashed = true;
      ripples.push({ x: k.x0 + dx, t: 0 });
      game.fx.burst(k.x0 + dx, POOL_Y, { color: C.white, count: 14, speed: 360 });
      sfxTone(220, 0.22, { wave: 'sawtooth', volume: 0.04, slide: -140 });
    }
  }
  function tickKids(dt) {
    tickKid(ob, 300, dt);
    tickKid(yb, 330, dt);
    for (var i = ripples.length - 1; i >= 0; i--) { ripples[i].t += dt; if (ripples[i].t > 1.2) ripples.splice(i, 1); }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
    tickKids(dt);
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var res = pressAction();
    if (res === 'ok') game.audio.play('se_tap', 0.3);
    else if (res === 'none') game.audio.tone(200, 0.05, { wave: 'sine', volume: 0.05 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || over) { padDown = false; return; }
    var res = releaseAction();
    if (res === 'none') game.audio.tone(320, 0.03, { wave: 'sine', volume: 0.03 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画(フラット) ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function rrect(x, y, w, h, rad, col) {
    game.draw.rect(x + rad, y, w - rad * 2, h, col);
    game.draw.rect(x, y + rad, w, h - rad * 2, col);
    game.draw.circle(x + rad, y + rad, rad, col);
    game.draw.circle(x + w - rad, y + rad, rad, col);
    game.draw.circle(x + rad, y + h - rad, rad, col);
    game.draw.circle(x + w - rad, y + h - rad, rad, col);
  }

  function drawGorge() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.45, C.sky2], [1, C.sky2]]);
    game.draw.circle(860, 420, 70, C.white);
    // 遠い山と森(丸い塊)
    for (var i = 0; i < 6; i++) game.draw.circle(60 + i * 200, 560, 150, C.leaf2);
    for (var j = 0; j < 8; j++) game.draw.circle(20 + j * 150, 640, 110, C.leaf);
    // 淵の奥の岩壁
    rrect(540, 700, 420, POOL_Y - 680, 50, '#aebcc6');
    for (var b = 0; b < 4; b++) rrect(580 + b * 80, 760 + (b % 2) * 140, 50, 150, 25, '#9fb0bc');
    // 右の崖と滝
    rrect(860, 470, 260, POOL_Y - 440, 40, C.rock2);
    game.draw.rect(890, 470, 110, POOL_Y - 470, C.fall);
    for (var k = 0; k < 5; k++) {
      var fy = 470 + ((t * 420 + k * 80) % (POOL_Y - 480));
      game.draw.rect(905 + (k % 3) * 28, fy, 10, 46, C.sky2);
    }
    // 淵
    game.draw.rect(0, POOL_Y, W, PAD_Y - 40 - POOL_Y, C.pool);
    game.draw.rect(0, POOL_Y + 120, W, PAD_Y - 40 - POOL_Y - 120, C.deep);
    for (var s = 0; s < 6; s++) {
      var sx = ((s * 230 + t * 40) % (W + 200)) - 100;
      rrect(sx, POOL_Y + 40 + (s % 3) * 34, 110, 10, 5, C.sky2);
    }
    // 水しぶきの輪(平たい白い帯)
    for (var q = 0; q < ripples.length; q++) {
      var rp = ripples[q], ww = 60 + rp.t * 260;
      rrect(rp.x - ww / 2, POOL_Y + 2 + rp.t * 10, ww, 12, 6, C.white);
    }
    // 飛び込み岩(左)
    rrect(-60, LEDGE_Y, ROCK_R + 60, PAD_Y - 40 - LEDGE_Y, 46, C.rock);
    rrect(-60, LEDGE_Y, ROCK_R + 60, 26, 13, '#b4c1ca');
    for (var m = 0; m < 3; m++) rrect(60 + m * 170, LEDGE_Y + 150 + (m % 2) * 120, 120, 24, 12, C.rock2);
    game.draw.circle(ROCK_R - 10, LEDGE_Y + 70, 22, C.leaf);
  }

  function kidArt(k, isOb) {
    if (k.mode === 'air') return k.t >= DIVE_T ? KID_SWIM : KID_AIR;
    if (k.mode === 'wind') return KID_WIND;
    if (k.mode === 'oops') return KID_OOPS;
    if (k.mode === 'show' && isOb) return KID_SHOW;
    return KID_STAND;
  }
  function drawKid(k, isOb) {
    var px = isOb ? 13 : 11;
    var p = kidPos(k, isOb ? 300 : 330);
    var art = kidArt(k, isOb);
    var hgt = art.length * px;
    var bob = k.mode === 'stand' || k.mode === 'show' ? -beatPulse * 6 : 0;
    var wob = k.mode === 'oops' ? Math.sin(game.time.elapsed * 26) * 8 : 0;
    var cy = (k.mode === 'air' && k.t >= DIVE_T) ? p[1] - hgt / 2 + 20 : p[1] - hgt / 2 + bob;
    var flash = flashT > 0 && !isOb && Math.floor(flashT * 20) % 2 === 0;
    var sc = flash ? 1.25 : 1;
    game.draw.sprite(art, flash ? { h: C.white, s: C.white, e: C.white, m: C.white, t: C.white } : (isOb ? PAL_OB : PAL_YB), p[0] + wob, cy, px * sc, { anchor: 'center' });
    if (k.mode === 'air' && k.t >= DIVE_T) game.draw.rect(p[0] - 70, POOL_Y + 30, 140, 10, C.pool);
  }

  // 兄の上げた指の数(吹き出し)
  function drawBubble() {
    if (r >= list.length || ob.mode === 'air') return;
    var n = rd().n;
    var bw = 120 + n * 58, bx = OB_X - bw / 2 + 40, by = LEDGE_Y - 360;
    var pop = ob.mode === 'show' ? 1 : 0.85;
    rrect(bx, by, bw, 120 * pop, 30, C.white);
    game.draw.rect(OB_X + 20, by + 110 * pop, 30, 30, C.white);
    for (var k = 0; k < n; k++) game.draw.circle(bx + 50 + k * 58, by + 60 * pop, 20, ob.mode === 'wind' ? C.yellow : C.orange);
    label(String(n), bx + bw - 40, by + 82 * pop, 64, C.ink);
    // 予告: 兄の周りで脈打つ輪
    if (ob.mode === 'wind') {
      var pulse = (game.time.elapsed * 6) % 1;
      game.draw.circle(OB_X, LEDGE_Y - 90, 110 + pulse * 40, C.yellow, 0.25 * (1 - pulse));
    }
  }

  function drawLamps() {
    var i = beatN % RB;
    var n = rd().n, p0 = SIG - n;
    var x0 = (W - (RB * LAMP_S + (RB - 1) * LAMP_G)) / 2;
    for (var k = 0; k < RB; k++) {
      var x = x0 + k * (LAMP_S + LAMP_G), y = LAMP_Y;
      var base = k === SIG ? C.deep : (k >= p0 && k < SIG ? C.orange : C.mute);
      var silent = r < list.length && silentAt(r, k);
      var cur = running && k === i;
      if (silent) {
        rrect(x, y, LAMP_S, LAMP_S, 18, base);
        rrect(x + 8, y + 8, LAMP_S - 16, LAMP_S - 16, 12, C.white);
      } else if (cur) {
        rrect(x - 8, y - 8, LAMP_S + 16, LAMP_S + 16, 22, base);
        rrect(x + 18, y + 18, LAMP_S - 36, LAMP_S - 36, 10, C.white);
      } else {
        rrect(x, y, LAMP_S, LAMP_S, 18, base);
      }
      if (k === SIG) { game.draw.circle(x + 30, y + 58, 10, silent ? C.deep : C.white); game.draw.circle(x + 62, y + 58, 10, silent ? C.deep : C.white); game.draw.circle(x + 46, y + 34, 12, silent ? C.deep : C.white); }
    }
  }

  function drawPad() {
    var p = state === S.ATTRACT ? demo.press : padDown;
    var holding = rs && rs.phase === 'hold';
    rrect(0, PAD_Y - 40, W, H - PAD_Y + 40, 0, C.white);
    var col = p ? C.orange : C.deep;
    rrect(PAD_X, PAD_Y + (p ? 10 : 0), PAD_W, PAD_H - (p ? 10 : 0), 60, col);
    // かがむアイコン(下向きの山形2つ)
    var cx = W / 2, cy = PAD_Y + 110 + (p ? 10 : 0);
    for (var c = 0; c < 2; c++) {
      game.draw.line(cx - 70, cy + c * 50 - 25, cx, cy + c * 50 + 15, C.white, 18);
      game.draw.line(cx + 70, cy + c * 50 - 25, cx, cy + c * 50 + 15, C.white, 18);
    }
    // 押している拍数(伴奏が鳴っている間だけ進む)
    if (holding && r < list.length) {
      var n = rd().n;
      var held = Math.min(n, Math.floor((songT - (r * RB + SIG - n) * SPB) / SPB + 0.5));
      var hide = silentAt(r, beatN % RB);
      for (var k = 0; k < n; k++) {
        var on = !hide && k < held;
        game.draw.circle(cx - (n - 1) * 34 + k * 68, PAD_Y + 236, 18, on ? C.yellow : C.white);
      }
    }
  }

  function drawFlash() {
    if (flashT <= 0) return;
    var k2 = flashT / 0.42;
    game.draw.circle(flashX, flashY, 60 + (1 - k2) * 160, C.white, 0.7 * k2);
  }

  function drawScene() {
    drawGorge();
    drawKid(ob, true);
    drawKid(yb, false);
    drawBubble();
    drawFlash();
    drawLamps();
    drawPad();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.white);
    label('SCORE ' + score, 60, 96, 54, C.ink, 'left');
    label('BEST ' + prevBest, 60, 170, 32, C.deep, 'left');
    label(Math.min(r + 1, list.length) + ' / ' + list.length, W - 60, 96, 56, C.deep, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.circle(W - 230 + i * 70, 168, 18, i < misses ? C.red : C.mute);
    var progress = Math.min(1, songT / (totalBeats() * SPB));
    game.draw.rect(0, 222, W, 8, C.mute);
    game.draw.rect(0, 222, W * progress, 8, C.orange);
  }

  // ---- ATTRACT: 実ロジックで 1回目ぴったり / 2回目は押しすぎてMISS / 3回目は無音を数え切る ----
  var demo = { t: 0, press: false };
  var DEMO_LEN = DEMO_ROUNDS.length * RB * SPB + 0.8;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = false; }
    if (running && r < list.length && hitStop <= 0) {
      var nt = songT + dt;
      if (rs.phase === 'wait' && nt >= pressT() - 0.01) { pressAction(); demo.press = true; }
      else if (rs.phase === 'hold') {
        var late = r === 1 ? 0.3 : 0;
        if (nt >= sigT() + late - 0.01) { releaseAction(); demo.press = false; }
      }
      if (rs.phase === 'done') demo.press = false;
    }
    tickWorld(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (flashT > 0) flashT -= dt;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 40, PAD_Y + 150, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.white);
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, C.deep);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 194, 36, C.orange);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, PAD_Y - 70, 52, C.orange);
      else label('TAP TO START', W / 2, PAD_Y - 70, 46, C.deep);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      rrect(80, H * 0.25, W - 160, H * 0.34, 50, C.white);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? C.pool : C.red);
      label('SCORE ' + score, W / 2, H * 0.37, 58, C.ink);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.415, 36, C.deep);
      label(syncs + ' / ' + ROUNDS.length, W / 2, H * 0.46, 48, C.orange);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.505, 50, C.orange);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.505, 40, C.deep);
      if (!won) label('あと' + Math.max(1, ROUNDS.length - MISS_MAX + 1 - syncs) + '回!', W / 2, H * 0.22, 56, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.56, 36, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (hitStop > 0) hitStop -= dt; else tickKids(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, syncs: syncs, perfect: perfects, good: goods, miss: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      tickWorld(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, C.deep);
    if (over && won) label('FINISH', W / 2, H * 0.36, 100, C.orange);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
