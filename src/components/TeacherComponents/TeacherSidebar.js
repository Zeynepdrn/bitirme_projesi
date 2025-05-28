import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaPlus, FaList, FaUserGraduate, FaRegCommentDots, FaHome } from 'react-icons/fa';
import '../../styles/TeacherSidebar.css';

const TeacherSidebar = () => {
  return (
    <div className="sidebar">
      <div className="logo">
        <NavLink to="/teacher-home" className="logo-link">
          <h2>OMÜPYS</h2>
        </NavLink>
      </div>
      
      <nav className="sidebar-menu">
        <NavLink to="/teacher-home" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaHome className="menu-icon" />
          <span>Ana Sayfa</span>
        </NavLink>
        
        <NavLink to="/create-project" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaPlus className="menu-icon" />
          <span>Proje Oluştur</span>
        </NavLink>
        
        <NavLink to="/proje-konulari" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaList className="menu-icon" />
          <span>Proje Konuları</span>
        </NavLink>
        
        <NavLink to="/project-requests" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaUserGraduate className="menu-icon" />
          <span>Öğrenci Tercihleri</span>
        </NavLink>
        
        <NavLink to="/project-suggestions" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
          <FaRegCommentDots className="menu-icon" />
          <span>Proje Önerileri</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default TeacherSidebar;  