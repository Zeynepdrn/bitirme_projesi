import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { FaUsers, FaClipboardList, FaCommentAlt, FaList, FaUserFriends } from 'react-icons/fa';

const StudentHome = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);


  if (loading) {
    return <div className="loading-message">Yükleniyor...</div>;
  }

  return (
    <div className="teacher-home-container">
      <h2 className="welcome-title">OMÜPYS Öğrenci Paneline Hoş Geldiniz</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="features-grid">
        <Link to="/grup-olustur" className="feature-card">
          <div className="feature-icon">
            <FaUsers />
          </div>
          <h3>Grup Oluştur</h3>
          <p>Grup oluşturarak veya mevcut bir gruba katılarak bitirme projesi sürecine başlayın.</p>
        </Link>

        <Link to="/proje-konulari" className="feature-card">
          <div className="feature-icon">
            <FaClipboardList />
          </div>
          <h3>Proje Konuları</h3>
          <p>Öğretim üyeleri tarafından oluşturulan mevcut proje konularını görüntüleyin.</p>
        </Link>

        <Link to="/yeni-proje-oner" className="feature-card">
          <div className="feature-icon">
            <FaCommentAlt />
          </div>
          <h3>Proje Öner</h3>
          <p>Kendi bitirme projesi fikrinizi oluşturup öğretim üyelerine öneride bulunun.</p>
        </Link>

        <Link to="/tercih-listesi" className="feature-card">
          <div className="feature-icon">
            <FaList />
          </div>
          <h3>Tercih Listesi</h3>
          <p>Mevcut proje konuları arasından tercihlerinizi yapın ve onaya gönderin.</p>
        </Link>

        <Link to="/grubum" className="feature-card">
          <div className="feature-icon">
            <FaUserFriends />
          </div>
          <h3>Grubum</h3>
          <p>Mevcut grup bilgilerinizi görüntüleyin ve grup içi işlemleri gerçekleştirin.</p>
        </Link>
      </div>
    </div>
  );
};

export default StudentHome; 