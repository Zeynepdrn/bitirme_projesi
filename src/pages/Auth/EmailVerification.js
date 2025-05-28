import { useNavigate } from 'react-router-dom';

import omuLogo from '../../assets/images/omu-logo.png';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase/config';

const EmailVerificationWaiting = () => {
    const navigate = useNavigate();
    
    const resendVerification = async () => { 
      try {
        if (auth.currentUser) {
          await sendEmailVerification(auth.currentUser);
          alert("Doğrulama e-postası tekrar gönderildi!");
        } else {
          alert("Oturum açık değil! Lütfen tekrar giriş yapın.");
          navigate('/login');
        }
      } catch (error) {
        alert("Doğrulama e-postası gönderilirken bir hata oluştu: " + error.message);
      }
    };
  
    const handleLogout = () => {
      auth.signOut()
        .then(() => {
          navigate('/login');
        })
        .catch(error => {
          console.error('Çıkış yapılırken hata oluştu:', error);
        });
    };
  
    return (
      <div className="auth-container">
        <div className="logo-container">
          <img src={omuLogo} alt="OMÜ Logo" />
        </div>
        <div className="auth-form verification-screen">
          <h2>E-posta Doğrulama Gerekiyor</h2>
          <div className="warning-message">
            <p>E-posta adresiniz henüz doğrulanmamış.</p>
            <p>Lütfen e-postanızı kontrol edin ve doğrulama işlemini tamamlayın.</p>
            <p>Doğrulama e-postasını yeniden göndermek için butona tıklayabilirsiniz.</p>
          </div>
          <button onClick={resendVerification}>
            DOĞRULAMA E-POSTASINI YENİDEN GÖNDER
          </button>
          <button onClick={handleLogout} className="secondary-button">
            YENİDEN GİRİŞ YAP
          </button>
        </div>
      </div>
    );
  };

  export default EmailVerificationWaiting;