import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, getDoc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import '../../styles/ProjectTopics.css';
import StudentLayout from '../../components/StudentComponents/StudentLayout';

const ProjectTopics = () => {
  const [projects, setProjects] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [isGroupLeader, setIsGroupLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canSelectProject, setCanSelectProject] = useState(true);
  const [deadlineMessage, setDeadlineMessage] = useState('');
  const [approvedProject, setApprovedProject] = useState(null);
  const [suggestionStatus, setSuggestionStatus] = useState(null);
  const [lastSelectedProjectId, setLastSelectedProjectId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
 
  useEffect(() => {
    const initialize = async () => {
      try {
        await checkDeadline();
        
        await fetchUserGroups();
        
        await fetchProjects();

        await checkApprovedProject();

        await checkSuggestionStatus();
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Veri yüklenirken bir hata oluştu.');
      } finally {
        setIsInitialized(true);
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  useEffect(() => {
    if (userGroups.length > 0) {
      checkSuggestionStatus();
      
      const interval = setInterval(() => {
        checkSuggestionStatus();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [userGroups]);

  useEffect(() => {
    checkDeadline();
  }, [userGroups]);

  const checkDeadline = async () => {
    try {
      const deadlineDoc = await getDoc(doc(db, 'process_dates', 'proje_secim'));
      if (deadlineDoc.exists()) {
        const deadlineData = deadlineDoc.data();
        const startDate = deadlineData.startDate.toDate();
        const endDate = deadlineData.endDate.toDate();
        const currentDate = new Date();

        if ((suggestionStatus && (suggestionStatus.status === 'pending' || suggestionStatus.status === 'accepted' || suggestionStatus.status === 'approved')) ||
            (userGroups.length > 0 && userGroups[0].preferencesStatus === 'submitted')) {
          setCanSelectProject(false);
          setDeadlineMessage('');
          return;
        }

        if (suggestionStatus?.status === 'rejected') {
          setCanSelectProject(true);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihine kadar proje seçimi yapıp onaya gönderebilirsiniz. Eğer hiçbir seçiminiz onaylanmazsa otomatik atama yapılacaktır.`);
          return;
        }

        if (currentDate < startDate) {
          setCanSelectProject(false);
          const formattedDate = startDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden önce proje seçimi yapamazsınız.`);
        } else if (currentDate > endDate) {
          setCanSelectProject(false);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden sonra proje seçimi yapamazsınız.`);
        } else {
          setCanSelectProject(true);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihine kadar proje seçimi yapıp onaya gönderebilirsiniz. Eğer hiçbir seçiminiz onaylanmazsa otomatik atama yapılacaktır.`);
        }
      } else {
        setCanSelectProject(true);
        setDeadlineMessage('');
      }
    } catch (err) {
      console.error('Tarih kontrolü sırasında hata:', err);
      setCanSelectProject(true);
      setDeadlineMessage('');
    }
  };

  const fetchUserGroups = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Kullanıcı bilgisi alınamadı.');
        return;
      }
      
      const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
      
      if (!userDoc.exists()) {
        setError('Kullanıcı bilgisi bulunamadı.');
        return;
      }

      const userData = userDoc.data();
      setIsGroupLeader(userData.isGroupLeader === true);
      
      if (userData.groupId) {
        const groupDoc = await getDoc(doc(db, 'groups', userData.groupId));
        
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          const userGroupsData = [{
            id: groupDoc.id,
            name: groupData.name,
            preferencesStatus: groupData.preferencesStatus || null,
            preferences: groupData.preferences || [],
            ...groupData
          }];
          
          setUserGroups(userGroupsData);
        }
      } else {
        setUserGroups([]);
      }
    } catch (err) {
      console.error('Grup bilgileri getirilirken hata:', err);
      setError('Grup bilgileri yüklenirken bir hata oluştu.');
      throw err;
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');

      const projectsRef = collection(db, 'projects');
      const projectsSnapshot = await getDocs(projectsRef);
      const projectsList = [];

      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data();
        const instructorDoc = await getDoc(doc(db, 'ogretmenler', projectData.instructorEmail));
        const instructorData = instructorDoc.exists() ? instructorDoc.data() : null;

        projectsList.push({
          id: projectDoc.id,
          title: projectData.title,
          description: projectData.description,
          instructorName: instructorData?.displayName || projectData.instructorEmail,
          groupCount: projectData.groupCount,
          selectedBy: projectData.selectedBy || []
        });
      }

      setProjects(projectsList);
    } catch (err) {
      console.error('Projeler yüklenirken hata:', err);
      setError('Projeler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const selectProject = async (projectId) => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      setLastSelectedProjectId(projectId);

      const user = auth.currentUser;
      if (!user) {
        setError('Kullanıcı bilgisi alınamadı.');
        return;
      }

      const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
      if (!userDoc.exists() || !userDoc.data().groupId) {
        setError('Bir gruba üye değilsiniz.');
        return;
      }

      const groupId = userDoc.data().groupId;
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      
      if (!groupDoc.exists()) {
        setError('Grup bilgisi bulunamadı.');
        return;
      }

      const groupData = groupDoc.data();
      
      const preferences = groupData.preferences || [];
      
      if (preferences.includes(projectId)) {
        setError('Bu proje zaten tercih listesinde.');
        return;
      }

      if (preferences.length >= 3) {
        setError('Maksimum 3 proje tercihi yapabilirsiniz.');
        return;
      }

      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) {
        setError('Proje bilgisi bulunamadı.');
        return;
      }

      const projectData = projectDoc.data();

      await updateDoc(doc(db, 'groups', groupId), {
        preferences: arrayUnion(projectId)
      });

      setSuccess('Proje tercih listesine başarıyla eklendi.');
      
      setProjects(prevProjects => 
        prevProjects.map(project => 
          project.id === projectId 
            ? { ...project, selected: true }
            : project
        )
      );
    } catch (err) {
      console.error('Proje seçilirken hata:', err);
      setError('Proje seçilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const removeProject = async (projectId) => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const user = auth.currentUser;
      if (!user) {
        setError('Kullanıcı bilgisi alınamadı.');
        return;
      }

      const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
      if (!userDoc.exists() || !userDoc.data().groupId) {
        setError('Bir gruba üye değilsiniz.');
        return;
      }

      const groupId = userDoc.data().groupId;
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      
      if (!groupDoc.exists()) {
        setError('Grup bilgisi bulunamadı.');
        return;
      }

      const groupData = groupDoc.data();
      const preferences = groupData.preferences || [];

      if (!preferences.includes(projectId)) {
        setError('Bu proje tercih listesinde bulunmuyor.');
        return;
      }

      await updateDoc(doc(db, 'groups', groupId), {
        preferences: preferences.filter(id => id !== projectId)
      });

      setSuccess('Proje tercih listesinden başarıyla silindi.');
      
      setProjects(prevProjects => 
        prevProjects.map(project => 
          project.id === projectId 
            ? { ...project, selected: false }
            : project
        )
      );
    } catch (err) {
      console.error('Proje silinirken hata:', err);
      setError('Proje silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const checkApprovedProject = async () => {
    try {
      if (userGroups.length === 0) return;
      
      const approvedProjectRef = doc(db, 'approvedProjects', userGroups[0].id);
      const approvedProjectSnapshot = await getDoc(approvedProjectRef);
      
      if (approvedProjectSnapshot.exists()) {
        const approvedData = approvedProjectSnapshot.data();
        
        if (approvedData.projectId) {
          const projectDoc = await getDoc(doc(db, 'projects', approvedData.projectId));
          
          if (projectDoc.exists()) {
            setApprovedProject({
              ...projectDoc.data(),
              id: projectDoc.id,
              approvedAt: approvedData.approvedAt?.toDate()
            });
          }
        }
      }
    } catch (err) {
      console.error('Onaylanan proje bilgisi alınamadı:', err);
    }
  };

  const checkSuggestionStatus = async () => {
    try {
      if (userGroups.length === 0) return;
      
      const groupId = userGroups[0].id;
      const suggestionsRef = collection(db, 'project_suggestions');
      const q = query(suggestionsRef, where('groupId', '==', groupId));
      const suggestionsSnapshot = await getDocs(q);
      
      if (!suggestionsSnapshot.empty) {
        let latestSuggestion = null;
        let latestDate = new Date(0);
        
        suggestionsSnapshot.forEach(doc => {
          const suggestionData = doc.data();
          const suggestionDate = suggestionData.createdAt ? 
                               suggestionData.createdAt.toDate() : 
                               new Date(0);
          
          if (suggestionDate > latestDate) {
            latestDate = suggestionDate;
            latestSuggestion = {
              id: doc.id,
              ...suggestionData
            };
          }
        });
        
        if (latestSuggestion) {
          setSuggestionStatus(latestSuggestion);
        } else {
          setSuggestionStatus(null);
        }
      } else {
        setSuggestionStatus(null);
      }
    } catch (err) {
      console.error('Öneri durumu kontrol edilirken hata:', err);
      setSuggestionStatus(null);
    }
  };

  const submitPreferences = async () => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const user = auth.currentUser;
      if (!user) {
        setError('Kullanıcı bilgisi alınamadı.');
        return;
      }

      const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
      if (!userDoc.exists() || !userDoc.data().groupId) {
        setError('Bir gruba üye değilsiniz.');
        return;
      }

      const groupId = userDoc.data().groupId;
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      
      if (!groupDoc.exists()) {
        setError('Grup bilgisi bulunamadı.');
        return;
      }

      const groupData = groupDoc.data();
      const preferences = groupData.preferences || [];

      if (preferences.length === 0) {
        setError('En az bir proje tercihi yapmalısınız.');
        return;
      }

      for (const projectId of preferences) {
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (projectDoc.exists()) {
          const projectData = projectDoc.data();
          const teacherEmail = projectData.instructorEmail;

          await addDoc(collection(db, 'student_preferences'), {
            groupId: groupId,
            groupName: groupData.name,
            projectId: projectId,
            projectTitle: projectData.title,
            teacherEmail: teacherEmail,
            status: 'pending',
            submittedAt: serverTimestamp()
          });
        }
      }

      await updateDoc(doc(db, 'groups', groupId), {
        preferencesStatus: 'submitted',
        preferencesSubmittedAt: serverTimestamp()
      });

      setUserGroups(prevGroups => {
        if (prevGroups.length > 0) {
          return [{
            ...prevGroups[0],
            preferencesStatus: 'submitted',
            preferencesSubmittedAt: new Date()
          }];
        }
        return prevGroups;
      });

      setSuccess('Tercihleriniz başarıyla gönderildi.');
      
      await fetchUserGroups();
    } catch (err) {
      console.error('Tercihler gönderilirken hata:', err);
      setError('Tercihler gönderilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isInitialized) {
    return (
      <StudentLayout>
        <div className="container">
          <div className="section-container">
            <div className="section-title">Proje Konuları</div>
            <div className="loading-message">Yükleniyor...</div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="container">
        <h2 className="section-title">Proje Konuları</h2>
        
        {userGroups.length > 0 && !suggestionStatus && !userGroups[0]?.preferencesStatus && deadlineMessage && (
          <div className="deadline-info">
            {deadlineMessage}
          </div>
        )}

        {suggestionStatus?.status === 'rejected' && deadlineMessage && (
          <div className="deadline-info">
            {deadlineMessage}
          </div>
        )}
        
        {suggestionStatus?.status === 'pending' && (
          <div className="warning-message">
            Grubunuzun değerlendirme bekleyen bir proje önerisi bulunmaktadır. Proje konusu seçemezsiniz.
          </div>
        )}

        {suggestionStatus?.status === 'accepted' && (
          <div className="warning-message">
            Grubunuzun onaylanmış bir proje önerisi bulunmaktadır. Proje konusu seçemezsiniz.
          </div>
        )}

        {suggestionStatus?.status === 'approved' && (
          <div className="warning-message">
            Grubunuzun onaylanmış bir proje önerisi bulunmaktadır. Proje konusu seçemezsiniz.
          </div>
        )}
        
        {userGroups.length > 0 && userGroups[0]?.preferencesStatus === 'submitted' && (
          <div className="warning-message">
            Onaya gönderilmiş proje tercihiniz bulunmaktadır. Proje konusu seçemezsiniz.
          </div>
        )}
        
        {approvedProject && (
          <div className="warning-message">
            Grubunuzun onaylanmış bir projesi bulunduğu için yeni proje seçemezsiniz.
          </div>
        )}
        
        {!userGroups.length && (
          <div className="warning-message">
            Proje konusu seçebilmek için bir gruba dahil olmanız gerekmektedir.
          </div>
        )}
        {userGroups.length > 0 && !isGroupLeader && (
          <div className="warning-message">
            Proje seçme işlemini yalnızca grup liderleri yapabilir.
          </div>
        )}

        {userGroups.length > 0 && userGroups[0].members && userGroups[0].members.length < 2 && (
          <div className="warning-message">
            Grubunuz minimum 2 kişiden oluşmalı.
          </div>
        )}
        
        {projects.length === 0 ? (
          <div className="no-data-container">
            <div className="no-data-message">Henüz proje konusu bulunmamaktadır.</div>
          </div>
        ) : (
          <div className="project-table">
            <table>
              <thead>
                <tr>
                  <th>ÖĞRETİM ÜYESİ</th>
                  <th>PROJE ADI</th>
                  <th>PROJE KONUSU</th>
                  <th>GRUP SAYISI</th>
                  <th>SEÇİM</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr key={project.id}>
                    <td>{project.instructorName}</td>
                    <td>{project.title}</td>
                    <td>{project.description}</td>
                    <td className="text-center">{project.groupCount || 0}</td>
                    <td className="text-center">
                      <div className="project-action-container">
                        <button 
                          className="select-button"
                          onClick={() => selectProject(project.id)}
                          disabled={
                            !isGroupLeader || 
                            loading || 
                            !canSelectProject || 
                            approvedProject !== null ||
                            (userGroups.length > 0 && userGroups[0].preferencesStatus === 'submitted') ||
                            (userGroups.length > 0 && userGroups[0].members && userGroups[0].members.length < 2) ||
                            (suggestionStatus?.status === 'pending' || suggestionStatus?.status === 'accepted' || suggestionStatus?.status === 'approved')
                          }
                        >
                          SEÇ
                        </button>
                        {error && project.id === lastSelectedProjectId && (
                          <div className="project-error-message">{error}</div>
                        )}
                        {success && project.id === lastSelectedProjectId && (
                          <div className="project-success-message">{success}</div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {approvedProject && (
          <div className="approved-project-container">
            <div className="section-title">Onaylanan Projeniz</div>
            <div className="approved-project-details">
              <div className="approved-project-info">
                <h3>{approvedProject.title}</h3>
                <p><strong>Öğretim Üyesi:</strong> {approvedProject.instructorName || "Bilinmiyor"}</p>
                <p><strong>Açıklama:</strong> {approvedProject.description}</p>
                <p><strong>Onay Tarihi:</strong> {approvedProject.approvedAt ? approvedProject.approvedAt.toLocaleString('tr-TR') : 'Belirtilmemiş'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default ProjectTopics;