import React from 'react';

const Navbar = () => {
  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <div style={styles.logoBadge}>
          <div style={styles.innerSignal}></div>
        </div>
        <h1 style={styles.logoText}>UWEPO</h1>
      </div>
      
      <div style={styles.searchBar}>
        <input type="text" placeholder="Rechercher un étudiant..." style={styles.searchInput} />
      </div>

      <div style={styles.profile}>
        <div style={styles.notif}>🔔</div>
        <div style={styles.avatar}>U</div>
      </div>
    </nav>
  );
};

const styles = {
  nav: { 
    height: '70px', background: 'white', display: 'flex', 
    alignItems: 'center', justifyContent: 'space-between', 
    padding: '0 30px', borderBottom: '1px solid #E2E8F0' 
  },
  brand: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoBadge: { 
    width: '35px', height: '35px', background: 'var(--upc-blue)', 
    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
  },
  innerSignal: { width: '15px', height: '15px', border: '3px solid var(--upc-yellow)', borderRadius: '50%' },
  logoText: { fontSize: '22px', fontWeight: '800', color: 'var(--upc-blue)', letterSpacing: '-0.5px' },
  searchInput: { 
    background: '#F1F5F9', border: 'none', padding: '10px 20px', 
    borderRadius: '20px', width: '300px', outline: 'none' 
  },
  profile: { display: 'flex', alignItems: 'center', gap: '20px' },
  avatar: { 
    width: '40px', height: '40px', borderRadius: '50%', 
    background: 'var(--upc-blue)', color: 'white', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
  }
};

export default Navbar;