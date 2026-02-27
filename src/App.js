import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminStudents from './pages/AdminStudents';
import AdminList from './pages/AdminList';
import AdminStaff from './pages/AdminStaff';
import History from './pages/History';
import PresenceDay from './pages/PresenceDay'; 
import Stats from './pages/Stats';              

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState(''); 
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    // Redirection intelligente selon le rôle
    setCurrentPage(userData.role === "Admin" ? 'add-student' : 'dashboard');
  };

  const handleLogout = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      setIsAuthenticated(false);
      setUser(null);
      setCurrentPage('');
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F7FAFC' }}>
      <Navbar user={user} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={styles.sidebar}>
          <div style={styles.menuGroup}>
            {user.role === "Admin" ? (
              <>
                <div style={styles.sectionLabel}>GESTION</div>
                <div style={currentPage === 'add-student' ? styles.menuItemActive : styles.menuItem} onClick={() => setCurrentPage('add-student')}>➕ Ajouter Étudiant</div>
                <div style={currentPage === 'staff' ? styles.menuItemActive : styles.menuItem} onClick={() => setCurrentPage('staff')}>👨‍🏫 Ajouter Staff</div>
                <div style={styles.sectionLabel}>CONSULTATION</div>
                <div style={currentPage === 'student-list' ? styles.menuItemActive : styles.menuItem} onClick={() => setCurrentPage('student-list')}>📋 Liste Étudiants</div>
              </>
            ) : (
              <>
                <div style={styles.sectionLabel}>SESSIONS</div>
                <div style={currentPage === 'dashboard' ? styles.menuItemActive : styles.menuItem} onClick={() => setCurrentPage('dashboard')}>📊 Tableau de bord</div>
                <div style={currentPage === 'presence-day' ? styles.menuItemActive : styles.menuItem} onClick={() => setCurrentPage('presence-day')}>👥 Étudiants présents</div>
                <div style={styles.sectionLabel}>RAPPORTS</div>
                <div style={currentPage === 'history' ? styles.menuItemActive : styles.menuItem} onClick={() => setCurrentPage('history')}>📅 Historique sessions</div>
                <div style={currentPage === 'stats' ? styles.menuItemActive : styles.menuItem} onClick={() => setCurrentPage('stats')}>📈 Stats & Présences</div>
              </>
            )}
          </div>

          <div style={styles.footerMenu}>
            <div style={{...styles.menuItem, color: '#F87171', fontWeight: '600'}} onClick={handleLogout}>🔴 Déconnexion</div>
          </div>
        </aside>

        <main style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Rendu dynamique des pages */}
          {user.role === "Admin" ? (
            <>
              {currentPage === 'add-student' && <AdminStudents />}
              {currentPage === 'student-list' && <AdminList />}
              {currentPage === 'staff' && <AdminStaff />}
              {/* Fallback si page inconnue pour Admin */}
              {currentPage === '' && <AdminStudents />}
            </>
          ) : (
            <>
              {currentPage === 'dashboard' && <Dashboard user={user} setCurrentPage={setCurrentPage} />}
              {currentPage === 'presence-day' && <PresenceDay user={user} />}
              {currentPage === 'history' && <History user={user} />}
              {currentPage === 'stats' && <Stats user={user} />}
              {/* Fallback si page inconnue pour Prof */}
              {currentPage === '' && <Dashboard user={user} setCurrentPage={setCurrentPage} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const styles = {
  sidebar: { width: '260px', background: '#102A43', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid #E2E8F0' },
  menuGroup: { paddingTop: '10px' },
  sectionLabel: { padding: '20px 24px 8px', fontSize: '11px', color: '#64748B', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' },
  menuItem: { padding: '12px 24px', color: '#BCCCDC', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: '0.2s' },
  menuItemActive: { padding: '12px 24px', color: 'white', background: 'rgba(255, 191, 0, 0.15)', borderLeft: '4px solid #FFBF00', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  footerMenu: { borderTop: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }
};

export default App;