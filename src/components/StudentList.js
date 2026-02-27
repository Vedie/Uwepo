import React from 'react';

const StudentList = ({ students }) => {
  return (
    <div style={styles.card}>
      <h3 style={{ color: 'var(--blue)' }}>Présences en direct</h3>
      <div style={styles.list}>
        {students.length === 0 ? <p>Aucun badge détecté.</p> : 
          students.map((s, i) => (
            <div key={i} style={styles.item}>
              <span>👤 {s.name}</span>
              <span style={styles.time}>{s.time}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
};

const styles = {
  card: { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  item: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' },
  time: { fontSize: '0.8em', color: '#666' }
};

export default StudentList;