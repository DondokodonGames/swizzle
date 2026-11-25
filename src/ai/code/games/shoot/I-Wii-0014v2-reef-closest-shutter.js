// I-Wii-0014v2-reef-closest-shutter.js
// いちばん近い一枚 — 珊瑚礁を手前と奥に行き来して泳ぐ魚を狙い、こちらへ一番近づいた瞬間にタップしてシャッターを切る
// 操作: 泳いでいる魚をタップするとその魚を撮る。魚は奥(小さく青くかすむ)と手前(大きくくっきり)を行き来する。一番大きく近づいた瞬間に撮るとPERFECT、少し遠いとGOOD、遠すぎ・水だけ撮ると失敗写真。奥の帯を泳ぐ魚は奥なりの一番近い瞬間を狙う
// 終わり: フィルム10枚のうちに良い写真(PERFECT/GOOD)を6枚撮ればCLEAR。フィルム切れか18秒の時間切れでGAME OVER
// @mechanic: aim_shoot
// @theme: coral_reef_closest_photo
// 世界観: 南の珊瑚礁の海で、水中写真家のダイバーが、岩陰を手前と奥に行き来して泳ぎ回る魚が一番近づいた瞬間を狙ってシャッターを切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 良い写真の枚数・PERFECT数・残りフィルム・スコア
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 細かいドット+光。光源は左上の水面ひとつ、パララックス3層
  var STYLE = { bg: ['#36c3d6', '#0b2e5a'], main: ['#ffd23f', '#ff7a45', '#3ad1b0'], accent: ['#ffffff', '#ff4f8b'] };
  var C = {
    yellow: STYLE.main[0], orange: STYLE.main[1], mint: STYLE.main[2], white: STYLE.accent[0], pink: STYLE.accent[1],
    deep: '#0b2e5a', mid: '#155a8a', sand: '#e8d6a4', sandDk: '#c7b07a', rock: '#244a6e', rockLt: '#3a6f96', coral: '#ff8fa3', coralDk: '#c9566e', ink: '#08162b',
  };

  var GAME_TITLE = 'REEF SHUTTER';
  var TIME_LIMIT = 18;
  var FILM = 10;
  var NEEDED = 6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var fishes, clock, spawnN, goods, perfects, film, combo, score, finalScore, photos, shot;
  var timeLeft, readyT, stopT, fin, cleared, postT, joyT, warnT, endWhy;

  // 魚3種(2フレーム尾びれ)
  var FISH = [
    { a: ['...yy.....', '..yyyy....', '.ykyyyyy.y', 'yyybyyyyyy', '.yyyyyyy.y', '..yyyy....', '...yy.....'],
      b: ['...yy.....', '..yyyy...y', '.ykyyyyyyy', 'yyybyyyyy.', '.yyyyyyyyy', '..yyyy...y', '...yy.....'],
      pal: { y: '#ffd23f', k: '#08162b', b: '#08162b' } },
    { a: ['..ooo......', '.owowooo..o', 'okowowoooo.', 'oooowowoooo', '.owowooo..o', '..ooo......'],
      b: ['..ooo......', '.owowooo...', 'okowowooooo', 'oooowowooo.', '.owowoooooo', '..ooo......'],
      pal: { o: '#ff7a45', w: '#ffffff', k: '#08162b' } },
    { a: ['....bb.....', '..bbbbbb..b', '.bkbbbbbbbb', 'bbbbbbbbyb.', '.bbbbbbbbbb', '..bbbbbb..b', '....bb.....'],
      b: ['....bb.....', '..bbbbbb...', '.bkbbbbbbbb', 'bbbbbbbbybb', '.bbbbbbbbbb', '..bbbbbb...', '....bb.....'],
      pal: { b: '#2f7bff', k: '#08162b', y: '#ffd23f' } },
  ];
  // 写真家ダイバー(足ひれを蹴る3フレーム)
  var DIVER_A = ['....mmmm....', '...mggggm...', '...mgkkgm...', '....mmmm....', '..ttttttt...', '.tttccccttt.', 'ss.tccccts..', '...tttttt...', '...tt..tt...', '..ff....ff..', '.fff....fff.'];
  var DIVER_B = ['....mmmm....', '...mggggm...', '...mgkkgm...', '....mmmm....', '..ttttttt...', '.tttccccttt.', 'ss.tccccts..', '...tttttt...', '...tt..tt...', '...ff..ff...', '..fff..fff..'];
  var DIVER_C = ['....mmmm....', '...mggggm...', '...mgkkgm...', '....mmmm....', '..ttttttt...', '.tttccccttt.', 'ss.tccccts..', '...tttttt...', '...tt..tt...', '....ffff....', '...ffffff...'];
  var DIVER_PAL = { m: '#08162b', g: '#9fe8ff', k: '#155a8a', t: '#ff4f8b', c: '#222a3a', s: '#f0c8a0', f: '#ffd23f' };

  // 魚の行き来: 帯(奥行きzの範囲)・周期・左右の泳ぎ
  var PLAN = [
    { sp: 0, zmin: 0.0, zmax: 0.75, per: 2.6, y: 0.42 },
    { sp: 1, zmin: 0.2, zmax: 0.85, per: 2.3, y: 0.36 },
    { sp: 2, zmin: 0.0, zmax: 0.7, per: 2.1, y: 0.5 },
    { sp: 0, zmin: 0.5, zmax: 1.0, per: 2.0, y: 0.32 },
    { sp: 1, zmin: 0.0, zmax: 0.8, per: 1.7, y: 0.46 },
    { sp: 2, zmin: 0.45, zmax: 1.0, per: 1.8, y: 0.38 },
    { sp: 0, zmin: 0.1, zmax: 0.9, per: 1.5, y: 0.44 },
    { sp: 1, zmin: 0.4, zmax: 1.0, per: 1.6, y: 0.34 },
  ];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true });
  }

  function makeFish(k, side) {
    var p = PLAN[k % PLAN.length];
    return {
      sp: p.sp, zmin: p.zmin, zmax: p.zmax, wz: 6.283 / p.per, phz: Math.random() * 6.283,
      cx: side < 0 ? W * 0.32 : W * 0.68, ax: 160 + Math.random() * 60, wx: 0.7 + Math.random() * 0.4, ph: Math.random() * 6.283,
      y0: H * p.y, ay: 50, leave: 0, enter: 0.6, x: 0, y: 0, z: 1, px: 4, dir: 1,
    };
  }

  function updFish(f) {
    var ox = f.x;
    var zz = 0.5 + 0.5 * Math.cos(f.wz * clock + f.phz);
    f.z = f.zmin + (f.zmax - f.zmin) * zz;
    f.q = zz;
    f.x = f.cx + f.ax * Math.sin(f.wx * clock + f.ph);
    f.y = f.y0 + f.ay * Math.sin(f.wx * 1.3 * clock + f.ph) + (1 - f.z) * 140;
    f.px = 4 + (1 - f.z) * 13;
    if (f.leave > 0) { f.x += (f.x > W / 2 ? 1 : -1) * (f.leave * 1400); f.px *= 1 + f.leave; }
    if (f.x !== ox) f.dir = f.x > ox ? 1 : -1;
  }

  function initGame() {
    fishes = []; clock = 0; spawnN = 0; goods = 0; perfects = 0; film = FILM; combo = 0; score = 0; finalScore = 0; photos = []; shot = null;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; fin = false; cleared = false; postT = 0; joyT = 0; warnT = 0; endWhy = '';
    fishes.push(makeFish(spawnN++, -1));
    for (var i = 0; i < fishes.length; i++) updFish(fishes[i]);
  }

  function fishAt(x, y) {
    var best = -1, bz = 9;
    for (var i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      if (f.leave > 0 || f.enter > 0.3) continue;
      var w = 11 * f.px / 2 + 34, h = 7 * f.px / 2 + 34;
      if (Math.abs(x - f.x) < w && Math.abs(y - f.y) < h && f.z < bz) { bz = f.z; best = i; }
    }
    return best;
  }

  // シャッター(本番もデモも同じ処理)
  function shoot(x, y) {
    if (film <= 0 || stopT > 0) return;
    film--;
    game.audio.tone(1800, 0.03, { wave: 'square', volume: 0.08 });
    game.audio.play('se_tap', 0.3);
    var i = fishAt(x, y);
    var grade = 'MISS', f = null;
    if (i >= 0) {
      f = fishes[i];
      grade = f.q < 0.12 ? 'PERFECT' : f.q < 0.35 ? 'GOOD' : 'MISS';
    }
    shot = { x: f ? f.x : x, y: f ? f.y : y, t: 0, grade: grade, sp: f ? f.sp : -1, px: f ? f.px : 0 };
    if (grade !== 'MISS') {
      goods++; combo++; if (grade === 'PERFECT') perfects++;
      var pts = (grade === 'PERFECT' ? 200 : 100) + combo * 20;
      score += pts; joyT = 0.6;
      photos.push({ sp: f.sp, g: grade });
      var lx = Math.max(190, Math.min(W - 190, f.x));
      game.feedback.good(lx, f.y - 110, { text: grade, color: grade === 'PERFECT' ? C.yellow : C.mint, size: 64 });
      game.fx.popup('+' + pts, lx, f.y - 190, { color: C.white, size: 44 });
      f.leave = 0.001;
      if (goods === 3 && mode === S.PLAYING) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE', W / 2, H * 0.27, { color: C.yellow, size: 90 });
      }
      if (mode === S.PLAYING && goods >= NEEDED) { stopT = 0.4; shot.win = true; game.audio.play('se_powerup', 0.4); }
    } else {
      combo = 0;
      photos.push({ sp: -1, g: 'MISS' });
      // 失敗写真: 止めて白く光らせ、写りを大きく見せてから判定
      stopT = 0.4;
      game.fx.flash(C.white, 0.18);
      game.audio.tone('C3', 0.25, { wave: 'square', volume: 0.09, slide: -60 });
    }
  }

  function afterStop() {
    if (shot && shot.win) { ending(true); return; }
    game.feedback.bad(Math.max(190, Math.min(W - 190, shot.x)), shot.y - 110, { text: 'MISS', color: C.pink, size: 64 });
    if (mode === S.PLAYING && film <= 0) { endWhy = 'film'; ending(false); }
  }

  function stepReef(dt) {
    if (joyT > 0) joyT -= dt;
    if (shot) shot.t += dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) afterStop(); return; }
    clock += dt;
    for (var i = fishes.length - 1; i >= 0; i--) {
      var f = fishes[i];
      if (f.enter > 0) f.enter -= dt;
      if (f.leave > 0) { f.leave += dt; if (f.leave > 0.7) fishes.splice(i, 1); }
    }
    var want = goods >= 2 ? 2 : 1, alive = 0;
    for (var k = 0; k < fishes.length; k++) if (fishes[k].leave <= 0) alive++;
    if (alive < want) {
      var side = fishes.length && fishes[0].cx < W / 2 ? 1 : -1;
      fishes.push(makeFish(spawnN++, side));
      game.audio.tone('A5', 0.05, { wave: 'triangle', volume: 0.05, slide: 200 });
    }
    for (var j = 0; j < fishes.length; j++) updFish(fishes[j]);
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + film * 120 + perfects * 50 + Math.round(timeLeft * 30) : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, H * 0.4 + (i % 2) * 120, { color: i % 2 ? C.yellow : C.mint, count: 18, speed: 480 });
      game.fx.flash(C.white, 0.2);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (fin || readyT > 0 || stopT > 0) { game.audio.play('se_tap', 0.06); return; }
    if (y < 230 || y > H * 0.8) { game.audio.tone('E4', 0.04, { wave: 'triangle', volume: 0.05 }); return; }
    shoot(x, y);
  });

  // ---- 描画 ----
  function drawReef(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.45, C.mid], [1, STYLE.bg[1]]]);
    // 光の筋(左上の水面から)
    for (var r = 0; r < 5; r++) {
      var rx = 80 + r * 220 + Math.sin(t * 0.6 + r) * 30;
      for (var s = 0; s < 14; s++) game.draw.rect(rx + s * 22, s * 70, 60, 70, C.white, 0.05);
    }
    // 遠景の岩(層1)
    for (var a = 0; a < 7; a++) game.draw.circle(a * 180 - 20 + Math.sin(t * 0.2) * 10, H * 0.62, 150, '#1d4d78', 0.7);
    // 中景のサンゴ(層2)
    for (var b = 0; b < 6; b++) {
      var bx = 60 + b * 200 + Math.sin(t * 0.35 + b) * 14;
      game.draw.rect(bx, H * 0.6, 26, 120, C.rock);
      game.draw.circle(bx + 13, H * 0.6, 44, b % 2 ? C.coralDk : C.rockLt);
      game.draw.circle(bx - 20, H * 0.63, 26, b % 2 ? C.coral : C.mint, 0.8);
    }
    // 砂地
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.sand);
    for (var d = 0; d < 30; d++) game.draw.rect((d * 137) % W, H * 0.72 + (d * 53) % 240, 18, 6, C.sandDk);
    // 泡
    for (var p = 0; p < 10; p++) {
      var py = H - ((t * 120 + p * 190) % H), px = 160 + (p * 97) % 760 + Math.sin(t * 3 + p) * 10;
      game.draw.circle(px, py, 6 + (p % 3) * 3, C.white, 0.35);
    }
  }

  function drawFish(f, t) {
    var sp = FISH[f.sp], fr = Math.floor(t * 8) % 2 ? sp.a : sp.b;
    var alpha = (1 - f.z * 0.55) * (f.enter > 0 ? Math.max(0.1, 1 - f.enter / 0.6) : 1) * (f.leave > 0 ? Math.max(0, 1 - f.leave / 0.7) : 1);
    // 影(砂)
    game.draw.rect(f.x - 5 * f.px, H * 0.72 + (1 - f.z) * 60, 10 * f.px, 10, C.ink, 0.15 * (1 - f.z));
    game.draw.sprite(fr, sp.pal, f.x, f.y, f.px, { anchor: 'center', flipX: f.dir < 0, alpha: alpha });
    // 近いほど目のハイライト(光源ひとつ)
    if (f.z < 0.3) game.draw.circle(f.x - f.px * 2 * f.dir, f.y - f.px * 2, f.px * 0.5, C.white, 0.8);
  }

  function drawShot(t) {
    if (!shot || shot.t > 0.6) return;
    var big = stopT > 0 ? 1.3 : 1, s = 150 * big + (1 - Math.min(1, shot.t / 0.2)) * 60, L = 50;
    var col = stopT > 0 && Math.floor(t * 16) % 2 === 0 ? C.white : (shot.grade === 'MISS' ? C.pink : C.yellow);
    var x0 = shot.x - s, x1 = shot.x + s, y0 = shot.y - s * 0.7, y1 = shot.y + s * 0.7;
    game.draw.line(x0, y0, x0 + L, y0, col, 8); game.draw.line(x0, y0, x0, y0 + L, col, 8);
    game.draw.line(x1, y0, x1 - L, y0, col, 8); game.draw.line(x1, y0, x1, y0 + L, col, 8);
    game.draw.line(x0, y1, x0 + L, y1, col, 8); game.draw.line(x0, y1, x0, y1 - L, col, 8);
    game.draw.line(x1, y1, x1 - L, y1, col, 8); game.draw.line(x1, y1, x1, y1 - L, col, 8);
    if (shot.t < 0.08) game.draw.rect(x0, y0, x1 - x0, y1 - y0, C.white, 0.5);
  }

  function drawDiver(t) {
    var fr = [DIVER_A, DIVER_B, DIVER_C, DIVER_B][Math.floor(t * 5) % 4];
    var bob = Math.sin(t * 1.6) * 10;
    game.draw.sprite(fr, DIVER_PAL, 170, H * 0.81 + bob, 14, { anchor: 'center' });
    game.draw.circle(120, H * 0.76 + bob - ((t * 90) % 120), 8, C.white, 0.5);
    if (joyT > 0) game.draw.circle(230, H * 0.79 + bob, 16, C.yellow, 0.8);
  }

  // 親指ゾーン: フィルム帯(撮った写真が並ぶ)
  function drawFilm(t) {
    var y = H * 0.87;
    game.draw.rect(300, y - 70, W - 340, 140, C.ink);
    for (var h = 0; h < 18; h++) { game.draw.rect(310 + h * 41, y - 62, 20, 12, C.mid); game.draw.rect(310 + h * 41, y + 50, 20, 12, C.mid); }
    for (var i = 0; i < FILM; i++) {
      var fx = 320 + i * 72, used = i < photos.length;
      game.draw.rect(fx, y - 40, 62, 80, used ? (photos[i].g === 'MISS' ? '#4a5466' : C.mid) : '#1a2a40');
      if (used && photos[i].sp >= 0) game.draw.sprite(FISH[photos[i].sp].a, FISH[photos[i].sp].pal, fx + 31, y, photos[i].g === 'PERFECT' ? 5 : 4, { anchor: 'center' });
      if (used && photos[i].g === 'PERFECT') game.draw.rect(fx, y - 40, 62, 6, C.yellow);
      if (used && photos[i].g === 'MISS') game.draw.rect(fx + 10, y - 6, 42, 12, C.ink, 0.6);
    }
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 34, W - 120, 22, C.ink, 0.6);
    game.draw.rect(60, 34, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.pink : C.white);
    out(goods + ' / ' + NEEDED, W / 2, 140, 66, C.white);
    out('' + film, 120, 140, 56, film <= 2 ? C.pink : C.yellow);
    game.draw.rect(60, 120, 22, 40, C.yellow);
    out('' + score, W - 150, 140, 44, C.yellow);
  }

  function drawScene(t) {
    drawReef(t);
    var order = fishes.slice().sort(function(a, b) { return b.z - a.z; });
    for (var i = 0; i < order.length; i++) drawFish(order[i], t);
    // 手前のサンゴ(層3)
    for (var c = 0; c < 4; c++) {
      var cx = 90 + c * 300 + Math.sin(t * 0.5 + c) * 8;
      game.draw.circle(cx, H * 0.75, 70, c % 2 ? C.coral : C.mint);
      game.draw.circle(cx + 50, H * 0.73, 44, c % 2 ? C.coralDk : '#2aa68c');
      game.draw.circle(cx - 20, H * 0.735, 20, C.white, 0.25);
    }
    drawShot(t);
    drawDiver(t);
    drawFilm(t);
  }

  // ---- ATTRACT: 本物の shoot() で実演。1匹目は一番近い瞬間にPERFECT、2匹目は遠いうちに撮ってMISS→近づいた瞬間に撮り直す ----
  var demo = { t: 0, x: W / 2, y: H * 0.5, press: false, done: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.done = 0; demo.cool = 0.8; }
    stepReef(dt);
    if (demo.cool > 0) demo.cool -= dt;
    demo.press = false;
    var target = null;
    for (var i = 0; i < fishes.length; i++) if (fishes[i].leave <= 0 && fishes[i].enter <= 0.3) { target = fishes[i]; break; }
    var tx = W / 2, ty = H * 0.5;
    if (target) {
      tx = target.x; ty = target.y + 20;
      var want = demo.done === 1 ? (target.q > 0.7) : (target.q < 0.06);
      if (want && demo.cool <= 0 && stopT <= 0 && demo.done < 4 && Math.abs(demo.x - tx) < 60) {
        demo.press = true;
        shoot(target.x, target.y);
        demo.done++; demo.cool = 0.7;
      }
      if (demo.cool > 0.5) demo.press = true;
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 9);
    demo.y += (ty - demo.y) * Math.min(1, dt * 9);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 92, C.yellow);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 38, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.97, 46, C.yellow);
      else out('TAP TO START', W / 2, H * 0.97, 40, C.white);
      return;
    }

    if (mode === S.RESULT) {
      clock += dt;
      for (var k = 0; k < fishes.length; k++) updFish(fishes[k]);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 520, C.ink, 0.88);
      game.draw.rect(90, H * 0.3, W - 180, 10, cleared ? C.yellow : C.pink);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? C.yellow : C.pink);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, C.white);
      out(goods + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, C.white);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, C.yellow);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, C.yellow);
      if (!cleared) out('あと' + (NEEDED - goods) + '枚!', W / 2, H * 0.27, 64, C.pink);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      clock += dt;
      for (var j = 0; j < fishes.length; j++) updFish(fishes[j]);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { goods: goods, perfects: perfects, filmLeft: film };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepReef(dt);
      if (!fin && timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.fx.flash(C.white, 0.15);
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: C.pink, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, C.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 1], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['D5', 2],
      ['E5', 1], ['G5', 0.5], ['C6', 0.5], ['B5', 1], ['A5', 1],
      ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 2],
    ], { tempo: 100, wave: 'sine', volume: 0.07, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2], ['C3', 2], ['E2', 2], ['F2', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
