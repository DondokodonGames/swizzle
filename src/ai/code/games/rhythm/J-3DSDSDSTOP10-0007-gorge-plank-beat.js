// J-3DSDSDSTOP10-0007-gorge-plank-beat.js
// 谷渡りの一本板 — 揺れる一本板の上で、太鼓の拍に合わせて一歩ずつ踏みしめ揺れを鎮めて渡る
// 操作: 流れてくる太鼓の印が足元の輪に重なった瞬間にタップ。拍を外す・叩き損ねると揺れが大きくなる
// 終わり: 18拍の最後まで落ちずに対岸へ着けばCLEAR。揺れが限界を超えると落ちてGAME OVER
// @mechanic: rhythm
// @theme: gorge_plank_crossing
// 世界観: 深い谷に架かった一本板を、山の茶屋へ荷を運ぶ担ぎ手が、向こう岸で鳴る案内太鼓の拍に歩調を合わせて揺れを殺しながら渡り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 踏めた拍数・PERFECT数・最大連続
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、太い形、密度を抑える
  var STYLE = { bg: ['#8fa8b8', '#b8c8a8', '#6a7a5a'], main: ['#e8e0c8', '#7a6a50', '#4a5a4a'], accent: ['#e8a040', '#c85040'] };
  var C = { sky: '#8fa8b8', cliff: '#6a6a58', cliffD: '#4a4a40', plank: '#a08058', rope: '#d8c8a0', cream: '#e8e0c8', ink: '#2a2a28', gold: '#e8a040', red: '#c85040', green: '#88b060', lane: '#4a5a4a' };

  var GAME_TITLE = 'PLANK BEAT';
  var TIME_LIMIT = 14;
  var BEAT = 0.5;
  var LEAD = 2;
  var CHART = [0, 1, 2, 3, 4, 5, 6, 6.5, 7, 8, 9, 10, 10.5, 11, 12, 13, 14, 15];
  var NEEDED = CHART.length;
  var HIT_X = W * 0.2, LANE_Y = H * 0.84, SPEED = 520; // px/秒
  var WIN_GOOD = 0.15, WIN_PERFECT = 0.07;

  var PORTER = ['...###....', '..#####...', '...#o#..##', '..#####.##', '.#######.#', '#.#####...', '..#####...', '..#...#...', '.##...##..'];
  var PORTER2 = ['...###....', '..#####...', '...#o#..##', '..#####.##', '.#######.#', '#.#####...', '..#####...', '...#.#....', '..##.##...'];
  var DRUM = ['.####.', '#oooo#', '######', '#.##.#', '.####.'];
  var CROW = ['#...#', '.#.#.', '..#..'];
  var TEAHOUSE = ['...##...', '..####..', '.######.', '########', '.#.##.#.', '.#.##.#.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var songT, notes, stepped, perfects, combo, bestCombo, sway, swayPh, timeLeft, ready, ended, ok, hitStop, endWait, score, milestone, gust, gustAt, lastBeat, stepAnim, fell;

  function initGame() {
    songT = -0.3; notes = [];
    for (var i = 0; i < CHART.length; i++) notes.push({ t: (CHART[i] + LEAD) * BEAT, st: 0 });
    stepped = 0; perfects = 0; combo = 0; bestCombo = 0; sway = 0.15; swayPh = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; ended = false; ok = false; hitStop = 0; endWait = 0; score = 0;
    milestone = false; gust = 0; gustAt = (LEAD + 8.3) * BEAT; lastBeat = -1; stepAnim = 0; fell = false;
  }

  // 実ロジック: 1回のタップを拍に照らして判定(デモも同じ関数)
  function stomp(demoMode) {
    var best = null, bd = 99;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].st !== 0) continue;
      var d = Math.abs(songT - notes[i].t);
      if (d < bd) { bd = d; best = notes[i]; }
    }
    if (best && bd <= WIN_GOOD) {
      best.st = 1; stepped++; combo++; bestCombo = Math.max(bestCombo, combo); stepAnim = 0.2;
      var perfect = bd <= WIN_PERFECT;
      if (perfect) perfects++;
      sway = Math.max(0.05, sway - (perfect ? 0.12 : 0.07));
      if (!demoMode) {
        score += (perfect ? 150 : 100) + combo * 5;
        game.feedback.good(HIT_X, LANE_Y - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.green, size: 48 });
        if (!milestone && stepped >= NEEDED / 2) {
          milestone = true; game.audio.play('se_milestone', 0.6);
          game.fx.popup(stepped + ' / ' + NEEDED, W / 2, H * 0.22, { color: C.gold, size: 70 });
        }
      } else {
        game.fx.burst(HIT_X, LANE_Y, { color: C.gold, count: 8 });
      }
      return;
    }
    // 拍の外で踏んだ = 板が跳ねる
    combo = 0; sway += 0.12;
    if (!demoMode) game.feedback.bad(HIT_X, LANE_Y - 90, { text: 'MISS', shake: 5 });
    else game.fx.burst(HIT_X, LANE_Y, { color: C.red, count: 6 });
  }

  function stepSong(dt, demoMode) {
    songT += dt;
    swayPh += dt * (3 + sway * 2);
    sway += dt * 0.02;
    if (stepAnim > 0) stepAnim -= dt;
    // 案内太鼓(拍の音)
    var beatIdx = Math.floor(songT / BEAT);
    if (beatIdx !== lastBeat && songT >= 0) {
      lastBeat = beatIdx;
      if (!demoMode) game.audio.tone(beatIdx % 4 === 0 ? 'C3' : 'G2', 0.09, { wave: 'triangle', volume: 0.12 });
    }
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.st === 0 && songT - n.t > WIN_GOOD) {
        n.st = 2; combo = 0; sway += 0.22;
        if (!demoMode) game.feedback.bad(HIT_X, LANE_Y - 90, { text: 'MISS', shake: 6 });
      }
    }
    // 横風: 0.7秒前に木の葉の筋で予告
    if (!demoMode && gust <= 0 && songT >= gustAt - 0.7 && songT < gustAt) { gust = 0.7; game.audio.tone('D5', 0.6, { wave: 'sawtooth', volume: 0.03, slide: -250 }); }
    if (gust > 0) { gust -= dt; if (gust <= 0) { sway += 0.18; gustAt += 5 * BEAT; } }
  }

  function porterPos(t) {
    var judged = 0;
    for (var i = 0; i < notes.length; i++) if (notes[i].st !== 0) judged++;
    var progress = judged / NEEDED;
    var px = W * 0.14 + progress * W * 0.66;
    var dx = Math.sin(swayPh) * sway * 110;
    var a = Math.max(0, Math.min(1, (px - W * 0.12) / (W * 0.76)));
    var by = H * 0.53 + Math.sin(a * Math.PI) * (30 + sway * 50 + Math.sin(swayPh) * sway * 24);
    return { x: px + dx, y: by - 20 - Math.abs(Math.sin(swayPh)) * sway * 30 };
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function drawGorge(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.45, STYLE.bg[1]], [0.75, STYLE.bg[2]], [1, '#3a4a3a']]);
    game.draw.rect(0, 0, W, H, C.cream, 0.03 + 0.03 * Math.sin(t * 1.5));
    // 遠い峰と谷底の霧
    for (var m = 0; m < 5; m++) game.draw.rect(m * 240 - 30, H * 0.2 + (m % 2) * 30, 260, H * 0.2, '#7a8a8a', 0.6);
    for (var f = 0; f < 4; f++) game.draw.rect(((t * 30 + f * 320) % (W + 300)) - 150, H * 0.66 + f * 12, 260, 22, C.cream, 0.25);
    // 崖(左右)
    game.draw.rect(0, H * 0.52, W * 0.12, H * 0.22, C.cliff, 1);
    game.draw.rect(W * 0.88, H * 0.52, W * 0.12, H * 0.22, C.cliff, 1);
    game.draw.rect(0, H * 0.52, W * 0.12, 16, C.green, 1);
    game.draw.rect(W * 0.88, H * 0.52, W * 0.12, 16, C.green, 1);
    game.draw.sprite(TEAHOUSE, { '#': C.plank }, W * 0.94, H * 0.47, 12, { anchor: 'center' });
    for (var c = 0; c < 2; c++) game.draw.sprite(CROW, { '#': C.ink }, ((t * 60 + c * 520) % (W + 100)) - 50, H * 0.16 + c * 70 + Math.sin(t * 4 + c) * 10, 8, { anchor: 'center' });
  }

  function drawBridge(t) {
    var sag = 30 + sway * 50;
    var off = Math.sin(swayPh) * sway * 60;
    var y0 = H * 0.53;
    var segs = 8;
    for (var i = 0; i < segs; i++) {
      var a = i / segs, b = (i + 1) / segs;
      var xa = W * 0.12 + a * W * 0.76, xb = W * 0.12 + b * W * 0.76;
      var ya = y0 + Math.sin(a * Math.PI) * sag + Math.sin(a * Math.PI) * off * 0.4;
      var yb = y0 + Math.sin(b * Math.PI) * sag + Math.sin(b * Math.PI) * off * 0.4;
      game.draw.line(xa, ya, xb, yb, C.plank, 22);
      game.draw.line(xa, ya - 70, xb, yb - 70, C.rope, 5);
      game.draw.line(xa, ya, xa, ya - 70, C.rope, 4);
    }
    if (gust > 0) for (var g = 0; g < 5; g++) {
      var gx = ((t * 1200 + g * 230) % (W + 200)) - 100;
      game.draw.line(gx, H * 0.38 + g * 30, gx + 120, H * 0.38 + g * 30 - 8, C.cream, 6);
    }
  }

  function drawPorter(t) {
    var p = porterPos(t);
    var fr = stepAnim > 0 ? PORTER2 : PORTER;
    var sc = fell ? 16 : 13;
    if (fell) p.y += (0.45 - hitStop) * 300;
    game.draw.sprite(fr, { '#': '#5a6a8a', 'o': C.cream }, p.x, p.y - 40, sc, { anchor: 'center' });
    // 揺れメーター(頭上): 限界に近いと赤く点滅
    var danger = sway > 0.75 && Math.floor(t * 10) % 2 === 0;
    game.draw.rect(p.x - 80, p.y - 150, 160, 14, C.ink, 0.6);
    game.draw.rect(p.x - 80, p.y - 150, 160 * Math.min(1, sway), 14, danger ? C.red : C.gold, 1);
  }

  function drawLane(t) {
    game.draw.rect(0, LANE_Y - 70, W, 140, C.lane, 1);
    game.draw.rect(0, LANE_Y - 70, W, 8, C.cream, 0.4);
    game.draw.circle(HIT_X, LANE_Y, 72, C.cream, 0.9);
    game.draw.circle(HIT_X, LANE_Y, 58, C.lane, 1);
    game.draw.circle(HIT_X, LANE_Y, 58, C.gold, 0.15 + 0.15 * Math.sin(songT / BEAT * Math.PI * 2));
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.st === 1) continue;
      var x = HIT_X + (n.t - songT) * SPEED;
      if (x < -60 || x > W + 60) continue;
      game.draw.sprite(DRUM, { '#': n.st === 2 ? '#707070' : C.red, 'o': C.cream }, x, LANE_Y + Math.sin(t * 6 + i) * 3, 12, { anchor: 'center' });
    }
  }

  function drawHud(t) {
    txt(stepped + ' / ' + NEEDED, W / 2, H * 0.05, 62, C.cream);
    txt('SCORE ' + score, W * 0.18, H * 0.05, 30, C.cream);
    if (combo >= 3) txt('COMBO ' + combo, W * 0.82, H * 0.05, 34, C.gold);
    game.draw.rect(60, 150, W - 120, 18, C.ink, 0.6);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, timeLeft < 3 ? C.red : C.gold);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); game.audio.stopBgm(); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; startTune(); return; }
    if (ready > 0 || ended) { game.audio.play('se_tap', 0.05); return; }
    game.audio.play('se_tap', 0.25);
    stomp(false);
  });

  // ── ATTRACT ゴースト実演(3秒=6拍の周期、実際の判定 stomp を使う。5拍目だけわざと遅れて揺れが増える) ──
  var demo = { t: 0, press: 0, gx: HIT_X, gy: LANE_Y + 30 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; songT = BEAT * LEAD - 0.4; }
    stepSong(dt, true);
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.st !== 0) continue;
      var late = i === 4;
      if (!late && songT >= n.t - 0.01 && songT <= n.t + 0.05) { stomp(true); demo.press = 0.12; }
      if (late && songT >= n.t + 0.2) { stomp(true); demo.press = 0.12; }
      break;
    }
    if (demo.press > 0) demo.press -= dt;
    if (sway >= 0.95) sway = 0.3;
  }

  function finish(success) {
    ended = true; ok = success; hitStop = 0.45; endWait = 1.1;
    if (!success) fell = sway >= 1;
    game.fx.flash('#ffffff', 0.2);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (notes === undefined) initGame();
      stepDemo(dt);
      drawGorge(t); drawBridge(t); drawPorter(t); drawLane(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08 + Math.sin(t * 2) * 6, 90, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.135, 36, C.cream);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 46, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 40, C.cream);
      return;
    }
    if (state === S.RESULT) { drawGorge(t); drawBridge(t); drawResult(t); return; }

    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(W * 0.85, H * 0.45, { color: C.gold, count: 50, speed: 700 }); }
          else { var pp = porterPos(t); game.feedback.bad(pp.x, pp.y, { text: fell ? 'MISS' : 'TIME UP' }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { stepped: stepped, perfect: perfects, bestCombo: bestCombo, total: NEEDED };
          drawGorge(t); drawBridge(t); drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      stepSong(dt, false);
      var allDone = true;
      for (var i = 0; i < notes.length; i++) if (notes[i].st === 0) { allDone = false; break; }
      if (sway >= 1) finish(false);
      else if (allDone) finish(true);
      else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
    }

    drawGorge(t); drawBridge(t); drawPorter(t); drawLane(t); drawHud(t);
    if (ended && hitStop > 0 && !ok) { var hp = porterPos(t); game.draw.circle(hp.x, hp.y - 40, 140, '#ffffff', 0.35); }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, C.gold);
  });

  function drawResult(t) {
    game.draw.rect(60, H * 0.28, W - 120, H * 0.4, C.ink, 0.82);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.35, 130, C.green);
      game.draw.sprite(PORTER, { '#': '#5a6a8a', 'o': C.cream }, W / 2, H * 0.44 + Math.sin(t * 5) * 10, 11, { anchor: 'center' });
    } else {
      txt('GAME OVER', W / 2, H * 0.35, 104, C.red);
      var left = 0;
      for (var k = 0; k < notes.length; k++) if (notes[k].st === 0) left++;
      txt('あと' + Math.max(1, left) + '歩!', W / 2, H * 0.44, 64, C.gold);
    }
    txt(stepped + ' / ' + NEEDED, W / 2, H * 0.51, 58, C.cream);
    txt('PERFECT ' + perfects, W / 2, H * 0.56, 42, C.gold);
    txt('SCORE ' + score, W / 2, H * 0.61, 44, C.cream);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.655, 42, isNew ? C.gold : C.cream);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.cream);
  }

  function startTune() {
    game.audio.melody([
      ['E4', 1], ['G4', 1], ['A4', 1], ['G4', 0.5], ['E4', 0.5],
      ['D4', 1], ['E4', 1], ['G4', 2]
    ], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 2], ['E2', 2], ['D2', 2], ['E2', 2]] });
  }

  game.onStart(function() {
    startTune();
    state = S.ATTRACT;
    initGame();
  });
})(game);
