import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { ref, onValue, off, get } from "firebase/database";
import logoUPC from '../assets/upc.png';

const PresenceDay = ({ user }) => { 
  const [activeSession, setActiveSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openedByName, setOpenedByName] = useState("Chargement..."); 
  const [titulaireName, setTitulaireName] = useState("Chargement...");

  const todayISO = new Date().toISOString().split('T')[0];
  const displayDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  useEffect(() => {
    const activeRef = ref(db, 'activeSession');
    
    onValue(activeRef, async (snapshot) => {
      const sessionData = snapshot.val();
      setActiveSession(sessionData);

      if (sessionData && sessionData.active && sessionData.id) {
        
        // 1. RÉCUPÉRATION DU VRAI TITULAIRE DU COURS
        const usersRef = ref(db, 'users');
        get(usersRef).then((userSnap) => {
          const allUsers = userSnap.val();
          if (allUsers) {
            const prof = Object.values(allUsers).find(u => 
              u.role === "Professeur" && 
              u.assignedCourses && 
              Object.values(u.assignedCourses).includes(sessionData.course)
            );
            setTitulaireName(prof ? prof.name : "Non assigné");
          }
        });

        // 2. RÉCUPÉRATION DE CELUI QUI A OUVERT LA SESSION
        if (sessionData.openedBy) {
          get(ref(db, `users/${sessionData.openedBy}`)).then(snap => {
            setOpenedByName(snap.val()?.name || sessionData.openedBy);
          });
        }

        // 3. CHARGEMENT DES PRÉSENCES
        const attendancePath = `attendance/${sessionData.date || todayISO}/${sessionData.id}`;
        onValue(ref(db, attendancePath), async (attendanceSnapshot) => {
          const data = attendanceSnapshot.val();
          if (data) {
            const list = await Promise.all(
              Object.keys(data).map(async (uid) => {
                const scan = data[uid];
                const studentSnap = await get(ref(db, `students/${uid}`));
                const info = studentSnap.val();
                return {
                  ...scan,
                  id: uid,
                  option: info?.option || "Option non définie"
                };
              })
            );
            setStudents(list.sort((a, b) => a.name.localeCompare(b.name)));
          } else {
            setStudents([]);
          }
        });
      }
    });

    return () => off(activeRef);
  }, [todayISO]);

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* --- DASHBOARD ECRAN --- */}
      <div className="hide-on-print">
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Présences en temps réel</h2>
            <p style={styles.subtitle}>
               <strong>Séance :</strong> {activeSession?.sessionName || "N/A"} | 
               <strong> Cours :</strong> {activeSession?.course || "Aucun"}
            </p>
          </div>
          <div style={styles.actionGroup}>
            <button onClick={() => window.print()} style={styles.btnPrint}>🖨️ Imprimer le rapport</button>
            <div style={styles.countBadge}>{filteredStudents.length} Présents</div>
          </div>
        </div>

        <div style={styles.controls}>
          <input 
            type="text" 
            placeholder="Rechercher un étudiant..." 
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={styles.tableCard}>
            <table style={styles.table}>
                <thead>
                    <tr>
                    <th style={styles.th}>N°</th>
                    <th style={styles.th}>NOM COMPLET</th>
                    <th style={styles.th}>OPTION</th>
                    <th style={styles.th}>HEURE</th>
                    <th style={styles.th}>STATUT</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredStudents.map((s, i) => (
                    <tr key={i}>
                        <td style={styles.td}>{i + 1}</td>
                        <td style={{...styles.td, fontWeight: 'bold'}}>{s.name}</td>
                        <td style={styles.td}>{s.option}</td>
                        <td style={styles.td}>{s.time}</td>
                        <td style={styles.td}><span style={styles.liveBadge}>PRÉSENT</span></td>
                    </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- RAPPORT D'IMPRESSION --- */}
      <div className="report-paper">
        <div style={pStyle.headerSection}>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px'}}>
            <img src={logoUPC} alt="Logo UPC" style={pStyle.logo} />
            <div>
                <h2 style={{margin: 0, fontSize: '18px', color: '#000'}}>Université Protestante Au Congo</h2>
                <h3 style={{margin: 0, fontSize: '14px', color: '#333', fontWeight: '500'}}>Faculté de Sciences Informatiques (Fasi)</h3>
            </div>
          </div>
          
          <h1 style={pStyle.mainReportTitle}>RAPPORT DE PRÉSENCE</h1>
          
          <div style={pStyle.infoGrid}>
            <div style={pStyle.infoItem}><strong>TITULAIRE :</strong> {titulaireName}</div>
            <div style={pStyle.infoItem}><strong>PROMOTION :</strong> L4</div>
            <div style={pStyle.infoItem}><strong>DATE :</strong> {activeSession?.date || displayDate}</div>
            <div style={pStyle.infoItem}><strong>SESSION :</strong> {activeSession?.sessionName}</div>
            <div style={pStyle.infoItem}><strong>OUVERTE PAR :</strong> {openedByName}</div>
            <div style={pStyle.infoItem}><strong>COURS :</strong> {activeSession?.course}</div>
            <div style={pStyle.infoItem}><strong>TOTAL PRÉSENTS :</strong> {filteredStudents.length}</div>
          </div>
        </div>

        <table style={pStyle.table}>
          <thead>
            <tr>
              <th style={pStyle.th}>N°</th>
              <th style={pStyle.th}>NOM COMPLET</th>
              <th style={pStyle.th}>OPTION</th>
              <th style={pStyle.th}>DATE DU SCAN (HEURE)</th>
              <th style={pStyle.th}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s, i) => (
              <tr key={i}>
                <td style={pStyle.td}>{i + 1}</td>
                <td style={{...pStyle.td, fontWeight: 'bold'}}>{s.name}</td>
                <td style={pStyle.td}>{s.option}</td>
                <td style={pStyle.td}>{s.time}</td>
                <td style={pStyle.td}>Présent</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{marginTop: '40px', textAlign: 'right', fontSize: '12px'}}>
          <p>Fait à Kinshasa, le {new Date().toLocaleDateString('fr-FR')}</p>
          <br /><br />
          <p style={{marginRight: '40px'}}><strong>Signature du Titulaire</strong></p>
        </div>
      </div>

      <style>{`
        .report-paper { display: none; }
        @media print {
          nav, aside, header, .sidebar, .navbar, .hide-on-print { display: none !important; }
          body, html { background: white !important; margin: 0; padding: 0; }
          .report-paper { display: block !important; width: 100%; padding: 20px; color: black !important; }
          @page { size: A4; margin: 1cm; }
        }
      `}</style>
    </div>
  );
};

const pStyle = {
    headerSection: { marginBottom: '30px' },
    logo: { width: '60px', height: 'auto' },
    mainReportTitle: { 
      fontSize: '24px', fontWeight: 'bold', textAlign: 'center', 
      borderTop: '2px solid black', borderBottom: '2px solid black', 
      padding: '10px 0', margin: '20px 0' 
    },
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' },
    infoItem: { marginBottom: '5px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { border: '1px solid black', padding: '10px', textAlign: 'left', background: '#f2f2f2', fontSize: '12px' },
    td: { border: '1px solid black', padding: '8px', fontSize: '12px' }
  };
  
  const styles = {
    container: { maxWidth: '1100px', margin: '0 auto', padding: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
    actionGroup: { display: 'flex', gap: '15px', alignItems: 'center' },
    btnPrint: { padding: '12px 24px', backgroundColor: '#1A365D', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
    title: { margin: 0, color: '#1A365D', fontSize: '24px' },
    subtitle: { margin: '5px 0 0', color: '#64748B' },
    countBadge: { background: '#10B981', color: 'white', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold' },
    controls: { marginBottom: '20px' },
    searchInput: { width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none' },
    tableCard: { backgroundColor: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '15px', backgroundColor: '#F8FAFC', color: '#475569', fontSize: '12px', textAlign: 'left', borderBottom: '2px solid #EDF2F7' },
    td: { padding: '15px', borderBottom: '1px solid #F1F5F9', color: '#1E293B' },
    liveBadge: { background: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }
  };

export default PresenceDay;