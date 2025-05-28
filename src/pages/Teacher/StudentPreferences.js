import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import TeacherLayout from '../../components/TeacherComponents/TeacherLayout';
import '../../styles/StudentPreferences.css';

const StudentPreferences = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectErrors, setProjectErrors] = useState({});
  const [canApproveProjects, setCanApproveProjects] = useState(true);
  const [deadlineMessage, setDeadlineMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await checkDeadline();
        await fetchData();
      } catch (err) {
        console.error('Initialization error:', err);
        setProjectErrors({ global: 'Veri yüklenirken bir hata oluştu.' });
      } finally {
        setIsInitialized(true);
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  const checkDeadline = async () => {
    try {
      const deadlineDoc = await getDoc(doc(db, 'process_dates', 'proje_onay'));
      if (deadlineDoc.exists()) {
        const deadlineData = deadlineDoc.data();
        const startDate = deadlineData.startDate.toDate();
        const endDate = deadlineData.endDate.toDate();
        const currentDate = new Date();

        if (currentDate < startDate) {
          setCanApproveProjects(false);
          const formattedDate = startDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden önce proje onaylama/reddetme işlemi yapamazsınız.`);
        } else if (currentDate > endDate) {
          setCanApproveProjects(false);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden sonra proje onaylama/reddetme işlemi yapamazsınız.`);
        } else {
          setCanApproveProjects(true);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihine kadar proje onaylama/reddetme işlemi yapabilirsiniz.`);
        }
      } else {
        setCanApproveProjects(true);
        setDeadlineMessage('');
      }
    } catch (err) {
      console.error('Tarih kontrolü sırasında hata:', err);
      setCanApproveProjects(true);
      setDeadlineMessage('');
    }
  };

  const fetchData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setProjectErrors({ global: 'Kullanıcı girişi yapılmamış.' });
        setLoading(false);
        return;
      }

      const projectsRef = collection(db, 'projects');
      const projectsSnapshot = await getDocs(projectsRef);
      const projectsData = {};
      
      projectsSnapshot.docs.forEach(doc => {
        projectsData[doc.id] = {
          id: doc.id,
          title: doc.data().title,
          groups: []
        };
      });

      const preferencesRef = collection(db, 'student_preferences');
      const q = query(preferencesRef, where('teacherEmail', '==', user.email));
      const preferencesSnapshot = await getDocs(q);

      for (const prefDoc of preferencesSnapshot.docs) {
        const prefData = prefDoc.data();
        if (projectsData[prefData.projectId]) {
          const groupDoc = await getDoc(doc(db, 'groups', prefData.groupId));
          const groupData = groupDoc.exists() ? groupDoc.data() : null;
          
          projectsData[prefData.projectId].groups.push({
            id: prefData.groupId,
            groupCode: groupData?.groupCode || prefData.groupId,
            members: groupData?.members || [],
            status: prefData.status || 'pending',
            preferenceId: prefDoc.id,
            isAutoAssigned: prefData.isAutoAssigned || false,
            autoAssignedAt: prefData.autoAssignedAt?.toDate() || null
          });
        }
      }

      const filteredProjects = Object.values(projectsData).filter(
        project => project.groups.length > 0
      );

      setProjects(filteredProjects);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setProjectErrors({ global: 'Veriler yüklenirken bir hata oluştu.' });
      setLoading(false);
    }
  };

  const handleApprove = async (groupId, preferenceId, projectId) => {
    if (!canApproveProjects) {
      setProjectErrors(prev => ({
        ...prev,
        [projectId]: deadlineMessage
      }));
      return;
    }

    try {
      setProjectErrors(prev => ({ ...prev, [projectId]: '' }));

      const approvedGroupsRef = collection(db, 'student_preferences');
      const groupApprovalQuery = query(
        approvedGroupsRef,
        where('groupId', '==', groupId),
        where('status', '==', 'approved')
      );
      const groupApprovalSnapshot = await getDocs(groupApprovalQuery);
      
      if (!groupApprovalSnapshot.empty) {
        setProjectErrors(prev => ({ 
          ...prev, 
          [projectId]: 'Bu grubun zaten onaylanmış bir projesi bulunmaktadır.' 
        }));
        return;
      }

      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) {
        setProjectErrors(prev => ({ ...prev, [projectId]: 'Proje bilgisi bulunamadı.' }));
        return;
      }

      const projectData = projectDoc.data();
      
      const projectApprovalQuery = query(
        approvedGroupsRef,
        where('projectId', '==', projectId),
        where('status', '==', 'approved')
      );
      const approvedGroupsSnapshot = await getDocs(projectApprovalQuery);
      
      if (approvedGroupsSnapshot.size >= projectData.groupCount) {
        setProjectErrors(prev => ({ ...prev, [projectId]: 'Bu proje için onaylanabilecek maksimum grup sayısına ulaşıldı. Başka bir proje seçin veya mevcut onayları iptal edin.' }));
        return;
      }

      const preferenceRef = doc(db, 'student_preferences', preferenceId);
      await updateDoc(preferenceRef, {
        status: 'approved',
        approvedAt: new Date()
      });

      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        status: 'approved'
      });

      setProjects(prevProjects => 
        prevProjects.map(project => 
          project.id === projectId
            ? {
                ...project,
                groups: project.groups.map(group => 
                  group.id === groupId 
                    ? { ...group, status: 'approved' }
                    : group
                )
              }
            : project
        )
      );

      setProjectErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[projectId];
        return newErrors;
      });
    } catch (err) {
      console.error('Error approving group:', err);
      setProjectErrors(prev => ({ ...prev, [projectId]: 'Grup onaylanırken bir hata oluştu.' }));
    }
  };

  const handleRevokeApproval = async (groupId, preferenceId, projectId) => {
    if (!canApproveProjects) {
      setProjectErrors(prev => ({
        ...prev,
        [projectId]: deadlineMessage
      }));
      return;
    }

    try {
      const preferenceRef = doc(db, 'student_preferences', preferenceId);
      await updateDoc(preferenceRef, {
        status: 'pending'
      });

      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        status: 'pending'
      });

      setProjects(prevProjects => 
        prevProjects.map(project => ({
          ...project,
          groups: project.groups.map(group => 
            group.id === groupId 
              ? { ...group, status: 'pending' }
              : group
          )
        }))
      );
    } catch (err) {
      console.error('Error revoking approval:', err);
      setProjectErrors(prev => ({ ...prev, [projectId]: 'Onay iptal edilirken bir hata oluştu.' }));
    }
  };

  if (loading || !isInitialized) {
    return (
      <TeacherLayout>
        <div className="container">
          <div className="section-container">
            <div className="section-title">Öğrenci Tercihleri</div>
            <div className="loading-message">Yükleniyor...</div>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="container">
        <div className="section-container">
          <h2 className="section-title">Öğrenci Tercihleri</h2>
          {projectErrors.global && <div className="error-message">{projectErrors.global}</div>}
          
          {!canApproveProjects && (
            <div className="deadline-warning">
              {deadlineMessage}
            </div>
          )}
          
          {canApproveProjects && (
            <div className="deadline-info">
              {deadlineMessage}
            </div>
          )}
          
          {projects.length === 0 ? (
            <div className="no-data-container">
              <div className="no-data-message">Henüz gönderilmiş proje tercihi bulunmamaktadır.</div>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="project-section">
                <div className="project-title-banner">
                  {project.title}
                </div>
                {projectErrors[project.id] && (
                  <div className="warning-message">
                    {projectErrors[project.id]}
                  </div>
                )}
                <div className="groups-list">
                  {project.groups.map((group) => (
                    <div key={group.id} className="group-item">
                      <div className="group-details">
                        <div className="group-id">{group.groupCode}</div>
                        <div className="group-members">
                          {group.members.map((member, index) => (
                            <div key={index} className="member-name">
                              {member.displayName || member.email}
                            </div>
                          ))}
                        </div>
                        {group.isAutoAssigned && (
                          <div className="auto-assigned-badge">
                            Otomatik Atandı {group.autoAssignedAt?.toLocaleString('tr-TR')}
                          </div>
                        )}
                      </div>
                      {group.status === 'approved' ? (
                        <div className="status-section">
                          <div className="status-badge approved">
                            ONAYLANDI
                          </div>
                          <div 
                            className="status-badge revoke"
                            onClick={() => canApproveProjects && handleRevokeApproval(group.id, group.preferenceId, project.id)}
                            style={{ 
                              cursor: canApproveProjects ? 'pointer' : 'not-allowed',
                              backgroundColor: canApproveProjects ? '#ffebee' : '#f5f5f5',
                              color: canApproveProjects ? '#c62828' : '#9e9e9e',
                              border: 'none',
                              opacity: canApproveProjects ? 1 : 0.7
                            }}
                          >
                            İPTAL ET
                          </div>
                        </div>
                      ) : (
                        <button
                          className="approve-button"
                          onClick={() => handleApprove(group.id, group.preferenceId, project.id)}
                          disabled={!canApproveProjects}
                          style={{
                            opacity: canApproveProjects ? 1 : 0.7,
                            backgroundColor: canApproveProjects ? '#2c2c2c' : '#9e9e9e',
                            cursor: canApproveProjects ? 'pointer' : 'not-allowed'
                          }}
                        >
                          ONAYLA
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </TeacherLayout>
  );
};

export default StudentPreferences;