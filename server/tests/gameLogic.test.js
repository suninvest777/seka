/**
 * Тесты для критических функций SekaGame
 */

const SekaGame = require('../gameLogic');

describe('SekaGame Security Tests', () => {
  let game;
  
  beforeEach(() => {
    game = new SekaGame();
    game.addPlayer('p1', 'Player1');
    game.addPlayer('p2', 'Player2');
    game.startGame();
  });
  
  test('should prevent race conditions', async () => {
    // Симулируем одновременные ходы
    const moves = Promise.all([
      game.makeMove('p1', 'call'),
      game.makeMove('p1', 'raise', 20), // Дублирующий ход
    ]);
    
    const results = await moves;
    
    // Только один ход должен быть успешным
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(1);
  });
  
  test('should validate all input parameters', async () => {
    // Невалидные действия
    const invalidMove1 = await game.makeMove('p1', 'invalid_action');
    expect(invalidMove1.success).toBe(false);
    expect(invalidMove1.errorCode).toBe('INVALID_ACTION');
    
    const invalidMove2 = await game.makeMove('p1', 'raise', -10);
    expect(invalidMove2.success).toBe(false);
    expect(invalidMove2.errorCode).toBe('INVALID_RAISE_AMOUNT');
    
    const invalidMove3 = await game.makeMove('nonexistent', 'call');
    expect(invalidMove3.success).toBe(false);
    expect(invalidMove3.errorCode).toBe('PLAYER_NOT_FOUND');
  });
  
  test('should enforce rate limiting', async () => {
    // Делаем много быстрых ходов
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(game.makeMove('p1', 'call'));
    }
    
    const results = await Promise.all(promises);
    
    // Некоторые должны быть заблокированы rate limit
    const rateLimited = results.filter(r => r.errorCode === 'RATE_LIMIT_EXCEEDED');
    expect(rateLimited.length).toBeGreaterThan(0);
  });
  
  test('should calculate points correctly with aces', () => {
    // Тест 1: Туз как 11
    const cards1 = [
      { rank: 'A', suit: 'hearts' },
      { rank: '9', suit: 'diamonds' }
    ];
    expect(game.calculatePoints(cards1)).toBe(20);
    
    // Тест 2: Туз как 1 (избежание перебора)
    const cards2 = [
      { rank: 'A', suit: 'hearts' },
      { rank: '9', suit: 'diamonds' },
      { rank: '8', suit: 'clubs' }
    ];
    expect(game.calculatePoints(cards2)).toBe(18);
    
    // Тест 3: Множественные тузы
    const cards3 = [
      { rank: 'A', suit: 'hearts' },
      { rank: 'A', suit: 'diamonds' },
      { rank: '9', suit: 'clubs' }
    ];
    expect(game.calculatePoints(cards3)).toBe(21);
  });
  
  test('should validate game state integrity', () => {
    const errors = game.validateGameState();
    expect(errors).toHaveLength(0);
    
    // Симулируем ошибку состояния
    game.pot = 999999; // Нереальная сумма
    const errorsWithIssue = game.validateGameState();
    expect(errorsWithIssue.length).toBeGreaterThan(0);
  });
  
  test('should track metrics correctly', () => {
    const initialMetrics = game.getMetrics();
    expect(initialMetrics.gamesStarted).toBe(1);
    expect(initialMetrics.movesProcessed).toBe(0);
    
    // Делаем ход
    game.makeMove('p1', 'call');
    
    const updatedMetrics = game.getMetrics();
    expect(updatedMetrics.movesProcessed).toBe(1);
  });
  
  test('should provide health status', () => {
    const health = game.getHealthStatus();
    
    expect(health).toHaveProperty('gameId');
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('players');
    expect(health).toHaveProperty('activePlayers');
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('metrics');
    
    expect(health.status).toBe('betting');
    expect(health.players).toBe(2);
    expect(health.activePlayers).toBe(2);
  });
  
  test('should handle emergency shutdown', () => {
    // Симулируем бесконечный цикл
    game.players.forEach(p => {
      p.isFolded = true;
      p.isAllIn = true;
      p.isSleeping = true;
    });
    
    const result = game.nextPlayer();
    expect(result).toBe(false);
    expect(game.gameState).toBe('error');
  });
});

describe('SekaGame Configuration Tests', () => {
  test('should validate configuration', () => {
    const validConfig = {
      turnTimeLimit: 30000,
      minRaise: 20,
      anteAmount: 15
    };
    
    const validated = GameConfig.validate(validConfig);
    expect(validated.turnTimeLimit).toBe(30000);
    expect(validated.minRaise).toBe(20);
    expect(validated.anteAmount).toBe(15);
  });
  
  test('should reject invalid configuration', () => {
    const invalidConfig = {
      turnTimeLimit: 1000, // Слишком мало
      minRaise: -5, // Отрицательное
      maxPlayers: 20 // Слишком много
    };
    
    expect(() => GameConfig.validate(invalidConfig)).toThrow();
  });
  
  test('should use custom configuration', () => {
    const customConfig = {
      turnTimeLimit: 30000,
      minRaise: 25,
      anteAmount: 20
    };
    
    const game = new SekaGame(customConfig);
    
    expect(game.config.turnTimeLimit).toBe(30000);
    expect(game.config.minRaise).toBe(25);
    expect(game.config.anteAmount).toBe(20);
  });
});
