import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { ref, onValue, remove } from "firebase/database";

const AdminList = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Récupéreration dses données réelles depuis Firebase
  useEffect(() => {
    const studentsRef = ref(db, 'students');
    onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Transformation de l'objet Firebase en tableau
        const list = Object.values(data);
        setStudents(list);
      } else {
        setStudents([]);
      }
    });
  }, []);

  // 2. Fonction de suppression
  const handleDelete = (id, name) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'étudiant ${name} ?`)) {
      remove(ref(db, `students/${id}`))
        .then(() => alert("Étudiant supprimé"))
        .catch((error) => console.error("Erreur:", error));
    }
  };

  // 3. Filtrage pour la recherche
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.badgeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📋 Liste Générale des Étudiants L4</h2>
        <input 
          type="text" 
          placeholder="Rechercher par nom ou Badge ID..." 
          style={styles.searchInput}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div style={styles.mainCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th>Nom & Postnom</th>
              <th>Promotion</th>
              <th>Option / Filière</th>
              <th>ID Unique Badge</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((s) => (
                <tr key={s.id} style={styles.row}>
                  <td style={styles.studentName}>{s.name}</td>
                  <td style={styles.promoText}>{s.promotion || 'L4'}</td>
                  <td>
                    <div style={styles.optionBadge}>{s.option}</div>
                  </td>
                  <td>
                    <span style={styles.badgeCode}>{s.badgeId}</span>
                  </td>
                  <td>
                    {/* Pour modifier, l'admin retourne généralement sur la page AdminStudents */}
                    <button 
                      title="Supprimer" 
                      onClick={() => handleDelete(s.id, s.name)} 
                      style={styles.btnDelete}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={styles.emptyMsg}>Aucun étudiant trouvé</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' },
  title: { color: '#102A43', margin: 0 },
  searchInput: { padding: '10px 15px', borderRadius: '8px', border: '1px solid #CBD5E0', width: '300px', outline: 'none' },
  mainCard: { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
  tableHeader: { textAlign: 'left', color: '#94A3B8', fontSize: '12px', borderBottom: '2px solid #F1F5F9' },
  row: { borderBottom: '1px solid #F8FAFC', transition: '0.2s' },
  studentName: { fontWeight: '600', color: '#1A365D', fontSize: '14px' },
  promoText: { fontSize: '13px', color: '#475569' },
  optionBadge: { display: 'inline-block', background: '#E2E8F0', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', color: '#4A5568' },
  badgeCode: { fontFamily: 'monospace', color: '#D97706', fontWeight: 'bold', background: '#FFFBEB', padding: '4px 8px', borderRadius: '5px', fontSize: '12px' },
  btnDelete: { background: '#FEE2E2', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '6px', transition: '0.3s' },
  emptyMsg: { textAlign: 'center', padding: '30px', color: '#94A3B8', fontStyle: 'italic' }
};

export default AdminList;