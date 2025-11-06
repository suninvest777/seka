import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import './Lobby.css';

const Lobby = ({ serverStats, onJoinGame }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [error, setError] = useState('');

  // Функция для получения URL сервера
  const getServerUrl = () => {
    // Используем API_URL из конфигурации (поддерживает переменные окружения)
    if (API_URL) {
      return API_URL;
    }
    // Fallback для development
    const hostname = window.location.hostname;
    const port = '3006';
    return hostname !== 'localhost' && hostname !== '127.0.0.1' 
      ? `http://${hostname}:${port}` 
      : 'http://localhost:3006';
  };

  const loadRooms = useCallback(async () => {
    try {
      console.log('📋 Загрузка списка комнат...');
      
      const serverUrl = getServerUrl();
      console.log('🌐 Используем сервер:', serverUrl);
      const response = await fetch(`${serverUrl}/api/rooms`);
      
      if (response.ok) {
        const rooms = await response.json();
        setAvailableRooms(rooms);
        console.log('📋 Загружено комнат:', rooms.length);
      } else {
        console.error('❌ Ошибка загрузки комнат:', response.status);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки комнат:', error);
    }
  }, []);

  // Загрузка списка доступных комнат
  useEffect(() => {
    loadRooms();
    
    // Обновляем список комнат каждые 5 секунд
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, [loadRooms]);

  // Создание комнаты
  const createRoom = async () => {
    if (!playerName.trim() || !roomName.trim()) {
      setError('Введите имя игрока и название комнаты');
      return;
    }

    setIsCreatingRoom(true);
    setError('');

    try {
      console.log('🏠 Создание комнаты:', { roomName, playerName });
      
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, playerName })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Комната создана:', data);
        onJoinGame(data.roomId, playerName, data.playerId, data.isCreator);
      } else {
        console.error('❌ Ошибка создания комнаты:', data.error);
        setError(data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка создания комнаты:', error);
      setError('Ошибка создания комнаты');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Присоединение к комнате
  const joinRoom = async () => {
    if (!playerName.trim() || !roomId.trim()) {
      setError('Введите имя игрока и ID комнаты');
      return;
    }

    setIsJoiningRoom(true);
    setError('');

    try {
      console.log('🚪 Присоединение к комнате:', { roomId, playerName });
      
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerName })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Присоединились к комнате:', data);
        onJoinGame(data.roomId, playerName, data.playerId, data.isCreator);
      } else {
        console.error('❌ Ошибка присоединения:', data.error);
        setError(data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка присоединения:', error);
      setError('Ошибка присоединения к комнате');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Быстрое присоединение к комнате из списка
  const quickJoinRoom = async (targetRoomId) => {
    if (!playerName.trim()) {
      setError('Введите имя игрока');
      return;
    }

    setIsJoiningRoom(true);
    setError('');

    try {
      console.log('⚡ Быстрое присоединение к комнате:', { roomId: targetRoomId, playerName });
      
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: targetRoomId, playerName })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Быстро присоединились к комнате:', data);
        onJoinGame(data.roomId, playerName, data.playerId, data.isCreator);
      } else {
        console.error('❌ Ошибка быстрого присоединения:', data.error);
        setError(data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка быстрого присоединения:', error);
      setError('Ошибка присоединения к комнате');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-container">
        {/* Заголовок */}
        <div className="lobby-header">
          <h1 className="lobby-title">♠️ СЕККА | RIGOROUS 🃏</h1>
          <p className="lobby-subtitle">Строгая карточная игра с настоящими правилами</p>
        </div>

        {/* Статистика сервера */}
        {serverStats && (
          <div className="server-stats">
            <h3>📊 Статистика сервера</h3>
            <p>Подключено игроков: {serverStats.connectedPlayers}</p>
            <p>Активных комнат: {serverStats.activeRooms}</p>
            <p>Статус: {serverStats.status}</p>
          </div>
        )}

        {/* Форма создания комнаты */}
        <div className="create-room-section">
          <h2>🏠 Создать комнату</h2>
          <div className="form-group">
            <input
              type="text"
              placeholder="Ваше имя"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="Название комнаты"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="form-input"
            />
          </div>
          <button
            onClick={createRoom}
            disabled={isCreatingRoom}
            className="action-btn create-btn"
          >
            {isCreatingRoom ? '⏳ Создание...' : '🏠 Создать комнату'}
          </button>
        </div>

        {/* Форма присоединения к комнате */}
        <div className="join-room-section">
          <h2>🚪 Присоединиться к комнате</h2>
          <div className="form-group">
            <input
              type="text"
              placeholder="Ваше имя"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="ID комнаты"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="form-input"
            />
          </div>
          <button
            onClick={joinRoom}
            disabled={isJoiningRoom}
            className="action-btn join-btn"
          >
            {isJoiningRoom ? '⏳ Присоединение...' : '🚪 Присоединиться'}
          </button>
        </div>

        {/* Список доступных комнат */}
        <div className="available-rooms-section">
          <h2>📋 Доступные комнаты</h2>
          <button onClick={loadRooms} className="refresh-btn">
            🔄 Обновить список
          </button>
          
          {availableRooms.length > 0 ? (
            <div className="rooms-list">
              {availableRooms.map((room) => (
                <div key={room.id} className="room-item">
                  <div className="room-info">
                    <h4>{room.name}</h4>
                    <p>ID: {room.id}</p>
                    <p>Игроков: {room.players}/{room.maxPlayers}</p>
                    <p>Статус: {room.gameState}</p>
                  </div>
                  <button
                    onClick={() => quickJoinRoom(room.id)}
                    disabled={isJoiningRoom || room.players >= room.maxPlayers}
                    className="quick-join-btn"
                  >
                    {room.players >= room.maxPlayers ? 'Заполнена' : 'Присоединиться'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-rooms">Нет доступных комнат</p>
          )}
        </div>

        {/* Сообщения об ошибках */}
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {/* Информация о системе */}
        <div className="system-info">
          <h3>ℹ️ Информация о системе</h3>
          <p>• Максимум 6 игроков в комнате</p>
          <p>• Минимум 2 игрока для начала игры</p>
          <p>• Все игроки должны проголосовать за готовность</p>
          <p>• Создатель комнаты может начать игру</p>
        </div>
      </div>
    </div>
  );
};

export default Lobby;