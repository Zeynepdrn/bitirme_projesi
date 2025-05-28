import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import StudentLayout from './components/StudentComponents/StudentLayout';
import GroupCreate from './pages/Student/GroupCreate';
import ProjectTopics from './pages/Student/ProjectTopics';
import ProjectSuggestion from './pages/Student/ProjectSuggestion';
import PreferenceList from './pages/Student/PreferenceList';
import MyGroup from './pages/Student/MyGroup';
import AdminPanel from './pages/Admin/AdminPanel';
import omuLogo from './assets/images/omu-logo.png';
import './App.css';

import TeacherHome from './pages/Teacher/TeacherHome';
import CreateProject from './pages/Teacher/CreateProject';
import TeacherProjectTopics from './pages/Teacher/ProjectTopics';
import StudentPreferences from './pages/Teacher/StudentPreferences';
import ProjectSuggestions from './pages/Teacher/ProjectSuggestions';
import AdminLayout from './components/AdminComponents/AdminLayout';
import YearlyStats from './pages/Admin/YearlyStats';
import StudentHome from './pages/Student/StudentHome';

import EmailVerificationWaiting from './pages/Auth/EmailVerification';

function App() {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        try {
          /*
          if (!user.emailVerified) {
            setUserType('unverified');
            setLoading(false);
            setAuthChecked(true);
            return;
          }
            */
          const studentDocRef = doc(db, 'ogrenciler', user.email);
          const studentDoc = await getDoc(studentDocRef);

          if (studentDoc.exists()) {
            setUserType(0); 
          } else {
            const teacherDocRef = doc(db, 'ogretmenler', user.email);
            const teacherDoc = await getDoc(teacherDocRef);

            if (teacherDoc.exists()) {
              setUserType(1); 
            } else {
              setUserType(0);
            }
          }
        } catch (error) {
          console.error("Kullanıcı tipi belirlenemedi:", error);
          setUserType(0);
        }
      } else {
        setUserType(null);
      }

      setLoading(false);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="logo-container">
          <img src={omuLogo} alt="OMÜ Logo" />
        </div>
        Yükleniyor...
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="loading">
        <div className="logo-container">
          <img src={omuLogo} alt="OMÜ Logo" />
        </div>
        Yükleniyor...
      </div>
    );
  }

  const handleProtectedRoute = (requiredRole, component) => {
    if (!user) return <Navigate to="/login" />;
    /*
    if (userType === 'unverified') {
      return <EmailVerificationWaiting />;
    }
      */

    if (requiredRole === 'teacher' && userType !== 1) {
      return <Navigate to="/" />;
    }

    return component;
  };

  return (
      <Router>
        <div className="App">
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
            <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
            <Route path="/verification-waiting" element={<EmailVerificationWaiting />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout userType={userType}><AdminPanel /></AdminLayout>} />
            <Route path="/admin/teacher-add" element={<AdminLayout><AdminPanel /></AdminLayout>} />
            <Route path="/admin/dates" element={<AdminLayout><AdminPanel /></AdminLayout>} />
            <Route path="/admin/history" element={<AdminLayout><YearlyStats /></AdminLayout>} />

            {/* Protected Routes */}
            <Route path="/" element={handleProtectedRoute(userType === 1 ? 'teacher' : 'student', userType === 1 ? <Navigate to="/teacher-home" /> : <StudentLayout><StudentHome /></StudentLayout>)} />
            <Route path="/teacher-home" element={handleProtectedRoute('teacher', <TeacherHome />)} />

            {/* Student Routes */}
            <Route path="/grup-olustur" element={handleProtectedRoute('student', userType === 0 ? <GroupCreate /> : <Navigate to="/teacher-home" />)} />
            <Route path="/proje-konulari" element={handleProtectedRoute(
              userType === 0 ? 'student' : 'teacher',
              userType === 0 ? <ProjectTopics /> :
                userType === 1 ? <TeacherProjectTopics /> :
                  <Navigate to="/" />
            )} />
            <Route path="/yeni-proje-oner" element={handleProtectedRoute('student', userType === 0 ? <ProjectSuggestion /> : <Navigate to="/teacher-home" />)} />
            <Route path="/tercih-listesi" element={handleProtectedRoute('student', userType === 0 ? <PreferenceList /> : <Navigate to="/teacher-home" />)} />
            <Route path="/grubum" element={handleProtectedRoute('student', userType === 0 ? <MyGroup /> : <Navigate to="/teacher-home" />)} />

            {/* Student URL aliases for backwards compatibility */}
            <Route path="/create-group" element={<Navigate to="/grup-olustur" />} />
            <Route path="/project-topics" element={<Navigate to="/proje-konulari" />} />

            {/* Teacher Routes */}
            <Route path="/teacher-home" element={handleProtectedRoute('teacher', <TeacherHome />)} />
            <Route path="/create-project" element={handleProtectedRoute('teacher', <CreateProject />)} />
            <Route path="/proje-konulari" element={handleProtectedRoute(
              userType === 0 ? 'student' : 'teacher',
              userType === 0 ? <ProjectTopics /> :
                userType === 1 ? <TeacherProjectTopics /> :
                  <Navigate to="/" />
            )} />
            <Route path="/project-requests" element={handleProtectedRoute('teacher', <StudentPreferences />)} />
            <Route path="/project-suggestions" element={handleProtectedRoute('teacher', <ProjectSuggestions />)} />

            {/* Catch-all Route */}
            <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
          </Routes>
        </div>
      </Router>
  );
}

export default App;