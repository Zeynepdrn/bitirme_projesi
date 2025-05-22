import React, { useState, useEffect } from 'react';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/AdminPanel.css';

const AdminPanel = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
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
  }, [location.pathname]);

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
      await setDoc(doc(db, 'ogretmenler', email), {
        displayName: `${firstName} ${lastName}`,
        email: email,
        user_type: 1, 
        createdAt: new Date()
      });

      setFirstName('');
      setLastName('');
      setEmail('');
      setSuccess('Öğretim üyesi başarıyla eklendi.');
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

  const renderTeacherAddForm = () => (
    <div className="admin-form-container">
      <h3>Öğretim Üyesi Ekle</h3>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
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