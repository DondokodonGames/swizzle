// J-Switch-0003-trike-beat-pedal.js
// 三輪車ビートこぎ — 流れてくる拍の印が輪に重なる瞬間にこいで加速し、坂道の町内コースを制限時間内にゴールする
// 操作: 下の帯を右から流れてくるペダル印が左の輪に重なった瞬間にタップ。拍に合うほど強くこげる。ずれたこぎはふらついて減速(社内メモ。画面には出さない)
// 終わり: 90m先のゴールに着けばCLEAR。時間切れでGAME OVER
// @mechanic: rhythm
// @theme: town_trike_beat_ride
// 世界観: 夏休みの町内三輪車レース、麦わら帽子の子が商店街の拡声器から流れる行進曲に合わせてペダルを踏み、拍に乗るほど三輪車がぐんぐん伸びて坂の上のゴールテープを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 走った距離・PERFECT数・最大コンボ
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒地に白ドット、画面に貼ったカラーセロハンの横帯で色を付ける
  var STYLE = { bg: ['#050505', '#141414', '#202020'], main: ['#ffffff', '#d0d0d0', '#808080'], accent: ['#ffd23a', '#38e07a'] };
  var C = { bg1: '#050505', bg2: '#1c1c1c', white: '#ffffff', gray: '#8a8a8a', dim: '#3a3a3a', yellow: '#ffd23a', green: '#38e07a', mag: '#ff4aa8', red: '#ff4a4a', ink: '#000000' };

  var GAME_TITLE = 'TRIKE BEAT';
  var TIME_LIMIT = 15;
  var GOAL = 90;
  var BEAT = 0.5;
  var LEAD = 1.0;
  var RING_X = W * 0.18, LANE_Y = H * 0.84, NOTE_SPD = 620;
  var PERFECT_W = 0.06, GOOD_W = 0.13;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, songT, notes, dist, speed, combo, maxCombo, perfects, goods, missesN, hitStop, outro, ok, halfShown, pedal, wobble, scroll, ringFx, beatIdx;

  // ── sprites ───────────────────────────────────────────────────────
  var TRIKE = [
    ['....hhhh....', '...hhhhhh...', '....ffff....', '....fkf.....', '...wwwww....', '..w.www.w...', '....ww.ll...', '....rrrrrr..', '.oo..rr..oo.', 'o..o.pp.o..o', 'o..o....o..o', '.oo......oo.'],
    ['....hhhh....', '...hhhhhh...', '....ffff....', '....fkf.....', '...wwwww....', '..w.www.w...', '....wwll....', '....rrrrrr..', '.oo..rr..oo.', 'o..o..pp..oo', 'o..o....o..o', '.oo......oo.']
  ];
  var PEDAL = ['.ww.', 'wwww', 'wwww', '.ww.'];
  var TREE = ['..w..', '.www.', 'wwwww', '.www.', '..w..', '..w..'];
  var PENNANT = ['wwwww', '.www.', '..w..'];
  var HORN = ['.....ww', '...wwww', 'wwwwwww', 'wwwwwww', '...wwww', '.....ww'];
  var FLAG = ['wkwkw', 'kwkwk', 'wkwkw', 'w....', 'w....', 'w....'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function buildNotes() {
    var out = [];
    for (var b = 2; b < 32; b++) {
      var sec = b < 10 ? 0 : (b < 20 ? 1 : 2);
      if (sec === 2 && b % 4 === 3) continue;
      out.push({ t: LEAD + b * BEAT, hit: false, gone: false, gold: b % 8 === 7 });
      if (sec >= 1 && b % 4 === 1) out.push({ t: LEAD + (b + 0.5) * BEAT, hit: false, gone: false, gold: false });
    }
    return out;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; songT = 0; notes = buildNotes();
    dist = 0; speed = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; missesN = 0;
    hitStop = 0; outro = 0; ok = false; halfShown = false; pedal = 0; wobble = 0; scroll = 0; ringFx = null; beatIdx = -1;
  }

  // こぎの判定(実プレイ・デモ共用)
  function judgeTap(isDemo) {
    var best = null, bd = 1;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.hit || n.gone) continue;
      var d = Math.abs(n.t - songT);
      if (d < bd) { bd = d; best = n; }
    }
    pedal = 0.18;
    if (best && bd <= GOOD_W) {
      best.hit = true;
      var perfect = bd <= PERFECT_W;
      combo++; if (combo > maxCombo) maxCombo = combo;
      speed += (perfect ? 3.3 : 2.0) * (best.gold ? 1.5 : 1);
      ringFx = { t: 0.25, col: perfect ? C.yellow : C.green };
      if (isDemo) { game.fx.burst(RING_X, LANE_Y, { color: perfect ? C.yellow : C.green, count: 6, speed: 180 }); return true; }
      if (perfect) perfects++; else goods++;
      game.feedback.good(RING_X + 40, LANE_Y - 110, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.yellow : C.green, count: best.gold ? 16 : 6, size: 44 });
      if (combo > 0 && combo % 8 === 0) { game.audio.play('se_powerup', 0.35); game.fx.popup('x' + combo, W * 0.3, H * 0.4, { color: C.yellow, size: 64 }); }
      return true;
    }
    // 拍から外れたこぎ: ふらつく
    combo = 0; wobble = 0.35; speed *= 0.8;
    ringFx = { t: 0.25, col: C.red };
    if (isDemo) { game.fx.burst(RING_X, LANE_Y, { color: C.red, count: 4, speed: 120 }); return false; }
    missesN++;
    game.audio.tone('C3', 0.08, { wave: 'square', volume: 0.04 });
    return false;
  }

  // 曲の進行と走り(実プレイ・デモ共用)
  function stepRide(dt, isDemo) {
    songT += dt;
    var bi = Math.floor((songT - LEAD) / BEAT);
    if (bi !== beatIdx) {
      beatIdx = bi;
      if (!isDemo && bi >= 0) game.audio.tone(bi % 4 === 0 ? 'C6' : 'G5', 0.03, { wave: 'square', volume: 0.03 });
    }
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (!n.hit && !n.gone && songT - n.t > GOOD_W) {
        n.gone = true; combo = 0; speed *= 0.85; wobble = 0.25;
        if (!isDemo) { missesN++; game.feedback.bad(RING_X + 40, LANE_Y - 110, { text: 'MISS', size: 40, shake: 4 }); }
      }
    }
    speed *= Math.pow(0.6, dt);
    dist += speed * dt;
    scroll += speed * dt * 40;
    if (pedal > 0) pedal -= dt;
    if (wobble > 0) wobble -= dt;
    if (ringFx) { ringFx.t -= dt; if (ringFx.t <= 0) ringFx = null; }
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.yellow, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(W * 0.32, H * 0.46, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play') return;
    game.audio.play('se_tap', 0.2);
    judgeTap(false);
  });

  // ── demo(印が輪に重なる瞬間にこぐ。5回目ごとに早すぎてふらつく)───────
  var demo = { t: 0, gx: RING_X, gy: LANE_Y + 90, press: false, n: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { songT = 0; notes = buildNotes(); dist = 0; speed = 0; combo = 0; demo.n = 0; beatIdx = -1; }
    stepRide(dt, true);
    demo.cool -= dt;
    demo.press = demo.cool > 0.1;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.hit || n.gone) continue;
      var early = demo.n % 5 === 4;
      var d = songT - n.t;
      if ((!early && d >= -0.01) || (early && d >= -0.3)) {
        judgeTap(true);
        demo.n++; demo.cool = 0.2;
      }
      break;
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawRoad() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [1, C.bg1]]);
    // 商店街の旗飾りと拡声器(拍に合わせて震える)
    var sag = function(x) { return H * 0.2 + Math.sin(x / W * Math.PI) * 60; };
    for (var p = 0; p < 11; p++) {
      var px = ((p * 110 - scroll * 0.35) % (W + 110) + W + 110) % (W + 110) - 55;
      game.draw.sprite(PENNANT, { w: p % 2 ? C.white : C.gray }, px, sag(px) + 24 + Math.sin(t * 3 + p) * 4, 12, { anchor: 'center' });
    }
    for (var q = 0; q < W; q += 36) game.draw.rect(q, sag(q), 20, 4, C.gray);
    var thump = beatIdx >= 0 && ((songT - LEAD) % BEAT) < 0.08 ? 8 : 0;
    game.draw.rect(W * 0.88, H * 0.16, 10, H * 0.28, C.gray);
    game.draw.sprite(HORN, { w: C.white }, W * 0.84 - thump, H * 0.16, 12 + thump * 0.3, { anchor: 'center' });
    // 遠景の家並み(白ドットの輪郭)と木
    for (var h = 0; h < 8; h++) {
      var hx = ((h * 190 - scroll * 0.2) % (W + 200) + W + 200) % (W + 200) - 100;
      var hh = 120 + (h % 3) * 40;
      for (var d = 0; d < 140; d += 14) game.draw.rect(hx + d, H * 0.44 - hh, 6, 6, C.gray);
      for (var e = 0; e < hh; e += 14) { game.draw.rect(hx, H * 0.44 - hh + e, 6, 6, C.gray); game.draw.rect(hx + 134, H * 0.44 - hh + e, 6, 6, C.gray); }
    }
    for (var tr = 0; tr < 6; tr++) {
      var tx = ((tr * 230 - scroll * 0.6) % (W + 200) + W + 200) % (W + 200) - 100;
      game.draw.sprite(TREE, { w: C.white }, tx, H * 0.5 + Math.sin(t * 2 + tr) * 3, 12, { anchor: 'center' });
    }
    // 道
    game.draw.rect(0, H * 0.58, W, 6, C.white);
    game.draw.rect(0, H * 0.7, W, 6, C.white);
    for (var k = 0; k < 10; k++) {
      var lx = ((k * 150 - scroll) % (W + 150) + W + 150) % (W + 150) - 75;
      game.draw.rect(lx, H * 0.64, 70, 8, C.gray);
    }
    // ゴールテープ
    var gx = RING_X + 160 + (GOAL - dist) * 40;
    if (gx < W + 100) {
      game.draw.rect(gx, H * 0.46, 8, H * 0.24, C.white);
      game.draw.sprite(FLAG, { w: C.white, k: C.ink }, gx + 40, H * 0.47, 12, { anchor: 'center' });
    }
  }

  function drawRider() {
    var t = game.time.elapsed;
    var wob = wobble > 0 ? Math.sin(t * 50) * 10 : 0;
    var bob = Math.sin(t * 8) * 3 + (pedal > 0 ? -6 : 0);
    var hl = phase === 'stop' && Math.floor(t * 14) % 2 === 0;
    if (hl) game.draw.circle(W * 0.32, H * 0.6, 150, C.white, 0.35);
    game.draw.rect(W * 0.32 - 90, H * 0.68, 180, 10, C.dim);
    var frame = pedal > 0 ? 1 : Math.floor(t * (1 + speed * 0.5)) % 2;
    game.draw.sprite(TRIKE[frame], { h: C.white, f: C.gray, k: C.ink, w: C.white, l: C.gray, r: C.white, o: C.white, p: C.gray }, W * 0.32 + wob, H * 0.6 + bob, 16, { anchor: 'center' });
    // 速さの流線
    for (var s = 0; s < Math.min(6, Math.floor(speed / 2)); s++) game.draw.rect(W * 0.32 - 160 - s * 30, H * 0.56 + s * 18, 60, 4, C.white, 0.6);
  }

  function drawLane() {
    var t = game.time.elapsed;
    game.draw.rect(0, LANE_Y - 80, W, 160, C.bg1);
    game.draw.line(0, LANE_Y - 80, W, LANE_Y - 80, C.white, 3);
    game.draw.line(0, LANE_Y + 80, W, LANE_Y + 80, C.white, 3);
    // 輪(ここで重なった瞬間にこぐ)
    var rc = ringFx ? ringFx.col : C.white;
    game.draw.circle(RING_X, LANE_Y, 66, rc, ringFx ? 0.5 : 0.18);
    for (var a = 0; a < 16; a++) {
      var an = a / 16 * Math.PI * 2;
      game.draw.rect(RING_X + Math.cos(an) * 62 - 4, LANE_Y + Math.sin(an) * 62 - 4, 8, 8, rc);
    }
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.hit || n.gone) continue;
      var x = RING_X + (n.t - songT) * NOTE_SPD;
      if (x > W + 60 || x < -60) continue;
      var near = Math.abs(n.t - songT) < 0.5;
      game.draw.sprite(PEDAL, { w: n.gold ? C.yellow : C.white }, x, LANE_Y + (near ? Math.sin(t * 20) * 2 : 0), n.gold ? 20 : 16, { anchor: 'center' });
    }
    // カラーセロハンの横帯
    game.draw.rect(0, 225, W, H * 0.2, C.yellow, 0.12);
    game.draw.rect(0, H * 0.46, W, H * 0.26, C.green, 0.1);
    game.draw.rect(0, LANE_Y - 80, W, 160, C.mag, 0.14);
    game.draw.rect(0, 0, W, H, C.white, 0.015 + 0.015 * Math.sin(t * 1.6));
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.9, W, H * 0.1, C.bg2);
    txt('x' + combo, W * 0.86, H * 0.93, 44, combo >= 8 ? C.yellow : C.gray, 'center');
    for (var i = 0; i < 5; i++) game.draw.rect(60 + i * 44, H * 0.93 - 10 + Math.sin(t * 6 + i) * 3 * (speed > 5 ? 1 : 0), 30, 20, speed > i * 2.5 ? C.green : C.dim);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.bg1, 0.9);
    txt(Math.floor(dist) + 'm / ' + GOAL + 'm', W / 2, 90, 60, C.white);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.yellow, 'left');
    game.draw.rect(60, 150, W - 120, 14, C.dim);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, dist / GOAL), 14, C.green);
    game.draw.rect(60, 185, W - 120, 14, C.dim);
    game.draw.rect(60, 185, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 14, timeLeft < 4 ? C.red : C.yellow);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawRoad(); drawRider(); drawLane(); drawBottom();
      game.draw.hand(RING_X + 10, LANE_Y + 40, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.bg1, 0.9);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.white);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.yellow);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 40, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.965, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawRoad(); drawRider(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 90, ok ? C.yellow : C.red);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) {
        phase = 'play'; game.audio.play('se_tap', 0.5);
        // 拍と同じテンポで行進曲をかけ直す(曲の頭=こぎの拍の頭)
        game.audio.melody([
          ['C5', 1], ['E5', 1], ['G5', 1], ['E5', 1], ['F5', 1], ['A5', 1], ['G5', 2],
          ['E5', 1], ['G5', 1], ['C6', 1], ['G5', 1], ['F5', 1], ['D5', 1], ['C5', 2]
        ], { tempo: 60 / BEAT, wave: 'square', volume: 0.035, loop: true, bass: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['F2', 1], ['C3', 1], ['G2', 1], ['G2', 1]] });
      }
    } else if (phase === 'play') {
      timeLeft -= dt;
      stepRide(dt, false);
      if (!halfShown && dist >= GOAL / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(Math.floor(dist) + 'm', W / 2, H * 0.3, { color: C.green, size: 64 });
      }
      if (dist >= GOAL) { dist = GOAL; finish(true); }
      else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = Math.floor(dist) * 10 + perfects * 30 + maxCombo * 10 + Math.round(timeLeft * 20);
        var stats = { dist: Math.floor(dist), perfect: perfects, good: goods, maxCombo: maxCombo };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawRoad(); drawRider(); drawLane(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, C.yellow);
    if (phase === 'outro') {
      var sc = Math.floor(dist) * 10 + perfects * 30 + maxCombo * 10 + Math.round(timeLeft * 20);
      game.draw.rect(0, H * 0.24, W, H * 0.16, C.bg1, 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 96, ok ? C.yellow : C.red);
      txt('SCORE ' + sc, W / 2, H * 0.33, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.37, 40, C.yellow);
      else if (!ok) txt('あと' + Math.max(1, Math.ceil(GOAL - dist)) + 'm!', W / 2, H * 0.37, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.37, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 1], ['G4', 1],
      ['A4', 0.5], ['D5', 0.5], ['F5', 0.5], ['D5', 0.5], ['E5', 1], ['C5', 1]
    ], { tempo: 120, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 1], ['G2', 1], ['D3', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
