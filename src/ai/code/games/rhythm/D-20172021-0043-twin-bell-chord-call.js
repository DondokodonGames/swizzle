// D-20172021-0043-twin-bell-chord-call.js
// ツインベルコードコール — 対になる大鐘を両手で同時に打ち鳴らし、迫る二重の音符に合わせて楽曲を紡ぐ
// 操作: 左右に並ぶ鐘の真下を、2本の指で同時にタップして和音を鳴らす
// 終わり: 規定数の和音を合わせられれば成功。合わせられないまま曲が終われば失敗
// @mechanic: pinch_zone
// @theme: twin_bell_chord_call
// 世界観: 鐘楼を任された見習いの鐘突き師が、両手の綱を同時に引いて対の大鐘を打ち鳴らし、降ってくる二重の音符に息を合わせて楽曲を完成させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせた和音数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢ボタン、gradient で厚みを作る
  var C = {
    wood1: '#5a3520', wood2: '#3a2214', felt: '#7a2020', feltDark: '#4a1010',
    bronze: '#c99a4a', bronzeDark: '#8a6428', bronzeLight: '#ffe0a0',
    good: '#39e07a', bad: '#ff4d5e', gold: '#ffd54a', ink: '#241408', white: '#fff2d8',
  };

  var GAME_TITLE = 'TWIN BELL';
  var NOTE_COUNT = 6;
  var NOTE_INTERVAL = 1.15;
  var APPROACH = 1.0;
  var TIME_LIMIT = NOTE_COUNT * NOTE_INTERVAL + 1.3;
  var NEEDED = 4;
  var BELL_L = { x: W * 0.30, y: H * 0.80, r: 130 };
  var BELL_R = { x: W * 0.70, y: H * 0.80, r: 130 };
  var SPAWN_Y = H * 0.24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RINGER = ['.#.#.', '#####', '.###.', '#.#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.wood1], [1, C.wood2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 8; i++) game.draw.rect(0, i * (H / 8), W, 3, C.wood2, 0.3);
    game.draw.sprite(RINGER, { '#': C.bronzeLight }, W * 0.5, H * 0.14, 12, { anchor: 'center' });
  }

  function drawBell(b, hot, lastHit) {
    game.draw.circle(b.x, b.y + 14, b.r * 0.95, C.feltDark, 0.6);
    game.draw.circle(b.x, b.y, b.r, hot ? C.bronzeLight : C.bronze, 1);
    game.draw.circle(b.x, b.y, b.r * 0.7, hot ? C.bronze : C.bronzeDark, 1);
    game.draw.circle(b.x, b.y, b.r * 0.35, C.bronzeLight, hot ? 0.9 : 0.5);
    if (lastHit === 'good') game.draw.circle(b.x, b.y, b.r * 1.15, C.good, 0.25);
    if (lastHit === 'bad') game.draw.circle(b.x, b.y, b.r * 1.15, C.bad, 0.25);
  }

  function railX(side) { return side === 'L' ? BELL_L.x : BELL_R.x; }

  function drawNotes() {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.resolved) continue;
      var t = Math.min(1, n.t / APPROACH);
      var y = SPAWN_Y + (BELL_L.y - SPAWN_Y) * t;
      game.draw.line(BELL_L.x, SPAWN_Y - 20, BELL_L.x, BELL_L.y, C.feltDark, 6);
      game.draw.line(BELL_R.x, SPAWN_Y - 20, BELL_R.x, BELL_R.y, C.feltDark, 6);
      game.draw.circle(BELL_L.x, y, 26, C.gold);
      game.draw.circle(BELL_R.x, y, 26, C.gold);
    }
  }

  var notes, noteIdx, combo, hits, roundClock, halfCalled, lastHitL, lastHitR, hitFlashT;
  var done, endWait, finished, ready, hitStop, shake;

  function buildNotes() {
    notes = [];
    for (var i = 0; i < NOTE_COUNT; i++) notes.push({ t: -i * NOTE_INTERVAL, resolved: false });
  }

  function resolveNote(n, touchesNow) {
    n.resolved = true;
    var hasL = false, hasR = false;
    for (var i = 0; i < touchesNow.length; i++) {
      var tx = touchesNow[i].x, ty = touchesNow[i].y;
      if (Math.hypot(tx - BELL_L.x, ty - BELL_L.y) <= BELL_L.r * 1.15) hasL = true;
      if (Math.hypot(tx - BELL_R.x, ty - BELL_R.y) <= BELL_R.r * 1.15) hasR = true;
    }
    if (hasL && hasR) {
      hits++; combo++;
      lastHitL = 'good'; lastHitR = 'good'; hitFlashT = 0.18;
      game.feedback.good(W * 0.5, H * 0.6, { text: combo >= 3 ? 'PERFECT' : 'GOOD', color: C.good });
      game.fx.burst(BELL_L.x, BELL_L.y, { color: C.gold, count: 12, speed: 300 });
      game.fx.burst(BELL_R.x, BELL_R.y, { color: C.gold, count: 12, speed: 300 });
      game.audio.play('se_good', 0.3);
      hitStop = 0.1;
      if (!halfCalled && hits >= Math.ceil(NEEDED / 2)) { halfCalled = true; game.fx.popup('NICE', W * 0.5, H * 0.35, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
      if (hits >= NEEDED && !finished) { ok = true; finished = true; finish(); }
    } else {
      combo = 0;
      lastHitL = 'bad'; lastHitR = 'bad'; hitFlashT = 0.18;
      game.feedback.bad(W * 0.5, H * 0.6, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      hitStop = 0.15;
      shake = 0.15;
    }
  }

  function initGame() {
    buildNotes(); noteIdx = 0; combo = 0; hits = 0; roundClock = 0; halfCalled = false;
    lastHitL = null; lastHitR = null; hitFlashT = 0;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0) return;
    game.audio.play('se_tap', 0.05);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BELL_L.x, gy: BELL_L.y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (NOTE_INTERVAL * 2 + 0.6);
    if (cyc < dt || demo.t <= dt) resetDemo();
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var localT = cyc - i * NOTE_INTERVAL;
      if (localT >= 0 && !n.resolved) {
        n.t = localT;
        if (n.t >= APPROACH) resolveNote(n, [{ x: BELL_L.x, y: BELL_L.y }, { x: BELL_R.x, y: BELL_R.y }]);
      }
    }
    var cur = notes[Math.min(notes.length - 1, Math.floor(cyc / NOTE_INTERVAL))];
    var withinBeat = cyc % NOTE_INTERVAL;
    demo.press = withinBeat > APPROACH - 0.25 && withinBeat < APPROACH + 0.1;
  }

  game.onUpdate(function(dt) {
    if (hitFlashT > 0) { hitFlashT -= dt; if (hitFlashT <= 0) { lastHitL = null; lastHitR = null; } }

    if (state === S.ATTRACT) {
      if (!notes) initGame();
      stepDemo(dt);
      bg();
      drawBell(BELL_L, demo.press, lastHitL);
      drawBell(BELL_R, demo.press, lastHitR);
      drawNotes();
      game.draw.hand(BELL_L.x - 30, demo.press ? BELL_L.y : BELL_L.y - 60, { press: demo.press, scale: 13 });
      game.draw.hand(BELL_R.x + 30, demo.press ? BELL_R.y : BELL_R.y - 60, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.30, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.34, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBell(BELL_L, false, lastHitL);
      drawBell(BELL_R, false, lastHitR);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.30, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.36, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEEDED - hits) + '打!', W / 2, H * 0.41, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    var shakeX = 0;
    if (shake > 0) { shake -= dt; shakeX = (Math.random() - 0.5) * 14 * shake; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, needed: NEEDED });
        else game.end.failure({ hits: hits, needed: NEEDED });
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
        if (n.t >= APPROACH) resolveNote(n, game.touches || []);
      }
      if (roundClock >= TIME_LIMIT && !finished) {
        ok = hits >= NEEDED;
        finished = true;
        if (!ok) { game.audio.play('se_failure', 0.3); }
        finish();
      }
    }

    bg();
    drawBell(BELL_L, false, lastHitL);
    drawBell(BELL_R, false, lastHitR);
    drawNotes();

    txt(hits + ' / ' + NEEDED, W * 0.5, H * 0.065, 32, C.white);
    var barW = W - 140;
    var pct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(70, 150, barW, 16, '#3a2214', 1);
    game.draw.rect(70, 150, barW * pct, 16, pct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.4], ['G3', 0.4], ['C4', 0.4], ['G3', 0.4]], { tempo: 96, wave: 'triangle', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
