import React, { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { pusherConfig } from '../pusherConfig';
import { API_URL } from '../config';
import './OnlineGame.css';

const OnlineGame = ({ roomId, playerName, playerId, onBackToLobby, onStartGame }) => {
  const [localGameState, setLocalGameState] = useState(null);
  const [readyPlayers, setReadyPlayers] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [pusher, setPusher] = useState(null);
  const [channel, setChannel] = useState(null);
  
  // Используем useRef для стабильных значений в замыканиях
  const playerIdRef = useRef(playerId);
  const roomIdRef = useRef(roomId);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  const isInitializingRef = useRef(false);
  
  // Обновляем refs при изменении props
  useEffect(() => {
    playerIdRef.current = playerId;
    roomIdRef.current = roomId;
  }, [playerId, roomId]);

  // Функция для получения URL сервера
  const getServerUrl = () => {
    // Используем API_URL из конфигурации (поддерживает переменные окружения)
    // Если API_URL установлен (через REACT_APP_API_URL), используем его
    // Иначе используем fallback для development
    return API_URL || (() => {
      const hostname = window.location.hostname;
      const port = '3006';
      return hostname !== 'localhost' && hostname !== '127.0.0.1' 
        ? `http://${hostname}:${port}` 
        : 'http://localhost:3006';
    })();
  };

  // Инициализация Pusher (только при монтировании или изменении roomId)
  useEffect(() => {
    // Проверяем наличие необходимых данных
    if (!roomIdRef.current) {
      console.warn('⚠️ RoomId не определен, пропускаем инициализацию Pusher');
      return;
    }

    console.log('🔌 Инициализация Pusher подключения...');
    console.log('🔌 RoomId:', roomIdRef.current);
    console.log('🔌 PlayerId:', playerIdRef.current);
    console.log('🔌 PlayerName:', playerName);
    
    // Если Pusher уже инициализирован, проверяем его состояние
    if (pusher) {
      const state = pusher.connection?.state;
      console.log('🔌 Текущее состояние Pusher:', state);
      
      if (state === 'connected' || state === 'connecting') {
        console.log('🔌 Pusher уже подключен/подключается, пропускаем повторную инициализацию');
        return;
      }
      
      // Если отключен, отключаем старый экземпляр перед созданием нового
      if (state === 'disconnected' || state === 'failed') {
        console.log('🔌 Pusher был отключен, очищаем старый экземпляр');
        try {
          pusher.disconnect();
        } catch (error) {
          console.log('⚠️ Ошибка при отключении старого Pusher:', error);
        }
      }
    }
    
    // Используем pusherConfig из конфигурационного файла
    const pusherInstance = new Pusher(pusherConfig.key, {
      cluster: pusherConfig.cluster,
      useTLS: pusherConfig.useTLS,
      debug: false // Отключаем debug для уменьшения логов
    });

    setPusher(pusherInstance);

    const currentRoomId = roomIdRef.current;
    const roomChannel = pusherInstance.subscribe(`room-${currentRoomId}`);
    setChannel(roomChannel);

    console.log(`🔌 Подписка на канал: room-${currentRoomId}`);

    // Игрок присоединился
    roomChannel.bind('player-joined', (data) => {
      console.log('👤 Pusher: Игрок присоединился:', data);
      const currentPlayerId = playerIdRef.current;
      
      setLocalGameState(prev => ({
        ...prev,
        players: data.room.players,
        gameState: 'waiting'
      }));
      setTotalPlayers(data.room.players.length);
      
      // Обновляем флаг создателя (создатель — первый игрок в списке)
      try {
        const creator = data.room.players && data.room.players[0];
        setIsRoomCreator(creator ? creator.id === currentPlayerId : false);
      } catch (error) {
        console.error('❌ Ошибка проверки создателя:', error);
      }
    });

    // Обновление готовности
    roomChannel.bind('ready-update', (data) => {
      console.log('👍 Pusher: Обновление готовности:', data);
      const currentPlayerId = playerIdRef.current;
      
      setReadyPlayers(data.readyPlayers);
      setTotalPlayers(data.totalPlayers);
      
      // Проверяем, готов ли текущий игрок
      const playerReady = currentPlayerId && data.readyPlayers.includes(currentPlayerId);
      setIsReady(playerReady);
    });

    // Игра началась
    roomChannel.bind('game-started', (data) => {
      console.log('🎮 Pusher: Игра началась!', data);
      setLocalGameState(data.gameState);
      
      // Переходим на игровой стол
      if (onStartGame) {
        console.log('🎮 Переходим на игровой стол...');
        setTimeout(() => onStartGame(), 1000);
      }
    });

    // Обновление состояния игры
    roomChannel.bind('game-update', (data) => {
      console.log('🔄 Pusher: Обновление состояния игры:', data);
      setLocalGameState(data);
    });

    // Обработка ошибок подключения
    pusherInstance.connection.bind('error', (error) => {
      console.error('❌ Pusher: Ошибка подключения:', error);
    });

    pusherInstance.connection.bind('connected', () => {
      console.log('✅ Pusher: Подключен к серверу');
    });

    pusherInstance.connection.bind('disconnected', () => {
      console.log('❌ Pusher: Отключен от сервера');
    });

    return () => {
      console.log('🧹 Pusher: Очистка подключения...');
      
      // Отписываемся от событий перед отключением
      try {
        if (roomChannel) {
          roomChannel.unbind();
          if (roomChannel.state === 'subscribed') {
            roomChannel.unsubscribe();
          }
        }
      } catch (error) {
        console.log('⚠️ Ошибка при отписке от канала:', error);
      }
      
      try {
        if (pusherInstance && pusherInstance.connection.state !== 'disconnected') {
          pusherInstance.disconnect();
        }
      } catch (error) {
        console.log('⚠️ Ошибка при отключении Pusher:', error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // Зависим только от roomId, playerId и другие значения через refs

  // Загрузка состояния комнаты при монтировании
  useEffect(() => {
    const loadRoomState = async () => {
      if (!roomIdRef.current) return;
      
      try {
        const serverUrl = getServerUrl();
        const response = await fetch(`${serverUrl}/api/rooms/${roomIdRef.current}`);
        
        if (response.ok) {
          const roomData = await response.json();
          console.log('📋 Загружено состояние комнаты:', roomData);
          
          if (roomData.players) {
            setLocalGameState({
              players: roomData.players,
              gameState: roomData.gameState || 'waiting'
            });
            setTotalPlayers(roomData.players.length);
            
            // Определяем создателя
            const isCreator = roomData.players[0] && roomData.players[0].id === playerIdRef.current;
            setIsRoomCreator(isCreator);
            
            // Проверяем, есть ли текущий игрок в списке, чтобы получить playerId
            if (!playerIdRef.current && roomData.players.length > 0) {
              const myPlayer = roomData.players.find(p => p.name === playerName);
              if (myPlayer && myPlayer.id) {
                console.log('🔑 Найден playerId из состояния комнаты:', myPlayer.id);
                playerIdRef.current = myPlayer.id;
              }
            }
          }
          
          if (roomData.readyPlayers) {
            setReadyPlayers(roomData.readyPlayers);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки состояния комнаты:', error);
      }
    };
    
    loadRoomState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Загружаем только один раз при монтировании

  // Определяем, является ли игрок создателем комнаты
  useEffect(() => {
    if (localGameState && localGameState.players) {
      const currentPlayerId = playerIdRef.current || playerId;
      const isCreator = localGameState.players[0] && localGameState.players[0].id === currentPlayerId;
      setIsRoomCreator(isCreator);
      console.log('👑 Проверка создателя комнаты:', isCreator, 'PlayerId:', currentPlayerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localGameState]); // playerId через ref

  // Голосование готовности
  const voteReady = async () => {
    const currentRoomId = roomIdRef.current || roomId;
    const currentPlayerId = playerIdRef.current || playerId;
    
    console.log('🎯 voteReady вызвана');
    console.log('🔍 RoomId:', currentRoomId);
    console.log('🔍 PlayerId:', currentPlayerId);
    
    if (!currentPlayerId) {
      console.error('❌ PlayerId не определен, невозможно отправить голосование');
      alert('Ошибка: ID игрока не определен. Перезагрузите страницу.');
      return;
    }
    
    if (!currentRoomId) {
      console.error('❌ RoomId не определен');
      alert('Ошибка: ID комнаты не определен.');
      return;
    }
    
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/player-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: currentRoomId, 
          playerId: currentPlayerId 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Голосование успешно отправлено');
        setIsReady(true);
      } else {
        console.error('❌ Ошибка голосования:', data.error);
        alert(data.error || 'Ошибка голосования');
      }
    } catch (error) {
      console.error('❌ Ошибка отправки голосования:', error);
      alert('Ошибка отправки голосования: ' + error.message);
    }
  };

  // Начало игры
  const startGame = async () => {
    const currentRoomId = roomIdRef.current || roomId;
    const currentPlayerId = playerIdRef.current || playerId;
    
    console.log('🎯 startGame вызвана');
    console.log('🔍 RoomId:', currentRoomId);
    console.log('🔍 PlayerId:', currentPlayerId);
    console.log('🔍 IsRoomCreator:', isRoomCreator);
    
    if (!currentPlayerId) {
      console.error('❌ PlayerId не определен, невозможно начать игру');
      alert('Ошибка: ID игрока не определен. Перезагрузите страницу.');
      return;
    }
    
    if (!currentRoomId) {
      console.error('❌ RoomId не определен');
      alert('Ошибка: ID комнаты не определен.');
      return;
    }
    
    if (!isRoomCreator) {
      console.log('❌ Не создатель комнаты');
      alert('Только создатель комнаты может начать игру');
      return;
    }
    
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: currentRoomId, 
          playerId: currentPlayerId 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Игра успешно начата');
        console.log('🎮 Состояние игры:', data.gameState);
        
        // ИСПРАВЛЕНИЕ: Вызываем переход на игровое поле
        if (onStartGame) {
          console.log('🚀 Переходим на игровое поле...');
          onStartGame();
        }
      } else {
        console.error('❌ Ошибка начала игры:', data.error);
        alert(data.error || 'Ошибка начала игры');
      }
    } catch (error) {
      console.error('❌ Ошибка отправки запроса начала игры:', error);
      alert('Ошибка начала игры: ' + error.message);
    }
  };

  // Получение карт игрока (закомментировано, так как не используется)
  // const getPlayerCards = () => {
  //   if (!localGameState || !localGameState.players) return [];
  //   const player = localGameState.players.find(p => p.id === playerId);
  //   return player ? player.cards : [];
  // };

  // Проверка, мой ли ход (закомментировано, так как не используется)
  // const isMyTurn = () => {
  //   if (!localGameState || !localGameState.currentPlayer) return false;
  //   return localGameState.currentPlayer === playerId;
  // };

  return (
    <div className="game">
      <div className="game-container">
        {/* Заголовок */}
        <div className="game-header">
          <h1>🎰 ОНЛАЙН СЕККА</h1>
          <div className="room-info">
            <span>Комната: {roomIdRef.current || roomId || 'Не определена'}</span>
            <span>Игрок: {playerName || 'Не определен'}</span>
            <span>ID: {playerIdRef.current || playerId || 'Не определен'}</span>
          </div>
          <button onClick={onBackToLobby} className="back-btn">
            ← Назад в лобби
          </button>
        </div>

        {/* Секция готовности */}
        <div className="waiting-section">
          <h2>🎮 Комната ожидания</h2>
          
          {/* Информация о игроках */}
          <div className="players-info">
            <p>Игроков в комнате: {localGameState?.players?.length || 0}/6</p>

            {localGameState?.players && (
              <div className="players-row" aria-label="Список игроков">
                {localGameState.players.map((player, index) => {
                  const currentPlayerId = playerIdRef.current || playerId;
                  const isCreator = index === 0;
                  const isMe = player.id === currentPlayerId || (!currentPlayerId && player.name === playerName);
                  return (
              <div 
                key={player.id} 
                      className={`player-card${isCreator ? ' creator' : ''}${isMe ? ' me' : ''}`}
                      title={isCreator ? 'Создатель комнаты' : 'Игрок'}
                    >
                      <div className="player-card-header">
                        <span className="player-number">{index + 1}</span>
                        {isCreator && <span className="creator-badge" aria-label="Создатель">👑</span>}
                        {isMe && <span className="you-badge" aria-label="Вы">Вы</span>}
                      </div>
                      <div className="player-card-name">{player.name}</div>
                    </div>
                  );
                })}
                    </div>
                  )}
                </div>

          {/* Голосование готовности */}
          <div className="ready-voting">
            <div className="ready-status">
              <h3>👍 Готовность к игре</h3>
              <p>Готовых игроков: {readyPlayers.length}/{totalPlayers || localGameState?.players?.length || 0}</p>
              <div className="ready-progress">
                <div 
                  className="ready-progress-bar" 
                  style={{ 
                    width: `${(readyPlayers.length / (totalPlayers || localGameState?.players?.length || 1)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>

            <button 
              onClick={voteReady} 
              className="action-btn ready-btn" 
              disabled={isReady}
            >
              {isReady ? '✅ Готов!' : 'Готов к игре'}
                    </button>
            
            {/* Кнопка начала игры для создателя */}
            {isRoomCreator && localGameState?.players && localGameState.players.length >= 2 && (
                      <button 
                onClick={startGame} 
                className="start-game-btn"
                disabled={readyPlayers.length < 2}
              >
                🚀 Начать игру
                      </button>
            )}
            
            {/* Сообщение когда все готовы */}
            {readyPlayers.length === totalPlayers && totalPlayers >= 2 && (
              <p className="all-ready-message">🎉 Все готовы! Игра начнется автоматически...</p>
            )}
          </div>

          {/* Debug информация */}
          <div className="debug-info" style={{ background: 'rgba(0,0,0,0.1)', padding: '10px', margin: '10px', borderRadius: '5px' }}>
            <h4>🔍 Debug информация:</h4>
            <p>RoomId: {roomIdRef.current || roomId || 'Не определен'}</p>
            <p>PlayerId: {playerIdRef.current || playerId || 'Не определен'}</p>
            <p>PlayerName: {playerName || 'Не определен'}</p>
            <p>IsRoomCreator: {isRoomCreator ? 'Да' : 'Нет'}</p>
            <p>ReadyPlayers: {readyPlayers.length}</p>
            <p>TotalPlayers: {totalPlayers}</p>
            <p>Pusher подключен: {pusher?.connection?.state === 'connected' ? 'Да' : 'Нет'}</p>
            <p>Канал активен: {channel ? 'Да' : 'Нет'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineGame;