// K-X-0022-ensemble-part-cue.js
// アンサンブルパートキュー — 合奏の中、自分の担当パートに流れてくる音符を判定ラインで打つ
// 操作: 上から降りてくる音符が判定ラインに重なった瞬間にタップする
// 終わり: 規定音符数(9個)を打ち切れば成功。3回外せば失敗
// @mechanic: rhythm
// @theme: ensemble_solo_part
// 世界観: 合奏の輪の中、自分の持ち場に立つ演奏者。他の奏者は自動で音を刻み続け、自分は流れてくる自分のパートの音符だけを判定ラインで打つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 打てた音符数とPERFECT数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 限定パレット、大きいドット、くっきりした縁取り
  var C = {
    bg: '#132022', bg2: '#0a1214', lane: '#1e3436', laneEdge: '#2f5254',
    note: '#ffd23f', accent: '#3fd6ff', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#eaf7f6', ink: '#040a0a',
  };

  var GAME_TITLE = 'PART CUE';
  var TOTAL = 9;
  var MISS_LIMIT = 3;
  var LINE_Y = H * 0.74;
  var SPAWN_Y = H * 0.24;
  var CX = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, misses, perfects, combo, fever, round, note, score;
  var done, endWait, finished, ready, hitStop, shake, flashLine;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER = ['.##.', '####', '.##.', '####', '#..#'];
  var BACKUP = ['.##.', '####', '.##.'];

  function newNote() {
    return { t: 0, dur: 1.0, resolved: false };
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, '#ffffff06');
    if (fever > 0) game.draw.rect(0, 0, W, H, C.gold, 0.05 + Math.sin(game.time.elapsed * 10) * 0.02);
  }

  function drawBackup() {
    var bob1 = Math.sin(game.time.elapsed * 2.4) * 8;
    var bob2 = Math.cos(game.time.elapsed * 2.0) * 8;
    game.draw.sprite(BACKUP, { '#': C.accent }, W * 0.2, H * 0.3 + bob1, 14, { anchor: 'center', alpha: 0.55 });
    game.draw.sprite(BACKUP, { '#': C.accent }, W * 0.8, H * 0.32 + bob2, 14, { anchor: 'center', alpha: 0.55 });
  }

  function drawLane() {
    game.draw.rect(CX - 140, SPAWN_Y - 40, 280, LINE_Y - SPAWN_Y + 80, C.lane, 0.5);
    game.draw.rect(CX - 150, LINE_Y - 8, 300, 16, flashLine > 0 ? C.white : C.laneEdge);
  }

  function drawNote(n) {
    if (!n) return;
    var p = Math.min(1.3, n.t / n.dur);
    var y = SPAWN_Y + (LINE_Y - SPAWN_Y) * p;
    game.draw.circle(CX, y, 40, C.note);
    game.draw.circle(CX, y, 40, C.ink, 0);
  }

  function initGame() {
    hits = 0; misses = 0; perfects = 0; combo = 0; fever = 0; round = 0; score = 0;
    note = newNote();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashLine = 0;
  }

  function resolveHit() {
    if (state !== S.PLAYING || ready > 0 || done || finished || !note || note.resolved) return;
    note.resolved = true;
    var ratio = note.t / note.dur;
    if (ratio >= 0.88 && ratio <= 1.12) {
      hits++; perfects++; combo++; score += 100 + combo * 5;
      flashLine = 0.15; hitStop = 0.08;
      game.feedback.good(CX, LINE_Y, { text: 'PERFECT', color: C.gold });
      if (combo === 5) { fever = 2.5; game.fx.popup('FEVER!', CX, LINE_Y - 300, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
    } else if (ratio >= 0.65 && ratio <= 1.3) {
      hits++; combo++; score += 50 + combo * 3;
      flashLine = 0.1; hitStop = 0.06;
      game.feedback.good(CX, LINE_Y, { text: 'GOOD', color: C.good });
    } else {
      misses++; combo = 0;
      hitStop = 0.25; shake = 0.2;
      game.feedback.bad(CX, LINE_Y, { text: 'MISS' });
    }
    advance();
  }

  function advance() {
    round++;
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    if (round >= TOTAL) { ok = true; finished = true; finish(); return; }
    note = newNote();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); resolveHit(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: LINE_Y, press: false, n: null, did: false };
  function stepDemo(dt) {
    demo.t += dt;
    var dur = 1.9;
    var cyc = demo.t % dur;
    if (cyc < dt || demo.t <= dt) { demo.n = newNote(); demo.n.dur = 1.6; demo.did = false; }
    demo.n.t += dt;
    note = demo.n;
    demo.gx = CX + Math.sin(game.time.elapsed * 2.4) * 12;
    demo.gy = LINE_Y + Math.cos(game.time.elapsed * 2.0) * 8;
    var ratio = demo.n.t / demo.n.dur;
    demo.press = ratio > 0.85 && ratio < 1.0;
    if (demo.press && !demo.did) {
      demo.did = true;
      game.feedback.good(CX, LINE_Y, { text: 'PERFECT', color: C.gold, sound: 'se_good', volume: 0.2 });
      flashLine = 0.15;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBackup();
      drawLane();
      drawNote(note);
      game.draw.sprite(PLAYER, { '#': C.accent }, CX, H * 0.86, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBackup();
      drawLane();
      game.draw.sprite(PLAYER, { '#': ok ? C.good : C.bad }, CX, H * 0.86, 20, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      txt('PERFECT ' + perfects, W / 2, H * 0.18, 22, C.white);
      if (!ok) txt('あと' + (MISS_LIMIT - misses) + '!', W / 2, H * 0.23, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { hits: hits, perfects: perfects, total: TOTAL });
        else game.end.failure({ hits: hits, perfects: perfects, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      note.t += dt;
      if (note.t / note.dur > 1.35 && !note.resolved) {
        note.resolved = true;
        misses++; combo = 0;
        hitStop = 0.25; shake = 0.2;
        game.feedback.bad(CX, LINE_Y, { text: 'MISS' });
        advance();
      }
    }
    if (fever > 0) fever -= dt;
    if (flashLine > 0) flashLine -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawBackup();
    drawLane();
    if (!finished) drawNote(note);
    game.draw.sprite(PLAYER, { '#': C.accent }, CX, H * 0.86, 20, { anchor: 'center' });

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.25]], { tempo: 160, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
