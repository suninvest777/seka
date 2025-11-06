// Конфигурация приложения
// Использует переменные окружения для production

const getApiUrl = () => {
  // Если указан явный URL API (через переменную окружения)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // В production используем HTTPS того же домена (если frontend и backend на одном домене)
  if (process.env.NODE_ENV === 'production') {
    // Если frontend и backend на одном домене, используем относительный путь
    // Иначе нужно указать REACT_APP_API_URL
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

