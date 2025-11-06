import React, { useState } from 'react';
import Modal from './Modal';

const WithdrawModal = ({ isOpen, onClose, user, onUpdateBalance }) => {
  const [formData, setFormData] = useState({
    amount: '',
    withdrawMethod: 'card',
    cardNumber: '',
    bankAccount: '',
    phoneNumber: ''
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

  const validateForm = () => {
    const newErrors = {};
    const currentBalance = user?.balance || 1000;

    if (!formData.amount.trim()) {
      newErrors.amount = 'Сумма обязательна';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Введите корректную сумму';
    } else if (parseFloat(formData.amount) < 100) {
      newErrors.amount = 'Минимальная сумма вывода: 100 ₽';
    } else if (parseFloat(formData.amount) > currentBalance) {
      newErrors.amount = 'Недостаточно средств на счете';
    } else if (parseFloat(formData.amount) > 25000) {
      newErrors.amount = 'Максимальная сумма вывода: 25,000 ₽';
    }

    if (formData.withdrawMethod === 'card') {
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = 'Номер карты обязателен';
      } else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Некорректный номер карты';
      }
    } else if (formData.withdrawMethod === 'bank') {
      if (!formData.bankAccount.trim()) {
        newErrors.bankAccount = 'Номер счета обязателен';
      } else if (!/^\d{20}$/.test(formData.bankAccount)) {
        newErrors.bankAccount = 'Некорректный номер счета (20 цифр)';
      }
    } else if (formData.withdrawMethod === 'phone') {
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Номер телефона обязателен';
      } else if (!/^\+7\d{10}$/.test(formData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
        newErrors.phoneNumber = 'Некорректный номер телефона';
      }
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
      
      console.log('💸 Вывод средств:', formData);
      
      // Обновляем баланс пользователя
      if (onUpdateBalance) {
        const newBalance = (user?.balance || 1000) - parseFloat(formData.amount);
        onUpdateBalance(newBalance);
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Ошибка вывода средств:', error);
      setErrors({ general: 'Ошибка вывода средств. Попробуйте снова.' });
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2500, 5000, 10000];
  const currentBalance = user?.balance || 1000;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Вывод средств" size="large">
      <div className="withdraw-form">
        <div className="withdraw-header">
          <div className="withdraw-icon">💸</div>
          <h3 className="withdraw-title">Вывести средства</h3>
          <p className="withdraw-subtitle">Доступно для вывода: {currentBalance} ₽</p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="form-error">{errors.general}</div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="amount">Сумма вывода</label>
            <input
              type="number"
              id="amount"
              name="amount"
              className={`form-input ${errors.amount ? 'error' : ''}`}
              placeholder="Введите сумму"
              value={formData.amount}
              onChange={handleInputChange}
              disabled={isLoading}
              min="100"
              max={Math.min(25000, currentBalance)}
              step="100"
            />
            {errors.amount && <div className="form-error">{errors.amount}</div>}
            
            <div className="quick-amounts">
              <span className="quick-label">Быстрые суммы:</span>
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => setFormData(prev => ({ ...prev, amount: amount.toString() }))}
                  disabled={isLoading || amount > currentBalance}
                >
                  {amount} ₽
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="withdrawMethod">Способ вывода</label>
            <select
              id="withdrawMethod"
              name="withdrawMethod"
              className="form-input"
              value={formData.withdrawMethod}
              onChange={handleInputChange}
              disabled={isLoading}
            >
              <option value="card">💳 На банковскую карту</option>
              <option value="bank">🏦 На банковский счет</option>
              <option value="phone">📱 На номер телефона</option>
            </select>
          </div>

          {formData.withdrawMethod === 'card' && (
            <div className="form-group">
              <label className="form-label" htmlFor="cardNumber">Номер карты</label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                className={`form-input ${errors.cardNumber ? 'error' : ''}`}
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber}
                onChange={handleInputChange}
                disabled={isLoading}
                maxLength="19"
              />
              {errors.cardNumber && <div className="form-error">{errors.cardNumber}</div>}
            </div>
          )}

          {formData.withdrawMethod === 'bank' && (
            <div className="form-group">
              <label className="form-label" htmlFor="bankAccount">Номер банковского счета</label>
              <input
                type="text"
                id="bankAccount"
                name="bankAccount"
                className={`form-input ${errors.bankAccount ? 'error' : ''}`}
                placeholder="12345678901234567890"
                value={formData.bankAccount}
                onChange={handleInputChange}
                disabled={isLoading}
                maxLength="20"
              />
              {errors.bankAccount && <div className="form-error">{errors.bankAccount}</div>}
            </div>
          )}

          {formData.withdrawMethod === 'phone' && (
            <div className="form-group">
              <label className="form-label" htmlFor="phoneNumber">Номер телефона</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                className={`form-input ${errors.phoneNumber ? 'error' : ''}`}
                placeholder="+7 (999) 123-45-67"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                disabled={isLoading}
                maxLength="18"
              />
              {errors.phoneNumber && <div className="form-error">{errors.phoneNumber}</div>}
            </div>
          )}

          <div className="withdraw-info">
            <div className="info-item">
              <span className="info-icon">⏰</span>
              <span className="info-text">Вывод обрабатывается в течение 1-3 рабочих дней</span>
            </div>
            <div className="info-item">
              <span className="info-icon">💳</span>
              <span className="info-text">Комиссия за вывод: 3% (минимум 50 ₽)</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🔒</span>
              <span className="info-text">Все операции защищены и отслеживаются</span>
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
              {isLoading ? 'Обработка...' : `Вывести ${formData.amount || 0} ₽`}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default WithdrawModal;
