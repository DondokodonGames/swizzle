// J-Switch-0035-turf-sled-shoulder.js
// 土手の芝そり競走 — 横に並んだ相手そりが体当たりしてくる瞬間だけ押し返し、コースに踏みとどまって土手の下の旗まで滑り降りる
// 操作: 相手そりが赤く光って突っ込んでくる瞬間にどこでもタップすると押し返す。光る前(揺さぶりのフェイント中)に押すと自分がよろけてミス。押さずにいるとぶつけられてミス(社内メモ。画面には出さない)
// 終わり: 7台の相手をさばいて土手の下の旗に着けばCLEAR。3回ミス(はじかれ・早押し)か時間切れでGAME OVER
// @mechanic: reaction_duel
// @theme: riverbank_turf_sled_bump
// 世界観: 真夏の河川敷の芝の土手で開かれた段ボールそり競走、麦わら帽の子が、横から体当たりしてくる相手そりの突進を見切って押し返し、コースに踏みとどまって土手の下のゴール旗まで滑り降りる
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し返した数・平均反応時間・ミス数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・太い縁取り・飛ぶ数字
  var STYLE = { bg: ['#6ee05a', '#3fbf3a', '#2a9a2e'], main: ['#c98a4a', '#1a1a1a'], accent: ['#ffe600', '#ff2d55'] };
  var C = {
    g1: STYLE.bg[0], g2: STYLE.bg[1], g3: STYLE.bg[2], river: '#2ec5ff', riverDk: '#1a8fd0',
    box: STYLE.main[0], boxDk: '#8a5a2b', ink: STYLE.main[1], hat: '#ffd84a', shirt: '#ff7a2a',
    rival1: '#3a7bff', rival2: '#b04aff', rival3: '#ff4ab0', good: STYLE.accent[0], bad: STYLE.accent[1], white: '#ffffff'
  };

  var GAME_TITLE = 'TURF RUSH';
  var TIME_LIMIT = 15;
  var NEEDED = 7;
  var MAX_LIVES = 3;
  var ME_X = W * 0.5, ME_Y = H * 0.58;
  var SIDE_GAP = 250;       // 並走時の横距離
  var WINDOW = 0.45;        // 光ってからぶつかるまで
  var RIVAL_COLORS = [C.rival1, C.rival2, C.rival3];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト(太い縁取り=k) ──
  var SLED_A = [
    '..kkkkkkkk..',
    '.kyyyyyyyyk.',
    'kkyyyyyyyykk',
    '.kkssssssk..',
    '.kssekkessk.',
    '.kssssssssk.',
    'kkoooooooookk',
    'kbooooooooobk',
    'kbbbbbbbbbbbk',
    'kBbbbbbbbbbBk',
    '.kkkkkkkkkkk.'
  ];
  var SLED_B = [
    '..kkkkkkkk..',
    '.kyyyyyyyyk.',
    'kkyyyyyyyykk',
    '.kkssssssk..',
    '.ksskkkkssk.',
    '.kssssssssk.',
    'kkoooooooookk',
    'kbooooooooobk',
    'kbbbbbbbbbbbk',
    'kBbbbbbbbbbBk',
    '.kkkkkkkkkkk.'
  ];
  function palFor(shirt) { return { k: C.ink, y: C.hat, s: '#ffc98a', e: C.ink, o: shirt, b: C.box, B: C.boxDk }; }
  var RIVAL = [
    '..kkkkkkkk..',
    '.khhhhhhhhk.',
    'kkhhhhhhhhkk',
    '.kkssssssk..',
    '.kssekkessk.',
    '.kssssssssk.',
    'kkoooooooookk',
    'kbooooooooobk',
    'kbbbbbbbbbbbk',
    'kBbbbbbbbbbBk',
    '.kkkkkkkkkkk.'
  ];
  var FLAG = ['kkkkkk', 'krrrrk', 'kwwwwk', 'krrrrk', 'k.....', 'k.....', 'k.....', 'k.....'];
  var CLOVER = ['.g.g.', 'ggggg', '.ggg.', '..k..'];

  // ── 状態 ──
  var enc, encIdx, dealt, lives, timeLeft, react, reactN, scroll, wob, flagY;
  var ready, hitStop, finished, ok, done, endWait, hitFx, perfects;
  var result = { dealt: 0, avg: 0, misses: 0, score: 0, perfects: 0 };

  // 1台ぶんの遭遇: enter → tease(フェイント) → signal(光る) → contact
  function makeEnc(i, teaseLen) {
    var side = (i * 7 + 3) % 5 < 2 ? -1 : 1;
    if (i % 3 === 2) side = -side;
    return {
      side: side, phase: 'enter', t: 0, x: ME_X + side * (W * 0.75), y: ME_Y + 120,
      tease: teaseLen !== undefined ? teaseLen : 0.35 + Math.random() * 0.6,
      feintT: 0, sig: 0, color: RIVAL_COLORS[i % 3], fly: 0, resolved: false
    };
  }

  function initGame() {
    encIdx = 0; enc = makeEnc(0); dealt = 0; lives = MAX_LIVES; timeLeft = TIME_LIMIT;
    react = 0; reactN = 0; scroll = 0; wob = 0; flagY = -200; perfects = 0;
    ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0; hitFx = null;
  }

  // 遭遇の進行(PLAYING とデモで共用)。'signal' / 'contact' / 'gone' を返す
  function stepEnc(dt) {
    var e = enc;
    e.t += dt;
    var homeX = ME_X + e.side * SIDE_GAP;
    if (e.phase === 'enter') {
      e.x += (homeX - e.x) * Math.min(1, dt * 7);
      e.y += (ME_Y - e.y) * Math.min(1, dt * 7);
      if (e.t > 0.3) { e.phase = 'tease'; e.t = 0; }
    } else if (e.phase === 'tease') {
      // フェイント: 小刻みに寄っては戻る(光らない)
      e.feintT += dt;
      var f = Math.max(0, Math.sin(e.feintT * 9)) * 45;
      e.x = homeX - e.side * f;
      if (e.t > e.tease) { e.phase = 'signal'; e.t = 0; return 'signal'; }
    } else if (e.phase === 'signal') {
      // 一瞬のけぞってから突っ込む
      var k = e.t / WINDOW;
      var back = k < 0.2 ? k / 0.2 * 30 : 30 - (k - 0.2) / 0.8 * (SIDE_GAP - 120 + 30);
      e.x = homeX + e.side * back;
      if (e.t >= WINDOW) { e.phase = 'hit'; e.t = 0; return 'contact'; }
    } else if (e.phase === 'shoved' || e.phase === 'hit') {
      e.fly += dt;
      if (e.phase === 'shoved') { e.x += e.side * 1400 * dt; e.y -= 300 * dt; }
      else { e.x += (homeX - e.x) * Math.min(1, dt * 4); e.y -= 500 * dt; }
      if (e.fly > 0.35) return 'gone';
    }
    return null;
  }

  function shove(live) {
    var e = enc;
    if (e.phase === 'signal') {
      var rt = e.t;
      e.phase = 'shoved'; e.fly = 0;
      dealt++;
      if (live) {
        react += rt; reactN++;
        var perfect = rt < 0.25;
        if (perfect) perfects++;
        game.feedback.good(ME_X + e.side * 140, ME_Y - 100, { text: perfect ? 'PERFECT' : 'GOOD', color: C.good, shake: 6 });
        game.fx.popup((Math.round(rt * 100) / 100).toFixed(2), ME_X + e.side * 140, ME_Y - 190, { color: C.white, size: 44 });
        if (dealt === 4) { game.fx.popup(dealt + ' / ' + NEEDED, W / 2, H * 0.36, { color: C.good, size: 72 }); game.audio.play('se_milestone', 0.5); }
      }
      return true;
    }
    if (e.phase === 'tease' || e.phase === 'enter') {
      // 早押し: 自分がよろける
      wob = 0.5;
      e.phase = 'hit'; e.t = 0; e.fly = 0;
      if (live) miss(ME_X, ME_Y, 'MISS');
      return false;
    }
    if (live) game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.03 });
    return false;
  }

  function miss(x, y, word) {
    lives--;
    hitStop = 0.45;
    hitFx = { x: x, y: y, t: 0.45 };
    game.fx.flash('#ffffff', 0.14);
    game.feedback.bad(x, y - 60, { text: word, shake: 16 });
    if (lives <= 0) { finished = true; ok = false; finish(); }
  }

  function nextEnc(live) {
    encIdx++;
    if (live && encIdx >= NEEDED) {
      finished = true; ok = true;
      flagY = ME_Y + 40;
      game.fx.burst(ME_X, ME_Y + 100, { color: C.good, count: 30, speed: 480 });
      game.feedback.good(W / 2, H * 0.36, { text: 'CLEAR', color: C.good, size: 90 });
      game.audio.play('se_success', 0.6);
      finish();
      return;
    }
    enc = makeEnc(encIdx);
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.3;
    game.audio.stopBgm();
    result.dealt = dealt; result.misses = MAX_LIVES - lives; result.perfects = perfects;
    result.avg = reactN > 0 ? react / reactN : 0;
    result.score = ok ? dealt * 100 + perfects * 80 + lives * 100 + Math.max(0, Math.round((0.45 - result.avg) * 1000)) : 0;
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); startMusic(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished || ready > 0 || hitStop > 0) { game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.03 }); return; }
    game.audio.play('se_tap', 0.3);
    shove(true);
  });

  // ── 描画 ──
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.g1], [0.5, C.g2], [1, C.g3]]);
    // 芝の刈り目(滑る速さで上へ流れる)
    for (var i = 0; i < 12; i++) {
      var y = ((i * 180 - scroll) % (12 * 180) + 12 * 180) % (12 * 180) - 100;
      game.draw.rect(W * 0.12, y, W * 0.76, 80, C.white, 0.08);
    }
    // 両脇: 川(右)と土手の上の道(左)
    game.draw.rect(W * 0.9, 0, W * 0.1, H, C.river);
    for (var r = 0; r < 10; r++) {
      var ry = ((r * 220 - scroll * 0.6) % 2200 + 2200) % 2200 - 100;
      game.draw.rect(W * 0.92, ry, 40, 8, C.white, 0.6);
    }
    game.draw.rect(0, 0, W * 0.1, H, '#d9c08a');
    game.draw.line(W * 0.1, 0, W * 0.1, H, C.ink, 8);
    game.draw.line(W * 0.9, 0, W * 0.9, H, C.ink, 8);
    // クローバーと観客のうちわ(揺れる)
    for (var c = 0; c < 6; c++) {
      var cy = ((c * 330 - scroll) % 1980 + 1980) % 1980 - 60;
      game.draw.sprite(CLOVER, { g: '#1f7a1f', k: C.ink }, W * 0.2 + (c % 3) * W * 0.3 + Math.sin(t * 2 + c) * 8, cy, 8, { anchor: 'center' });
    }
    for (var a = 0; a < 4; a++) {
      var ay = H * 0.25 + a * H * 0.18 + Math.sin(t * 3 + a) * 14;
      game.draw.circle(W * 0.05, ay, 26, [C.bad, C.good, C.rival1, C.shirt][a]);
      game.draw.circle(W * 0.05, ay, 26, C.ink, 0.15);
    }
    game.draw.rect(0, 0, W, H, C.good, 0.03 + 0.03 * Math.sin(t * 1.6));
  }

  function outline(spr, pal, x, y, px, alpha) {
    game.draw.sprite(spr, { k: C.ink, y: C.ink, s: C.ink, e: C.ink, o: C.ink, b: C.ink, B: C.ink, h: C.ink }, x + 6, y + 8, px, { anchor: 'center', alpha: 0.35 * (alpha || 1) });
    game.draw.sprite(spr, pal, x, y, px, { anchor: 'center', alpha: alpha });
  }

  function drawRival() {
    if (!enc) return;
    var t = game.time.elapsed;
    var e = enc;
    if (e.phase === 'signal') {
      var k = e.t / WINDOW;
      game.draw.circle(e.x, e.y, 120 + k * 30, C.bad, 0.55 + 0.3 * Math.sin(t * 40));
      game.draw.line(e.x - e.side * 90, e.y - 20, ME_X + e.side * 90, ME_Y - 20, C.bad, 10);
    }
    var pal = palFor(e.color); pal.h = e.color;
    var spin = e.phase === 'shoved' ? Math.sin(e.fly * 40) * 20 : 0;
    outline(RIVAL, pal, e.x + spin, e.y + Math.sin(t * 7) * 4, 14, e.phase === 'shoved' ? Math.max(0, 1 - e.fly * 2) : 1);
  }

  function drawMe() {
    var t = game.time.elapsed;
    var x = ME_X + (wob > 0 ? Math.sin(t * 50) * 30 : 0) + Math.sin(t * 1.7) * 4;
    game.draw.circle(ME_X, ME_Y + 90, 90, C.ink, 0.2);
    // 芝の飛沫
    game.draw.circle(ME_X - 60, ME_Y + 90 + Math.sin(t * 20) * 6, 12, C.g1);
    game.draw.circle(ME_X + 60, ME_Y + 90 + Math.cos(t * 20) * 6, 12, C.g1);
    outline(Math.floor(t * 4) % 2 ? SLED_A : SLED_B, palFor(C.shirt), x, ME_Y + Math.sin(t * 8) * 4, 15);
  }

  function drawFlag() {
    if (flagY < -100) return;
    game.draw.rect(W * 0.1, flagY, W * 0.8, 16, C.white);
    game.draw.rect(W * 0.1, flagY + 16, W * 0.8, 16, C.ink);
    game.draw.sprite(FLAG, { k: C.ink, r: C.bad, w: C.white }, W * 0.16, flagY - 60 + Math.sin(game.time.elapsed * 4) * 4, 14, { anchor: 'center' });
    game.draw.sprite(FLAG, { k: C.ink, r: C.bad, w: C.white }, W * 0.84, flagY - 60 + Math.cos(game.time.elapsed * 4) * 4, 14, { anchor: 'center', flipX: true });
  }

  function drawHitFx(dt) {
    if (!hitFx || hitFx.t <= 0) return;
    hitFx.t -= dt;
    var k = (0.45 - hitFx.t) / 0.45;
    game.draw.circle(hitFx.x, hitFx.y, 140 + k * 160, C.white, 0.7 * (1 - k * 0.5));
    game.draw.sprite(SLED_A, { k: C.white, y: C.white, s: C.white, e: C.bad, o: C.white, b: C.white, B: C.white }, hitFx.x, hitFx.y, 15 + k * 6, { anchor: 'center' });
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 5, y + 6, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.55);
    txt(Math.min(encIdx, NEEDED) + ' / ' + NEEDED, W / 2, 72, 64, C.white);
    var bw = W - 200;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(100, 140, bw, 22, C.white, 0.3);
    game.draw.rect(100, 140, bw * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.bad : C.good);
    for (var i = 0; i < MAX_LIVES; i++) {
      game.draw.sprite(SLED_A, palFor(C.shirt), 90 + i * 80, 200, 4, { anchor: 'center', alpha: i < lives ? 1 : 0.25 });
    }
    // 下: コースの残り(進捗バー)
    var progress = Math.min(1, encIdx / NEEDED);
    game.draw.rect(W * 0.15, H * 0.9, W * 0.7, 26, C.ink, 0.5);
    game.draw.rect(W * 0.15, H * 0.9, W * 0.7 * progress, 26, C.good);
    game.draw.sprite(FLAG, { k: C.ink, r: C.bad, w: C.white }, W * 0.87, H * 0.9, 7, { anchor: 'center' });
    game.draw.sprite(SLED_A, palFor(C.shirt), W * 0.15 + W * 0.7 * progress, H * 0.9 + 12, 4, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック stepEnc/shove を使う) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, early: false, acted: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      encIdx = 0; enc = makeEnc(Math.floor(demo.t / 3.6) % 3, 0.9); wob = 0;
      demo.early = Math.floor(demo.t / 3.6) % 2 === 1; demo.acted = false;
    }
    if (wob > 0) wob -= dt;
    // 成功回: 光ってから0.2秒で押す / 失敗回: フェイントにつられて早押し
    if (!demo.acted) {
      if (demo.early && enc.phase === 'tease' && enc.t > 0.35) { demo.acted = true; demo.press = true; shove(false); game.fx.flash('#ffffff', 0.08); }
      else if (!demo.early && enc.phase === 'signal' && enc.t > 0.2) { demo.acted = true; demo.press = true; shove(false); game.fx.burst(ME_X + enc.side * 140, ME_Y - 60, { color: C.good, count: 14, speed: 300 }); }
    }
    if (demo.press && enc.phase !== 'signal' && enc.fly > 0.25) demo.press = false;
    demo.gx = W * 0.5; demo.gy = H * 0.78;
    var ev = stepEnc(dt);
    if (ev === 'gone') { enc = makeEnc(1, 2.0); enc.phase = 'enter'; }
  }

  // ── メインループ(1回だけ登録) ──
  game.onUpdate(function(dt) {
    if (enc === undefined) initGame();
    if (hitStop <= 0) scroll += dt * 900;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawBg();
      drawRival();
      drawMe();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.55);
      txt(GAME_TITLE, W / 2, 80, 80, C.good);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 172, 36, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.good);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawBg();
      drawFlag();
      drawMe();
      game.draw.rect(0, H * 0.26, W, H * 0.3, C.ink, 0.8);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 104, ok ? C.good : C.bad);
      txt(result.dealt + ' / ' + NEEDED, W / 2, H * 0.385, 60, C.white);
      if (ok) txt('SCORE ' + result.score, W / 2, H * 0.44, 52, C.good);
      else txt('あと' + (NEEDED - result.dealt) + '台!', W / 2, H * 0.44, 52, C.bad);
      txt('PERFECT ' + result.perfects + '   ' + result.avg.toFixed(2) + '秒', W / 2, H * 0.49, 36, C.white);
      var isNew = ok && result.score >= game.best && result.score > 0;
      txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.535, 40, isNew ? C.good : C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 42, C.white);
      return;
    }

    // PLAYING
    if (wob > 0) wob -= dt;
    if (done) {
      endWait -= dt;
      if (flagY > -100) flagY -= dt * 500;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { dealt: result.dealt, perfects: result.perfects, avgReaction: Math.round(result.avg * 1000), misses: result.misses };
        if (ok) game.end.success(result.score, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      var ev = stepEnc(dt);
      if (ev === 'signal') game.audio.tone('A5', 0.12, { wave: 'square', volume: 0.07, slide: 300 });
      else if (ev === 'contact') { wob = 0.5; miss(ME_X + enc.side * 60, ME_Y, 'MISS'); }
      else if (ev === 'gone') nextEnc(true);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.4;
        game.feedback.bad(ME_X, ME_Y - 60, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.5);
        finish();
      }
    }

    drawBg();
    drawFlag();
    if (!finished) drawRival();
    drawMe();
    drawHitFx(dt);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, C.good);
  });

  function startMusic() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.25], ['G5', 0.25], ['A5', 1],
      ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 1]
    ], { tempo: 168, wave: 'square', volume: 0.06, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['F2', 1]] });
  }

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    game.audio.bgm('bgm_cute');
  });
})(game);
