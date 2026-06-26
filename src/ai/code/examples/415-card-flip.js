// 415-card-flip.js
// カードめくり — 数字カードを順番にめくって昇順に並べる
// 操作: カードをタップしてめくる、数字を記憶して昇順にタップ
// 成功: 3セット完璧に  失敗: 3回間違える or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060412',
    table:  '#1a0f30',
    tableHi:'#2d1a50',
    cardBack:'#312e81',
    cardBackHi:'#4338ca',
    cardFace:'#f1f5f9',
    cardNum: '#1e1b4b',
    correct:'#22c55e',
    wrong:  '#ef4444',
    select: '#fbbf24',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var GRID = 4;   // 4x4 = 16 cards
  var CARD_W = 200;
  var CARD_H = 260;
  var GRID_X = (W - GRID*CARD_W - (GRID-1)*20) / 2;
  var GRID_Y = H * 0.16;
  var GAP = 20;

  var cards = [];
  var phase = 'peek';    // peek, play, result
  var peekTimer = 3.0;
  var selectionOrder = [];
  var nextExpected = 0;
  var sets = 0;
  var NEEDED = 3;
  var wrong = 0;
  var MAX_WRONG = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var flipTimers = [];

  function generateCards() {
    // 1-16 shuffled
    var nums = [];
    for (var i = 1; i <= GRID*GRID; i++) nums.push(i);
    // Shuffle
    for (var i2 = nums.length-1; i2 > 0; i2--) {
      var j = Math.floor(Math.random()*(i2+1));
      var t = nums[i2]; nums[i2] = nums[j]; nums[j] = t;
    }
    cards = [];
    flipTimers = [];
    for (var i3 = 0; i3 < GRID*GRID; i3++) {
      cards.push({ num: nums[i3], faceUp: false, col: i3, row: Math.floor(i3/GRID), selected: false, flipAnim: 0 });
      flipTimers.push(0);
    }
    selectionOrder = [];
    nextExpected = 1;
    phase = 'peek';
    peekTimer = 3.0;
    // Show all cards briefly
    for (var ci = 0; ci < cards.length; ci++) cards[ci].faceUp = true;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'play') return;
    // Find tapped card
    var col = Math.floor((tx - GRID_X) / (CARD_W + GAP));
    var row = Math.floor((ty - GRID_Y) / (CARD_H + GAP));
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var idx = row*GRID + col;
    var card = cards[idx];
    if (card.faceUp || card.selected) return;

    // Reveal card
    card.faceUp = true;
    card.flipAnim = 1.0;
    game.audio.play('se_tap', 0.3);

    if (card.num === nextExpected) {
      card.selected = true;
      selectionOrder.push(idx);
      nextExpected++;
      for (var pi = 0; pi < 5; pi++) {
        var ang = Math.random()*Math.PI*2;
        particles.push({ x:GRID_X+col*(CARD_W+GAP)+CARD_W/2, y:GRID_Y+row*(CARD_H+GAP)+CARD_H/2, vx:Math.cos(ang)*150, vy:Math.sin(ang)*150, life:0.5, col:C.correct });
      }
      if (nextExpected > GRID*GRID) {
        sets++;
        flashCol = C.correct;
        flashAnim = 0.8;
        game.audio.play('se_success', 0.7);
        if (sets >= NEEDED && !done) { done = true; setTimeout(function(){ game.end.success(sets*800+Math.ceil(timeLeft)*80); }, 800); return; }
        setTimeout(function(){ generateCards(); }, 1200);
      }
    } else {
      wrong++;
      flashCol = C.wrong;
      flashAnim = 0.7;
      game.audio.play('se_failure', 0.4);
      if (wrong >= MAX_WRONG && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 600); return; }
      // Hide the wrong card
      var self = card;
      setTimeout(function() { self.faceUp = false; self.selected = false; }, 700);
      // Also hide all non-selected revealed cards
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Peek phase
    if (phase === 'peek') {
      peekTimer -= dt;
      if (peekTimer <= 0) {
        phase = 'play';
        for (var ci = 0; ci < cards.length; ci++) cards[ci].faceUp = false;
      }
    }

    for (var ci2 = 0; ci2 < cards.length; ci2++) {
      if (cards[ci2].flipAnim > 0) cards[ci2].flipAnim -= dt*3;
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.table, 0.7);

    // Cards
    for (var ci3 = 0; ci3 < cards.length; ci3++) {
      var card = cards[ci3];
      var cx = GRID_X + card.col * (CARD_W+GAP);
      var cy = GRID_Y + card.row * (CARD_H+GAP);
      var scaleX = card.flipAnim > 0.5 ? (card.flipAnim-0.5)*2 : 1-(0.5-card.flipAnim)*2;
      scaleX = Math.max(0.01, scaleX);
      var displayW = CARD_W * scaleX;
      var displayX = cx + (CARD_W - displayW)/2;

      if (card.faceUp) {
        // Face
        game.draw.rect(displayX, cy, displayW, CARD_H, C.cardFace, 0.9);
        if (scaleX > 0.5) {
          game.draw.text(card.num+'', cx+CARD_W/2, cy+CARD_H/2+20, { size: 80, color: card.selected ? C.correct : C.cardNum, bold: true });
        }
        if (card.selected) {
          game.draw.rect(cx, cy, CARD_W, CARD_H, C.correct, 0.15);
        }
      } else {
        // Back
        game.draw.rect(displayX, cy, displayW, CARD_H, C.cardBack, 0.9);
        if (scaleX > 0.5) {
          game.draw.rect(displayX+12, cy+12, displayW-24, CARD_H-24, C.cardBackHi, 0.5);
        }
      }
    }

    // Peek countdown
    if (phase === 'peek') {
      game.draw.rect(0, H*0.86, W, 60, C.bg, 0.8);
      game.draw.text('覚えて！ ' + peekTimer.toFixed(1)+'秒', W/2, H*0.88, { size: 48, color: C.select, bold: true });
    } else {
      game.draw.text('次に出す: '+nextExpected, W/2, H*0.88, { size: 44, color: C.ui });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim*0.1);

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9*p.life, p.col, p.life*0.8);
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W/2-(MAX_WRONG-1)*44+wi*88, H*0.935, 18, wi < wrong ? C.wrong : C.table, 0.9);
    }

    game.draw.text(sets + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.cardBackHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    generateCards();
  });
})(game);
