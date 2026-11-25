// J-Switch-0029-riverbank-stork-sowing.js
// コウノトリの種まき飛行 — 川べりの畑の上を飛びながら、印の穴には種を、芽には水を、真下に届く一瞬前に落とす。落ちるまでの間も畑は流れていく
// 操作: 画面の左半分タップで種、右半分タップで水を落とす。落ちる先は足もとの影(社内メモ。画面には出さない)
// 終わり: 10か所を通り過ぎた時点でCLEAR。外す/種と水の取り違え/落とし忘れが3回/時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: riverbank_stork_sowing
// 世界観: 春の川べりの菜の花畑で、見習いの種まきコウノトリが、くちばしの種袋と首に下げた水袋を使い分け、耕した印の穴には種を、顔を出した芽には水を、飛びながら狙いすまして落としていく
// 残るもの: 正誤(CLEAR/GAME OVER) + まけた数・PERFECT数・外し数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 巨大キャラ・床影・間合いで見せる
  var STYLE = { bg: ['#9fd8ff', '#e8f6ff', '#f6e27a'], main: ['#6a4a2a', '#4aa84a', '#ffffff'], accent: ['#2a8aff', '#ff6a3a'] };
  var C = {
    sky1: '#7ec8ff', sky2: '#e6f6ff', far: '#8ac07a', flower: '#f6e04a', soil: '#8a5a32', soilD: '#6a4222', soilL: '#a8784a',
    sprout: '#4ac04a', seed: '#d8a050', water: '#3a9aff', good: '#ffe04a', bad: '#ff5a3a', white: '#ffffff', ink: '#1a1410', shadow: '#3a2410'
  };

  var GAME_TITLE = 'STORK SOWING';
  var TIME_LIMIT = 16;
  var TOTAL = 10;
  var MAX_MISS = 3;
  var NEEDED = TOTAL - MAX_MISS + 1;
  var STORK_X = W * 0.34, STORK_Y = H * 0.36;
  var GROUND_Y = H * 0.66;
  var FALL_T = 0.55;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, targets, drops, scroll, speed, passed, hits, perfects, misses, cool, hitStop, outro, ok, halfShown, flashT;

  var STORK = [
    ['........ww..........', '.......wwkw.........', '.......wwwoooo......', '.......ww...........', '......www...........', '.wwwwwwwwwww........', 'kkwwwwwwwwwwww......', '.kkkwwwwwwwww.......', '...kkkkwwwww........', '.......oo.o.........', '......o...o.........'],
    ['........ww..........', '.......wwkw.........', '.......wwwoooo......', 'kk.....ww...........', '.kkk..www...........', '..kkwwwwwwww........', '...wwwwwwwwwww......', '....wwwwwwwww.......', '.......wwwww........', '.......oo.o.........', '.........oo.........']
  ];
  var SEED = ['.ss.', 'ssss', '.ss.'];
  var DROP = ['.b.', 'bbb', 'bbb', '.b.'];
  var SPROUT = ['g..g', '.gg.', '..g.', '..g.'];
  var HOLE = ['.kkkk.', 'kkkkkk', '.kkkk.'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function buildTargets() {
    targets = [];
    var x = STORK_X + 700;
    var lastKind = -1, run = 0;
    for (var i = 0; i < TOTAL; i++) {
      var kind = game.random(0, 1) < 0.5 ? 0 : 1;
      if (kind === lastKind) { run++; if (run >= 2) { kind = 1 - kind; run = 0; } } else run = 0;
      lastKind = kind;
      targets.push({ x: x, kind: kind, state: 0, fx: 0 });
      x += game.random(270, 420);
    }
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; drops = []; scroll = 0; speed = 380;
    passed = 0; hits = 0; perfects = 0; misses = 0; cool = 0;
    hitStop = 0; outro = 0; ok = false; halfShown = false; flashT = 0;
    buildTargets();
  }

  // 落とす(実プレイ・デモ共用)。kind 0=種 1=水
  function release(kind, isDemo) {
    if (cool > 0) return false;
    cool = 0.22;
    drops.push({ kind: kind, wx: scroll + STORK_X, t: 0, demo: isDemo });
    if (!isDemo) game.audio.play('se_jump', 0.25);
    return true;
  }

  function judgeLanding(d) {
    var best = null, bd = 1e9;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (tg.state !== 0) continue;
      var dd = Math.abs(tg.x - d.wx);
      if (dd < bd) { bd = dd; best = tg; }
    }
    var sx = d.wx - scroll;
    if (best && bd < 70 && best.kind === d.kind) {
      best.state = 1; best.fx = 0.5;
      if (d.demo) { game.fx.burst(sx, GROUND_Y, { color: d.kind ? C.water : C.seed, count: 12, speed: 220 }); return; }
      hits++; if (bd < 28) perfects++;
      game.feedback.good(sx, GROUND_Y - 120, { text: bd < 28 ? 'PERFECT' : 'GOOD', color: C.good, count: 14 });
      game.audio.play('se_coin', 0.3);
      if (!halfShown && hits >= TOTAL / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(hits + ' / ' + TOTAL, W / 2, H * 0.22 + 40, { color: C.good, size: 72 });
      }
      return;
    }
    if (best && bd < 70 && best.kind !== d.kind) { best.state = 2; best.fx = 0.5; }
    if (d.demo) { game.fx.burst(sx, GROUND_Y, { color: C.soilD, count: 6, speed: 120 }); return; }
    addMiss(sx, GROUND_Y);
  }

  function addMiss(x, y) {
    misses++;
    if (misses >= MAX_MISS) { finish(false, x, y); return; }
    hitStop = 0.4; flashT = 0.4;
    game.feedback.bad(x, y - 120, { text: 'MISS', color: C.bad });
  }

  function stepFlight(dt, isDemo) {
    if (cool > 0) cool -= dt;
    if (flashT > 0) flashT -= dt;
    scroll += speed * dt;
    speed = Math.min(600, speed + dt * 14);
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.t += dt;
      if (d.t >= FALL_T) { drops.splice(i, 1); judgeLanding(d); if (phase !== 'play' && !isDemo) return; }
    }
    for (var k = 0; k < targets.length; k++) {
      var tg = targets[k];
      if (tg.fx > 0) tg.fx -= dt;
      if (tg.counted) continue;
      if (tg.x - scroll < STORK_X - 110) {
        tg.counted = true; passed++;
        if (tg.state === 0) { tg.state = 3; if (!isDemo) { addMiss(tg.x - scroll, GROUND_Y); if (phase !== 'play') return; } }
      }
    }
    if (passed >= TOTAL && drops.length === 0) {
      if (isDemo) { initGame(); return; }
      finish(misses < MAX_MISS, STORK_X, GROUND_Y);
    }
  }

  function finish(win, x, y) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.6;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.good, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(x, y - 140, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    var kind = x < W / 2 ? 0 : 1;
    if (release(kind, false)) { game.audio.play('se_tap', 0.2); game.fx.burst(x, y, { color: kind ? C.water : C.seed, count: 5, speed: 110 }); }
    else game.audio.tone('C3', 0.04, { wave: 'square', volume: 0.03 });
  });

  // ── demo(影の少し先に来た印へ正しい方を落とす。3か所目は種と水を取り違える)──
  var demo = { t: 0, gx: W * 0.25, gy: H * 0.86, press: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 12;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.n = 0; }
    stepFlight(dt, true);
    if (demo.press > 0) demo.press -= dt;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (tg.state !== 0 || tg.demoed) continue;
      var lead = tg.x - scroll - STORK_X;
      if (lead > 0 && lead <= speed * FALL_T) {
        tg.demoed = true;
        var kind = demo.n % 3 === 2 ? 1 - tg.kind : tg.kind;
        if (release(kind, true)) { demo.press = 0.25; demo.gx = kind ? W * 0.75 : W * 0.25; demo.n++; }
      }
      break;
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawField() {
    var t = game.time.elapsed;
    game.draw.gradient(0, GROUND_Y - 120, [[0, C.sky1], [1, C.sky2]]);
    // 遠景: 川と菜の花の土手(ゆっくり流れる)
    var farOff = (scroll * 0.25) % 240;
    for (var f = -1; f < 6; f++) game.draw.circle(f * 240 - farOff, GROUND_Y - 110, 130, C.far);
    game.draw.rect(0, GROUND_Y - 120, W, 30, C.water, 0.6);
    for (var fl = 0; fl < 24; fl++) {
      var fx = ((fl * 97 - scroll * 0.5) % (W + 60) + W + 60) % (W + 60) - 30;
      game.draw.circle(fx, GROUND_Y - 80 + (fl % 3) * 8, 10, C.flower);
    }
    // 畑(畝のストライプが流れる)
    game.draw.gradient(GROUND_Y - 60, H, [[0, C.soilL], [0.3, C.soil], [1, C.soilD]]);
    var rowOff = scroll % 120;
    for (var r = -1; r < 11; r++) game.draw.rect(r * 120 - rowOff, GROUND_Y - 60, 60, H - GROUND_Y + 60, C.soilD, 0.25);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(t * 1.3));
  }

  function drawTargets() {
    var t = game.time.elapsed;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      var sx = tg.x - scroll;
      if (sx < -100 || sx > W + 100) continue;
      // 印の杭(穴=茶の旗 / 芽=青の旗)で種類を示す
      game.draw.rect(sx + 50, GROUND_Y - 110, 8, 110, C.ink);
      game.draw.rect(sx + 58, GROUND_Y - 110, 44, 30, tg.kind ? C.water : C.seed);
      if (tg.kind === 0) game.draw.sprite(tg.state === 1 ? SPROUT : HOLE, { k: C.shadow, g: C.sprout }, sx, GROUND_Y, 14, { anchor: 'center' });
      else game.draw.sprite(SPROUT, { g: tg.state === 1 ? '#2ae02a' : '#8aa04a' }, sx, GROUND_Y - 20 + (tg.state === 1 ? -8 : 0), tg.state === 1 ? 18 : 14, { anchor: 'center' });
      if (tg.fx > 0) game.draw.circle(sx, GROUND_Y, 90, tg.state === 1 ? C.good : C.bad, tg.fx);
      if (tg.state === 2 || tg.state === 3) game.draw.rect(sx - 40, GROUND_Y + 40, 80, 10, C.bad, 0.7);
    }
  }

  function drawStork() {
    var t = game.time.elapsed;
    // 床影 = 落ちる先
    var pulse = 0.35 + 0.1 * Math.sin(t * 8);
    for (var i = -3; i <= 3; i++) {
      var ww = 70 * Math.sqrt(1 - (i * i) / 16);
      game.draw.rect(STORK_X - ww, GROUND_Y + i * 6, ww * 2, 6, C.shadow, pulse);
    }
    game.draw.line(STORK_X, STORK_Y + 110, STORK_X, GROUND_Y - 40, C.white, 2);
    var fr = Math.floor(t * 5) % 2;
    game.draw.sprite(STORK[fr], { w: C.white, k: C.ink, o: '#ff8a3a' }, STORK_X - 40, STORK_Y + Math.sin(t * 5) * 10, 16, { anchor: 'center', flipX: true });
    for (var d = 0; d < drops.length; d++) {
      var dr = drops[d];
      var p = dr.t / FALL_T;
      var y = STORK_Y + 90 + (GROUND_Y - STORK_Y - 90) * p * p;
      var sx = dr.wx - scroll;
      if (dr.kind === 0) game.draw.sprite(SEED, { s: C.seed }, sx, y, 12, { anchor: 'center' });
      else game.draw.sprite(DROP, { b: C.water }, sx, y, 12, { anchor: 'center' });
    }
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.8, W, H * 0.2, C.ink, 0.35);
    // 左=種袋 / 右=水袋のボタン
    game.draw.circle(W * 0.25, H * 0.88, 110, C.seed, 0.9);
    game.draw.sprite(SEED, { s: '#fff0c0' }, W * 0.25, H * 0.88 + Math.sin(t * 3) * 4, 26, { anchor: 'center' });
    game.draw.circle(W * 0.75, H * 0.88, 110, C.water, 0.9);
    game.draw.sprite(DROP, { b: '#d0ecff' }, W * 0.75, H * 0.88 + Math.sin(t * 3 + 1) * 4, 24, { anchor: 'center' });
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 - 100 + m * 70, H * 0.965, 50, 16, m < misses ? C.bad : '#5a4a3a');
    if (flashT > 0) game.draw.rect(0, H * 0.8, W, H * 0.2, C.bad, flashT * 0.5);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.8);
    txt(hits + ' / ' + TOTAL, W / 2, 90, 66, C.good);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 20, '#4a3a2a');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.sprout);
    for (var i = 0; i < TOTAL; i++) game.draw.circle(W * 0.62 + i * 36, 90, 12, i < passed ? (targets[i].state === 1 ? C.sprout : C.bad) : '#5a4a3a');
  }

  function score() { return hits * 150 + perfects * 100 + Math.max(0, MAX_MISS - misses) * 60 + Math.round(timeLeft * 10); }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawField(); drawTargets(); drawStork(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.8);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 76, C.good);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.76, 42, C.good);
      else txt('INSERT COIN', W / 2, H * 0.76, 36, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawField(); drawStork(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.good : C.bad);
      txt('BEST ' + game.best, W / 2, H * 0.36, 40, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.76, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepFlight(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false, STORK_X, GROUND_Y); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { sown: hits, perfects: perfects, misses: misses };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawField(); drawTargets(); drawStork(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 100, C.good);
    if (phase === 'outro') {
      var sc = score();
      game.draw.rect(0, H * 0.24, W, H * 0.16, C.ink, 0.88);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 96, ok ? C.good : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.33, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.37, 40, C.good);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - hits) + 'か所!', W / 2, H * 0.37, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.37, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5],
      ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['A4', 0.5], ['C5', 2]
    ], { tempo: 138, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['G2', 2], ['A2', 2], ['F2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
