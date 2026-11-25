// GH-PSP-0003-card-compare-judge.js
// カードジャッジ — 2枚の数字札から強い方を瞬時にタップ。冠つきの1だけは別格の最強札
// 操作: 左右どちらかの札をタップ。数字は大きい方が勝ちだが、冠のついた1の札だけはどんな数字にも勝つ
// 終わり: 規定回数正しく選べば成功。2回外せば失敗
// @mechanic: size_judge
// @theme: card_duel_table
// 世界観: 灯りの落ちた賭け卓。めくられた2枚の札のうち強い方を瞬時に見抜く。数字は大きいほど強いが、冠のついた1の札だけはどんな大きな数字にも勝つ下克上の一枚
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解数 + 最速判定
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // PIXEL HD: 多色+光。パララックス3層、光源1つで陰影統一、細かいアニメ
  var C = {
    bg1: '#241a3a', bg2: '#120c22', felt: '#2e2050', feltLine: '#4a3878',
    cardBg: '#f0e6d0', cardEdge: '#8a7550', pip: '#2a2020',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd400', star: '#ffe98a', white: '#f4f0ff', ink: '#100a1a',
  };

  var GAME_TITLE = 'CARD JUDGE';
  var NEEDED = 5, MISS_LIMIT = 2;
  var LX = W * 0.28, RX = W * 0.72, CY = H * 0.42;
  var CARD_W = 300, CARD_H = 420;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var correct, misses, roundN, decideMax, decideT;
  var cards, judged, winnerSide, revealFlash;
  var done, endWait, finished, mood;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function tableBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.circle(W / 2, H * 0.10, 260, '#ffffff', 0.04);
    game.draw.rect(0, H * 0.28, W, H * 0.46, C.felt);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * 0.30 + i * 44, W, H * 0.30 + i * 44, C.feltLine, 1);
  }

  var STAR_SPRITE = ['..#..', '.###.', '#####', '.###.', '#.#.#'];
  var CROWN_SPRITE = ['#.#.#', '#####', '.###.'];
  var JUDGE_SPRITE = { idle: ['.###.', '#.#.#', '#####'], happy: ['.###.', '#...#', '.###.'], sad: ['.###.', '#.#.#', '..#..'] };

  function newRound() {
    var a, b;
    do { a = 1 + Math.floor(Math.random() * 9); b = 1 + Math.floor(Math.random() * 9); } while (a === b);
    var goldenChance = roundN >= 2 ? 0.22 : 0;
    var goldenSide = Math.random() < goldenChance ? (Math.random() < 0.5 ? 'L' : 'R') : null;
    cards = { L: { v: a, golden: goldenSide === 'L' }, R: { v: b, golden: goldenSide === 'R' } };
    var winner;
    if (goldenSide) winner = goldenSide;
    else if (a === 1 || b === 1) winner = a === 1 ? 'L' : 'R';
    else winner = a > b ? 'L' : 'R';
    winnerSide = winner;
    judged = false; revealFlash = 0.15;
    decideT = decideMax;
  }

  function initGame() {
    correct = 0; misses = 0; roundN = 0; decideMax = 1.35; mood = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function drawCard(side, x) {
    var c = cards[side];
    var scale = judged && side === winnerSide ? 1.12 : 1;
    var w = CARD_W * scale, h = CARD_H * scale;
    game.draw.rect(x - w / 2 + 6, CY - h / 2 + 10, w, h, '#000000', 0.3);
    game.draw.rect(x - w / 2, CY - h / 2, w, h, judged && side !== winnerSide && judged ? '#8a7a70' : C.cardBg);
    game.draw.rect(x - w / 2 + 10, CY - h / 2 + 10, w - 20, h - 20, 'transparent', 0);
    game.draw.line(x - w / 2 + 14, CY - h / 2 + 14, x + w / 2 - 14, CY - h / 2 + 14, C.cardEdge, 4);
    txt(String(c.v), x, CY + 34 * scale, 120 * scale, c.golden ? C.gold : C.pip);
    if (c.v === 1) game.draw.sprite(CROWN_SPRITE, { '#': C.gold }, x, CY - h / 2 + 70 * scale, 12 * scale, { anchor: 'center' });
    if (c.golden) game.draw.sprite(STAR_SPRITE, { '#': C.star }, x, CY + h / 2 - 60 * scale, 10 * scale, { anchor: 'center' });
    if (judged && side === winnerSide) game.draw.circle(x, CY, w * 0.7, C.gold, 0.18);
  }

  function pick(side) {
    if (done || ready > 0 || hitStop > 0 || finished || judged) return;
    judged = true;
    hitStop = 0.16;
    var win = side === winnerSide;
    var px = side === 'L' ? LX : RX;
    if (win) {
      correct++; mood = 1;
      game.feedback.good(px, CY, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (correct % 2 === 0) { game.fx.popup(correct + ' / ' + NEEDED, W / 2, H * 0.16, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.35); }
      if (correct >= NEEDED) { ok = true; finished = true; game.fx.burst(px, CY, { color: C.gold, count: 22, speed: 400 }); game.audio.play('se_success', 0.5); finish(); return; }
    } else {
      misses++; mood = -1;
      game.feedback.bad(px, CY, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.4);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    }
    roundN++;
    decideMax = Math.max(0.75, 1.35 - roundN * 0.07);
    game.audio.tone(520, 0.05, { wave: 'square', volume: 0.05 });
  }

  function timeoutMiss() {
    misses++; mood = -1; judged = true;
    game.feedback.bad(W / 2, CY, { text: 'MISS' });
    shake = 0.16;
    game.audio.play('se_bad', 0.3);
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
    roundN++;
    decideMax = Math.max(0.75, 1.35 - roundN * 0.07);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    pick(x < W / 2 ? 'L' : 'R');
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawJudge() {
    var spr = mood > 0.3 ? JUDGE_SPRITE.happy : mood < -0.3 ? JUDGE_SPRITE.sad : JUDGE_SPRITE.idle;
    game.draw.circle(W / 2, H * 0.20, 60, C.felt);
    game.draw.sprite(spr, { '#': C.white }, W / 2, H * 0.195, 9, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LX, gy: CY, press: false, wait: 0.5 };
  function stepDemo(dt) {
    demo.t += dt;
    if (cards === undefined) initGame();
    if (!judged) {
      var tx = winnerSide === 'L' ? LX : RX;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 5);
      demo.wait -= dt;
      demo.press = demo.wait < 0.25 && demo.wait > 0.05;
      if (demo.press && !demo.did) { demo.did = true; pick(winnerSide); }
    } else {
      demo.did = false;
      demo.wait -= dt;
      if (demo.wait < -0.7) { newRound(); demo.wait = 0.8; demo.gx = LX; demo.gy = CY; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      tableBg();
      stepDemo(dt);
      drawCard('L', LX); drawCard('R', RX);
      drawJudge();
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      tableBg();
      drawCard('L', LX); drawCard('R', RX);
      drawJudge();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 50, ok ? C.good : C.bad);
      txt(correct + ' / ' + NEEDED, W / 2, H * 0.105, 30, C.gold);
      if (!ok && correct >= NEEDED - 1) txt('あと1問!', W / 2, H * 0.15, 26, C.bad);
      if (correct > game.best && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.19, 30, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { correct: correct, misses: misses };
        if (ok) game.end.success(correct, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!judged) {
        decideT -= dt;
        if (decideT <= 0) timeoutMiss();
      } else if (revealFlash > 0) {
        revealFlash -= dt;
        if (revealFlash <= 0) newRound();
      }
    }
    if (shake > 0) shake -= dt;
    if (mood !== 0) mood *= Math.max(0, 1 - dt * 2.2);

    tableBg();
    drawCard('L', LX); drawCard('R', RX);
    drawJudge();

    txt(correct + ' / ' + NEEDED, W / 2, H * 0.06, 32, C.white);
    if (!judged && !finished) {
      var frac = Math.max(0, decideT / decideMax);
      game.draw.rect(140, H * 0.90, W - 280, 20, C.ink, 0.5);
      game.draw.rect(140, H * 0.90, (W - 280) * frac, 20, frac < 0.3 ? C.bad : C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.80, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['A4', 0.15], ['C5', 0.15], ['E5', 0.15], ['A5', 0.3], ['R', 0.2]],
      { tempo: 140, wave: 'square', volume: 0.06, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
