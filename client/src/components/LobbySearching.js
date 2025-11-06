import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import './LobbySearching.css';

const LobbySearching = ({ onJoinGame, onBackToLanding }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(7);
  const [roomPassword, setRoomPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [selectedRoomForJoin, setSelectedRoomForJoin] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(true);

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

  // Автоподстановка имени из профиля (localStorage "seka_user")
  useEffect(() => {
    try {
      const raw = localStorage.getItem('seka_user');
      if (raw) {
        const user = JSON.parse(raw);
        const inferredName = (user && (user.name || (user.email ? String(user.email).split('@')[0] : ''))) || '';
        if (inferredName && !playerName) {
          setPlayerName(inferredName);
        }
      } else {
        // Фолбэк: если сохраняли только email
        const savedEmail = localStorage.getItem('seka_saved_email');
        if (savedEmail && !playerName) {
          const fallback = String(savedEmail).split('@')[0];
          if (fallback) setPlayerName(fallback);
        }
      }
    } catch (_) {
      // игнорируем ошибки чтения/парсинга
    }
    // однократно на маунт
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRooms = useCallback(async () => {
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
        setAvailableRooms(rooms);
        setIsSearching(false);
        
        // Логируем только при успешной загрузке
        if (rooms.length > 0) {
          console.log('📋 Загружено комнат:', rooms.length);
        }
      } else {
        setIsSearching(false);
      }
    } catch (error) {
      // Логируем ошибку только один раз или если это не таймаут
      if (error.name !== 'AbortError' && !loadRooms._errorLogged) {
        console.warn('⚠️ Сервер недоступен. Убедитесь, что сервер запущен на порту 3006');
        loadRooms._errorLogged = true;
        
        // Показываем сообщение пользователю
        setError('Сервер недоступен. Пожалуйста, запустите сервер.');
      }
      setIsSearching(false);
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
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/create-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName.trim(),
          playerName: playerName.trim(),
          maxPlayers: parseInt(maxPlayers, 10),
          password: roomPassword.trim() || null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Комната создана:', data);
        // Передаем все данные из ответа сервера
        onJoinGame(
          data.roomId || data.room?.id, 
          playerName.trim(), 
          data.playerId || data.room?.players?.[0]?.id,
          data.isCreator !== undefined ? data.isCreator : true // Создатель комнаты всегда true при создании
        );
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка создания комнаты');
      }
    } catch (error) {
      console.error('❌ Ошибка создания комнаты:', error);
      setError('Ошибка соединения с сервером');
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

    // Проверяем, есть ли комната в списке availableRooms для получения информации о пароле
    const roomFromList = availableRooms.find(r => r.id === roomId.trim());
    
    // Если комната с паролем и пароль не введен, показываем ошибку
    if (roomFromList && roomFromList.hasPassword && !joinPassword.trim()) {
      setError('Эта комната защищена паролем. Введите пароль.');
      return;
    }

    setIsJoiningRoom(true);
    setError('');

    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/join-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: roomId.trim(),
          playerName: playerName.trim(),
          password: joinPassword.trim() || null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Присоединились к комнате:', data);
        // Передаем все данные из ответа сервера
        onJoinGame(
          data.roomId || roomId.trim(),
          playerName.trim(),
          data.playerId || data.room?.players?.find(p => p.name === playerName.trim())?.id,
          data.isCreator !== undefined ? data.isCreator : false // При присоединении обычно false
        );
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Ошибка присоединения к комнате';
        setError(errorMsg);
        // Если ошибка пароля, и комната найдена в списке, показываем модальное окно
        if (errorMsg.includes('пароль') && !selectedRoomForJoin && roomFromList) {
          setSelectedRoomForJoin(roomFromList);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка присоединения к комнате:', error);
      setError('Ошибка соединения с сервером');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Присоединение к существующей комнате
  const joinExistingRoom = async (room) => {
    if (!playerName.trim()) {
      setError('Введите имя игрока');
      return;
    }

    // Если комната с паролем, показываем модальное окно для ввода пароля
    if (room.hasPassword && !joinPassword.trim()) {
      setSelectedRoomForJoin(room);
      setError(''); // Очищаем предыдущие ошибки
      return; // Не присоединяемся, ждем ввода пароля
    }

    setIsJoiningRoom(true);
    setError('');
    setSelectedRoomForJoin(null); // Закрываем модальное окно

    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/join-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: room.id,
          playerName: playerName.trim(),
          password: room.hasPassword ? joinPassword.trim() : null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Присоединились к комнате:', data);
        // Передаем все данные из ответа сервера
        onJoinGame(
          data.roomId || room.id,
          playerName.trim(),
          data.playerId || data.room?.players?.find(p => p.name === playerName.trim())?.id,
          data.isCreator !== undefined ? data.isCreator : false // При присоединении обычно false
        );
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Ошибка присоединения к комнате';
        setError(errorMsg);
        // Если ошибка пароля, открываем модальное окно если его еще нет
        if (errorMsg.includes('пароль') && !selectedRoomForJoin) {
          setSelectedRoomForJoin(room);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка присоединения к комнате:', error);
      setError('Ошибка соединения с сервером');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  return (
    <div className="lobby-searching">
      <div className="lobby-container">
        {/* Заголовок */}
        <div className="lobby-header">
          <button className="back-to-landing-btn" onClick={onBackToLanding}>
            ← Назад к главной
          </button>
          <h1 className="lobby-title">♠️ ПОИСК ИГРЫ</h1>
          <p className="lobby-subtitle">Найдите подходящую комнату или создайте свою</p>
        </div>

        {/* Имя игрока берется из профиля автоматически (инпут удален) */}

        {/* Создание комнаты */}
        <div className="create-room">
          <h2>🏗️ Создать новую комнату</h2>
          <input
            type="text"
            placeholder="Название комнаты"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            maxLength={30}
          />
          <div className="room-settings">
            <label>
              <span>👥 Количество игроков:</span>
              <select 
                value={maxPlayers} 
                onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
                className="max-players-select"
              >
                <option value={2}>2 игрока</option>
                <option value={3}>3 игрока</option>
                <option value={4}>4 игрока</option>
                <option value={5}>5 игроков</option>
                <option value={6}>6 игроков</option>
                <option value={7}>7 игроков</option>
              </select>
            </label>
            <label>
              <span>🔒 Пароль (необязательно):</span>
              <input
                type="password"
                placeholder="Оставьте пустым для открытой комнаты"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                maxLength={20}
              />
            </label>
          </div>
          <button 
            className="create-btn" 
            onClick={createRoom}
            disabled={isCreatingRoom || !playerName.trim() || !roomName.trim()}
          >
            {isCreatingRoom ? 'Создание...' : 'Создать комнату'}
          </button>
        </div>

        {/* Присоединение к комнате */}
        <div className="join-room">
          <h2>🔗 Присоединиться к комнате</h2>
          <input
            type="text"
            placeholder="ID комнаты"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            type="password"
            placeholder="Пароль (если требуется)"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
            maxLength={20}
          />
          <button 
            className="join-btn" 
            onClick={joinRoom}
            disabled={isJoiningRoom || !playerName.trim() || !roomId.trim()}
          >
            {isJoiningRoom ? 'Присоединение...' : 'Присоединиться'}
          </button>
        </div>

        {/* Список доступных комнат */}
        <div className="rooms-list">
          <h2>🎮 Доступные комнаты</h2>
          {isSearching ? (
            <div className="loading">
              <div className="searching-animation">
                <span className="searching-icon">🔍</span>
                <span className="searching-text">Поиск комнат...</span>
              </div>
            </div>
          ) : availableRooms.length === 0 ? (
            <div className="no-rooms">
              <span className="no-rooms-icon">🎯</span>
              <p>Нет доступных комнат. Создайте свою!</p>
            </div>
          ) : (
            <div className="rooms-grid">
              {availableRooms.map((room) => (
                <div key={room.id} className="room-item" onClick={() => joinExistingRoom(room)}>
                  <div className="room-image-wrapper">
                    <img 
                      src="/image/rooms.png" 
                      alt={room.name}
                      className="room-image"
                      onError={(e) => {
                        // Если изображение не загрузилось, скрываем его
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="room-name">
                    {room.name}
                    {room.hasPassword && <span className="room-password-icon" title="Комната с паролем">🔒</span>}
                  </div>
                  <div className="room-info">
                    <div className="room-stat">
                      <div className="room-stat-value">{room.players}</div>
                      <div className="room-stat-label">Игроков</div>
                    </div>
                    <div className="room-stat">
                      <div className="room-stat-value">{room.maxPlayers}</div>
                      <div className="room-stat-label">Макс.</div>
                    </div>
                    {room.hasPassword && (
                      <div className="room-stat">
                        <div className="room-stat-value">🔒</div>
                        <div className="room-stat-label">Пароль</div>
                      </div>
                    )}
                  </div>
                  <div className="room-join-hint">
                    Нажмите для присоединения
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Модальное окно для ввода пароля */}
        {selectedRoomForJoin && selectedRoomForJoin.hasPassword && (
          <div className="password-modal-overlay" onClick={() => {
            setSelectedRoomForJoin(null);
            setJoinPassword('');
          }}>
            <div className="password-modal" onClick={(e) => e.stopPropagation()}>
              <h3>🔒 Комната защищена паролем</h3>
              <p>Введите пароль для комнаты "{selectedRoomForJoin.name}"</p>
              {error && error.includes('пароль') && (
                <div className="password-error">{error}</div>
              )}
              <input
                type="password"
                placeholder="Пароль"
                value={joinPassword}
                onChange={(e) => {
                  setJoinPassword(e.target.value);
                  setError(''); // Очищаем ошибку при вводе
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && joinPassword.trim()) {
                    joinExistingRoom(selectedRoomForJoin);
                  }
                }}
                autoFocus
                maxLength={20}
              />
              <div className="password-modal-buttons">
                <button 
                  className="password-submit-btn"
                  onClick={() => joinExistingRoom(selectedRoomForJoin)}
                  disabled={!joinPassword.trim() || isJoiningRoom}
                >
                  {isJoiningRoom ? 'Присоединение...' : 'Присоединиться'}
                </button>
                <button 
                  className="password-cancel-btn"
                  onClick={() => {
                    setSelectedRoomForJoin(null);
                    setJoinPassword('');
                    setError('');
                  }}
                  disabled={isJoiningRoom}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Ошибки */}
        {error && !selectedRoomForJoin && (
          <div className="error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default LobbySearching;
