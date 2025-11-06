import React, { useState, useEffect } from 'react';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import ProfileModal from './ProfileModal';
import DepositModal from './DepositModal';
import WithdrawModal from './WithdrawModal';
import './Landing.css';

const Landing = ({ onStartGame }) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Восстановление данных пользователя из localStorage при загрузке
  useEffect(() => {
    const savedUser = localStorage.getItem('seka_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('🔓 Восстановление сессии пользователя:', userData);
        setUser(userData);
      } catch (error) {
        console.error('❌ Ошибка восстановления пользователя:', error);
        localStorage.removeItem('seka_user');
      }
    }
  }, []);

  // Сохранение данных пользователя в localStorage
  const saveUserToStorage = (userData) => {
    if (userData) {
      localStorage.setItem('seka_user', JSON.stringify(userData));
      console.log('💾 Пользователь сохранен в localStorage');
    } else {
      localStorage.removeItem('seka_user');
      console.log('🗑️ Пользователь удален из localStorage');
    }
  };

  const handleLogin = (userData, rememberMe = false) => {
    console.log('🔐 Пользователь вошел:', userData, 'Запомнить:', rememberMe);
    setUser(userData);
    
    // Всегда сохраняем пользователя для запоминания сессии
    saveUserToStorage(userData);
    
    setIsLoginModalOpen(false);
  };

  const handleRegister = (userData) => {
    console.log('📝 Пользователь зарегистрирован:', userData);
    setUser(userData);
    saveUserToStorage(userData); // Сохраняем при регистрации
    setIsRegisterModalOpen(false);
  };

  const handleLogout = () => {
    console.log('🚪 Пользователь вышел');
    setUser(null);
    saveUserToStorage(null); // Удаляем из localStorage
  };

  const handleSwitchToRegister = () => {
    setIsLoginModalOpen(false);
    setIsRegisterModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsRegisterModalOpen(false);
    setIsLoginModalOpen(true);
  };

  const handleStartGame = () => {
    if (!user) {
      // Если пользователь не авторизован, показываем модальное окно входа
      setIsLoginModalOpen(true);
      return;
    }
    
    // Если пользователь авторизован, переходим к игре
    console.log('🎮 Авторизованный пользователь начинает игру:', user);
    onStartGame();
  };

  const handleProfile = () => {
    console.log('👤 Открытие профиля пользователя:', user);
    setIsProfileModalOpen(true);
  };

  const handleDeposit = () => {
    console.log('💰 Пополнение счета пользователя:', user);
    setIsDepositModalOpen(true);
  };

  const handleWithdraw = () => {
    console.log('💸 Вывод средств пользователя:', user);
    setIsWithdrawModalOpen(true);
  };

  const handleUpdateUser = (updatedUser) => {
    console.log('👤 Обновление данных пользователя:', updatedUser);
    setUser(updatedUser);
    saveUserToStorage(updatedUser); // Сохраняем обновленные данные
  };

  const handleUpdateBalance = (newBalance) => {
    console.log('💰 Обновление баланса:', newBalance);
    const updatedUser = {
      ...user,
      balance: newBalance
    };
    setUser(updatedUser);
    saveUserToStorage(updatedUser); // Сохраняем обновленный баланс
  };

  const handleClaimQuest = (reward) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    const current = Number(user.balance || 0);
    handleUpdateBalance(current + reward);
  };
  return (
    <main className="landing-page">
      <header className="main-header">
        <div className="logo">
          <span className="logo-icon">♠️</span>
          <span className="logo-text">СЕККА | RIGOROUS</span>
        </div>
        <nav className="main-nav">
          <a href="#features" className="nav-link">Функционал</a>
          <a href="#news" className="nav-link">Новости</a>
          <a href="#quests" className="nav-link">Задания</a>
          <a href="#rules" className="nav-link">Правила</a>
          <a href="#contact" className="nav-link">Поддержка</a>
        </nav>
        <div className="auth-buttons">
          {user ? (
            <div className="user-info">
              <div className="user-profile">
                <span className="user-name">👤 {user.name}</span>
                <div className="user-balance">💰 {user.balance || 1000} ₽</div>
              </div>
              <div className="user-actions">
                <button className="btn btn-profile" onClick={handleProfile}>
                  Профиль
                </button>
                <button className="btn btn-deposit" onClick={handleDeposit}>
                  Пополнить
                </button>
                <button className="btn btn-withdraw" onClick={handleWithdraw}>
                  Вывести
                </button>
                <button className="btn btn-logout" onClick={handleLogout}>
                  Выйти
                </button>
              </div>
            </div>
          ) : (
            <>
              <button className="btn btn-login" onClick={() => setIsLoginModalOpen(true)}>
                Вход
              </button>
              <button className="btn btn-register btn-accent" onClick={() => setIsRegisterModalOpen(true)}>
                Регистрация
              </button>
            </>
          )}
        </div>
      </header>

      <section className="hero-section">
        <h1 className="hero-title">Искусство Карточного Азарта</h1>
        <p className="hero-subtitle">Вара, Секки, Тройки: Играйте по Авторитетным Правилам</p>
        <div className="hero-buttons">
          <button className="btn btn-primary btn-large btn-accent" onClick={handleStartGame}>
            {user ? 'Начать Игру' : 'Войти для игры'}
          </button>
          {!user && (
            <button className="btn btn-secondary btn-large" onClick={() => setIsRegisterModalOpen(true)}>
              Быстрая регистрация
            </button>
          )}
        </div>
        <p className="hero-small-text">
          {user 
            ? `Добро пожаловать, ${user.name}! Более 1000 игроков в сети. Контроль честности гарантирован.`
            : 'Для начала игры необходимо войти в систему. Более 1000 игроков в сети. Контроль честности гарантирован.'
          }
        </p>
      </section>

      <section id="quests" className="features-section">
        <h2 className="section-title">🎯 Задания за фишки</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="card-icon">✅</span>
            <h3 className="card-title">Пройди обучение</h3>
            <p>Открой раздел правил и изучи базовые комбинации.</p>
            <div style={{marginTop: '15px', display:'flex', gap:'10px', alignItems:'center'}}>
              <span style={{color:'var(--color-accent)', fontWeight:700}}>+10 фишек</span>
              <button className="btn btn-accent" onClick={() => handleClaimQuest(10)}>Выполнить</button>
            </div>
          </div>
          <div className="feature-card">
            <span className="card-icon">👥</span>
            <h3 className="card-title">Создай комнату</h3>
            <p>Создай приватную комнату и пригласи друга.</p>
            <div style={{marginTop: '15px', display:'flex', gap:'10px', alignItems:'center'}}>
              <span style={{color:'var(--color-accent)', fontWeight:700}}>+25 фишек</span>
              <button className="btn btn-accent" onClick={() => handleClaimQuest(25)}>Выполнить</button>
            </div>
          </div>
          <div className="feature-card">
            <span className="card-icon">🏆</span>
            <h3 className="card-title">Выиграй раздачу</h3>
            <p>Выиграй одну партию в онлайне или на тестовом столе.</p>
            <div style={{marginTop: '15px', display:'flex', gap:'10px', alignItems:'center'}}>
              <span style={{color:'var(--color-accent)', fontWeight:700}}>+50 фишек</span>
              <button className="btn btn-accent" onClick={() => handleClaimQuest(50)}>Выполнить</button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <h2 className="section-title">✨ Ключевой Функционал</h2>
        {!user && (
          <div className="auth-notice">
            <div className="auth-notice-icon">🔒</div>
            <h3 className="auth-notice-title">Требуется авторизация</h3>
            <p className="auth-notice-text">
              Для доступа ко всем функциям игры необходимо войти в систему или зарегистрироваться.
            </p>
            <div className="auth-notice-buttons">
              <button className="btn btn-accent" onClick={() => setIsLoginModalOpen(true)}>
                Войти
              </button>
              <button className="btn btn-secondary" onClick={() => setIsRegisterModalOpen(true)}>
                Регистрация
              </button>
            </div>
          </div>
        )}
        <div className="features-grid">
          <div className="feature-card">
            <span className="card-icon">👑</span>
            <h3 className="card-title">Строгий Режим СЕКИ</h3>
            <p>Реализация сложных комбинаций: СЕКА ТУЗОВ, 32 Очка, ДВА ЛБА и точные правила повышения ставки.</p>
          </div>
          <div className="feature-card">
            <span className="card-icon">💰</span>
            <h3 className="card-title">Динамичный Кон Вары</h3>
            <p>Полная поддержка режима Вары при ничьей. Возможность вступления других игроков за долю кона.</p>
          </div>
          <div className="feature-card">
            <span className="card-icon">🛡️</span>
            <h3 className="card-title">Безопасность и Честность</h3>
            <p>Наша система гарантирует защиту от нечестной игры. Сдача карт проверяется на сервере.</p>
          </div>
          <div className="feature-card">
            <span className="card-icon">📊</span>
            <h3 className="card-title">Детальная Статистика</h3>
            <p>Следите за своими победами в СЕКАХ, частотой ВАР и общей прибылью в чипсах.</p>
          </div>
        </div>
      </section>

      <section id="news" className="news-section">
        <h2 className="section-title">📰 Новости</h2>
        <div className="news-list">
          <article className="news-item">
            <span className="news-date">28 Октября 2025</span>
            <h3 className="news-title">Запуск Турниров "Золотой Туз"</h3>
            <p>Анонс первого крупного еженедельного турнира с гарантированным призовым фондом.</p>
          </article>
          <article className="news-item">
            <span className="news-date">10 Октября 2025</span>
            <h3 className="news-title">Обновление: Система Штрафов</h3>
            <p>Введена логика штрафа сдатчика за ошибку. Улучшена стабильность торгов.</p>
          </article>
          <article className="news-item">
            <span className="news-date">1 Октября 2025</span>
            <h3 className="news-title">Новый Дизайн Интерфейса</h3>
            <p>Запущен современный дизайн в стиле "Строгий и Богатый" с золотыми акцентами.</p>
          </article>
        </div>
      </section>

      <section id="rules" className="rules-section">
        <h2 className="section-title">📋 Правила Секки</h2>
        <div className="rules-content">
          <div className="rule-category">
            <h3 className="rule-title">🎯 Основные Комбинации</h3>
            <ul className="rule-list">
              <li><strong>СЕКА ТУЗОВ</strong> - самая сильная комбинация (без Джокера)</li>
              <li><strong>32 Очка</strong> - Туз + Джокер + карта той же масти</li>
              <li><strong>31 Очко</strong> - три карты одной масти с Тузом</li>
              <li><strong>30 Очков</strong> - СЕКА МАСТЕЙ (три карты одной масти)</li>
              <li><strong>22 Очка</strong> - ДВА ЛБА (два Туза)</li>
              <li><strong>21 Очко</strong> - ОЧКО (один Туз)</li>
            </ul>
          </div>
          <div className="rule-category">
            <h3 className="rule-title">💰 Система Торгов</h3>
            <ul className="rule-list">
              <li>Минимальное повышение: 10 фишек</li>
              <li>Возможность вскрытия после первого круга торгов</li>
              <li>При ничьей между двумя игроками - автоматическая ВАРА</li>
              <li>Победитель может инициировать ВАРУ после абсолютной победы</li>
            </ul>
          </div>
          <div className="rule-category">
            <h3 className="rule-title">⚔️ Режим Вары</h3>
            <ul className="rule-list">
              <li>Другие игроки могут войти в ВАРУ за половину кона</li>
              <li>Сдатчик в Варе - инициатор предыдущей ничьей</li>
              <li>Новая раздача только для участников Вары</li>
              <li>Кон Вары переносится в следующую партию</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="main-footer">
        <div className="footer-content">
          <p>© 2025 СЕККА | RIGOROUS. Все права защищены.</p>
          <div className="footer-links">
            <a href="#rules">Условия и правила</a>
            <a href="#contact">Поддержка</a>
            <a href="#privacy">Конфиденциальность</a>
          </div>
        </div>
      </footer>

      {/* Модальные окна */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSwitchToRegister={handleSwitchToRegister}
        onLogin={handleLogin}
      />
      
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSwitchToLogin={handleSwitchToLogin}
        onRegister={handleRegister}
      />
      
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
      />
      
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        user={user}
        onUpdateBalance={handleUpdateBalance}
      />
      
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        user={user}
        onUpdateBalance={handleUpdateBalance}
      />
    </main>
  );
};

export default Landing;
