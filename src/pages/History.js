import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { ref, onValue, off, get } from "firebase/database";
import logoUPC from '../assets/upc.png';

const History = ({ user }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openedByName, setOpenedByName] = useState("");
  const [titulaireName, setTitulaireName] = useState("Chargement...");

  useEffect(() => {
    const sessionsRef = ref(db, 'sessions');
    onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allSessions = Object.values(data);
        const mySessions = allSessions
          .filter(s => user?.assignedCourses && Object.values(user.assignedCourses).includes(s.course))
          .sort((a, b) => b.timestamp - a.timestamp);
        
        setSessions(mySessions);
        if (mySessions.length > 0 && !selectedSession) {
          setSelectedSession(mySessions[0]);
        }
      }
      setLoading(false);
    });
    return () => off(sessionsRef);
  }, [user]);

  useEffect(() => {
    if (selectedSession && selectedSession.id && selectedSession.date) {
      const usersRef = ref(db, 'users');
      get(usersRef).then((userSnap) => {
        const allUsers = userSnap.val();
        if (allUsers) {
          const prof = Object.values(allUsers).find(u => 
            u.role === "Professeur" && 
            u.assignedCourses && 
            Object.values(u.assignedCourses).includes(selectedSession.course)
          );
          setTitulaireName(prof ? prof.name : "Non assigné");
        }
      });

      if (selectedSession.openedBy) {
        get(ref(db, `users/${selectedSession.openedBy}`)).then(snap => {
          setOpenedByName(snap.val()?.name || selectedSession.openedBy);
        });
      }

      const path = `attendance/${selectedSession.date}/${selectedSession.id}`;
      onValue(ref(db, path), async (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const detailedList = await Promise.all(
            Object.keys(data).map(async (uid) => {
              const scanInfo = data[uid];
              const studentSnap = await get(ref(db, `students/${uid}`));
              const studentData = studentSnap.val();
              return {
                ...scanInfo,
                id: uid,
                option: studentData?.option || "Option non définie"
              };
            })
          );
          setAttendanceList(detailedList.sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          setAttendanceList([]);
        }
      });
    }
  }, [selectedSession]);

  const filteredList = attendanceList.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <div className="hide-on-print">
        <div style={styles.topBar}>
          <div style={styles.titleGroup}>
            <h2 style={styles.mainTitle}>Historique des appels</h2>
            <div style={styles.sessionBadge}>{sessions.length} séances archivées</div>
          </div>
          <div style={styles.selectionArea}>
            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <div style={styles.selectWrapper}>
                <span style={styles.inputIcon}>📅</span>
                <select 
                    style={styles.modernSelect} 
                    value={selectedSession?.id || ""}
                    onChange={(e) => setSelectedSession(sessions.find(s => s.id === e.target.value))}
                >
                    {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                        {s.date} — {s.sessionName} ({s.course})
                    </option>
                    ))}
                </select>
                </div>
                <button 
                  onClick={() => window.print()} 
                  style={{...styles.statusPill, background: '#1A365D', color: 'white', cursor: 'pointer', border: 'none', padding: '10px 15px'}}
                >
                  🖨️ IMPRIMER LE RAPPORT
                </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loader}>Chargement des archives...</div>
        ) : (
          <>
            <div style={styles.statsRow}>
              <div style={{...styles.miniCard, borderBottom: '4px solid #1A365D'}}>
                <div style={styles.iconCircle}>📌</div>
                <div>
                  <div style={styles.cardLabel}>Séance sélectionnée</div>
                  <div style={styles.cardValue}>{selectedSession?.sessionName || "N/A"}</div>
                </div>
              </div>
              <div style={{...styles.miniCard, borderBottom: '4px solid #10B981'}}>
                <div style={{...styles.iconCircle, background: '#ECFDF5'}}>👥</div>
                <div>
                  <div style={styles.cardLabel}>Total Présents</div>
                  <div style={{...styles.cardValue, color: '#10B981'}}>{attendanceList.length} étudiants</div>
                </div>
              </div>
              <div style={{...styles.miniCard, borderBottom: '4px solid #FFBF00'}}>
                <div style={{...styles.iconCircle, background: '#FFF7ED'}}>📖</div>
                <div>
                  <div style={styles.cardLabel}>Cours</div>
                  <div style={styles.cardValue}>{selectedSession?.course}</div>
                </div>
              </div>
            </div>

            <div style={styles.contentCard}>
              <div style={styles.tableHeader}>
                <h3 style={styles.tableTitle}>Registre des scans</h3>
                <div style={styles.searchBox}>
                  <input 
                    type="text" 
                    placeholder="Filtrer par nom..." 
                    style={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Étudiant</th>
                      <th style={styles.th}>Option / Promotion</th>
                      <th style={styles.th}>Heure précise</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((s, i) => (
                        <tr key={i} style={styles.tr}>
                          <td style={styles.tdName}>
                            <div style={styles.avatar}>{s.name.charAt(0)}</div>
                            {s.name}
                          </td>
                          <td style={styles.tdOption}>{s.option}</td>
                          <td style={styles.tdTime}>{s.time}</td>
                          <td style={styles.tdStatus}>
                            <span style={styles.statusPill}>Présent</span>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* --- RAPPORT D'IMPRESSION --- */}
      <div className="report-print-only">
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
            <div style={pStyle.infoItem}><strong>DATE :</strong> {selectedSession?.date}</div>
            <div style={pStyle.infoItem}><strong>SESSION :</strong> {selectedSession?.sessionName}</div>
            <div style={pStyle.infoItem}><strong>OUVERTE PAR :</strong> {openedByName}</div>
            <div style={pStyle.infoItem}><strong>COURS :</strong> {selectedSession?.course}</div>
            <div style={pStyle.infoItem}><strong>TOTAL PRÉSENTS :</strong> {filteredList.length}</div>
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
            {filteredList.map((s, i) => (
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
        .report-print-only { display: none; }
        @media print {
          nav, aside, header, .sidebar, .navbar, .hide-on-print { display: none !important; }
          body, html { background: white !important; margin: 0; padding: 0; }
          .report-print-only { display: block !important; width: 100%; padding: 20px; color: black !important; }
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
    container: { padding: '25px', backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'inherit' },
    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' },
    titleGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    mainTitle: { margin: 0, fontSize: '24px', color: '#0F172A', fontWeight: '800' },
    sessionBadge: { fontSize: '11px', background: '#E2E8F0', color: '#475569', padding: '4px 12px', borderRadius: '20px', width: 'fit-content', fontWeight: 'bold', textTransform: 'uppercase' },
    selectionArea: { background: 'white', padding: '10px 15px', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #E2E8F0' },
    selectWrapper: { display: 'flex', alignItems: 'center', gap: '10px' },
    modernSelect: { border: 'none', outline: 'none', fontSize: '15px', fontWeight: '700', color: '#1A365D', cursor: 'pointer', background: 'transparent', minWidth: '200px' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' },
    miniCard: { background: 'white', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    iconCircle: { width: '45px', height: '45px', borderRadius: '12px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
    cardLabel: { fontSize: '11px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' },
    cardValue: { fontSize: '16px', color: '#1E293B', fontWeight: '700' },
    contentCard: { background: 'white', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', overflow: 'hidden', border: '1px solid #F1F5F9' },
    tableHeader: { padding: '20px 25px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
    tableTitle: { margin: 0, fontSize: '18px', color: '#1E293B', fontWeight: '700' },
    searchBox: { position: 'relative' },
    searchInput: { padding: '10px 18px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', width: '280px', fontSize: '14px', backgroundColor: '#F8FAFC' },
    tableResponsive: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thRow: { background: '#F8FAFC' },
    th: { padding: '15px 25px', textAlign: 'left', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: '800' },
    tr: { borderBottom: '1px solid #F8FAFC' },
    tdName: { padding: '15px 25px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '700', color: '#1A365D' },
    avatar: { width: '35px', height: '35px', borderRadius: '10px', background: '#1A365D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' },
    tdOption: { padding: '15px 25px', color: '#64748B', fontSize: '14px', fontWeight: '500' },
    tdTime: { padding: '15px 25px', color: '#94A3B8', fontSize: '13px' },
    tdStatus: { padding: '15px 25px', textAlign: 'right' },
    statusPill: { background: '#DCFCE7', color: '#15803D', padding: '6px 14px', borderRadius: '25px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },
    noData: { padding: '60px', textAlign: 'center', color: '#94A3B8', fontWeight: '500' },
    loader: { textAlign: 'center', padding: '100px', color: '#1A365D', fontWeight: 'bold', fontSize: '18px' }
  };

export default History;