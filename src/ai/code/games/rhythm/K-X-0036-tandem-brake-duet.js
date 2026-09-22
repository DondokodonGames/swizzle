// K-X-0036-tandem-brake-duet.js
// タンデムブレーキデュエット — 画面上下で二人一組、伸びてくる光る綱を分担してタップする
// 操作: 画面上半分は上のプレイヤー、下半分は下のプレイヤーが担当。自分側に来た光点をタップする
// 終わり: 二人合わせて規定10点を取れれば成功。どちらかが3回外せば失敗
// @mechanic: coop_2zone
// @theme: tandem_cable_brakemen
// 世界観: 山あいのケーブルカーを操る二人一組の制動手。上下に分かれ、共有する光る制動綱の合図を分担してタップし速度を合わせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 二人合計のヒット数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: くっきりした縁取り+平坦な2階調シェード、明るい配色
  var C = {
    bg: '#1a2a3a', bg2: '#24384c', mid: '#0f1c28', rope: '#4a6a80',
    top: '#ff9d4d', bot: '#4dc8ff',
    good: '#39ff6a', bad: '#ff4455', gold: '#ffe066', white: '#ffffff', ink: '#04080c',
  };

  var GAME_TITLE = 'TANDEM DUET';
  var TARGET_SCORE = 10;
  var MAX_MISS = 3;
  var CX = W * 0.5;
  var MIDY = H * 0.5;
  var TOP_JUDGE = H * 0.30, BOT_JUDGE = H * 0.70;
  var SPAWN_OFFSET = 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var score, missTop, missBot, done, endWait, finished, notes, round, spawnT, spawnDur;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAR_TOP = ['.####.', '######', '.####.'];
  var CAR_BOT = ['.####.', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, MIDY - 6, W, 12, C.mid);
    game.draw.line(0, TOP_JUDGE, W, TOP_JUDGE, C.gold, 4);
    game.draw.line(0, BOT_JUDGE, W, BOT_JUDGE, C.gold, 4);
    var bobT = Math.sin(game.time.elapsed * 2.2) * 6;
    var bobB = Math.cos(game.time.elapsed * 2.1) * 6;
    game.draw.sprite(CAR_TOP, { '#': C.top }, W * 0.12, H * 0.14 + bobT, 16, { anchor: 'center' });
    game.draw.sprite(CAR_BOT, { '#': C.bot }, W * 0.12, H * 0.86 + bobB, 16, { anchor: 'center' });
  }

  function newNote(lane, dur) {
    return { lane: lane, t: 0, dur: dur, resolved: false, x: game.random(W * 0.25, W * 0.85) };
  }

  function initGame() {
    score = 0; missTop = 0; missBot = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; spawnDur = 1.1;
    notes = [newNote('top', spawnDur), newNote('bot', spawnDur + 0.5)];
  }

  function judgeY(lane) { return lane === 'top' ? TOP_JUDGE : BOT_JUDGE; }

  function resolveTap(x, y, lane) {
    var best = null, bestDist = 1e9;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.resolved || n.lane !== lane) continue;
      var ny = judgeY(n.lane);
      var p = n.t / n.dur;
      var cy = ny; // ノーツは判定線上を左右に流れず、時間経過で出現→判定の輝度が変化する方式
      var d = Math.abs(y - ny) + Math.abs(x - n.x);
      if (d < bestDist) { bestDist = d; best = n; }
    }
    if (!best) return;
    var pr = best.t / best.dur;
    var ny2 = judgeY(best.lane);
    if (pr >= 0.55 && pr <= 0.95) {
      best.resolved = true;
      score++;
      hitStop = 0.08;
      game.feedback.good(best.x, ny2, { text: 'GOOD', color: C.good });
      game.fx.burst(best.x, ny2, { color: C.gold, count: 12, speed: 280 });
      game.audio.play('se_good', 0.3);
      if (score === Math.ceil(TARGET_SCORE / 2)) game.fx.popup('HALFWAY!', CX, MIDY, { color: C.gold, size: 40 });
      notes.splice(notes.indexOf(best), 1);
      round++;
      spawnDur = Math.max(0.7, spawnDur - 0.02);
      notes.push(newNote(best.lane, spawnDur));
      if (score >= TARGET_SCORE) { ok = true; finished = true; finish(); }
    } else {
      registerMiss(best.lane, best, ny2);
    }
  }

  function registerMiss(lane, n, ny) {
    if (n) { n.resolved = true; notes.splice(notes.indexOf(n), 1); }
    if (lane === 'top') missTop++; else missBot++;
    hitStop = 0.2; shake = 0.15;
    game.feedback.bad(n ? n.x : CX, ny, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    if (missTop >= MAX_MISS || missBot >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    round++;
    spawnDur = Math.max(0.7, spawnDur - 0.01);
    notes.push(newNote(lane, spawnDur));
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (ready > 0 || done || finished) return;
      game.audio.play('se_tap', 0.06);
      var lane = y < MIDY ? 'top' : 'bot';
      resolveTap(x, y, lane);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawNotes() {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var ny = judgeY(n.lane);
      var p = n.t / n.dur;
      if (p > 0.4) {
        var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
        if (blink) game.draw.circle(n.x, ny, 40, C.gold, 0.35);
      }
      var glow = p >= 0.55 && p <= 0.95 ? (0.6 + 0.3 * Math.sin(game.time.elapsed * 16)) : 0.3;
      game.draw.circle(n.x, ny, 24, n.lane === 'top' ? C.top : C.bot, glow + 0.2);
      game.draw.circle(n.x, ny, 14, C.white, 0.8);
    }
  }

  var demo = { t: 0, gx: CX, gy: TOP_JUDGE, press: false, n: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.n) { demo.n = newNote(Math.floor(demo.t / 1.6) % 2 === 0 ? 'top' : 'bot', 1.0); demo.n.x = CX; }
    demo.n.t += dt;
    notes = [demo.n];
    var ny = judgeY(demo.n.lane);
    var p = demo.n.t / demo.n.dur;
    demo.gx = demo.n.x; demo.gy = ny;
    if (p > 0.55 && p < 0.7 && !demo.n.telegraphed) {
      demo.n.telegraphed = true; demo.press = true;
      game.feedback.good(demo.n.x, ny, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      demo.n.t = demo.n.dur;
    }
    if (demo.n.t >= demo.n.dur) { demo.n = null; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawNotes();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, MIDY - 30, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, MIDY + 44, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, MIDY + 44, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(score + ' / ' + TARGET_SCORE, W / 2, MIDY - 20, 30, C.gold);
      if (!ok) txt('あと' + (TARGET_SCORE - score) + '点!', W / 2, MIDY + 20, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, MIDY + 60, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score * 10, { score: score, missTop: missTop, missBot: missBot });
        else game.end.failure({ score: score, missTop: missTop, missBot: missBot });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      for (var i = notes.length - 1; i >= 0; i--) {
        var n = notes[i];
        n.t += dt;
        if (n.t > n.dur && !n.resolved) {
          var ny = judgeY(n.lane);
          registerMiss(n.lane, n, ny);
          if (finished) break;
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawNotes();

    txt(score + ' / ' + TARGET_SCORE, W / 2, H * 0.06, 30, C.white);
    txt('MISS ' + missTop, W * 0.85, H * 0.14, 22, C.top);
    txt('MISS ' + missBot, W * 0.85, H * 0.86, 22, C.bot);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, MIDY, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.3], ['A3', 0.3], ['C4', 0.3], ['F4', 0.6]], { tempo: 128, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
