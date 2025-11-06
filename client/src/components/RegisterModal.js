import React, { useState } from 'react';
import Modal from './Modal';

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin, onRegister }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

    if (!formData.name.trim()) {
      newErrors.name = 'Имя обязательно';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Имя должно содержать минимум 2 символа';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Пароль должен содержать заглавные и строчные буквы, а также цифры';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Подтверждение пароля обязательно';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'Необходимо согласиться с условиями';
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('📝 Попытка регистрации:', formData);
      
      // Здесь будет реальный API запрос
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     name: formData.name,
      //     email: formData.email,
      //     password: formData.password
      //   })
      // });
      
      // Пока что просто вызываем callback
      if (onRegister) {
        // Сохраняем email в localStorage для удобства следующего входа
        localStorage.setItem('seka_saved_email', formData.email);
        console.log('💾 Email сохранен для следующего входа');
        
        onRegister({
          name: formData.name,
          email: formData.email,
          avatar: null,
          balance: 1000 // Начальный баланс
        });
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Ошибка регистрации:', error);
      setErrors({ general: 'Ошибка регистрации. Попробуйте снова.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialRegister = (provider) => {
    console.log(`📝 Регистрация через ${provider}`);
    // Здесь будет интеграция с социальными сетями
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Регистрация" size="large">
      <div className="auth-form">
        <div className="auth-header">
          <div className="auth-icon">📝</div>
          <p className="auth-subtitle">Создайте аккаунт и начните играть!</p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="form-error">{errors.general}</div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="name">Имя</label>
            <input
              type="text"
              id="name"
              name="name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="Введите ваше имя"
              value={formData.name}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

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
              placeholder="Создайте надежный пароль"
              value={formData.password}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            {errors.password && <div className="form-error">{errors.password}</div>}
            <div className="form-text">
              Пароль должен содержать заглавные и строчные буквы, а также цифры
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Подтверждение пароля</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="Повторите пароль"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <span>
                Я согласен с{' '}
                <button
                  type="button"
                  className="modal-link"
                  onClick={() => console.log('Открыть условия')}
                >
                  условиями использования
                </button>{' '}
                и{' '}
                <button
                  type="button"
                  className="modal-link"
                  onClick={() => console.log('Открыть политику')}
                >
                  политикой конфиденциальности
                </button>
              </span>
            </label>
            {errors.agreeToTerms && <div className="form-error">{errors.agreeToTerms}</div>}
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
              {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>

        <div className="modal-divider"></div>

        <div className="social-buttons">
          <button
            className="social-btn"
            onClick={() => handleSocialRegister('Google')}
            disabled={isLoading}
          >
            <span className="social-icon">🔍</span>
            Зарегистрироваться через Google
          </button>
          <button
            className="social-btn"
            onClick={() => handleSocialRegister('VK')}
            disabled={isLoading}
          >
            <span className="social-icon">📘</span>
            Зарегистрироваться через VK
          </button>
        </div>

        <div className="modal-text">
          Уже есть аккаунт?{' '}
          <button
            className="modal-link"
            onClick={onSwitchToLogin}
            disabled={isLoading}
          >
            Войти
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RegisterModal;
