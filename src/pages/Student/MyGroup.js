import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import StudentLayout from '../../components/StudentComponents/StudentLayout';
import '../../styles/MyGroup.css';
import { FaFlag, FaCrown, FaSignOutAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const MyGroup = () => {
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [leaderStatus, setLeaderStatus] = useState(null);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const user = auth.currentUser;
        setCurrentUser(user);
        
        if (!user) {
          setError('Kullanıcı bilgisi alınamadı.');
          setLoading(false);
          return;
        }
        
        const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
        
        if (!userDoc.exists() || !userDoc.data().groupId) {
          setError('Henüz bir gruba dahil değilsiniz.');
          setLoading(false);
          return;
        }
        
        const userGroupId = userDoc.data().groupId;
        
        const groupDoc = await getDoc(doc(db, 'groups', userGroupId));
        
        if (!groupDoc.exists()) {
          setError('Grup bilgisi bulunamadı.');
          setLoading(false);
          return;
        }
        
        const group = {
          id: groupDoc.id,
          ...groupDoc.data()
        };
        
        if (group.isLeader === user.email) {
          setLeaderStatus('leader');
        } else {
          setLeaderStatus('member');
        }
        
        setGroupData(group);
      } catch (err) {
        console.error('Grup bilgisi alınırken hata:', err);
        setError('Grup bilgisi alınırken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroupData();
  }, []);
  
  const handleBecomeLeader = async () => {
    if (!groupData || !currentUser) return;
    
    try {
      setLoading(true);
      
      if (groupData.isLeader) {
        await updateDoc(doc(db, 'ogrenciler', groupData.isLeader), {
          isGroupLeader: false
        });
      }

      await updateDoc(doc(db, 'groups', groupData.id), {
        isLeader: currentUser.email
      });

      await updateDoc(doc(db, 'ogrenciler', currentUser.email), {
        isGroupLeader: true
      });
      
      setLeaderStatus('leader');
      setSuccess('Artık takım liderisiniz!');
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
      setGroupData(prev => ({
        ...prev,
        isLeader: currentUser.email
      }));
      
    } catch (err) {
      console.error('Takım lideri olurken hata:', err);
      setError('Takım lideri olurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupData || !currentUser) return;
    
    try {
      setLoading(true);
      
      const updatedMembers = groupData.members.filter(
        member => member.email !== currentUser.email
      );
      
      const updatedGroupData = {
        members: updatedMembers
      };
      
      if (groupData.isLeader === currentUser.email) {
        updatedGroupData.isLeader = null;
      }
      
      await updateDoc(doc(db, 'groups', groupData.id), updatedGroupData);
      
      await updateDoc(doc(db, 'ogrenciler', currentUser.email), {
        groupId: null,
        isGroupLeader: false
      });
      
      setSuccess('Gruptan başarıyla ayrıldınız.');
      
      setTimeout(() => {
        navigate('/create-group');
      }, 2000);
      
    } catch (err) {
      console.error('Gruptan ayrılırken hata:', err);
      setError('Gruptan ayrılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="my-group-container">
          <div className="loading-message">Yükleniyor...</div>
        </div>
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="my-group-container">
          <div className="error-message">{error}</div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="container">
        <div className="group-section">
          <div className="section-title">Grup Üyeleri</div>
          
          {success && <div className="success-message">{success}</div>}
          
          <div className="members-table-container">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Adı Soyadı</th>
                  <th>E-posta</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {groupData.members.map((member, index) => (
                  <tr key={index} className={groupData.isLeader === member.email ? 'leader-row' : ''}>
                    <td>{member.displayName || extractNameFromEmail(member.email) || "Bilinmiyor"}</td>
                    <td>{member.email}</td>
                    <td className="status-cell">
                      {currentUser && currentUser.email === member.email && (
                        <span className="you-badge">Siz</span>
                      )}
                      {groupData.isLeader === member.email && (
                        <span className="leader-badge" title="Takım Lideri">
                          <FaCrown className="leader-icon" />
                        </span>
                      )}
                    </td>
                    <td>
                      {currentUser && currentUser.email === member.email && (
                        <div className="action-buttons">
                          {groupData.isLeader !== member.email && (
                            <button 
                              className="leader-button"
                              onClick={handleBecomeLeader}
                              disabled={loading}
                              title="Takım lideri olmak için tıklayın"
                            >
                              <FaFlag className="button-icon" /> TAKIM LİDERİ OL
                            </button>
                          )}
                          <button 
                            className="leave-button"
                            onClick={handleLeaveGroup}
                            disabled={loading}
                            title="Gruptan ayrılmak için tıklayın"
                          >
                            <FaSignOutAlt className="button-icon" /> GRUPTAN AYRIL
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="group-info">
            <h3>Grup Bilgileri</h3>
            <p><strong>Grup Kodu:</strong> {groupData.groupCode || groupData.id}</p>
            {groupData.name && <p><strong>Grup Adı:</strong> {groupData.name}</p>}
            {groupData.createdAt && <p><strong>Oluşturulma Tarihi:</strong> {groupData.createdAt.toDate().toLocaleDateString()}</p>}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
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

export default MyGroup;  