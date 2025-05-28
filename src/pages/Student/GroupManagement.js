const handleCreateGroup = async () => {
  try {
    setError('');
    const user = auth.currentUser;
    if (!user) {
      setError('Kullanıcı bilgisi alınamadı.');
      return;
    }

    if (!groupName.trim()) {
      setError('Grup adı boş olamaz.');
      return;
    }

    const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
    if (userDoc.exists() && userDoc.data().groupId) {
      setError('Zaten bir gruba üyesiniz.');
      return;
    }

    const groupRef = await addDoc(collection(db, 'groups'), {
      name: groupName.trim(),
      members: [user.email],
      leader: null,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'ogrenciler', user.email), {
      groupId: groupRef.id,
      isGroupLeader: false
    });

    setSuccess('Grup başarıyla oluşturuldu! Lider olmak için "Lider Ol" butonuna tıklayın.');
    setGroupName('');
  } catch (err) {
    console.error('Grup oluşturulurken hata:', err);
    setError('Grup oluşturulurken bir hata oluştu.');
  }
};

const handleJoinGroup = async (groupId) => {
  try {
    setError('');
    const user = auth.currentUser;
    if (!user) {
      setError('Kullanıcı bilgisi alınamadı.');
      return;
    }

    const userDoc = await getDoc(doc(db, 'ogrenciler', user.email));
    if (userDoc.exists() && userDoc.data().groupId) {
      setError('Zaten bir gruba üyesiniz.');
      return;
    }

    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) {
      setError('Grup bulunamadı.');
      return;
    }

    const groupData = groupDoc.data();
    
    if (groupData.members.length >= 4) {
      setError('Bu grup maksimum üye sayısına ulaşmıştır (4 kişi).');
      return;
    }

    await updateDoc(doc(db, 'groups', groupId), {
      members: arrayUnion(user.email)
    });

    await updateDoc(doc(db, 'ogrenciler', user.email), {
      groupId: groupId
    });

    setSuccess('Gruba başarıyla katıldınız!');
  } catch (err) {
    console.error('Gruba katılırken hata:', err);
    setError('Gruba katılırken bir hata oluştu.');
  }
};

const handleBecomeLeader = async () => {
  try {
    setError('');
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
      setError('Grup bulunamadı.');
      return;
    }

    const groupData = groupDoc.data();
    
    if (groupData.leader) {
      setError('Bu grubun zaten bir lideri var.');
      return;
    }

    await updateDoc(doc(db, 'groups', groupId), {
      leader: user.email
    });

    await updateDoc(doc(db, 'ogrenciler', user.email), {
      isGroupLeader: true
    });

    setSuccess('Grubun lideri oldunuz!');
  } catch (err) {
    console.error('Lider olurken hata:', err);
    setError('Lider olurken bir hata oluştu.');
  }
};  