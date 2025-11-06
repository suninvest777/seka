// client/src/pusherConfig.js
import Pusher from 'pusher-js';

// Конфигурация Pusher для клиента
// Требуются переменные окружения: REACT_APP_PUSHER_KEY, REACT_APP_PUSHER_CLUSTER
const isProduction = process.env.NODE_ENV === 'production';
const pusherKey = process.env.REACT_APP_PUSHER_KEY;
const pusherCluster = process.env.REACT_APP_PUSHER_CLUSTER || 'eu';

if (!pusherKey) {
  console.error('❌ ОШИБКА: REACT_APP_PUSHER_KEY не настроен!');
  console.error('❌ Требуется переменная окружения: REACT_APP_PUSHER_KEY');
  throw new Error('Pusher key не настроен');
}

const pusherConfig = {
  key: pusherKey,
  cluster: pusherCluster,
  useTLS: isProduction
};

// Создаем экземпляр Pusher для клиента
const pusher = new Pusher(pusherConfig.key, pusherConfig);

// Экспортируем конфигурацию для использования в других компонентах
export { pusherConfig };

// Функция для подписки на события комнаты
export const subscribeToRoom = (roomId, callback) => {
  console.log(`🔌 Pusher: Подписка на события комнаты ${roomId}`);
  
  const channel = pusher.subscribe(`room-${roomId}`);
  
  // Обработчики событий
  channel.bind('PLAYER_READY', (data) => {
    console.log('👍 Pusher: Получено событие PLAYER_READY:', data);
    callback('PLAYER_READY', data);
  });
  
  channel.bind('READY_UPDATE', (data) => {
    console.log('👍 Pusher: Получено событие READY_UPDATE:', data);
    callback('READY_UPDATE', data);
  });
  
  channel.bind('START_GAME', (data) => {
    console.log('🎮 Pusher: Получено событие START_GAME:', data);
    callback('START_GAME', data);
  });
  
  channel.bind('GAME_UPDATE', (data) => {
    console.log('🎯 Pusher: Получено событие GAME_UPDATE:', data);
    callback('GAME_UPDATE', data);
  });
  
  channel.bind('PLAYER_JOINED', (data) => {
    console.log('👥 Pusher: Получено событие PLAYER_JOINED:', data);
    callback('PLAYER_JOINED', data);
  });
  
  channel.bind('PLAYER_LEFT', (data) => {
    console.log('👋 Pusher: Получено событие PLAYER_LEFT:', data);
    callback('PLAYER_LEFT', data);
  });
  
  channel.bind('GAME_STATE_UPDATE', (data) => {
    console.log('🔄 Pusher: Получено событие GAME_STATE_UPDATE:', data);
    callback('GAME_STATE_UPDATE', data);
  });
  
  channel.bind('REDIRECT_TO_GAME_TABLE', (data) => {
    console.log('🎮 Pusher: Получено событие REDIRECT_TO_GAME_TABLE:', data);
    callback('REDIRECT_TO_GAME_TABLE', data);
  });
  
  return channel;
};

// Функция для подписки на глобальные события
export const subscribeToGlobal = (callback) => {
  console.log('🌐 Pusher: Подписка на глобальные события');
  
  const channel = pusher.subscribe('global');
  
  channel.bind('ROOM_CREATED', (data) => {
    console.log('🏠 Pusher: Получено событие ROOM_CREATED:', data);
    callback('ROOM_CREATED', data);
  });
  
  channel.bind('ROOM_JOINED', (data) => {
    console.log('🚪 Pusher: Получено событие ROOM_JOINED:', data);
    callback('ROOM_JOINED', data);
  });
  
  return channel;
};

// Функция для подписки на события игрока
export const subscribeToPlayer = (playerId, callback) => {
  console.log(`👤 Pusher: Подписка на события игрока ${playerId}`);
  
  const channel = pusher.subscribe(`player-${playerId}`);
  
  channel.bind('NOTIFICATION', (data) => {
    console.log('🔔 Pusher: Получено уведомление:', data);
    callback('NOTIFICATION', data);
  });
  
  channel.bind('ERROR', (data) => {
    console.log('❌ Pusher: Получена ошибка:', data);
    callback('ERROR', data);
  });
  
  return channel;
};

// Функция для отписки от канала
export const unsubscribeFromChannel = (channel) => {
  if (channel) {
    console.log('🔌 Pusher: Отписка от канала');
    pusher.unsubscribe(channel.name);
  }
};

// Функция для отключения от Pusher
export const disconnectPusher = () => {
  console.log('🔌 Pusher: Отключение от Pusher');
  pusher.disconnect();
};

// Функция для проверки состояния подключения
export const getPusherState = () => {
  return {
    connected: pusher.connection.state === 'connected',
    state: pusher.connection.state,
    socketId: pusher.connection.socket_id
  };
};

export default pusher;
