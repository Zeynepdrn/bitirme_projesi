import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import TeacherLayout from '../../components/TeacherComponents/TeacherLayout';
import '../../styles/CreateProject.css';

const CreateProject = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupCount, setGroupCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canCreateProject, setCanCreateProject] = useState(true);
  const [deadlineMessage, setDeadlineMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await checkDeadline();
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Veri yüklenirken bir hata oluştu.');
      } finally {
        setIsInitialized(true);
      }
    };
    
    initialize();
  }, []);

  const checkDeadline = async () => {
    try {
      const deadlineDoc = await getDoc(doc(db, 'process_dates', 'proje_olusturma'));
      if (deadlineDoc.exists()) {
        const deadlineData = deadlineDoc.data();
        const startDate = deadlineData.startDate.toDate();
        const endDate = deadlineData.endDate.toDate();
        const currentDate = new Date();

        if (currentDate < startDate) {
          setCanCreateProject(false);
          const formattedDate = startDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden önce proje oluşturamazsınız.`);
        } else if (currentDate > endDate) {
          setCanCreateProject(false);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden sonra proje oluşturamazsınız.`);
        } else {
          setCanCreateProject(true);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihine kadar proje oluşturabilirsiniz.`);
        }
      } else {
        setCanCreateProject(true);
        setDeadlineMessage('');
      }
    } catch (err) {
      console.error('Tarih kontrolü sırasında hata:', err);
      setCanCreateProject(true);
      setDeadlineMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!canCreateProject) {
      setError(deadlineMessage);
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      const teacherDoc = await getDoc(doc(db, 'ogretmenler', user.email));
      const instructorName = teacherDoc.exists() ? teacherDoc.data().displayName : user.email;

      const projectRef = await addDoc(collection(db, 'projects'), {
        title: title,
        description: description,
        groupCount: parseInt(groupCount),
        instructorId: user.uid,
        instructorName: instructorName,
        instructorEmail: user.email,
        createdAt: serverTimestamp(),
        selectedBy: []
      });

      setTitle('');
      setDescription('');
      setGroupCount(1);
      setSuccess('Proje başarıyla oluşturuldu.');
    } catch (err) {
      console.error('Proje oluşturulurken hata:', err);
      setError('Proje oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <TeacherLayout>
        <div className="container">
          <div className="section-title">Yeni Proje Oluştur</div>
          <div className="loading-message">Yükleniyor...</div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="container">
        <div className="section-title">Yeni Proje Oluştur</div>
        
        {!canCreateProject && (
          <div className="deadline-warning">
            {deadlineMessage}
          </div>
        )}
        
        {canCreateProject && (
          <div className="deadline-info">
            {deadlineMessage}
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <div className="project-form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Proje Adı *</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="form-control"
                disabled={!canCreateProject}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Proje Konusu *</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="form-control"
                rows={4}
                disabled={!canCreateProject}
              ></textarea>
            </div>
            
            <div className="form-group">
              <label htmlFor="groupCount">Onaylanabilecek Maksimum Grup Sayısı *</label>
              <input
                type="number"
                id="groupCount"
                value={groupCount}
                onChange={(e) => setGroupCount(e.target.value)}
                min="1"
                max="10"
                required
                className="form-control"
                disabled={!canCreateProject}
              />
              <small className="form-text text-muted">
                Bu sayı, bu projeyi kaç gruba verebileceğinizi belirler. İsteyen her grup bu projeyi seçebilir ancak siz sadece belirlediğiniz sayıda gruba onay verebilirsiniz.
              </small>
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="kaydet-button"
                disabled={loading || !canCreateProject}
              >
                {loading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </TeacherLayout>
  );
};

export default CreateProject;  