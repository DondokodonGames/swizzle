// 098-card-flip-war.js
// カードウォー — 裏向きカードを1枚めくって相手より強い手を引けるか運試し
// 操作: タップでカードをめくる（戦略的に選ぶ）
// 成功: 5勝先取  失敗: 相手が5勝 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#080c14',
    cardBack: '#1e3a5f',
    cardBackHi:'#2563eb',
    cardFace: '#f8fafc',
    cardBorder:'#334155',
    red:      '#ef4444',
    black:    '#1e293b',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    enemy:    '#8b5cf6',
    ui:       '#475569'
  };

  var SUITS = ['♠','♥','♦','♣'];
  var SUIT_COLORS = { '♠': '#0f172a', '♥': '#dc2626', '♦': '#dc2626', '♣': '#0f172a' };
  var RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  var RANK_VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

  // Full deck
  var deck = [];
  for (var si = 0; si < SUITS.length; si++) {
    for (var ri = 0; ri < RANKS.length; ri++) {
      deck.push({ suit: SUITS[si], rank: RANKS[ri] });
    }
  }

  // Shuffle
  for (var i = deck.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
  }

  var NUM_PLAYER_CARDS = 5;
  var playerHand = deck.splice(0, NUM_PLAYER_CARDS);
  var enemyHand = deck.splice(0, NUM_PLAYER_CARDS);

  var playerFlipped = new Array(NUM_PLAYER_CARDS).fill(false);
  var enemyRevealed = null; // enemy card for current round
  var roundResult = null; // 'win'|'lose'|'tie'
  var roundTimer = 0;
  var playerScore = 0;
  var enemyScore = 0;
  var needed = 5;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var roundActive = false;
  var enemyPickTimer = 0;
  var playerPickedIdx = -1;

  function startRound() {
    // Enemy picks a random unflipped card (simulated)
    var enemyIdx = Math.floor(Math.random() * NUM_PLAYER_CARDS);
    enemyRevealed = enemyHand[enemyIdx];
    roundResult = null;
    roundActive = true;
    playerPickedIdx = -1;
    // Enemy "reveals" after brief delay (simulated — just stored)
    enemyPickTimer = 0.3;
  }

  function resolveRound(playerCardIdx) {
    if (!roundActive || playerFlipped[playerCardIdx]) return;
    playerFlipped[playerCardIdx] = true;
    playerPickedIdx = playerCardIdx;
    roundActive = false;

    var pCard = playerHand[playerCardIdx];
    var eCard = enemyRevealed;
    var pVal = RANK_VALUES[pCard.rank];
    var eVal = RANK_VALUES[eCard.rank];

    if (pVal > eVal) {
      roundResult = 'win';
      playerScore++;
      game.audio.play('se_tap', 1.0);
    } else if (pVal < eVal) {
      roundResult = 'lose';
      enemyScore++;
      game.audio.play('se_failure', 0.6);
    } else {
      roundResult = 'tie';
      game.audio.play('se_tap', 0.5);
    }

    feedback = 1.0;
    roundTimer = 1.2;

    if (playerScore >= needed && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(playerScore * 80 + Math.ceil(timeLeft) * 12); }, 1200);
    } else if (enemyScore >= needed && !done) {
      done = true;
      setTimeout(function() { game.end.failure(); }, 1200);
    }
  }

  var CARD_W = 148, CARD_H = 200;
  var CARD_GAP = 20;
  var CARDS_TOTAL_W = NUM_PLAYER_CARDS * (CARD_W + CARD_GAP) - CARD_GAP;
  var CARDS_X = (W - CARDS_TOTAL_W) / 2;
  var PLAYER_CARDS_Y = H * 0.6;
  var ENEMY_CARD_X = W / 2;
  var ENEMY_CARD_Y = H * 0.3;

  game.onTap(function(tx, ty) {
    if (done || !roundActive) return;
    // Check player cards
    for (var ci = 0; ci < NUM_PLAYER_CARDS; ci++) {
      if (playerFlipped[ci]) continue;
      var cx = CARDS_X + ci * (CARD_W + CARD_GAP);
      if (tx >= cx && tx <= cx + CARD_W && ty >= PLAYER_CARDS_Y && ty <= PLAYER_CARDS_Y + CARD_H) {
        resolveRound(ci);
        return;
      }
    }
  });

  function drawCard(x, y, card, faceUp, selected) {
    // Card shadow
    game.draw.rect(x + 6, y + 6, CARD_W, CARD_H, '#000', 0.3);
    // Card body
    game.draw.rect(x, y, CARD_W, CARD_H, faceUp ? C.cardFace : C.cardBack);
    game.draw.rect(x + 4, y + 4, CARD_W - 8, CARD_H - 8, faceUp ? '#f1f5f9' : C.cardBackHi, 0.3);
    if (selected) game.draw.rect(x - 4, y - 4, CARD_W + 8, CARD_H + 8, '#fbbf24', 0.4);
    if (faceUp && card) {
      var sc = SUIT_COLORS[card.suit];
      game.draw.text(card.rank, x + CARD_W / 2, y + CARD_H * 0.35, { size: 64, color: sc, bold: true });
      game.draw.text(card.suit, x + CARD_W / 2, y + CARD_H * 0.68, { size: 52, color: sc, bold: true });
    } else if (!faceUp) {
      // Pattern on back
      for (var py = y + 20; py < y + CARD_H - 20; py += 24) {
        game.draw.rect(x + 16, py, CARD_W - 32, 8, '#1e3a5f', 0.5);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (roundTimer > 0) {
      roundTimer -= dt;
      if (roundTimer <= 0 && !done) {
        // Start next round if cards remaining
        var unflipped = playerFlipped.filter(function(f) { return !f; }).length;
        if (unflipped > 0) startRound();
      }
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Score display
    game.draw.text('あなた: ' + playerScore, W * 0.25, H * 0.12, { size: 48, color: C.correct, bold: true });
    game.draw.text('vs', W / 2, H * 0.12, { size: 40, color: C.ui });
    game.draw.text('相手: ' + enemyScore, W * 0.75, H * 0.12, { size: 48, color: C.enemy, bold: true });

    // Enemy card area
    game.draw.text('相手のカード', ENEMY_CARD_X, ENEMY_CARD_Y - 40, { size: 36, color: C.ui });
    if (roundResult !== null && enemyRevealed) {
      // Show revealed enemy card
      drawCard(ENEMY_CARD_X - CARD_W / 2, ENEMY_CARD_Y, enemyRevealed, true, false);
    } else if (roundActive) {
      // Enemy card face down
      drawCard(ENEMY_CARD_X - CARD_W / 2, ENEMY_CARD_Y, null, false, false);
      game.draw.text('?', ENEMY_CARD_X, ENEMY_CARD_Y + CARD_H / 2, { size: 80, color: '#fff', bold: true });
    } else {
      game.draw.rect(ENEMY_CARD_X - CARD_W / 2, ENEMY_CARD_Y, CARD_W, CARD_H, '#060a10');
    }

    // Round result
    if (roundResult && feedback > 0) {
      var resText = roundResult === 'win' ? '勝ち！' : (roundResult === 'lose' ? '負け…' : '引き分け');
      var resColor = roundResult === 'win' ? C.correct : (roundResult === 'lose' ? C.wrong : '#f59e0b');
      game.draw.text(resText, W / 2, H * 0.5, { size: 88, color: resColor, bold: true });
    }

    // Player cards
    game.draw.text('あなたのカード — タップで選ぶ', W / 2, PLAYER_CARDS_Y - 48, { size: 36, color: C.ui });
    for (var ci = 0; ci < NUM_PLAYER_CARDS; ci++) {
      var cx = CARDS_X + ci * (CARD_W + CARD_GAP);
      var isSelected = ci === playerPickedIdx;
      var isFlipped = playerFlipped[ci];
      if (roundActive && !isFlipped) {
        // Hover glow for selectable cards
        game.draw.rect(cx - 4, PLAYER_CARDS_Y - 8, CARD_W + 8, CARD_H + 16, '#1d4ed8', 0.2);
      }
      drawCard(cx, PLAYER_CARDS_Y, playerHand[ci], isFlipped, isSelected);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, '#080c14');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#1d4ed8' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    startRound();
  });
})(game);
