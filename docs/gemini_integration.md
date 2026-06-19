# Dokumentation: Gemini API Integration, Retry-Robustheit & E-Mail-Chunking

Diese Dokumentation beschreibt die Integration, Fehlerbehebung und Performance-Optimierung bei der Kommunikation mit der Gemini API, insbesondere zur Vermeidung von `503 Service Unavailable` und `429 Rate Limit Exceeded` Fehlern, sowie die Umsetzung des globalen Fortschrittstrackings im Frontend.

---

## 1. Problemstellung
Beim Synchronisieren des Gmail-Postfaches wurden anfangs alle gefundenen E-Mails (z. B. 15 E-Mails) auf einmal in einem einzigen großen Prompt an die Gemini API übermittelt. 
Dies führte regelmäßig zu:
- **Überlastung (HTTP 503)** seitens der Gemini API, da das Prompt-Volumen und die Token-Anzahl zu hoch waren.
- **Ratenbegrenzungen (HTTP 429)**, da das Limit für gleichzeitige Anfragen überschritten wurde.
- **Verbindungsabbrüchen (Timeouts)** im Frontend, weil die Antwortzeit bei großen Datenmengen über das Standardlimit stieg.

---

## 2. Technische Lösung

Die Optimierung wurde auf vier Ebenen umgesetzt:

### A. Robuste Retry-Logik mit Tenacity (Exponential Backoff)
In `backend/services/gemini.py` wurde die Funktion `call_gemini_with_retry` auf die professionelle Python-Bibliothek `tenacity` umgestellt:
- **Exponentieller Random-Backoff**: Verwendet `@retry` mit `wait_random_exponential(min=1, max=60)` für eine schrittweise Erhöhung der Wartezeit zwischen den Anfragen (mindestens 1 Sekunde, höchstens 60 Sekunden), um dem API-Server Erholungsphasen zu geben.
- **Maximale Versuche**: Begrenzt auf `5` Versuche (`stop_after_attempt(5)`).
- **Fehlerspezifisches Retrying**: Es wird eine benutzerdefinierte Exception `Gemini503Error` geworfen und im Decorator mittels `retry_if_exception_type(Gemini503Error)` abgefangen. Dadurch wird die Retry-Logik **ausschließlich** bei echten Serverüberlastungen (HTTP 503) getriggert. Code-Fehler (wie z. B. HTTP 400 Bad Request oder HTTP 401 Unauthorized) scheitern sofort ohne wiederholte Anfragen.

### B. Batch-Processing (Chunking) der E-Mails
In der Funktion `analyze_emails` in `backend/services/gemini.py` wurde ein Batch-Verfahren implementiert:
- **Chunk-Größe**: Die Liste der empfangenen E-Mails wird in Blöcke von **maximal 5 E-Mails** unterteilt.
- **Asynchrone Iteration**: Die Chunks werden nacheinander asynchron verarbeitet.
- **Prompt-Generierung**: Für jeden Block wird separat ein strukturierter Prompt und das passende JSON-Schema aufgebaut und an Gemini geschickt.
- **Ergebnis-Aggregation**: Die vom JSON-Parser gelieferten Listen der einzelnen Chunks werden am Ende zu einer einzigen, flachen Liste vereint und an das Frontend zurückgegeben.

### C. Globaler Task-Context & Router-unabhängiger Ladebalken (React)
Da der Ladebalken beim Wechseln der Seite (z. B. vom Tracker zum Dashboard) verschwand, obwohl der API-Call im Hintergrund noch lief, wurde die UI-Ebene globalisiert:
- **GlobalTaskContext**: Ein React Context (`GlobalTaskProvider`), der den Ladevorgang (`isAITaskRunning`) und die Details (`syncProgress`, `syncPhase`, `syncDetails`) verwaltet.
- **Oberstes Layout**: Der Ladebalken wird in [App.tsx](file:///C:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/src/App.tsx) über den Routes gerendert und ist damit auf jeder Seite persistent sichtbar.
- **Hook-Verbindung**: [useGmailSync.ts](file:///C:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/src/hooks/useGmailSync.ts), [useJobSearch.ts](file:///C:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/src/hooks/useJobSearch.ts) und [CVAutoFiller.tsx](file:///C:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/src/components/CVAutoFiller.tsx) melden ihren Ladefortschritt an den globalen Context, wodurch Hintergrund-Tasks wie die E-Mail-Synchronisierung oder die Jobsuche auch nach dem Verlassen der ursprünglichen Seite sauber weiter visualisiert werden.

---

## 3. Timeout-Optimierung
- **Backend**: Das HTTPX-Timeout für die Kommunikation mit der Gemini API ist auf `120.0 Sekunden` in `call_gemini_with_retry` hochgesetzt, um insbesondere bei komplexen Live-Jobsuchen mit Google Search Grounding Zeitüberschreitungen zu verhindern.
- **Frontend**: Die Timeouts und das Abort-Limit wurden auf `90 bzw. 120 Sekunden` angehoben.
