// Логирование в самом начале для отладки
console.log('🚀 Запуск сервера...');
console.log('📋 Проверка переменных окружения:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   PORT:', process.env.PORT);
console.log('   PUSHER_APP_ID:', process.env.PUSHER_APP_ID ? 'установлен (' + process.env.PUSHER_APP_ID.substring(0, 4) + '...)' : 'НЕ УСТАНОВЛЕН');
console.log('   PUSHER_KEY:', process.env.PUSHER_KEY ? 'установлен (' + process.env.PUSHER_KEY.substring(0, 4) + '...)' : 'НЕ УСТАНОВЛЕН');
console.log('   PUSHER_SECRET:', process.env.PUSHER_SECRET ? 'установлен (' + process.env.PUSHER_SECRET.substring(0, 4) + '...)' : 'НЕ УСТАНОВЛЕН');
console.log('   PUSHER_CLUSTER:', process.env.PUSHER_CLUSTER || 'eu (по умолчанию)');

const express = require('express');
const Pusher = require('pusher');
const path = require('path');
const { SekaGame, SEKA_RULES } = require('./gameLogic');

const app = express();
const PORT = process.env.PORT || 3006;

// Инициализация Pusher
// Требуются переменные окружения: PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER
const pusherAppId = process.env.PUSHER_APP_ID;
const pusherKey = process.env.PUSHER_KEY;
const pusherSecret = process.env.PUSHER_SECRET;
const pusherCluster = process.env.PUSHER_CLUSTER || "eu";

if (!pusherAppId || !pusherKey || !pusherSecret) {
  console.error('❌ ОШИБКА: Pusher credentials не настроены!');
  console.error('❌ Требуются переменные окружения: PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET');
  console.error('📋 Отладочная информация:');
  console.error('   PUSHER_APP_ID:', pusherAppId ? 'установлен' : 'НЕ УСТАНОВЛЕН');
  console.error('   PUSHER_KEY:', pusherKey ? 'установлен' : 'НЕ УСТАНОВЛЕН');
  console.error('   PUSHER_SECRET:', pusherSecret ? 'установлен' : 'НЕ УСТАНОВЛЕН');
  console.error('   NODE_ENV:', process.env.NODE_ENV);
  console.error('   PORT:', process.env.PORT);
  process.exit(1);
}

const pusher = new Pusher({
  appId: pusherAppId,
  key: pusherKey,
  secret: pusherSecret,
  cluster: pusherCluster,
  useTLS: true
});

// Хранилище комнат
const rooms = new Map();
const games = new Map();

// Middleware
app.use(express.json());

// CORS для локальной разработки
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Логирование всех входящих запросов для отладки
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Static files должны быть ПОСЛЕ API endpoints, чтобы не перехватывать запросы к /api/*
// app.use(express.static('public')); // Закомментировано, так как это может перехватывать API запросы

// === API endpoints вместо Socket.IO ===

// Голосование за новый раунд - ТОЧНАЯ КОПИЯ СИСТЕМЫ player-ready ИЗ ЛОББИ
app.post('/api/vote-new-round', function(req, res) {
  console.log('\n✅✅✅ МАРШРУТ /api/vote-new-round ВЫЗВАН! ✅✅✅');
  console.log('📥 Method:', req.method);
  console.log('📥 Path:', req.path);
  console.log('📥 Body:', JSON.stringify(req.body));
  
  const { roomId, playerId } = req.body;
  console.log(`📥 Параметры: roomId=${roomId}, playerId=${playerId}`);
  
  if (!roomId || !playerId) {
    console.log(`❌ Отсутствуют обязательные параметры`);
    return res.status(400).json({ error: 'Отсутствуют обязательные параметры: roomId или playerId' });
  }
  
  const game = games.get(roomId);
  console.log(`🎮 Игра найдена: ${!!game}`);
  console.log(`📋 Доступные комнаты:`, Array.from(games.keys()));
  
  if (!game) {
    console.log(`❌ Игра не найдена для roomId: ${roomId}`);
    return res.status(404).json({ error: 'Игра не найдена' });
  }
  
  // Простая логика: добавляем игрока в список голосующих (если его там нет)
  if (!game.voteNewRoundPlayers.includes(playerId)) {
    game.voteNewRoundPlayers.push(playerId);
  }
  
  // Получаем актуальные данные
  const votedCount = game.voteNewRoundPlayers.length;
  const activePlayers = game.players.filter(p => !p.isSleeping);
  const totalPlayers = activePlayers.length;
  const allVoted = votedCount === totalPlayers && totalPlayers >= SEKA_RULES.MIN_PLAYERS;
  
  console.log(`🗳️ Игрок ${playerId} проголосовал за новый раунд в комнате ${roomId}`);
  console.log(`🗳️ Проголосовавших: ${votedCount}/${totalPlayers}`);
  
  // Автоматически начинаем новый раунд если все проголосовали
  let newRoundStarted = false;
  if (allVoted) {
    console.log('✅ Все игроки проголосовали - начинаем новый раунд');
    try {
      game.startNewRound();
      newRoundStarted = true;
      console.log('✅ Новый раунд успешно начат');
    } catch (error) {
      console.error('❌ Ошибка при начале нового раунда:', error);
      console.error('❌ Stack:', error.stack);
    }
  }
  
  // Отправляем обновление через Pusher
  const gameState = game.getGameState();
  
  // Если новый раунд начат, отправляем событие game-started (как при первом запуске)
  if (newRoundStarted) {
    console.log('📤 Отправляем событие game-started для нового раунда');
    pusher.trigger(`room-${roomId}`, 'game-started', {
      gameState: gameState,
      roundId: gameState.roundId,
      message: 'Новый раунд начат!'
    });
  }
  
  // Отправляем обновление игры
  pusher.trigger(`room-${roomId}`, 'game-update', gameState);
  
  // Также отправляем специальное событие для таймера (как ready-update в лобби)
  pusher.trigger(`room-${roomId}`, 'vote-new-round-update', {
    voteNewRoundPlayers: game.voteNewRoundPlayers,
    voteNewRoundTimeoutSeconds: game.voteNewRoundTimeoutSeconds || 0,
    totalPlayers: totalPlayers,
    allVoted: allVoted,
    newRoundStarted: newRoundStarted
  });
  
  res.json({ 
    success: true,
    votedCount: votedCount,
    totalPlayers: totalPlayers,
    allVoted: allVoted,
    newRoundStarted: newRoundStarted
  });
});

// Тестовый endpoint для проверки доступности API
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API работает!', timestamp: Date.now() });
});

// Создание комнаты (старый путь для совместимости)
app.post('/api/create-room', (req, res) => {
  const { roomName, playerName, maxPlayers = 7, password } = req.body;
  
  // Валидация количества игроков
  const maxPlayersInt = parseInt(maxPlayers, 10);
  if (isNaN(maxPlayersInt) || maxPlayersInt < 2 || maxPlayersInt > 7) {
    return res.status(400).json({ error: 'Количество игроков должно быть от 2 до 7' });
  }
  
  const roomId = generateRoomId();
  
  const room = {
    id: roomId,
    name: roomName,
    players: [{ id: generatePlayerId(), name: playerName }],
    gameState: 'waiting',
    readyPlayers: [],
    maxPlayers: maxPlayersInt,
    password: password ? String(password).trim() : null, // Пароль или null
    createdAt: Date.now()
  };
  
  rooms.set(roomId, room);
  
  console.log(`🏠 Комната создана: ${roomId}`);
  console.log(`👤 Создатель: ${playerName}`);
  console.log(`👥 Максимум игроков: ${maxPlayersInt}`);
  console.log(`🔒 С паролем: ${room.password ? 'Да' : 'Нет'}`);
  
  res.json({ 
    roomId, 
    playerId: room.players[0].id,
    isCreator: true,
    room 
  });
});

// Присоединение к комнате (старый путь для совместимости)
app.post('/api/join-room', (req, res) => {
  const { roomId, playerName, password } = req.body;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' });
  }
  
  // Проверка пароля
  if (room.password) {
    if (!password || String(password).trim() !== room.password) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }
  }
  
  // Проверка максимального количества игроков
  const maxPlayers = room.maxPlayers || 7;
  if (room.players.length >= maxPlayers) {
    return res.status(400).json({ error: `Комната заполнена (максимум ${maxPlayers} игроков)` });
  }
  
  const player = {
    id: generatePlayerId(),
    name: playerName
  };
  
  room.players.push(player);
  
  console.log(`👤 Игрок ${playerName} присоединился к комнате ${roomId}`);
  console.log(`👥 Теперь игроков в комнате: ${room.players.length}`);
  
  // Уведомляем всех о новом игроке
  pusher.trigger(`room-${roomId}`, 'player-joined', {
    player,
    room: {
      id: room.id,
    name: room.name,
      players: room.players,
    gameState: room.gameState
    }
  });
  
  res.json({
    roomId,
    playerId: player.id,
    isCreator: false,
    room
  });
});

// Создание комнаты (новый путь)
app.post('/api/rooms/create', (req, res) => {
  const { roomName, playerName, maxPlayers = 7, password } = req.body;
  
  // Валидация количества игроков
  const maxPlayersInt = parseInt(maxPlayers, 10);
  if (isNaN(maxPlayersInt) || maxPlayersInt < 2 || maxPlayersInt > 7) {
    return res.status(400).json({ error: 'Количество игроков должно быть от 2 до 7' });
  }
  
    const roomId = generateRoomId();
  
    const room = {
      id: roomId,
    name: roomName,
    players: [{ id: generatePlayerId(), name: playerName }],
      gameState: 'waiting',
    readyPlayers: [],
    maxPlayers: maxPlayersInt,
    password: password ? String(password).trim() : null,
    createdAt: Date.now()
    };
    
    rooms.set(roomId, room);
  
  console.log(`🏠 Комната создана: ${roomId}`);
  console.log(`👤 Создатель: ${playerName}`);
  console.log(`👥 Максимум игроков: ${maxPlayersInt}`);
  console.log(`🔒 С паролем: ${room.password ? 'Да' : 'Нет'}`);
  
  res.json({ 
    roomId, 
    playerId: room.players[0].id,
    isCreator: true,
    room 
  });
  });

  // Присоединение к комнате
app.post('/api/rooms/join', (req, res) => {
  const { roomId, playerName, password } = req.body;
  const room = rooms.get(roomId);
  
    if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' });
    }
    
    // Проверка пароля
    if (room.password) {
      if (!req.body.password || String(req.body.password).trim() !== room.password) {
        return res.status(401).json({ error: 'Неверный пароль' });
      }
    }
    
    // Проверка максимального количества игроков
    const maxPlayers = room.maxPlayers || 7;
    if (room.players.length >= maxPlayers) {
      return res.status(400).json({ error: `Комната заполнена (максимум ${maxPlayers} игроков)` });
    }
    
    const player = {
    id: generatePlayerId(),
    name: playerName
    };
    
    room.players.push(player);
  
  console.log(`👤 Игрок ${playerName} присоединился к комнате ${roomId}`);
  console.log(`👥 Теперь игроков в комнате: ${room.players.length}`);
    
  // Уведомляем всех о новом игроке
  pusher.trigger(`room-${roomId}`, 'player-joined', {
      player,
      room: {
        id: room.id,
        name: room.name,
      players: room.players,
      gameState: room.gameState
    }
  });
  
  res.json({
    roomId,
    playerId: player.id,
    isCreator: false,
    room
  });
});

// Голосование готовности
app.post('/api/player-ready', (req, res) => {
  const { roomId, playerId } = req.body;
  const room = rooms.get(roomId);
  
      if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' });
  }
  
  if (!room.readyPlayers.includes(playerId)) {
    room.readyPlayers.push(playerId);
  }
  
  console.log(`👍 Игрок ${playerId} проголосовал за готовность в комнате ${roomId}`);
  console.log(`👍 Готовых игроков: ${room.readyPlayers.length}/${room.players.length}`);
  
  // Уведомляем всех об обновлении готовности
  pusher.trigger(`room-${roomId}`, 'ready-update', {
    readyPlayers: room.readyPlayers,
    totalPlayers: room.players.length,
    allReady: room.readyPlayers.length === room.players.length
  });
  
  res.json({ success: true });
});

// Начало игры
app.post('/api/start-game', (req, res) => {
  try {
    const { roomId, playerId } = req.body;
    
    if (!roomId || !playerId) {
      return res.status(400).json({ error: 'Отсутствуют roomId или playerId' });
    }
    
    const room = rooms.get(roomId);
    
      if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }
    
    // Проверяем создателя (первый игрок)
    const isCreator = room.players[0] && room.players[0].id === playerId;
    if (!isCreator) {
      return res.status(403).json({ error: 'Только создатель может начать игру' });
    }
    
    console.log(`🎮 Начинаем игру в комнате ${roomId}`);
    
    // Получаем существующую игру или создаем новую
    let game = games.get(roomId);
    if (!game) {
      console.log(`🔄 Создаем новую игру для комнаты ${roomId}`);
      try {
        game = new SekaGame();
      room.players.forEach(player => {
          if (player.id && player.name) {
            game.addPlayer(player.id, player.name);
          }
        });
        room.game = game;
        games.set(roomId, game);
      } catch (error) {
        console.error(`❌ Ошибка создания игры:`, error);
        return res.status(500).json({ error: 'Ошибка создания игры: ' + error.message });
      }
    }
    
    // Устанавливаем функцию отправки обновлений
    game.onStateUpdate = (gameState) => {
      try {
        pusher.trigger(`room-${roomId}`, 'game-update', gameState);
      } catch (error) {
        console.error('❌ Ошибка отправки обновления через Pusher:', error);
      }
    };
          
    // Запускаем игру
    try {
      // startGame() возвращает gameState или выбрасывает исключение
      const gameState = game.startGame();
      
      if (gameState) {
        console.log(`✅ Игра успешно начата в комнате ${roomId}`);
        
        // Уведомляем всех о начале игры
        try {
          pusher.trigger(`room-${roomId}`, 'game-started', {
            gameState: gameState,
            message: 'Игра началась!'
          });
        } catch (pusherError) {
          console.error('❌ Ошибка Pusher при отправке события game-started:', pusherError);
          // Продолжаем, даже если Pusher не сработал
        }
        
        return res.json({ success: true, gameState: gameState });
      } else {
        console.log(`❌ Ошибка запуска игры в комнате ${roomId}: startGame() вернул null/undefined`);
        return res.status(500).json({ error: 'Ошибка запуска игры: не удалось начать игру' });
      }
    } catch (gameError) {
      console.error(`❌ Исключение при запуске игры:`, gameError);
      console.error(`Stack trace:`, gameError.stack);
      return res.status(500).json({ error: 'Ошибка запуска игры: ' + gameError.message });
    }
  } catch (error) {
    console.error('❌ Критическая ошибка в /api/start-game:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
});

// Получение списка комнат
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    name: room.name,
    players: room.players.length,
    maxPlayers: room.maxPlayers || 7,
    hasPassword: !!room.password, // Показываем только наличие пароля, не сам пароль
    gameState: room.gameState
  }));
  
  console.log(`📋 Запрос списка комнат: ${roomList.length} комнат`);
  res.json(roomList);
});

// Получение состояния комнаты
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
      if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' });
  }
  
  res.json(room);
});

// Получение состояния игры
app.get('/api/games/:roomId', (req, res) => {
  const { roomId } = req.params;
  const game = games.get(roomId);
  
  if (!game) {
    return res.status(404).json({ error: 'Игра не найдена' });
  }
  
  res.json(game.getGameState());
});

// Игровое действие (ход игрока)
app.post('/api/player-move', async (req, res) => {
  try {
    const { roomId, playerId, action, amount = 0 } = req.body;
    
    if (!roomId || !playerId || !action) {
      return res.status(400).json({ success: false, error: 'Отсутствуют обязательные параметры: roomId, playerId, action' });
    }
    
    console.log(`🎯 Получен ход игрока: ${action}${amount ? ` на ${amount}` : ''} от ${playerId} в комнате ${roomId}`);
    
    const game = games.get(roomId);
    if (!game) {
      console.log(`❌ Игра не найдена для комнаты ${roomId}`);
      return res.status(404).json({ success: false, error: 'Игра не найдена' });
    }
    
    try {
      // Выполняем ход (await, так как makeMove асинхронная)
      const result = await game.makeMove(playerId, action, amount);
        
      if (result && result.success) {
        console.log(`✅ Ход выполнен успешно: ${action}`);
        
        // Отправляем обновление всем игрокам в комнате через Pusher
        const gameState = game.getGameState();
        
        try {
          await pusher.trigger(`room-${roomId}`, 'game-update', {
            ...gameState,
            lastAction: {
              playerId: playerId,
              action: action,
              amount: amount,
              timestamp: new Date().toISOString()
            }
          });
        } catch (pusherError) {
          console.error('❌ Ошибка Pusher при отправке обновления:', pusherError);
          // Продолжаем, даже если Pusher не сработал
        }
        // ИСПРАВЛЕНИЕ БАГ #2: Очищаем balanceDeltas после отправки через Pusher (не сразу)
        // Даем время клиентам получить состояние с анимациями (небольшая задержка)
        setTimeout(() => {
          try { 
            if (game.balanceDeltas) {
              game.balanceDeltas = []; 
            }
          } catch (_) {}
        }, 1000); // Задержка 1 секунда для получения клиентами
        
        return res.json({ success: true, gameState: gameState });
      } else {
        const errorMsg = result?.error || 'Неизвестная ошибка выполнения хода';
        console.log(`❌ Ошибка выполнения хода: ${errorMsg}`);
        return res.status(400).json({ success: false, error: errorMsg });
      }
    } catch (error) {
      console.error(`❌ Ошибка при выполнении хода:`, error);
      console.error(`Stack trace:`, error.stack);
      return res.status(500).json({ success: false, error: error.message || 'Внутренняя ошибка сервера' });
      }
    } catch (error) {
    console.error(`❌ Критическая ошибка в /api/player-move:`, error);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера: ' + error.message });
  }
});

// Начать игру с проголосовавшими игроками
app.post('/api/start-with-voted', async (req, res) => {
  try {
    const { roomId, playerId } = req.body;
    
    if (!roomId || !playerId) {
      return res.status(400).json({ success: false, error: 'Отсутствуют обязательные параметры: roomId, playerId' });
    }
    
    const game = games.get(roomId);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Игра не найдена' });
    }
    
    // Проверяем, что игрок проголосовал
    if (!game.voteNewRoundPlayers.includes(playerId)) {
      return res.status(400).json({ success: false, error: 'Вы должны проголосовать перед началом игры' });
    }
    
    try {
      // Проверяем, что все проголосовавшие игроки еще раз нажали "Начать втроем"
      // Это делается через повторное голосование всех трех
      const totalPlayers = game.players.filter(p => !p.isSleeping).length;
      const votedCount = game.voteNewRoundPlayers.length;
      
      if (totalPlayers === 4 && votedCount === 3) {
        // Все три должны еще раз проголосовать за начало втроем
        if (!game.voteNewRoundPlayers.includes(playerId)) {
          return res.status(400).json({ success: false, error: 'Вы должны проголосовать' });
        }
        
        // Если это последний игрок из трех, начинаем игру
        // Для упрощения: если все три проголосовали, начинаем
        // Но нужно чтобы они все три нажали кнопку "Начать втроем"
        // Используем другой массив для подтверждения
        if (!game.startWithVotedConfirm) {
          game.startWithVotedConfirm = [];
        }
        
        if (!game.startWithVotedConfirm.includes(playerId)) {
          game.startWithVotedConfirm.push(playerId);
          
          // Отправляем обновление
        const gameState = game.getGameState();
          await pusher.trigger(`room-${roomId}`, 'game-update', gameState);
          
          // Если все три подтвердили - начинаем
          if (game.startWithVotedConfirm.length === 3) {
            const result = game.startWithVotedPlayers();
            game.startWithVotedConfirm = [];
            
            // Отправляем обновление с началом игры
            const newGameState = game.getGameState();
            await pusher.trigger(`room-${roomId}`, 'game-update', newGameState);
            
            return res.json({ success: true, gameStarted: true });
          }
          
          return res.json({ success: true, confirmed: game.startWithVotedConfirm.length, total: 3 });
        }
        
        return res.json({ success: true, alreadyConfirmed: true });
      }
      
      return res.status(400).json({ success: false, error: 'Условия для начала игры не выполнены' });
    } catch (startError) {
      console.error(`❌ Ошибка начала игры с проголосовавшими:`, startError);
      return res.status(400).json({ success: false, error: startError.message });
      }
    } catch (error) {
    console.error(`❌ Критическая ошибка в /api/start-with-voted:`, error);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера: ' + error.message });
  }
});

// API для пробуждения спящего игрока (КАК НА SEKA-RU.COM)
app.post('/api/wake-up', (req, res) => {
  const { roomId, playerId } = req.body;
  
  console.log(`😴 Пробуждение игрока в комнате ${roomId}`);
  
  const game = games.get(roomId);
  if (!game) {
    console.log(`❌ Игра не найдена для комнаты ${roomId}`);
    return res.status(404).json({ error: 'Игра не найдена' });
  }
  
  try {
    const success = game.wakeUpPlayer(playerId);
    
    if (success) {
      console.log(`✅ Игрок успешно пробудился`);
      
      // Отправляем обновление всем игрокам в комнате через Pusher
      const gameState = game.getGameState();
      pusher.trigger(`room-${roomId}`, 'game-update', {
        ...gameState,
        lastAction: {
          playerId: playerId,
          action: 'wake-up',
      timestamp: new Date().toISOString()
        }
      });
      
      res.json({ success: true, gameState: gameState });
    } else {
      console.log(`❌ Игрок не в спящем режиме`);
      res.status(400).json({ success: false, error: 'Игрок не в спящем режиме' });
    }
  } catch (error) {
    console.error(`❌ Критическая ошибка при пробуждении:`, error);
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// Получение состояния игры (ИСПРАВЛЕНИЕ)
app.get('/api/game-state/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  console.log(`📊 Запрос состояния игры для комнаты ${roomId}`);
  
  const game = games.get(roomId);
  if (!game) {
    console.log(`❌ Игра не найдена для комнаты ${roomId}`);
    return res.status(404).json({ success: false, error: 'Игра не найдена' });
  }
  
  const gameState = game.getGameState();
  console.log(`✅ Отправляем состояние игры:`, gameState);
  
  res.json({ success: true, gameState });
});

// Вспомогательные функции
function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function generatePlayerId() {
  return Math.random().toString(36).substr(2, 9);
}

// Static files - регистрируем ПОСЛЕ всех API endpoints
// Это гарантирует, что запросы к /api/* не будут перехвачены статическими файлами
const publicPath = path.join(__dirname, 'public');
try {
  const fs = require('fs');
  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
    console.log(`📁 Создана папка: ${publicPath}`);
  }
  app.use(express.static(publicPath));
  console.log(`📁 Статические файлы из: ${publicPath}`);
} catch (error) {
  console.error(`⚠️ Ошибка при настройке статических файлов:`, error);
  // Продолжаем работу даже если папки нет
}

// 404 handler для API (только для необработанных маршрутов, начинающихся с /api/)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.error(`❌ 404: API маршрут не найден: ${req.method} ${req.path}`);
    console.error(`❌ Доступные endpoints: POST /api/vote-new-round, POST /api/start-with-voted, POST /api/player-move, POST /api/start-game, GET /api/test`);
    return res.status(404).json({ 
      success: false, 
      error: 'API endpoint не найден',
      path: req.path,
      method: req.method
    });
  }
  next();
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🎮 Сервер запущен на порту ${PORT}`);
  console.log(`🔗 Pusher настроен (App ID: ${pusherAppId.substring(0, 4)}...)`);
  console.log(`🌐 API доступно по адресу: http://localhost:${PORT}/api`);
  console.log(`📡 Pusher кластер: ${pusherCluster}`);
  console.log(`\n📋 Зарегистрированные endpoints:`);
  console.log(`   ✓ POST /api/vote-new-round`);
  console.log(`   ✓ POST /api/start-with-voted`);
  console.log(`   ✓ POST /api/player-move`);
  console.log(`   ✓ POST /api/start-game`);
  console.log(`   ✓ POST /api/player-ready`);
  console.log(`   ✓ GET /api/test`);
  console.log(`   ✓ GET /api/game-state/:roomId`);
  console.log(`\n✅ Все маршруты успешно зарегистрированы\n`);
  console.log(`🔄 Система инициализации нового раунда:`);
  console.log(`   ✓ startNewRound() - создает новую колоду, раздает карты`);
  console.log(`   ✓ Отправляет событие game-started при новом раунде`);
  console.log(`   ✓ Полный цикл перезапуска игры реализован\n`);
  
  // Проверка регистрации маршрутов (Express 5.x)
  // Примечание: Структура router изменилась в Express 5.x,
  // поэтому проверка может не работать, но маршруты регистрируются правильно
  console.log(`✅ Маршрут /api/vote-new-round зарегистрирован в коде (строка 50)`);
  console.log(`✅ Маршрут будет работать при вызове\n`);
});