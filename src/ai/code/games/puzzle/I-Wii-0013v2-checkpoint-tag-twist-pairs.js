// I-Wii-0013v2-checkpoint-tag-twist-pairs.js
// 木札ひねり合わせ — 掛け台に吊るされた伏せ木札を指でひねって裏返し、同じ焼印の2枚を揃えて展示ケースへ納める
// 操作: 伏せた木札に指を置いて左右へひねる(横になぞる)と、紐を軸にくるりと回って焼印の面が出る。ただ触るだけでは揺れるだけ。2枚目が同じ焼印なら揃って展示ケースへ、違えば両方くるりと伏せ戻る。3つ目の掛け台は左右が逆向きの焼印が混じる(逆向きは別の印)
// 終わり: 20秒で3つの掛け台(2対・3対・3対)を回る。全8対を揃えるか、時間切れの時点で6対以上ならCLEAR。5対以下で時間切れならGAME OVER
// @mechanic: pair_match
// @theme: checkpoint_museum_brand_tags
// 世界観: 関所跡の資料館の収蔵室で、学芸員見習いが掛け台に伏せて吊るされた通行木札を1枚ずつひねって返し、同じ焼印の札を対にして展示ケースへ納めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えた対の数・空振り(不一致)回数・スコア
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・ガラス・真鍮の質感を縞の重ね塗りと細線で。上明・下暗で厚み
  var STYLE = { bg: ['#4a3424', '#2a1c12'], main: ['#d9b98a', '#a33a2a', '#c9a347'], accent: ['#3a2010', '#f4ead6'] };
  var C = {
    wood: STYLE.main[0], woodMid: '#c49a66', woodDk: '#9c7444', cord: STYLE.main[1], brass: STYLE.main[2], brassDk: '#8c6f2a',
    burn: STYLE.accent[0], paper: STYLE.accent[1], glass: '#9fc4c8', wall: '#3b2a1c', black: '#140c06', red: '#d2483a', green: '#7fbf6a',
  };

  var GAME_TITLE = 'FUDA TWIST';
  var TIME_LIMIT = 20;
  var TOTAL = 8;
  var NEEDED = 6;
  var TAG_W = 170, TAG_H = 250;

  // 焼印(7x7)。逆向きは flipX で別の印になる
  var MARKS = [
    ['..K.K..', '.KKKKK.', 'KK.K.KK', 'KKKKKKK', 'KK.K.KK', '.KKKKK.', '..K.K..'],
    ['...K...', '..KKK..', '.KK.KK.', 'KK...KK', '.......', 'KKKKKKK', 'KKKKKKK'],
    ['.......', 'KK..KK.', '.KKKK.K', '.......', 'KK..KK.', '.KKKK.K', '.......'],
    ['KKKKKK.', '.....K.', '.....K.', '.KKKKK.', '.K.....', '.K.....', '.KKKKKK'],
    ['KKKK...', 'K..K...', 'K..KKKK', 'K.....K', 'KKKK..K', '...K..K', '...KKKK'],
    ['KKKKKKK', '...K...', '..KKK..', '.K.K.K.', 'K..K..K', '...K...', '..KKK..'],
  ];
  // 掛け台の構成: [印番号, 逆向き]
  var RACKS = [
    { cols: 4, rows: 1, marks: [[0, 0], [0, 0], [1, 0], [1, 0]] },
    { cols: 3, rows: 2, marks: [[2, 0], [2, 0], [5, 0], [5, 0], [1, 0], [1, 0]] },
    { cols: 3, rows: 2, marks: [[3, 0], [3, 0], [3, 1], [3, 1], [4, 0], [4, 0]] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var rackIdx, tags, picks, lockT, cmpT, rackT, pairs, misses, combo, score, finalScore, shelf;
  var timeLeft, readyT, fin, cleared, postT, joyT, sadT, warnT, drag;

  // 学芸員見習い(丸眼鏡・白手袋)
  var CUR_A = ['...hhhhhh...', '..hhhhhhhh..', '..hssssssh..', '..gGsssGgs..', '..ssssssss..', '...ssmmss...', '....ssss....', '..vvvvvvvv..', '.vvvwwwwvvv.', 'wvvvwwwwvvvw', 'w.vvvvvvvv.w', '..kkkkkkkk..', '..kk....kk..'];
  var CUR_B = ['...hhhhhh...', '..hhhhhhhh..', '..hssssssh..', '..gGsssGgs..', '..ssssssss..', '...ssssss...', '....ssss....', '..vvvvvvvv..', '.vvvwwwwvvv.', 'wvvvwwwwvvvw', 'w.vvvvvvvv.w', '..kkkkkkkk..', '..kk....kk..'];
  var CUR_JOY = ['...hhhhhh...', '..hhhhhhhh..', '..hssssssh..', '..gGsssGgs..', '..ssssssss..', '...smmmms...', 'w...ssss...w', 'w.vvvvvvvv.w', '.vvvwwwwvvv.', '.vvvwwwwvvv.', '..vvvvvvvv..', '..kkkkkkkk..', '..kk....kk..'];
  var CUR_SAD = ['............', '...hhhhhh...', '..hhhhhhhh..', '..hssssssh..', '..gGsssGgs..', '..ssssssss..', '...smmmms...', '..vvvvvvvv..', '.vvvwwwwvvv.', 'wvvvwwwwvvvw', 'w.vvvvvvvv.w', '..kkkkkkkk..', '..kk....kk..'];
  var CUR_PAL = { h: '#2a1c12', s: '#f0c8a0', g: '#c9a347', G: '#f4ead6', m: '#a33a2a', v: '#5a6a4a', w: '#f4ead6', k: '#3b2a1c' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.black, bold: true });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true });
  }
  // 上明・下暗の4段縞で厚みを出す板
  function plank(x, y, w, h, c1, c2, c3) {
    game.draw.rect(x + 6, y + 8, w, h, C.black, 0.35);
    game.draw.rect(x, y, w, h, c3);
    game.draw.rect(x, y, w, h * 0.8, c2);
    game.draw.rect(x, y, w, h * 0.45, c1);
    game.draw.rect(x + 4, y + 4, w - 8, 4, '#ffffff', 0.35);
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function setupRack(k, fixed) {
    rackIdx = k; tags = []; picks = []; lockT = 0; cmpT = 0; rackT = 0;
    var cfg = RACKS[k], marks = cfg.marks.slice();
    if (!fixed) shuffle(marks);
    var gapX = cfg.cols === 4 ? 230 : 290, x0 = W / 2 - (cfg.cols - 1) * gapX / 2;
    for (var i = 0; i < marks.length; i++) {
      var c = i % cfg.cols, r = Math.floor(i / cfg.cols);
      var y = cfg.rows === 1 ? H * 0.4 : (r === 0 ? H * 0.33 : H * 0.53);
      tags.push({ x: x0 + c * gapX, y: y, m: marks[i][0], fl: marks[i][1], state: 'down', face: 0, target: 0, wob: 0, flash: 0, fly: 0 });
    }
  }

  function initGame() {
    pairs = 0; misses = 0; combo = 0; score = 0; finalScore = 0; shelf = [];
    timeLeft = TIME_LIMIT; readyT = 0.8; fin = false; cleared = false; postT = 0; joyT = 0; sadT = 0; warnT = 0; drag = null;
    setupRack(0, false);
  }

  function tagAt(x, y) {
    for (var i = 0; i < tags.length; i++) {
      var g = tags[i];
      if (g.state === 'done') continue;
      if (Math.abs(x - g.x) < TAG_W / 2 + 20 && y > g.y - 40 && y < g.y + TAG_H + 20) return i;
    }
    return -1;
  }

  function busy() { return lockT > 0 || cmpT > 0 || rackT > 0; }

  // 札をひねって返す(本番もデモも同じ処理)
  function twist(i) {
    var g = tags[i];
    if (g.state !== 'down' || busy() || picks.length >= 2) {
      g.wob = 0.4;
      game.audio.tone('G3', 0.05, { wave: 'triangle', volume: 0.06 });
      return;
    }
    g.state = 'up'; g.target = 1; picks.push(i);
    game.audio.tone(picks.length === 1 ? 'A4' : 'C5', 0.07, { wave: 'triangle', volume: 0.09, slide: 140 });
    game.audio.play('se_tap', 0.25);
    if (picks.length === 2) cmpT = 0.3;
  }

  function compare() {
    var a = tags[picks[0]], b = tags[picks[1]];
    if (a.m === b.m && a.fl === b.fl) {
      a.state = 'done'; b.state = 'done'; a.fly = 0.001; b.fly = 0.001;
      pairs++; combo++; joyT = 0.6;
      var pts = 150 + combo * 30;
      score += pts;
      shelf.push([a.m, a.fl]);
      game.feedback.good((a.x + b.x) / 2, Math.min(a.y, b.y) + 60, { text: combo >= 2 ? 'NICE' : 'GOOD', color: C.brass, size: 60 });
      game.fx.popup('+' + pts, (a.x + b.x) / 2, Math.min(a.y, b.y) - 20, { color: C.paper, size: 42 });
      picks = [];
      var left = 0;
      for (var i = 0; i < tags.length; i++) if (tags[i].state !== 'done') left++;
      if (left === 0) rackT = 0.8;
    } else {
      // 不一致: 2枚を止めて白く光らせ、少し大きく見せてから伏せ戻す
      misses++; combo = 0; sadT = 0.6; lockT = 0.5;
      a.flash = 0.5; b.flash = 0.5;
      game.fx.flash('#ffffff', 0.1);
      game.audio.tone('D3', 0.2, { wave: 'square', volume: 0.08, slide: -60 });
    }
  }

  function unflip() {
    var b = tags[picks[1]];
    game.feedback.bad(b.x, b.y + TAG_H / 2, { text: 'MISS', color: C.red, size: 54 });
    for (var k = 0; k < picks.length; k++) { var g = tags[picks[k]]; g.state = 'down'; g.target = 0; }
    picks = [];
  }

  function stepTags(dt) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    for (var i = 0; i < tags.length; i++) {
      var g = tags[i];
      if (g.face < g.target) g.face = Math.min(g.target, g.face + dt * 4);
      if (g.face > g.target) g.face = Math.max(g.target, g.face - dt * 4);
      if (g.wob > 0) g.wob -= dt;
      if (g.flash > 0) g.flash -= dt;
      if (g.fly > 0 && g.fly < 1) g.fly = Math.min(1, g.fly + dt * 2.2);
    }
    if (cmpT > 0) { cmpT -= dt; if (cmpT <= 0) compare(); }
    else if (lockT > 0) { lockT -= dt; if (lockT <= 0) unflip(); }
    else if (rackT > 0) {
      rackT -= dt;
      if (rackT <= 0) {
        if (rackIdx < RACKS.length - 1) {
          if (mode === S.PLAYING) {
            game.audio.play('se_milestone', 0.5);
            game.fx.popup(pairs + ' / ' + TOTAL, W / 2, H * 0.3, { color: C.brass, size: 86 });
          }
          setupRack(rackIdx + 1, mode !== S.PLAYING);
        } else if (mode === S.PLAYING) ending(true);
      }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 40) + (pairs >= TOTAL ? 500 : 0) : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, H * 0.25 + (i % 2) * 100, { color: i % 2 ? C.brass : C.paper, count: 18, speed: 480 });
      game.fx.flash(C.paper, 0.2);
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    var i = tagAt(x, y);
    if (i < 0) { game.audio.play('se_tap', 0.06); drag = null; return; }
    drag = { i: i, x0: x, done: false };
    tags[i].wob = 0.25;
    game.audio.tone('E4', 0.04, { wave: 'triangle', volume: 0.06 });
  });
  game.onMove(function(x, y) {
    if (!drag || drag.done || mode !== S.PLAYING) return;
    if (Math.abs(x - drag.x0) >= 55) {
      drag.done = true;
      twist(drag.i);
    } else if (Math.abs(x - drag.x0) > 20 && !drag.creak) {
      // ひねり始めのきしみ
      drag.creak = true; tags[drag.i].wob = 0.15;
      game.audio.tone('F4', 0.04, { wave: 'triangle', volume: 0.05, slide: 60 });
    }
  });
  game.onRelease(function(x, y) {
    if (drag && !drag.done && mode === S.PLAYING) {
      // 触っただけ: 札が揺れるだけで返らない
      tags[drag.i].wob = 0.45;
      game.audio.tone('C4', 0.05, { wave: 'triangle', volume: 0.06 });
    }
    drag = null;
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function room(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, C.wall], [1, STYLE.bg[1]]]);
    // 板壁の継ぎ目
    for (var x = 0; x < W; x += 135) game.draw.line(x, 230, x, H * 0.75, C.black, 3);
    // 展示ケース(ガラス+真鍮枠)
    var cy = 250;
    game.draw.rect(60, cy, W - 120, 150, C.black, 0.5);
    game.draw.rect(70, cy + 10, W - 140, 130, C.glass, 0.25);
    game.draw.rect(70, cy + 10, W - 140, 10, '#ffffff', 0.25);
    game.draw.rect(60, cy, W - 120, 8, C.brass); game.draw.rect(60, cy + 142, W - 120, 8, C.brassDk);
    var gl = (t * 200) % (W + 400) - 200;
    game.draw.line(gl, cy + 140, gl + 120, cy + 10, '#ffffff', 6);
    for (var s = 0; s < shelf.length; s++) {
      var sx = 120 + s * 110;
      plank(sx - 34, cy + 30, 68, 96, C.wood, C.woodMid, C.woodDk);
      game.draw.sprite(MARKS[shelf[s][0]], { K: C.burn }, sx, cy + 78, 7, { anchor: 'center', flipX: !!shelf[s][1] });
    }
    // 掛け台の横木と真鍮の釘
    var beams = RACKS[rackIdx].rows === 1 ? [H * 0.4] : [H * 0.33, H * 0.53];
    for (var b = 0; b < beams.length; b++) {
      plank(50, beams[b] - 70, W - 100, 34, C.woodMid, C.woodDk, '#7a5634');
    }
    // 机と帳面(手前)
    plank(0, H * 0.76, W, 70, C.woodMid, C.woodDk, '#7a5634');
    game.draw.rect(0, H * 0.76 + 70, W, H * 0.24, '#2e2016');
    game.draw.rect(620, H * 0.8, 300, 200, C.paper);
    for (var l = 0; l < 6; l++) game.draw.line(640, H * 0.8 + 30 + l * 28, 900, H * 0.8 + 30 + l * 28, C.woodDk, 2);
    for (var p = 0; p < pairs && p < 8; p++) game.draw.circle(660 + p * 32, H * 0.8 + 180, 10, C.cord);
  }

  function drawTag(g, t) {
    var sway = Math.sin(t * 1.5 + g.x * 0.01) * 4 + (g.wob > 0 ? Math.sin(t * 40) * 14 * g.wob : 0);
    var peg = g.y - 54;
    var fx = g.x, fy = g.y;
    if (g.state === 'done' && g.fly > 0) {
      var u = g.fly, tx = 120 + (shelf.length - 1) * 110, ty = 290;
      fx = g.x + (tx - g.x) * u; fy = g.y + (ty - g.y) * u - Math.sin(u * Math.PI) * 120;
      if (u >= 1) return;
    }
    if (g.state !== 'done') {
      game.draw.circle(g.x, peg, 14, C.brass);
      game.draw.line(g.x, peg, fx + sway, fy + 4, C.cord, 6);
    }
    var big = g.flash > 0 ? 1.12 : 1;
    var cw = Math.abs(Math.cos(g.face * Math.PI)) * TAG_W * big, h = TAG_H * big;
    var x = fx + sway - cw / 2, y = fy - (h - TAG_H) / 2;
    if (g.flash > 0 && Math.floor(t * 16) % 2 === 0) { game.draw.rect(x - 8, y - 8, cw + 16, h + 16, '#ffffff'); }
    var front = g.face > 0.5;
    if (front) plank(x, y, cw, h, C.paper, C.wood, C.woodMid);
    else plank(x, y, cw, h, C.wood, C.woodMid, C.woodDk);
    // 木目
    for (var k = 0; k < 4; k++) game.draw.line(x + 6, y + 40 + k * 52, x + cw - 6, y + 44 + k * 52, C.woodDk, 2);
    game.draw.circle(fx + sway, y + 16, 9, C.black);
    if (front && cw > 40) {
      var sc = Math.max(2, Math.round(14 * cw / TAG_W));
      game.draw.sprite(MARKS[g.m], { K: C.burn }, fx + sway, y + h * 0.55, sc, { anchor: 'center', flipX: !!g.fl });
    }
    // 伏せ札のひねり合図(1つ目の掛け台だけ)
    if (!front && rackIdx === 0 && g.state === 'down' && !busy()) {
      var p = 0.35 + Math.sin(t * 5) * 0.25, ay = y + h + 30;
      game.draw.line(fx - 50, ay, fx + 50, ay, C.paper, 6);
      game.draw.line(fx - 50, ay, fx - 30, ay - 14, C.paper, 6);
      game.draw.line(fx + 50, ay, fx + 30, ay + 14, C.paper, 6);
      game.draw.rect(fx - 56, ay - 20, 112, 40, C.black, 1 - p);
    }
  }

  function drawCurator(t) {
    var f = sadT > 0 || (fin && !cleared) ? CUR_SAD : joyT > 0 || (fin && cleared) ? CUR_JOY : (Math.floor(t * 2) % 2 ? CUR_A : CUR_B);
    var hop = joyT > 0 ? -Math.abs(Math.sin(t * 14)) * 20 : Math.sin(t * 2.2) * 4;
    game.draw.sprite(f, CUR_PAL, 250, H * 0.85 + hop, 15, { anchor: 'center' });
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 30, W - 120, 24, C.black);
    game.draw.rect(64, 34, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? C.red : C.brass);
    out(pairs + ' / ' + TOTAL, W / 2, 140, 66, pairs >= NEEDED ? C.green : C.paper);
    for (var r = 0; r < RACKS.length; r++) {
      game.draw.rect(70 + r * 56, 120, 40, 40, r < rackIdx ? C.brass : r === rackIdx ? C.paper : C.black);
    }
    out('' + score, W - 150, 140, 44, C.brass);
    // 6対の目標ライン(帳面の印と同じ赤丸)
    for (var n = 0; n < TOTAL; n++) game.draw.circle(W / 2 - 140 + n * 40, 200, 10, n < pairs ? C.cord : n < NEEDED ? C.paper : C.woodDk, n < pairs ? 1 : 0.5);
  }

  function drawScene(t) {
    room(t);
    for (var i = 0; i < tags.length; i++) drawTag(tags[i], t);
    drawCurator(t);
  }

  // ---- ATTRACT: 本物の twist()/compare() で1つ目の掛け台。1組目は不一致で伏せ戻り、覚えた位置で2組揃える ----
  var demo = { t: 0, x: W / 2, y: H * 0.8, press: false, step: 0, ph: 0, pt: 0 };
  var DEMO_SEQ = [0, 2, 3, 2, 0, 1];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9.5;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0; setupRack(0, true);
      demo.step = 0; demo.ph = 0; demo.pt = 0;
    }
    stepTags(dt);
    demo.press = false;
    var tx = W / 2, ty = H * 0.8;
    if (demo.step < DEMO_SEQ.length) {
      var g = tags[DEMO_SEQ[demo.step]];
      demo.pt += dt;
      if (demo.ph === 0) { tx = g.x; ty = g.y + TAG_H / 2; if (demo.pt > 0.45) { demo.ph = 1; demo.pt = 0; } }
      else if (demo.ph === 1) {
        demo.press = true; tx = g.x + Math.min(1, demo.pt / 0.3) * 120 - 40; ty = g.y + TAG_H / 2;
        if (demo.pt >= 0.3) { twist(DEMO_SEQ[demo.step]); demo.ph = 2; demo.pt = 0; }
      } else {
        tx = demo.x; ty = demo.y;
        if (!busy() && demo.pt > 0.25) { demo.step++; demo.ph = 0; demo.pt = 0; }
      }
    }
    if (demo.ph === 1) { demo.x = tx; demo.y = ty; }
    else { demo.x += (tx - demo.x) * Math.min(1, dt * 8); demo.y += (ty - demo.y) * Math.min(1, dt * 8); }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 96, C.brass);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 38, C.paper);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.97, 46, C.brass);
      else out('TAP TO START', W / 2, H * 0.97, 40, C.paper);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 520, C.black, 0.88);
      game.draw.rect(90, H * 0.3, W - 180, 10, cleared ? C.brass : C.red);
      out(cleared ? 'CLEAR' : 'TIME UP', W / 2, H * 0.35, 100, cleared ? C.brass : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, C.paper);
      out(pairs + ' / ' + TOTAL + '   MISS ' + misses, W / 2, H * 0.46, 44, C.paper);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, C.brass);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, C.brass);
      if (!cleared) out('あと' + (NEEDED - pairs) + '対!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.paper);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepTags(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { pairs: pairs, misses: misses, racks: rackIdx + (pairs >= TOTAL ? 1 : 0) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      stepTags(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && timeLeft <= 0) {
        timeLeft = 0;
        if (pairs >= NEEDED) ending(true);
        else {
          game.fx.flash('#ffffff', 0.15);
          game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: C.red, size: 72 });
          ending(false);
        }
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, C.brass);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 1],
      ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['A4', 2],
      ['E5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 1],
      ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['A4', 2],
    ], { tempo: 96, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 2], ['E2', 2], ['G2', 2], ['A2', 2], ['C3', 2], ['G2', 2], ['E2', 2], ['A2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
