import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { ref, onValue, set, push, serverTimestamp, off, get } from "firebase/database";

const Dashboard = ({ user, setCurrentPage }) => {
  const currentUser = user || { name: "Utilisateur", role: "Personnel", assignedCourses: ["Génie Logiciel", "Réseaux", "Cyber-Sécurité"] };
  const [session, setSession] = useState({ active: false, course: "", id: null, sessionName: "", date: "" });
  const [lastScans, setLastScans] = useState([]);

  useEffect(() => {
    const activeSessionRef = ref(db, 'activeSession');
    onValue(activeSessionRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.active) {
        setSession(data);
      } else {
        setSession({ active: false, course: "", id: null, sessionName: "", date: "" });
        setLastScans([]);
      }
    });
    return () => off(activeSessionRef);
  }, []);

  useEffect(() => {
    if (session.active && session.id && session.date) {
      const attendanceRef = ref(db, `attendance/${session.date}/${session.id}`);
      
      onValue(attendanceRef, async (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const fullDataList = await Promise.all(
            Object.keys(data).map(async (key) => {
              const scan = data[key];
              const studentRef = ref(db, `students/${key}`);
              const studentSnap = await get(studentRef);
              const studentDetails = studentSnap.val();

              return {
                ...scan,
                id: key,
                option: studentDetails?.option || "Étudiant"
              };
            })
          );

          const sorted = fullDataList
            .sort((a, b) => b.time.localeCompare(a.time))
            .slice(0, 5); 

          setLastScans(sorted);
        } else {
          setLastScans([]);
        }
      });
      return () => off(attendanceRef);
    }
  }, [session.active, session.id, session.date]);

  const startSession = async (e) => {
    e.preventDefault();
    const today = new Date().toLocaleDateString('en-CA');
    const selectedCourse = currentUser.assignedCourses?.length === 1 
      ? currentUser.assignedCourses[0] : e.target.course.value;
    const customSessionName = e.target.sessionName.value || "Séance Standard";

    if (!selectedCourse) return alert("Sélectionnez un cours.");

    const sessionKey = push(ref(db, 'sessions')).key; 
    
    const sessionData = {
      active: true,
      course: selectedCourse,
      sessionName: customSessionName,
      id: sessionKey,
      openedBy: currentUser.name,
      startTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: today,
      timestamp: serverTimestamp()
    };

    try {
      await Promise.all([
        set(ref(db, 'activeSession'), sessionData),
        set(ref(db, 'config/mode'), 0),
        set(ref(db, 'config/activeSessionID'), sessionKey),
        set(ref(db, 'config/activeSession'), selectedCourse),
        set(ref(db, `sessions/${sessionKey}`), sessionData)
      ]);
    } catch (error) {
      alert("Erreur lors du lancement : " + error.message);
    }
  };

  const stopSession = async () => {
    if (window.confirm("Voulez-vous vraiment fermer cette séance ?")) {
      try {
        await Promise.all([
          set(ref(db, 'activeSession'), null),
          set(ref(db, 'config/mode'), 1),
          set(ref(db, 'config/activeSessionID'), ""),
          set(ref(db, 'config/activeSession'), "")
        ]);
        setSession({ active: false });
        setLastScans([]);
      } catch (error) {
        alert("Erreur lors de la fermeture : " + error.message);
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.topInfo}>
        <div style={styles.userBadge}>
          <span style={styles.roleLabel}>{currentUser.role} :</span>
          <span style={styles.userName}>{currentUser.name}</span>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, borderTop: session.active ? '4px solid #10B981' : '4px solid #94A3B8'}}>
          <span style={styles.statLabel}>STATUT SYSTÈME</span>
          <h2 style={{color: session.active ? '#10B981' : '#64748B', margin: '5px 0', fontSize: '18px'}}>
            {session.active ? "● EN COURS" : "○ HORS LIGNE"}
          </h2>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>SÉANCE ACTUELLE</span>
          <p style={{fontWeight: '800', margin: '5px 0', color: '#1A365D', fontSize: '14px'}}>
            {session.active ? session.sessionName : "Aucune"}
          </p>
        </div>
      </div>

      {!session.active ? (
        <div style={styles.mainCard}>
          <h3 style={{color: '#1A365D', marginBottom: '25px', textAlign: 'center'}}>Démarrer un appel</h3>
          <form onSubmit={startSession}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom de la séance</label>
              <input name="sessionName" type="text" placeholder="Ex: TP Groupe A..." style={styles.input} required />
            </div>

            <div style={styles.formGroup}>
              {currentUser.assignedCourses?.length === 1 ? (
                <div style={styles.singleCourseBox}>
                  <label style={styles.label}>Cours concerné</label>
                  <div style={styles.courseNameHighlight}>{currentUser.assignedCourses[0]}</div>
                </div>
              ) : (
                <>
                  <label style={styles.label}>Sélectionner le cours</label>
                  <select name="course" style={styles.input} required>
                    <option value="">-- Choisir --</option>
                    {currentUser.assignedCourses?.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <button type="submit" style={styles.btnCreate}>LANCER LA SESSION</button>
          </form>
        </div>
      ) : (
        <div style={styles.mainCard}>
          <div style={styles.sessionHeader}>
            <div>
              <h3 style={{margin: 0, color: '#1A365D'}}>{session.course}</h3>
              <small style={{color: '#64748B'}}>{session.sessionName} (Début : {session.startTime})</small>
            </div>
            <button onClick={stopSession} style={styles.btnStop}>FERMER</button>
          </div>

          <div style={styles.scanList}>
            <h4 style={styles.listTitle}>Derniers scans détectés</h4>
            <div style={styles.cardsContainer}>
              {lastScans.length > 0 ? (
                lastScans.map((p, i) => (
                  <div key={i} style={styles.studentCard}>
                    <div style={styles.studentAvatar}>{p.name.charAt(0)}</div>
                    <div style={styles.studentInfo}>
                      <span style={styles.studentName}>{p.name}</span>
                      <span style={styles.studentOptionBadge}>{p.option}</span>
                    </div>
                    <div style={styles.studentMeta}>
                      <span style={styles.scanTime}>{p.time}</span>
                      <div style={styles.statusSuccess}>Connecté ✓</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.pulseIcon}>📡</div>
                  <p>Prêt à recevoir les badges...</p>
                </div>
              )}
            </div>
          </div>

          {/* RÉTABLISSEMENT DU BOUTON AVEC LE BON LIEN 'presence-day' */}
          <button style={styles.btnLink} onClick={() => setCurrentPage('presence-day')}>
            VOIR TOUS LES ÉTUDIANTS PRÉSENTS
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
  topInfo: { display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' },
  userBadge: { background: '#E2E8F0', padding: '8px 16px', borderRadius: '20px', fontSize: '12px' },
  roleLabel: { color: '#64748B', marginRight: '5px' },
  userName: { fontWeight: 'bold', color: '#1A365D' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' },
  statCard: { background: 'white', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderTop: '4px solid #FFBF00' },
  statLabel: { fontSize: '10px', color: '#94A3B8', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' },
  mainCard: { background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  formGroup: { marginBottom: '20px' },
  label: { fontSize: '12px', color: '#64748B', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '15px', boxSizing: 'border-box' },
  singleCourseBox: { padding: '15px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' },
  courseNameHighlight: { fontSize: '18px', fontWeight: '800', color: '#1A365D' },
  btnCreate: { width: '100%', padding: '16px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  sessionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #F1F5F9' },
  btnStop: { padding: '8px 16px', background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  
  scanList: { minHeight: '280px' },
  listTitle: { fontSize: '11px', color: '#94A3B8', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' },
  cardsContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
  studentCard: { 
    display: 'flex', 
    alignItems: 'center', 
    background: '#ffffff', 
    padding: '15px', 
    borderRadius: '16px', 
    border: '1px solid #F1F5F9',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
  },
  studentAvatar: { 
    width: '45px', 
    height: '45px', 
    background: 'linear-gradient(135deg, #1A365D 0%, #2D3748 100%)', 
    color: 'white', 
    borderRadius: '12px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontWeight: '800', 
    marginRight: '15px',
    fontSize: '18px'
  },
  studentInfo: { display: 'flex', flexDirection: 'column', flex: 1 },
  studentName: { fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '2px' },
  studentOptionBadge: { 
    fontSize: '9px', 
    color: '#1A365D', 
    background: '#E0E7FF', 
    padding: '3px 10px', 
    borderRadius: '20px', 
    width: 'fit-content',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  studentMeta: { textAlign: 'right' },
  scanTime: { fontSize: '13px', color: '#1A365D', fontWeight: '800', display: 'block' },
  statusSuccess: { color: '#10B981', fontSize: '10px', fontWeight: 'bold', marginTop: '4px' },

  emptyState: { textAlign: 'center', padding: '50px 0', color: '#94A3B8' },
  pulseIcon: { fontSize: '40px', marginBottom: '10px' },
  btnLink: { 
    width: '100%', 
    marginTop: '25px', 
    padding: '16px', 
    background: '#F8FAFC', 
    color: '#1A365D', 
    border: '2px dashed #CBD5E1', 
    borderRadius: '14px', 
    fontWeight: '800', 
    cursor: 'pointer', 
    fontSize: '13px',
  }
};

export default Dashboard;