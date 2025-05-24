import React, { useState, useEffect } from 'react';
import { setDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/AdminPanel.css';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

const AdminPanel = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [groupCreationDeadline, setGroupCreationDeadline] = useState('');
  const [groupCreationTime, setGroupCreationTime] = useState('23:59');
  const [projectSelectionDeadline, setProjectSelectionDeadline] = useState('');
  const [projectSelectionTime, setProjectSelectionTime] = useState('23:59');
  const [loadingDates, setLoadingDates] = useState(true);
  const [dateUpdateSuccess, setDateUpdateSuccess] = useState('');
  
  const [groupCreationStartDate, setGroupCreationStartDate] = useState('');
  const [groupCreationStartTime, setGroupCreationStartTime] = useState('00:00');
  const [groupCreationEndDate, setGroupCreationEndDate] = useState('');
  const [groupCreationEndTime, setGroupCreationEndTime] = useState('23:59');
  
  const [projectCreationStartDate, setProjectCreationStartDate] = useState('');
  const [projectCreationStartTime, setProjectCreationStartTime] = useState('00:00');
  const [projectCreationEndDate, setProjectCreationEndDate] = useState('');
  const [projectCreationEndTime, setProjectCreationEndTime] = useState('23:59');
  
  const [projectSelectionStartDate, setProjectSelectionStartDate] = useState('');
  const [projectSelectionStartTime, setProjectSelectionStartTime] = useState('00:00');
  const [projectSelectionEndDate, setProjectSelectionEndDate] = useState('');
  const [projectSelectionEndTime, setProjectSelectionEndTime] = useState('23:59');
  
  const [projectApprovalStartDate, setProjectApprovalStartDate] = useState('');
  const [projectApprovalStartTime, setProjectApprovalStartTime] = useState('00:00');
  const [projectApprovalEndDate, setProjectApprovalEndDate] = useState('');
  const [projectApprovalEndTime, setProjectApprovalEndTime] = useState('23:59');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/admin/dates') {
      fetchDeadlines();
    }
    fetchTeachers();
  }, [location.pathname]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000); // 3 saniye sonra mesajı temizle

      return () => clearTimeout(timer); // Component unmount olduğunda timer'ı temizle
    }
  }, [success]);

  const fetchDeadlines = async () => {
    try {
      setLoadingDates(true);
      
      const groupCreationDoc = await getDoc(doc(db, 'process_dates', 'grup_olusturma'));
      if (groupCreationDoc.exists()) {
        const data = groupCreationDoc.data();
        const startDate = data.startDate.toDate();
        const endDate = data.endDate.toDate();
        
        setGroupCreationStartDate(startDate.toLocaleDateString('en-CA')); // YYYY-MM-DD format
        setGroupCreationStartTime(startDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
        setGroupCreationEndDate(endDate.toLocaleDateString('en-CA'));
        setGroupCreationEndTime(endDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      }
      
      const projectCreationDoc = await getDoc(doc(db, 'process_dates', 'proje_olusturma'));
      if (projectCreationDoc.exists()) {
        const data = projectCreationDoc.data();
        const startDate = data.startDate.toDate();
        const endDate = data.endDate.toDate();
        
        setProjectCreationStartDate(startDate.toLocaleDateString('en-CA'));
        setProjectCreationStartTime(startDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
        setProjectCreationEndDate(endDate.toLocaleDateString('en-CA'));
        setProjectCreationEndTime(endDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      }
      
      const projectSelectionDoc = await getDoc(doc(db, 'process_dates', 'proje_secim'));
      if (projectSelectionDoc.exists()) {
        const data = projectSelectionDoc.data();
        const startDate = data.startDate.toDate();
        const endDate = data.endDate.toDate();
        
        setProjectSelectionStartDate(startDate.toLocaleDateString('en-CA'));
        setProjectSelectionStartTime(startDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
        setProjectSelectionEndDate(endDate.toLocaleDateString('en-CA'));
        setProjectSelectionEndTime(endDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      }
      
      const projectApprovalDoc = await getDoc(doc(db, 'process_dates', 'proje_onay'));
      if (projectApprovalDoc.exists()) {
        const data = projectApprovalDoc.data();
        const startDate = data.startDate.toDate();
        const endDate = data.endDate.toDate();
        
        setProjectApprovalStartDate(startDate.toLocaleDateString('en-CA'));
        setProjectApprovalStartTime(startDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
        setProjectApprovalEndDate(endDate.toLocaleDateString('en-CA'));
        setProjectApprovalEndTime(endDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.error('Tarihler getirilirken hata:', err);
      setError('Tarihler getirilirken bir hata oluştu.');
    } finally {
      setLoadingDates(false);
    }
  };
  
  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const q = collection(db, 'ogretmenler');
      const querySnapshot = await getDocs(q);
      const teachersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeachers(teachersList);
    } catch (err) {
      console.error('Öğretim üyeleri getirilirken hata:', err);
      setError('Öğretim üyeleri getirilirken bir hata oluştu.');
    } finally {
      setLoadingTeachers(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!firstName || !lastName || !email) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

   if (!email.endsWith('@bil.omu.edu.tr')) {
      setError('Lütfen geçerli bir OMÜ e-posta adresi (@bil.omu.edu.tr) giriniz.');
      return;
    }

    setLoading(true);

    try {
      const newTeacher = {
        displayName: `${firstName} ${lastName}`,
        email: email,
        user_type: 1, 
        createdAt: Timestamp.now()
      };

      await setDoc(doc(db, 'ogretmenler', email), newTeacher);

      // Yeni öğretim üyesini listeye ekle
      setTeachers(prevTeachers => [{
        id: email,
        ...newTeacher
      }, ...prevTeachers]);

      setFirstName('');
      setLastName('');
      setEmail('');
      setSuccess('Öğretim üyesi başarıyla eklendi.');
      setIsFormOpen(false); // Formu kapat
    } catch (err) {
      console.error('Öğretim üyesi eklenirken hata:', err);
      setError('Öğretim üyesi eklenirken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setDateUpdateSuccess('');

    setLoading(true);

    try {
      if (groupCreationStartDate && groupCreationEndDate) {
        const startDate = new Date(`${groupCreationStartDate}T${groupCreationStartTime}`);
        const endDate = new Date(`${groupCreationEndDate}T${groupCreationEndTime}`);
        
        await setDoc(doc(db, 'process_dates', 'grup_olusturma'), {
          startDate: startDate,
          endDate: endDate,
          updatedAt: new Date()
        });
      }
    
      if (projectCreationStartDate && projectCreationEndDate) {
        const startDate = new Date(`${projectCreationStartDate}T${projectCreationStartTime}`);
        const endDate = new Date(`${projectCreationEndDate}T${projectCreationEndTime}`);
        
        await setDoc(doc(db, 'process_dates', 'proje_olusturma'), {
          startDate: startDate,
          endDate: endDate,
          updatedAt: new Date()
        });
      }
      
      if (projectSelectionStartDate && projectSelectionEndDate) {
        const startDate = new Date(`${projectSelectionStartDate}T${projectSelectionStartTime}`);
        const endDate = new Date(`${projectSelectionEndDate}T${projectSelectionEndTime}`);
        
        await setDoc(doc(db, 'process_dates', 'proje_secim'), {
          startDate: startDate,
          endDate: endDate,
          updatedAt: new Date()
        });
      }
      
      if (projectApprovalStartDate && projectApprovalEndDate) {
        const startDate = new Date(`${projectApprovalStartDate}T${projectApprovalStartTime}`);
        const endDate = new Date(`${projectApprovalEndDate}T${projectApprovalEndTime}`);
        
        await setDoc(doc(db, 'process_dates', 'proje_onay'), {
          startDate: startDate,
          endDate: endDate,
          updatedAt: new Date()
        });
      }
      
      setDateUpdateSuccess('Tüm tarihler başarıyla güncellendi.');
    } catch (err) {
      console.error('Tarihler güncellenirken hata:', err);
      setError('Tarihler güncellenirken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { 
    navigate('/login');
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm('Bu öğretim üyesini silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'ogretmenler', teacherId));
        setTeachers(prevTeachers => prevTeachers.filter(teacher => teacher.id !== teacherId));
        setSuccess('Öğretim üyesi başarıyla silindi.');
      } catch (err) {
        console.error('Öğretim üyesi silinirken hata:', err);
        setError('Öğretim üyesi silinirken bir hata oluştu: ' + err.message);
      }
    }
  };

  const renderTeacherAddForm = () => (
    <div className="admin-form-container">
      <div className="teachers-header">
        <button 
          className="add-teacher-button"
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          {isFormOpen ? 'Formu Kapat' : 'Yeni Öğretim Üyesi Ekle'}
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="teacher-form">
          <div className="form-group">
            <label>İsim</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="İsim"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Soyisim</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Soyisim"
              required
            />
          </div>
          
          <div className="form-group">
            <label>E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek.ogretmen@bil.omu.edu.tr"
              required
            />
            <small className="form-hint">OMÜ email adresi (@bil.omu.edu.tr) gereklidir</small>
          </div>
          
          <button
            type="submit"
            className="admin-submit-button"
            disabled={loading}
          >
            {loading ? 'KAYIT EDİLİYOR...' : 'KAYDET'}
          </button>
        </form>
      )}

      <div className="registered-teachers-section">
        <h3>Kayıtlı Öğretim Üyeleri</h3>
        {loadingTeachers ? (
          <div className="loading">Yükleniyor...</div>
        ) : teachers.length > 0 ? (
          <table className="teachers-table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Email</th>
                <th>Kayıt Tarihi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(teacher => (
                <tr key={teacher.id}>
                  <td>{teacher.displayName}</td>
                  <td>{teacher.email}</td>
                  <td>{teacher.createdAt?.toDate().toLocaleDateString('tr-TR')}</td>
                  <td>
                    <button
                      className="delete-teacher-button"
                      onClick={() => handleDeleteTeacher(teacher.id)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Henüz kayıtlı öğretim üyesi bulunmamaktadır.</p>
        )}
      </div>
    </div>
  );

  const renderDatesForm = () => (
    <div className="admin-form-container">
      <h3>İşlem Tarihlerini Belirle</h3>
      
      {error && <div className="error-message">{error}</div>}
      {dateUpdateSuccess && <div className="success-message">{dateUpdateSuccess}</div>}
      
      {loadingDates ? (
        <div className="loading-message">Tarihler yükleniyor...</div>
      ) : (
        <form onSubmit={handleDateUpdate}>
          {/* Grup Oluşturma Tarihleri */}
          <div className="form-group">
            <label>Öğrenciler için Grup Oluşturma</label>
            <div className="date-range">
              <div className="date-time-inputs">
                <span>Başlangıç:</span>
                <input
                  type="date"
                  value={groupCreationStartDate}
                  onChange={(e) => setGroupCreationStartDate(e.target.value)}
                />
                <input
                  type="time"
                  value={groupCreationStartTime}
                  onChange={(e) => setGroupCreationStartTime(e.target.value)}
                />
              </div>
              <div className="date-time-inputs">
                <span>Bitiş:</span>
                <input
                  type="date"
                  value={groupCreationEndDate}
                  onChange={(e) => setGroupCreationEndDate(e.target.value)}
                />
                <input
                  type="time"
                  value={groupCreationEndTime}
                  onChange={(e) => setGroupCreationEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Proje Oluşturma Tarihleri */}
          <div className="form-group">
            <label>Öğretim Üyeleri için Proje Konusu Oluşturma</label>
            <div className="date-range">
              <div className="date-time-inputs">
                <span>Başlangıç:</span>
                <input
                  type="date"
                  value={projectCreationStartDate}
                  onChange={(e) => setProjectCreationStartDate(e.target.value)}
                />
                <input
                  type="time"
                  value={projectCreationStartTime}
                  onChange={(e) => setProjectCreationStartTime(e.target.value)}
                />
              </div>
              <div className="date-time-inputs">
                <span>Bitiş:</span>
                <input
                  type="date"
                  value={projectCreationEndDate}
                  onChange={(e) => setProjectCreationEndDate(e.target.value)}
                />
                <input
                  type="time"
                  value={projectCreationEndTime}
                  onChange={(e) => setProjectCreationEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Proje Seçme Tarihleri */}
          <div className="form-group">
            <label>Öğrenciler için Proje Seçme/Önerme</label>
            <div className="date-range">
              <div className="date-time-inputs">
                <span>Başlangıç:</span>
                <input
                  type="date"
                  value={projectSelectionStartDate}
                  onChange={(e) => setProjectSelectionStartDate(e.target.value)}
                />
                <input
                  type="time"
                  value={projectSelectionStartTime}
                  onChange={(e) => setProjectSelectionStartTime(e.target.value)}
                />
              </div>
              <div className="date-time-inputs">
                <span>Bitiş:</span>
                <input
                  type="date"
                  value={projectSelectionEndDate}
                  onChange={(e) => setProjectSelectionEndDate(e.target.value)}
                />
                <input
                  type="time"
                  value={projectSelectionEndTime}
                  onChange={(e) => setProjectSelectionEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Proje Onaylama Tarihleri */}
          <div className="form-group">
            <label>Öğretim Üyeleri için Proje Onaylama/Reddetme</label>
            <div className="date-range">
              <div className="date-time-inputs">
                <span>Başlangıç:</span>
                <input
                  type="date"
                  value={projectApprovalStartDate}
                  onChange={(e) => setProjectApprovalStartDate(e.target.value)}
                />
                <input
                  type="time"
                  value={projectApprovalStartTime}
                  onChange={(e) => setProjectApprovalStartTime(e.target.value)}
                />
              </div>
              <div className="date-time-inputs">
                <span>Bitiş:</span>
                <input
                  type="date"
                  value={projectApprovalEndDate}
                  onChange={(e) => setProjectApprovalEndDate(e.target.value)}
                />
                <input
                  type="time"
                  value={projectApprovalEndTime}
                  onChange={(e) => setProjectApprovalEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            className="admin-submit-button"
            disabled={loading}
          >
            {loading ? 'GÜNCELLENİYOR...' : 'TARİHLERİ GÜNCELLE'}
          </button>
        </form>
      )}
    </div>
  );

  const renderContent = () => {
    switch (location.pathname) {
      case '/admin/teacher-add':
        return renderTeacherAddForm();
      case '/admin/dates':
        return renderDatesForm();
      default:
        return (
          <div className="admin-welcome">
            <h2>Admin Paneline Hoş Geldiniz</h2>
            <p>Sol menüden yapmak istediğiniz işlemi seçebilirsiniz.</p>
          </div>
        );
    }
  };

  return (
    <div className="admin-panel-container">
      {renderContent()}
    </div>
  );
};

export default AdminPanel; 