// server/pusherConfig.js
const Pusher = require('pusher');

// Конфигурация Pusher
// Требуются переменные окружения: PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER
const pusherAppId = process.env.PUSHER_APP_ID;
const pusherKey = process.env.PUSHER_KEY;
const pusherSecret = process.env.PUSHER_SECRET;
const pusherCluster = process.env.PUSHER_CLUSTER || 'eu';
const isProduction = process.env.NODE_ENV === 'production';

if (!pusherAppId || !pusherKey || !pusherSecret) {
  console.error('❌ ОШИБКА: Pusher credentials не настроены!');
  console.error('❌ Требуются переменные окружения: PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET');
  process.exit(1);
}

const pusherConfig = {
  appId: pusherAppId,
  key: pusherKey,
  secret: pusherSecret,
  cluster: pusherCluster,
  useTLS: isProduction
};

// Создаем экземпляр Pusher
const pusher = new Pusher(pusherConfig);

// Функция для отправки событий в комнату
const sendToRoom = (roomId, event, data) => {
  console.log(`📤 Pusher: Отправка события ${event} в комнату ${roomId}`);
  console.log(`📤 Pusher: Данные:`, data);
  
  try {
    pusher.trigger(`room-${roomId}`, event, data);
    console.log(`✅ Pusher: Событие ${event} успешно отправлено в комнату ${roomId}`);
  } catch (error) {
    console.error(`❌ Pusher: Ошибка отправки события ${event}:`, error);
  }
};

// Функция для отправки событий всем игрокам
const broadcastToAll = (event, data) => {
  console.log(`📡 Pusher: Трансляция события ${event} всем игрокам`);
  console.log(`📡 Pusher: Данные:`, data);
  
  try {
    pusher.trigger('global', event, data);
    console.log(`✅ Pusher: Событие ${event} успешно транслировано всем игрокам`);
  } catch (error) {
    console.error(`❌ Pusher: Ошибка трансляции события ${event}:`, error);
  }
};

// Функция для отправки событий конкретному игроку
const sendToPlayer = (playerId, event, data) => {
  console.log(`👤 Pusher: Отправка события ${event} игроку ${playerId}`);
  console.log(`👤 Pusher: Данные:`, data);
  
  try {
    pusher.trigger(`player-${playerId}`, event, data);
    console.log(`✅ Pusher: Событие ${event} успешно отправлено игроку ${playerId}`);
  } catch (error) {
    console.error(`❌ Pusher: Ошибка отправки события ${event} игроку ${playerId}:`, error);
  }
};

module.exports = {
  pusher,
  pusherConfig,
  sendToRoom,
  broadcastToAll,
  sendToPlayer
};
