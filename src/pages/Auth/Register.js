import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { Link, useNavigate } from 'react-router-dom';
import omuLogo from '../../assets/images/omu-logo.png';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [schoolNumber, setSchoolNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.endsWith('@bil.omu.edu.tr')) {
      setError('Lütfen geçerli bir OMÜ e-posta adresi (@bil.omu.edu.tr) giriniz.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor!');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { 
        displayName: name
      });
      
      await setDoc(doc(db, 'ogrenciler', email), {
        displayName: name,
        email: email,
        schoolNumber: schoolNumber,
        user_type: 0, 
        createdAt: new Date()
      });
      /*
      await sendEmailVerification(user);
      setVerificationSent(true);
      navigate('/email-verification');
      */
    } catch (err) {
      setError('Kayıt oluşturulamadı: ' + err.message);
      setLoading(false);
    }
  };
  if (verificationSent) {
    return (
      <div className="auth-container">
        <div className="logo-container">
          <img src={omuLogo} alt="OMÜ Logo" />
        </div>
        <div className="auth-form verification-screen">
          <h2>E-posta Doğrulama</h2>
          <div className="success-message">
            <p>E-posta adresinize bir doğrulama bağlantısı gönderdik.</p>
            <p>Lütfen e-postanızı kontrol edin ve doğrulama işlemini tamamlayın.</p>
            <p>E-posta doğrulandıktan sonra giriş yapabilirsiniz.</p>
          </div>
          <button 
            onClick={() => navigate('/login')} 
            className="secondary-button"
          >
            GİRİŞ SAYFASINA DÖN
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="auth-container">
      <div className="logo-container">
        <img src={omuLogo} alt="OMÜ Logo" />
      </div>
      <div className="auth-form">
        <h2>Hoşgeldiniz</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ad Soyad</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ad.soyad@bil.omu.edu.tr"
            />
            <small className="form-hint">OMÜ email adresi (@bil.omu.edu.tr) gereklidir</small>
          </div>
          <div className="form-group">
            <label>Okul Numarası</label>
            <input
              type="text"
              value={schoolNumber}
              onChange={(e) => setSchoolNumber(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
          <div className="form-group">
            <label>Şifre (Tekrar)</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'KAYIT OLUŞTURULUYOR...' : 'KAYIT OL'}
          </button>
        </form>
        <div className="auth-links">
          <div>
            <span>Zaten hesabınız var mı? </span>
            <Link to="/login">Giriş yap</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;