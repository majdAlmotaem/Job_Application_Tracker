# Entwickler-Dokumentation - SyncSheet (Job Application Tracker)

SyncSheet ist ein intelligenter Bewerbungs-Tracker, der E-Mails aus einem Gmail-Postfach automatisch auf Bewerbungsstatus (z. B. Bewerbung bestätigt, Intervieweinladung, Absage, Zusage) scannt, diese mithilfe der Gemini-API analysiert und die extrahierten Daten strukturiert in einer lokalen SQLite-Datenbank abspeichert.

---

## 🛠️ Systemarchitektur

Die Anwendung ist als Fullstack-Webanwendung aufgebaut:

### 1. Frontend (React + Vite + TypeScript)
- **Framework & Styling:** React mit TypeScript und TailwindCSS für ein modernes, reaktionsschnelles Interface.
- **Routing:** React Router DOM v7 für die Seitennavigation (Übersicht, Tracker, Job-Suche, Profil).
- **Animationen:** Framer Motion (`motion/react`) für flüssige Übergänge und UI-Interaktionen.
- **Authentifizierung:** Google OAuth via Firebase Authentication. Ermöglicht den sicheren Zugriff auf die Gmail-API des Nutzers.
- **Tabellenverwaltung:** Dynamische Erstellung und Verwaltung von separaten Tabellen direkt in der SQLite-Datenbank des Backends (z.B. für verschiedene CSV-Importe).

### 2. Backend (Python + FastAPI)
- **Framework:** FastAPI für eine hochperformante, asynchrone Python-API.
- **Datenbank & ORM:** SQLite mit SQLAlchemy zur Speicherung von Bewerbungen. Tabellen werden dynamisch auf Basis von Benutzereingaben oder CSV-Importen erstellt (`get_job_application_model`).
- **KI-Integration:** Gemini-Modell (`gemini-3.5-flash`) zur semantischen Analyse von E-Mails, Filtern von Spam und automatischem Extrahieren strukturierter JSON-Daten.
- **API-Endpunkte:**
  - `GET /api/applications` - Lädt Bewerbungen einer Tabelle.
  - `POST /api/applications` - Erstellt eine neue Bewerbung in einer Tabelle.
  - `PUT /api/applications/{id}` - Aktualisiert eine Bewerbung.
  - `DELETE /api/applications/{id}` - Löscht eine Bewerbung.
  - `GET /api/applications/tables` - Gibt alle in der DB registrierten Tabellen zurück.
  - `PUT /api/applications/tables/{table_name}` - Benennt eine Tabelle um (`ALTER TABLE RENAME TO`).
  - `DELETE /api/applications/tables/{table_name}` - Löscht/Leert eine Tabelle.
  - `POST /api/analyze-emails` - Analysiert Gmail-E-Mails via Gemini.
  - `POST /api/csv/upload` - Importiert eine neue Tabelle via CSV-Upload.
  - `GET /api/csv/download` - Exportiert eine Tabelle als CSV-Datei.

---

## 📁 Dateistruktur & Kernkomponenten

```text
├── backend/
│   ├── models/            # SQLAlchemy Datenmodelle (dynamische Tabellenerstellung)
│   ├── controllers/       # CRUD-Controller für Bewerbungen und CSV-Konvertierung
│   ├── routers/           # FastAPI Routen (applications, csv, email_analysis)
│   ├── schemas/           # Pydantic Schemata für API-Validierung
│   ├── services/          # Externe Services (z.B. Gemini API Integration)
│   ├── database.py        # SQLite Engine & Session-Konfiguration
│   ├── requirements.txt   # Python Abhängigkeiten
│   └── main.py            # FastAPI App & Middleware Routing
├── src/
│   ├── components/
│   │   ├── JobTable.tsx        # Interaktive Jobtabelle (Editierbar per Doppelklick, Spalten-Resize)
│   │   ├── Sidebar.tsx         # Collapsible Seitenleiste mit Sub-Tabs für einzelne Tabellen
│   │   └── StatsDashboard.tsx  # Metriken und Kacheln (Zusagen, Absagen, etc.) sowie interaktiver Tagesziel-Fortschrittsring
│   ├── pages/
│   │   ├── LandingPage.tsx     # Übersichtsseite mit Direktlinks
│   │   ├── JobTrackerPage.tsx  # Haupt-Tracker-View mit Gmail-Sync und Tab-Verwaltung
│   │   ├── JobSearchPage.tsx   # Jobsuche (Coming Soon)
│   │   └── ProfilePage.tsx     # Profil bearbeiten
│   ├── services/
│   │   ├── gmailService.ts     # Schnittstelle zur Gmail API
│   │   └── googleAuth.ts       # Google Sign-In via Firebase
│   ├── App.tsx                 # App-Routing, Tabellen- & Tab-Zustand (State Uplifting)
│   └── index.css               # Globale CSS-Styles und Tailwind-Konfiguration
├── package.json                # NPM Scripts (Vite Dev Server & FastAPI Dev Server)
├── tsconfig.json               # TypeScript Konfiguration
└── vite.config.ts              # Vite Konfiguration mit Backend Proxy (/api)
```

---

## ✨ Hauptfunktionen & Features

- **Automatisierter Gmail-Import:** Scannt und synchronisiert E-Mails via Google OAuth und extrahiert mithilfe der Gemini-API strukturierte Bewerbungsdaten.
- **Tagesziel-Tracker (Daily Goal):** Setzen Sie ein tägliches Bewerbungsziel. Die Anwendung zählt Ihre am aktuellen Tag eingetragenen Bewerbungen und visualisiert den Fortschritt über einen animierten, kreisförmigen SVG-Fortschrittsring.
- **Interview-Terminerinnerungen (Reminders):** Verknüpfen Sie anstehende Interview-Termine direkt mit Ihren Bewerbungen. Diese werden in der SQLite-Datenbank persistiert und automatisch bereinigt, sobald das Datum abgelaufen ist oder sich der Status der Bewerbung ändert.
- **Minimalistisches Stats-Dashboard:** Behalten Sie Ihre Gesamtzahl an Bewerbungen, aktive Interviews, Angebote und Absagen auf einen Blick im Auge.
- **Dynamische Tabellenverwaltung:** Legen Sie neue Bewerbungslisten an, benennen Sie diese um oder löschen Sie sie per Klick.

---

## 🚀 Lokale Installation und Ausführung

Befolgen Sie diese Schritte, um das Projekt auf Ihrem lokalen Gerät auszuführen:

### Voraussetzungen
- **Node.js** (Version 18 oder höher empfohlen)
- **Python** (Version 3.9 oder höher)

### 1. Repository klonen und Node-Abhängigkeiten installieren
Öffnen Sie das Terminal im Projektordner und installieren Sie die Node-Pakete:
```bash
npm install
```

### 2. Python Virtual Environment (virtuelle Umgebung) einrichten & aktivieren
Erstellen Sie eine virtuelle Umgebung im Stammverzeichnis des Projekts:
```bash
python -m venv .venv
```

Aktivieren Sie die virtuelle Umgebung:
* **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
* **Windows (CMD):**
  ```cmd
  .venv\Scripts\activate.bat
  ```
* **Mac/Linux:**
  ```bash
  source .venv/bin/activate
  ```

### 3. Python-Abhängigkeiten installieren
Stellen Sie sicher, dass die virtuelle Umgebung aktiviert ist, und installieren Sie die Python-Bibliotheken:
```bash
pip install -r backend/requirements.txt
```

### 4. Umgebungsvariablen & Konfiguration einrichten
1. Erstellen Sie eine `.env`-Datei im Projekt-Stammverzeichnis (Root) und tragen Sie Ihren Gemini API-Key ein:
   ```env
   GEMINI_API_KEY=dein_gemini_api_key_hier
   ```
2. Stellen Sie sicher, dass Ihre Firebase-Konfiguration in der Datei `firebase-applet-config.json` im Stammverzeichnis hinterlegt ist.

### 5. Anwendung im Entwicklungsmodus starten
Führen Sie im Stammverzeichnis folgenden Befehl aus:
```bash
npm run dev
```
Dieser Befehl startet **gleichzeitig**:
- Das Frontend (Vite) auf `http://localhost:5173`
- Das Backend (FastAPI) auf `http://127.0.0.1:8000`

Das Frontend leitet alle API-Anfragen an `/api/*` automatisch an den Python-Server weiter. Öffnen Sie einfach `http://localhost:5173` im Browser, um die Anwendung zu nutzen!

### 6. Code compilieren und Typen prüfen
Um sicherzustellen, dass keine TypeScript-Fehler vorliegen:
```bash
npm run lint
```
