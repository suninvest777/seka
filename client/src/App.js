import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import LobbySearching from './components/LobbySearching';
import Lobby from './components/Lobby';
import OnlineGame from './components/OnlineGame';
import GameTable from './components/GameTable';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'searching', 'lobby', 'waiting', или 'playing'
  const [gameState, setGameState] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  const [serverStats, setServerStats] = useState({ 
    connectedPlayers: 0, 
    activeRooms: 0, 
    status: 'Проверка...' 
  });

  // Функция для получения URL сервера
  const getServerUrl = () => {
    const hostname = window.location.hostname;
    const port = '3006';
    return hostname !== 'localhost' && hostname !== '127.0.0.1' 
      ? `http://${hostname}:${port}` 
      : 'http://localhost:3006';
  };

  // Проверка статуса сервера
  useEffect(() => {
    checkServerStatus();
    
    // Проверяем статус сервера каждые 10 секунд
    const interval = setInterval(checkServerStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    try {
      const serverUrl = getServerUrl();
      
      // Используем AbortController для таймаута
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${serverUrl}/api/rooms`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const rooms = await response.json();
        setServerStats({
          connectedPlayers: rooms.reduce((total, room) => total + (room.players?.length || 0), 0),
          activeRooms: rooms.length,
          status: 'Онлайн'
        });
      } else {
        setServerStats({
          connectedPlayers: 0,
          activeRooms: 0,
          status: 'Ошибка'
        });
      }
    } catch (error) {
      // Логируем только если это не таймаут (чтобы не спамить консоль)
      if (error.name !== 'AbortError' && error.name !== 'TimeoutError') {
        // Логируем только один раз при первой ошибке
        if (!checkServerStatus._errorLogged) {
          console.warn('⚠️ Сервер недоступен. Убедитесь, что сервер запущен на порту 3006');
          checkServerStatus._errorLogged = true;
        }
      }
      setServerStats({
        connectedPlayers: 0,
        activeRooms: 0,
        status: 'Недоступен'
      });
    }
  };

  // Обработка начала игры с лендинга
  const handleStartGameFromLanding = () => {
    console.log('🎮 Переход к поиску комнат с лендинга');
    setCurrentView('searching');
  };

  // Возврат к лендингу
  const handleBackToLanding = () => {
    console.log('🏠 Возврат к лендингу');
    setCurrentView('landing');
    setCurrentRoom(null);
    setGameState(null);
    setPlayerName('');
    setPlayerId('');
    setIsRoomCreator(false);
  };

  // Обработка присоединения к игре
  const handleJoinGame = (roomId, name, id, creator) => {
    console.log('🎮 Присоединение к игре:', { roomId, name, id, creator });
    
    setCurrentRoom({
      id: roomId,
      name: name,
      playerId: id,
      isCreator: creator
    });
    
    setPlayerName(name);
    setPlayerId(id);
    setIsRoomCreator(creator);
    setCurrentView('waiting');
    
    console.log('🎮 Переход в режим ожидания');
  };

  // Обработка начала игры
  const handleStartGame = () => {
    console.log('🎮 Начало игры - переход на игровой стол');
    
    // Определяем URL игрового стола динамически
    const hostname = window.location.hostname;
    const port = window.location.port || '3000';
    const gameTableHost = hostname !== 'localhost' && hostname !== '127.0.0.1' 
      ? hostname 
      : 'localhost';
    
    const gameTableUrl = `http://${gameTableHost}:${port}/game-table-test.html?roomId=${currentRoom.id}&playerName=${encodeURIComponent(playerName)}&playerId=${playerId}`;
    
    console.log('🌐 URL игрового стола:', gameTableUrl);
    console.log('🎮 ===== ВЫПОЛНЯЕМ ПЕРЕХОД =====');
    
    // Перенаправляем на игровой стол
    window.location.href = gameTableUrl;
  };

  // Возврат в лобби
  const handleBackToLobby = () => {
    console.log('🏠 Возврат в лобби');
    
    setCurrentView('lobby');
    setCurrentRoom(null);
    setGameState(null);
    setPlayerName('');
    setPlayerId('');
    setIsRoomCreator(false);
  };

  // Рендеринг компонентов
  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return (
          <Landing
            onStartGame={handleStartGameFromLanding}
          />
        );
      
      case 'searching':
        return (
          <LobbySearching
            onJoinGame={handleJoinGame}
            onBackToLanding={handleBackToLanding}
          />
        );
      
      case 'lobby':
        return (
          <Lobby
            serverStats={serverStats}
            onJoinGame={handleJoinGame}
          />
        );
      
      case 'waiting':
      case 'playing':
        return (
          <OnlineGame
            roomId={currentRoom?.id}
            playerName={playerName}
            playerId={playerId}
            onBackToLobby={handleBackToLanding}
            onStartGame={handleStartGame}
          />
        );
      
      default:
        return (
          <Landing
            onStartGame={handleStartGameFromLanding}
          />
        );
    }
  };

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  );
}

export default App;