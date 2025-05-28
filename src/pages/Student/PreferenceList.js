import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, doc, getDoc, updateDoc, addDoc, serverTimestamp, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import '../../styles/PreferenceList.css';
import StudentLayout from '../../components/StudentComponents/StudentLayout';

const PreferenceList = () => {
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groupInfo, setGroupInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGroupLeader, setIsGroupLeader] = useState(false);
  const [approvedProject, setApprovedProject] = useState(null);
  const [autoAssignedProject, setAutoAssignedProject] = useState(null);
  const [canSelectProject, setCanSelectProject] = useState(true);
  const [suggestionStatus, setSuggestionStatus] = useState(null);
  const [showSubmittedProjects, setShowSubmittedProjects] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        setSuccess('');

        const user = auth.currentUser;
        if (!user) {
          setError('Kullanıcı girişi yapılmamış.');
          return;
        }

        const projectApprovalDoc = await getDoc(doc(db, 'process_dates', 'proje_onay'));
        if (projectApprovalDoc.exists()) {
          const approvalData = projectApprovalDoc.data();
          const approvalEndDate = approvalData.endDate.toDate();
          const currentDate = new Date();

          if (currentDate > approvalEndDate && !approvalData.autoAssignmentDone) {
            console.log('Proje onay süresi doldu, otomatik proje dağıtımı başlatılıyor...');
            await autoAssignProjects();
          }
        }

        const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
        if (!userDoc.exists()) {
          setError('Kullanıcı bilgisi bulunamadı.');
          return;
        }

        const userData = userDoc.data();
        setIsGroupLeader(userData.isGroupLeader === true);
        if (!userData.groupId) {
          return;
        }

        const groupDoc = await getDoc(doc(db, 'groups', userData.groupId));
        if (!groupDoc.exists()) {
          setError('Grup bilgisi bulunamadı.');
          return;
        }

        const groupData = { id: groupDoc.id, ...groupDoc.data() };
        setGroupInfo(groupData);

        const preferencesRef = collection(db, 'student_preferences');
        const q = query(preferencesRef, 
          where('groupId', '==', groupData.id),
          where('status', '==', 'approved')
        );
        const preferencesSnapshot = await getDocs(q);
        
        if (!preferencesSnapshot.empty) {
          const preference = preferencesSnapshot.docs[0].data();
          const projectDoc = await getDoc(doc(db, 'projects', preference.projectId));
          if (projectDoc.exists()) {
            const projectData = {
              ...projectDoc.data(),
              id: projectDoc.id,
              isAutoAssigned: preference.isAutoAssigned || false,
              autoAssignedAt: preference.autoAssignedAt?.toDate(),
              approvedAt: preference.approvedAt?.toDate()
            };
            
            if (projectData.isAutoAssigned) {
              setAutoAssignedProject(projectData);
              setShowSubmittedProjects(false);
            } else {
              setApprovedProject(projectData);
              setShowSubmittedProjects(false);
            }
          }
        }

        const suggestionsRef = collection(db, 'project_suggestions');
        const suggestionsQuery = query(suggestionsRef, where('groupId', '==', groupData.id));
        const suggestionsSnapshot = await getDocs(suggestionsQuery);
        
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
          }
        }

        const deadlineDoc = await getDoc(doc(db, 'process_dates', 'proje_secim'));
        if (deadlineDoc.exists()) {
          const deadlineData = deadlineDoc.data();
          const startDate = deadlineData.startDate.toDate();
          const endDate = deadlineData.endDate.toDate();
          const currentDate = new Date();

          if (currentDate < startDate || currentDate > endDate) {
            setCanSelectProject(false);
          } else {
            setCanSelectProject(true);
          }
        }

        if (groupData.preferences && groupData.preferences.length > 0) {
          const projects = [];
          for (const projectId of groupData.preferences) {
            const projectDoc = await getDoc(doc(db, 'projects', projectId));
            if (projectDoc.exists()) {
              projects.push({
                id: projectDoc.id,
                ...projectDoc.data()
              });
            }
          }
          setSelectedProjects(projects);
        } else {
          setSelectedProjects([]);
        }
      } catch (err) {
        console.error('Veri yükleme hatası:', err);
        setError('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRemoveProject = async (projectId) => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      if (!groupInfo) {
        setError('Grup bilgisi bulunamadı.');
        return;
      }

      const updatedPreferences = groupInfo.preferences.filter(id => id !== projectId);
      await updateDoc(doc(db, 'groups', groupInfo.id), {
        preferences: updatedPreferences
      });

      setSelectedProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));
      setGroupInfo(prev => ({
        ...prev,
        preferences: updatedPreferences
      }));

      setSuccess('Proje tercih listesinden kaldırıldı.');
    } catch (err) {
      console.error('Proje kaldırma hatası:', err);
      setError('Proje kaldırılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPreferences = async () => {
    if (!groupInfo || selectedProjects.length === 0) {
      setError('Tercih göndermek için en az bir proje seçilmiş olmalıdır.');
      return;
    }

    const confirmed = window.confirm('Tercih gönderdiğinizde proje önerisi gönderemeyeceksiniz. Yine de tercih göndermek istiyor musunuz?');
    
    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');

      for (const project of selectedProjects) {
        const groupDoc = await getDoc(doc(db, 'groups', groupInfo.id));
        const groupData = groupDoc.data();
        const members = groupData.members || [];

        await addDoc(collection(db, 'student_preferences'), {
          groupId: groupInfo.id,
          groupName: groupInfo.name || groupInfo.groupCode || groupInfo.id || '-',
          groupMembers: members,
          projectId: project.id,
          projectTitle: project.title,
          teacherEmail: project.instructorEmail,
          status: 'pending',
          submittedAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, 'groups', groupInfo.id), {
        preferencesStatus: 'submitted',
        preferencesSubmittedAt: serverTimestamp()
      });

      setGroupInfo(prev => ({
        ...prev,
        preferencesStatus: 'submitted',
        preferencesSubmittedAt: new Date()
      }));

      setSuccess('Tercihleriniz başarıyla gönderildi.');
    } catch (err) {
      console.error('Tercih gönderme hatası:', err);
      setError('Tercihler gönderilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const autoAssignProjects = async () => {
    try {
      const processDatesRef = doc(db, 'process_dates', 'proje_onay');
      
      const autoAssignmentDoc = await getDoc(processDatesRef);
      if (autoAssignmentDoc.exists() && autoAssignmentDoc.data().autoAssignmentDone) {
        console.log('Otomatik proje dağıtımı zaten yapılmış.');
        return true;
      }

      await runTransaction(db, async (transaction) => {
        const processDatesDoc = await transaction.get(processDatesRef);
        if (processDatesDoc.exists() && processDatesDoc.data().autoAssignmentDone) {
          console.log('Otomatik proje dağıtımı zaten yapılmış (transaction içinde).');
          return;
        }

        const projectsRef = collection(db, 'projects');
        const projectsSnapshot = await getDocs(projectsRef);
        
        const groupsRef = collection(db, 'groups');
        const groupsSnapshot = await getDocs(groupsRef);
        
        const preferencesRef = collection(db, 'student_preferences');
        const preferencesSnapshot = await getDocs(preferencesRef);
        
        const suggestionsRef = collection(db, 'project_suggestions');
        const suggestionsSnapshot = await getDocs(suggestionsRef);
        
        const projectsMap = new Map();
        const groupsMap = new Map();
        const approvedGroupsMap = new Map(); 
        
        projectsSnapshot.forEach(doc => {
          const projectData = doc.data();
          projectsMap.set(doc.id, {
            id: doc.id,
            ...projectData,
            assignedGroups: 0
          });
        });
        
        groupsSnapshot.forEach(doc => {
          const groupData = doc.data();
          groupsMap.set(doc.id, {
            id: doc.id,
            ...groupData,
            hasApprovedProject: false
          });
        });
        
        preferencesSnapshot.forEach(doc => {
          const prefData = doc.data();
          if (prefData.status === 'approved') {
            approvedGroupsMap.set(prefData.groupId, true);
            groupsMap.get(prefData.groupId).hasApprovedProject = true;
            const project = projectsMap.get(prefData.projectId);
            if (project) {
              project.assignedGroups++;
            }
          }
        });

        suggestionsSnapshot.forEach(doc => {
          const suggestionData = doc.data();
          if (suggestionData.status === 'approved') {
            approvedGroupsMap.set(suggestionData.groupId, true);
            groupsMap.get(suggestionData.groupId).hasApprovedProject = true;
          }
        });

        groupsSnapshot.forEach(doc => {
          const groupData = doc.data();
          if (groupData.approvedProject) {
            approvedGroupsMap.set(doc.id, true);
            groupsMap.get(doc.id).hasApprovedProject = true;
          }
        });

        const availableProjects = [];
        const eligibleGroups = [];
        
        projectsMap.forEach(project => {
          if (project.assignedGroups < project.groupCount) {
            availableProjects.push({
              ...project,
              remainingSlots: project.groupCount - project.assignedGroups
            });
          }
        });
        
        groupsMap.forEach(group => {
          if (!group.hasApprovedProject) {
            eligibleGroups.push(group);
          }
        });

        const shuffleArray = (array) => {
          for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
          }
          return array;
        };

        const shuffledProjects = shuffleArray([...availableProjects]);
        const shuffledGroups = shuffleArray([...eligibleGroups]);

        for (const group of shuffledGroups) {
          const suitableProject = shuffledProjects.find(project => project.remainingSlots > 0);

          if (suitableProject) {
            const newPreferenceRef = doc(collection(db, 'student_preferences'));
            transaction.set(newPreferenceRef, {
              groupId: group.id,
              groupName: group.groupCode || group.id,
              projectId: suitableProject.id,
              projectTitle: suitableProject.title,
              teacherEmail: suitableProject.instructorEmail,
              status: 'approved',
              approvedAt: new Date(),
              isAutoAssigned: true,
              autoAssignedAt: new Date()
            });

            suitableProject.remainingSlots--;
            
            const project = projectsMap.get(suitableProject.id);
            if (project) {
              project.assignedGroups++;
            }
          }
        }
        
        transaction.update(processDatesRef, {
          autoAssignmentDone: true,
          autoAssignmentDate: new Date()
        });
      });
      
      return true;
    } catch (err) {
      console.error('Otomatik proje dağıtımı sırasında hata:', err);
      return false;
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="container">
          <div className="section-container">
            <div className="section-title">Tercih Listesi</div>
            <div className="loading-message">Yükleniyor...</div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="container">
        <div className="section-container">
          <div className="section-title">Tercih Listesi</div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {approvedProject && !approvedProject.isAutoAssigned && (
            <>
              <div className="warning-message">
                Grubunuzun proje tercihi onaylanmış olduğu için yeni tercih gönderemezsiniz.
              </div>
              <div className="approved-project-container">
                <h3>Onaylanan Proje Tercihiniz</h3>
                <div className="approved-project-details">
                  <div className="approved-project-title">{approvedProject.title}</div>
                  <div className="approved-project-instructor">
                    Öğretim Üyesi: {approvedProject.instructorName || approvedProject.instructorEmail}
                  </div>
                  <div className="approved-project-date">
                    Onaylanma Tarihi: {approvedProject.approvedAt?.toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
            </>
          )}

          {autoAssignedProject && (
            <>
              <div className="warning-message">
                Grubunuzun projesi otomatik olarak atanmıştır.
              </div>
              <div className="auto-assigned-project-container">
                <h3>Otomatik Atanan Projeniz</h3>
                <div className="auto-assigned-project-details">
                  <div className="auto-assigned-project-title">{autoAssignedProject.title}</div>
                  <div className="auto-assigned-project-instructor">
                    Öğretim Üyesi: {autoAssignedProject.instructorName || autoAssignedProject.instructorEmail}
                  </div>
                  <div className="auto-assigned-date">
                    Atanma Tarihi: {autoAssignedProject.autoAssignedAt?.toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
            </>
          )}

          {!groupInfo ? (
            <div className="warning-message">
              Proje tercihi yapabilmek için bir gruba dahil olmanız gerekmektedir.
            </div>
          ) : groupInfo.preferencesStatus === 'submitted' ? (
            <div className="submitted-projects-container">
              <div 
                className="submitted-projects-header"
                onClick={() => setShowSubmittedProjects(!showSubmittedProjects)}
                style={{ cursor: 'pointer' }}
              >
                <h3>
                  Onaya gönderilen projeleriniz
                  <span className="toggle-icon">
                    {showSubmittedProjects ? <FaChevronUp /> : <FaChevronDown />}
                  </span>
                </h3>
                <div className="submission-date">
                  Gönderim Tarihi: {groupInfo.preferencesSubmittedAt instanceof Date ? 
                    groupInfo.preferencesSubmittedAt.toLocaleString('tr-TR') : 
                    groupInfo.preferencesSubmittedAt?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih bilgisi yok'}
                </div>
              </div>
              {showSubmittedProjects && (
                <table className="preferences-table">
                  <thead>
                    <tr>
                      <th className="sira-column">Sıra</th>
                      <th className="instructor-column">Öğretim Üyesi</th>
                      <th className="title-column">Proje Adı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProjects.map((project, index) => (
                      <tr key={project.id}>
                        <td className="sira-column">{index + 1}</td>
                        <td className="instructor-column">{project.instructorName || project.instructorEmail}</td>
                        <td className="title-column">{project.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : selectedProjects.length === 0 && !autoAssignedProject ? (
            <div className="warning-message">
              Henüz proje tercihi yapmadınız. Lütfen proje konuları sayfasından tercihlerinizi yapın.
            </div>
          ) : !autoAssignedProject ? (
            <div className="preferences-container">
              <table className="preferences-table">
                <thead>
                  <tr>
                    <th className="sira-column">Sıra</th>
                    <th className="instructor-column">Öğretim Üyesi</th>
                    <th className="title-column">Proje Adı</th>
                    <th className="action-column">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProjects.map((project, index) => (
                    <tr key={project.id}>
                      <td className="sira-column">{index + 1}</td>
                      <td className="instructor-column">{project.instructorName || project.instructorEmail}</td>
                      <td className="title-column">{project.title}</td>
                      <td className="action-column">
                        <button
                          className="remove-button"
                          onClick={() => handleRemoveProject(project.id)}
                          disabled={groupInfo.preferencesStatus === 'submitted' || approvedProject !== null}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="button-container">
                {isGroupLeader && (
                  <button
                    className="submit-button"
                    onClick={handleSubmitPreferences}
                    disabled={
                      isSubmitting || 
                      groupInfo.preferencesStatus === 'submitted' || 
                      approvedProject !== null ||
                      !canSelectProject ||
                      (groupInfo.members && groupInfo.members.length < 2) ||
                      (suggestionStatus?.status === 'pending' || suggestionStatus?.status === 'accepted' || suggestionStatus?.status === 'approved')
                    }
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'ONAYA GÖNDER'}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </StudentLayout>
  );
};

export default PreferenceList;