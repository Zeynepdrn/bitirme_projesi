import React from 'react';
import TeacherSidebar from './TeacherSidebar';
import { auth } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import '../../styles/TeacherLayout.css';

const TeacherLayout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yaparken hata oluştu:', error);
    }
  };

  return (
    <div className="teacher-layout">
      <TeacherSidebar />
      <div className="main-content">
        <div className="header">
          <div className="header-right">
            <button className="logout-button" onClick={handleLogout}>
              <span>Çıkış Yap</span>
              <FaSignOutAlt />
            </button>
          </div>
        </div>
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;  