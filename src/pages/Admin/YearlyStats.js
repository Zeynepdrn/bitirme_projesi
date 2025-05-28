import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import '../../styles/YearlyStats.css';

const YearlyStats = () => {
  const [stats, setStats] = useState({});
  const [expandedYears, setExpandedYears] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const getAcademicYear = (date) => {
    const month = date.getMonth(); 
    const year = date.getFullYear();
    
    if (month < 8) { // 8 is September
      return `${year - 1}/${year}`;
    }
    return `${year}/${year + 1}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const collections = ['ogrenciler', 'groups', 'projects'];
      const statsData = {};

      for (const collectionName of collections) {
        const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const date = data.createdAt?.toDate();
          
          if (date) {
            const academicYear = getAcademicYear(date);
            if (!statsData[academicYear]) {
              statsData[academicYear] = {
                ogrenciler: [],
                groups: [],
                projects: [],
                approvedSuggestions: [],
                approvedPreferences: []
              };
            }
            statsData[academicYear][collectionName].push({ id: doc.id, ...data });
          }
        });
      }

      const suggestionsQuery = query(
        collection(db, 'project_suggestions'),
        where('status', '==', 'approved')
      );
      const suggestionsSnapshot = await getDocs(suggestionsQuery);
      
      suggestionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.createdAt?.toDate();
        
        if (date) {
          const academicYear = getAcademicYear(date);
          if (!statsData[academicYear]) {
            statsData[academicYear] = {
              ogrenciler: [],
              groups: [],
              projects: [],
              approvedSuggestions: [],
              approvedPreferences: []
            };
          }
          statsData[academicYear].approvedSuggestions.push({ id: doc.id, ...data });
        }
      });

      const preferencesQuery = query(
        collection(db, 'student_preferences'),
        where('status', '==', 'approved')
      );
      const autoAssignedQuery = query(
        collection(db, 'student_preferences'),
        where('autoAssignedAt', '!=', null)
      );
      
      const [preferencesSnapshot, autoAssignedSnapshot] = await Promise.all([
        getDocs(preferencesQuery),
        getDocs(autoAssignedQuery)
      ]);
      
      const allPreferences = new Map();
      
      preferencesSnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.submittedAt?.toDate();
        if (date) {
          const academicYear = getAcademicYear(date);
          if (!statsData[academicYear]) {
            statsData[academicYear] = {
              ogrenciler: [],
              groups: [],
              projects: [],
              approvedSuggestions: [],
              approvedPreferences: []
            };
          }
          allPreferences.set(doc.id, { id: doc.id, ...data });
        }
      });

      autoAssignedSnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.autoAssignedAt?.toDate();
        if (date && !allPreferences.has(doc.id)) {
          const academicYear = getAcademicYear(date);
          if (!statsData[academicYear]) {
            statsData[academicYear] = {
              ogrenciler: [],
              groups: [],
              projects: [],
              approvedSuggestions: [],
              approvedPreferences: []
            };
          }
          statsData[academicYear].approvedPreferences.push({ id: doc.id, ...data });
        }
      });

      allPreferences.forEach((data) => {
        const date = data.submittedAt?.toDate();
        if (date) {
          const academicYear = getAcademicYear(date);
          statsData[academicYear].approvedPreferences.push(data);
        }
      });

      setStats(statsData);
      const years = Object.keys(statsData).sort((a, b) => {
        const [aStart] = a.split('/');
        const [bStart] = b.split('/');
        return parseInt(bStart) - parseInt(aStart);
      });
      if (years.length > 0) {
        setExpandedYears({ [years[0]]: true });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleYear = (year) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const renderCollectionData = (data, collectionName) => {
    if (!data || data.length === 0) return <p>Veri bulunamadı</p>;

    switch (collectionName) {
      case 'ogrenciler':
        return (
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Email</th>
                <th>Öğrenci No</th>
                <th>Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  <td>{item.displayName}</td>
                  <td>{item.email}</td>
                  <td>{item.schoolNumber}</td>
                  <td>{item.createdAt?.toDate().toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'groups':
        return (
          <table>
            <thead>
              <tr>
                <th>Grup Kodu</th>
                <th>Üyeler</th>
                <th>Oluşturulma Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  <td>{item.groupCode}</td>
                  <td>
                    {item.members && item.members.length > 0 ? (
                      <ul className="member-list">
                        {item.members.map((member, index) => (
                          <li key={index}>{member.displayName || member.name}</li>
                        ))}
                      </ul>
                    ) : (
                      'Üye yok'
                    )}
                  </td>
                  <td>{item.createdAt?.toDate().toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'projects':
        return (
          <table>
            <thead>
              <tr>
                <th>Proje Adı</th>
                <th>Öğretim Üyesi</th>
                <th>Oluşturulma Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.instructorName}</td>
                  <td>{item.createdAt?.toDate().toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'approvedSuggestions':
        return (
          <table>
            <thead>
              <tr>
                <th>Grup</th>
                <th>Proje Önerisi</th>
                <th>Onaylayan Öğretim Üyesi</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  <td>{item.groupName}</td>
                  <td>{item.content}</td>
                  <td>{item.approvedByDisplayName || item.approvedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'approvedPreferences':
        return (
          <table>
            <thead>
              <tr>
                <th>Grup</th>
                <th>Proje Adı</th>
                <th>Atama Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  <td>{item.groupName}</td>
                  <td>{item.projectTitle}</td>
                  <td>{item.approvedAt?.toDate().toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <div className="yearly-stats">
      <h2>Yıllık İstatistikler</h2>
      {Object.keys(stats).sort((a, b) => {
        const [aStart] = a.split('/');
        const [bStart] = b.split('/');
        return parseInt(bStart) - parseInt(aStart);
      }).map(year => (
        <div key={year} className="year-section">
          <div className="year-header" onClick={() => toggleYear(year)}>
            <h3>{year} Dönemi</h3>
            {expandedYears[year] ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          
          {expandedYears[year] && (
            <div className="year-content">
              <div className="stats-section">
                <h4>Öğrenciler ({stats[year].ogrenciler.length})</h4>
                {renderCollectionData(stats[year].ogrenciler, 'ogrenciler')}
              </div>

              <div className="stats-section">
                <h4>Gruplar ({stats[year].groups.length})</h4>
                {renderCollectionData(stats[year].groups, 'groups')}
              </div>

              <div className="stats-section">
                <h4>Projeler ({stats[year].projects.length})</h4>
                {renderCollectionData(stats[year].projects, 'projects')}
              </div>

              <div className="stats-section">
                <h4>Onaylanan Proje Önerileri ({stats[year].approvedSuggestions.length})</h4>
                {renderCollectionData(stats[year].approvedSuggestions, 'approvedSuggestions')}
              </div>

              <div className="stats-section">
                <h4>Onaylanan/Atanan Projeler ({stats[year].approvedPreferences.length})</h4>
                {renderCollectionData(stats[year].approvedPreferences, 'approvedPreferences')}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default YearlyStats;  