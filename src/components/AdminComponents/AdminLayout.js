import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserPlus, FaCalendarAlt, FaHistory } from 'react-icons/fa';
import '../../styles/AdminLayout.css';

const AdminLayout = ({ children, userType }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };



  useEffect(() => {
    if (userType === 1 || userType === 0) {
      navigate('/');
    }
  }, [navigate, userType])


  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-logo">
          <h2>Admin Panel</h2>
        </div>
        <nav className="admin-menu">
          <button onClick={() => navigate('/admin/teacher-add')}>
            <FaUserPlus /> Öğretim Üyeleri
          </button>
          <button onClick={() => navigate('/admin/dates')}>
            <FaCalendarAlt /> İşlem Tarihlerini Belirle
          </button>
          <button onClick={() => navigate('/admin/history')}>
            <FaHistory /> Yıllık İstatistikler
          </button>
        </nav>
        <button className="admin-logout" onClick={handleLogout}>
          Çıkış Yap
        </button>
      </div>
      <div className="admin-content">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;  