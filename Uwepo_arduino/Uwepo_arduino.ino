#include <WiFi.h>
#include <FirebaseESP32.h>
#include <SPI.h>
#include <MFRC522.h>
#include "time.h"

// --- CONFIGURATION ---
#define WIFI_SSID "CANALBOX-B2A7-2G"
#define WIFI_PASSWORD "AqzDfhrNa9NV"
#define FIREBASE_HOST "upcpres-9cea3-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "tHyPKvlTXYnfbh8R9VhzmuQxiRC1TE79GTl1DBCa"

#define SS_PIN     5   
#define RST_PIN    22  
#define LED_VERTE  4   
#define LED_ROUGE  2   

MFRC522 mfrc522(SS_PIN, RST_PIN);
FirebaseData firebaseData;
FirebaseConfig config;
FirebaseAuth auth;

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  pinMode(LED_VERTE, OUTPUT);
  pinMode(LED_ROUGE, OUTPUT);

  // Connexion WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connexion au WiFi");
  while (WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print("."); 
  }
  Serial.println("\n✅ WiFi Connecté !");

  // Configuration Firebase
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Configuration de l'heure (UTC+1 pour Kinshasa)
  configTime(3600, 0, "pool.ntp.org"); 
  
  Serial.println("--- SYSTÈME PRÊT ---");
}

void loop() {
  // 1. Détection d'un badge
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;

  // 2. Lecture de l'UID
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  Serial.println("\n📇 Badge détecté : " + uid);

  // 3. Vérification du Mode (0 = Présence, 1 = Inscription Admin)
  int mode = 0;
  if (Firebase.getInt(firebaseData, "/config/mode")) {
    mode = firebaseData.intData();
  }

  if (mode == 0) { 
    // ================= MODE PRÉSENCE =================
    Serial.println("Mode : Présence active");
    
    String studentName = "";
    // On vérifie si l'étudiant existe dans la branche /students/
    if (Firebase.getString(firebaseData, "/students/" + uid + "/name")) {
      studentName = firebaseData.stringData();
      studentName.trim();
    }

    // SI L'ÉTUDIANT EXISTE
    if (studentName != "" && studentName != "null") {
      String sessionID = "";
      if (Firebase.getString(firebaseData, "/config/activeSessionID")) {
        sessionID = firebaseData.stringData();
        sessionID.replace("\"", "");
        sessionID.trim();
      }

      if (sessionID != "" && sessionID != "null") {
        String dateStr = getFormattedDate();
        String timeStr = getFormattedTime();
        
        String path = "/attendance/" + dateStr + "/" + sessionID + "/" + uid;

        FirebaseJson json;
        json.add("name", studentName);
        json.add("time", timeStr);
        json.add("badgeId", uid);

        if (Firebase.setJSON(firebaseData, path, json)) {
          Serial.println("✅ Présence validée : " + studentName);
          digitalWrite(LED_VERTE, HIGH); 
          delay(3000); 
          digitalWrite(LED_VERTE, LOW);
        }
      } else {
        Serial.println("⚠️ Aucune session lancée sur le Dashboard");
        clignoterRouge(2); // Erreur session : 2 clignotements
      }
    } 
    // SI L'ÉTUDIANT N'EXISTE PAS
    else {
      Serial.println("❌ ÉTUDIANT INCONNU : Allez chez l'appariteur");
      clignoterRouge(4); // Signal d'erreur : 4 clignotements rouges
    }
  } 
  else { 
    // ================= MODE INSCRIPTION =================
    // Ce code ne s'exécute que si l'admin a cliqué sur "Scanner" dans l'interface
    Serial.println("Mode : Inscription admin");
    if (Firebase.setString(firebaseData, "/config/lastScannedID", uid)) {
      Serial.println("📥 ID envoyé pour nouvel enregistrement : " + uid);
      digitalWrite(LED_VERTE, HIGH); 
      delay(1000); 
      digitalWrite(LED_VERTE, LOW);
      
    }
  }

  // Nettoyage
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

// Fonction pour faire clignoter la LED rouge
void clignoterRouge(int fois) {
  for (int i = 0; i < fois; i++) {
    digitalWrite(LED_ROUGE, HIGH); delay(250);
    digitalWrite(LED_ROUGE, LOW); delay(250);
  }
}

String getFormattedDate() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)) return "2026-01-18"; 
  char buffer[11];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d", &timeinfo);
  return String(buffer);
}

String getFormattedTime() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)) return "00:00";
  char buffer[6];
  strftime(buffer, sizeof(buffer), "%H:%M", &timeinfo);
  return String(buffer);
}