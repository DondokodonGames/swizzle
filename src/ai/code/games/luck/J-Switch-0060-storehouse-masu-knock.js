// J-Switch-0060-storehouse-masu-knock.js
// 蔵の吊り升叩き — 梁から吊られた2つの木の升を見比べ、中身の詰まった重い方(低く垂れてゆったり揺れる方)だけを叩き割る
// 操作: 左右どちらかの升をタップで叩く。詰まった升は綱が伸びて低く下がり、揺れがゆっくり。空の升は高く軽く、せわしなく揺れる(社内メモ。画面には出さない)
// 終わり: 中身の升を6つ割ればCLEAR。空を3回叩く(見送りも含む)/時間切れでGAME OVER
// @mechanic: size_judge
// @theme: storehouse_hanging_masu
// 世界観: 古い乾物問屋の蔵で、見習い丁稚のタヌキが、梁から二つずつ吊り下ろされる木の升を見比べ、干し柿が詰まった重い升だけを棒で割って、年の瀬の売り出しの分を集める
// 残るもの: 正誤(CLEAR/GAME OVER) + 割った数・見極めの速さ・空振り数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質。粒状ノイズと擬似奥行き、背景は1枚絵として描く
  var STYLE = { bg: ['#1a1410', '#2e241a', '#0a0806'], main: ['#a07848', '#6a4a2a', '#d8b078'], accent: ['#ff9a3a', '#e04a3a'] };
  var C = {
    bg1: '#2a2016', bg2: '#0e0a07', beam: '#4a3420', beamL: '#6a4a2e', wood: '#b88a52', woodD: '#7a5630', woodL: '#e0b87a', rope: '#c8b088',
    lamp: '#ffb04a', kaki: '#ff7a2a', dust: '#8a8070', white: '#f4ead8', ink: '#060404', bad: '#e04a3a', gold: '#ffd060', fur: '#8a6a4a'
  };

  var GAME_TITLE = 'MASU KNOCK';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var MAX_MISS = 3;
  var PIVOT_Y = H * 0.2;
  var SIDES = [W * 0.3, W * 0.7];
  var PAIR_TIME = 2.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, pair, got, miss, round, hitStop, outro, ok, focus, reacts, milestone, stick, pieces;

  // ── sprites ───────────────────────────────────────────────────────
  var MASU = ['wwwwwwwwww', 'wLLLLLLLLw', 'wLddddddLw', 'wLddddddLw', 'wLddddddLw', 'wLLLLLLLLw', 'wwwwwwwwww'];
  var TANUKI = [
    ['.ff....ff.', 'ffff..ffff', '.ffffffff.', 'fkkffffkkf', 'fkwkffkwkf', '.ffffbfff.', '..fwwwwf..', '.ffwwwwff.', '.ff....ff.'],
    ['.ff....ff.', 'ffff..ffff', '.ffffffff.', 'fkkffffkkf', 'fkwkffkwkf', '.ffffbfff.', '..fwwwwf..', '.ffwwwwff.', 'ff......ff']
  ];
  var KAKI = ['.g.', 'ooo', 'ooo'];
  var MOTH = ['m.m', '.m.', 'm.m'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // 1組の升: 詰まった方は綱が長く(低く垂れ)周期も遅い。後半ほど差が小さい
  function newPair(k) {
    var step = Math.min(2, Math.floor(k / 2));
    var dSag = [140, 70, 26][step];
    var ratio = [1.55, 1.38, 1.26][step];
    var fullSide = Math.random() < 0.5 ? 0 : 1;
    var baseL = H * 0.27;
    var list = [];
    for (var s = 0; s < 2; s++) {
      var full = s === fullSide;
      var T = full ? 1.5 * ratio : 1.5;
      var amp = (full ? 0.12 : 0.2) * (step >= 2 ? game.random(0.8, 1.2) : 1);
      list.push({ full: full, L: baseL + (full ? dSag : 0) + (step >= 2 ? game.random(-8, 8) : 0), T: T, amp: amp, ph: game.random(0, 6.28), x: 0, y: 0, broke: 0 });
    }
    pair = { list: list, t: 0, drop: 0, gold: k === NEEDED - 1, done: false, lift: 0 };
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; got = 0; miss = 0; round = 0;
    hitStop = 0; outro = 0; ok = false; focus = null; reacts = []; milestone = false; stick = { side: -1, t: 0 }; pieces = [];
    newPair(0);
  }

  function blockPos(b, i) {
    var t = game.time.elapsed;
    var th = Math.sin(t * Math.PI * 2 / b.T + b.ph) * b.amp;
    var drop = pair.drop < 1 ? (1 - pair.drop) * -500 : 0;
    var lift = pair.lift * -700;
    b.x = SIDES[i] + Math.sin(th) * b.L;
    b.y = PIVOT_Y + Math.cos(th) * b.L + drop + lift;
    return th;
  }

  // 升の出入り(実プレイ・デモ共用)
  function stepPair(dt, isDemo) {
    if (pair.drop < 1) { pair.drop = Math.min(1, pair.drop + dt * 4); return; }
    if (pair.done) {
      pair.lift += dt * 2.2;
      if (pair.lift >= 1) { round++; newPair(isDemo ? round % 5 : round); }
      return;
    }
    pair.t += dt;
    if (pair.t > PAIR_TIME) {
      // 見送り: 升が引き上げられる
      pair.done = true;
      if (isDemo) return;
      miss++;
      var f = pair.list[0].full ? 0 : 1;
      focus = { i: f, t: 0.5 };
      hitStop = 0.35;
      game.feedback.bad(SIDES[f], H * 0.4, { text: 'MISS', color: C.bad });
      if (miss >= MAX_MISS) finish(false);
    }
  }

  function knock(i, isDemo) {
    if (pair.done || pair.drop < 1) return;
    var b = pair.list[i];
    stick = { side: i, t: 0.25 };
    pair.done = true; b.broke = 1;
    if (b.full) {
      for (var p = 0; p < (pair.gold ? 10 : 6); p++) pieces.push({ x: b.x, y: b.y, vx: game.random(-300, 300), vy: game.random(-700, -300), t: 1.2, kind: 'kaki' });
      if (isDemo) { game.fx.burst(b.x, b.y, { color: C.kaki, count: 8, speed: 220 }); return; }
      got++;
      var fast = pair.t < 0.9;
      reacts.push(pair.t);
      game.audio.play('se_break', 0.4);
      game.feedback.good(b.x, b.y - 140, { text: fast ? 'PERFECT' : 'GOOD', color: pair.gold ? C.gold : C.kaki, count: fast ? 16 : 10 });
      game.audio.play('se_coin', 0.3);
      if (!milestone && got >= NEEDED / 2) {
        milestone = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(got + ' / ' + NEEDED, W / 2, H * 0.72, { color: C.gold, size: 70 });
      }
      if (got >= NEEDED) finish(true);
    } else {
      for (var q = 0; q < 3; q++) pieces.push({ x: b.x, y: b.y, vx: game.random(-120, 120), vy: game.random(-260, -120), t: 1.2, kind: 'moth' });
      game.fx.burst(b.x, b.y, { color: C.dust, count: 14, speed: 200 });
      if (isDemo) return;
      miss++;
      focus = { i: i, t: 0.5 };
      hitStop = 0.4;
      game.feedback.bad(b.x, b.y - 140, { text: 'MISS', color: C.bad });
      if (miss >= MAX_MISS) finish(false);
    }
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) {
      game.fx.flash(C.lamp, 0.25);
      game.fx.burst(W / 2, H * 0.45, { color: C.gold, count: 30, speed: 420 });
      game.audio.play('se_success', 0.6);
    } else {
      game.feedback.bad(W / 2, H * 0.3, { text: timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase !== 'play' || hitStop > 0 || pair.done || pair.drop < 1) { game.audio.tone('C3', 0.04, { wave: 'triangle', volume: 0.03 }); game.fx.burst(x, y, { color: C.dust, count: 3, speed: 80 }); return; }
    var i = x < W / 2 ? 0 : 1;
    game.audio.play('se_tap', 0.3);
    knock(i, false);
  });

  // ── demo(見比べて重い方を叩く。1周に1回、軽い方を叩いて外す)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: 0, fooled: false };
  var DEMO_CYC = 8;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { round = 0; newPair(0); pieces = []; demo.fooled = false; }
    stepPair(dt, true);
    if (demo.press > 0) demo.press -= dt;
    var fi = pair.list[0].full ? 0 : 1;
    var pick = fi;
    if (!demo.fooled && cyc > 4) pick = 1 - fi;
    if (!pair.done && pair.drop >= 1) {
      demo.gx += (SIDES[pick] - demo.gx) * Math.min(1, dt * 4);
      if (pair.t > 1.0) { if (pick !== fi) demo.fooled = true; knock(pick, true); demo.press = 0.2; }
    }
    demo.gy = H * 0.86 - (demo.press > 0 ? 16 : 0);
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawStore() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.6, '#1e160e'], [1, C.bg2]]);
    // 奥の棚(一枚絵)
    for (var r = 0; r < 5; r++) {
      var sy = H * 0.3 + r * 150;
      game.draw.rect(40, sy, W - 80, 16, C.beam, 0.7);
      for (var j = 0; j < 9; j++) game.draw.rect(70 + j * 110, sy - 70, 80, 70, j % 3 ? C.woodD : '#5a4a3a', 0.35);
    }
    // 梁
    game.draw.rect(0, PIVOT_Y - 40, W, 50, C.beam);
    game.draw.rect(0, PIVOT_Y - 40, W, 10, C.beamL);
    // 吊り灯りのブルーム
    game.draw.circle(W * 0.5, PIVOT_Y + 60, 220, C.lamp, 0.06 + 0.02 * Math.sin(t * 3));
    game.draw.circle(W * 0.5, PIVOT_Y + 60, 120, C.lamp, 0.08);
    game.draw.circle(W * 0.5, PIVOT_Y + 60, 26, C.lamp, 0.8);
    // 粒状ノイズ
    for (var n = 0; n < 40; n++) game.draw.rect(game.random(0, W), game.random(0, H), 4, 4, C.white, 0.05);
    game.draw.rect(0, 0, W, H, C.lamp, 0.015 + 0.015 * Math.sin(t * 1.2));
  }

  function drawBlocks() {
    var t = game.time.elapsed;
    for (var i = 0; i < 2; i++) {
      var b = pair.list[i];
      blockPos(b, i);
      if (b.broke) continue;
      var hl = focus && focus.t > 0 && focus.i === i && Math.floor(t * 14) % 2 === 0;
      game.draw.line(SIDES[i], PIVOT_Y - 10, b.x, b.y - 60, pair.gold ? C.gold : C.rope, b.full ? 5 : 4);
      game.draw.rect(b.x - 70, b.y + 70, 140, 10, C.ink, 0.35);
      game.draw.sprite(MASU, { w: hl ? C.white : C.woodD, L: C.wood, d: C.woodL }, b.x, b.y, 14, { anchor: 'center' });
      // 升の縄の結び目(十字)
      game.draw.rect(b.x - 4, b.y - 50, 8, 100, C.rope, 0.8);
      game.draw.rect(b.x - 70, b.y - 4, 140, 8, C.rope, 0.8);
    }
    // 残り時間の縄(升の上の短いゲージ)
    if (!pair.done && pair.drop >= 1 && state === S.PLAYING) {
      var k = Math.max(0, 1 - pair.t / PAIR_TIME);
      game.draw.rect(W * 0.35, PIVOT_Y + 20, W * 0.3 * k, 10, k < 0.3 ? C.bad : C.lamp, 0.8);
    }
    for (var p = 0; p < pieces.length; p++) {
      var q = pieces[p];
      if (q.kind === 'kaki') game.draw.sprite(KAKI, { g: '#5a8a3a', o: pair.gold ? C.gold : C.kaki }, q.x, q.y, 12, { anchor: 'center' });
      else game.draw.sprite(MOTH, { m: C.dust }, q.x, q.y + Math.sin(t * 20 + p) * 6, 12, { anchor: 'center' });
    }
  }

  function stepPieces(dt) {
    for (var i = pieces.length - 1; i >= 0; i--) {
      var q = pieces[i];
      q.t -= dt;
      if (q.kind === 'kaki') { q.vy += 1600 * dt; } else { q.vy -= 60 * dt; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.t <= 0) pieces.splice(i, 1);
    }
  }

  function drawTanuki() {
    var t = game.time.elapsed;
    var tx = stick.side < 0 ? W / 2 : SIDES[stick.side];
    var ty = H * 0.8 + Math.sin(t * 2.4) * 5;
    game.draw.rect(tx - 90, H * 0.8 + 80, 180, 14, C.ink, 0.4);
    game.draw.sprite(TANUKI[Math.floor(t * 3) % 2], { f: C.fur, k: '#2a1a10', w: C.white, b: C.ink }, tx, ty, 16, { anchor: 'center' });
    var up = stick.t > 0 ? 1 : 0;
    game.draw.line(tx + 60, ty - 20, tx + 60 + (up ? -20 : 60), ty - 20 - (up ? 380 : 180), C.woodL, 12);
    // 親指ゾーン(左右の叩き台)
    game.draw.rect(0, H * 0.9, W, H * 0.1, C.ink, 0.4);
    game.draw.rect(W * 0.08, H * 0.905, W * 0.36, 16, C.beam);
    game.draw.rect(W * 0.56, H * 0.905, W * 0.36, 16, C.beam);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.72);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 70, 96, 56, C.white, 'left');
    txt(got + ' / ' + NEEDED, W / 2, 96, 66, C.kaki);
    for (var i = 0; i < MAX_MISS; i++) game.draw.circle(W - 200 + i * 60, 90, 18, i < miss ? C.bad : '#4a3a2a');
    game.draw.rect(60, 170, W - 120, 18, '#3a2a1a');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, timeLeft < 4 ? C.bad : C.lamp);
  }

  function avgReact() { if (!reacts.length) return 0; var s = 0; for (var i = 0; i < reacts.length; i++) s += reacts[i]; return s / reacts.length; }
  function score() { return got * 150 + Math.round(Math.max(0, 2 - avgReact()) * 100) + Math.round(Math.max(0, timeLeft) * 20) - miss * 50; }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (stick.t > 0) stick.t -= dt;
    if (focus && focus.t > 0 && phase !== 'stop') focus.t -= dt;
    stepPieces(dt);

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawStore(); drawBlocks(); drawTanuki();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.72);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 100 + Math.sin(t * 2) * 6, 84, C.lamp);
      txt('HI-SCORE ' + game.best, W / 2, 190, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawStore(); drawTanuki();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.36, 48, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.4, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepPair(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { cracked: got, wrong: miss, avgSec: Math.round(avgReact() * 100) / 100 };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawStore(); drawBlocks(); drawTanuki(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.lamp);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.25, W, H * 0.17, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.35, 44, C.white);
      if (ok && score() > game.best) txt('NEW RECORD', W / 2, H * 0.395, 42, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - got) + '個!', W / 2, H * 0.395, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.395, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 1], ['G4', 1], ['A4', 0.5], ['B4', 0.5], ['A4', 1],
      ['G4', 1], ['E4', 0.5], ['D4', 0.5], ['E4', 2]
    ], { tempo: 92, wave: 'triangle', volume: 0.05, loop: true, bass: [['E2', 2], ['C2', 2], ['D2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
