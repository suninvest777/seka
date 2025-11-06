/**
 * АВТОРИТЕТНАЯ ЛОГИКА ИГРЫ СЕККА (21 ОЧКО)
 * Полная реализация согласно настоящим правилам Секки
 * 
 * ОСНОВНЫЕ ПРАВИЛА:
 * - Короткая колода: 21 карта (4 масти * 5 карт (10, J, Q, K, A) + Джокер)
 * - По 3 карты каждому игроку
 * - Цель: набрать лучшую комбинацию
 * - Торги в несколько кругов с возможностью вскрытия
 * - Вара при ничьей между двумя игроками
 */

const SekaCombinations = require('./SekaCombinations');

// Константы для настоящей Секки (короткая колода)
const SEKA_RULES = {
  DECK_SIZE: 21, // 4 масти * 5 карт (10, J, Q, K, A) + 1 Джокер = 21 карта
  CARDS_PER_PLAYER: 3,
  ANTE_AMOUNT: 10,
  STARTING_CHIPS: 1000,
  MAX_PLAYERS: 7,
  MIN_PLAYERS: 2,
  BETTING_ROUNDS: 2, // Первый круг + круг вскрытия
  VARA_ENTRY_COST_MULTIPLIER: 0.5, // Половина кона для входа в Вару
  MIN_RAISE_AMOUNT: 10 // Минимальное повышение ставки
};

// Ранги карт для сравнения комбинаций (короткая колода: только 10, J, Q, K, A, Joker)
const CARD_RANKS = {
  '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14, 'Joker': 15
};

// Типы комбинаций (чем выше, тем лучше)
const COMBINATION_TYPES = {
  SEKA_TUZOV: 5,      // СЕКА ТУЗОВ (самая сильная)
  HIGH_POINTS: 4,     // 32+ очков
  SEKA_SUIT: 3,       // СЕКА МАСТЕЙ (30 очков)
  TWO_POINTS: 2,      // 22-21 очков (два лба)
  LOW_POINTS: 1       // 11-20 очков (слабые очки)
};

class SekaGame {
  constructor(config = {}) {
    this.gameId = config.gameId || `game_${Date.now()}`;
    this.players = [];
    this.deck = [];
    this.gameState = 'waiting'; // waiting, betting, vara, showdown, finished
    this.currentPlayer = 0;
    this.pot = 0;
    this.roundId = 0; // ID текущего раунда для трейсинга
    this.varaPot = 0; // Кон для Вары
    this.varaPlayers = []; // Игроки в Варе
    this.varaInitiator = null; // Инициатор Вары
    this.dealerId = null; // ID сдатчика
    this.bettingRound = 0; // Номер круга торгов
    this.playersActed = 0; // Количество игроков, сделавших ход в текущем круге
    this.currentBet = 0;
    this.lastRaiser = null;
    this.winner = null;
    this.winners = [];
    this.carryOverPot = 0;
    this.lastAction = null; // Последнее действие игрока для визуализации
    
    // Голосование для нового раунда (теперь используется только для таймера)
    this.voteNewRoundPlayers = []; // ID игроков, проголосовавших за новый раунд (больше не используется)
    this.voteNewRoundTimer = null; // Таймер для кнопки "Начать втроем" (больше не используется)
    this.voteNewRoundTimeout = null; // Таймер 10 секунд для автоматического начала раунда
    this.voteNewRoundCountdownInterval = null; // Интервал для обратного отсчета таймера
    this.voteNewRoundTimeoutSeconds = 0; // Оставшееся время в секундах
    this.startWithVotedConfirm = []; // Подтверждение для начала игры втроем (больше не используется)
    this.voteInitiatorId = null; // ID инициатора голосования (обычно победитель)
    
    // Результат вскрытия (для визуализации на клиенте)
    this.exposeResult = null; // { exposerId, exposedId, exposerWins, isTie, varaInitiated }
    this.exposeResultTimer = null; // Таймер для очистки exposeResult
    
    // Таймеры
    this.turnTimer = null;
    this.turnTimeLimit = 20000; // 20 секунд на ход
    
    // Обработчики событий
    this.onStateUpdate = null;
    
    // Метрики и статистика
    this.metrics = {
      gamesStarted: 0,
      gamesFinished: 0,
      errorsCount: 0,
      totalMoves: 0,
      averageGameTime: 0
    };
    
    this.playerStats = new Map();
    this.rateLimits = new Map();
    
    console.log(`🎮 Создана новая игра Секка: ${this.gameId}`);
  }

  // Создание колоды с Джокером (короткая колода: только 10, J, Q, K, A)
  createDeck() {
    this.deck = [];
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['10', 'J', 'Q', 'K', 'A']; // Только старшие карты (без 6, 7, 8, 9)
    
    // Создаем стандартные 20 карт (4 масти * 5 карт)
    for (const suit of suits) {
      for (const rank of ranks) {
        this.deck.push({
          suit: suit,
          rank: rank,
          value: CARD_RANKS[rank],
          points: this.getCardPointsLegacy(rank) // Используем временную функцию для создания колоды
        });
      }
    }
    
    // Добавляем Джокера
    this.deck.push({
      suit: 'none',
      rank: 'Joker',
      value: 15,
      points: 0
    });
    
    console.log(`🃏 Создана короткая колода: ${this.deck.length} карт (20 карт + Джокер)`);
    return this.deck;
  }

  // Получение очков карты для подсчета комбинаций (УДАЛЕНО - используем SekaCombinations)
  // Эта функция больше не нужна, так как вся логика комбинаций теперь в SekaCombinations
  
  // Временная функция только для создания колоды (НЕ используется в игровой логике)
  // Короткая колода: только 10, J, Q, K, A, Joker
  getCardPointsLegacy(rank) {
    const points = {
      '10': 10,
      'J': 2, 'Q': 3, 'K': 4, 'A': 11, 'Joker': 0
    };
    return points[rank] || 0;
  }

  // Перемешивание колоды
  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    console.log('🔀 Колода перемешана');
  }

  // Добавление игрока
  addPlayer(playerId, playerName) {
    if (this.players.length >= SEKA_RULES.MAX_PLAYERS) {
      throw new Error('Максимальное количество игроков достигнуто');
    }
    
    if (this.gameState !== 'waiting') {
      throw new Error('Нельзя добавить игрока во время игры');
    }
    
    const player = {
      id: playerId,
      name: playerName,
      chips: SEKA_RULES.STARTING_CHIPS,
      cards: [],
      currentBet: 0,
      totalBet: 0,
      isFolded: false,
      isAllIn: false,
      isSleeping: false,
      isInVara: false,
      combination: null,
      points: 0
    };
    
    this.players.push(player);
    console.log(`👤 Добавлен игрок: ${playerName} (${playerId})`);
    
    return player;
  }

  // Начало игры
  startGame() {
    if (this.players.length < SEKA_RULES.MIN_PLAYERS) {
      throw new Error(`Минимум ${SEKA_RULES.MIN_PLAYERS} игроков для начала игры`);
    }
    
    console.log(`🎮 Начинаем игру с ${this.players.length} игроками`);
    
    // Создаем и перемешиваем колоду
    this.createDeck();
    this.shuffleDeck();
    
    // Собираем анте
    this.collectAnte();
    
    // Раздаем карты
    this.dealCards();
    
    // Определяем сдатчика (первый игрок)
    this.dealerId = this.players[0].id;
    
    // АКТИВАЦИЯ ШТРАФА СДАТЧИКА (опционально)
    // Раскомментируйте следующую строку для активации штрафа сдатчика:
    // this.handleDealerPenalty();
    
    // Начинаем первый круг торгов
    this.gameState = 'betting';
    this.bettingRound = 1;
        this.currentPlayer = 0;
    this.playersActed = 0;
    this.currentBet = 0;
    this.lastRaiser = null;
    
    // Находим первого активного игрока
    this.findFirstActivePlayer();
    
    // Запускаем таймер хода
    this.startTurnTimer();
    
    this.metrics.gamesStarted++;
    
    console.log(`🎯 Игра начата! Текущий игрок: ${this.players[this.currentPlayer].name}`);
    
    return this.getGameState();
  }

  // Сбор анте
  collectAnte() {
    console.log(`💰 Собираем анте: ${SEKA_RULES.ANTE_AMOUNT} с каждого игрока`);
    
    // Добавляем переносимый кон, если есть
    if (this.carryOverPot > 0) {
      this.pot += this.carryOverPot;
      console.log(`💰 Добавлен переносимый кон: ${this.carryOverPot}`);
      this.carryOverPot = 0;
    }
    
    for (const player of this.players) {
      if (!player.isSleeping) {
        const anteAmount = Math.min(SEKA_RULES.ANTE_AMOUNT, player.chips);
        player.chips -= anteAmount;
        player.currentBet = anteAmount;
        player.totalBet = anteAmount;
        this.pot += anteAmount;
        if (!this.balanceDeltas) this.balanceDeltas = [];
        if (anteAmount > 0) this.balanceDeltas.push({ playerId: player.id, delta: -anteAmount });
        
        console.log(`💰 ${player.name}: анте ${anteAmount}, осталось фишек: ${player.chips}`);
      }
    }
  }

  // Раздача карт
  dealCards() {
    console.log('🃏 Раздаем карты...');
    
    // Очищаем карты игроков
    for (const player of this.players) {
      player.cards = [];
      player.combination = null;
      player.points = 0;
    }
    
    // Раздаем по 3 карты каждому игроку
    for (let cardIndex = 0; cardIndex < SEKA_RULES.CARDS_PER_PLAYER; cardIndex++) {
      for (let playerIndex = 0; playerIndex < this.players.length; playerIndex++) {
        const player = this.players[playerIndex];
        if (!player.isSleeping) {
          const card = this.deck.pop();
          player.cards.push(card);
          console.log(`🃏 ${player.name} получил: ${card.rank} ${card.suit}`);
        }
      }
    }
    
    console.log(`🃏 Раздача завершена. Осталось карт в колоде: ${this.deck.length}`);
  }

  // Определение комбинации игрока (ИСПОЛЬЗУЕМ НОВЫЙ КЛАСС)
  getCombinationRank(cards) {
    if (!cards || cards.length !== 3) {
      return { priority: 0, rankValue: 0, points: 0, isSekaTuzovNoJoker: false };
    }
    
    // Используем авторитетный класс SekaCombinations
    return SekaCombinations.getCombinationRank(cards);
  }

  // Проверка на СЕКУ ТУЗОВ (УДАЛЕНО - используем SekaCombinations)
  // Эта функция больше не нужна, проверка через isSekaTuzovNoJoker в getCombinationRank

  // Подсчет очков с оптимизацией тузов (УДАЛЕНО - используем SekaCombinations)
  // Эта функция больше не нужна, так как вся логика комбинаций теперь в SekaCombinations

  // Сравнение комбинаций (ИСПОЛЬЗУЕМ НОВЫЙ КЛАСС)
  compareCombinations(combo1, combo2) {
    return SekaCombinations.compareCombinations(combo1, combo2);
  }

  // Унифицированное получение активных игроков
  getActivePlayers(respectSleeping = (this.gameState === 'vara')) {
    // ИСПРАВЛЕНИЕ БАГ #19: Проверяем наличие игроков
    if (!this.players || this.players.length === 0) {
      console.warn('⚠️ getActivePlayers: нет игроков в игре');
      return [];
    }
    return this.players.filter(p => !p.isFolded && (respectSleeping ? !p.isSleeping : true));
  }

  // Выполнение хода игрока
  async makeMove(playerId, action, amount = 0) {
    try {
      console.log(`🎯 ${this.getPlayerName(playerId)} делает ход: ${action}${amount ? ` (${amount})` : ''}`);
      console.log(`📊 Текущее состояние: gameState=${this.gameState}, currentPlayer=${this.currentPlayer}`);
      
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
        console.error(`❌ Игрок ${playerId} не найден в списке игроков`);
        throw new Error('Игрок не найден');
    }
    
    const player = this.players[playerIndex];
      
      // Проверяем, что это ход текущего игрока
      if (this.currentPlayer !== playerIndex) {
        console.warn(`⚠️ Ход принадлежит игроку ${this.currentPlayer}, но пытается ходить ${playerIndex}`);
        throw new Error(`Не ваш ход. Ожидается игрок с индексом ${this.currentPlayer}`);
      }
      
      // Проверяем состояние игры
      if (this.gameState !== 'betting' && this.gameState !== 'vara' && this.gameState !== 'waiting_for_vara_join' && this.gameState !== 'winner_vara_choice') {
        console.warn(`⚠️ Игра не в состоянии торгов. Текущее состояние: ${this.gameState}`);
        throw new Error(`Игра не в состоянии торгов. Текущее состояние: ${this.gameState}`);
      }
      
      // Очищаем таймер
      this.clearTurnTimer();
      
      // Выполняем действие
    try {
      switch (action) {
          case 'fold': {
            // В состоянии waiting_for_vara_join fold = refuseVara
            if (this.gameState === 'waiting_for_vara_join') {
              this.handleRefuseVara(player);
              return { success: true };
            }
            this.handleFold(player);
            // Если после паса остался один активный игрок — сразу завершаем раунд
            try {
              const actives = this.getActivePlayers(true);
              if (actives.length <= 1) {
                this.checkRoundEnd();
                // После завершения раунда дальнейшие переходы хода не нужны
                return { success: true };
              }
            } catch (_) {}
          break;
          }
        case 'call':
            this.handleCall(player);
            break;
          case 'raise':
            // КРИТИЧЕСКОЕ: Если amount равен всем фишкам игрока, это ва-банк
            const allChips = player.chips;
            if (amount >= allChips) {
              // Игрок идет ва-банк
              this.handleAllIn(player);
          } else {
              this.handleRaise(player, amount);
          }
          break;
          case 'all-in':
          case 'allin':
            // Отдельное действие для ва-банка
            this.handleAllIn(player);
            break;
          case 'expose':
            this.handleExpose(player);
            // После expose может быть инициация Вары или showdown - проверяем состояние
            // ИСПРАВЛЕНИЕ БАГ #7: handleExpose уже отправляет состояние, не нужно дублировать
            // Но нужно проверить состояние и выйти если игра перешла в другое состояние
            if (this.gameState === 'waiting_for_vara_join' || this.gameState === 'showdown' || this.gameState === 'finished') {
              // Игра перешла в другое состояние - не продолжаем обычный поток
              // handleExpose уже отправил состояние - просто выходим
              return { success: true };
            }
          break;
          case 'joinVara':
            this.handleJoinVara(player, amount);
            break;
          case 'refuseVara':
            this.handleRefuseVara(player);
            break;
          case 'winnerChoice':
            this.handleWinnerChoice(playerId, amount); // amount используется как choice
            break;
          default:
            throw new Error(`Неизвестное действие: ${action}`);
        }
      } catch (actionError) {
        console.error(`❌ Ошибка при выполнении действия ${action}:`, actionError);
        throw actionError;
      }
      
      // Проверяем, не перешла ли игра в showdown (после checkRoundEnd или других действий)
      if (this.gameState === 'showdown' || this.gameState === 'finished') {
        // Игра завершена или идет showdown - не продолжаем
        if (this.onStateUpdate) {
          this.onStateUpdate(this.getGameState());
        }
        return { success: true };
      }
      
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем завершение торгов ПЕРЕД переходом к следующему игроку
      try {
        this.checkBettingComplete();
      } catch (checkError) {
        console.error('❌ Ошибка в checkBettingComplete:', checkError);
        // Не прерываем выполнение, продолжаем
      }
      
      // КРИТИЧЕСКОЕ: После checkBettingComplete мог быть вызван showdown - НЕ продолжаем дальше
      if (this.gameState === 'showdown' || this.gameState === 'finished' || this.gameState === 'waiting_for_vara_join') {
        console.log('🛑 Торги завершены, состояние изменилось - не переходим к следующему игроку');
        if (this.onStateUpdate) {
          this.onStateUpdate(this.getGameState());
        }
        return { success: true };
      }
      
      // КРИТИЧЕСКОЕ: Переходим к следующему игроку ТОЛЬКО если торги еще продолжаются
      if (this.gameState === 'betting' || this.gameState === 'vara') {
        try {
          // Проверяем еще раз активных игроков перед переходом
          const activeBeforeNext = this.getActivePlayers(true).filter(p => !p.isAllIn && !p.isFolded);
          
          if (activeBeforeNext.length <= 1) {
            // Остался один активный игрок - вызываем showdown
            console.log('🏁 Остался один активный игрок перед nextPlayer - вызываем showdown');
            this.showdown();
            return { success: true };
          }
          
          const hasNextPlayer = this.nextPlayer();
          if (hasNextPlayer) {
            this.startTurnTimer();
          } else {
            // Следующий игрок не найден - вызываем showdown
            console.log('⏸️ Следующий игрок не найден - вызываем showdown');
            this.showdown();
            return { success: true };
          }
        } catch (nextError) {
          console.error('❌ Ошибка при переходе к следующему игроку:', nextError);
          // Пытаемся вызвать showdown, если все игроки выбыли
          try {
            if (this.gameState !== 'showdown') {
              this.showdown();
            }
          } catch (showdownError) {
            console.error('❌ Ошибка в showdown после nextPlayer:', showdownError);
          }
        }
      }
      
      // ИСПРАВЛЕНИЕ БАГ #15: Отправляем обновление состояния только если еще не отправляли
      // Состояние уже могло быть отправлено в handleExpose, checkRoundEnd, или checkBettingComplete
      // Проверяем, что состояние еще не изменилось (не перешли в showdown)
      if (this.gameState !== 'showdown' && this.gameState !== 'finished' && this.gameState !== 'waiting_for_vara_join') {
        try {
          if (this.onStateUpdate) {
            this.onStateUpdate(this.getGameState());
          }
        } catch (updateError) {
          console.error('❌ Ошибка при отправке обновления состояния:', updateError);
          // Не прерываем выполнение
        }
      }
      
      console.log(`✅ Ход ${action} выполнен успешно`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Критическая ошибка в makeMove:`, error);
      console.error(`Stack trace:`, error.stack);
      throw error;
    }
  }

  // Обработка сброса карт
  handleFold(player) {
    console.log(`📤 ${player.name} сбрасывает карты`);
    if (!player) {
      throw new Error('Игрок не определен');
    }
          player.isFolded = true;
    player.cards = []; // Скрываем карты
    this.playersActed++;
    console.log(`📊 Игроков действовало в этом круге: ${this.playersActed}`);
    
    // Сохраняем информацию о последнем действии
    this.lastAction = {
      playerId: player.id,
      playerName: player.name,
      action: 'fold',
      amount: 0,
      message: `📤 Пас: ${player.name}`
    };
  }

  // Обработка сброса по playerId (удобно для внешних вызовов)
  handleFoldById(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.isFolded || player.isSleeping) {
      throw new Error('Игрок не найден, уже сбросил карты или находится в режиме сна');
    }
    this.handleFold(player);
    // Передаем ход и проверяем завершение раунда
    this.moveToNextPlayer();
    this.checkRoundEnd();
  }

  // Передача хода следующему активному игроку (пропуская сбросивших/спящих)
  moveToNextPlayer() {
    if (!this.players || this.players.length === 0) {
      return false;
    }
    let nextIndex = this.currentPlayer;
    const initialIndex = this.currentPlayer;
    let found = false;
    do {
      nextIndex = (nextIndex + 1) % this.players.length;
      const candidate = this.players[nextIndex];
      if (candidate && !candidate.isFolded && !candidate.isSleeping) {
        this.currentPlayer = nextIndex;
        found = true;
          break;
      }
    } while (nextIndex !== initialIndex);
    if (!found) {
      // Вероятно, остался один активный игрок — проверим завершение
      this.checkRoundEnd();
    }
    return found;
  }

  // Проверка завершения раунда с учетом режима (обычный/Вара)
  checkRoundEnd() {
    let activePlayers;
    const inVara = this.gameState === 'vara';
    if (inVara) {
      activePlayers = this.players.filter(p => !p.isFolded && !p.isSleeping);
      console.log(`[VARA] Активных игроков: ${activePlayers.length}`, activePlayers.map(p => p.name));
      // Если никого активных не осталось, завершаем Вару и переходим дальше
      if (activePlayers.length === 0) {
        console.warn('⚠️ Вара: активных игроков не осталось — завершаем Вару');
        this.endVara();
        return;
      }
          } else {
      // В обычном режиме спящих быть не должно; считаем активными всех, кто не сбросил
      activePlayers = this.players.filter(p => !p.isFolded);
      console.log(`[NORMAL] Активных игроков: ${activePlayers.length}`, activePlayers.map(p => p.name));
    }

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      console.log(`🎉 Раунд завершен! Победитель: ${winner.name} (${winner.id}) - мгновенная победа без showdown`);
      
      // Устанавливаем победителя ДО распределения банка
      this.winner = winner;
      this.winners = [{ player: winner }];
      
      // Перевод банка победителю (используем имеющуюся логику распределения)
      try {
        this.distributePot?.() || this._distributePotSimple(winner);
      } catch (e) {
        console.warn('⚠️ Ошибка в distributePot, fallback на простой перевод', e);
        this._distributePotSimple(winner);
      }

      // Отправляем состояние с победителем сразу (до предложения Вары)
      if (this.onStateUpdate) {
        this.onStateUpdate(this.getGameState());
      }

      // Бонус за чистую СЕКУ ТУЗОВ (если применимо)
      try {
        const combo = this.getCombinationRank(winner.cards);
        if (combo && combo.isSekaTuzovNoJoker) {
          this.handleSekaTuzovBonus?.(winner);
        }
      } catch (_) {}

      if (inVara) {
        // Завершаем Вару и продолжаем
        this.endVara(winner);
      } else {
        // После мгновенной победы автоматически переходим к голосованию за новый раунд
        // Выплата уже произошла автоматически в distributePot
        // Небольшая задержка перед голосованием, чтобы клиенты успели показать анимацию "ПОБЕДА!"
        // Передаем ID победителя как инициатора голосования
        setTimeout(() => {
          this.startVoteNewRound(winner.id);
        }, 2000); // 2 секунды задержки для анимации
      }
      return;
    }

    if (activePlayers.length === 0) {
      console.warn('⚠️ Все игроки сбросили карты или спят. Банк сгорает, начинаем новый раунд');
      this.pot = 0;
      if (inVara) {
        this.endVara();
      } else {
        this.startNewRound();
      }
      return;
    }

    // ИСПРАВЛЕНИЕ БАГ #18: Проверяем завершение торгов только если игра не завершена
    // Не вызываем checkBettingComplete если уже произошло showdown или игра завершена
    if (this.gameState !== 'showdown' && this.gameState !== 'finished' && this.gameState !== 'waiting_for_vara_join') {
      this.checkBettingComplete();
    }
  }

  // Простой перевод банка единственному победителю
  _distributePotSimple(winner) {
    if (this.pot > 0) {
      winner.chips += this.pot;
      console.log(`💰 ${winner.name} забирает ${this.pot} фишек из банка`);
      this.pot = 0;
    }
  }

  // Завершение режима Вары и возврат к обычной игре
  endVara(finalWinner = null) {
    console.log('🏁 Завершаем режим ВАРЫ');
    
    // ИСПРАВЛЕНИЕ БАГ #17: Очищаем exposeResultTimer при завершении Вары
    if (this.exposeResultTimer) {
      clearTimeout(this.exposeResultTimer);
      this.exposeResultTimer = null;
      this.exposeResult = null;
    }
    
    // Сбрасываем флаги Вары
    this.gameState = 'betting';
    this.varaPot = 0;
    this.varaPlayers = [];
    this.varaInitiator = null;
    // Пробуждаем всех игроков
    for (const p of this.players) {
      p.isSleeping = false;
    }
    // Если есть итоговый победитель Вары — можно предложить Вару-победителю, иначе новый раунд
    if (finalWinner && typeof this.offerVaraToWinner === 'function') {
      this.offerVaraToWinner(finalWinner);
          } else {
      this.startNewRound();
    }
  }

  // Бонус при чистой СЕКЕ ТУЗОВ на основе конфигурации игры
  handleSekaTuzovBonus(winner) {
    const bonus = (this.config && this.config.sekaTuzovBonusAmount) ? this.config.sekaTuzovBonusAmount : 0;
    if (!bonus) return;
    for (const p of this.players) {
      if (p.id === winner.id || p.isSleeping) continue;
      if (p.chips >= bonus) {
        p.chips -= bonus;
        winner.chips += bonus;
        console.log(`💰 ${p.name} выплатил ${bonus} бонуса ${winner.name} за СЕКУ ТУЗОВ`);
          } else {
        console.warn(`⚠️ ${p.name} не смог выплатить бонус из-за нехватки фишек`);
      }
    }
  }

  // Обработка поддержки ставки
  handleCall(player) {
    // ВАЖНО: Если текущая ставка = 0, то "поддержать" нельзя
    // Игрок может только "Повысить" (сделать первую ставку) или "Пас"
    if (this.currentBet === 0) {
      throw new Error('Нельзя поддержать ставку, если еще никто не сделал ставку. Используйте "Повысить" для первой ставки.');
    }
    
          const callAmount = this.currentBet - player.currentBet;
    
    // Если ставка уже уравнена (callAmount = 0), это проверка (check)
    if (callAmount <= 0) {
      console.log(`✅ ${player.name} проверяет`);
      this.playersActed++;
      return;
    }
    
    // Если у игрока не хватает фишек на полный колл, он идет ва-банк
    if (player.chips < callAmount) {
      console.log(`🔥 ${player.name} идет ва-банк на ${player.chips}`);
          const allInAmount = player.chips;
      this.pot += allInAmount;
          player.chips = 0;
          player.currentBet += allInAmount;
          player.isAllIn = true;
          player.totalBet += allInAmount;
      
      // Сохраняем информацию о последнем действии (ва-банк через колл)
      this.lastAction = {
        playerId: player.id,
        playerName: player.name,
        action: 'all-in',
        amount: allInAmount,
        message: `💥 ВА-БАНК: ${player.name.toUpperCase()}`
      };
    } else {
      // Нормальный колл
      console.log(`💰 ${player.name} поддерживает ставку: ${callAmount}`);
            player.chips -= callAmount;
      player.currentBet += callAmount;
            player.totalBet += callAmount;
            this.pot += callAmount;
      
      // Сохраняем информацию о последнем действии
      this.lastAction = {
        playerId: player.id,
        playerName: player.name,
        action: 'call',
        amount: callAmount,
        message: `💰 Колл: ${player.name} на ${callAmount}`
      };
    }
    
    this.playersActed++;
  }

  // Обработка повышения ставки
  handleRaise(player, amount) {
    const totalBet = player.currentBet + amount;
    
    // Проверяем минимальное повышение
    const minRaise = SEKA_RULES.MIN_RAISE_AMOUNT || 10;
    const requiredRaise = this.currentBet === 0 ? minRaise : this.currentBet + minRaise;
    
    if (totalBet < requiredRaise) {
      const errorMsg = this.currentBet === 0 
        ? `Первая ставка должна быть не менее ${requiredRaise} фишек (минимальное повышение: ${minRaise})`
        : `Ставка должна быть не менее ${requiredRaise} фишек. Минимальное повышение: ${minRaise}`;
      throw new Error(errorMsg);
    }
    
    if (player.chips < amount) {
      throw new Error('Недостаточно фишек');
    }
    
    console.log(`📈 ${player.name} повышает ставку на ${amount} (общая ставка: ${totalBet})`);
    player.chips -= amount;
    player.currentBet += amount;
    player.totalBet += amount;
    this.pot += amount;
    this.currentBet = totalBet;
    this.lastRaiser = player.id;
    this.playersActed = 1; // Сбрасываем счетчик, так как начался новый круг
    
    // Сохраняем информацию о последнем действии для визуализации
    this.lastAction = {
      playerId: player.id,
      playerName: player.name,
      action: 'raise',
      amount: amount,
      message: `📈 Повышение: ${player.name} на ${amount}`
    };
  }

  // Обработка ва-банка (All-in)
  handleAllIn(player) {
    console.log(`💥 ${player.name} идет ВА-БАНК!`);
    
    // КРИТИЧЕСКОЕ: Рассчитываем общую ставку которую игрок может сделать
    const allInAmount = player.chips + player.currentBet; // Все фишки + текущая ставка
    const raiseAmount = allInAmount - this.currentBet; // Насколько повышается ставка
    
    // Защита: Если у игрока нет фишек, это ошибка
    if (player.chips <= 0) {
      throw new Error('У игрока нет фишек для ва-банка');
    }
    
    // КРИТИЧЕСКОЕ: Если all-in больше текущей ставки, обновляем currentBet
    if (allInAmount > this.currentBet) {
      console.log(`📈 Ва-банк ${player.name} повышает ставку с ${this.currentBet} до ${allInAmount}`);
      this.currentBet = allInAmount;
      this.lastRaiser = player.id;
      // При ва-банке начинается новый круг торгов - сбрасываем счетчик
      this.playersActed = 1;
    } else {
      // Ва-банк не превышает текущую ставку (игрок уравнивает ставку ва-банком)
      console.log(`💰 Ва-банк ${player.name} уравнивает ставку на ${allInAmount}`);
      // Не обновляем currentBet и lastRaiser, но увеличиваем счетчик
      this.playersActed++;
    }
    
    // КРИТИЧЕСКОЕ: Вносим все фишки игрока в банк
    const chipsToPot = player.chips;
    this.pot += chipsToPot;
    player.currentBet = allInAmount; // Общая ставка игрока
    player.totalBet += chipsToPot;
    player.chips = 0; // Игрок обанкротился в этом раунде
    player.isAllIn = true; // Устанавливаем флаг ва-банка
    
    console.log(`💰 ${player.name} внес ${chipsToPot} фишек в банк (Ва-банк). Осталось: ${player.chips}`);
    
    // Добавляем дельту баланса для анимации
    if (!this.balanceDeltas) this.balanceDeltas = [];
    this.balanceDeltas.push({ playerId: player.id, delta: -chipsToPot });
    
    // Сохраняем информацию о последнем действии для визуализации на клиенте
    this.lastAction = {
      playerId: player.id,
      playerName: player.name,
      action: 'all-in',
      amount: chipsToPot,
      message: `💥 ВА-БАНК: ${player.name.toUpperCase()}`
    };
    
    // КРИТИЧЕСКОЕ: После ва-банка игрок остается в игре, но больше не может делать ходы
    // Он будет пропущен в nextPlayer(), но останется активным для showdown
  }

  // Обработка вскрытия
  handleExpose(player) {
    if (this.bettingRound < 2) {
      throw new Error('Вскрытие возможно только во втором круге торгов');
    }
    
    console.log(`🔍 ${player.name} вскрывает карты`);
    
    // 1. Проверяем и взимаем стандартную ставку со вскрывающего
    const exposeCost = SEKA_RULES.ANTE_AMOUNT;
    if (player.chips < exposeCost) {
      throw new Error('Недостаточно фишек для вскрытия. Необходимо: ' + exposeCost);
    }
    
    player.chips -= exposeCost;
    this.pot += exposeCost;
    if (!this.balanceDeltas) this.balanceDeltas = [];
    this.balanceDeltas.push({ playerId: player.id, delta: -exposeCost });
    console.log(`💰 ${player.name} внес ${exposeCost} фишек за вскрытие`);
    
    // 2. Находим следующего активного игрока для вскрытия (справа сидящий)
    const nextPlayerIndex = this.getNextPlayerIndex(this.currentPlayer);
    const nextPlayer = this.players[nextPlayerIndex];
    
    // Используем getActivePlayers для валидации
    const activePlayers = this.getActivePlayers(true);
    if (!nextPlayer || !activePlayers.find(p => p.id === nextPlayer.id) || nextPlayer.isAllIn) {
      throw new Error('Нет активного игрока для вскрытия');
    }
    
    console.log(`🔍 Вскрытие: ${player.name} vs ${nextPlayer.name}`);
    
    // 3. Сравниваем комбинации используя SekaCombinations
    const playerCombo = SekaCombinations.getCombinationRank(player.cards);
    const nextPlayerCombo = SekaCombinations.getCombinationRank(nextPlayer.cards);
    
    // Сохраняем комбинации в объектах игроков для передачи клиентам
    player.combination = playerCombo;
    player.points = playerCombo.points;
    nextPlayer.combination = nextPlayerCombo;
    nextPlayer.points = nextPlayerCombo.points;
    
    console.log(`📊 Комбинация ${player.name}: приоритет=${playerCombo.priority}, очки=${playerCombo.points}`);
    console.log(`📊 Комбинация ${nextPlayer.name}: приоритет=${nextPlayerCombo.priority}, очки=${nextPlayerCombo.points}`);
    
    const comparison = SekaCombinations.compareCombinations(playerCombo, nextPlayerCombo);
    const activeCount = this.getActivePlayers(true).length;
    
    // 4. Определяем результат вскрытия и сохраняем для клиентов
    // ВАЖНО: Этот объект будет использован на фронтенде для:
    // - Показа карт только вскрывающим сторонам (exposerId и exposedId видят карты друг друга)
    // - Показа сообщений о результате вскрытия
    // - Остальные игроки НЕ видят карты и видят только "🔍 ВСКРЫТИЕ!"
    let exposeResult = {
      exposerId: player.id,
      exposedId: nextPlayer.id,
      exposerName: player.name,
      exposedName: nextPlayer.name,
      exposerCombo: { priority: playerCombo.priority, points: playerCombo.points },
      exposedCombo: { priority: nextPlayerCombo.priority, points: nextPlayerCombo.points },
      exposerWins: null,
      isTie: false,
      varaInitiated: false,
      timestamp: Date.now()
    };
    
    if (comparison > 0) {
      // Вскрывающий (player) выигрывает - у него лучшая комбинация
      console.log(`✅ ${player.name} вскрыл и выиграл у ${nextPlayer.name}`);
      exposeResult.exposerWins = true;
      nextPlayer.isFolded = true;
      this.playersActed++;
      
      // Проверяем, не остался ли только один игрок
      this.checkBettingComplete();
      
    } else if (comparison < 0) {
      // Вскрываемый (nextPlayer) выигрывает - у него лучшая комбинация
      console.log(`❌ ${player.name} вскрыл и проиграл ${nextPlayer.name}`);
      exposeResult.exposerWins = false;
      player.isFolded = true;
      this.playersActed++;
      
      // Проверяем, не остался ли только один игрок
      this.checkBettingComplete();
      
    } else {
      // Комбинации ОДИНАКОВЫ -> ничья
      console.log(`🤝 Ничья при вскрытии между ${player.name} и ${nextPlayer.name}`);
      exposeResult.isTie = true;
      
      if (activeCount === 2) {
        // Ничья между двумя игроками -> ВАРА
        console.log(`🔥 Инициируется ВАРА между ${player.name} и ${nextPlayer.name}`);
        exposeResult.varaInitiated = true;
        
        // initiateVara автоматически перенесет this.pot в this.varaPot
        this.initiateVara(player.id, nextPlayer.id, player.id); // Инициатор - вскрывающий
        
        // Сохраняем результат вскрытия перед выходом
        this.exposeResult = exposeResult;
        
        // Отправляем состояние с результатом вскрытия
        if (this.onStateUpdate) {
          this.onStateUpdate(this.getGameState());
        }
        
        // Выходим, так как игра переходит в состояние Вары
        return;
          } else {
        // Ничья при >2 игроков -> Вскрывающий падает (правило)
        console.log(`❌ Ничья при ${activeCount} игроках - вскрывающий ${player.name} проигрывает`);
        exposeResult.exposerWins = false;
        player.isFolded = true;
        this.playersActed++;
        
        // Проверяем, не остался ли только один игрок
        this.checkBettingComplete();
      }
    }
    
    // Сохраняем результат вскрытия
    this.exposeResult = exposeResult;
    
    // Отправляем состояние с результатом вскрытия (карты будут видны только вскрывающим сторонам)
    if (this.onStateUpdate) {
      this.onStateUpdate(this.getGameState());
    }
    
    // ИСПРАВЛЕНИЕ БАГ #3: Увеличена задержка для очистки exposeResult (5 секунд вместо 3)
    // Это дает клиентам больше времени для получения состояния и отображения анимаций
    // ИСПРАВЛЕНИЕ БАГ #11: Очищаем только если игра все еще в том же состоянии
    // Очищаем предыдущий таймер если есть
    if (this.exposeResultTimer) {
      clearTimeout(this.exposeResultTimer);
    }
    
    this.exposeResultTimer = setTimeout(() => {
      // Очищаем только если игра не перешла в ВАРУ или другое состояние
      if (this.exposeResult && 
          this.gameState !== 'waiting_for_vara_join' && 
          this.gameState !== 'vara' && 
          this.gameState !== 'winner_vara_choice') {
        this.exposeResult = null;
        this.exposeResultTimer = null;
        if (this.onStateUpdate) {
          this.onStateUpdate(this.getGameState());
        }
      }
    }, 5000); // Увеличено до 5 секунд
  }

  // Обработка входа в Вару
  handleJoinVara(player, amount) {
    if (this.gameState !== 'waiting_for_vara_join') {
      throw new Error('Вары нет в данный момент');
    }
    
    const requiredAmount = Math.floor(this.varaPot * SEKA_RULES.VARA_ENTRY_COST_MULTIPLIER);
    
    if (amount < requiredAmount) {
      throw new Error(`Для входа в Вару нужно минимум ${requiredAmount}`);
    }
    
    if (player.chips < amount) {
      throw new Error('Недостаточно фишек');
    }
    
    console.log(`🎯 ${player.name} входит в Вару с ${amount}`);
    player.chips -= amount;
    player.isInVara = true;
    this.varaPlayers.push(player.id);
    this.varaPot += amount;
    
    // Добавляем баланс-дельту
    if (!this.balanceDeltas) this.balanceDeltas = [];
    if (amount > 0) this.balanceDeltas.push({ playerId: player.id, delta: -amount });
    
    // Проверяем, все ли игроки сделали выбор
    this.checkVaraJoinComplete();
  }
  
  // Проверка завершения вступления в Вару
  checkVaraJoinComplete() {
    const nonVaraPlayers = this.players.filter(p => !p.isInVara && !p.isSleeping);
    
    if (nonVaraPlayers.length === 0) {
      console.log('🎯 Все игроки вступили в Вару - начинаем раунд');
      this.startVaraRound();
    } else {
      console.log(`🎯 Ожидаем решения от ${nonVaraPlayers.length} игроков`);
      
      // Даем ход следующему игроку, который должен принять решение
      this.nextVaraPlayer();
    }
  }
  
  // Переход к следующему игроку для принятия решения о Варе
  nextVaraPlayer() {
    let attempts = 0;
    const maxAttempts = this.players.length;
    
    do {
      this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
      attempts++;
    } while (
      (this.players[this.currentPlayer].isInVara || 
       this.players[this.currentPlayer].isSleeping) && 
      attempts < maxAttempts
    );
    
    if (attempts >= maxAttempts) {
      console.log('🎯 Все игроки приняли решение о Варе');
      this.startVaraRound();
    } else {
      console.log(`🎯 Ход игрока ${this.players[this.currentPlayer].name} для решения о Варе`);
      this.startTurnTimer();
    }
    
    // Отправляем обновление состояния
    if (this.onStateUpdate) {
      this.onStateUpdate(this.getGameState());
    }
  }

  // Обработка отказа от Вары
  handleRefuseVara(player) {
    if (this.gameState !== 'waiting_for_vara_join') {
      throw new Error('Вары нет в данный момент');
    }
    
    console.log(`❌ ${player.name} отказывается от Вары`);
    // Игрок остается вне Вары
    
    // Проверяем, все ли игроки сделали выбор
    this.checkVaraJoinComplete();
  }

  // Проверка завершения торгов
  checkBettingComplete() {
    // ИСПРАВЛЕНИЕ БАГ #14: Проверяем, не вызывается ли showdown повторно
    if (this.gameState === 'showdown' || this.gameState === 'finished') {
      console.warn('⚠️ checkBettingComplete() вызван в состоянии showdown/finished - игнорируем');
      return;
    }
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Получаем активных игроков
    // Игроки с isAllIn НЕ участвуют в дальнейших торгах, но остаются в игре для showdown
    // Поэтому при проверке завершения торгов учитываем их отдельно
    const activePlayers = this.getActivePlayers(true).filter(p => !p.isAllIn && !p.isFolded);
    const allInPlayers = this.getActivePlayers(true).filter(p => p.isAllIn && !p.isFolded);
    
    console.log(`📊 Проверка завершения торгов:`);
    console.log(`   - Активных игроков (могут делать ходы): ${activePlayers.length}`);
    console.log(`   - Игроков ва-банк (ждут showdown): ${allInPlayers.length}`);
    console.log(`   - Круг торгов: ${this.bettingRound}`);
    console.log(`   - Игроков действовало: ${this.playersActed}`);
    console.log(`   - Текущая ставка: ${this.currentBet}`);
    
    // КРИТИЧЕСКОЕ УСЛОВИЕ 1: Если остался только один активный игрок (без учета all-in) - СРАЗУ завершаем
    // Или если все активные игроки пошли ва-банк
    if (activePlayers.length <= 1 && allInPlayers.length === 0) {
      console.log('🏁 Остался один активный игрок - завершаем торги и вызываем showdown');
      this.showdown();
      return;
    }
    
    // Если все активные игроки пошли ва-банк, также завершаем
    if (activePlayers.length === 0 && allInPlayers.length > 0) {
      console.log('🏁 Все активные игроки пошли ва-банк - завершаем торги и вызываем showdown');
      this.showdown();
      return;
    }
    
    // КРИТИЧЕСКОЕ УСЛОВИЕ 2: Все ставки должны быть уравнены
    // ВАЖНО: После анте все игроки имеют currentBet = ANTE_AMOUNT, а this.currentBet = 0
    // Поэтому если currentBet === 0 и все игроки имеют одинаковую ставку (анте), это тоже "уравнено"
    let allEqual = false;
    if (activePlayers.length > 0) {
      if (this.currentBet === 0) {
        // После анте: проверяем что все имеют одинаковую ставку (анте)
        const firstBet = activePlayers[0].currentBet;
        allEqual = activePlayers.every(p => p.currentBet === firstBet);
      } else {
        // Во время торгов: проверяем что все имеют currentBet равную this.currentBet
        allEqual = activePlayers.every(p => p.currentBet === this.currentBet);
      }
    }
    
    // КРИТИЧЕСКОЕ УСЛОВИЕ 3: Прошел полный круг - все активные игроки действовали после последнего повышения
    // ВАЖНО: playersActed должен быть >= activePlayers.length (все действовали)
    const fullRound = activePlayers.length > 0 && this.playersActed >= activePlayers.length;
    
    // КРИТИЧЕСКОЕ: При проверке равенства ставок учитываем что all-in игроки уже не могут уравнять
    // Проверяем равенство для активных игроков, а all-in игроки должны иметь ставку >= currentBet
    const allInEqual = allInPlayers.length === 0 || allInPlayers.every(p => p.currentBet >= this.currentBet);
    
    console.log(`   - Все ставки уравнены (активные): ${allEqual}`);
    console.log(`   - Все ва-банк игроки с правильными ставками: ${allInEqual}`);
    console.log(`   - Прошел полный круг: ${fullRound} (${this.playersActed}/${activePlayers.length})`);
    console.log(`   - Текущая ставка: ${this.currentBet}`);
    console.log(`   - Ставки активных игроков:`, activePlayers.map(p => `${p.name}: ${p.currentBet}`).join(', '));
    if (allInPlayers.length > 0) {
      console.log(`   - Ставки ва-банк игроков:`, allInPlayers.map(p => `${p.name}: ${p.currentBet} (ВА-БАНК)`).join(', '));
    }
    
    // КРИТИЧЕСКОЕ УСЛОВИЕ: Только если все условия выполнены
    // 1. Есть активные игроки или только all-in игроки
    // 2. Все активные игроки уравняли ставки
    // 3. Все all-in игроки имеют ставку >= currentBet
    // 4. Прошел полный круг торгов
    if ((activePlayers.length > 0 || allInPlayers.length > 0) && allEqual && allInEqual && fullRound) {
      if (this.bettingRound < SEKA_RULES.BETTING_ROUNDS) {
        // Переходим к следующему кругу торгов
        this.bettingRound++;
        console.log(`🔄 Переходим к кругу ${this.bettingRound}`);
        // Сбрасываем счетчики для нового круга
        this.playersActed = 0;
        this.lastRaiser = null;
      } else {
        // Все круги завершены - ВЫЗЫВАЕМ SHOWDOWN
        console.log('🔍 Все круги торгов завершены - ВЫЗЫВАЕМ SHOWDOWN');
        this.showdown();
        return;
      }
    } else {
      // Торги еще не завершены - не вызываем showdown
      console.log(`⏳ Торги продолжаются: allEqual=${allEqual}, fullRound=${fullRound}`);
    }
  }

  // Вскрытие карт и определение победителя
  showdown() {
    console.log('🔍 ВСКРЫТИЕ КАРТ');
    
    // ИСПРАВЛЕНИЕ БАГ #14: Проверяем, не вызывается ли showdown повторно
    if (this.gameState === 'showdown') {
      console.warn('⚠️ showdown() вызван повторно - игнорируем');
      return;
    }
    
    this.gameState = 'showdown';
    
    // ИСПРАВЛЕНИЕ: Очищаем lastAction при начале showdown, чтобы не показывать сообщения о действиях после определения победителя
    this.lastAction = null;
    
    // ИСПРАВЛЕНИЕ БАГ #17: Очищаем exposeResultTimer при начале showdown
    if (this.exposeResultTimer) {
      clearTimeout(this.exposeResultTimer);
      this.exposeResultTimer = null;
    }
    
    // Раскрываем карты всех активных игроков для showdown
    this.players.forEach(player => {
      if (!player.isFolded && !player.isSleeping) {
        // Карты уже должны быть видны, но убедимся что они есть
        // Карты не очищаются в showdown, они остаются видимыми
      }
    });
    
    // Отправляем состояние showdown клиентам сразу
    if (this.onStateUpdate) {
      this.onStateUpdate(this.getGameState());
    }
    
    const activePlayers = this.getActivePlayers(true);
    
    if (activePlayers.length === 0) {
      console.log('❌ Все игроки сбросили карты');
      // Даем время для анимаций
      setTimeout(() => {
        this.startVoteNewRound();
      }, 4000);
      return;
    }
    
    if (activePlayers.length === 1) {
      // Один игрок остался
      this.winner = activePlayers[0];
      this.winners = [{ player: this.winner }];
      console.log(`🏆 Победитель: ${this.winner.name}`);
      this.distributePot();
      
      // Отправляем состояние с победителем
      if (this.onStateUpdate) {
        this.onStateUpdate(this.getGameState());
      }
      
      // ИСПРАВЛЕНИЕ БАГ #6: Проверяем, не перешла ли игра в winner_vara_choice
      // Если перешла - не начинаем голосование
      if (this.gameState === 'winner_vara_choice') {
        console.log('🎯 Победитель должен выбрать - Вара или забрать выигрыш');
        return;
      }
      
      // Даем время для анимаций: победитель (2 сек) + баланс (2 сек) = 4 секунды
      setTimeout(() => {
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем состояние перед началом голосования
        // Начинаем голосование если игра в showdown или finished (недостаточно игроков)
        // Передаем ID победителя как инициатора голосования
        if (this.gameState === 'showdown' || this.gameState === 'finished') {
          console.log('🗳️ Начинаем голосование после showdown (один победитель, состояние:', this.gameState, ')');
          this.startVoteNewRound(this.winner?.id || null);
        } else {
          console.log('⏸️ Пропуск голосования - состояние игры изменилось:', this.gameState);
        }
      }, 4000);
      return;
    }
    
    // Определяем победителя среди активных игроков
    this.determineWinner();
    this.distributePot();
    
    // Отправляем состояние с результатами
    if (this.onStateUpdate) {
      this.onStateUpdate(this.getGameState());
    }
    
    // ИСПРАВЛЕНИЕ БАГ #6: Проверяем, не перешла ли игра в winner_vara_choice после distributePot
    // Это может произойти если победитель получил чистую СЕКУ ТУЗОВ
    if (this.gameState === 'winner_vara_choice') {
      console.log('🎯 Победитель должен выбрать - Вара или забрать выигрыш');
      return; // Не продолжаем дальше, ждем выбор победителя
    }
    
    // Проверяем на Вару (ничья между двумя игроками)
    if (this.winners.length === 2 && this.gameState === 'showdown') {
      const player1 = this.winners[0].player;
      const player2 = this.winners[1].player;
      
      console.log(`🎯 Ничья между ${player1.name} и ${player2.name} - инициируем Вару`);
      
      // Даем время для анимаций перед переходом в Вару
      setTimeout(() => {
        // Проверяем состояние еще раз перед переходом в Вару
        if (this.gameState === 'showdown') {
          // Инициатором Вары становится первый игрок, который был в ничьей
          this.initiateVara(player1.id, player2.id, player1.id);
        }
      }, 4000);
    } else {
      // Даем время для анимаций: победитель (2 сек) + баланс (2 сек) = 4 секунды
      setTimeout(() => {
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем состояние перед началом голосования
        // Начинаем голосование если игра в showdown или finished (недостаточно игроков)
        // Если есть единственный победитель, передаем его ID как инициатора
        if (this.gameState === 'showdown' || this.gameState === 'finished') {
          const initiatorId = this.winner?.id || (this.winners && this.winners.length === 1 && this.winners[0]?.player?.id) || null;
          console.log('🗳️ Начинаем голосование после showdown (множественные победители или ничья, состояние:', this.gameState, ')');
          this.startVoteNewRound(initiatorId);
        } else {
          console.log('⏸️ Пропуск голосования - состояние игры изменилось:', this.gameState);
        }
      }, 4000);
    }
  }

  // Определение победителя
  determineWinner() {
    console.log('🏆 Определяем победителя...');
    
    const activePlayers = this.getActivePlayers(true);
    
    // Вычисляем комбинации для всех активных игроков и сохраняем их в объектах игроков
    const playerCombinations = activePlayers.map(player => {
      const combination = this.getCombinationRank(player.cards);
      // Сохраняем комбинацию в объекте игрока для отправки клиентам
      player.combination = combination;
      player.points = combination.points;
      return {
        player: player,
        combination: combination
      };
    });
    
    // Сортируем по силе комбинации
    playerCombinations.sort((a, b) => this.compareCombinations(b.combination, a.combination));
    
    console.log('📊 Результаты:');
    playerCombinations.forEach((pc, index) => {
      console.log(`${index + 1}. ${pc.player.name}: Очки=${pc.combination.points}, Приоритет=${pc.combination.priority}`);
    });
    
    // Определяем победителей (может быть ничья)
    this.winners = [playerCombinations[0]];
    
    for (let i = 1; i < playerCombinations.length; i++) {
      if (this.compareCombinations(playerCombinations[i].combination, playerCombinations[0].combination) === 0) {
        this.winners.push(playerCombinations[i]);
      } else {
          break;
      }
    }
    
    if (this.winners.length === 1) {
      this.winner = this.winners[0].player;
      console.log(`🏆 Единственный победитель: ${this.winner.name}`);
    } else {
      console.log(`🤝 Ничья между ${this.winners.length} игроками`);
    }
  }

  // Распределение банка
  distributePot() {
    console.log(`💰 Распределяем банк: ${this.pot}`);
    const deltas = {};
    const addDelta = (playerId, amount) => { deltas[playerId] = (deltas[playerId] || 0) + amount; };
    
    if (this.winners.length === 1) {
      // Единственный победитель
      const winner = this.winners[0].player;
      winner.chips += this.pot;
      addDelta(winner.id, this.pot);
      console.log(`💰 ${winner.name} получает ${this.pot} фишек`);
      
      // Проверяем на чистую СЕКУ ТУЗОВ
      const winnerCombo = this.getCombinationRank(winner.cards);
      if (winnerCombo.isSekaTuzovNoJoker) {
        this.handleSekaTuzovWin(winner);
      }
      
      // УБРАНО: offerVaraToWinner() - после мгновенной победы сразу переходим к голосованию
      // Выплата уже произошла автоматически, следующий шаг - голосование за новый раунд
    } else {
      // Ничья - делим банк
      const sharePerPlayer = Math.floor(this.pot / this.winners.length);
      const remainder = this.pot % this.winners.length;
      
      this.winners.forEach((winner, index) => {
        const amount = sharePerPlayer + (index === 0 ? remainder : 0);
        winner.player.chips += amount;
        addDelta(winner.player.id, amount);
        console.log(`💰 ${winner.player.name} получает ${amount} фишек`);
      });
    }
    
    // Сбрасываем банк
    this.pot = 0;
    // Сохраняем дельты для клиента
    // ИСПРАВЛЕНИЕ БАГ #10: Инициализируем balanceDeltas если не существует
    if (!this.balanceDeltas) {
      this.balanceDeltas = [];
    }
    this.balanceDeltas = Object.entries(deltas).map(([playerId, delta]) => ({ playerId, delta }));
  }

  // Обработка выигрыша чистой СЕКИ ТУЗОВ
  handleSekaTuzovWin(winner) {
    console.log(`🎯 ${winner.name} выиграл чистой СЕКОЙ ТУЗОВ!`);
    
    // Каждый игрок должен заплатить победителю
    const penaltyAmount = SEKA_RULES.ANTE_AMOUNT * 2; // Двойной анте
    
    for (const player of this.players) {
      if (player.id !== winner.id && !player.isSleeping) {
        const penalty = Math.min(penaltyAmount, player.chips);
        player.chips -= penalty;
        winner.chips += penalty;
        // Аггрегируем дельты
        if (!this.balanceDeltas) this.balanceDeltas = [];
        this.balanceDeltas.push({ playerId: player.id, delta: -penalty });
        this.balanceDeltas.push({ playerId: winner.id, delta: +penalty });
        console.log(`💰 ${player.name} платит штраф ${penalty} за СЕКУ ТУЗОВ`);
      }
    }
  }
  
  // Обработка штрафа сдатчика
  handleDealerPenalty() {
    const dealer = this.players.find(p => p.id === this.dealerId);
    if (!dealer) return;
    
    const penaltyAmount = Math.floor(this.pot / 2);
    console.log(`💰 Штраф сдатчика ${dealer.name}: ${penaltyAmount}`);
    
    dealer.chips -= penaltyAmount;
    this.pot += penaltyAmount;
    if (!this.balanceDeltas) this.balanceDeltas = [];
    if (penaltyAmount > 0) this.balanceDeltas.push({ playerId: dealer.id, delta: -penaltyAmount });
    
    console.log(`💰 Кон увеличен на ${penaltyAmount} за счет штрафа сдатчика`);
  }

  // Предложение Вары победителю
  offerVaraToWinner(winner) {
    console.log(`🎯 Предлагаем ${winner.name} инициировать Вару`);
    this.gameState = 'winner_vara_choice';
    this.currentPlayer = this.players.findIndex(p => p.id === winner.id);
    
    // Останавливаем таймер
    this.clearTurnTimer();
    
    // Отправляем обновление состояния
    if (this.onStateUpdate) {
      this.onStateUpdate(this.getGameState());
    }
  }
  
  // Обработка выбора победителя (Вару или забрать выигрыш)
  handleWinnerChoice(playerId, choice) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.gameState !== 'winner_vara_choice') {
      throw new Error('Неверное состояние для выбора победителя');
    }
    
    if (choice === 'vara') {
      console.log(`🎯 ${player.name} выбирает Вару`);
      this.initiateVara(playerId, null, playerId);
    } else if (choice === 'collect') {
      console.log(`💰 ${player.name} забирает выигрыш`);
      this.startNewRound();
    } else {
      throw new Error('Неверный выбор: vara или collect');
    }
  }

  // Инициация Вары
  initiateVara(player1Id, player2Id = null, initiatorId) {
    console.log('🎯 ИНИЦИАЦИЯ ВАРЫ');
    
    // ИСПРАВЛЕНИЕ БАГ #17: Очищаем exposeResultTimer при инициации Вары
    if (this.exposeResultTimer) {
      clearTimeout(this.exposeResultTimer);
      this.exposeResultTimer = null;
      this.exposeResult = null; // Очищаем exposeResult
    }
    
    this.gameState = 'waiting_for_vara_join';
    this.varaPot = this.pot;
    this.pot = 0;
    
    // Определяем варящихся игроков
    if (player2Id) {
      // Вара между двумя конкретными игроками (из вскрытия)
      this.varaPlayers = [player1Id, player2Id];
    } else {
      // Вара по инициативе победителя
      this.varaPlayers = [player1Id];
    }
    
    this.varaInitiator = initiatorId;
    
    console.log(`🎯 Варящиеся игроки: ${this.varaPlayers.map(id => this.getPlayerName(id)).join(', ')}`);
    console.log(`🎯 Кон Вары: ${this.varaPot}`);
    console.log(`🎯 Ожидаем вступления других игроков в Вару...`);
    
    // Сбрасываем состояние игроков для Вары
    for (const player of this.players) {
      player.isFolded = false;
      player.isAllIn = false;
      player.currentBet = 0;
      player.totalBet = 0;
      player.isInVara = this.varaPlayers.includes(player.id);
    }
    
    // Останавливаем таймер
    this.clearTurnTimer();
    
    // Начинаем фазу принятия решений о Варе
    this.currentPlayer = this.getNextPlayerIndex(this.players.findIndex(p => p.id === this.varaInitiator));
    
    // Отправляем обновление состояния
    if (this.onStateUpdate) {
      this.onStateUpdate(this.getGameState());
    }
    
    // Запускаем таймер для первого игрока
    this.startTurnTimer();
  }

  // Начало раунда Вары
  startVaraRound() {
    console.log('🎯 Начинаем раунд Вары');
    
    // Валидация: В Варе должно быть минимум 2 игрока
    if (!this.varaPlayers || this.varaPlayers.length < 2) {
      console.warn('⚠️ В Варе меньше 2 игроков - завершаем Вару');
      this.endVara();
      return;
    }
    
    // Увеличиваем ID раунда для трейсинга (Вара = новый раунд)
    this.roundId = (this.roundId || 0) + 1;
    
    // Вара — отдельный режим торгов между ограниченным набором игроков
    this.gameState = 'vara';
    this.bettingRound = 1;
    this.playersActed = 0;
    this.currentBet = 0;
    this.lastRaiser = null;
    
    // Подготовка статусов игроков: участники Вары активны, остальные спят
    for (const player of this.players) {
      const inVara = this.varaPlayers.includes(player.id);
      player.isSleeping = !inVara;
      player.isFolded = false;
      player.currentBet = 0;
      player.totalBet = player.totalBet || 0;
      player.cards = [];
    }
    
    // Создаем новую колоду и раздаем карты только варящимся игрокам
    this.createDeck();
    this.shuffleDeck();
    for (let cardIndex = 0; cardIndex < SEKA_RULES.CARDS_PER_PLAYER; cardIndex++) {
      for (const playerId of this.varaPlayers) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
          const card = this.deck.pop();
          player.cards.push(card);
        }
      }
    }
    
    // Сдатчик в Варе — инициатор, ходит следующий активный после него
    const dealerIndex = this.players.findIndex(p => p.id === this.varaInitiator);
    this.dealerId = this.varaInitiator;
    this.currentPlayer = dealerIndex;
    const nextIdx = this.getNextPlayerIndex(dealerIndex);
    this.currentPlayer = nextIdx;
    // Отправляем состояние до запуска таймера, чтобы клиенты видели режим 'vara'
    if (this.onStateUpdate) {
      this.onStateUpdate(this.getGameState());
    }
    
    // Запускаем таймер
    this.startTurnTimer();
  }

  // Начало голосования для нового раунда
  startVoteNewRound(initiatorId = null) {
    console.log(`⏰ Запускаем автоматический таймер на 10 секунд для начала нового раунда${initiatorId ? ` (инициатор: ${initiatorId})` : ''}`);
    
    // Устанавливаем состояние voting_new_round
    this.gameState = 'voting_new_round';
    this.voteNewRoundPlayers = [];
    this.startWithVotedConfirm = []; // Сбрасываем подтверждения
    
    // Сохраняем ID инициатора (обычно это победитель)
    if (initiatorId) {
      this.voteInitiatorId = initiatorId;
    }
    
    // Очищаем старые таймеры
    if (this.voteNewRoundTimer) {
      clearTimeout(this.voteNewRoundTimer);
      this.voteNewRoundTimer = null;
    }
    if (this.voteNewRoundTimeout) {
      clearTimeout(this.voteNewRoundTimeout);
      this.voteNewRoundTimeout = null;
    }
    
    // Устанавливаем начальное время таймера (10 секунд)
    this.voteNewRoundTimeoutSeconds = 10;
    
    // Отправляем начальное состояние с таймером
    this._sendVoteNewRoundUpdate();
    
    // Запускаем таймер обратного отсчета (обновляем каждую секунду)
    this._startVoteNewRoundCountdown();
    
    // Запускаем основной таймер на 10 секунд для автоматического начала нового раунда
    this.voteNewRoundTimeout = setTimeout(() => {
      console.log('⏰ Таймер истек - автоматически начинаем новый раунд');
      if (this.gameState === 'voting_new_round') {
        this.startNewRound();
      }
    }, 10000); // 10 секунд
  }
  
  // Внутренний метод для обратного отсчета таймера
  _startVoteNewRoundCountdown() {
    if (this.voteNewRoundCountdownInterval) {
      clearInterval(this.voteNewRoundCountdownInterval);
    }
    
    this.voteNewRoundCountdownInterval = setInterval(() => {
      if (this.gameState !== 'voting_new_round') {
        // Если состояние изменилось, останавливаем таймер
        clearInterval(this.voteNewRoundCountdownInterval);
        this.voteNewRoundCountdownInterval = null;
        return;
      }
      
      this.voteNewRoundTimeoutSeconds--;
      
      // Отправляем обновление клиентам каждую секунду
      this._sendVoteNewRoundUpdate();
      
      if (this.voteNewRoundTimeoutSeconds <= 0) {
        // Таймер истек, очищаем интервал (основной таймер уже запустит startNewRound)
        clearInterval(this.voteNewRoundCountdownInterval);
        this.voteNewRoundCountdownInterval = null;
      }
    }, 1000); // Обновляем каждую секунду
  }
  
  // Метод для отправки обновления состояния голосования
  _sendVoteNewRoundUpdate() {
    if (this.onStateUpdate) {
      const gameState = this.getGameState();
      // Добавляем информацию о таймере в состояние
      gameState.voteNewRoundTimeoutSeconds = this.voteNewRoundTimeoutSeconds;
      this.onStateUpdate(gameState);
    }
  }
  
  // Голосование за новый раунд
  voteNewRound(playerId) {
    if (this.gameState !== 'voting_new_round') {
      throw new Error('Голосование не активно');
    }
    
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Игрок не найден');
    }
    
    // ИСПРАВЛЕНИЕ БАГ #1: Проверка что игрок не в спящем режиме
    if (player.isSleeping) {
      throw new Error('Спящие игроки не могут голосовать');
    }
    
    if (this.voteNewRoundPlayers.includes(playerId)) {
      // Игрок уже проголосовал - убираем его голос
      this.voteNewRoundPlayers = this.voteNewRoundPlayers.filter(id => id !== playerId);
      console.log(`❌ ${player.name} отозвал голос`);
      
      // ИСПРАВЛЕНИЕ БАГ #4: Очищаем таймер если количество голосов изменилось
      if (this.voteNewRoundTimeout) {
        clearTimeout(this.voteNewRoundTimeout);
        this.voteNewRoundTimeout = null;
        console.log('⏰ Таймер "Начать втроем" очищен из-за отзыва голоса');
      }
    } else {
      // Игрок голосует
      this.voteNewRoundPlayers.push(playerId);
      console.log(`✅ ${player.name} проголосовал за новый раунд`);
    }
    
    const totalPlayers = this.players.filter(p => !p.isSleeping).length;
    const votedCount = this.voteNewRoundPlayers.length;
    
    console.log(`🗳️ Голосование: ${votedCount}/${totalPlayers}`);
    
    // Если все проголосовали - начинаем сразу
    if (votedCount === totalPlayers && totalPlayers >= SEKA_RULES.MIN_PLAYERS) {
      console.log('✅ Все игроки проголосовали - начинаем новый раунд');
      // Очищаем таймер если он был запущен
      if (this.voteNewRoundTimeout) {
        clearTimeout(this.voteNewRoundTimeout);
        this.voteNewRoundTimeout = null;
      }
      this.startNewRound();
      return { allVoted: true };
    }
    
    // Если 3 из 4 проголосовали - запускаем таймер на 10 секунд
    if (totalPlayers === 4 && votedCount === 3) {
      console.log('⏰ 3 из 4 игроков проголосовали - через 10 секунд появится кнопка "Начать втроем"');
      
      // Очищаем предыдущий таймер если есть
      if (this.voteNewRoundTimeout) {
        clearTimeout(this.voteNewRoundTimeout);
      }
      
      this.voteNewRoundTimeout = setTimeout(() => {
        if (this.gameState === 'voting_new_round' && this.voteNewRoundPlayers.length === 3) {
          console.log('🔔 Кнопка "Начать втроем" активирована (прошло 10 секунд)');
          // Таймер сработал - теперь readyToStartWithVoted будет true в getGameState
          // Отправляем обновление состояния
          if (this.onStateUpdate) {
            this.onStateUpdate(this.getGameState());
          }
        }
      }, 10000);
    } else {
      // ИСПРАВЛЕНИЕ БАГ #4: Если условие 3/4 больше не выполняется - очищаем таймер
      if (this.voteNewRoundTimeout && !(totalPlayers === 4 && votedCount === 3)) {
        clearTimeout(this.voteNewRoundTimeout);
        this.voteNewRoundTimeout = null;
        console.log('⏰ Таймер "Начать втроем" очищен - условие больше не выполняется');
      }
    }
    
    // НЕ отправляем обновление здесь - это делает server.js после вызова voteNewRound
    // Убрано, чтобы избежать двойной отправки
    
    return { 
      allVoted: false, 
      votedCount, 
      totalPlayers,
      readyToStartWithVoted: false
    };
  }
  
  // Обработка голосования за новый раунд (новый метод с параметром vote)
  handleVoteNewRound(playerId, vote) {
    if (this.gameState !== 'voting_new_round') {
      throw new Error('Неправильное состояние игры для голосования.');
    }
    
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Игрок не найден');
    }
    
    // ИСПРАВЛЕНИЕ БАГ #1: Проверка что игрок не в спящем режиме
    if (player.isSleeping) {
      throw new Error('Спящие игроки не могут голосовать');
    }
    
    const playerIndex = this.voteNewRoundPlayers.indexOf(playerId);
    
    if (vote === true) {
      // Голос "ЗА" (готов)
      if (playerIndex === -1) {
        this.voteNewRoundPlayers.push(playerId);
        console.log(`✅ ${player.name} проголосовал за новый раунд`);
      }
    } else {
      // Голос "ПРОТИВ" (отказался или отменил готовность)
      if (playerIndex !== -1) {
        this.voteNewRoundPlayers.splice(playerIndex, 1);
        console.log(`❌ ${player.name} отозвал голос`);
        
        // ИСПРАВЛЕНИЕ БАГ #4: Очищаем таймер если количество голосов изменилось
        if (this.voteNewRoundTimeout) {
          clearTimeout(this.voteNewRoundTimeout);
          this.voteNewRoundTimeout = null;
          console.log('⏰ Таймер "Начать втроем" очищен из-за отзыва голоса');
        }
      }
    }
    
    // Получаем общее количество активных игроков (которые должны голосовать)
    const activePlayersCount = this.players.filter(p => !p.isSleeping && p.chips > 0).length;
    const votedCount = this.voteNewRoundPlayers.length;
    
    console.log(`🗳️ Голосование: ${votedCount}/${activePlayersCount}`);
    
    // Проверка достижения консенсуса (когда все активные проголосовали "ЗА")
    if (votedCount === activePlayersCount && activePlayersCount >= SEKA_RULES.MIN_PLAYERS) {
      console.log(`✅ Консенсус достигнут: ${activePlayersCount} игроков проголосовали за.`);
      
      // Очищаем таймер если он был запущен
      if (this.voteNewRoundTimeout) {
        clearTimeout(this.voteNewRoundTimeout);
        this.voteNewRoundTimeout = null;
      }
      
      // Автоматический запуск нового раунда
      this.startNewRound();
      
      // Отправляем обновление состояния
      if (this.onStateUpdate) {
        this.onStateUpdate(this.getGameState());
      }
      
      return { roundStarted: true };
    }
    
    // Если 3 из 4 проголосовали - запускаем таймер на 10 секунд
    if (activePlayersCount === 4 && votedCount === 3) {
      console.log('⏰ 3 из 4 игроков проголосовали - через 10 секунд появится кнопка "Начать втроем"');
      
      // Очищаем предыдущий таймер если есть
      if (this.voteNewRoundTimeout) {
        clearTimeout(this.voteNewRoundTimeout);
      }
      
      this.voteNewRoundTimeout = setTimeout(() => {
        if (this.gameState === 'voting_new_round' && this.voteNewRoundPlayers.length === 3) {
          console.log('🔔 Кнопка "Начать втроем" активирована (прошло 10 секунд)');
          // Отправляем обновление состояния
          if (this.onStateUpdate) {
            this.onStateUpdate(this.getGameState());
          }
        }
      }, 10000);
    } else {
      // ИСПРАВЛЕНИЕ БАГ #4: Если условие 3/4 больше не выполняется - очищаем таймер
      if (this.voteNewRoundTimeout && !(activePlayersCount === 4 && votedCount === 3)) {
        clearTimeout(this.voteNewRoundTimeout);
        this.voteNewRoundTimeout = null;
        console.log('⏰ Таймер "Начать втроем" очищен - условие больше не выполняется');
      }
    }
    
    // НЕ отправляем обновление здесь - это делает server.js после вызова handleVoteNewRound
    // Убрано, чтобы избежать двойной отправки
    
    return { 
      roundStarted: false, 
      votesFor: votedCount, 
      total: activePlayersCount 
    };
  }
  
  // Начать игру с проголосовавшими игроками
  startWithVotedPlayers() {
    if (this.gameState !== 'voting_new_round') {
      throw new Error('Голосование не активно');
    }
    
    const totalPlayers = this.players.filter(p => !p.isSleeping).length;
    const votedCount = this.voteNewRoundPlayers.length;
    
    // Проверяем условие: должно быть минимум 3 проголосовавших из 4, или все
    if (totalPlayers === 4 && votedCount === 3) {
      // Делаем спящими тех, кто не проголосовал
      this.players.forEach(player => {
        if (!this.voteNewRoundPlayers.includes(player.id)) {
          player.isSleeping = true;
          console.log(`😴 ${player.name} переходит в режим ожидания`);
        }
      });
      
      // Очищаем голосование и подтверждения
      this.voteNewRoundPlayers = [];
      this.startWithVotedConfirm = [];
      if (this.voteNewRoundTimeout) {
        clearTimeout(this.voteNewRoundTimeout);
        this.voteNewRoundTimeout = null;
      }
      
      console.log('🎮 Начинаем новую игру с проголосовавшими игроками');
      this.startNewRound();
      return { success: true };
    }
    
    throw new Error('Недостаточно игроков для начала игры');
  }

  // Начало нового раунда
  startNewRound() {
    console.log('🔄 Начинаем новый раунд');
    
    // ИСПРАВЛЕНИЕ БАГ #17: Очищаем exposeResultTimer при начале нового раунда
    if (this.exposeResultTimer) {
      clearTimeout(this.exposeResultTimer);
      this.exposeResultTimer = null;
      this.exposeResult = null; // Очищаем exposeResult
    }
    
    // Очищаем голосование и подтверждения
    this.voteNewRoundPlayers = [];
    this.startWithVotedConfirm = [];
    if (this.voteNewRoundTimer) {
      clearTimeout(this.voteNewRoundTimer);
      this.voteNewRoundTimer = null;
    }
    if (this.voteNewRoundTimeout) {
      clearTimeout(this.voteNewRoundTimeout);
      this.voteNewRoundTimeout = null;
    }
    if (this.voteNewRoundCountdownInterval) {
      clearInterval(this.voteNewRoundCountdownInterval);
      this.voteNewRoundCountdownInterval = null;
    }
    this.voteNewRoundTimeoutSeconds = 0;
    
    // Увеличиваем ID раунда для трейсинга
    this.roundId = (this.roundId || 0) + 1;
    
    // ИСПРАВЛЕНИЕ БАГ #2: НЕ очищаем balanceDeltas сразу - они нужны клиентам для анимаций
    // balanceDeltas будут очищены после того, как клиенты получат состояние с анимациями
    // Очистка происходит в server.js после отправки через Pusher
    
    // Проверяем, можно ли продолжить игру
    const activePlayers = this.players.filter(p => p.chips > 0 && !p.isSleeping);
    
    if (activePlayers.length < SEKA_RULES.MIN_PLAYERS) {
      console.log('🏁 Недостаточно игроков для продолжения игры - начинаем голосование');
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Вместо установки 'finished', начинаем голосование для нового раунда
      this.startVoteNewRound();
      return;
    }
    
    // Сбрасываем состояние игроков
    this.resetPlayerStates();
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Создаем новую колоду для нового раунда
    // Проверяем, есть ли карты в колоде, если нет или мало - создаем новую
    const neededCards = activePlayers.length * SEKA_RULES.CARDS_PER_PLAYER;
    if (!this.deck || this.deck.length < neededCards) {
      console.log('🃏 Колода пуста или недостаточно карт - создаем новую колоду');
      this.createDeck();
      this.shuffleDeck();
      console.log(`🃏 Создана новая колода: ${this.deck.length} карт`);
    }
    
    // РОТАЦИЯ СДАТЧИКА
    let dealerIndex = this.players.findIndex(p => p.id === this.dealerId);
    if (dealerIndex === -1) {
      // Если сдатчик не найден, выбираем первого активного игрока
      dealerIndex = 0;
      for (let i = 0; i < this.players.length; i++) {
        if (!this.players[i].isSleeping) {
          dealerIndex = i;
          break;
        }
      }
    }
    dealerIndex = (dealerIndex + 1) % this.players.length;
    
    // Находим следующего активного игрока, если текущий спящий
    while (this.players[dealerIndex].isSleeping && dealerIndex < this.players.length) {
      dealerIndex = (dealerIndex + 1) % this.players.length;
    }
    
    this.dealerId = this.players[dealerIndex].id;
    console.log(`🔄 Новый сдатчик: ${this.getPlayerName(this.dealerId)}`);
    
    // АКТИВАЦИЯ ШТРАФА СДАТЧИКА (опционально)
    // Раскомментируйте следующую строку для активации штрафа сдатчика:
    // this.handleDealerPenalty();
    
    // Собираем анте
    this.collectAnte();
    
    // Раздаем карты
    this.dealCards();
    
    // Переходим к торговле
    this.gameState = 'betting';
    this.bettingRound = 1;
    this.playersActed = 0;
    // КРИТИЧЕСКОЕ: После анте currentBet должна быть равна ANTE_AMOUNT (все внесли анте)
    // Но для торгов мы сбрасываем currentBet в 0, чтобы первый игрок мог сделать первую ставку
    this.currentBet = 0; // Первая ставка начинается с 0 (после анте все уравняли на анте)
    this.lastRaiser = null;
    
    console.log(`🎮 Начинаем торги: круг ${this.bettingRound}, текущая ставка: ${this.currentBet}`);
    
    // Текущий игрок (первое слово) - следующий после сдатчика
    this.currentPlayer = this.getNextPlayerIndex(dealerIndex);
    
    // Запускаем таймер хода
    this.startTurnTimer();
    
    console.log(`🎯 Новый раунд начат! Раунд #${this.roundId}, Сдатчик: ${this.getPlayerName(this.dealerId)}, текущий игрок: ${this.players[this.currentPlayer].name}`);
    
    // КРИТИЧЕСКОЕ: Отправляем обновление состояния (если обработчик установлен)
    if (this.onStateUpdate) {
      this.onStateUpdate(this.getGameState());
    }
  }

  // Сброс состояния игроков
  resetPlayerStates() {
    for (const player of this.players) {
      player.cards = [];
      player.currentBet = 0;
      player.totalBet = 0;
      player.isFolded = false;
      player.isAllIn = false;
      player.isInVara = false;
      player.combination = null;
      player.points = 0;
    }
    
    // Сбрасываем информацию о последнем действии
    this.lastAction = null;
    
    this.winner = null;
    this.winners = [];
    this.varaPot = 0;
    this.varaPlayers = [];
    this.varaInitiator = null;
  }

  // Поиск первого активного игрока
  findFirstActivePlayer() {
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.isFolded && !player.isAllIn && !player.isSleeping) {
        this.currentPlayer = i;
        return;
      }
    }
    
    // Если не нашли активного игрока
    this.currentPlayer = 0;
  }

  // Переход к следующему игроку
  nextPlayer() {
    if (!this.players || this.players.length === 0) {
      console.error('❌ Нет игроков для перехода к следующему');
      throw new Error('Нет игроков в игре');
    }
    
    let attempts = 0;
    const maxAttempts = this.players.length;
    const startPlayer = this.currentPlayer;
    
    do {
      this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
      attempts++;
      
      // Защита от бесконечного цикла
      if (attempts > maxAttempts) {
        console.error('❌ Бесконечный цикл в nextPlayer');
        break;
      }
    } while (
      this.players[this.currentPlayer] && 
      (this.players[this.currentPlayer].isFolded || 
       this.players[this.currentPlayer].isAllIn || 
       this.players[this.currentPlayer].isSleeping) && 
      attempts < maxAttempts
    );
    
    if (attempts >= maxAttempts || !this.players[this.currentPlayer]) {
      console.log('🏁 Все игроки сбросили карты или ва-банк');
      // Проверяем, не перешли ли мы в состояние showdown
      if (this.gameState !== 'showdown' && this.gameState !== 'finished' && this.gameState !== 'waiting_for_vara_join') {
        // Проверяем, есть ли хотя бы один активный игрок перед showdown
        const activePlayers = this.getActivePlayers(true);
        if (activePlayers.length > 0) {
          this.showdown();
        } else {
          // Все выбыли - начинаем новый раунд
          this.startNewRound();
        }
      }
      return false; // Нельзя найти следующего игрока
    }
    
    console.log(`➡️ Следующий игрок: ${this.players[this.currentPlayer].name} (индекс ${this.currentPlayer})`);
    return true;
  }

  // Получение индекса следующего игрока
  getNextPlayerIndex(currentIndex) {
    let nextIndex = (currentIndex + 1) % this.players.length;
    let attempts = 0;
    
    while (
      (this.players[nextIndex].isFolded || 
       this.players[nextIndex].isAllIn || 
       this.players[nextIndex].isSleeping) && 
      attempts < this.players.length
    ) {
      nextIndex = (nextIndex + 1) % this.players.length;
      attempts++;
    }
    
    return nextIndex;
  }

  // Запуск таймера хода
  startTurnTimer() {
    this.clearTurnTimer();
    
    // Проверяем, что текущий игрок существует
    if (!this.players || this.currentPlayer >= this.players.length || !this.players[this.currentPlayer]) {
      console.warn('⚠️ Невозможно запустить таймер: текущий игрок не определен');
      return;
    }
    
    // Проверяем, что игра все еще в состоянии, где нужен таймер
    if (this.gameState !== 'betting' && this.gameState !== 'vara') {
      console.log('⏸️ Игра не в состоянии торгов, таймер не нужен');
      return;
    }
    
    this.turnTimer = setTimeout(() => {
      // Дополнительная проверка перед autoFold
      if (this.players && this.currentPlayer < this.players.length && this.players[this.currentPlayer]) {
        console.log(`⏰ Время хода истекло для ${this.players[this.currentPlayer].name}`);
        try {
          this.autoFold();
        } catch (autoFoldError) {
          console.error('❌ Ошибка в autoFold:', autoFoldError);
        }
      }
    }, this.turnTimeLimit);
  }

  // Очистка таймера хода
  clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  // Автоматический сброс карт при истечении времени
  autoFold() {
    if (!this.players || this.currentPlayer >= this.players.length || !this.players[this.currentPlayer]) {
      console.warn('⚠️ Невозможно выполнить autoFold: текущий игрок не определен');
      return;
    }
    
    const player = this.players[this.currentPlayer];
    console.log(`⏰ Автоматический сброс карт для ${player.name}`);
    
    try {
      this.handleFold(player);
    } catch (foldError) {
      console.error('❌ Ошибка в handleFold при autoFold:', foldError);
      return;
    }
    
    // Проверяем, не остался ли один активный игрок после fold
    try {
      const actives = this.getActivePlayers(true);
      if (actives.length <= 1) {
        this.checkRoundEnd();
        // После checkRoundEnd может быть showdown или startNewRound
        if (this.onStateUpdate) {
          this.onStateUpdate(this.getGameState());
        }
        return;
      }
    } catch (_) {}
    
    try {
      this.checkBettingComplete();
    } catch (checkError) {
      console.error('❌ Ошибка в checkBettingComplete при autoFold:', checkError);
    }
    
    // После checkBettingComplete мог быть вызван showdown - проверяем состояние
    if (this.gameState === 'showdown' || this.gameState === 'finished' || this.gameState === 'waiting_for_vara_join') {
      if (this.onStateUpdate) {
        this.onStateUpdate(this.getGameState());
      }
      return;
    }
    
    if (this.gameState === 'betting' || this.gameState === 'vara') {
      try {
        const hasNextPlayer = this.nextPlayer();
        if (hasNextPlayer) {
          this.startTurnTimer();
        }
        // nextPlayer может вызвать showdown - проверяем состояние
        if (this.gameState === 'showdown' || this.gameState === 'finished' || this.gameState === 'waiting_for_vara_join') {
          if (this.onStateUpdate) {
            this.onStateUpdate(this.getGameState());
          }
          return;
        }
      } catch (nextError) {
        console.error('❌ Ошибка при переходе к следующему игроку в autoFold:', nextError);
      }
    }
    
    try {
      if (this.onStateUpdate) {
        this.onStateUpdate(this.getGameState());
      }
    } catch (updateError) {
      console.error('❌ Ошибка при отправке обновления состояния в autoFold:', updateError);
    }
  }

  // Получение имени игрока
  getPlayerName(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.name : 'Неизвестный';
  }

  // Получение состояния игры
  getGameState() {
    return {
      gameId: this.gameId,
      roundId: this.roundId || 0,
      gameState: this.gameState,
      players: this.players.map(player => ({
        id: player.id,
        name: player.name,
        chips: player.chips,
        cards: player.cards,
        currentBet: player.currentBet,
        totalBet: player.totalBet,
        isFolded: player.isFolded,
        isAllIn: player.isAllIn,
        isSleeping: player.isSleeping,
        isInVara: player.isInVara,
        combination: player.combination,
        points: player.points
      })),
      currentPlayer: this.currentPlayer,
      pot: this.pot,
      varaPot: this.varaPot,
      varaPlayers: this.varaPlayers,
      bettingRound: this.bettingRound,
      currentBet: this.currentBet,
      dealerId: this.dealerId,
      winner: this.winner,
      winners: this.winners,
      winnersFlat: Array.isArray(this.winners) ? this.winners.map(w => (w && w.player ? w.player.id : w?.id)).filter(Boolean) : [],
      turnTimeLeft: this.turnTimer ? this.turnTimeLimit : 0,
      balanceDeltas: this.balanceDeltas || [],
      voteNewRoundPlayers: this.voteNewRoundPlayers || [],
      voteNewRoundTimeoutSeconds: this.voteNewRoundTimeoutSeconds || 0, // Оставшееся время таймера в секундах
      startWithVotedConfirm: this.startWithVotedConfirm || [],
      readyToStartWithVoted: this.gameState === 'voting_new_round' && 
                            this.voteNewRoundTimeout !== null && 
                            this.players.filter(p => !p.isSleeping).length === 4 &&
                            this.voteNewRoundPlayers.length === 3,
      voteInitiatorId: this.voteInitiatorId || null, // ID инициатора голосования (обычно победитель)
      exposeResult: this.exposeResult, // Результат последнего вскрытия
      lastAction: this.lastAction // Последнее действие игрока для визуализации (ва-банк, рейз и т.д.)
    };
  }
}

module.exports = { SekaGame, SEKA_RULES, COMBINATION_TYPES };