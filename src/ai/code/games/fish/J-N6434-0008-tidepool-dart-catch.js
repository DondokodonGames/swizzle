// J-N6434-0008-tidepool-dart-catch.js
// 潮だまりの小魚すくい — 逃げ回る小魚を手網で狙ってタップ。外すと近くの魚が散って速くなる。光るクラゲには触れない
// 操作: 魚そのものをタップすると手網ですくう。魚の近くを外すと周りの魚が逃げ散る。ふわっと光って現れるクラゲをタップすると刺されて時間が減る
// 終わり: 8匹すくえばCLEAR(金の魚は3匹分)。時間切れでGAME OVER
// @mechanic: chase
// @theme: tidepool_dart_fish_catch
// 世界観: 引き潮の岩場で漁師の子が手網ひとつで潮だまりの小魚を追い、散っては戻る群れの動きを読んで、潮が満ちる前にバケツを満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + すくった数と連続すくい
// スタイル: TOON SHADE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒の輪郭を先に描き、内側を明暗2色だけで塗る
  var TS = {
    rock: '#7a6a8a', rock2: '#5a4a6a', water: '#3ac0d8', water2: '#2090b0', sand: '#f4d8a0', sand2: '#d8b070',
    fish: '#ff8a3a', fish2: '#d05a1a', gold: '#ffd83a', gold2: '#d0a010', jelly: '#e070ff', jelly2: '#a040d0',
    line: '#141018', white: '#ffffff', red: '#ff3a5a', green: '#50e070', sky: '#9ae0f0'
  };

  var GAME_TITLE = 'TIDEPOOL DASH';
  var TIME_LIMIT = 15;
  var NEEDED = 8;
  var POOL = { x0: 110, x1: W - 110, y0: H * 0.22, y1: H * 0.7 };
  var CATCH_R = 85;
  var SPOOK_R = 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FISH = [
    ['..kkk...', '.kbbbk.k', 'kbwbbbkk', 'kbbbbbbk', '.ksssskk', '..kkk...'],
    ['..kkk...', '.kbbbkk.', 'kbwbbbkk', 'kbbbbbkk', '.kssskk..', '..kkk...']
  ];
  var JELLY = ['.kkkk.', 'kjjjjk', 'kjwjjk', 'kssssk', '.k.k.k', 'k.k.k.'];
  var KID = [
    ['..kkkk..', '.khhhhk.', '.kffffk.', '..kffk..', '.kccccck', 'kccccckn', '.kcccck.', '.kk..kk.'],
    ['..kkkk..', '.khhhhk.', '.kffffk.', '..kffk.n', '.kccccck', 'kcccccck', '.kcccck.', '.kk..kk.']
  ];
  var BUCKET = ['kkkkkkkk', 'kbbbbbbk', 'kbwwwwbk', 'kbbbbbbk', '.kbbbbk.', '..kkkk..'];

  var fish, jelly, caught, combo, maxCombo, timeLeft, ready, hitStop, endWait, done, ok, why, nets, flashFish, catchesSinceSpawn;

  function spawnFish(gold) {
    var a = game.random(0, Math.PI * 2);
    return {
      x: game.random(POOL.x0 + 80, POOL.x1 - 80), y: game.random(POOL.y0 + 80, POOL.y1 - 80),
      vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, turn: game.random(0.5, 1.5), gold: !!gold, flash: 0
    };
  }

  function initPool() {
    fish = [];
    for (var i = 0; i < 5; i++) fish.push(spawnFish(false));
    jelly = { x: W / 2, y: H * 0.45, phase: 'hidden', t: 2.5 };
    nets = []; flashFish = null; catchesSinceSpawn = 0;
  }

  function initGame() {
    initPool();
    caught = 0; combo = 0; maxCombo = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; hitStop = 0; endWait = 0; done = false; ok = false; why = '';
  }

  function cruise() { return 180 + caught * 18; }

  function stepPool(dt) {
    for (var i = 0; i < fish.length; i++) {
      var f = fish[i];
      f.turn -= dt;
      if (f.turn <= 0) {
        var a = Math.atan2(f.vy, f.vx) + game.random(-1.2, 1.2);
        var sp = Math.max(cruise() * (f.gold ? 1.5 : 1), Math.sqrt(f.vx * f.vx + f.vy * f.vy) * 0.8);
        f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; f.turn = game.random(0.5, 1.3);
      }
      var s = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      var base = cruise() * (f.gold ? 1.5 : 1);
      if (s > base) { var k = Math.max(base / s, Math.pow(0.5, dt)); f.vx *= k; f.vy *= k; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < POOL.x0 + 40) { f.x = POOL.x0 + 40; f.vx = Math.abs(f.vx); }
      if (f.x > POOL.x1 - 40) { f.x = POOL.x1 - 40; f.vx = -Math.abs(f.vx); }
      if (f.y < POOL.y0 + 40) { f.y = POOL.y0 + 40; f.vy = Math.abs(f.vy); }
      if (f.y > POOL.y1 - 40) { f.y = POOL.y1 - 40; f.vy = -Math.abs(f.vy); }
      if (f.flash > 0) f.flash -= dt;
    }
    // クラゲ: hidden → rising(光って予告 0.8s) → active → hidden
    jelly.t -= dt;
    if (jelly.t <= 0) {
      if (jelly.phase === 'hidden') {
        jelly.phase = 'rising'; jelly.t = 0.8;
        jelly.x = game.random(POOL.x0 + 120, POOL.x1 - 120); jelly.y = game.random(POOL.y0 + 120, POOL.y1 - 120);
        game.audio.tone('E6', 0.12, { wave: 'sine', volume: 0.04, slide: -200 });
      } else if (jelly.phase === 'rising') { jelly.phase = 'active'; jelly.t = 3; }
      else { jelly.phase = 'hidden'; jelly.t = game.random(1.2, 2.2); }
    }
    if (jelly.phase === 'active') { jelly.x += Math.sin(game.time.elapsed * 1.3) * 30 * dt; jelly.y += Math.cos(game.time.elapsed * 0.9) * 20 * dt; }
    for (var n = nets.length - 1; n >= 0; n--) { nets[n].t -= dt; if (nets[n].t <= 0) nets.splice(n, 1); }
  }

  // 手網の一振り。返り値: {res:'catch'|'sting'|'spook'|'splash', fish, gold}
  function swingNet(x, y) {
    nets.push({ x: x, y: y, t: 0.3 });
    if (jelly.phase !== 'hidden' && game.hit.circle(x, y, 10, jelly.x, jelly.y, 70)) {
      jelly.phase = 'hidden'; jelly.t = 1.5;
      return { res: 'sting' };
    }
    var best = -1, bd = 1e9;
    for (var i = 0; i < fish.length; i++) {
      var dx = fish[i].x - x, dy = fish[i].y - y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0 && bd < CATCH_R) {
      var f = fish[best];
      var gold = f.gold;
      fish.splice(best, 1);
      catchesSinceSpawn++;
      fish.push(spawnFish(catchesSinceSpawn % 3 === 0));
      return { res: 'catch', fish: f, gold: gold };
    }
    var spooked = false;
    for (var j = 0; j < fish.length; j++) {
      var ex = fish[j].x - x, ey = fish[j].y - y, e = Math.sqrt(ex * ex + ey * ey);
      if (e < SPOOK_R) {
        var sp = 900;
        fish[j].vx = (ex / Math.max(1, e)) * sp; fish[j].vy = (ey / Math.max(1, e)) * sp; fish[j].turn = 0.8;
        spooked = true;
      }
    }
    return { res: spooked ? 'spook' : 'splash' };
  }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x + 4, y + 4, { size: size, color: TS.line, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color || TS.white, bold: true, align: 'center' });
  }

  function toonCircle(x, y, r, c1, c2) {
    game.draw.circle(x, y, r + 8, TS.line);
    game.draw.circle(x, y, r, c1);
    game.draw.circle(x + r * 0.25, y + r * 0.25, r * 0.7, c2);
  }

  function drawShore() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, TS.sky], [0.12, TS.sand], [1, TS.sand2]]);
    // 岩の縁取り(輪郭 → 明 → 暗)
    for (var i = 0; i < 12; i++) {
      var rx = POOL.x0 + (i % 6) * ((POOL.x1 - POOL.x0) / 5);
      var ry = i < 6 ? POOL.y0 - 20 : POOL.y1 + 20;
      toonCircle(rx, ry + Math.sin(i) * 10, 70 + (i % 3) * 14, TS.rock, TS.rock2);
    }
    toonCircle(POOL.x0 - 10, (POOL.y0 + POOL.y1) / 2, 90, TS.rock, TS.rock2);
    toonCircle(POOL.x1 + 10, (POOL.y0 + POOL.y1) / 2, 90, TS.rock, TS.rock2);
    // 水面(輪郭 → 2階調)
    game.draw.rect(POOL.x0 - 8, POOL.y0 - 8, POOL.x1 - POOL.x0 + 16, POOL.y1 - POOL.y0 + 16, TS.line);
    game.draw.rect(POOL.x0, POOL.y0, POOL.x1 - POOL.x0, POOL.y1 - POOL.y0, TS.water);
    game.draw.rect(POOL.x0, POOL.y0 + (POOL.y1 - POOL.y0) * 0.55, POOL.x1 - POOL.x0, (POOL.y1 - POOL.y0) * 0.45, TS.water2);
    // 水面のきらめき(常時)
    for (var s = 0; s < 10; s++) {
      var sx = POOL.x0 + ((s * 97 + t * 40) % (POOL.x1 - POOL.x0));
      var sy = POOL.y0 + 40 + (s * 131) % (POOL.y1 - POOL.y0 - 80);
      game.draw.rect(sx, sy, 50, 8, TS.white, 0.35 + 0.2 * Math.sin(t * 3 + s));
    }
    // 満ちてくる潮(残り時間の目安)
    var tide = 1 - Math.max(0, timeLeft) / TIME_LIMIT;
    game.draw.rect(0, H * 0.12, W, 30 + tide * 40, TS.water, 0.6);
    game.draw.rect(0, 0, W, H, TS.white, 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawFish() {
    var t = game.time.elapsed;
    for (var i = 0; i < fish.length; i++) {
      var f = fish[i];
      var pal = f.gold ? { k: TS.line, b: TS.gold, s: TS.gold2, w: TS.white } : { k: TS.line, b: TS.fish, s: TS.fish2, w: TS.white };
      game.draw.circle(f.x + 10, f.y + 26, 34, TS.water2, 0.5);
      game.draw.sprite(FISH[Math.floor(t * 8 + i) % 2], pal, f.x, f.y, 11, { anchor: 'center', flipX: f.vx < 0 });
    }
    if (flashFish) {
      game.draw.sprite(FISH[0], { k: TS.white, b: TS.white, s: TS.white, w: TS.white }, flashFish.x, flashFish.y, 16, { anchor: 'center' });
    }
    if (jelly.phase !== 'hidden') {
      var a = jelly.phase === 'rising' ? 0.25 + 0.35 * Math.abs(Math.sin(t * 14)) : 1;
      game.draw.circle(jelly.x, jelly.y, 80, TS.jelly, 0.2 * a + 0.1 * Math.sin(t * 6));
      game.draw.sprite(JELLY, { k: TS.line, j: TS.jelly, s: TS.jelly2, w: TS.white }, jelly.x, jelly.y + Math.sin(t * 3) * 8, 13, { anchor: 'center', alpha: a });
    }
    for (var n = 0; n < nets.length; n++) {
      var nt = nets[n], r = 40 + (0.3 - nt.t) * 200;
      game.draw.circle(nt.x, nt.y, r + 6, TS.line, nt.t * 2);
      game.draw.circle(nt.x, nt.y, r, TS.white, nt.t * 1.5);
    }
  }

  function drawKid() {
    var t = game.time.elapsed;
    game.draw.sprite(KID[Math.floor(t * 3) % 2], { k: TS.line, h: '#3a2a1a', f: '#ffcf9a', c: TS.red, n: TS.white }, W * 0.24, H * 0.84 + Math.sin(t * 2.4) * 5, 18, { anchor: 'center' });
    game.draw.sprite(BUCKET, { k: TS.line, b: '#4a8ae0', w: TS.water }, W * 0.72, H * 0.85 + Math.sin(t * 2) * 3, 20, { anchor: 'center' });
  }

  function drawHud() {
    txt(caught + ' / ' + NEEDED, W / 2, 80, 56);
    for (var i = 0; i < NEEDED; i++) game.draw.circle(W / 2 - 245 + i * 70, 140, 18, i < caught ? TS.fish : TS.rock2);
    if (combo >= 2) txt('COMBO x' + combo, W * 0.72, H * 0.78, 40, TS.gold);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 180, W - 160, 16, TS.line);
    game.draw.rect(84, 183, (W - 168) * Math.max(0, timeLeft / TIME_LIMIT), 10, low ? TS.red : TS.green);
  }

  // ── ATTRACT: 魚の進む先を読んですくう(成功)、たまに手前を叩いて群れが散る(失敗)を実ロジックで
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, clock: 1, press: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) { initPool(); caught = 0; timeLeft = TIME_LIMIT; demo.n = 0; }
    stepPool(dt);
    if (flashFish && (flashFish.t -= dt) <= 0) flashFish = null;
    if (demo.press > 0) demo.press -= dt;
    var f = fish[0];
    var lead = 0.25;
    var tx = f.x + f.vx * lead, ty = f.y + f.vy * lead;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 7);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 7);
    demo.clock -= dt;
    if (demo.clock <= 0) {
      demo.n++;
      var early = demo.n % 3 === 0;
      var hx = early ? demo.gx + 150 : f.x, hy = early ? demo.gy : f.y;
      var r = swingNet(hx, hy);
      demo.press = 0.15; demo.clock = 1.1;
      if (r.res === 'catch') { caught = (caught + 1) % NEEDED; flashFish = { x: r.fish.x, y: r.fish.y, t: 0.2 }; game.fx.popup('NICE', r.fish.x, r.fish.y - 80, { color: TS.gold, size: 48 }); }
      else if (r.res === 'spook') game.fx.popup('MISS', hx, hy - 80, { color: TS.red, size: 48 });
    }
  }

  function endRound(success, reason) { ok = success; why = reason; hitStop = 0.5; game.fx.flash(TS.white, 0.15); }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0) { game.audio.play('se_tap', 0.06); return; }
    if (y < POOL.y0 - 60 || y > POOL.y1 + 60) { game.fx.burst(x, y, { color: TS.sand2, count: 3, speed: 60 }); game.audio.play('se_tap', 0.1); return; }
    var r = swingNet(x, y);
    game.audio.play('se_tap', 0.25);
    if (r.res === 'catch') {
      var add = r.gold ? 3 : 1;
      caught = Math.min(NEEDED, caught + add);
      combo++; if (combo > maxCombo) maxCombo = combo;
      flashFish = { x: r.fish.x, y: r.fish.y, t: 0.25 };
      game.feedback.good(r.fish.x, r.fish.y, { text: r.gold ? 'x3' : (combo >= 3 ? 'PERFECT' : 'NICE'), color: r.gold ? TS.gold : TS.green, sound: r.gold ? 'se_powerup' : 'se_coin' });
      if (caught >= NEEDED / 2 && caught - add < NEEDED / 2) { game.audio.play('se_milestone', 0.4); game.fx.popup('あと' + (NEEDED - caught) + '匹!', W / 2, H * 0.2, { color: TS.gold, size: 50 }); }
      if (caught >= NEEDED) endRound(true, 'clear');
    } else if (r.res === 'sting') {
      combo = 0; timeLeft = Math.max(0, timeLeft - 2);
      game.feedback.bad(x, y, { text: 'MISS', flashColor: TS.jelly });
    } else if (r.res === 'spook') {
      combo = 0;
      game.feedback.bad(x, y, { text: 'MISS', shake: 4, flashColor: TS.water2 });
    } else {
      combo = 0;
      game.fx.burst(x, y, { color: TS.white, count: 6, speed: 150 });
    }
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (fish === undefined) initGame();
      stepDemo(dt);
      drawShore(); drawFish(); drawKid();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.05, 72, TS.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.09, 32);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, TS.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 40);
      return;
    }

    if (state === S.RESULT) {
      drawShore(); drawFish(); drawKid();
      var score = caught * 100 + maxCombo * 30 + (ok ? Math.ceil(timeLeft) * 10 : 0);
      game.draw.rect(0, H * 0.3, W, H * 0.3, TS.line, 0.7);
      txt(ok ? 'CLEAR' : (why === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 96, ok ? TS.green : TS.red);
      txt(caught + ' / ' + NEEDED, W / 2, H * 0.41, 52);
      txt('SCORE ' + score, W / 2, H * 0.46, 40, TS.gold);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.51, 44, TS.gold);
      else if (!ok) txt('あと' + (NEEDED - caught) + '匹!', W / 2, H * 0.51, 44);
      txt('BEST ' + game.best, W / 2, H * 0.55, 30);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { caught: caught, maxCombo: maxCombo };
        if (ok) game.end.success(caught * 100 + maxCombo * 30 + Math.ceil(timeLeft) * 10, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2; game.audio.stopBgm();
        if (ok) { game.feedback.good(W / 2, H * 0.45, { text: 'CLEAR', color: TS.green, count: 28 }); game.audio.play('se_success', 0.5); }
        else { game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' }); game.audio.play('se_failure', 0.5); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt;
      stepPool(dt);
      if (flashFish && (flashFish.t -= dt) <= 0) flashFish = null;
      if (timeLeft <= 0) { timeLeft = 0; endRound(false, 'time'); }
    }

    drawShore(); drawFish(); drawKid(); drawHud();
    if (ready > 0) txt(ready > 0.3 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, TS.gold);
  });

  game.onStart(function () {
    game.audio.melody(
      [['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 2]],
      { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
