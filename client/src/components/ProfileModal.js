import React, { useState } from 'react';
import Modal from './Modal';

const ProfileModal = ({ isOpen, onClose, user, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || null
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          avatar: e.target.result
        }));
      };
      reader.readAsDataURL(file);
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('👤 Обновление профиля:', formData);
      
      // Обновляем данные пользователя
      if (onUpdateUser) {
        onUpdateUser({
          ...user,
          ...formData
        });
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Ошибка обновления профиля:', error);
      setErrors({ general: 'Ошибка обновления профиля. Попробуйте снова.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Профиль пользователя" size="medium">
      <div className="profile-form">
        <div className="profile-header">
          <div className="profile-avatar">
            {formData.avatar ? (
              <img src={formData.avatar} alt="Аватар" className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">👤</div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="avatar-input"
              id="avatar-input"
            />
            <label htmlFor="avatar-input" className="avatar-upload-btn">
              📷 Изменить фото
            </label>
          </div>
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

          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-label">Баланс</div>
              <div className="stat-value">💰 {user?.balance || 1000} ₽</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Игр сыграно</div>
              <div className="stat-value">🎮 {user?.gamesPlayed || 0}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Побед</div>
              <div className="stat-value">🏆 {user?.wins || 0}</div>
            </div>
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
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ProfileModal;
