import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, getDoc, doc, where } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import StudentLayout from '../../components/StudentComponents/StudentLayout';
import '../../styles/ProjectSuggestion.css';


const ProjectSuggestion = () => {
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [projectContent, setProjectContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groupData, setGroupData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [canSubmit, setCanSubmit] = useState(true);
  const [deadlineMessage, setDeadlineMessage] = useState('');
  const [suggestionStatus, setSuggestionStatus] = useState(null);
  const [charactersRemaining, setCharactersRemaining] = useState(50);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Initializing ProjectSuggestion component...');
        setLoading(true);
        setError('');
        
        await checkDeadline();
        console.log('Deadline check completed');
        
        await fetchInstructors();
        console.log('Instructors fetched');
        
        await checkGroupMembership();
        console.log('Group membership check completed');
        
        await checkGroupProject();
        console.log('Group project check completed');
        
        await checkPreferences();
        console.log('Preferences check completed');
        
        await checkSuggestions();
        console.log('Suggestions check completed');

        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
          if (userDoc.exists() && userDoc.data().groupId) {
            const groupId = userDoc.data().groupId;
            const groupDoc = await getDoc(doc(db, 'groups', groupId));
            if (groupDoc.exists()) {
              const groupData = {
                id: groupDoc.id,
                name: groupDoc.data().name || groupDoc.data().groupCode || `Grup ${groupDoc.id}`,
                groupCode: groupDoc.data().groupCode,
                ...groupDoc.data()
              };
              setGroupData(groupData);
            }
          }
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Veri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.');
      } finally {
        setIsInitialized(true);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    if (projectContent.length < 50) {
      setCharactersRemaining(50 - projectContent.length);
    } else {
      setCharactersRemaining(0);
    }
  }, [projectContent]);
  
  const checkDeadline = async () => {
    try {
      const deadlineDoc = await getDoc(doc(db, 'process_dates', 'proje_secim'));
      if (deadlineDoc.exists()) {
        const deadlineData = deadlineDoc.data();
        const startDate = deadlineData.startDate.toDate();
        const endDate = deadlineData.endDate.toDate();
        const currentDate = new Date();

        if ((suggestionStatus && (suggestionStatus.status === 'pending' || suggestionStatus.status === 'accepted' || suggestionStatus.status === 'approved')) ||
            (groupData && groupData.preferencesStatus === 'submitted')) {
          setCanSubmit(false);
          setDeadlineMessage('');
          return;
        }

        if (suggestionStatus?.status === 'rejected') {
          setCanSubmit(true);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihine kadar proje önerebilirsiniz.`);
          return;
        }

        if (currentDate < startDate) {
          setCanSubmit(false);
          const formattedDate = startDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden önce proje öneremezsiniz.`);
        } else if (currentDate > endDate) {
          setCanSubmit(false);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden sonra proje öneremezsiniz.`);
        } else {
          setCanSubmit(true);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihine kadar proje önerebilirsiniz.`);
        }
      } else {
        setCanSubmit(true);
        setDeadlineMessage('');
      }
    } catch (err) {
      console.error('Tarih kontrolü sırasında hata:', err);
      setCanSubmit(true);
      setDeadlineMessage('');
    }
  };
  
  const fetchInstructors = async () => {
    try {
      const q = query(collection(db, 'ogretmenler'));
      const querySnapshot = await getDocs(q);
      
      const instructorsData = [];
      querySnapshot.forEach((doc) => {
        instructorsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setInstructors(instructorsData);
    } catch (err) {
      console.error('Öğretim üyeleri alınırken hata:', err);
      throw err;
    }
  };
  
  const checkGroupMembership = async () => {
    try {
      console.log('Checking group membership...');
      const user = auth.currentUser;
      if (!user) {
        console.error('No current user found');
        setError('Kullanıcı bilgisi alınamadı.');
        return;
      }
      console.log('Current user:', user.email);

      const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
      if (!userDoc.exists()) {
        console.error('User document not found in ogrenciler collection');
        setError('Kullanıcı bilgisi bulunamadı.');
        return;
      }
      console.log('User document found:', userDoc.data());

      const userData = userDoc.data();
      setUserData(userData);
      
      if (!userData.groupId) {
        console.error('User has no groupId');
        setError('Proje önerisi gönderebilmek için bir gruba dahil olmanız gerekmektedir.');
        setCanSubmit(false);
        return;
      }
      console.log('User groupId:', userData.groupId);

      const groupDoc = await getDoc(doc(db, 'groups', userData.groupId));
      if (!groupDoc.exists()) {
        console.error('Group document not found');
        setError('Grup bilgisi bulunamadı.');
        return;
      }
      console.log('Group document found:', groupDoc.data());

      const groupData = {
        id: groupDoc.id,
        name: groupDoc.data().name || groupDoc.data().groupCode || `Grup ${groupDoc.id}`,
        groupCode: groupDoc.data().groupCode,
        ...groupDoc.data()
      };
      
      console.log('Setting groupData:', groupData);
      setGroupData(groupData);

      if (!userData.isGroupLeader) {
        console.error('User is not a group leader');
        setError('Proje önerisi gönderme yetkisi sadece grup liderine aittir.');
        setCanSubmit(false);
        return;
      }
      console.log('User is group leader, can submit suggestions');
      setCanSubmit(true);
      setError('');
    } catch (err) {
      console.error('Error in checkGroupMembership:', err);
      setError('Grup bilgisi alınırken bir hata oluştu.');
    }
  };
  
  const checkGroupProject = async () => {
    try {
      if (!groupData) return;
      
      const groupDoc = await getDoc(doc(db, 'groups', groupData.id));
      
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        
        if (groupData.approvedProject) {
          setCanSubmit(false);
          setError('Grubunuzun onaylanmış bir projesi bulunduğu için yeni öneri gönderemezsiniz.');
          return;
        }
        
        if (groupData.projectStatus === 'approved') {
          setCanSubmit(false);
          setError('Grubunuzun onaylanmış bir projesi bulunduğu için yeni öneri gönderemezsiniz.');
          return;
        }
      }
    } catch (err) {
      console.error('Grup projesi kontrolü yapılırken hata:', err);
    }
  };
  
  const checkPreferences = async () => {
    try {
      if (!groupData) return;
      
      const preferencesRef = collection(db, 'student_preferences');
      const q = query(preferencesRef, where('groupId', '==', groupData.id));
      const preferencesSnapshot = await getDocs(q);
      
      if (!preferencesSnapshot.empty) {
        const preferenceDoc = preferencesSnapshot.docs[0];
        const preferenceData = preferenceDoc.data();
        
        if (preferenceData.status === 'approved') {
          setCanSubmit(false);
          setError('Grubunuzun onaylanmış bir proje tercihi bulunduğu için yeni bir proje önerisi gönderemezsiniz.');
        } else if (preferenceData.status === 'pending') {
          setCanSubmit(false);
          setError('Grubunuzun onay bekleyen bir proje tercihi bulunduğu için şu anda yeni bir proje önerisi gönderemezsiniz.');
        }
      }
    } catch (err) {
      console.error('Tercih kontrolü yapılırken hata:', err);
    }
  };
  
  const checkSuggestions = async () => {
    try {
      if (!groupData) return;
      
      const suggestionsRef = collection(db, 'project_suggestions');
      const q = query(suggestionsRef, where('groupId', '==', groupData.id));
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
          
          if (latestSuggestion.status === 'accepted' || latestSuggestion.status === 'approved') {
            setCanSubmit(false);
            setError('Grubunuzun proje önerisi onaylanmış olduğu için yeni bir öneri gönderemezsiniz.');
          } 
          else if (latestSuggestion.status === 'pending') {
            setCanSubmit(false);
            setError('Grubunuzun değerlendirme bekleyen bir proje önerisi bulunmaktadır. Yeni öneri gönderemezsiniz.');
          }
          else if (latestSuggestion.status === 'rejected') {
            setCanSubmit(true);
            setError('');
          }
        }
      } else {
        setSuggestionStatus(null);
        setCanSubmit(true);
        setError('');
      }
    } catch (err) {
      console.error('Öneri kontrolü yapılırken hata:', err);
      setError('Öneri durumu kontrol edilirken bir hata oluştu.');
    }
  };

  useEffect(() => {
    if (groupData) {
      checkSuggestions();
      
      const interval = setInterval(() => {
        checkSuggestions();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [groupData]);

  useEffect(() => {
    checkDeadline();
  }, [groupData]);

  const toggleInstructorSelection = (instructorId) => {
    setSelectedInstructors(prev => {
      if (prev.includes(instructorId)) {
        return prev.filter(id => id !== instructorId);
      } else {
        return [...prev, instructorId];
      }
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!groupData) {
      setError('Grup bilgisi bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }

    if (!groupData.id) {
      setError('Grup ID bilgisi bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }

    const suggestionsRef = collection(db, 'project_suggestions');
    const q = query(suggestionsRef, where('groupId', '==', groupData.id));
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
      
      if (latestSuggestion && latestSuggestion.status === 'pending') {
        setError('Grubunuzun değerlendirme bekleyen bir proje önerisi bulunmaktadır.Yeni öneri gönderemezsiniz.');
        return;
      }

      if (latestSuggestion && latestSuggestion.status === 'accepted') {
        setError('Grubunuzun onaylanmış bir proje önerisi bulunduğu için yeni öneri gönderemezsiniz.');
        return;
      }
    }

    const groupName = groupData.name || groupData.groupCode || `Grup ${groupData.id}`;

    if (selectedInstructors.length === 0) {
      setError('Lütfen en az bir öğretim üyesi seçin.');
      return;
    }

    if (!projectContent.trim()) {
      setError('Lütfen proje içeriğini girin.');
      return;
    }

    if (projectContent.length < 50) {
      setError('Proje içeriği en az 50 karakter olmalıdır.');
      return;
    }

    const confirmed = window.confirm('Proje önerisi gönderdiğinizde tercih gönderemeyeceksiniz. Yine de öneri göndermek istiyor musunuz?');
    
    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const user = auth.currentUser;
      if (!user) {
        setError('Kullanıcı bilgisi alınamadı.');
        return;
      }

      const suggestionData = {
        groupId: groupData.id,
        groupName: groupName,
        studentEmail: user.email,
        instructorEmails: selectedInstructors,
        content: projectContent.trim(),
        status: 'pending',
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'project_suggestions'), suggestionData);

      setSuccess('Proje öneriniz başarıyla gönderildi.');
      setProjectContent('');
      setSelectedInstructors([]);
      
      await checkSuggestions();
    } catch (err) {
      console.error('Error submitting project suggestion:', err);
      setError('Proje önerisi gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const extractNameFromEmail = (email) => {
    if (!email) return null;
    
    try {
      const namePart = email.split('@')[0];
      if (!namePart) return null;
      
      const withSpaces = namePart.replace(/\./g, ' ');
      
      return withSpaces.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch (e) {
      return null;
    }
  };

  if (loading || !isInitialized) {
    return (
      <StudentLayout>
        <div className="container">
          <div className="section-container">
            <div className="section-title">Proje Önerisi</div>
            <div className="loading-message">Yükleniyor...</div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="project-suggestion-container">
        {!groupData && (
          <div className="warning-message">
            Proje önerisi gönderebilmek için bir gruba dahil olmanız gerekmektedir.
          </div>
        )}

        {groupData && !suggestionStatus && !groupData?.preferencesStatus && deadlineMessage && (
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
            Grubunuzun değerlendirme bekleyen bir proje önerisi bulunmaktadır. Yeni öneri gönderemezsiniz.
          </div>
        )}

        {suggestionStatus?.status === 'accepted' && (
          <div className="warning-message">
            Grubunuzun onaylanmış bir proje önerisi bulunmaktadır. Yeni öneri gönderemezsiniz.
          </div>
        )}

        {suggestionStatus?.status === 'approved' && (
          <div className="warning-message">
            Grubunuzun onaylanmış bir proje önerisi bulunmaktadır. Yeni öneri gönderemezsiniz.
          </div>
        )}
        
        {groupData && groupData.preferencesStatus === 'submitted' && (
          <div className="warning-message">
            Onaya gönderilmiş proje tercihiniz bulunmaktadır. Yeni öneri gönderemezsiniz.
          </div>
        )}
        
        {groupData && !userData?.isGroupLeader && (
          <div className="warning-message">
            Proje önerme işlemini yalnızca grup liderleri yapabilir.
          </div>
        )}
        
        {groupData && groupData.members && groupData.members.length < 2 && (
          <div className="warning-message">
            Grubunuz minimum 2 kişiden oluşmalı.
          </div>
        )}
        
        {suggestionStatus && (
          <div className={`suggestion-status status-${suggestionStatus.status}`}>
            <h3>Mevcut Proje Öneriniz</h3>
            <div className="status-details">
              <div><strong>Öneri İçeriği:</strong> {suggestionStatus.content}</div>
              <div><strong>Gönderim Tarihi:</strong> {suggestionStatus.createdAt?.toDate().toLocaleString('tr-TR')}</div>
              <div className={`status-badge ${suggestionStatus.status === 'accepted' || suggestionStatus.status === 'approved' ? 'status-accepted' : 
                                 suggestionStatus.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                <strong>Durum:</strong> {
                  suggestionStatus.status === 'pending' ? 'Değerlendirme Bekliyor' :
                  suggestionStatus.status === 'accepted' || suggestionStatus.status === 'approved' ? 'Onaylandı' :
                  suggestionStatus.status === 'rejected' ? 'Reddedildi' : 'Değerlendirme Bekliyor'
                }
              </div>
              {suggestionStatus.status === 'approved' && suggestionStatus.approvedBy && (
                <div className="approval-details">
                  <strong>Onaylayan Öğretim Üyesi:</strong> {extractNameFromEmail(suggestionStatus.approvedBy)}
                </div>
              )}
              {suggestionStatus.status === 'accepted' && (
                <div className="acceptance-note">
                  <p>Öneriniz onaylanmıştır. Yeni bir öneri gönderemezsiniz.</p>
                </div>
              )}
              {suggestionStatus.status === 'approved' && (
                <div className="acceptance-note">
                  <p>Öneriniz onaylanmıştır. Yeni bir öneri gönderemezsiniz.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="section-container">
          <h2 className="section-title">Proje Önerisi Formu</h2>
          
          <form onSubmit={handleSubmit} className="suggestion-form">
            <div className="form-section">
              <h3 className="form-section-title">ÖĞRETİM ÜYESİ SEÇİNİZ (Birden fazla seçebilirsiniz)</h3>
              
              <div className="instructor-options">
                {instructors.map((instructor) => (
                  <div 
                    key={instructor.id} 
                    className={`instructor-option ${selectedInstructors.includes(instructor.id) ? 'selected' : ''}`}
                    onClick={() => {
                      if (canSubmit && userData?.isGroupLeader && (!groupData?.members || groupData.members.length >= 2) && groupData?.preferencesStatus !== 'submitted') {
                        toggleInstructorSelection(instructor.id);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`instructor-${instructor.id}`}
                      checked={selectedInstructors.includes(instructor.id)}
                      onChange={() => {}}
                      disabled={!canSubmit || !userData?.isGroupLeader || (groupData?.members && groupData.members.length < 2) || groupData?.preferencesStatus === 'submitted'}
                    />
                    <label htmlFor={`instructor-${instructor.id}`}>
                      {instructor.displayName || extractNameFromEmail(instructor.email)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="form-section">
              <h3 className="form-section-title">PROJE İÇERİĞİ</h3>
              <textarea
                value={projectContent}
                onChange={(e) => {
                  if (canSubmit && userData?.isGroupLeader && (!groupData?.members || groupData.members.length >= 2) && groupData?.preferencesStatus !== 'submitted') {
                    setProjectContent(e.target.value);
                  }
                }}
                placeholder="Proje içeriğini buraya yazın (en az 50 karakter)"
                disabled={!canSubmit || !userData?.isGroupLeader || (groupData?.members && groupData.members.length < 2) || groupData?.preferencesStatus === 'submitted'}
                className="suggestion-textarea"
              />
              {charactersRemaining > 0 && (
                <div className="character-count">
                  En az {charactersRemaining} karakter daha yazmalısınız.
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={
                  submitting ||
                  !canSubmit ||
                  !userData?.isGroupLeader ||
                  (groupData?.members && groupData.members.length < 2) ||
                  selectedInstructors.length === 0 ||
                  projectContent.length < 50 ||
                  groupData?.preferencesStatus === 'submitted'
                }
              >
                {submitting ? 'Gönderiliyor...' : 'GÖNDER'}
              </button>
            </div>
          </form>
          
          {success && <div className="success-message">{success}</div>}
        </div>
      </div>
    </StudentLayout>
  );
};

export default ProjectSuggestion; 