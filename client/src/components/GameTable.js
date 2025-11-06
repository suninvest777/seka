import React, { useState, useEffect } from 'react';
import './GameTable.css';

const GameTable = ({ socket, gameState, roomId, playerName, onBackToLobby }) => {
  const [localGameState, setLocalGameState] = useState(gameState);
  const [isMyTurnState, setIsMyTurnState] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [playerId, setPlayerId] = useState(null);

  // Обновление локального состояния при получении обновлений от сервера
  useEffect(() => {
    if (gameState) {
      setLocalGameState(gameState);
      console.log('🎮 Обновление игрового состояния:', gameState);
    }
  }, [gameState]);

  // Получение playerId из localStorage
  useEffect(() => {
    const savedPlayerId = localStorage.getItem('playerId');
    if (savedPlayerId) {
      setPlayerId(savedPlayerId);
    }
  }, []);

  // Обработчики игровых событий
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleGameUpdate = (data) => {
      console.log('🎮 Обновление игры:', data);
      setLocalGameState(data);
    };

    const handleGameStarted = (data) => {
      console.log('🚀 Игра началась!', data);
      setLocalGameState(data);
    };

    const handlePlayerJoined = (data) => {
      console.log('👥 Игрок присоединился:', data);
      if (data.room && data.room.players) {
        setLocalGameState(prevState => ({
          ...prevState,
          players: data.room.players
        }));
      }
    };

    const handlePlayerLeft = (data) => {
      console.log('👋 Игрок покинул игру:', data);
      if (data.room && data.room.players) {
        setLocalGameState(prevState => ({
          ...prevState,
          players: data.room.players
        }));
      }
    };

    // Регистрация обработчиков
    socket.on('GAME_UPDATE', handleGameUpdate);
    socket.on('GAME_STARTED', handleGameStarted);
    socket.on('PLAYER_JOINED', handlePlayerJoined);
    socket.on('PLAYER_LEFT', handlePlayerLeft);

    return () => {
      socket.off('GAME_UPDATE', handleGameUpdate);
      socket.off('GAME_STARTED', handleGameStarted);
      socket.off('PLAYER_JOINED', handlePlayerJoined);
      socket.off('PLAYER_LEFT', handlePlayerLeft);
    };
  }, [socket, roomId]);

  // Отправка хода на сервер
  const makeMove = (action, amount = 0) => {
    if (!socket || !localGameState) return;

    console.log(`🎯 Игрок ${playerName} делает ход: ${action}`, amount ? `на ${amount}` : '');
    
    socket.emit('MAKE_MOVE', {
      roomId: roomId,
      action: action,
      amount: amount
    });
  };

  // Получение карт текущего игрока
  const getMyCards = () => {
    if (!localGameState || !localGameState.players) return [];
    
    const myPlayer = localGameState.players.find(p => p.id === playerId);
    return myPlayer ? myPlayer.cards || [] : [];
  };

  // Получение текущего игрока
  const getCurrentPlayer = () => {
    if (!localGameState || !localGameState.players) return null;
    return localGameState.players[localGameState.currentPlayer] || null;
  };

  // Получение моего игрока
  const getMyPlayer = () => {
    if (!localGameState || !localGameState.players) return null;
    return localGameState.players.find(p => p.id === playerId) || null;
  };

  // Проверка, мой ли ход
  const isMyTurn = () => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer && currentPlayer.id === playerId;
  };

  // Получение карт игрока
  const getPlayerCards = (player) => {
    if (!player || !player.cards) return [];
    return player.cards;
  };

  // Рендер карты
  const renderCard = (card, index) => {
    if (!card) return null;
    
    return (
      <div key={index} className="card">
        <div className="card-suit">{card.suit}</div>
        <div className="card-value">{card.value}</div>
      </div>
    );
  };

  const myCards = getMyCards();
  const currentPlayer = getCurrentPlayer();
  const myPlayer = getMyPlayer();
  const isMyTurnNow = isMyTurn();

  return (
    <div className="game-table-container">
      {/* Заголовок игры */}
      <div className="game-header">
        <div className="game-title">
          <h1>🎰 СЕККА - Игра в процессе</h1>
          <p>Комната: {roomId} | Игрок: {playerName}</p>
        </div>
        <button 
          onClick={onBackToLobby} 
          className="exit-button"
        >
          ← Выйти в лобби
        </button>
      </div>

      {/* Игровой стол */}
      <div className="game-table">
        {/* Центр стола - банк и общие карты */}
        <div className="table-center">
          <div className="pot">
            <h3>💰 Банк: {localGameState?.pot || 0}</h3>
          </div>
          
          {localGameState?.communityCards && localGameState.communityCards.length > 0 && (
            <div className="community-cards">
              <h4>Общие карты:</h4>
              <div className="cards-container">
                {localGameState.communityCards.map((card, index) => renderCard(card, index))}
              </div>
            </div>
          )}
        </div>

        {/* Игроки вокруг стола */}
        <div className="players-around-table">
          {localGameState?.players?.map((player, index) => {
            const isCurrentPlayer = currentPlayer && currentPlayer.id === player.id;
            const isMe = player.id === playerId;
            const playerCards = getPlayerCards(player);
            
            return (
              <div 
                key={player.id} 
                className={`player-seat ${isCurrentPlayer ? 'current-player' : ''} ${isMe ? 'my-seat' : ''}`}
                style={{
                  transform: `rotate(${(360 / localGameState.players.length) * index}deg) translateY(-200px) rotate(${-(360 / localGameState.players.length) * index}deg)`
                }}
              >
                <div className="player-avatar">
                  <div className="avatar-circle">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-chips">💰 {player.chips || 0}</div>
                    <div className="player-bet">Ставка: {player.currentBet || 0}</div>
                    {isCurrentPlayer && <div className="current-turn">🎯 ХОД</div>}
                  </div>
                </div>
                
                {/* Карты игрока */}
                {playerCards.length > 0 && (
                  <div className="player-cards">
                    {playerCards.map((card, cardIndex) => 
                      isMe ? renderCard(card, cardIndex) : (
                        <div key={cardIndex} className="card card-back">
                          <div className="card-back-pattern">🂠</div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Панель действий */}
      {isMyTurnNow && (
        <div className="action-panel">
          <div className="action-buttons">
            <button 
              onClick={() => makeMove('fold')} 
              className="action-btn fold-btn"
            >
              📤 Сбросить
            </button>
            
            <button 
              onClick={() => makeMove('call')} 
              className="action-btn call-btn"
            >
              📞 Принять
            </button>
            
            <button 
              onClick={() => makeMove('raise', raiseAmount)} 
              className="action-btn raise-btn"
            >
              📈 Поднять
            </button>
            
            <button 
              onClick={() => makeMove('all-in')} 
              className="action-btn allin-btn"
            >
              🔥 Ва-банк
            </button>
          </div>
          
          {/* Слайдер для ставки */}
          <div className="raise-controls">
            <label>Сумма ставки: {raiseAmount}</label>
            <input
              type="range"
              min="0"
              max={myPlayer?.chips || 0}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
              className="raise-slider"
            />
            <div className="raise-buttons">
              <button onClick={() => setRaiseAmount(Math.min(raiseAmount + 10, myPlayer?.chips || 0))}>
                +10
              </button>
              <button onClick={() => setRaiseAmount(Math.min(raiseAmount + 50, myPlayer?.chips || 0))}>
                +50
              </button>
              <button onClick={() => setRaiseAmount(myPlayer?.chips || 0)}>
                Все
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Информация о текущем состоянии игры */}
      <div className="game-info">
        <div className="game-phase">
          <h3>Фаза игры: {localGameState?.gamePhase || 'Ожидание'}</h3>
        </div>
        
        <div className="current-bet">
          <p>Текущая ставка: {localGameState?.currentBet || 0}</p>
        </div>
        
        {!isMyTurnNow && currentPlayer && (
          <div className="waiting-for-player">
            <p>⏳ Ожидание хода игрока: {currentPlayer.name}</p>
          </div>
        )}
      </div>

      {/* Мои карты */}
      {myCards.length > 0 && (
        <div className="my-cards">
          <h3>Мои карты:</h3>
          <div className="cards-container">
            {myCards.map((card, index) => renderCard(card, index))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameTable;
