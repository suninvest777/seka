import React, { useState } from 'react';
import Modal from './Modal';

const DepositModal = ({ isOpen, onClose, user, onUpdateBalance }) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'card',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
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

    if (!formData.amount.trim()) {
      newErrors.amount = 'Сумма обязательна';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Введите корректную сумму';
    } else if (parseFloat(formData.amount) < 100) {
      newErrors.amount = 'Минимальная сумма пополнения: 100 ₽';
    } else if (parseFloat(formData.amount) > 50000) {
      newErrors.amount = 'Максимальная сумма пополнения: 50,000 ₽';
    }

    if (formData.paymentMethod === 'card') {
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = 'Номер карты обязателен';
      } else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Некорректный номер карты';
      }

      if (!formData.expiryDate.trim()) {
        newErrors.expiryDate = 'Срок действия обязателен';
      } else if (!/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
        newErrors.expiryDate = 'Формат: ММ/ГГ';
      }

      if (!formData.cvv.trim()) {
        newErrors.cvv = 'CVV обязателен';
      } else if (!/^\d{3}$/.test(formData.cvv)) {
        newErrors.cvv = 'CVV должен содержать 3 цифры';
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
      
      console.log('💰 Пополнение счета:', formData);
      
      // Обновляем баланс пользователя
      if (onUpdateBalance) {
        const newBalance = (user?.balance || 1000) + parseFloat(formData.amount);
        onUpdateBalance(newBalance);
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Ошибка пополнения:', error);
      setErrors({ general: 'Ошибка пополнения счета. Попробуйте снова.' });
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2500, 5000, 10000];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Пополнение счета" size="large">
      <div className="deposit-form">
        <div className="deposit-header">
          <div className="deposit-icon">💰</div>
          <h3 className="deposit-title">Пополнить игровой счет</h3>
          <p className="deposit-subtitle">Текущий баланс: {user?.balance || 1000} ₽</p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="form-error">{errors.general}</div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="amount">Сумма пополнения</label>
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
              max="50000"
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
                  disabled={isLoading}
                >
                  {amount} ₽
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="paymentMethod">Способ оплаты</label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              className="form-input"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              disabled={isLoading}
            >
              <option value="card">💳 Банковская карта</option>
              <option value="wallet">📱 Электронный кошелек</option>
              <option value="bank">🏦 Банковский перевод</option>
            </select>
          </div>

          {formData.paymentMethod === 'card' && (
            <>
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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="expiryDate">Срок действия</label>
                  <input
                    type="text"
                    id="expiryDate"
                    name="expiryDate"
                    className={`form-input ${errors.expiryDate ? 'error' : ''}`}
                    placeholder="ММ/ГГ"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    maxLength="5"
                  />
                  {errors.expiryDate && <div className="form-error">{errors.expiryDate}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cvv">CVV</label>
                  <input
                    type="text"
                    id="cvv"
                    name="cvv"
                    className={`form-input ${errors.cvv ? 'error' : ''}`}
                    placeholder="123"
                    value={formData.cvv}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    maxLength="3"
                  />
                  {errors.cvv && <div className="form-error">{errors.cvv}</div>}
                </div>
              </div>
            </>
          )}

          <div className="deposit-info">
            <div className="info-item">
              <span className="info-icon">🔒</span>
              <span className="info-text">Все платежи защищены SSL-шифрованием</span>
            </div>
            <div className="info-item">
              <span className="info-icon">⚡</span>
              <span className="info-text">Пополнение зачисляется мгновенно</span>
            </div>
            <div className="info-item">
              <span className="info-icon">💳</span>
              <span className="info-text">Принимаем карты Visa, MasterCard, МИР</span>
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
              {isLoading ? 'Пополнение...' : `Пополнить на ${formData.amount || 0} ₽`}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default DepositModal;
