// Конфигурация приложения
// Использует переменные окружения для production

const getApiUrl = () => {
  // В production используем переменную окружения или относительный путь
  if (process.env.NODE_ENV === 'production') {
    // Если указан явный URL API
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    // Иначе используем относительный путь (тот же домен)
    return '';
  }
  
  // В development используем localhost
  const hostname = window.location.hostname;
  const port = '3006';
  return hostname !== 'localhost' && hostname !== '127.0.0.1' 
    ? `http://${hostname}:${port}` 
    : 'http://localhost:3006';
};

export const API_URL = getApiUrl();

