# 💼 SyncSheet — Job Application Tracker

SyncSheet ist die All-in-One-Plattform zur Organisation, Verwaltung und Automatisierung deiner Jobsuche. Entwickelt für moderne Professionals, vereint SyncSheet eine nahtlose Gmail-Integration, KI-gestützte E-Mail- und Stellenanalyse (sowohl mit lokalen Open-Source-Modellen via Ollama als auch mit Cloud-APIs wie Google Gemini & OpenAI), einen professionellen Lebenslauf-Designer und interaktive Dashboards in einer modernen Fullstack-Webanwendung.

---

## 🌟 Hauptfunktionen & Pages

### 1. 🏠 Startseite (Home)
Der zentrale Einstiegspunkt in deine Jobsuche mit schnellem Zugriff auf alle Module.

![Startseite](assets/images/home.png)

---

### 2. 📊 Dashboard
Verfolge deinen Fortschritt wie ein persönliches Fitness-Ziel!
* **Aktivitätsringe:** Apple-Watch-inspirierte konzentrische Ringe zeigen dein Tagesziel, anstehende Interviews und deine Erfolgsquote (Zusagen) in Echtzeit.
* **Terminplaner:** Automatisch verwaltete Interview-Termine und Erinnerungen.

![Dashboard](assets/images/Dashboard.png)

---

### 3. 📥 Job-Tracker & Gmail-Sync
Das Herzstück deiner Bewerbungsorganisation.
* **Intelligenter Gmail-Import:** Verbinde dein Gmail-Konto und lasse die angebundene KI deinen Posteingang nach Bewerbungsaktualisierungen scannen (Bestätigungen, Einladungen, Absagen, Statuswechsel).
* **Interaktive Tabellen:** Bewerbungen in einer flexiblen Tabelle verwalten, per Inline-Editing direkt anpassen und Spaltenbreiten nach Wunsch justieren.
* **Multi-Tabellen- & CSV-Support:** Beliebig viele eigene Tabellen und Listen anlegen oder bestehende Bewerbungslisten via CSV importieren und exportieren.

![Job-Tracker](assets/images/Bewerbungs-tracker.png)

---

### 4. 🔍 Jobsuche & KI-Matching
Finde passende Stellenangebote direkt in der App.
* **Live-Suche:** Echtzeit-Stellensuche auf Stellenportalen.
* **KI-Matching:** Analysiert die Passgenauigkeit gefundener Stellen mit deinem Profil und liefert eine schriftliche Begründung (Match-Begründung).

![Jobsuche Ergebnisse](assets/images/job-suche1.png)
![Jobsuche Detailansicht](assets/images/job-suche2.png)

---

### 5. 📄 Lebenslauf-Generator (CV Maker)
Erstelle im Handumdrehen einen überzeugenden Lebenslauf.
* **Live-A4-Vorschau:** Sieh alle Änderungen sofort in einer maßstabsgetreuen Druckansicht.
* **Themes & Layouts:** Wähle aus abgestimmten Farbthemen und professionellen Typografien.
* **Direktdruck & PDF-Export:** Drucke den Lebenslauf direkt aus dem Browser oder speichere ihn als PDF.

![CV Maker](assets/images/cv-maker.png)

---

## 🚀 Schnellstart & Lokales Setup

Folge diesen einfachen Schritten, um SyncSheet auf deinem lokalen Rechner einzurichten und zu starten.

### 📋 Voraussetzungen
- **Node.js** (v18 oder höher empfohlen) & **npm**
- **Python** (Version 3.10 oder höher)
- *(Optional für lokale KI)*: [Ollama](https://ollama.com/) installiert und gestartet

---

### 1. Repository klonen & Frontend-Pakete installieren

```bash
git clone https://github.com/majdAlmotaem/Job_Application_Tracker.git
cd Job_Application_Tracker
npm install
```

---

### 2. Python Virtual Environment (`.venv`) einrichten

> [!IMPORTANT]
> Die Start-Skripte in `package.json` erwarten die virtuelle Umgebung im Verzeichnis `.venv`. Bitte erstelle die Umgebung daher exakt mit diesem Namen im Projekt-Hauptordner.

**Auf Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

**Auf Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

**Auf Windows (CMD):**
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r backend\requirements.txt
```

---

### 3. Konfigurationsdateien anlegen

SyncSheet benötigt zwei Konfigurationsdateien im Hauptverzeichnis:

#### a) `.env` (Anwendungs-URL)
Erstelle die `.env`-Datei aus der Vorlage:
```bash
cp .env.example .env
```
Standardinhalt (`http://localhost:3000`):
```env
APP_URL="http://localhost:3000"
```

#### b) `firebase-applet-config.json` (Google/Gmail-Authentifizierung)
Für die Anmeldung mit Google und den Gmail-Sync nutzt die Anwendung Firebase Auth. Erstelle die Datei aus der Vorlage:
```bash
cp firebase-applet-config.json.example firebase-applet-config.json
```
Trage dort deine Firebase-Web-App-Konfigurationsdaten ein:
```json
{
  "apiKey": "DEIN_FIREBASE_API_KEY",
  "authDomain": "dein-projekt.firebaseapp.com",
  "projectId": "dein-projekt",
  "storageBucket": "dein-projekt.firebasestorage.app",
  "messagingSenderId": "DEINE_SENDER_ID",
  "appId": "DEINE_APP_ID"
}
```

---

### 4. Anwendung starten

Starte Frontend und Backend gleichzeitig mit einem einzigen Befehl:

```bash
npm run dev
```

Hierbei wird gestartet:
- 🌐 **Frontend (Vite):** [http://localhost:3000](http://localhost:3000)
- ⚙️ **Backend (FastAPI):** [http://127.0.0.1:8000](http://127.0.0.1:8000) (mit automatischer Weiterleitung über den Vite-Proxy `/api`)

Öffne einfach **[http://localhost:3000](http://localhost:3000)** im Browser!

---

### 5. KI-Modell einrichten (Lokales Ollama oder Cloud-API)

Nach dem ersten Start kannst du dein gewünschtes Sprachmodell direkt in der Web-Oberfläche auswählen und konfigurieren:

1. Klicke im Menü links unten auf **Einstellungen** (Zahnrad) ➔ Reiter **KI-Modelle**.
2. Wähle deinen bevorzugten Anbieter:
   - **Lokales Modell (Ollama):** 
     - Stelle sicher, dass Ollama läuft (`ollama serve` oder Ollama App gestartet).
     - SyncSheet erkennt installierte Modelle (z. B. `llama3.2`, `mistral`, `qwen2.5`) automatisch per Dropdown!
     - Enthält eine 1-Klick-Schaltfläche zum Freigeben des Arbeitsspeichers (RAM-Unload).
   - **Google Gemini:** 
     - Trage deinen Google AI Studio API-Key ein und wähle z. B. `gemini-2.5-flash`.
   - **OpenAI / Kompatibel:** 
     - Trage deinen API-Key und das Modell (z. B. `gpt-4o-mini`) ein.
3. Klicke auf **Verbindung testen** und speichere die Konfiguration als Standardmodell.

---

## 🛠️ Verfügbare NPM-Skripte

| Befehl | Beschreibung |
| :--- | :--- |
| `npm run dev` | Startet Frontend und Backend parallel im Entwicklungsmodus (Hot Reloading). |
| `npm run dev:frontend` | Startet nur den Vite Dev-Server auf Port 3000. |
| `npm run dev:backend` | Startet nur den FastAPI Uvicorn-Server auf Port 8000. |
| `npm run build` | Baut das TypeScript-Frontend für den Produktionsbetrieb (`dist/`). |
| `npm run lint` | Führt die TypeScript-Typüberprüfung durch (`tsc --noEmit`). |

---

## 🔒 Architektur & Sicherheit

- **SQLite WAL-Modus (Write-Ahead Logging):** Parallele Lese- und Schreibzugriffe ohne Sperrkonflikte (`busy_timeout = 15s`).
- **Sichere API-Authentifizierung:** Keine Übertragung von API-Keys in URL-Parametern; Bereinigung sensibler Tokens in Logdateien.
- **SSRF-Schutz:** Absicherung aller externen Endpunkte gegen Abfragen von Metadaten- und internen IP-Bereichen.
- **XSS-Schutz:** Sanitisierung aller extern generierten Hyperlinks auf `http://` und `https://`.

---

## 📖 Detaillierte Entwickler-Dokumentation

Eine vollständige technische Beschreibung der Architektur, der Datenbankmodelle und des Controllers findest du hier:

👉 **[Zur Entwickler-Dokumentation](docs/developer_documentation.md)**
