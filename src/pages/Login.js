import React, { useState } from 'react';
import { auth, db } from '../config/firebase'; // Assure-toi que le chemin est correct
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Authentification avec Email et Mot de passe (Firebase Auth)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Recherche du profil dans la Realtime Database par l'Email
      const usersRef = ref(db, 'users');
      const emailQuery = query(usersRef, orderByChild('email'), equalTo(email));
      const snapshot = await get(emailQuery);

      if (snapshot.exists()) {
        // snapshot.val() renvoie un objet dont la clé est l'ID généré par push()
        // On récupère la première valeur trouvée
        const userData = Object.values(snapshot.val())[0];
        
        // On transmet les données au composant App
        onLogin(userData); 
      } else {
        // Cas particulier : Auth ok mais pas d'entrée dans la DB (ex: Admin créé uniquement dans Auth)
        // Si c'est ton compte admin principal, on peut forcer le rôle
        if (email === "ton-admin@gmail.com") {
             onLogin({ name: "Administrateur", role: "Admin", email: email });
        } else {
             setError("Profil non trouvé dans la base de données.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Identifiants incorrects ou accès refusé.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.authWrapper}>
      <div style={styles.loginCard}>
        <div style={styles.brandSection}>
          <div style={styles.logoBadge}>UWEPO</div>
        </div>
        
        <div style={styles.headerText}>
          <h2 style={styles.welcomeText}>Authentification</h2>
          <p style={styles.subText}>L'innovation au service de la présence</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FEE2E2', 
            color: '#B91C1C', 
            padding: '10px', 
            borderRadius: '8px', 
            fontSize: '13px', 
            textAlign: 'center', 
            marginBottom: '15px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Identifiant Email</label>
            <input 
              type="email" 
              style={styles.input} 
              placeholder="nom.professeur@uwepo.cd"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mot de passe</label>
            <input 
              type="password" 
              style={styles.input} 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required 
            />
          </div>

          <button 
            type="submit" 
            style={{...styles.btnLogin, opacity: isLoading ? 0.7 : 1}}
            disabled={isLoading}
          >
            {isLoading ? 'CONNEXION EN COURS...' : 'SE CONNECTER'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>Uwepo • Smart Attendance System</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
    authWrapper: {
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      overflow: 'hidden',
    },
    loginCard: {
      background: '#FFFFFF',
      padding: '30px',
      borderRadius: '24px',
      width: '90%',
      maxWidth: '400px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      borderTop: '6px solid #FFBF00', 
    },
    brandSection: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '25px' },
    logoBadge: { background: '#1A365D', color: '#FFBF00', padding: '6px 14px', borderRadius: '10px', fontWeight: '900', fontSize: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    logoText: { fontSize: '28px', color: '#1A365D', margin: 0, fontWeight: '900', letterSpacing: '-1px' },
    headerText: { marginBottom: '30px', textAlign: 'center' },
    welcomeText: { margin: '0', color: '#1A365D', fontSize: '22px', fontWeight: '700' },
    subText: { color: '#64748B', margin: '8px 0 0 0', fontSize: '14px', fontStyle: 'italic' },
    form: { textAlign: 'left' },
    inputGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #F1F5F9', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#F8FAFC' },
    btnLogin: { width: '100%', padding: '16px', background: '#1A365D', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', fontSize: '15px', boxShadow: '0 10px 15px -3px rgba(26, 54, 93, 0.4)' },
    footer: { marginTop: '30px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #F1F5F9' },
    footerText: { color: '#94A3B8', fontSize: '12px', fontWeight: '500', margin: 0 }
};

export default Login;