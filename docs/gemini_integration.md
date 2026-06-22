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

## 2. Technische Lösung und Modularisierung

Die Optimierung und Architektur wurde in einem strukturierten Package unter [backend/services/gemini/](file:///c:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/backend/services/gemini/) umgesetzt, aufgeteilt in folgende Module:

### A. Basis-Client & Retry-Logik (client.py)
In [client.py](file:///c:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/backend/services/gemini/client.py) wurde die zentrale Logik zur Kommunikation mit der Gemini API ausgelagert:
- **Tenacity (Exponential Backoff)**: Die Funktion `call_gemini_with_retry` verwendet die `@retry`-Bibliothek mit `wait_random_exponential(multiplier=2, min=3, max=60)` für eine schrittweise Erhöhung der Wartezeit zwischen den Anfragen (mindestens 3 Sekunden, höchstens 60 Sekunden), um dem API-Server Erholungsphasen zu geben.
- **Maximale Versuche**: Begrenzt auf `3` Versuche (`stop_after_attempt(3)`).
- **Fehlerspezifisches Retrying**: Es wird eine benutzerdefinierte Exception `Gemini503Error` geworfen und im Decorator mittels `retry_if_exception_type(Gemini503Error)` abgefangen. Dadurch wird die Retry-Logik **ausschließlich** bei echten Serverüberlastungen (HTTP 503) getriggert.
- **Hartes Client-Timeout**: Jeder einzelne HTTP-Post-Request an die Gemini-Schnittstelle wird mit einem Limit von `300.0` Sekunden begrenzt (`timeout=httpx.Timeout(300.0)`).

### B. Batch-Processing & E-Mail-Analyse (email_analyzer.py)
In [email_analyzer.py](file:///c:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/backend/services/gemini/email_analyzer.py) wurde das Batch-Verfahren zur E-Mail-Synchronisierung implementiert:
- **Chunk-Größe**: Die Liste der empfangenen E-Mails wird in Blöcke von **maximal 5 E-Mails** unterteilt.
- **Asynchrone Iteration**: Chunks werden nacheinander asynchron verarbeitet, um den API-Server nicht zu überlasten.
- **Ergebnis-Aggregation**: Die vom JSON-Parser gelieferten Listen der einzelnen Chunks werden am Ende zu einer einzigen Liste vereint.

### C. Live-Jobsuche & Matching (job_matcher.py)
In [job_matcher.py](file:///c:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/backend/services/gemini/job_matcher.py) befindet sich die Logik für Websuchen:
- **Google Search Integration**: Verwendet das Google Search Tool von Gemini, um aktuelle Stellenausschreibungen live im Web zu finden und passende Matches inklusive Original-Links und Match-Begründungen zurückzugeben.

### D. CV-Extraktion & Autofill (cv_generator.py)
In [cv_generator.py](file:///c:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/backend/services/gemini/cv_generator.py) liegt die CV-Parser-Logik:
- **Autofill-Logik**: Analysiert rohen Lebenslauftext und extrahiert strukturierte Daten wie angestrebte Jobtitel, bevorzugte Standorte, Anstellungsarten und bis zu 10 Schlüsselkompetenzen in ein sauberes JSON-Schema.

### E. Transparente Schnittstelle (__init__.py)
Die Datei [__init__.py](file:///c:/Users/PCUser/Documents/GitHub/Job_Application_Tracker/backend/services/gemini/__init__.py) exportiert die Kernfunktionen (`analyze_emails`, `search_live_jobs`, `extract_cv_info`), damit andere Komponenten der Anwendung (wie Router) die Module importieren können, ohne von der internen Ordnerstruktur wissen zu müssen.


---

## 3. Timeout-Konfiguration
- **Gesamtes Session-Timeout (Backend)**: Der `httpx.AsyncClient` ist für die gesamte Sitzung mit einem Limit von `300.0` Sekunden konfiguriert (erforderlich für Live-Jobsuchen mit aufwändigem Google Search Grounding).
- **Einzelner Request (Backend)**: Jede einzelne Anfrage bricht nach `300.0` Sekunden hart ab, um Ghost-Anfragen zu unterbinden, und wird per Tenacity wiederholt (bis zu 3 Versuche).
- **Frontend (Gmail Sync)**: Das API-Aufruf-Timeout für die E-Mail-Synchronisierung `/api/analyze-emails` wurde mittels `AbortController` auf `10 Minuten` (`600 Sekunden`) angehoben, da die serverseitige Retry-Logik bei wiederholten Gemini-API-Fehlern (HTTP 503) einige Zeit beanspruchen kann.
- **Frontend (Andere)**: Die Timeout-Grenzen für andere API-Aufrufe (wie z. B. CV-Extraktion) liegen bei `90` Sekunden.
