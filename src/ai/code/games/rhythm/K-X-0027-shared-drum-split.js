// K-X-0027-shared-drum-split.js
// シェアードドラムスプリット — 隣同士で分担する一つの大太鼓を、光った側だけ叩き分ける
// 操作: 大太鼓の左右どちらかが光って膨らみきった瞬間、光った側をタップして打つ
// 終わり: 規定打数(10打)を叩き切れば成功。3回外せば失敗
// @mechanic: alternate_tap
// @theme: shared_drum_split
// 世界観: 祭り櫓の大太鼓を隣同士で分担する打ち手。太鼓は一つだが受け持ちは左右で分かれており、光った側の音符だけを自分の持ち場として打ち抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 打てた回数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: くすんだ質感、強いドロップシャドウ、少数の階調
  var C = {
    bg: '#2a1f16', bg2: '#160f0a', drum: '#5c3a22', drumEdge: '#2f1c10',
    hotL: '#ff8a3d', hotR: '#3dc9ff', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#f4ece0', ink: '#0a0603',
  };

  var GAME_TITLE = 'SPLIT DRUM';
  var TOTAL = 10;
  var MISS_LIMIT = 3;
  var LX = W * 0.28, RXp = W * 0.72, DY = H * 0.50;
  var DURS_BASE = 1.15;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var seq, round, hits, misses, beatT, resolved, score;
  var done, endWait, finished, ready, hitStop, shake, flashSide;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRUMMER = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.3, W, 8, '#00000030');
  }

  function beatDur(i) { return Math.max(0.75, DURS_BASE - i * 0.035); }

  function buildSeq() {
    seq = [];
    var last = null, run = 0;
    for (var i = 0; i < TOTAL; i++) {
      var side = Math.random() < 0.5 ? 'L' : 'R';
      if (side === last) { run++; if (run >= 2) { side = side === 'L' ? 'R' : 'L'; run = 0; } } else { run = 0; }
      seq.push(side); last = side;
    }
  }

  function drawDrum(litSide, hot) {
    game.draw.circle(LX, DY, 150, litSide === 'L' && hot ? C.white : (litSide === 'L' ? C.hotL : C.drum));
    game.draw.circle(LX, DY, 150, C.drumEdge, 0);
    game.draw.circle(RXp, DY, 150, litSide === 'R' && hot ? C.white : (litSide === 'R' ? C.hotR : C.drum));
    game.draw.circle(RXp, DY, 150, C.drumEdge, 0);
    game.draw.rect(W * 0.5 - 4, DY - 150, 8, 300, C.drumEdge);
    game.draw.sprite(DRUMMER, { '#': C.hotL }, LX, H * 0.85, 16, { anchor: 'center' });
    game.draw.sprite(DRUMMER, { '#': C.hotR }, RXp, H * 0.85, 16, { anchor: 'center' });
  }

  function initGame() {
    buildSeq(); round = 0; hits = 0; misses = 0; beatT = 0; resolved = false; score = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashSide = 0;
  }

  function resolveTap(x) {
    if (state !== S.PLAYING || ready > 0 || done || finished || resolved) return;
    resolved = true;
    var side = x < W * 0.5 ? 'L' : 'R';
    var dur = beatDur(round);
    var ratio = beatT / dur;
    var wantSide = seq[round];
    var px = wantSide === 'L' ? LX : RXp;
    if (side === wantSide && ratio >= 0.8 && ratio <= 1.25) {
      hits++; score += 100; flashSide = 0.15; hitStop = 0.08;
      game.feedback.good(px, DY, { text: ratio >= 0.9 && ratio <= 1.1 ? 'PERFECT' : 'GOOD', color: C.gold });
      if (hits === Math.ceil(TOTAL / 2)) { game.fx.popup('HALFWAY!', W / 2, DY - 220, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.4); }
    } else {
      misses++; hitStop = 0.25; shake = 0.2;
      game.feedback.bad(px, DY, { text: 'MISS' });
    }
    advance();
  }

  function advance() {
    round++;
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    if (round >= TOTAL) { ok = true; finished = true; finish(); return; }
    beatT = 0; resolved = false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); resolveTap(x); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LX, gy: DY, press: false, side: 'L', did: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.7;
    if (cyc < dt || demo.t <= dt) { demo.side = demo.side === 'L' ? 'R' : 'L'; beatT = 0; demo.did = false; }
    beatT = cyc;
    var px = demo.side === 'L' ? LX : RXp;
    demo.gx = px + Math.sin(game.time.elapsed * 2.4) * 10;
    demo.gy = DY + Math.cos(game.time.elapsed * 2.0) * 8;
    var ratio = cyc / 1.5;
    demo.press = ratio > 0.85 && ratio < 1.0;
    if (demo.press && !demo.did) { demo.did = true; flashSide = 0.15; game.feedback.good(px, DY, { text: 'PERFECT', color: C.gold, sound: 'se_good', volume: 0.2 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDrum(demo.side, flashSide > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDrum(null, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (MISS_LIMIT - misses) + '!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      var dur = beatDur(round);
      if (beatT / dur > 1.35 && !resolved) {
        resolved = true; misses++; hitStop = 0.25; shake = 0.2;
        var wantSide = seq[round];
        game.feedback.bad(wantSide === 'L' ? LX : RXp, DY, { text: 'MISS' });
        advance();
      }
    }
    if (flashSide > 0) flashSide -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawDrum(finished ? null : seq[round], flashSide > 0);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.58, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.2], ['G3', 0.2], ['D4', 0.2], ['G4', 0.4]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
