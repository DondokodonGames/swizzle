// K-GBA-0021v2-steppe-cloth-target-sling.js
// 草原の布的スリング — 三拍かけて高まる音色に合わせてゴムを引き絞り、次の小節の一拍目の頭で放してフェルトの玉矢を布の的へ届ける
// 操作: 下の輪に指を置いて手前へ引くとゴムが伸び、引いた向きの反対へ飛ぶ(点線と着地の輪が見える)。的が立ったら3拍の高まる音の間に引き絞り、次の1拍目の頭で指を離す。後半は布の的が3拍子で揺れるので、1拍目に来る位置を狙う
// 終わり: 7射(15小節・約18秒)を撃ち終えればCLEAR。早離し・的外れ・放し遅れのMISSが3回でGAME OVER
// @mechanic: slingshot
// @theme: steppe_cloth_target_sling
// 世界観: 草原の遊牧民の天幕の前で、少年が木の二股のゴム投げ具を三拍子の手拍子に乗って引き絞り、柔らかいフェルトの玉矢を棒に吊った布の的へ届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・布の真ん中に当てた数・最大コンボ
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 先に決めた6色だけで完結。大きいドット(12〜16px)、強い差し色は珊瑚色の1色だけ
  var STYLE = { bg: ['#2a2342', '#f2c48d'], main: ['#f7ecd8', '#3e8a7e', '#8b5e3c'], accent: ['#ff4b5c'] };
  var C = { ink: STYLE.bg[0], sand: STYLE.bg[1], cream: STYLE.main[0], teal: STYLE.main[1], wood: STYLE.main[2], coral: STYLE.accent[0] };

  var GAME_TITLE = 'FELT SLING';
  var BPM = 150;
  var SPB = 60 / BPM;
  var BAR = 3;                       // ワルツ: 1小節 = 3拍
  var TIME_LIMIT = 18;               // 15小節 = 45拍 = 18秒
  var WIN_P = 0.075, WIN_G = 0.16;
  var LIVES = 3;
  var HORIZON = H * 0.25;
  var POUCH_X = W * 0.5, POUCH_Y = H * 0.70;
  var PAD_X = W * 0.5, PAD_Y = H * 0.8;
  var K_REACH = 3.2, MAXPULL = 280, MINPULL = 60;
  var FLY = 0.4;
  var NEAR = { y: H * 0.56, px: 14 }, MID = { y: H * 0.45, px: 11 }, FAR = { y: H * 0.34, px: 8 };
  // 7射。前半は止まった的(近→中→遠)、後半は風で3拍子に揺れる的(sw=揺れ幅。1拍目に右端/左端へ来る)
  var SHOTS = [
    { x: 0.5, d: NEAR, sw: 0 }, { x: 0.3, d: MID, sw: 0 }, { x: 0.7, d: FAR, sw: 0 },
    { x: 0.5, d: MID, sw: 170 }, { x: 0.42, d: FAR, sw: -150 }, { x: 0.58, d: MID, sw: -190 }, { x: 0.5, d: FAR, sw: 200 }
  ];
  var DEMO_SHOTS = [{ x: 0.5, d: NEAR, sw: 0 }, { x: 0.33, d: MID, sw: 0 }, { x: 0.62, d: MID, sw: 150 }];
  var DEMO_CYCLE = 20 * SPB + 1.4;
  var RISE = ['A4', 'D5', 'F#5'];    // 引き絞る3拍で高まる音色(放す1拍目で A5 に満ちる)
  var CHORDS = [['D3', 'F#4', 'A4'], ['G2', 'G4', 'B4'], ['A2', 'E4', 'A4'], ['D3', 'F#4', 'D5']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, press: false, gx: PAD_X, gy: PAD_Y };

  // 天幕の少年(後ろ姿)。c=上着 h=髪 w=フェルト帽 b=帯 s=肌 k=靴
  var BOY_A = [
    '...wwww...', '..wwccww..', '..hhhhhh..', '..hhhhhh..', '...hssh...', '.cccccccc.',
    'cccccccccc', 'cc.cbbc.cc', 'cc.cccc.cc', '...cccc...', '...k..k...', '..kk..kk..'
  ];
  var BOY_B = [
    '...wwww...', '..wwccww..', '..hhhhhh..', '..hhhhhh..', '...hssh...', '.cccccccc.',
    'cccccccccc', 'cc.cbbc.cc', 'cc.cccc.cc', '...cccc...', '..k....k..', '.kk....kk.'
  ];
  var BOY_PULL = [
    '...wwww...', '..wwccww..', '..hhhhhh..', '..hhhhhh..', '...hssh...', '.ccccccccs',
    'ccccccccc.', 'cc.cbbcc..', 'cc.cccc...', '...cccc...', '..k...k...', '.kk...kk..'
  ];
  var BOY_CHEER = [
    's..wwww..s', 'c.wwccww.c', 'c.hhhhhh.c', 'cchhhhhhcc', '.c.hssh.c.', '..cccccc..',
    '..cccccc..', '...cbbc...', '...cccc...', '...cccc...', '...k..k...', '..kk..kk..'
  ];
  var BOY_OOPS = [
    '....wwww..', '...wwccww.', '..hhhhhh..', 's.hhhhhh.s', 'c..hssh..c', 'cccccccccc',
    '.cccccccc.', '...cbbc...', '...cccc...', '...cccc...', '...k..k...', '..kk..kk..'
  ];
  var PAL_BOY = { w: C.cream, c: C.wood, h: C.ink, s: C.sand, b: C.coral, k: C.ink };
  // フェルトの玉矢(先が丸い柔らかい玉 + 房)
  var DART = ['.rr.', 'rrrr', '.ww.', '.ww.', 'w..w'];
  var PAL_DART = { r: C.coral, w: C.cream };
  var PAL_DART_OFF = { r: C.ink, w: C.ink };
  // 棒に吊った布の的(房つき)
  var CLOTH = ['wwwwwwwww', 'wtttttttw', 'wtwwwwwtw', 'wtwrrrwtw', 'wtwrrrwtw', 'wtwrrrwtw', 'wtwwwwwtw', 'wtttttttw', 'w.w.w.w.w'];
  var PAL_CLOTH = { w: C.cream, t: C.ink, r: C.coral };
  var PAL_FLASH = { w: C.cream, t: C.cream, r: C.cream };
  var YURT = [
    '.....kk.....', '....wwww....', '..wwwwwwww..', '.wwrwwwwrww.',
    'wwwwwwwwwwww', 'wkkwwkkwwkkw', 'wwwwkkkkwwww', 'wwwwkkkkwwww'
  ];
  var PAL_YURT = { w: C.cream, k: C.wood, r: C.coral };
  var SUN = ['..wwww..', '.wwwwww.', 'wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'wwwwwwww', '.wwwwww.', '..wwww..'];
  var PAL_SUN = { w: C.cream };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function newRun(isDemo) {
    var list = isDemo ? DEMO_SHOTS : SHOTS;
    var shots = [];
    for (var i = 0; i < list.length; i++) {
      shots.push({ x: W * list[i].x, y: list[i].d.y, px: list[i].d.px, sw: list[i].sw, rb: 6 + 6 * i, st: 'wait', pop: 0, flash: 0, bull: false });
    }
    return {
      demo: isDemo, shots: shots, songT: 0, beatIdx: -1, ready: isDemo ? 0 : 0.8,
      lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, bulls: 0,
      pull: null, lastNotch: 0, darts: [], pulse: 0, snap: 0, cheer: 0, oops: 0,
      stop: 0, stopShot: null, over: false, ok: false, endWait: 0,
      endBeat: 6 * list.length + 2, prevBest: game.best, milestone: 0
    };
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
  }

  function shotPos(s, t) {
    var x = s.x;
    if (s.sw !== 0) x += s.sw * Math.cos(2 * Math.PI * (t - s.rb * SPB) / (BAR * SPB));
    return { x: x, y: s.y };
  }
  function hitRadius(s) { return s.px * 4.5 + 18; }
  function activeShot() {
    for (var i = 0; i < R.shots.length; i++) if (R.shots[i].st === 'up') return R.shots[i];
    return null;
  }

  // 3拍子の伴奏(ズン・チャッ・チャッ)。拍クロックから鳴らすので判定と必ずそろう
  function playBeat(b, vol) {
    var bar = Math.floor(b / BAR), inBar = b % BAR, ch = CHORDS[bar % 4];
    if (inBar === 0) {
      game.audio.tone(ch[0], SPB * 0.9, { wave: 'triangle', volume: 0.11 * vol });
      game.audio.tone(115, 0.08, { wave: 'square', volume: 0.07 * vol, slide: -60 });
    } else {
      game.audio.tone(ch[1], SPB * 0.3, { wave: 'square', volume: 0.03 * vol });
      game.audio.tone(ch[2], SPB * 0.3, { wave: 'square', volume: 0.03 * vol });
    }
  }

  function onBeat(b) {
    R.pulse = 1;
    var vol = R.demo ? 0.45 : 1;
    playBeat(b, vol);
    for (var i = 0; i < R.shots.length; i++) {
      var s = R.shots[i];
      if (s.st === 'wait' && b >= s.rb - 5) {
        s.st = 'up'; s.pop = 1;
        game.audio.tone('E6', 0.06, { wave: 'triangle', volume: 0.05 * vol });   // 的が立つ予告
      }
      if (s.st === 'up') {
        var k = b - (s.rb - BAR);
        if (k >= 0 && k < BAR) game.audio.tone(RISE[k], SPB * 0.8, { wave: 'triangle', volume: (0.06 + k * 0.025) * vol });
        if (k === BAR) game.audio.tone('A5', 0.09, { wave: 'square', volume: 0.06 * vol });
      }
    }
  }

  function pullInfo(p) {
    var dx = p.x - p.x0, dy = p.y - p.y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > MAXPULL) { dx *= MAXPULL / len; dy *= MAXPULL / len; len = MAXPULL; }
    var lx = POUCH_X - dx * K_REACH, ly = POUCH_Y - dy * K_REACH;
    return { dx: dx, dy: dy, len: len, lx: lx, ly: ly, power: len / MAXPULL, valid: len >= MINPULL && dy > 20 };
  }

  function beginPull(x, y) {
    if (!R || R.over || R.ready > 0 || R.stop > 0 || R.pull) return false;
    R.pull = { x0: x, y0: y, x: x, y: y };
    R.lastNotch = 0;
    return true;
  }
  function movePull(x, y) {
    if (!R || !R.pull) return 0;
    R.pull.x = x; R.pull.y = y;
    var n = Math.floor(pullInfo(R.pull).power * 4);
    if (n > R.lastNotch) { R.lastNotch = n; return n; }
    return 0;
  }

  function depthPx(y) { return clamp(3 + (y - FAR.y) / (NEAR.y - FAR.y) * 3, 2, 7); }

  function releasePull() {
    if (!R || !R.pull) return 'none';
    var info = pullInfo(R.pull);
    R.pull = null;
    if (!info.valid || R.stop > 0) return 'weak';
    R.snap = 0.2;
    var dart = { x0: POUCH_X + info.dx * 0.5, y0: POUCH_Y + info.dy * 0.5, x1: info.lx, y1: info.ly, t: 0, mode: 'idle', shot: null, ox: 0, oy: 0, life: 1.3 };
    R.darts.push(dart);
    var s = activeShot();
    var t = R.songT;
    if (!s || t < (s.rb - BAR) * SPB) return 'idle';          // 引き絞る小節の前: 判定なしの空撃ち
    var e = t - s.rb * SPB;
    if (e < -WIN_G) {                                         // 1拍目の頭より早い: 力が満ちずに手前へ落ちる
      dart.mode = 'flop'; dart.x1 = POUCH_X + (info.lx - POUCH_X) * 0.3; dart.y1 = POUCH_Y - 170;
      missShot(s);
      return 'early';
    }
    var tp = shotPos(s, t);
    var ddx = info.lx - tp.x, ddy = info.ly - tp.y, d = Math.sqrt(ddx * ddx + ddy * ddy);
    var hr = hitRadius(s);
    if (d > hr) { dart.mode = 'wide'; missShot(s); return 'wide'; }
    var grade = Math.abs(e) <= WIN_P ? 'PERFECT' : 'GOOD';
    dart.mode = 'hit'; dart.shot = s; dart.ox = clamp(ddx, -s.px * 2.5, s.px * 2.5); dart.oy = clamp(ddy, -s.px * 2.5, s.px * 2.5);
    hitShot(s, grade, d <= hr * 0.42);
    return grade;
  }

  function hitShot(s, grade, bull) {
    s.st = 'hit'; s.bull = bull;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    var add = grade === 'PERFECT' ? 100 : 60;
    if (bull) { add += 50; R.bulls++; }
    add += R.combo * 10;
    if (grade === 'PERFECT') R.perfect++; else R.good++;
    R.score += add; R.cheer = 0.8;
    var p = shotPos(s, R.songT);
    game.feedback.good(p.x, p.y - s.px * 6, { text: grade, color: grade === 'PERFECT' ? C.coral : C.cream, count: bull ? 18 : 10 });
    game.fx.popup('+' + add, p.x, p.y + s.px * 7, { color: C.cream, size: 44 });
    if (bull) {
      game.fx.burst(p.x, p.y, { color: C.coral, count: 14, speed: 300 });
      game.audio.tone('D6', 0.14, { wave: 'triangle', volume: R.demo ? 0.04 : 0.08 });
    }
    if (!R.demo && (R.combo === 3 || R.combo === 5 || R.combo === 7)) {
      game.fx.popup(R.combo + ' COMBO', W / 2, H * 0.27, { color: C.coral, size: 68 });
      game.audio.play('se_milestone', 0.5);
      R.milestone = 1;
    }
  }

  function missShot(s) {
    s.st = 'miss'; s.flash = 0.45;
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.45; R.stopShot = s; R.oops = 1.4;
    game.audio.tone(150, 0.3, { wave: 'sawtooth', volume: R.demo ? 0.05 : 0.1, slide: -70 });
  }

  function releaseStop() {
    var s = R.stopShot;
    R.stopShot = null;
    if (!s) return;
    var p = shotPos(s, R.songT);
    game.feedback.bad(p.x, p.y, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.7; R.pull = null;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      game.audio.melody([['D5', 0.5], ['F#5', 0.5], ['A5', 0.5], ['D6', 1.5]], { tempo: BPM, wave: 'square', volume: 0.06 });
      for (var i = 0; i < 3; i++) game.fx.burst(W * (0.25 + i * 0.25), H * 0.4, { color: i === 1 ? C.coral : C.cream, count: 22, speed: 460 });
    } else {
      game.audio.melody([['A4', 0.5], ['F4', 0.5], ['D4', 2]], { tempo: BPM, wave: 'triangle', volume: 0.06 });
    }
    if (R.score > R.prevBest && R.score > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.coral, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.snap = Math.max(0, R.snap - dt);
    R.cheer = Math.max(0, R.cheer - dt);
    R.oops = Math.max(0, R.oops - dt);
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      for (var q = 0; q < R.shots.length; q++) if (R.shots[q].flash > 0) R.shots[q].flash = Math.max(0.01, R.stop);
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('A4', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.songT += dt;
    var bi = Math.floor(R.songT / SPB);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    for (var j = R.darts.length - 1; j >= 0; j--) {
      var d = R.darts[j];
      d.t += dt;
      if (d.t >= FLY && !d.landed) {
        d.landed = true;
        if (d.mode !== 'hit') game.fx.burst(d.x1, d.y1, { color: C.sand, count: 6, speed: 120 });
      }
      if (d.mode !== 'hit' && d.t > FLY + d.life) R.darts.splice(j, 1);
      else if (d.mode === 'hit' && d.shot.st === 'gone') R.darts.splice(j, 1);
    }
    for (var i = 0; i < R.shots.length; i++) {
      var s = R.shots[i];
      s.pop = Math.max(0, s.pop - dt * 3);
      if (s.flash > 0) s.flash = Math.max(0, s.flash - dt);
      if (s.st === 'up' && R.songT > s.rb * SPB + WIN_G) {   // 放し遅れ / 撃たずに見送り
        R.pull = null;
        missShot(s);
        return;
      }
      if ((s.st === 'hit' || s.st === 'miss') && R.songT > (s.rb + 2.4) * SPB) s.st = 'gone';
    }
    if (!R.demo && (R.songT >= R.endBeat * SPB || R.songT >= TIME_LIMIT)) endRun(R.lives > 0);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(2射は1拍目の頭で命中、3射目はわざと早く放して失敗例)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.press = false; }
    var s = null;
    for (var i = 0; i < R.shots.length; i++) {
      if (R.shots[i].st === 'wait' || R.shots[i].st === 'up') { s = R.shots[i]; break; }
    }
    if (s && R.stop <= 0 && R.ready <= 0) {
      var idx = R.shots.indexOf(s);
      var rbT = s.rb * SPB, drawT = rbT - BAR * SPB;
      var relT = idx === 2 ? rbT - SPB * 1.3 : rbT;
      var tp = shotPos(s, rbT);
      var ddx = (POUCH_X - tp.x) / K_REACH, ddy = (POUCH_Y - tp.y) / K_REACH;
      if (!R.pull && R.songT >= drawT - SPB * 0.4 && R.songT < relT) beginPull(PAD_X, PAD_Y);
      if (R.pull) {
        var k = clamp((R.songT - drawT + SPB * 0.4) / (BAR * SPB * 0.75), 0, 1);
        k = 1 - (1 - k) * (1 - k);
        movePull(PAD_X + ddx * k, PAD_Y + ddy * k);
        if (R.songT >= relT) releasePull();
      }
    }
    var tx = R.pull ? R.pull.x : PAD_X + 40, ty = R.pull ? R.pull.y : PAD_Y + 60 + Math.sin(demo.t * 3) * 12;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 16);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 16);
    demo.press = !!R.pull;
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed, x, i;
    // 空: ハードストップのグラデーション(混色を作らない)+ 16pxの市松ディザ
    game.draw.gradient(0, HORIZON, [[0, C.ink], [0.5, C.ink], [0.5, C.sand], [1, C.sand]]);
    for (x = 0; x < W; x += 32) {
      game.draw.rect(x, HORIZON * 0.5 - 16, 16, 16, C.ink);
      game.draw.rect(x + 16, HORIZON * 0.5, 16, 16, C.ink);
    }
    for (i = 0; i < 9; i++) {
      if (Math.floor(e * 1.5 + i * 1.7) % 4 !== 0) game.draw.rect((i * 137 + 60) % W, 30 + (i * 53) % 150, 8, 8, C.cream);
    }
    game.draw.sprite(SUN, PAL_SUN, W * 0.78, HORIZON - 70, 16, { anchor: 'center' });
    // 雲(16pxブロック、ゆっくり流れる)
    for (i = 0; i < 3; i++) {
      var cx = ((i * 420 + e * (18 + i * 6)) % (W + 320)) - 160, cy = 250 + i * 70;
      game.draw.rect(cx, cy, 128, 32, C.cream);
      game.draw.rect(cx + 32, cy - 16, 64, 16, C.cream);
    }
    // 遠い山並み(16px段々)
    for (x = 0; x < W; x += 16) {
      var mh = 56 + 40 * Math.sin(x * 0.006 + 1) + 24 * Math.sin(x * 0.017);
      mh = Math.round(mh / 16) * 16;
      game.draw.rect(x, HORIZON - mh, 16, mh, C.wood);
    }
    // 草原
    game.draw.rect(0, HORIZON, W, H - HORIZON, C.teal);
    var sway = Math.sin(e * 2) * 6;
    for (var r = 1; r < 18; r++) {
      var y = HORIZON + 10 + r * r * 5.2;
      if (y > H) break;
      var sz = 6 + r * 0.9, gap = 50 + r * 16;
      for (x = (r % 2) * gap * 0.5 - 20; x < W; x += gap) game.draw.rect(x + sway * (r / 18), y, sz, sz * 0.6, C.ink, 0.55);
    }
    // 天幕と煙
    game.draw.sprite(YURT, PAL_YURT, W * 0.14, H * 0.285, 10, { anchor: 'center' });
    for (i = 0; i < 4; i++) {
      var ph = (e * 0.6 + i * 0.25) % 1;
      game.draw.rect(W * 0.14 - 8 + Math.sin(ph * 6 + i) * 14, H * 0.285 - 50 - ph * 160, 16, 16, C.cream, 1 - ph);
    }
  }

  function drawShot(s) {
    if (s.st === 'wait' || s.st === 'gone') return;
    var p = shotPos(s, R.songT);
    var px = s.px * (s.flash > 0 ? 1.3 : 1);
    var rise = s.pop * s.px * 10;
    var span = Math.abs(s.sw) + s.px * 6;
    var topY = s.y - s.px * 7 + rise;
    // 支柱 + 横木 + 吊りひも
    game.draw.rect(s.x - span - s.px * 0.6, topY, s.px * 1.2, s.px * 14, C.wood);
    game.draw.rect(s.x + span - s.px * 0.6, topY, s.px * 1.2, s.px * 14, C.wood);
    game.draw.rect(s.x - span, topY, span * 2, s.px * 1.1, C.wood);
    game.draw.rect(s.x - span, s.y + s.px * 7 + rise, span * 2, s.px * 0.8, C.ink, 0.35);
    game.draw.line(s.x - s.px * 3, topY + s.px, p.x - s.px * 3.5, p.y - s.px * 4.5 + rise, C.cream, 3);
    game.draw.line(s.x + s.px * 3, topY + s.px, p.x + s.px * 3.5, p.y - s.px * 4.5 + rise, C.cream, 3);
    var white = s.flash > 0 && Math.floor(game.time.elapsed * 20) % 2 === 0;
    game.draw.sprite(CLOTH, white ? PAL_FLASH : PAL_CLOTH, p.x, p.y + rise, px, { anchor: 'center' });
  }

  function drawApproach() {
    var s = activeShot();
    if (!s) return;
    var rbT = s.rb * SPB, left = rbT - R.songT;
    if (left > BAR * SPB + SPB * 0.5 || left < -WIN_G) return;
    var p = shotPos(s, R.songT);
    var hr = hitRadius(s);
    var rr = hr + Math.max(0, left) / (BAR * SPB) * 150;
    var n = 12;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      game.draw.rect(p.x + Math.cos(a) * hr - 6, p.y + Math.sin(a) * hr - 6, 12, 12, C.coral);
      game.draw.rect(p.x + Math.cos(a) * rr - 8, p.y + Math.sin(a) * rr - 8, 16, 16, C.cream);
    }
    // 揺れる的: 1拍目に来る位置にうっすら影
    if (s.sw !== 0) {
      var q = shotPos(s, rbT);
      game.draw.sprite(CLOTH, PAL_CLOTH, q.x, q.y, s.px, { anchor: 'center', alpha: 0.22 });
    }
  }

  function drawDarts() {
    for (var i = 0; i < R.darts.length; i++) {
      var d = R.darts[i];
      var x1 = d.x1, y1 = d.y1;
      if (d.mode === 'hit') {
        var p = shotPos(d.shot, R.songT);
        x1 = p.x + d.ox; y1 = p.y + d.oy;
      }
      var k = Math.min(1, d.t / FLY);
      var arc = Math.sin(Math.PI * k) * Math.min(220, Math.abs(d.y0 - y1) * 0.35);
      var x = d.x0 + (x1 - d.x0) * k, y = d.y0 + (y1 - d.y0) * k - arc;
      var px = 7 + (depthPx(y1) - 7) * k;
      var a = d.mode === 'hit' || k < 1 ? 1 : Math.max(0, 1 - (d.t - FLY) / d.life);
      game.draw.sprite(DART, PAL_DART, x, y, px, { anchor: 'center', alpha: a });
    }
  }

  function drawSling() {
    var e = game.time.elapsed;
    var bob = R.pulse * 8;
    var frame = R.oops > 0 ? BOY_OOPS : (R.cheer > 0 ? BOY_CHEER : (R.pull ? BOY_PULL : (Math.floor(e * BPM / 60) % 2 === 0 ? BOY_A : BOY_B)));
    // 親指の輪
    var glow = 0.5 + 0.5 * Math.sin(e * 5);
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2;
      game.draw.rect(PAD_X + Math.cos(a) * (110 + glow * 10) - 6, PAD_Y + Math.sin(a) * (60 + glow * 6) - 6, 12, 12, C.cream, 0.7);
    }
    game.draw.sprite(frame, PAL_BOY, W * 0.5, H * 0.83 + bob, 14, { anchor: 'center' });
    // 二股の投げ具(木)
    var fy = POUCH_Y;
    game.draw.rect(POUCH_X - 8, fy + 10, 16, 80, C.wood);
    game.draw.line(POUCH_X, fy + 14, POUCH_X - 48, fy - 34, C.wood, 16);
    game.draw.line(POUCH_X, fy + 14, POUCH_X + 48, fy - 34, C.wood, 16);
    game.draw.line(W * 0.5 - 40, H * 0.83 - 20 + bob, POUCH_X, fy + 80, C.wood, 14);
    var px = POUCH_X, py = fy - 30;
    if (R.pull) {
      var info = pullInfo(R.pull);
      px = POUCH_X + info.dx * 0.5; py = fy - 30 + info.dy * 0.5;
      // 着地予告: 点線 + 着地の輪
      var col = info.valid ? C.cream : C.coral;
      for (var k = 1; k <= 7; k++) {
        var t = k / 8;
        var ax = px + (info.lx - px) * t, ay = py + (info.ly - py) * t - Math.sin(Math.PI * t) * Math.min(220, Math.abs(py - info.ly) * 0.35);
        game.draw.rect(ax - 7, ay - 7, 14, 14, col);
      }
      if (info.valid) {
        game.draw.rect(info.lx - 26, info.ly - 4, 52, 8, C.coral);
        game.draw.rect(info.lx - 4, info.ly - 26, 8, 52, C.coral);
      }
    } else if (R.snap > 0) {
      py = fy - 30 - (R.snap / 0.2) * 30;
    }
    game.draw.line(POUCH_X - 48, fy - 34, px, py, C.coral, 6);
    game.draw.line(POUCH_X + 48, fy - 34, px, py, C.coral, 6);
    game.draw.line(W * 0.5 + 40, H * 0.83 - 20 + bob, px, py + 10, C.wood, 14);
    game.draw.rect(px - 18, py - 10, 36, 20, C.ink);
    if (R.pull) game.draw.sprite(DART, PAL_DART, px, py - 14, 7, { anchor: 'center' });
    drawMeter();
  }

  // 引き絞りの音階メーター: 3拍で1段ずつ点き、放す1拍目に珊瑚色が満ちる
  function drawMeter() {
    var s = activeShot();
    var mx = W * 0.5 + 200, my = H * 0.74;
    var lit = 0, full = false;
    if (s) {
      var drawT = (s.rb - BAR) * SPB;
      if (R.songT >= drawT) lit = Math.min(BAR, Math.floor((R.songT - drawT) / SPB) + 1);
      full = R.songT >= s.rb * SPB - 0.02;
    }
    for (var i = 0; i < BAR; i++) {
      game.draw.rect(mx, my - i * 44, 40, 34, i < lit ? C.cream : C.ink, i < lit ? 1 : 0.6);
    }
    game.draw.rect(mx - 6, my - BAR * 44 - 6, 52, 40, full ? C.coral : C.ink, full ? 1 : 0.6);
  }

  function drawWorld() {
    drawBg();
    var order = R.shots.slice().sort(function(a, b) { return a.y - b.y; });
    for (var i = 0; i < order.length; i++) drawShot(order[i]);
    drawApproach();
    drawSling();
    drawDarts();
  }

  function drawLamps(y) {
    var inBar = R.beatIdx < 0 || R.ready > 0 ? -1 : R.beatIdx % BAR;
    for (var b = 0; b < BAR; b++) {
      var big = b === 0;
      var on = b === inBar && R.pulse > 0.15;
      var sz = big ? 56 : 40;
      game.draw.rect(W / 2 - 110 + b * 110 - sz / 2 - 4, y - sz / 2 - 4, sz + 8, sz + 8, C.wood);
      game.draw.rect(W / 2 - 110 + b * 110 - sz / 2, y - sz / 2, sz, sz, on ? (big ? C.coral : C.cream) : C.ink);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 232, C.ink, 0.55);
    txt('SCORE ' + R.score, 40, 64, 46, C.cream, 'left');
    txt('BEST ' + game.best, W - 40, 64, 36, C.sand, 'right');
    var done = 0;
    for (var i = 0; i < R.shots.length; i++) if (R.shots[i].st === 'hit' || R.shots[i].st === 'miss' || R.shots[i].st === 'gone') done++;
    txt(done + ' / ' + R.shots.length, 40, 146, 40, C.cream, 'left');
    drawLamps(146);
    for (var l = 0; l < LIVES; l++) game.draw.sprite(DART, l < R.lives ? PAL_DART : PAL_DART_OFF, W - 70 - l * 70, 146, 9, { anchor: 'center' });
    var progress = Math.min(1, R.songT / (R.endBeat * SPB));
    game.draw.rect(40, 200, W - 80, 16, C.ink);
    game.draw.rect(40, 200, (W - 80) * progress, 16, C.teal);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W * 0.22, H * 0.66, 40, C.cream);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, H * 0.4, 100, C.coral);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.21, W, H * 0.36, C.ink, 0.85);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 96, R.ok ? C.cream : C.coral);
    txt('SCORE ' + R.score, W / 2, H * 0.34, 64, C.cream);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.39, 36, C.sand);
    game.draw.sprite(CLOTH, PAL_CLOTH, W / 2 - 150, H * 0.435, 6, { anchor: 'center' });
    txt('x ' + R.bulls, W / 2 - 90, H * 0.435, 40, C.cream, 'left');
    txt('MAX COMBO ' + R.maxCombo, W / 2 + 40, H * 0.435, 36, C.sand, 'left');
    if (R.score > R.prevBest && R.score > 0) txt('NEW RECORD', W / 2, H * 0.49, 52, C.coral);
    else txt('BEST ' + Math.max(R.prevBest, R.score), W / 2, H * 0.49, 44, C.sand);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.shots.length; i++) if (R.shots[i].st === 'wait' || R.shots[i].st === 'up') left++;
      txt('あと' + Math.max(1, left) + '射', W / 2, H * 0.545, 46, C.coral);
    } else if (R.prevBest > R.score) {
      txt('あと' + (R.prevBest - R.score) + '点', W / 2, H * 0.545, 46, C.cream);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.rect(0, 0, W, 232, C.ink, 0.55);
    game.draw.text(GAME_TITLE, W / 2 + 8, 92 + 8 + bob, { size: 116, color: C.ink, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 92 + bob, { size: 116, color: C.cream, bold: true, align: 'center' });
    game.draw.rect(W / 2 - 260, 150 + bob, 520, 10, C.coral);
    txt('BEST ' + game.best, W / 2, 196, 40, C.sand);
    drawLamps(290);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, C.coral);
    else txt('TAP TO START', W / 2, H * 0.955, 44, C.cream);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (beginPull(x, y)) game.audio.tone(300, 0.05, { wave: 'square', volume: 0.06 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || !R.pull) return;
    var n = movePull(x, y);
    if (n > 0) game.audio.tone(200 + n * 90, 0.04, { wave: 'triangle', volume: 0.06 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !R || !R.pull) return;
    var res = releasePull();
    if (res === 'weak') {
      game.audio.tone(170, 0.08, { wave: 'square', volume: 0.06 });
      game.fx.burst(POUCH_X, POUCH_Y - 30, { color: C.sand, count: 5, speed: 110 });
    } else {
      game.audio.play('se_jump', 0.35);
      if (res === 'idle') game.fx.burst(POUCH_X, POUCH_Y - 30, { color: C.cream, count: 6, speed: 160 });
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 44, C.cream);
      return;
    }
    stepRun(dt);
    drawWorld();
    drawHud();
    if (R.over) {
      drawResult();
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, bulls: R.bulls, maxCombo: R.maxCombo };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
