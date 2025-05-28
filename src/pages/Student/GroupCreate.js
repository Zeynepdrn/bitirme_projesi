import { collection, addDoc, getDocs, query, where, getDoc, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import StudentLayout from '../../components/StudentComponents/StudentLayout';
import '../../styles/CreateGroup.css';
import { useState, useEffect } from 'react';

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

const GroupCreate = () => {
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedGroupId, setGeneratedGroupId] = useState('');
  const [canCreateGroup, setCanCreateGroup] = useState(true);
  const [deadlineMessage, setDeadlineMessage] = useState('');
  const [userHasGroup, setUserHasGroup] = useState(false);
  const [userGroupInfo, setUserGroupInfo] = useState(null);
  const [memberNumbers, setMemberNumbers] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await checkDeadline();
        await checkUserGroupStatus();
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Sayfa yüklenirken bir hata oluştu.');
      } finally {
        setIsInitialized(true);
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  useEffect(() => {
    const fetchStudentNumbers = async () => {
      if (userGroupInfo && userGroupInfo.members) {
        const numbers = {};
        for (const member of userGroupInfo.members) {
          try {
            const docSnap = await getDoc(doc(db, 'ogrenciler', member.email));
            if (docSnap.exists()) {
              const data = docSnap.data();
              numbers[member.email] = data.schoolNumber || '-';
            } else {
              numbers[member.email] = '-';
            }
          } catch (err) {
            console.error('Error fetching student number:', err);
            numbers[member.email] = '-';
          }
        }
        setMemberNumbers(numbers);
      }
    };
    fetchStudentNumbers();
  }, [userGroupInfo]);

  const autoGroupStudents = async () => {
    try {
      console.log('Otomatik gruplandırma başlatılıyor...');
      const processDatesRef = doc(db, 'process_dates', 'grup_olusturma');
      
      const autoGroupingDoc = await getDoc(processDatesRef);
      if (autoGroupingDoc.exists() && autoGroupingDoc.data().autoGroupingDone) {
        console.log('Otomatik gruplandırma zaten yapılmış.');
        return true;
      }

      await runTransaction(db, async (transaction) => {
        console.log('Transaction başlatıldı...');
        
        const processDatesDoc = await transaction.get(processDatesRef);
        if (processDatesDoc.exists() && processDatesDoc.data().autoGroupingDone) {
          console.log('Otomatik gruplandırma zaten yapılmış (transaction içinde).');
          return;
        }

        const studentsRef = collection(db, 'ogrenciler');
        const studentsSnapshot = await getDocs(studentsRef);
        console.log('Toplam öğrenci sayısı:', studentsSnapshot.size);
        
        const groupsRef = collection(db, 'groups');
        const groupsSnapshot = await getDocs(groupsRef);
        console.log('Toplam grup sayısı:', groupsSnapshot.size);
        
        const studentsMap = new Map();
        const groupsMap = new Map();
        
        studentsSnapshot.forEach(doc => {
          const studentData = doc.data();
          studentsMap.set(doc.id, {
            id: doc.id,
            ...studentData,
            isGrouped: !!studentData.groupId
          });
        });
        
        groupsSnapshot.forEach(doc => {
          const groupData = doc.data();
          groupsMap.set(doc.id, {
            id: doc.id,
            ...groupData,
            memberCount: groupData.members ? groupData.members.length : 0
          });
        });

        const allSingleStudents = [];
        
        studentsMap.forEach(student => {
          if (!student.isGrouped) {
            allSingleStudents.push(student);
          }
        });
        console.log('Grupsuz öğrenci sayısı:', allSingleStudents.length);
        
        let singleMemberGroups = 0;
        groupsMap.forEach(group => {
          if (group.memberCount === 1) {
            singleMemberGroups++;
            const singleMember = group.members[0];
            const student = studentsMap.get(singleMember.uid);
            if (student) {
              allSingleStudents.push(student);
            }
            transaction.delete(doc(db, 'groups', group.id));
          }
        });
        console.log('Tek kişilik grup sayısı:', singleMemberGroups);
        console.log('Toplam işlenecek öğrenci sayısı:', allSingleStudents.length);

        const createGroup = (students) => {
          const members = students.map((student, index) => ({
            uid: student.id,
            email: student.email,
            displayName: student.displayName || student.email,
            isLeader: index === 0
          }));

          const groupRef = doc(collection(db, 'groups'));
          transaction.set(groupRef, {
            createdBy: 'system',
            createdAt: new Date(),
            groupCode: `Group${Math.floor(10000 + Math.random() * 90000)}`,
            members: members,
            isLeader: members[0].email
          });

          for (const member of members) {
            const studentRef = doc(db, 'ogrenciler', member.uid);
            transaction.update(studentRef, {
              groupId: groupRef.id,
              isGroupLeader: member.isLeader
            });
          }
        };

        while (allSingleStudents.length > 0) {
          const remainingCount = allSingleStudents.length;
          console.log('Kalan öğrenci sayısı:', remainingCount);
          
          if (remainingCount === 5) {
            console.log('5 öğrenci için 2\'li ve 3\'lü grup oluşturuluyor...');
            createGroup(allSingleStudents.splice(0, 2));
            createGroup(allSingleStudents.splice(0, 3));
          } else if (remainingCount >= 4) {
            console.log('4 veya daha fazla öğrenci için 4\'lü grup oluşturuluyor...');
            createGroup(allSingleStudents.splice(0, 4));
          } else if (remainingCount === 3) {
            console.log('3 öğrenci için 3\'lü grup oluşturuluyor...');
            createGroup(allSingleStudents.splice(0, 3));
          } else if (remainingCount === 2) {
            console.log('2 öğrenci için 2\'li grup oluşturuluyor...');
            createGroup(allSingleStudents.splice(0, 2));
          } else if (remainingCount === 1) {
            console.log('Tek öğrenci için mevcut gruplar kontrol ediliyor...');
            let addedToExistingGroup = false;
            
            for (const [groupId, group] of groupsMap.entries()) {
              if (group.memberCount === 2) {
                console.log('2 kişilik gruba ekleniyor...');
                const student = allSingleStudents.shift();
                const updatedMembers = [...group.members, {
                  uid: student.id,
                  email: student.email,
                  displayName: student.displayName || student.email,
                  isLeader: false
                }];

                transaction.update(doc(db, 'groups', groupId), {
                  members: updatedMembers
                });

                transaction.update(doc(db, 'ogrenciler', student.id), {
                  groupId: groupId,
                  isGroupLeader: false
                });
                
                addedToExistingGroup = true;
                break;
              }
            }
            
            if (!addedToExistingGroup) {
              for (const [groupId, group] of groupsMap.entries()) {
                if (group.memberCount === 3) {
                  console.log('3 kişilik gruba ekleniyor...');
                  const student = allSingleStudents.shift();
                  const updatedMembers = [...group.members, {
                    uid: student.id,
                    email: student.email,
                    displayName: student.displayName || student.email,
                    isLeader: false
                  }];

                  transaction.update(doc(db, 'groups', groupId), {
                    members: updatedMembers
                  });

                  transaction.update(doc(db, 'ogrenciler', student.id), {
                    groupId: groupId,
                    isGroupLeader: false
                  });
                  
                  addedToExistingGroup = true;
                  break;
                }
              }
            }
            
            if (!addedToExistingGroup) {
              console.log('Yeni grup oluşturuluyor...');
              createGroup([allSingleStudents.shift()]);
            }
          }
        }
        
        transaction.update(processDatesRef, {
          autoGroupingDone: true,
          autoGroupingDate: new Date()
        });
        console.log('Otomatik gruplandırma tamamlandı.');
      });
      
      return true;
    } catch (err) {
      console.error('Otomatik gruplandırma sırasında hata:', err);
      return false;
    }
  };

  const checkDeadline = async () => {
    try {
      const groupDeadlineDoc = await getDoc(doc(db, 'process_dates', 'grup_olusturma'));
      if (groupDeadlineDoc.exists()) {
        const deadlineData = groupDeadlineDoc.data();
        const startDate = deadlineData.startDate.toDate();
        const endDate = deadlineData.endDate.toDate();
        const currentDate = new Date();

        if (currentDate < startDate) {
          setCanCreateGroup(false);
          const formattedDate = startDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihinden önce grup oluşturamazsınız.`);
        } else if (currentDate > endDate) {
          setCanCreateGroup(false);
          const autoGroupingResult = await autoGroupStudents();
          if (autoGroupingResult) {
            console.log('Otomatik gruplandırma başarıyla tamamlandı.');
          } else {
            console.log('Otomatik gruplandırma sırasında bir hata oluştu.');
          }
          setDeadlineMessage('Grup oluşturma süresi doldu.');
        } else {
          setCanCreateGroup(true);
          const formattedDate = endDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          setDeadlineMessage(`${formattedDate} tarihine kadar grup oluşturabilirsiniz. Bu tarihten sonra sistem tarafından otomatik olarak gruplandırılacaksınız.`);
        }
      } else {
        setCanCreateGroup(false);
        setDeadlineMessage('Grup oluşturma tarihleri belirlenmemiş.');
      }
    } catch (err) {
      console.error('Tarih kontrolü sırasında hata:', err);
      setCanCreateGroup(false);
      setDeadlineMessage('Tarih kontrolü sırasında bir hata oluştu.');
    }
  };

  const generateRandomId = () => {
    return "Group" + Math.floor(10000 + Math.random() * 90000).toString();
  };

  const checkUserGroupStatus = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      
      const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
      if (userDoc.exists() && userDoc.data().groupId) {
        const groupId = userDoc.data().groupId;
        setUserHasGroup(true);
        
        try {
          const groupDoc = await getDoc(doc(db, 'groups', groupId));
          if (groupDoc.exists()) {
            setUserGroupInfo({
              id: groupDoc.id,
              ...groupDoc.data()
            });
          }
        } catch (err) {
          console.error('Error fetching group info:', err);
        }
      }
    } catch (err) {
      console.error('Error checking user group status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!canCreateGroup) {
      setError(deadlineMessage);
      return;
    }

    if (userHasGroup) {
      setError('Zaten bir gruba aitsiniz. Başka bir grup oluşturamazsınız.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const user = auth.currentUser;
      const randomGroupId = generateRandomId(); 
      
      const groupRef = await addDoc(collection(db, 'groups'), {
        createdBy: user.email,
        createdAt: new Date(),
        groupCode: randomGroupId, 
        members: [{
          uid: user.email,
          displayName: user.displayName || user.email,
          email: user.email,
          isLeader: false 
        }]
      });
      
      await updateDoc(doc(db, 'ogrenciler', user.email), {
        groupId: groupRef.id,
        isGroupLeader: false
      });

      setGeneratedGroupId(randomGroupId);
      setSuccess(`Grup başarıyla oluşturuldu! Grup kodunuz: ${randomGroupId}. Lider olmak için "Lider Ol" butonuna tıklayın.`);
      
      setUserHasGroup(true);
      setUserGroupInfo({
        id: groupRef.id,
        createdBy: user.email,
        groupCode: randomGroupId,
        members: [{
          uid: user.email,
          displayName: user.displayName || user.email,
          email: user.email,
          isLeader: false
        }]
      });
      
    } catch (err) {
      console.error('Grup oluşturulurken hata:', err);
      setError('Grup oluşturulurken bir hata oluştu. Lütfen tekrar deneyin. ' + err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    
    if (!canCreateGroup) {
      setError(deadlineMessage);
      return;
    }

    if (userHasGroup) {
      setError('Zaten bir gruba aitsiniz. Başka bir gruba katılamazsınız.');
      return;
    }

    if (!groupId.trim()) {
      setError('Lütfen bir grup kodu girin.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const user = auth.currentUser;
      
      const q = query(collection(db, 'groups'), where('groupCode', '==', groupId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('Bu kod ile bir grup bulunamadı.');
        setLoading(false);
        return;
      }
      
      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data();
      
      if (groupData.members && groupData.members.length >= 4) {
        setError('Bu grup maximum kapasiteye ulaşmıştır.');
        setLoading(false);
        return;
      }
      
      const isAlreadyMember = groupData.members && groupData.members.some(member => member.uid === user.email);
      if (isAlreadyMember) {
        setError('Zaten bu grubun üyesisiniz.');
        setLoading(false);
        return;
      }
      
      const updatedMembers = groupData.members ? [...groupData.members] : [];
      updatedMembers.push({
        uid: user.email,
        displayName: user.displayName || user.email,
        email: user.email,
        isLeader: false 
      });
      
      await updateDoc(doc(db, 'groups', groupDoc.id), {
        members: updatedMembers
      });
      
      await updateDoc(doc(db, 'ogrenciler', user.email), {
        groupId: groupDoc.id,
        isGroupLeader: false
      });
      
      setSuccess('Gruba başarıyla katıldınız!');
      
      setUserHasGroup(true);
      setUserGroupInfo({
        id: groupDoc.id,
        ...groupData,
        members: updatedMembers
      });
      
    } catch (err) {
      console.error('Gruba katılırken hata:', err);
      setError('Gruba katılırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  console.log(canCreateGroup);
  console.log(deadlineMessage);

  if (loading || !isInitialized) {
    return (
      <StudentLayout>
        <div className="container">
          <div className="section-container">
            <div className="section-title">Grup Oluştur</div>
            <div className="loading-message">Yükleniyor...</div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="container">
        <h2 className="section-title">Grup Oluştur</h2>
        
        {!canCreateGroup && deadlineMessage && (
          <div className="deadline-warning">
            {deadlineMessage}
          </div>
        )}
        
        {!userHasGroup && canCreateGroup && (
          <div className="deadline-info">
            {deadlineMessage}
          </div>
        )}
        
        {userHasGroup ? (
          <div className="card">
            <h3>Mevcut Grubunuzun Bilgileri:</h3>
            <div className="group-info">
              
              {userGroupInfo && (
                <div className="group-details">
                  <div className="group-id-display">
                    <span className="label">Grup Kodu:</span>
                    <span className="value">{userGroupInfo.groupCode}</span>
                  </div>
                  
                  <div className="group-members">
                    <h3>Grup Üyeleri:</h3>
                    <table className="members-table">
                      <thead>
                        <tr>
                          <th>Adı Soyadı</th>
                          <th>E-posta</th>
                          <th>Numara</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userGroupInfo.members && userGroupInfo.members.map((member, index) => (
                          <tr key={index} className={member.isLeader ? 'leader' : ''}>
                            <td>{member.displayName || extractNameFromEmail(member.email) || "Bilinmiyor"}</td>
                            <td>{member.email}</td>
                            <td>{memberNumbers[member.email] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <p className="note">
                    Grup kodunuzu arkadaşlarınızla paylaşarak onları gruba davet edebilirsiniz.
                  </p>
                </div>
              )}
              
              <p className="info-text">
                Grup bilgilerinize "Grubum" sayfasından da erişebilirsiniz.
              </p>
            </div>
          </div>
        ) : (
          <div className="card-container">
            <div className="card">
              <div className="section-title">Yeni Grup Oluştur</div>
              <p>Yeni grup oluşturmak için aşağıdaki butona tıklayınız.</p>
              
              <button 
                className="black-button"
                onClick={handleCreateGroup}
                disabled={loading || !canCreateGroup}
              >
                GRUP KODU OLUŞTUR
              </button>
              
              {generatedGroupId && (
                <div className="generated-id">
                  Oluşturulan Grup Kodu: <strong>{generatedGroupId}</strong>
                </div>
              )}
            </div>
            
            <div className="card">
              <div className="section-title">Var Olan Gruba Katıl</div>
              <p>Katılmak istediğiniz grubun kodunu giriniz.</p>
              
              <form onSubmit={handleJoinGroup}>
                <div className="form-group">
                  <input
                    type="text"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    placeholder="Grup Kodu *"
                    disabled={loading || !canCreateGroup}
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="black-button"
                  disabled={loading || !canCreateGroup}
                >
                  GRUBA KATIL
                </button>
              </form>
            </div>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    </StudentLayout>
  );
};

export default GroupCreate;