import React from 'react';

const SessionCard = ({ active, onToggle }) => {
  return (
    <div style={styles.card}>
      <h3 style={{ color: 'var(--blue)' }}>Contrôle de Session</h3>
      <button 
        onClick={onToggle}
        style={{
          ...styles.button,
          backgroundColor: active ? 'var(--red)' : 'var(--yellow)',
          color: active ? 'white' : 'var(--blue)'
        }}
      >
        {active ? "FERMER LA SESSION" : "OUVRIR LA SESSION"}
      </button>
      <p>Statut : <strong>{active ? "Ouvert" : "Fermé"}</strong></p>
    </div>
  );
};

const styles = {
  card: { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '20px' },
  button: { width: '100%', padding: '12px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }
};

export default SessionCard;