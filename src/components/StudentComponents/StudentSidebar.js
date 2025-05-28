import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaUsers, FaClipboardList, FaCommentAlt, FaList, FaUserFriends, FaHome } from 'react-icons/fa';
import '../../styles/StudentSidebar.css';

const StudentSidebar = () => {
  return (
    <div className="sidebar">
      <div className="logo">
        <NavLink to="/" className="logo-link">
          <h2>OMÜPYS</h2>
        </NavLink>
      </div>
      
      <nav className="sidebar-menu">
        <NavLink to="/" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaHome className="menu-icon" />
          <span>Ana Sayfa</span>
        </NavLink>
        
        <NavLink to="/grup-olustur" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaUsers className="menu-icon" />
          <span>Grup Oluştur</span>
        </NavLink>
        
        <NavLink to="/proje-konulari" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaClipboardList className="menu-icon" />
          <span>Proje Konuları</span>
        </NavLink>
        
        <NavLink to="/yeni-proje-oner" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaCommentAlt className="menu-icon" />
          <span>Yeni Proje Öner</span>
        </NavLink>
        
        <NavLink to="/tercih-listesi" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaList className="menu-icon" />
          <span>Tercih Listesi</span>
        </NavLink>
        
        <NavLink to="/grubum" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaUserFriends className="menu-icon" />
          <span>Grubum</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default StudentSidebar;  