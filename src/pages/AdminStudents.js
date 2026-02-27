import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { ref, set, onValue, remove, off } from "firebase/database";

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ 
    name: '', 
    option: '', 
    promotion: 'L4', 
    badgeId: '' 
  });

  const todayDate = new Date().toLocaleDateString('fr-FR');

  // 1. CHARGER LA LISTE DES ÉTUDIANTS
  useEffect(() => {
    const studentsRef = ref(db, 'students');
    onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        setStudents(list);
      } else {
        setStudents([]);
      }
    });
    return () => off(studentsRef);
  }, []);

  // 2. LOGIQUE DE SCAN RFID
  useEffect(() => {
    if (isScanning) {
      const scanRef = ref(db, 'config/lastScannedID');
      onValue(scanRef, (snapshot) => {
        const id = snapshot.val();
        if (id && id !== "" && id !== "null") {
          setForm(prev => ({ ...prev, badgeId: id.toUpperCase() }));
          setIsScanning(false); 
        }
      });
      return () => off(scanRef);
    }
  }, [isScanning]);

  const handleStartScan = async () => {
    try {
      setForm(prev => ({ ...prev, badgeId: '' }));
      await set(ref(db, 'config/lastScannedID'), "");
      await set(ref(db, 'config/mode'), 1);
      setIsScanning(true);
    } catch (e) {
      alert("Erreur de connexion : " + e.message);
    }
  };

  // 3. ENREGISTRER OU MODIFIER (AVEC VÉRIFICATION DE DOUBLONS)
  const handleSave = async () => {
    const cleanName = form.name.trim();
    const cleanBadgeId = form.badgeId.trim().toUpperCase();

    if (!cleanName || !cleanBadgeId || !form.option) {
      return alert("❌ Veuillez remplir tous les champs (Nom, Option et Badge).");
    }

    // --- LOGIQUE ANTI-DOUBLON ---
    // On vérifie si le badge existe déjà dans notre liste locale 'students'
    // Mais on ignore la vérification si on est en train de MODIFIER le même étudiant (editingId)
    const alreadyExists = students.find(s => s.badgeId === cleanBadgeId);
    
    if (alreadyExists && editingId !== alreadyExists.id) {
      return alert(`⚠️ Erreur : Ce badge appartient déjà à ${alreadyExists.name} (${alreadyExists.option}).`);
    }
    // ----------------------------

    const studentData = {
      name: cleanName,
      option: form.option,
      promotion: form.promotion,
      badgeId: cleanBadgeId,
      regDate: todayDate,
      timestamp: Date.now()
    };

    try {
      await set(ref(db, `students/${cleanBadgeId}`), studentData);
      await set(ref(db, 'config/mode'), 0);
      await set(ref(db, 'config/lastScannedID'), ""); 

      setForm({ name: '', option: '', promotion: 'L4', badgeId: '' });
      setEditingId(null);
      setIsScanning(false);
      alert(`✅ ${cleanName} est maintenant enregistré !`);
    } catch (e) {
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({ name: s.name, option: s.option, promotion: s.promotion, badgeId: s.badgeId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteStudent = (id) => {
    if (window.confirm("🗑️ Supprimer définitivement cet étudiant ?")) {
      remove(ref(db, `students/${id}`));
    }
  };

  const recentStudents = students.filter(s => s.regDate === todayDate);

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <h2 style={styles.title}>🎓 Gestion des Étudiants</h2>
        <p style={styles.subtitle}>Liez les noms aux IDs badges détectés par l'ESP32</p>
      </header>
      
      <div style={styles.adminCard}>
        <div style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nom complet</label>
            <input 
              style={styles.input} 
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="Ex: Jael Mukundi"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Option</label>
            <select 
              style={styles.input}
              value={form.option}
              onChange={(e) => setForm({...form, option: e.target.value})}
            >
              <option value="">-- Sélectionner --</option>
              <option value="Datascience">Datascience</option>
              <option value="Robotique">Robotique</option>
              <option value="Réseaux">Réseaux</option>
              <option value="Ingénierie Logicielle">Ingénierie Logicielle</option>
              <option value="Sécurité Informatique">Sécurité Informatique</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>ID du Badge (Scan ESP32)</label>
            <div style={{display: 'flex', gap: '10px'}}>
              <div style={{
                ...styles.badgeDisplay, 
                borderColor: form.badgeId ? '#10B981' : (isScanning ? '#FFBF00' : '#E2E8F0'),
                backgroundColor: isScanning ? '#FFFBEB' : '#F8FAFC',
                color: form.badgeId ? '#065F46' : '#64748B'
              }}>
                {form.badgeId || (isScanning ? "Approchez le badge..." : "En attente de scan")}
              </div>
              <button 
                onClick={handleStartScan}
                disabled={isScanning}
                style={{...styles.btnScan, backgroundColor: isScanning ? '#94A3B8' : '#1A365D'}}
              >
                {isScanning ? '⏳' : '📡'}
              </button>
            </div>
          </div>
        </div>
        <button onClick={handleSave} style={styles.btnAdd}>
          {editingId ? "METTRE À JOUR LE PROFIL" : "ENREGISTRER L'ÉTUDIANT"}
        </button>
      </div>

      {recentStudents.length > 0 && (
        <div style={styles.recentSection}>
          <h4 style={{margin: '0 0 10px 0', color: '#059669', fontSize: '11px', fontWeight: '800'}}>DERNIERS ENREGISTREMENTS</h4>
          <div style={styles.recentGrid}>
            {recentStudents.map(s => (
              <div key={s.id} style={styles.recentTag}>✨ {s.name}</div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.mainCard}>
        <div style={styles.tableHeaderSection}>
          <h3 style={{margin: 0, fontSize: '15px', color: '#1A365D'}}>Base de données RFID ({students.length} inscrits)</h3>
        </div>
        <div style={{overflowX: 'auto'}}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.trHead}>
                <th style={styles.th}>Nom</th>
                <th style={styles.th}>Option</th>
                <th style={styles.th}>ID Badge</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.sort((a,b) => b.timestamp - a.timestamp).map((s) => (
                <tr key={s.id} style={styles.row}>
                  <td style={styles.tdName}>{s.name}</td>
                  <td style={styles.td}><span style={styles.optionBadge}>{s.option}</span></td>
                  <td style={styles.tdBadge}>{s.badgeId}</td>
                  <td style={styles.td}>
                    <button onClick={() => startEdit(s)} style={styles.btnEdit}>Modifier</button>
                    <button onClick={() => deleteStudent(s.id)} style={styles.btnDelete}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && <p style={styles.empty}>Aucune donnée disponible.</p>}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto' },
  pageHeader: { marginBottom: '25px' },
  title: { color: '#1A365D', margin: 0, fontSize: '22px', fontWeight: '800' },
  subtitle: { color: '#64748B', marginTop: '5px', fontSize: '14px' },
  adminCard: { background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '30px', border: '1px solid #F1F5F9' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none' },
  badgeDisplay: { flex: 1, padding: '12px', borderRadius: '8px', border: '2px dashed #E2E8F0', fontSize: '13px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  btnScan: { padding: '0 20px', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '18px' },
  btnAdd: { width: '100%', padding: '15px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
  recentSection: { background: '#F0FDF4', padding: '15px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #DCFCE7' },
  recentGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  recentTag: { background: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', border: '1px solid #BBF7D0', color: '#166534', fontWeight: 'bold' },
  mainCard: { background: 'white', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' },
  tableHeaderSection: { padding: '15px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 20px', background: '#F8FAFC', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', fontWeight: '800' },
  row: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '12px 20px', fontSize: '13px', color: '#475569' },
  tdName: { padding: '12px 20px', fontSize: '14px', color: '#1A365D', fontWeight: '700' },
  tdBadge: { padding: '12px 20px', fontSize: '12px', fontFamily: 'monospace', color: '#94A3B8' },
  optionBadge: { background: '#F1F5F9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' },
  btnEdit: { background: 'none', border: 'none', color: '#3B82F6', fontWeight: 'bold', cursor: 'pointer', marginRight: '15px', fontSize: '12px' },
  btnDelete: { background: 'none', border: 'none', color: '#EF4444', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  empty: { textAlign: 'center', padding: '20px', color: '#94A3B8', fontSize: '13px' }
};

export default AdminStudents;