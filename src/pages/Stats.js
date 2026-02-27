import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { ref, onValue, off } from "firebase/database";

const Stats = ({ user }) => {
  const [sessions, setSessions] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const sessionsRef = ref(db, 'sessions');
    const studentsRef = ref(db, 'students');
    const attendanceRef = ref(db, 'attendance');

    // 1. Récupérer les sessions filtrées par les cours du prof
    onValue(sessionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val());
        // On ne prend que les sessions des cours assignés à ce prof
        const filtered = data.filter(s => user?.assignedCourses?.includes(s.course));
        setSessions(filtered);
      } else {
        setSessions([]);
      }
    });

    // 2. Récupérer tous les étudiants (pour calculer qui est absent)
    onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        // On transforme l'objet en tableau en gardant l'ID (clé firebase)
        const data = Object.entries(snapshot.val()).map(([id, info]) => ({
          id,
          ...info
        }));
        setAllStudents(data);
      } else {
        setAllStudents([]);
      }
    });

    // 3. Récupérer les données de présence
    onValue(attendanceRef, (snapshot) => {
      setAttendanceData(snapshot.val() || {});
      setLoading(false);
    });

    return () => { off(sessionsRef); off(studentsRef); off(attendanceRef); };
  }, [user]);

  const calculateStats = () => {
    const totalSessions = sessions.length;

    return allStudents.map(student => {
      let presentCount = 0;

      sessions.forEach(session => {
        // NOUVELLE LOGIQUE : On vérifie si l'ID de l'étudiant existe 
    
        const sessionAttendance = attendanceData[session.date]?.[session.id] || {};
        
        // On vérifie par ID (plus fiable) ou par Nom si l'ID n'est pas trouvé
        if (sessionAttendance[student.id]) {
          presentCount++;
        }
      });

      const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
      
      return { 
        ...student, 
        presentCount, 
        totalSessions, 
        percentage 
      };
    })
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.percentage - a.percentage);
  };

  const finalStats = calculateStats();

  const getStatusColor = (pct) => {
    if (pct >= 80) return { bg: '#DCFCE7', text: '#166534', bar: '#22C55E' };
    if (pct >= 50) return { bg: '#FEF3C7', text: '#92400E', bar: '#F59E0B' };
    return { bg: '#FEE2E2', text: '#991B1B', bar: '#EF4444' };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Statistiques d'Assiduité</h2>
          <p style={styles.subtitle}>{sessions.length} séances enregistrées pour vos cours</p>
        </div>
        <input 
          type="text" 
          placeholder="Rechercher un étudiant..." 
          style={styles.searchInput}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nom de l'étudiant</th>
              <th style={styles.th}>Score (Présences)</th>
              <th style={styles.th}>Progression</th>
              <th style={styles.th}>Taux</th>
              <th style={styles.th}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={styles.loader}>Chargement des statistiques...</td></tr>
            ) : finalStats.length === 0 ? (
              <tr><td colSpan="5" style={styles.loader}>Aucun étudiant trouvé.</td></tr>
            ) : (
              finalStats.map((student, index) => {
                const colors = getStatusColor(student.percentage);
                return (
                  <tr key={index} style={styles.tr}>
                    <td style={styles.tdName}>
                      <div style={styles.avatar}>{student.name.charAt(0)}</div>
                      <div>
                        <div style={{fontWeight: '600'}}>{student.name}</div>
                        <div style={{fontSize: '11px', color: '#64748B'}}>{student.option || 'N/A'}</div>
                      </div>
                    </td>
                    <td style={styles.td}>{student.presentCount} / {student.totalSessions}</td>
                    <td style={styles.td}>
                      <div style={styles.barBg}>
                        <div style={{...styles.barFill, width: `${student.percentage}%`, backgroundColor: colors.bar}} />
                      </div>
                    </td>
                    <td style={{...styles.td, fontWeight: '700'}}>{student.percentage}%</td>
                    <td style={styles.td}>
                      <span style={{...styles.badge, backgroundColor: colors.bg, color: colors.text}}>
                        {student.percentage >= 75 ? 'Régulier' : student.percentage >= 50 ? 'Moyen' : 'Critique'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', maxWidth: '1100px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontSize: '24px', color: '#1E293B', fontWeight: '700', margin: 0 },
  subtitle: { color: '#64748B', fontSize: '14px', marginTop: '4px' },
  searchInput: { padding: '10px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', width: '250px', outline: 'none', fontSize: '14px' },
  tableWrapper: { background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px', background: '#F8FAFC', color: '#64748B', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0' },
  tr: { borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#334155' },
  tdName: { padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#1E293B' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '12px', fontWeight: 'bold', border: '1px solid #E2E8F0' },
  barBg: { width: '100px', height: '6px', background: '#F1F5F9', borderRadius: '10px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '10px', transition: 'width 0.5s ease' },
  badge: { padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' },
  loader: { textAlign: 'center', padding: '40px', color: '#64748B' }
};

export default Stats;