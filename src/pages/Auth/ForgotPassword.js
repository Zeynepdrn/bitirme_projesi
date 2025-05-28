import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { Link } from 'react-router-dom';
import omuLogo from '../../assets/images/omu-logo.png';

const ForgotPassword = () => { 
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      setError('Şifre sıfırlama e-postası gönderilemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="logo-container">
        <img src={omuLogo} alt="OMÜ Logo" />
      </div>
      <div className="auth-form">
        <h2>Şifremi Unuttum</h2>
        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ad.soyad@bil.omu.edu.tr"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'GÖNDERİLİYOR...' : 'ŞİFREMİ SIFIRLA'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">Giriş sayfasına dön</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;