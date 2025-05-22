import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import TeacherLayout from '../../components/TeacherComponents/TeacherLayout';
import '../../styles/ProjectSuggestions.css';

const extractNameFromEmail = (email) => {
  if (!email) return "Bilinmiyor";
  
  try {
    const namePart = email.split('@')[0];
    if (!namePart) return "Bilinmiyor";
    
    const withSpaces = namePart.replace(/\./g, ' ');
    
    return withSpaces.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (e) {
    return "Bilinmiyor";
  }
};

const ProjectSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suggestionErrors, setSuggestionErrors] = useState({});
  const [canApproveSuggestions, setCanApproveSuggestions] = useState(true);
  const [deadlineMessage, setDeadlineMessage] = useState('');

  useEffect(() => {
    checkDeadline();
    fetchSuggestions();
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
          setCanApproveSuggestions(false);
          const formattedDate = startDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden önce proje önerilerini onaylama/reddetme işlemi yapamazsınız.`);
        } else if (currentDate > endDate) {
          setCanApproveSuggestions(false);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden sonra proje önerilerini onaylama/reddetme işlemi yapamazsınız.`);
        } else {
          setCanApproveSuggestions(true);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihine kadar proje önerilerini onaylama/reddetme işlemi yapabilirsiniz.`);
        }
      } else {
        setCanApproveSuggestions(true);
        setDeadlineMessage('');
      }
    } catch (err) {
      console.error('Tarih kontrolü sırasında hata:', err);
      setCanApproveSuggestions(true);
      setDeadlineMessage('');
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError('');
      
      const user = auth.currentUser;
      if (!user) {
        setError('Kullanıcı bilgisi alınamadı.');
        return;
      }

      const suggestionsRef = collection(db, 'project_suggestions');
      const suggestionsQuery = query(suggestionsRef, where('instructorEmails', 'array-contains', user.email));
      const suggestionsSnapshot = await getDocs(suggestionsQuery);
      
      const suggestionsData = [];
      for (const suggestionDoc of suggestionsSnapshot.docs) {
        const suggestion = suggestionDoc.data();
        const groupDocRef = doc(db, 'groups', suggestion.groupId);
        const groupDocSnap = await getDoc(groupDocRef);
        
        if (groupDocSnap.exists()) {
          const groupData = groupDocSnap.data();
          suggestionsData.push({
            id: suggestionDoc.id,
            ...suggestion,
            groupName: groupData.name || groupData.groupCode || `Grup ${suggestion.groupId}`,
            groupMembers: groupData.members || []
          });
        }
      }
      
      setSuggestions(suggestionsData);
    } catch (err) {
      console.error('Öneriler yüklenirken hata:', err);
      setError('Öneriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (suggestionId) => {
    if (!canApproveSuggestions) {
      setSuggestionErrors(prev => ({
        ...prev,
        [suggestionId]: deadlineMessage
      }));
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuggestionErrors(prev => ({ ...prev, [suggestionId]: '' }));

      const suggestionDoc = await getDoc(doc(db, 'project_suggestions', suggestionId));
      const suggestionData = suggestionDoc.data();

      const currentTeacherEmail = auth.currentUser.email;
      const instructorStatuses = suggestionData.instructorStatuses || {};
      
      const hasAnyApproval = Object.values(instructorStatuses).some(
        status => status.status === 'approved'
      );

      if (hasAnyApproval) {
        setSuggestionErrors(prev => ({
          ...prev,
          [suggestionId]: 'Bu öneri başka bir öğretim üyesi tarafından onaylanmış olduğu için işlem yapamazsınız.'
        }));
        return;
      }

      const updatedInstructorStatuses = {
        ...instructorStatuses,
        [currentTeacherEmail]: {
          status: 'approved',
          updatedAt: new Date(),
          updatedBy: currentTeacherEmail
        }
      };

      await updateDoc(doc(db, 'project_suggestions', suggestionId), {
        instructorStatuses: updatedInstructorStatuses,
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: currentTeacherEmail
      });

      setSuccess('Proje önerisi başarıyla onaylandı.');
      fetchSuggestions();
    } catch (err) {
      console.error('Proje önerisi onaylanırken hata:', err);
      setSuggestionErrors(prev => ({
        ...prev,
        [suggestionId]: 'Proje önerisi onaylanırken bir hata oluştu.'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (suggestionId) => {
    if (!canApproveSuggestions) {
      setSuggestionErrors(prev => ({
        ...prev,
        [suggestionId]: deadlineMessage
      }));
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuggestionErrors(prev => ({ ...prev, [suggestionId]: '' }));

      const suggestionDoc = await getDoc(doc(db, 'project_suggestions', suggestionId));
      const suggestionData = suggestionDoc.data();

      const currentTeacherEmail = auth.currentUser.email;
      const instructorStatuses = suggestionData.instructorStatuses || {};

      const updatedInstructorStatuses = {
        ...instructorStatuses,
        [currentTeacherEmail]: {
          status: 'rejected',
          updatedAt: new Date(),
          updatedBy: currentTeacherEmail
        }
      };

      const allInstructors = suggestionData.instructorEmails || [];
      const allInstructorsRejected = allInstructors.every(email => 
        updatedInstructorStatuses[email]?.status === 'rejected'
      );

      const hasAnyApproval = Object.values(updatedInstructorStatuses).some(
        status => status.status === 'approved'
      );

      let newStatus = 'pending';
      if (hasAnyApproval) {
        newStatus = 'approved';
      } else if (allInstructorsRejected) {
        newStatus = 'rejected';
      }

      await updateDoc(doc(db, 'project_suggestions', suggestionId), {
        instructorStatuses: updatedInstructorStatuses,
        status: newStatus,
        ...(newStatus === 'rejected' && {
          rejectedAt: new Date(),
          rejectedBy: currentTeacherEmail
        })
      });

      setSuccess('Proje önerisi başarıyla reddedildi.');
      fetchSuggestions();
    } catch (err) {
      console.error('Proje önerisi reddedilirken hata:', err);
      setSuggestionErrors(prev => ({
        ...prev,
        [suggestionId]: 'Proje önerisi reddedilirken bir hata oluştu.'
      }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="container">
          <h2 className="section-title">Proje Önerileri</h2>
          <div className="loading-message">Öneriler yükleniyor...</div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="container">
        <h2 className="section-title">Proje Önerileri</h2>
        
        {!canApproveSuggestions && (
          <div className="deadline-warning">
            {deadlineMessage}
          </div>
        )}
        
        {canApproveSuggestions && (
          <div className="deadline-info">
            {deadlineMessage}
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        {suggestions.length === 0 ? (
          <div className="no-data-container">
            <div className="no-data-message">Henüz gönderilmiş proje önerisi bulunmamaktadır.</div>
          </div>
        ) : (
          <div className="suggestions-table">
            <table>
              <thead>
                <tr>
                  <th>PROJE KONUSU</th>
                  <th>GRUP BİLGİSİ</th>
                  <th>GRUP ÜYELERİ</th>
                  <th colSpan="2">İŞLEMLER</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map(suggestion => {
                  const currentTeacherEmail = auth.currentUser.email;
                  const instructorStatuses = suggestion.instructorStatuses || {};
                  const currentTeacherStatus = instructorStatuses[currentTeacherEmail]?.status;
                  const hasAnyApproval = Object.values(instructorStatuses).some(
                    status => status.status === 'approved'
                  );
                  const approvedByTeacher = Object.entries(instructorStatuses).find(
                    ([_, status]) => status.status === 'approved'
                  )?.[0];
                  const isCurrentTeacherApproved = approvedByTeacher === currentTeacherEmail;
                  const isDisabled = hasAnyApproval;

                  return (
                    <tr key={suggestion.id} className={`${currentTeacherStatus ? `status-${currentTeacherStatus}` : ''} ${hasAnyApproval ? 'approved-background' : ''}`}>
                      <td>
                        <div className="suggestion-content">{suggestion.content}</div>
                        <div className="suggestion-date">
                          Gönderim Tarihi: {suggestion.createdAt?.toDate().toLocaleString('tr-TR')}
                        </div>
                      </td>
                      <td>
                        <div>{suggestion.groupName || suggestion.groupId || "Bilinmiyor"}</div>
                      </td>
                      <td>
                        {suggestion.groupMembers && suggestion.groupMembers.map(member => (
                          <div key={member.uid || member.email || Math.random()}>
                            {member.displayName || extractNameFromEmail(member.email) || "Bilinmiyor"}
                          </div>
                        ))}
                      </td>
                      <td>
                        {!hasAnyApproval && currentTeacherStatus !== 'rejected' && (
                          <button 
                            className="approve-button"
                            onClick={() => handleApprove(suggestion.id)}
                            disabled={!canApproveSuggestions || isDisabled}
                          >
                            ONAYLA
                          </button>
                        )}
                        {currentTeacherStatus === 'approved' && (
                          <span className="status-text approved">ONAYLANDI</span>
                        )}
                        {hasAnyApproval && !isCurrentTeacherApproved && (
                          <div className="warning-message">
                            Bu öneri başka bir öğretim üyesi tarafından onaylanmış olduğu için işlem yapamazsınız.
                          </div>
                        )}
                      </td>
                      <td>
                        {!hasAnyApproval && currentTeacherStatus !== 'rejected' && (
                          <button 
                            className="reject-button"
                            onClick={() => handleReject(suggestion.id)}
                            disabled={!canApproveSuggestions || isDisabled}
                          >
                            REDDET
                          </button>
                        )}
                        {currentTeacherStatus === 'rejected' && (
                          <span className="status-text rejected">REDDEDİLDİ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default ProjectSuggestions; 