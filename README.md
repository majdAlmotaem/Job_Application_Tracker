# Entwickler-Dokumentation - SyncSheet (Job Application Tracker)

SyncSheet ist ein intelligenter Bewerbungs-Tracker, der E-Mails aus einem Gmail-Postfach automatisch auf Bewerbungsstatus (z. B. Bewerbung bestätigt, Intervieweinladung, Absage, Zusage) scannt, diese mithilfe der Gemini-API analysiert und die extrahierten Daten strukturiert in eine Google-Tabelle einträgt.

---

## 🛠️ Systemarchitektur

Die Anwendung ist als Fullstack-Webanwendung aufgebaut:

### 1. Frontend (React + Vite)
- **Framework & Styling:** React mit TypeScript und TailwindCSS für ein modernes, reaktionsschnelles Interface.
- **Animationen:** Framer Motion (`motion/react`) für flüssige Übergänge und UI-Interaktionen.
- **Authentifizierung:** Google OAuth via Firebase Authentication. Ermöglicht den sicheren Zugriff auf die Gmail- und Google Sheets APIs des Nutzers.
- **Datenhaltung:** Synchronisation direkt mit Google Sheets, mit einem Offline-Fallback über den `localStorage` des Browsers.

### 2. Backend (Express.js)
- **API-Endpunkt:** `/api/analyze-emails` zur Analyse von E-Mail-Inhalten.
- **KI-Integration:** Nutzt das `@google/genai` SDK mit dem Modell `gemini-3.5-flash`, um E-Mails semantisch zu analysieren, irrelevante E-Mails (Spam, Newsletter) auszufiltern und strukturierte JSON-Daten zu erzeugen.
- **Robustheit:** Implementiert einen robusten Exponential-Backoff-Mechanismus (`callGeminiWithRetry`), um Quotenüberschreitungen (429) und temporäre Serverfehler (503) abzufangen.

---

## 📁 Dateistruktur & Kernkomponenten

```text
├── server.ts               # Express-Server, Gemini-API-Integration & Retry-Logik
├── vite.config.ts          # Vite Konfiguration (Bundler & Server-Alias)
├── src/
│   ├── App.tsx             # Hauptkomponente (UI, Tabellenansicht, Synchronisations-Logik)
│   ├── gmailService.ts     # Schnittstelle zur Gmail API (Nachrichtensuche & Decodierung)
│   ├── googleAuth.ts       # Firebase Initialisierung & Google OAuth Flow
│   ├── sheetsService.ts    # Schnittstelle zur Google Sheets API (CRUD-Operationen auf Tabellen)
│   ├── types.ts            # TypeScript Typendefinitionen & Status-Normalisierung
│   └── index.css           # Globale Styles & Tailwind CSS Direktiven
```

---

## 🚀 Lokale Installation und Setup

### Voraussetzungen
- **Node.js** (Version 18 oder höher empfohlen)
- **Google Cloud / Firebase Project** mit aktivierten Gmail- und Google Sheets-APIs.

### 1. Repository klonen & Abhängigkeiten installieren
```bash
npm install
```

### 2. Umgebungsvariablen einrichten
Erstelle eine `.env` Datei im Stammverzeichnis und trage deinen Gemini API-Key ein:
```env
GEMINI_API_KEY=dein_gemini_api_key_hier
```

Stelle sicher, dass die Firebase-Konfiguration in der Datei `firebase-applet-config.json` hinterlegt ist:
```json
{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}
```

### 3. Anwendung im Entwicklungsmodus starten
```bash
npm run dev
```
Der Server startet standardmäßig auf Port `3000` (Frontend wird per Vite-Middleware ausgeliefert).

### 4. Produktions-Build erstellen und starten
```bash
npm run build
npm start
```

---

## 🔍 Wichtige Abläufe im Detail

### E-Mail-Analyse-Flow
1. Das Frontend ruft E-Mails ab, die auf eine vordefinierte Suchanfrage passen (z. B. `Bewerbung OR Interview OR Absage`).
2. Der E-Mail-Text wird bereinigt (HTML-Tags und Sonderzeichen entfernt) und auf max. 5000 Zeichen gekürzt.
3. Die Liste der E-Mails wird an `/api/analyze-emails` gesendet.
4. Gemini analysiert die E-Mails und gibt ein strukturiertes JSON-Array zurück.
5. Das Frontend vergleicht die Ergebnisse mit der Datenbank auf Dubletten und zeigt dem Nutzer neue Einträge (Kategorie: *Neue Bewerbung*) oder Statusänderungen (Kategorie: *Statusänderung*) zur Übernahme an.
