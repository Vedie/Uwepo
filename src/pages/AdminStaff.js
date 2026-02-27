import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase'; 
import { ref, set, push, onValue, remove } from "firebase/database";

const AdminStaff = () => {
  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'Assistant', courses: '' });

  // Charger les profs depuis Firebase au chargement de la page
  useEffect(() => {
    const staffRef = ref(db, 'users');
    onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          uid: key,
          ...data[key]
        })).filter(u => u.role !== 'Admin'); // On ne montre pas l'admin dans la liste
        setStaffList(list);
      } else {
        setStaffList([]);
      }
    });
  }, []);

  // Fonction pour sauvegarder dans Firebase
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return alert("Le nom et l'email sont obligatoires !");

    try {
      const newStaffRef = push(ref(db, 'users'));
      await set(newStaffRef, {
        name: form.name,
        email: form.email,
        role: form.role,
        assignedCourses: form.courses ? form.courses.split(',').map(c => c.trim()) : [],
        createdAt: new Date().toISOString()
      });

      alert("Profil enregistré ! Pensez à créer son compte dans Firebase Auth avec cet email.");
      setForm({ name: '', email: '', role: 'Assistant', courses: '' });
    } catch (error) {
      alert("Erreur de connexion : " + error.message);
    }
  };

  const handleDelete = (uid) => {
    if(window.confirm("Supprimer ce membre du staff ?")) {
      remove(ref(db, `users/${uid}`));
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Gestion du Personnel Enseignant</h2>

      <div style={styles.adminCard}>
        <h3 style={{color: '#1A365D', marginBottom: '20px'}}>Enregistrer un membre du Staff</h3>
        <form onSubmit={handleAddStaff}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nom complet</label>
              <input 
                style={styles.input} 
                placeholder="Ex: Prof. Kabila"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email (Identifiant)</label>
              <input 
                style={styles.input} 
                type="email"
                placeholder="professeur@univ.com"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Rôle</label>
              <select 
                style={styles.input}
                value={form.role}
                onChange={(e) => setForm({...form, role: e.target.value})}
              >
                <option value="Professeur">Professeur</option>
                <option value="Assistant">Assistant</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Cours (séparés par virgule)</label>
              <input 
                style={styles.input}
                placeholder="Ex: Programmation, Réseaux"
                value={form.courses}
                onChange={(e) => setForm({...form, courses: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" style={styles.btnAdd}>LIER AU SYSTÈME FIREBASE</button>
        </form>
      </div>

      <div style={styles.mainCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Cours assignés</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((st) => (
              <tr key={st.uid} style={styles.row}>
                <td style={{fontWeight: '600'}}>{st.name}</td>
                <td style={{fontSize: '13px', color: '#64748B'}}>{st.email}</td>
                <td>
                  <span style={{...styles.roleBadge, backgroundColor: st.role === 'Professeur' ? '#1A365D' : '#FFBF00', color: st.role === 'Professeur' ? 'white' : '#1A365D'}}>
                    {st.role}
                  </span>
                </td>
                <td style={{fontSize: '13px'}}>{st.assignedCourses ? st.assignedCourses.join(", ") : ""}</td>
                <td>
                  <button onClick={() => handleDelete(st.uid)} style={styles.btnDelete}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1100px', margin: '0 auto' },
  title: { color: '#1A365D', marginBottom: '25px' },
  adminCard: { background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '30px', borderTop: '5px solid #FFBF00' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' },
  btnAdd: { width: '100%', padding: '15px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  mainCard: { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { textAlign: 'left', color: '#94A3B8', fontSize: '13px', borderBottom: '2px solid #F1F5F9', paddingBottom: '10px' },
  row: { borderBottom: '1px solid #F8FAFC', height: '60px' },
  roleBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' },
  btnDelete: { background: 'none', border: 'none', color: '#E53E3E', fontWeight: 'bold', cursor: 'pointer' }
};

export default AdminStaff;