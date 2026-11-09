// I-Wii-0008v2-gorge-inn-char-strike.js
// 渓流宿の岩魚合わせ — 3つの淵に立てた竿の浮きを見張り、小さな突つきには乗らず、浮きが深く沈んだ1本にだけ合わせる。合わせたら構え直すまで次は合わせられない
// 操作: 深く沈んだ浮き(白い輪が光り水しぶきが立つ)をタップして合わせる。魚影が浮きの周りを回って小さく突ついている間・真下に潜り込んで震えている間に押すと魚が逃げる。合わせた後は主人の周りの輪が満ちるまで構え直し中で、その間に押すと糸が絡んで構え直しが延びる。沈んだまま放っておくと餌を取られる
// 終わり: 15秒以内に岩魚を6匹釣ればCLEAR。届かなければTIME UP(GAME OVER)
// @mechanic: cooldown_tap
// @theme: mountain_stream_inn_char
// 世界観: 山奥の渓流沿いの釣り宿で、宿の主人が夕餉の岩魚を釣るため3つの淵に竿を並べ、小さなあたりには焦らず深く引き込んだ1本にだけ合わせては、また構え直して次を待つ
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(釣った数・合わせの早さ・逃がした数)
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 3層以上のパララックス、光源は左上の夕日に統一、細かいコマのアニメ
  var STYLE = { bg: ['#f6c38a', '#8fb7c9', '#2e4a3a'], main: ['#3d7a8c', '#5aa0a8', '#6b8f4e'], accent: ['#e8452f', '#fff4d6'] };
  var C = {
    dusk: STYLE.bg[0], sky: STYLE.bg[1], forest: STYLE.bg[2], deep: STYLE.main[0], water: STYLE.main[1], moss: STYLE.main[2],
    red: STYLE.accent[0], light: STYLE.accent[1], white: '#ffffff', ink: '#1a1e1c', rock: '#6e6a62', rockHi: '#9a948a', wood: '#7a5232', gold: '#ffd24a',
  };

  var GAME_TITLE = 'GORGE STRIKE';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var COOLDOWN = 1.0;
  var MAN_X = 540, MAN_Y = Math.round(H * 0.84);
  var POOLS = [{ x: 220, y: Math.round(H * 0.5) }, { x: 540, y: Math.round(H * 0.58) }, { x: 860, y: Math.round(H * 0.48) }];
  var HIT_R = 190;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var floats, cool, coolMax, catches, quick, spooks, stolen, armT, strikeIdx, flying, pullsMade;
  var score, countIn, over, won, endT, prevBest, playT, stopT;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 宿の主人(鉢巻・半纏): 構え/合わせ/構え直し/喜び
  var MAN = [
    ['...rrrr...', '..rhhhhr..', '..hssssh..', '..seskes..', '...smms...', '..bbbbbb..', '.bbbwwbbb.', 'sbbbwwbbbs', '..bbbbbb..', '..gg..gg..'],
    ['s..rrrr..s', 's.rhhhhr.s', '.bhssssb..', '..seskes..', '...sOOs...', '..bbbbbb..', '..bbwwbb..', '..bbwwbb..', '..bbbbbb..', '..gg..gg..'],
    ['...rrrr...', '..rhhhhr..', '..hssssh..', '..sqssqs..', '...smms...', '..bbbbbb..', '.bbbwwbbb.', '.sbbwwbbs.', '..sbbbbs..', '..gg..gg..'],
    ['s.rrrr..s.', 's.hhhhr.s.', 's.ssssh.s.', '.bseskesb.', '..bsOOsb..', '..bbbbbb..', '..bbwwbb..', '..bbwwbb..', '..bbbbbb..', '..gg..gg..'],
  ];
  var MAN_PAL = { r: '#e8452f', h: '#d8d0c0', s: '#e8b88a', e: '#1a1e1c', k: '#1a1e1c', q: '#1a1e1c', m: '#a0503a', O: '#a0503a', b: '#2e4a7a', w: '#f0e8d8', g: '#3a3028' };
  var CHAR_FISH = [
    ['....ooo.....', '..ooowoooo.t', '.oeooowoooott', '..yyyyyyyy.t', '....yyy.....'],
    ['....ooo....t', '..ooowooootl', '.oeooowooot.', '..yyyyyyyy.t', '....yyy.....'],
  ];
  var FISH_PAL = { o: '#6b7a4e', w: '#f4f0e0', e: '#1a1e1c', y: '#f0a050', t: '#5a6a40', l: '#5a6a40' };

  function newFloat(i) {
    return { i: i, x: POOLS[i].x, y: POOLS[i].y, st: 'quiet', t: 0, dur: game.random(0.4, 1.4), nibT: 0, dip: 0, shadowA: game.random(0, 6), big: false, flee: 0, pop: 0 };
  }

  function resetRun() {
    floats = [newFloat(0), newFloat(1), newFloat(2)];
    cool = 0; coolMax = COOLDOWN; catches = 0; quick = 0; spooks = 0; stolen = 0; armT = 0; strikeIdx = -1; flying = []; pullsMade = 0;
  }

  function initGame() {
    resetRun();
    score = 0; countIn = 0.8; over = false; won = false; endT = 0; prevBest = game.best; playT = 0; stopT = 0;
  }

  function difficulty() { return Math.min(1, playT / TIME_LIMIT); }

  function setSt(f, st, dur) { f.st = st; f.t = 0; f.dur = dur; }

  // 浮きの状態: quiet → circle(魚影が回り小さく突つく) → tele(真下に潜り震える) → pull(深く沈む=合わせ時) → stolen
  function stepFloat(f, dt) {
    var k = difficulty();
    f.t += dt;
    f.shadowA += dt * (f.st === 'circle' ? 2.6 : 1.2);
    if (f.dip > 0) f.dip -= dt;
    if (f.pop > 0) f.pop -= dt;
    if (f.flee > 0) f.flee -= dt;
    if (f.st === 'quiet' && f.t >= f.dur) {
      pullsMade++;
      f.big = pullsMade % 5 === 0;
      setSt(f, 'circle', game.random(0.7, 1.4));
      f.nibT = game.random(0.15, 0.4);
    } else if (f.st === 'circle') {
      f.nibT -= dt;
      if (f.nibT <= 0) {
        f.dip = 0.16; f.nibT = game.random(0.28, 0.55) * (1 - 0.3 * k);
        game.audio.tone(1175 + f.i * 80, 0.03, { wave: 'triangle', volume: 0.05 });
      }
      if (f.t >= f.dur) { setSt(f, 'tele', 0.5); game.audio.tone(196, 0.12, { wave: 'triangle', volume: 0.07 }); }
    } else if (f.st === 'tele' && f.t >= f.dur) {
      setSt(f, 'pull', (f.big ? 0.75 : 0.62) - 0.14 * k);
      game.audio.tone(330, 0.08, { wave: 'square', volume: 0.08, slide: -120 });
      game.fx.burst(f.x, f.y, { color: C.white, count: 8, speed: 200 });
    } else if (f.st === 'pull' && f.t >= f.dur) {
      setSt(f, 'stolen', 0.9); f.pop = 0.3; stolen++;
      game.audio.tone(523, 0.06, { wave: 'triangle', volume: 0.06, slide: 200 });
    } else if ((f.st === 'stolen' || f.st === 'spooked') && f.t >= f.dur) {
      setSt(f, 'quiet', game.random(0.3, 1.2) * (1 - 0.3 * k));
    }
  }

  function strike(f) {
    if (cool > 0) {
      // 構え直し中: 糸が絡んで構え直しが延びる
      cool = Math.min(coolMax + 0.5, cool + 0.4); coolMax = Math.max(coolMax, cool);
      game.feedback.bad(MAN_X, MAN_Y - 200, { text: 'MISS', shake: 0.05 });
      return 'fumble';
    }
    cool = COOLDOWN; coolMax = COOLDOWN; armT = 0.35; strikeIdx = f.i;
    if (f.st === 'pull') {
      var react = f.t;
      var pts = Math.round((100 + Math.max(0, 1 - react / f.dur) * 100) * (f.big ? 3 : 1));
      var res = react <= 0.2 ? 'PERFECT' : 'GOOD';
      if (state === S.PLAYING) { catches++; score += pts; if (res === 'PERFECT') quick++; }
      game.feedback.good(f.x, f.y - 120, { text: res + ' +' + pts, color: f.big ? C.gold : C.light, size: f.big ? 60 : 48, count: f.big ? 22 : 12 });
      flying.push({ x: f.x, y: f.y, t: 0, big: f.big });
      setSt(f, 'quiet', game.random(0.5, 1.2));
      if (state === S.PLAYING && catches === NEEDED - 2) { game.audio.play('se_milestone', 0.45); game.fx.popup(catches + '/' + NEEDED, W / 2, Math.round(H * 0.3), { color: C.gold, size: 84 }); }
      if (f.big) game.audio.play('se_powerup', 0.4);
      return 'catch';
    }
    if (f.st === 'circle' || f.st === 'tele') {
      // 早合わせ: 魚が逃げる
      f.flee = 0.6; setSt(f, 'spooked', 1.4); spooks++;
      game.feedback.bad(f.x, f.y - 100, { text: 'MISS' });
      return 'spook';
    }
    game.audio.play('se_tap', 0.1);
    game.fx.burst(f.x, f.y, { color: C.water, count: 6, speed: 140 });
    return 'empty';
  }

  function nearestFloat(x, y) {
    var best = null, bd = HIT_R;
    for (var i = 0; i < floats.length; i++) {
      var d = Math.hypot(floats[i].x - x, floats[i].y - y);
      if (d < bd) { bd = d; best = floats[i]; }
    }
    return best;
  }

  function stepWorld(dt) {
    if (cool > 0) { cool -= dt; if (cool <= 0) { cool = 0; game.audio.tone(880, 0.05, { wave: 'square', volume: 0.06 }); } }
    if (armT > 0) armT -= dt;
    for (var i = 0; i < floats.length; i++) stepFloat(floats[i], dt);
    for (var j = flying.length - 1; j >= 0; j--) {
      flying[j].t += dt;
      if (flying[j].t > 0.7) { flying.splice(j, 1); game.audio.play('se_coin', 0.3); }
    }
  }

  // ── 描画 ──
  function drawScenery() {
    var t = game.time.elapsed;
    game.draw.gradient(0, Math.round(H * 0.42), [[0, C.sky], [0.7, '#d8c8a8'], [1, C.dusk]]);
    // 夕日(光源)+ブルーム
    var sunY = Math.round(H * 0.17);
    game.draw.circle(170, sunY, 110, C.light, 0.18);
    game.draw.circle(170, sunY, 56, C.light, 0.9);
    // 遠山(最奥・ゆっくり流れる霧)
    for (var m = 0; m < 6; m++) {
      var mx = m * 220 - 60, mh = 120 + (m % 3) * 50;
      for (var r = 0; r < mh; r += 8) game.draw.rect(mx + 110 * (1 - r / mh) - 40, 560 - mh + r, (220 + 80) * (r / mh), 8, '#7c96a0');
    }
    game.draw.rect(0, 520 + Math.sin(t * 0.5) * 6, W, 30, C.light, 0.2);
    // 中景の杉林
    for (var p = 0; p < 12; p++) {
      var px = p * 96 + 20, ph = 140 + (p % 4) * 30;
      for (var q = 0; q < ph; q += 8) game.draw.rect(px + 40 * (1 - q / ph) - 6, 700 - ph + q, 80 * (q / ph) + 12, 8, p % 2 ? C.forest : '#3a5a42');
    }
    // 渓流(流れの筋が右へ動く)
    game.draw.gradient(690, Math.round(H * 0.74), [[0, C.water], [0.5, C.deep], [1, '#2c5a64']]);
    for (var s = 0; s < 22; s++) {
      var sy = 720 + (s * 37) % 680, sx = ((s * 173 + t * (80 + (s % 3) * 30)) % (W + 200)) - 100;
      game.draw.rect(sx, sy, 60 + (s % 4) * 20, 4, C.light, 0.25);
    }
    // 岩(左上から光)
    var rocks = [[60, 760, 90], [1010, 820, 100], [380, 1340, 80], [720, 1330, 70], [960, 1300, 90], [120, 1290, 80]];
    for (var k = 0; k < rocks.length; k++) {
      game.draw.circle(rocks[k][0], rocks[k][1], rocks[k][2], C.rock);
      game.draw.circle(rocks[k][0] - rocks[k][2] * 0.3, rocks[k][1] - rocks[k][2] * 0.3, rocks[k][2] * 0.5, C.rockHi);
    }
    // 宿の縁台(手前)
    game.draw.rect(0, Math.round(H * 0.76), W, H, C.wood);
    for (var b = 0; b < 8; b++) game.draw.rect(0, Math.round(H * 0.76) + b * 60, W, 4, '#5a3a22');
  }

  function drawFloat(f) {
    var t = game.time.elapsed;
    var by = f.y, bx = f.x;
    // 竿と糸
    var tipX = MAN_X + (f.i - 1) * 170, tipY = MAN_Y - 260 - (armT > 0 && strikeIdx === f.i ? 140 : 0);
    game.draw.line(MAN_X + (f.i - 1) * 40, MAN_Y - 40, tipX, tipY, C.wood, 7);
    // 魚影
    if (f.st === 'circle' || f.st === 'tele' || f.st === 'pull' || f.flee > 0) {
      var rr = f.st === 'circle' ? 60 : 8;
      var sx = bx + Math.cos(f.shadowA) * rr, sy = by + 30 + Math.sin(f.shadowA) * rr * 0.4;
      if (f.flee > 0) { sx = bx + (0.6 - f.flee) * 600; sy = by + 40; }
      var sz = f.big ? 1.6 : 1;
      var dark = f.st === 'tele' || f.st === 'pull' ? 0.55 : 0.32;
      game.draw.circle(sx, sy, 34 * sz, C.ink, dark);
      game.draw.circle(sx + 34 * sz, sy, 20 * sz, C.ink, dark);
    }
    // 浮きの沈み
    var off = Math.sin(t * 3 + f.i) * 4;
    if (f.dip > 0) off += 12;
    if (f.st === 'tele') off += Math.sin(t * 60) * 5;
    if (f.st === 'pull') off += 36;
    if (f.pop > 0) off -= f.pop * 60;
    game.draw.line(tipX, tipY, bx, by + off - 30, C.light, 2);
    // 波紋
    var ring = f.st === 'pull' ? 1 : (f.dip > 0 ? 0.5 : 0.15);
    game.draw.circle(bx, by + 6, 40 + ring * 30 + Math.sin(t * 6) * 4, C.light, 0.18 * ring + 0.05);
    if (f.st === 'pull') {
      var bl = Math.floor(t * 10) % 2 === 0;
      game.draw.circle(bx, by + 6, 96, C.white, bl ? 0.5 : 0.25);
      game.draw.circle(bx, by + 6, 84, C.deep, 0.6);
      game.draw.circle(bx - 30, by - 20 - Math.abs(Math.sin(t * 14)) * 30, 10, C.white);
      game.draw.circle(bx + 26, by - 14 - Math.abs(Math.cos(t * 12)) * 26, 8, C.white);
    }
    // 浮き本体(赤と白)
    if (off < 30) {
      game.draw.circle(bx, by + off - 26, 14, C.red);
      game.draw.circle(bx, by + off - 10, 12, C.white);
    } else {
      game.draw.circle(bx, by + off - 26, 9, C.red);
    }
    if (f.st === 'spooked' && f.t < 0.5) game.draw.circle(bx, by, 60 + f.t * 120, C.white, 0.3 * (1 - f.t * 2));
  }

  function drawMan() {
    var t = game.time.elapsed;
    var fr = MAN[0];
    if (over && won) fr = MAN[3];
    else if (armT > 0) fr = MAN[1];
    else if (cool > 0) fr = MAN[2];
    var bob = Math.sin(t * 2.5) * 3;
    // 構え直しの輪(満ちたら合わせられる)
    var segs = 24, filled = cool > 0 ? Math.round(segs * (1 - cool / coolMax)) : segs;
    for (var i = 0; i < segs; i++) {
      var a = -Math.PI / 2 + i / segs * Math.PI * 2;
      game.draw.circle(MAN_X + Math.cos(a) * 150, MAN_Y - 40 + Math.sin(a) * 150, 12, i < filled ? (cool > 0 ? C.light : C.gold) : '#00000044');
    }
    game.draw.sprite(fr, MAN_PAL, MAN_X, MAN_Y - 40 + bob, 18, { anchor: 'center' });
  }

  function drawFlying() {
    for (var i = 0; i < flying.length; i++) {
      var f = flying[i], u = f.t / 0.7;
      var x = f.x + (180 - f.x) * u, y = f.y + (Math.round(H * 0.9) - f.y) * u - Math.sin(u * Math.PI) * 360;
      game.draw.sprite(CHAR_FISH[Math.floor(f.t * 12) % 2], FISH_PAL, x, y, f.big ? 13 : 9, { anchor: 'center' });
    }
  }

  function drawCreel() {
    var cx = 180, cy = Math.round(H * 0.9);
    game.draw.circle(cx, cy, 80, '#a07a40');
    game.draw.rect(cx - 80, cy - 30, 160, 40, '#c09a58');
    for (var i = 0; i < NEEDED; i++) {
      var fx = W - 400 + (i % 3) * 120, fy = Math.round(H * 0.88) + Math.floor(i / 3) * 70;
      game.draw.sprite(CHAR_FISH[0], FISH_PAL, fx, fy, 7, { anchor: 'center', alpha: i < catches ? 1 : 0.25 });
    }
  }

  function drawWorld() {
    drawScenery();
    for (var i = 0; i < floats.length; i++) drawFloat(floats[i]);
    drawCreel();
    drawMan();
    drawFlying();
  }

  function hud() {
    label(String(score), 190, 110, 64, C.white);
    label(catches + ' / ' + NEEDED, W - 190, 110, 54, C.gold);
    var timeBar = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(60, 168, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 168, (W - 120) * timeBar, 16, timeBar < 0.25 ? C.red : C.light);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || countIn > 0 || stopT > 0) { game.audio.play('se_tap', 0.05); return; }
    var f = nearestFloat(x, y);
    if (f) strike(f);
    else { game.audio.play('se_tap', 0.06); game.fx.burst(x, y, { color: C.light, count: 4, speed: 100 }); }
  });

  // ── ATTRACT: 実ロジックで、突つきの間は待って深い沈みで合わせる → 構え直し中に別の淵が沈んでも押さない → 突つきで焦って押し魚が逃げる ──
  var demo = { t: 0, gx: MAN_X, gy: H * 0.7, press: false, phase: 0, hold: 0 };
  function demoStep(dt) {
    demo.t += dt;
    if (demo.t <= dt) {
      resetRun();
      setSt(floats[0], 'circle', 1.3); floats[0].nibT = 0.2;
      setSt(floats[1], 'quiet', 1.3);
      setSt(floats[2], 'quiet', 3.0);
      demo.phase = 0; demo.hold = 0;
    }
    stepWorld(dt);
    if (demo.hold > 0) demo.hold -= dt;
    demo.press = demo.hold > 0;
    var tgt = demo.phase === 0 ? floats[0] : floats[2];
    demo.gx += (tgt.x + 30 - demo.gx) * Math.min(1, dt * 5); demo.gy += (tgt.y + 90 - demo.gy) * Math.min(1, dt * 5);
    if (demo.phase === 0 && floats[0].st === 'pull' && floats[0].t > 0.12) { strike(floats[0]); demo.hold = 0.2; demo.phase = 1; }
    else if (demo.phase === 1 && floats[2].st === 'circle' && floats[2].dip > 0.1 && cool <= 0) { strike(floats[2]); demo.hold = 0.2; demo.phase = 2; }
    else if (demo.phase === 2 && floats[2].st === 'quiet' && demo.hold <= 0) { demo.t = 0; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!floats) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      label(GAME_TITLE, W / 2, 110, 88, C.gold);
      label('HI-SCORE ' + game.best, W / 2, 180, 38, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1880, 44, C.gold);
      else label('TAP TO START', W / 2, 1880, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      game.draw.rect(0, 250, W, 340, C.ink, 0.55);
      label(won ? 'CLEAR' : 'TIME UP', W / 2, 345, 100, won ? C.gold : C.red);
      label('SCORE ' + score, W / 2, 425, 58, C.white);
      label(catches + ' / ' + NEEDED + '  PERFECT ' + quick, W / 2, 485, 40, C.light);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, 555, 52, C.gold);
      else label('BEST ' + Math.max(prevBest, score), W / 2, 555, 42, C.white);
      if (!won) label('あと' + Math.max(1, NEEDED - catches) + '匹!', W / 2, 1000, 64, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1880, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { catches: catches, perfect: quick, spooked: spooks, stolen: stolen };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      // hit-stop: 時間切れの瞬間、取り逃がした淵を光らせて止める
      stopT -= dt;
      if (stopT <= 0) { game.feedback.bad(W / 2, Math.round(H * 0.4), { text: 'TIME UP' }); over = true; won = false; finish(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (!over) {
      playT += dt;
      stepWorld(dt);
      if (catches >= NEEDED) {
        over = true; won = true;
        score += Math.round(Math.max(0, TIME_LIMIT - playT) * 40);
        finish();
      } else if (playT >= TIME_LIMIT) {
        stopT = 0.45;
        game.audio.tone(220, 0.2, { wave: 'sawtooth', volume: 0.1, slide: -80 });
      }
    }

    drawWorld();
    if (stopT > 0) for (var i = 0; i < floats.length; i++) game.draw.circle(floats[i].x, floats[i].y, 110, C.white, 0.35);
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.38), 120, C.gold);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 7; i++) game.fx.burst(game.random(140, 940), game.random(400, 1300), { color: i % 2 ? C.gold : C.light, count: 22, speed: 460 });
  }

  // 渓流のせせらぎ節(オリジナル)
  var TUNE = [
    ['D5', 1], ['B4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1],
    ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 2],
    ['B4', 1], ['D5', 0.5], ['B4', 0.5], ['A4', 1], ['G4', 1],
    ['E4', 0.5], ['D4', 0.5], ['E4', 1], ['G4', 2],
  ];
  var TUNE_OPTS = { tempo: 104, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 2], ['E2', 2], ['C3', 2], ['D3', 2]] };

  game.onStart(function() {
    game.audio.melody(TUNE, TUNE_OPTS);
    state = S.ATTRACT;
    initGame();
  });
})(game);
