import React, { useState, useEffect } from 'react';
import TeacherLayout from '../../components/TeacherComponents/TeacherLayout';
import { FaList, FaUserGraduate, FaRegCommentDots, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { getDoc, doc } from 'firebase/firestore';
import '../../styles/TeacherHome.css';

const TeacherHome = () => {
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const initialize = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('Kullanıcı girişi yapılmamış.');
          return;
        }

        // Önce öğretmen kontrolü yap
        const teacherDoc = await getDoc(doc(db, 'ogretmenler', user.email));
        if (!teacherDoc.exists()) {
          setError('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
          return;
        }

        // Öğretmen ise direkt içeriği göster
        setIsInitialized(true);
        setLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Veri yüklenirken bir hata oluştu.');
      }
    };
    
    initialize();
  }, []);

  // Loading durumunda sadece loading mesajını göster
  if (loading || !isInitialized) {
    return (
      <div className="container">
        <div className="section-container">
          <div className="loading-message">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  // Hata durumunda sadece hata mesajını göster
  if (error) {
    return (
      <div className="container">
        <div className="section-container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  // Normal içerik
  return (
    <TeacherLayout>
      <div className="teacher-home-container">
        <h2 className="welcome-title">OMÜPYS Öğretim Üyesi Paneline Hoş Geldiniz</h2>
        
        <div className="features-grid">
          <Link to="/create-project" className="feature-card">
            <div className="feature-icon">
              <FaPlus />
            </div>
            <h3>Proje Oluştur</h3>
            <p>Yeni bitirme projesi konuları oluşturun ve öğrencilerin seçimine sunun.</p>
          </Link>
          
          <Link to="/proje-konulari" className="feature-card">
            <div className="feature-icon">
              <FaList />
            </div>
            <h3>Proje Konuları</h3>
            <p>Oluşturduğunuz proje konularını görüntüleyin ve yönetin.</p>
          </Link>
          
          <Link to="/project-requests" className="feature-card">
            <div className="feature-icon">
              <FaUserGraduate />
            </div>
            <h3>Öğrenci Tercihleri</h3>
            <p>Öğrencilerin hangi projeleri tercih ettiğini görüntüleyin ve onaylayın.</p>
          </Link>
          
          <Link to="/project-suggestions" className="feature-card">
            <div className="feature-icon">
              <FaRegCommentDots />
            </div>
            <h3>Proje Önerileri</h3>
            <p>Öğrencilerin gönderdiği proje önerilerini inceleyin ve değerlendirin.</p>
          </Link>
        </div>
      </div>
    </TeacherLayout>
  );
};

export default TeacherHome;  