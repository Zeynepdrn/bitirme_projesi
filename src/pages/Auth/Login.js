import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { Link, useNavigate } from 'react-router-dom';
import omuLogo from '../../assets/images/omu-logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Admin bilgilerini Firebase'den kontrol et
      const adminDocRef = doc(db, 'admin_info', 'admin');
      const adminDoc = await getDoc(adminDocRef);
      
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        if (email === adminData.admin_mail && password === adminData.admin_pass) {
          navigate('/admin');
          return;
        }
      }

      const teacherDocRef = doc(db, 'ogretmenler', email);
      const teacherDoc = await getDoc(teacherDocRef);

      if (teacherDoc.exists() && teacherDoc.data().user_type === 1) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          navigate('/teacher-home');
        } catch (registerError) {
          if (registerError.code === 'auth/email-already-in-use') {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            navigate('/teacher-home');
          } else {
            throw registerError;
          }
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const studentDocRef = doc(db, 'ogrenciler', email);
        const studentDoc = await getDoc(studentDocRef);
        
        if (!studentDoc.exists()) {
          await setDoc(doc(db, 'ogrenciler', email), {
            email: email,
            displayName: userCredential.user.displayName || email.split('@')[0],
            user_type: 0, 
            createdAt: new Date()
          });
        }
        
        const userData = studentDoc.exists() ? studentDoc.data() : { user_type: 0 };
        
        if (userData.user_type === 1) {
          navigate('/teacher-home');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      console.error("Giriş hatası:", err);
      
      let errorMessage = 'Giriş yapılırken bir hata oluştu.';
      
      switch (err.code) {
        case 'auth/invalid-credential':
          errorMessage = 'E-posta veya şifre hatalı.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Hatalı şifre girdiniz.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Geçersiz e-posta adresi.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Bu hesap devre dışı bırakılmış.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'İnternet bağlantınızı kontrol edin.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Bu giriş yöntemi şu anda kullanılamıyor.';
          break;
        default:
          if (err.message.includes('offline')) {
            errorMessage = 'İnternet bağlantınızı kontrol edin.';
          } else {
            errorMessage = 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.';
          }
      }
      
      setError(errorMessage);
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
        <h2>Giriş Yap</h2>
        {error && <div className="error-message">{error}</div>}
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
          <div className="form-group">
            <label>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'GİRİŞ YAPILIYOR...' : 'GİRİŞ YAP'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/forgot-password">Şifreni mi unuttun?</Link>
          <div>
            <span>Hesabın yok mu? </span>
            <Link to="/register">Kayıt ol</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;