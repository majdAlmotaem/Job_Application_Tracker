# Dokumentation: Zentralisiertes Logging-System

Diese Dokumentation beschreibt die Konfiguration und Funktionsweise des stack-übergreifenden Logging-Systems im Job Application Tracker.

---

## 1. Backend-Logging (FastAPI)

Das Backend nutzt das Standard-Python-Modul `logging` zur Protokollierung aller serverseitigen Aktionen. Die Einrichtung erfolgt in [logger.py](../backend/utils/logger.py).

### Konfiguration des Loggers
- **Zwei getrennte Handler**:
  1. **Konsole (`StreamHandler`)**: Ist auf das Level `WARNING` (bzw. `CRITICAL` im Live-Modus) gesetzt. Dadurch bleibt das Entwickler-Terminal frei von redundantem Rauschen (wie z. B. Pydantic-Validierungen oder statischen Dateizugriffen).
  2. **Datei (`RotatingFileHandler`)**: Schreibt alle Logs (ab Level `DEBUG`) in die Logdatei.
- **Logdatei-Rotation**: Schreibt in `logs/app.log`. Sobald die Datei eine Größe von 5 MB erreicht, wird sie automatisch rotiert (es werden bis zu 3 Backup-Dateien vorgehalten).

### HTTP-Anfragen-Middleware
In `backend/main.py` fängt eine HTTP-Middleware jede eingehende Anfrage ab und protokolliert:
- HTTP-Methode (GET, POST, etc.)
- Request-Pfad
- Rückgabe-Statuscode (z. B. 200 OK, 500 Internal Server Error)
- Verarbeitungsdauer in Millisekunden

Dies ermöglicht eine präzise Überwachung der Performance und die Identifizierung langsamer API-Endpunkte (wie der Gemini-Integration).

---

## 2. Frontend-Logging (React)

Für den React-Client wurde in [logger.ts](../src/utils/logger.ts) ein typsicherer Logger implementiert:
- **Timestamping**: Jeder Logeintrag wird automatisch mit einem ISO-Zeitstempel und dem Präfix `[Frontend]` versehen.
- **Umgebungsweiche**:
  - Normale Logs (`info`, `log`) werden in der Produktionsumgebung automatisch unterdrückt.
  - Fehlermeldungen und Warnungen (`error`, `warn`) werden unabhängig von der Umgebung immer in der Konsole ausgegeben.

---

## 3. Fehlerbehebung: Uvicorn-Reload-Loop (Wichtig)

### Das Problem
Zu Beginn wurden die Logdateien im Unterordner `backend/logs/` abgelegt. Da Uvicorn (der Entwicklungsserver des Backends) den Ordner `backend/` auf Dateiänderungen überwacht (Hot-Reloading), löste jeder Schreibvorgang in die Logdatei (`app.log`) einen Server-Neustart aus. Dies führte zu einer **Endlosschleife an Neustarts** während API-Anfragen verarbeitet wurden.

### Die Lösung
1. Der Pfad der Logdatei wurde aus dem `backend/`-Verzeichnis heraus an die Wurzel des Repositorys verschoben (`/logs/app.log`).
2. Der Ordner `/logs/` sowie der alte Ordner `backend/logs/` wurden in [.gitignore](../.gitignore) eingetragen, um zu verhindern, dass lokale Ablaufprotokolle versehentlich in Git eingecheckt werden.
