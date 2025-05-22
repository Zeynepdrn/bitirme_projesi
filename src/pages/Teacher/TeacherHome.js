import React from 'react';
import TeacherLayout from '../../components/TeacherComponents/TeacherLayout';
import { FaList, FaUserGraduate, FaRegCommentDots, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import '../../styles/TeacherHome.css';

const TeacherHome = () => {
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