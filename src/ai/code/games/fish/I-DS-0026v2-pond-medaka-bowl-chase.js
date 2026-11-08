// I-DS-0026v2-pond-medaka-bowl-chase.js
// 池のメダカ茶碗すくい — 水中の茶碗をタップで漕ぎ寄せて逃げるメダカを追い、真下まで静かに寄せたら手を止めてすくい上げる
// 操作: タップした方へ茶碗が進む(遠くをタップするほど速い)。速く動く茶碗の波にメダカは驚いて逃げるので、近くでは手前を小さくタップして静かに寄せる。真下に入ると茶碗が光って持ち上がる間はタップしない(触ると水がはねて逃げる)
// 終わり: 20秒以内に4匹すくえばCLEAR。持ち上げ中に触って逃がすのが3回、または時間切れでGAME OVER
// @mechanic: chase
// @theme: summer_garden_pond_medaka
// 世界観: 夏休みの祖父の家の庭池で、麦わら帽子の少年が台所から持ち出した茶碗を水に沈めて漕ぎ寄せ、波を立てずにメダカの真下へ回り込んで一匹ずつすくい、ガラス瓶へ移していく
// 残るもの: 正誤(CLEAR/GAME OVER) + すくった数・逃がした数・スコア
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄り4階調のみ、残像と低コントラスト、画面枠を描く
  var STYLE = { bg: ['#9bbc0f', '#8bac0f'], main: ['#0f380f', '#306230', '#8bac0f'], accent: ['#9bbc0f', '#0f380f'] };
  var C0 = STYLE.main[0], C1 = STYLE.main[1], C2 = STYLE.main[2], C3 = STYLE.accent[0];

  var GAME_TITLE = 'MEDAKA BOWL';
  var TIME_LIMIT = 20;
  var NEEDED = 4;
  var MISS_MAX = 3;
  var PX0 = 90, PX1 = W - 90, PY0 = Math.round(H * 0.25), PY1 = Math.round(H * 0.73);
  var K_PUSH = 2.4, V_MAX = 1100, DRAG = 2.2, CALM = 300, LIFT_T = 0.65;
  var FISH = [
    { wander: 70, flee: 220 },
    { wander: 95, flee: 240 },
    { wander: 120, flee: 255 },
    { wander: 145, flee: 270 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var bowl, fish, ripples, caught, splashes, score, finalScore, jar, gentle;
  var timeLeft, readyT, stopT, stopObj, fin, cleared, postT, joyT, sadT, warnT, nextT, playT;

  // 麦わら帽子の少年
  var BOY_A = ['..3333....', '.33333333.', '3333333333', '..2222....', '..2022....', '..2222....', '.111111...', '21111112..', '.111111...', '..1..1....', '..0..0....'];
  var BOY_B = ['..3333....', '.33333333.', '3333333333', '..2222....', '..2022....', '..2222....', '.111111...', '.1111112..', '2111111...', '..1..1....', '..0..0....'];
  var BOY_JOY = ['2.3333..2.', '.33333333.', '3333333333', '..2222....', '..2022....', '..2002....', '.111111...', '.111111...', '.111111...', '..1..1....', '..0..0....'];
  var BOY_SAD = ['..........', '..3333....', '.33333333.', '3333333333', '..2222....', '..2002....', '.111111...', '21111112..', '.111111...', '..1..1....', '..0..0....'];
  var BOY_PAL = { '0': C0, '1': C1, '2': C2, '3': C3 };
  var MEDAKA_A = ['..1111..', '.111111.', '10111111', '.111111.', '..1111.1', '.......1'];
  var MEDAKA_B = ['..1111..', '.111111.', '10111111', '.1111111', '..1111..', '........'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C1, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function speed() { return Math.hypot(bowl.vx, bowl.vy); }

  function newFish(k) {
    var cfg = FISH[Math.min(k, FISH.length - 1)];
    var x, y, tries = 0;
    do { x = game.random(PX0 + 120, PX1 - 120); y = game.random(PY0 + 120, PY1 - 120); tries++; } while (Math.hypot(x - bowl.x, y - bowl.y) < 420 && tries < 20);
    fish = { x: x, y: y, vx: 0, vy: 0, st: 'swim', t: 0, turn: 0, cfg: cfg, side: 1, trail: [], flash: 0 };
  }

  function initGame() {
    bowl = { x: W / 2, y: PY1 - 140, vx: 0, vy: 0 };
    ripples = []; caught = 0; splashes = 0; score = 0; finalScore = 0; jar = []; gentle = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopObj = null; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; warnT = 0; nextT = 0; playT = 0;
    newFish(0);
  }

  // タップ=茶碗を漕ぐ(本番もデモも同じ処理)。遠いほど速い
  function paddle(x, y) {
    x = Math.max(PX0 + 40, Math.min(PX1 - 40, x)); y = Math.max(PY0 + 40, Math.min(PY1 - 40, y));
    if (fish && fish.st === 'lift') {
      // 持ち上げ中に触った: 水がはねて逃げる
      ripples.push({ x: bowl.x, y: bowl.y, t: 0, big: true });
      splashes++; sadT = 0.8;
      fish.st = 'dart'; fish.t = 0.45; fish.flash = 0.4;
      var a = game.random(0, Math.PI * 2);
      fish.vx = Math.cos(a) * 1000; fish.vy = Math.sin(a) * 1000;
      if (mode === S.PLAYING && splashes >= MISS_MAX) {
        stopT = 0.5; stopObj = { kind: 'miss' };
        game.fx.flash('#ffffff', 0.15);
        game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
        return;
      }
      game.feedback.bad(bowl.x, bowl.y - 90, { text: 'MISS', color: C0, size: 58 });
      return;
    }
    var dx = x - bowl.x, dy = y - bowl.y, d = Math.hypot(dx, dy);
    var sp = Math.min(V_MAX, d * K_PUSH);
    if (d > 1) { bowl.vx = dx / d * sp; bowl.vy = dy / d * sp; }
    ripples.push({ x: x, y: y, t: 0, big: false });
    game.audio.tone(sp > CALM ? 'C4' : 'G5', 0.05, { wave: 'square', volume: 0.06 });
  }

  function startDart() {
    var ax = fish.x - bowl.x, ay = fish.y - bowl.y;
    var ang = Math.atan2(ay, ax) + fish.side * 0.55;
    fish.side = -fish.side;
    fish.st = 'dart'; fish.t = 0.35; fish.flash = 0.2;
    fish.vx = Math.cos(ang) * 950; fish.vy = Math.sin(ang) * 950;
    game.audio.tone('E6', 0.04, { wave: 'triangle', volume: 0.05 });
  }

  function stepWorld(dt) {
    // 茶碗(水の抵抗で減速)
    var k = Math.exp(-DRAG * dt);
    bowl.vx *= k; bowl.vy *= k;
    bowl.x += bowl.vx * dt; bowl.y += bowl.vy * dt;
    if (bowl.x < PX0 + 50) { bowl.x = PX0 + 50; bowl.vx = Math.abs(bowl.vx) * 0.3; }
    if (bowl.x > PX1 - 50) { bowl.x = PX1 - 50; bowl.vx = -Math.abs(bowl.vx) * 0.3; }
    if (bowl.y < PY0 + 50) { bowl.y = PY0 + 50; bowl.vy = Math.abs(bowl.vy) * 0.3; }
    if (bowl.y > PY1 - 50) { bowl.y = PY1 - 50; bowl.vy = -Math.abs(bowl.vy) * 0.3; }
    for (var r = ripples.length - 1; r >= 0; r--) { ripples[r].t += dt; if (ripples[r].t > 0.6) ripples.splice(r, 1); }
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (!fish) return;
    var f = fish;
    if (f.flash > 0) f.flash -= dt;
    f.trail.push({ x: f.x, y: f.y });
    if (f.trail.length > 6) f.trail.shift();
    if (f.st === 'caught') { f.t += dt; return; }
    if (f.st === 'lift') {
      f.t += dt; f.x = bowl.x; f.y = bowl.y;
      bowl.vx *= 0.8; bowl.vy *= 0.8;
      if (Math.floor(f.t * 10) !== Math.floor((f.t - dt) * 10)) game.audio.tone(400 + f.t * 900, 0.05, { wave: 'triangle', volume: 0.05 });
      if (f.t >= LIFT_T) scoop();
      return;
    }
    if (f.st === 'dart') {
      f.t -= dt;
      f.vx *= Math.exp(-3 * dt); f.vy *= Math.exp(-3 * dt);
      if (f.t <= 0) { f.st = 'swim'; f.turn = 0; }
    } else {
      f.turn -= dt;
      if (f.turn <= 0) {
        f.turn = game.random(0.6, 1.2);
        var a = game.random(0, Math.PI * 2);
        f.vx = Math.cos(a) * f.cfg.wander; f.vy = Math.sin(a) * f.cfg.wander;
      }
      var d = Math.hypot(f.x - bowl.x, f.y - bowl.y);
      // 速い茶碗の波が近づくと逃げる
      if (d < f.cfg.flee && speed() > CALM) startDart();
      else if (d < 70 && speed() <= CALM) {
        f.st = 'lift'; f.t = 0;
        game.audio.play('se_powerup', 0.3);
      }
    }
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.x < PX0 + 40) { f.x = PX0 + 40; f.vx = Math.abs(f.vx); }
    if (f.x > PX1 - 40) { f.x = PX1 - 40; f.vx = -Math.abs(f.vx); }
    if (f.y < PY0 + 40) { f.y = PY0 + 40; f.vy = Math.abs(f.vy); }
    if (f.y > PY1 - 40) { f.y = PY1 - 40; f.vy = -Math.abs(f.vy); }
  }

  function scoop() {
    fish.st = 'caught'; fish.t = 0;
    caught++; jar.push(1); joyT = 0.7;
    var pts = 200 + Math.round(Math.max(0, timeLeft) * 5);
    score += pts;
    game.feedback.good(bowl.x, bowl.y - 90, { text: splashes === 0 ? 'PERFECT' : 'NICE', color: C0, size: 60 });
    game.audio.play('se_coin', 0.35);
    game.fx.popup('+' + pts, bowl.x, bowl.y - 180, { color: C1, size: 44 });
    if (mode === S.PLAYING && caught === 2) game.audio.play('se_milestone', 0.45);
    if (mode === S.PLAYING) {
      if (caught >= NEEDED) { stopT = 0.45; stopObj = { kind: 'win' }; }
      else nextT = 0.6;
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 30 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.5 + (i % 2) * 150, { color: i % 2 ? C0 : C1, count: 18, speed: 520 });
      game.fx.flash(C3, 0.22);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (fin || stopT > 0 || readyT > 0 || nextT > 0) { game.audio.play('se_tap', 0.05); return; }
    if (fish && fish.st !== 'lift' && speed() <= CALM) gentle++;
    paddle(x, y);
  });

  // ---- 描画 ----
  function garden(t) {
    game.draw.gradient(0, H, [[0, C3], [0.5, C2], [1, C3]]);
    // 生け垣と飛び石
    for (var h = 0; h < 9; h++) game.draw.circle(h * 130 + 30, H * 0.19, 80, C1);
    for (var s = 0; s < 5; s++) game.draw.circle(160 + s * 190, H * 0.775 + (s % 2) * 20, 46, C1);
    // 池
    game.draw.rect(PX0 - 24, PY0 - 24, PX1 - PX0 + 48, PY1 - PY0 + 48, C0);
    game.draw.rect(PX0, PY0, PX1 - PX0, PY1 - PY0, C1);
    for (var w = 0; w < 6; w++) {
      var wy = PY0 + 80 + w * 140, wx = (t * 40 + w * 170) % (PX1 - PX0 - 160);
      game.draw.rect(PX0 + 40 + wx, wy, 120, 6, C2, 0.5);
    }
    // 睡蓮の葉と水草
    game.draw.circle(PX0 + 120, PY0 + 110, 60, C2); game.draw.rect(PX0 + 120, PY0 + 104, 60, 12, C1);
    game.draw.circle(PX1 - 140, PY1 - 120, 70, C2); game.draw.rect(PX1 - 140, PY1 - 126, 70, 12, C1);
    for (var g = 0; g < 4; g++) game.draw.line(PX1 - 60 + g * 12, PY0 + 40, PX1 - 70 + g * 12 + Math.sin(t * 2 + g) * 10, PY0 - 60, C0, 6);
  }

  function drawBowl(t) {
    var sp = speed();
    // 速いときの引き波(=メダカが驚く合図)
    if (sp > CALM) {
      var ux = bowl.vx / sp, uy = bowl.vy / sp;
      for (var k = 1; k <= 3; k++) {
        var bx = bowl.x - ux * k * 40, by = bowl.y - uy * k * 40;
        game.draw.line(bx - uy * (60 + k * 20), by + ux * (60 + k * 20), bx + uy * (60 + k * 20), by - ux * (60 + k * 20), C3, 6);
      }
    }
    var lifting = fish && fish.st === 'lift';
    var lift = lifting ? fish.t / LIFT_T : 0;
    var r = 70 + lift * 26;
    if (lifting) game.draw.circle(bowl.x, bowl.y, r + 20 + Math.sin(t * 20) * 6, C3, 0.6);
    game.draw.circle(bowl.x + 10, bowl.y + 14, r, C0, 0.5);
    game.draw.circle(bowl.x, bowl.y, r, C3);
    game.draw.circle(bowl.x, bowl.y, r - 12, C2);
    game.draw.circle(bowl.x, bowl.y, r - 34, C3, 0.6);
    for (var i = 0; i < 6; i++) { var a = i * 1.047 + t * 0.2; game.draw.circle(bowl.x + Math.cos(a) * (r - 6), bowl.y + Math.sin(a) * (r - 6), 5, C1); }
  }

  function drawFish(t) {
    if (!fish || fish.st === 'caught') return;
    var f = fish;
    var big = stopT > 0 && stopObj && stopObj.kind !== 'win';
    for (var i = 0; i < f.trail.length; i++) game.draw.sprite(MEDAKA_A, { '0': C0, '1': C3 }, f.trail[i].x, f.trail[i].y, 13, { anchor: 'center', alpha: 0.08 + i * 0.04, flipX: f.vx > 0 });
    var fr = Math.floor(t * (f.st === 'dart' ? 20 : 6)) % 2 ? MEDAKA_A : MEDAKA_B;
    var col = (f.flash > 0 && Math.floor(f.flash * 30) % 2 === 0) || (big && Math.floor(t * 16) % 2 === 0) ? C2 : C3;
    var lift = f.st === 'lift' ? f.t / LIFT_T * 14 : 0;
    game.draw.sprite(fr, { '0': C0, '1': col }, f.x, f.y - lift, big ? 19 : 14 + lift * 0.2, { anchor: 'center', flipX: f.vx > 0 });
    if (f.st === 'swim' && !fin) game.draw.circle(f.x, f.y, 52 + Math.sin(t * 6) * 5, C3, 0.18);
  }

  function drawRipples() {
    for (var i = 0; i < ripples.length; i++) {
      var rp = ripples[i], rr = 20 + rp.t * (rp.big ? 500 : 220), a = 1 - rp.t / 0.6;
      for (var k = 0; k < 10; k++) {
        var a0 = k / 10 * Math.PI * 2, a1 = (k + 0.6) / 10 * Math.PI * 2;
        game.draw.line(rp.x + Math.cos(a0) * rr, rp.y + Math.sin(a0) * rr * 0.6, rp.x + Math.cos(a1) * rr, rp.y + Math.sin(a1) * rr * 0.6, a > 0.5 ? C3 : C2, 4);
      }
    }
  }

  function drawBoy(t) {
    var fr = sadT > 0 || (fin && !cleared) ? BOY_SAD : (joyT > 0 || (fin && cleared)) ? BOY_JOY : (Math.floor(t * 2) % 2 ? BOY_A : BOY_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 12)) * 26 : Math.sin(t * 2.4) * 4;
    game.draw.circle(200, H * 0.925, 80, C1, 0.4);
    game.draw.sprite(fr, BOY_PAL, 210, H * 0.87 + hop, 19, { anchor: 'center' });
    // ガラス瓶(進捗)
    game.draw.rect(600, H * 0.81, 280, 220, C0);
    game.draw.rect(612, H * 0.81 + 30, 256, 178, C2);
    game.draw.rect(640, H * 0.81 - 14, 200, 24, C1);
    for (var i = 0; i < NEEDED; i++) {
      var fx = 680 + (i % 2) * 120, fy = H * 0.81 + 80 + Math.floor(i / 2) * 70 + Math.sin(t * 3 + i) * 6;
      if (i < jar.length) game.draw.sprite(Math.floor(t * 4 + i) % 2 ? MEDAKA_A : MEDAKA_B, { '0': C3, '1': C0 }, fx, fy, 6, { anchor: 'center', flipX: i % 2 === 0 });
      else game.draw.circle(fx, fy, 10, C1, 0.5);
    }
  }

  function frame() {
    game.draw.rect(0, 0, W, 16, C0); game.draw.rect(0, H - 16, W, 16, C0);
    game.draw.rect(0, 0, 16, H, C0); game.draw.rect(W - 16, 0, 16, H, C0);
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 40, W - 140, 30, C0);
    game.draw.rect(76, 46, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? C3 : C2);
    out(caught + ' / ' + NEEDED, W / 2, 128, 56, C0);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 64, 186, 22, m < splashes ? C0 : C2);
    out('' + score, 170, 136, 38, C1);
  }

  function drawScene(t) {
    garden(t);
    drawRipples();
    drawFish(t);
    drawBowl(t);
    if (fish && fish.st === 'lift') drawFish(t);
    drawBoy(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, C0, 0.06);
    frame();
  }

  // ---- ATTRACT: 本物の paddle() で 遠くを叩いて速く寄せる→波で逃げられる→手前を小さく叩いて静かに寄せる→手を離して待つとすくえる ----
  var demo = { t: 0, x: W / 2, y: H * 0.9, press: false, taps: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0;
      bowl.x = W * 0.33; bowl.y = PY1 - 160;
      fish = { x: W * 0.55, y: H * 0.55, vx: -30, vy: 0, st: 'swim', t: 0, turn: 99, cfg: { wander: 30, flee: 260 }, side: 1, trail: [], flash: 0 };
      demo.taps = [0.4, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9];
    }
    stepWorld(dt);
    if (fish && fish.st === 'swim') fish.turn = 99;
    demo.press = false;
    var tx = bowl.x, ty = bowl.y + 40;
    for (var i = 0; i < demo.taps.length; i++) {
      var tt = demo.taps[i];
      if (cyc >= tt - 0.25 && cyc < tt) {
        var dx = fish.x - bowl.x, dy = fish.y - bowl.y, d = Math.max(1, Math.hypot(dx, dy));
        var reach = i === 0 ? d : Math.min(118, d);
        tx = bowl.x + dx / d * reach; ty = bowl.y + dy / d * reach;
      }
      if (cyc >= tt && cyc - dt < tt && fish && fish.st !== 'lift' && fish.st !== 'caught') { demo.press = true; paddle(demo.x, demo.y); }
    }
    if (fish && (fish.st === 'lift' || fish.st === 'caught')) { tx = W * 0.75; ty = H * 0.86; }
    demo.x += (tx - demo.x) * Math.min(1, dt * 12);
    demo.y += (ty - demo.y) * Math.min(1, dt * 12);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.07 + Math.sin(t * 2) * 5, 92, C0);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 38, C1);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.97, 46, C0);
      else out('TAP TO START', W / 2, H * 0.97, 40, C1);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, C3, 0.94);
      game.draw.rect(90, H * 0.3, W - 180, 12, C0);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 96, C0);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, C0);
      out(caught + ' / ' + NEEDED + '   MISS ' + splashes, W / 2, H * 0.46, 42, C1);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, C0);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, C1);
      if (!cleared) out('あと' + (NEEDED - caught) + '匹!', W / 2, H * 0.27, 64, C0);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.97, 40, C0);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { caught: caught, splashes: splashes, gentle: gentle };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        var o = stopObj; stopObj = null;
        if (o.kind === 'win') ending(true);
        else { game.feedback.bad(fish ? fish.x : W / 2, (fish ? fish.y : H * 0.5) - 90, { text: o.kind === 'time' ? 'TIME UP' : 'MISS', color: C0, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; playT += dt;
      stepWorld(dt);
      if (nextT > 0) { nextT -= dt; if (nextT <= 0) { newFish(caught); game.audio.play('se_jump', 0.3); } }
      if (timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0) {
        timeLeft = 0;
        stopT = 0.45; stopObj = { kind: 'time' };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.circle(bowl.x, bowl.y, 100 + (0.45 - stopT) * 1500, C3, 0.35);
    // 開始直後のお手本: 茶碗とメダカの間を小さく叩く手
    if (!fin && readyT <= 0 && caught === 0 && playT < 1.4 && fish) {
      var dx = fish.x - bowl.x, dy = fish.y - bowl.y, d = Math.max(1, Math.hypot(dx, dy));
      game.draw.hand(bowl.x + dx / d * 110, bowl.y + dy / d * 110 + 20, { press: Math.floor(playT * 3) % 2 === 0, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, C0);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['D5', 1],
      ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 2],
      ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['C6', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 2], ['G2', 2], ['A2', 2], ['E2', 2], ['F2', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
