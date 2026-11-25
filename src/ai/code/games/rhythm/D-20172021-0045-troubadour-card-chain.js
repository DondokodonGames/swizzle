// D-20172021-0045-troubadour-card-chain.js
// トルバドゥールカードチェイン — 旅の吟遊詩人が奏でる楽曲に合わせて音符を拾い、途切れぬ連鎖でカードを手にする
// 操作: 落ちてくる音符が下の輪に重なった瞬間にタップする。連鎖が途切れなければ金色のカード音符が混じる
// 終わり: 規定数を拾い切れば成功。連鎖のまま曲が終われば失敗(拾えた数が足りない場合)
// @mechanic: jackpot_combo
// @theme: troubadour_card_chain
// 世界観: 広場に立つ旅の吟遊詩人が、楽曲の音符を一つも落とさず拾い続け、連鎖が伸びるほど舞い込む金色のカードを手繰り寄せる
// 残るもの: 正誤(CLEAR/GAME OVER) + 拾った数と集めたカード数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形、上下に情報を分ける名残
  var C = {
    bg1: '#fff2f8', bg2: '#ffe0ee', ring: '#ffffff', ringEdge: '#ff9ecb',
    note: '#8fd8ff', noteEdge: '#4fb0e0', card: '#ffd54a', cardEdge: '#e0a400',
    good: '#3ecf8e', bad: '#ff6b81', gold: '#ff9ecb', ink: '#6a3550', white: '#ffffff',
  };

  var GAME_TITLE = 'CARD CHAIN';
  var NOTE_COUNT = 7;
  var NOTE_INTERVAL = 1.1;
  var APPROACH = 1.0;
  var TIME_LIMIT = NOTE_COUNT * NOTE_INTERVAL + 1.3;
  var NEEDED = 5;
  var RING = { x: W * 0.5, y: H * 0.78, r: 115 };
  var SPAWN_Y = H * 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#c26a90', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BARD = ['.#.#.', '#####', '.###.', '#.#.#', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 3; i++) {
      var bx = W * (0.2 + i * 0.3);
      var bob = Math.sin(game.time.elapsed * 1.5 + i) * 10;
      game.draw.circle(bx, H * 0.12 + bob, 30, C.card, 0.3);
    }
    game.draw.sprite(BARD, { '#': C.ink }, W * 0.5, H * 0.13, 13, { anchor: 'center' });
  }

  function drawRing() {
    game.draw.circle(RING.x, RING.y, RING.r + 16, C.ringEdge, 0.5);
    game.draw.circle(RING.x, RING.y, RING.r, C.ring, 1);
    var mult = Math.min(4, 1 + Math.floor(combo / 3));
    txt('x' + mult, RING.x, RING.y + 14, 40, C.gold);
    if (flashT > 0) game.draw.circle(RING.x, RING.y, RING.r + 30, flashGood ? C.good : C.bad, flashT / 0.2 * 0.5);
  }

  function drawNotes() {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.resolved || n.t < 0) continue;
      var t = Math.max(0, Math.min(1, n.t / APPROACH));
      var y = SPAWN_Y + (RING.y - SPAWN_Y) * t;
      var r = 20 + t * 20;
      if (n.card) {
        game.draw.rect(RING.x - r * 0.7, y - r, r * 1.4, r * 2, C.cardEdge, 1);
        game.draw.rect(RING.x - r * 0.5, y - r * 0.8, r, r * 1.6, C.card, 1);
      } else {
        game.draw.circle(RING.x, y, r, C.noteEdge);
        game.draw.circle(RING.x, y, r * 0.7, C.note);
      }
    }
  }

  var notes, combo, maxCombo, hits, cardsGot, roundClock, halfCalled, flashT, flashGood;
  var done, endWait, finished, ready, hitStop, shake;

  function buildNotes() {
    notes = [];
    var cardEvery = 3;
    var sinceCard = 0;
    for (var i = 0; i < NOTE_COUNT; i++) {
      sinceCard++;
      var isCard = sinceCard >= cardEvery && i > 0;
      if (isCard) sinceCard = 0;
      notes.push({ t: -i * NOTE_INTERVAL, resolved: false, card: isCard });
    }
  }

  function resolveNote(n, hitAttempted) {
    n.resolved = true;
    if (hitAttempted) {
      hits++;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      if (n.card) cardsGot++;
      flashT = 0.2; flashGood = true;
      game.feedback.good(RING.x, RING.y, { text: n.card ? 'PERFECT' : 'GOOD', color: n.card ? C.gold : C.good });
      game.fx.burst(RING.x, RING.y, { color: n.card ? C.card : C.note, count: n.card ? 22 : 12, speed: 320 });
      game.audio.play(n.card ? 'se_coin' : 'se_good', 0.3);
      hitStop = 0.1;
      if (!halfCalled && hits >= Math.ceil(NEEDED / 2)) { halfCalled = true; game.fx.popup('NICE', RING.x, RING.y - 200, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
      if (hits >= NEEDED && !finished) { ok = true; finished = true; finish(); }
    } else {
      combo = 0;
      flashT = 0.2; flashGood = false;
      game.feedback.bad(RING.x, RING.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      hitStop = 0.15; shake = 0.14;
    }
  }

  function attemptTap(x, y) {
    var d = Math.hypot(x - RING.x, y - RING.y);
    if (d > RING.r * 1.3) return;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.resolved) continue;
      if (n.t >= APPROACH * 0.55 && n.t <= APPROACH + 0.28) { resolveNote(n, true); return; }
    }
  }

  function initGame() {
    buildNotes(); combo = 0; maxCombo = 0; hits = 0; cardsGot = 0; roundClock = 0; halfCalled = false;
    flashT = 0; flashGood = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) { game.audio.play('se_tap', 0.06); attemptTap(x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: RING.x, gy: RING.y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (NOTE_INTERVAL * NOTE_COUNT + 0.8);
    if (cyc < dt || demo.t <= dt) resetDemo();
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var localT = cyc - i * NOTE_INTERVAL;
      if (localT < 0 || n.resolved) continue;
      n.t = localT;
      if (n.t >= APPROACH - 0.05 && n.t < APPROACH + 0.02) { resolveNote(n, true); demo.press = true; }
    }
    demo.gx = RING.x; demo.gy = RING.y;
    demo.press = ((cyc % NOTE_INTERVAL) > APPROACH - 0.12) && ((cyc % NOTE_INTERVAL) < APPROACH + 0.12);
  }

  game.onUpdate(function(dt) {
    if (flashT > 0) flashT -= dt;

    if (state === S.ATTRACT) {
      if (!notes) initGame();
      stepDemo(dt);
      bg();
      drawRing();
      drawNotes();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.30, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.345, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRing();
      drawNotes();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.30, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.35, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEEDED - hits) + '個!', W / 2, H * 0.39, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, cards: cardsGot, maxCombo: maxCombo });
        else game.end.failure({ hits: hits, cards: cardsGot, maxCombo: maxCombo });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        if (n.resolved) continue;
        n.t += dt;
        if (n.t > APPROACH + 0.28) resolveNote(n, false);
      }
      if (roundClock >= TIME_LIMIT && !finished) {
        ok = hits >= NEEDED;
        finished = true;
        if (!ok) game.audio.play('se_failure', 0.3);
        finish();
      }
    }

    bg();
    drawRing();
    drawNotes();
    txt(hits + ' / ' + NEEDED, W * 0.5, H * 0.065, 30, C.ink);
    var barW = W - 140;
    var pct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(70, 150, barW, 16, '#e0a4c0', 1);
    game.draw.rect(70, 150, barW * pct, 16, pct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.25], ['C5', 0.25], ['E5', 0.25], ['A5', 0.5]], { tempo: 128, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
