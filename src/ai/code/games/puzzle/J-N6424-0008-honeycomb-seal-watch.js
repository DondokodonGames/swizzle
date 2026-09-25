// J-N6424-0008-honeycomb-seal-watch.js
// ハニカム・シールウォッチ — 蜂の巣格納庫のハッチが次々ひび割れる中、割れたハッチだけを見極めて封じ続ける
// 操作: 花状に並んだ7枚のハッチのうち、ひび割れて赤く変色した1枚をタップして封鎖する
// 終わり: 規定枚数を封じ切れば成功。封鎖前にハッチが落下する(タップし損ねる)と失格
// @mechanic: spot
// @theme: hangar_hatch_watch
// 世界観: 飛行貨物庫の点検士が、蜂の巣状に並ぶハッチ群からひび割れの兆した1枚だけを瞬時に見極め、落下前に封鎖栓を打ち込み続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 封じたハッチ数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数、細線とテキスト枠のUI
  var C = {
    bg: '#0c1a14', bg2: '#08110d', frame: '#2a4a38', grid: '#173226',
    idle: '#3f8a63', idleRing: '#7fe0ab', warn: '#e0c23f', crack: '#e0453f',
    sealed: '#2a4a38', gold: '#ffd24a', good: '#7fe0ab', bad: '#ff5b52',
    ink: '#eafff2', white: '#ffffff',
  };

  var GAME_TITLE = 'HATCH WATCH';
  var NEEDED = 6;
  var TIME_LIMIT = 14;
  var TELE_T = 0.6;
  var CRACK_T0 = 1.05;
  var CX = W * 0.5, CY = H * 0.46, RAD = 250, TILE_R = 108;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [{ x: CX, y: CY }];
  for (var a = 0; a < 6; a++) {
    var ang = a * Math.PI / 3 - Math.PI / 2;
    PTS.push({ x: CX + Math.cos(ang) * RAD, y: CY + Math.sin(ang) * RAD });
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#04120a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HEX = ['..####..', '.######.', '########', '########', '.######.', '..####..'];
  var BOT = ['.####.', '######', '#.##.#', '######', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.025 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, '#7fe0ab', pulse * 0.4);
    for (var i = 0; i <= 10; i++) {
      game.draw.line(0, H * 0.2 + i * 18, W, H * 0.2 + i * 18, C.grid, 0.06);
    }
  }

  var tiles, sealed, roundClock, crackTimer, teleTimer, curIdx, goldCount, nextGap;
  var done, endWait, finished, ready, hitStop, shake, missIdx;

  function pickTarget() {
    var idle = [];
    for (var i = 0; i < tiles.length; i++) if (tiles[i] === 'idle') idle.push(i);
    if (idle.length === 0) return -1;
    return idle[Math.floor(game.random(0, idle.length))];
  }

  function initGame() {
    tiles = [];
    for (var i = 0; i < PTS.length; i++) tiles.push('idle');
    sealed = 0; roundClock = 0; goldCount = 0;
    curIdx = -1; teleTimer = 0; crackTimer = 0; nextGap = 0.35;
    done = false; endWait = 0; finished = false; missIdx = -1;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function speedFactor() {
    return Math.max(0.62, 1 - sealed * 0.055);
  }

  function tileColor(i) {
    if (tiles[i] === 'idle') return C.idle;
    if (tiles[i] === 'warn') return C.warn;
    if (tiles[i] === 'crack') return (sealed > 0 && (sealed + 1) % 3 === 0) ? C.gold : C.crack;
    return C.sealed;
  }

  function drawBoard() {
    for (var i = 0; i < PTS.length; i++) {
      var p = PTS[i];
      var bob = tiles[i] === 'sealed' ? 0 : Math.sin(game.time.elapsed * 2.4 + i) * 4;
      var scl = tiles[i] === 'crack' ? 15 : 13;
      game.draw.circle(p.x, p.y, TILE_R, C.frame, 0.6);
      game.draw.sprite(HEX, { '#': tileColor(i) }, p.x, p.y + bob, scl, { anchor: 'center' });
      if (tiles[i] === 'crack') {
        game.draw.line(p.x - 30, p.y - 26, p.x + 22, p.y + 30, C.ink, 4);
        game.draw.line(p.x + 18, p.y - 30, p.x - 24, p.y + 22, C.ink, 4);
      }
      if (tiles[i] === 'warn') {
        var ringA = 0.5 + 0.5 * Math.sin(game.time.elapsed * 14);
        game.draw.circle(p.x, p.y, TILE_R + 10, C.warn, ringA * 0.5);
      }
    }
    game.draw.sprite(BOT, { '#': C.idleRing }, W * 0.5, H * 0.86, 12, { anchor: 'center' });
  }

  function attemptSeal(x, y) {
    if (curIdx < 0) { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_tap', 0.2); return; }
    var p = PTS[curIdx];
    if (game.hit.circle(x, y, 46, p.x, p.y, TILE_R) && tiles[curIdx] === 'crack') {
      tiles[curIdx] = 'sealed'; sealed++;
      var isGold = sealed % 3 === 0;
      game.feedback.good(p.x, p.y, { text: isGold ? 'NICE' : 'GOOD', color: isGold ? C.gold : C.good });
      game.audio.play(isGold ? 'se_powerup' : 'se_milestone', 0.35);
      if (isGold) game.fx.popup('NICE', p.x, p.y - 130, { color: C.gold, size: 34 });
      curIdx = -1; nextGap = 0.3 + game.random(0, 0.2);
      if (sealed >= NEEDED) {
        ok = true; finished = true; hitStop = 0.25;
        game.fx.burst(p.x, p.y, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) attemptSeal(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepRound(dt) {
    roundClock += dt;
    if (roundClock >= TIME_LIMIT && curIdx < 0) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (curIdx < 0) {
      nextGap -= dt;
      if (nextGap <= 0) {
        curIdx = pickTarget();
        if (curIdx >= 0) { tiles[curIdx] = 'warn'; teleTimer = TELE_T; game.audio.play('se_tap', 0.12); }
      }
      return;
    }
    if (tiles[curIdx] === 'warn') {
      teleTimer -= dt;
      if (teleTimer <= 0) {
        tiles[curIdx] = 'crack';
        crackTimer = CRACK_T0 * speedFactor();
        game.audio.play('se_break', 0.3);
      }
      return;
    }
    if (tiles[curIdx] === 'crack') {
      crackTimer -= dt;
      if (crackTimer <= 0) {
        missIdx = curIdx;
        var p = PTS[curIdx];
        ok = false; finished = true; hitStop = 0.35; shake = 0.3;
        tiles[curIdx] = 'sealed';
        game.feedback.bad(p.x, p.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.45);
        finish();
      }
    }
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepRound(dt);
    if (curIdx >= 0 && tiles[curIdx] === 'crack') {
      var p = PTS[curIdx];
      demo.gx = p.x; demo.gy = p.y;
      if (crackTimer < CRACK_T0 * speedFactor() * 0.45 && !demo.press) {
        demo.press = true;
        attemptSeal(p.x, p.y);
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tiles) initGame();
      bg();
      stepDemo(dt);
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(sealed + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEEDED - sealed) + '枚!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(sealed, { sealed: sealed, needed: NEEDED });
        else game.end.failure({ sealed: sealed, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();
    txt(sealed + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var barW = W - 120;
    var lowTime = roundClock > TIME_LIMIT - 3;
    game.draw.rect(60, 150, barW, 16, C.frame, 1);
    game.draw.rect(60, 150, barW * Math.max(0, 1 - roundClock / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
