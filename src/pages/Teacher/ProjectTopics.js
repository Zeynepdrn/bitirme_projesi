import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TeacherLayout from '../../components/TeacherComponents/TeacherLayout';
import '../../styles/ProjectTopics.css';
import { auth } from '../../firebase/config';

const extractNameFromEmail = (email) => {
  if (!email) return "Bilinmiyor";
  
  try {
    const namePart = email.split('@')[0];
    if (!namePart) return "Bilinmiyor";
    
    const nameWithSpaces = namePart.replace(/\./g, ' ');
    
    return nameWithSpaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (e) {
    return "Bilinmiyor";
  }
};

const ProjectTopics = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    groupCount: 1
  });
  const [showForm, setShowForm] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const updateInstructorNames = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const projectsSnapshot = await getDocs(projectsRef);
      
      for (const doc of projectsSnapshot.docs) {
        const projectData = doc.data();
        if (projectData.instructorEmail) {
          const teacherDoc = await getDoc(doc(db, 'ogretmenler', projectData.instructorEmail));
          if (teacherDoc.exists()) {
            const instructorName = teacherDoc.data().displayName;
            if (instructorName !== projectData.instructorName) {
              await updateDoc(doc.ref, {
                instructorName: instructorName
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Öğretim üyesi isimleri güncellenirken hata:', err);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await updateInstructorNames(); 
        await fetchProjects(); 
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

  const fetchProjects = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const projectsSnapshot = await getDocs(projectsRef);
      
      if (projectsSnapshot.empty) {
        setProjects([]);
      } else {
        const projectsData = [];
        for (const doc of projectsSnapshot.docs) {
          const projectData = doc.data();
          projectsData.push({
            id: doc.id,
            ...projectData
          });
        }
        
        setProjects(projectsData);
      }
    } catch (err) {
      console.error('Projeler getirilirken hata:', err);
      setError('Proje konuları yüklenirken bir hata oluştu.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProject({
      ...newProject,
      [name]: name === 'groupCount' ? parseInt(value, 10) || 1 : value
    });
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    
    if (!newProject.title.trim() || !newProject.description.trim()) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    
    try {
      setLoading(true);
      
      const user = auth.currentUser;
      const instructorName = user.displayName || "Öğretim Üyesi";
      
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        instructorId: user.email,
        instructorName: instructorName,
        createdAt: new Date()
      });
      
      setNewProject({
        title: '',
        description: '',
        groupCount: 1
      });
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      console.error('Proje eklenirken hata:', err);
      setError('Proje eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isInitialized) {
    return (
      <TeacherLayout>
        <div className="container">
          <h2 className="section-title">Proje Konuları</h2>
          <div className="loading-message">Projeler yükleniyor...</div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="container">
        <h2 className="section-title">Proje Konuları</h2>
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
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      {project.instructorName && project.instructorName !== project.instructorEmail ? 
                        project.instructorName : 
                        extractNameFromEmail(project.instructorEmail)}
                    </td>
                    <td>{project.title}</td>
                    <td>{project.description}</td>
                    <td>{project.groupCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default ProjectTopics;  