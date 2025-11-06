import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const LoginModal = ({ isOpen, onClose, onSwitchToRegister, onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Восстановление сохраненного email при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('seka_saved_email');
      if (savedEmail) {
        setFormData(prev => ({
          ...prev,
          email: savedEmail,
          rememberMe: true
        }));
      }
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Имитация API запроса
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('🔐 Попытка входа:', formData);
      
      // Здесь будет реальный API запрос
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      
      // Пока что просто вызываем callback
      if (onLogin) {
        // Сохраняем email в localStorage если rememberMe = true
        if (formData.rememberMe) {
          localStorage.setItem('seka_saved_email', formData.email);
          console.log('💾 Email сохранен для следующего входа');
        } else {
          localStorage.removeItem('seka_saved_email');
        }
        
        onLogin({
          email: formData.email,
          name: formData.email.split('@')[0], // Временное имя из email
          avatar: null,
          balance: 1000 // Начальный баланс
        }, formData.rememberMe);
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      setErrors({ general: 'Ошибка входа. Попробуйте снова.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    console.log(`🔐 Вход через ${provider}`);
    // Здесь будет интеграция с социальными сетями
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Вход в систему" size="medium">
      <div className="auth-form">
        <div className="auth-header">
          <div className="auth-icon">🔐</div>
          <p className="auth-subtitle">Добро пожаловать обратно!</p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="form-error">{errors.general}</div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="Введите ваш email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              name="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Введите ваш пароль"
              value={formData.password}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <span>Запомнить меня</span>
            </label>
          </div>

          <div className="modal-buttons">
            <button
              type="button"
              className="modal-btn modal-btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </div>
        </form>

        <div className="modal-divider"></div>

        <div className="social-buttons">
          <button
            className="social-btn"
            onClick={() => handleSocialLogin('Google')}
            disabled={isLoading}
          >
            <span className="social-icon">🔍</span>
            Войти через Google
          </button>
          <button
            className="social-btn"
            onClick={() => handleSocialLogin('VK')}
            disabled={isLoading}
          >
            <span className="social-icon">📘</span>
            Войти через VK
          </button>
        </div>

        <div className="modal-text">
          Нет аккаунта?{' '}
          <button
            className="modal-link"
            onClick={onSwitchToRegister}
            disabled={isLoading}
          >
            Зарегистрироваться
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LoginModal;
