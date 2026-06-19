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

### C. Hartes Client-Timeout (Vermeidung von Ghost-Anfragen)
Um Ressourcenverschwendung auf Seiten von Google durch hängengebliebene Anfragen ("Ghost-Anfragen") zu vermeiden, wurde ein hartes Client-Timeout auf Verbindungsebene eingeführt:
- **Aktives Schließen der Verbindung (TCP Disconnect)**: Jeder einzelne HTTP-Post-Request an die Gemini-Schnittstelle wird mit einem strikten Limit von `30.0` Sekunden begrenzt (`timeout=httpx.Timeout(30.0)`).
- **Ressourcenfreigabe**: Antwortet die API nach 30 Sekunden nicht, schließt der Client die Verbindung aktiv. Dies signalisiert Google, die blockierte Anfrage aus der internen Warteschlange zu verwerfen, sodass keine unnötigen API-Gebühren anfallen.
- **Retry-Abhängigkeit**: Das erzwungene Timeout wirft eine `httpx.TimeoutException`. Die umgebende Tenacity-Logik fängt diese Exception ab und führt den Request mit exponentiellem Backoff im nächsten Versuch aus.

---

## 3. Timeout-Konfiguration
- **Gesamtes Session-Timeout (Backend)**: Der `httpx.AsyncClient` ist für die gesamte Sitzung mit einem Limit von `120.0` Sekunden konfiguriert (erforderlich für Live-Jobsuchen mit aufwändigem Google Search Grounding).
- **Einzelner Request (Backend)**: Jede einzelne Anfrage bricht nach `30.0` Sekunden hart ab (TCP Disconnect), um Ghost-Anfragen zu unterbinden, und wird per Tenacity wiederholt (bis zu 10 Versuche).
- **Frontend (Gmail Sync)**: Das API-Aufruf-Timeout für die E-Mail-Synchronisierung `/api/analyze-emails` wurde mittels `AbortController` auf `10 Minuten` (`600 Sekunden`) angehoben, da die serverseitige Retry-Logik bei wiederholten Gemini-API-Fehlern (HTTP 503) bis zu 5 Minuten beanspruchen kann.
- **Frontend (Andere)**: Die Timeout-Grenzen für andere API-Aufrufe (wie z. B. CV-Extraktion) liegen bei `90` Sekunden.
