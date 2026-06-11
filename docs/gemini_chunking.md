# Dokumentation: Gemini API Integration & Email-Chunking

Diese Dokumentation beschreibt die Fehlerbehebung und Performance-Optimierung bei der Analyse von E-Mails mittels Gemini API, insbesondere zur Vermeidung von `503 Service Unavailable` und `429 Rate Limit Exceeded` Fehlern.

---

## 1. Problemstellung
Beim Synchronisieren des Gmail-Postfaches wurden anfangs alle gefundenen E-Mails (z. B. 15 E-Mails) auf einmal in einem einzigen großen Prompt an die Gemini API übermittelt. 
Dies führte regelmäßig zu:
- **Überlastung (HTTP 503)** seitens der Gemini API, da das Prompt-Volumen und die Token-Anzahl zu hoch waren.
- **Ratenbegrenzungen (HTTP 429)**, da das Limit für gleichzeitige Anfragen überschritten wurde.
- **Verbindungsabbrüchen (Timeouts)** im Frontend, weil die Antwortzeit bei großen Datenmengen über das Standardlimit stieg.

---

## 2. Technische Lösung

Die Optimierung wurde auf drei Ebenen umgesetzt:

### A. Robuste Retry-Logik mit sanfterem Backoff
In `backend/services/gemini.py` wurde die Funktion `call_gemini_with_retry` angepasst:
- **Max. Retries**: Erhöht auf `4` Versuche.
- **Start-Verzögerung (`delay_ms`)**: Erhöht auf `2000ms` (2 Sekunden).
- **Exponentieller Backoff**: Die Wartezeit verdoppelt sich nach jedem fehlgeschlagenen Versuch, sodass die API Zeit hat, sich zu erholen.
- **Sofortiges Scheitern bei Client-Fehlern**: HTTP-Fehlercodes wie `400` oder `401` werfen sofort eine Exception, anstatt in die Retry-Schleife zu laufen.

### B. Batch-Processing (Chunking) der E-Mails
In der Funktion `analyze_emails` in `backend/services/gemini.py` wurde ein Batch-Verfahren implementiert:
- **Chunk-Größe**: Die Liste der empfangenen E-Mails wird in Blöcke von **maximal 5 E-Mails** unterteilt.
- **Asynchrone Iteration**: Die Chunks werden nacheinander asynchron verarbeitet.
- **Prompt-Generierung**: Für jeden Block wird separat ein strukturierter Prompt und das passende JSON-Schema aufgebaut und an Gemini geschickt.
- **Ergebnis-Aggregation**: Die vom JSON-Parser gelieferten Listen der einzelnen Chunks werden am Ende zu einer einzigen, flachen Liste vereint und an das Frontend zurückgegeben.

### C. Visualisierung des Synchronisations-Fortschritts (Frontend)
Um dem Benutzer eine visuelle Rückmeldung während der asynchronen Chunk-Verarbeitung zu geben:
- Es wurde eine **Fortschrittsanzeige (Progress Bar)** in die Synchronisationskarte integriert.
- Während des Scans simuliert die Oberfläche einen geschmeidigen Fortschritt (15% bis 95%), der sich an der Anzahl der berechneten Blöcke (Chunks) orientiert.
- Die Statustexte wechseln passend zum aktuellen Block (z. B. *"Analysiere E-Mails (Block 1/3)..."*, *"Ergebnisse werden strukturiert..."*).

---

## 3. Timeout-Optimierung
- **Backend**: Das HTTPX-Timeout für die Kommunikation mit der Gemini API wurde auf `60.0 Sekunden` gesetzt.
- **Frontend**: Der Fetch-Request zur E-Mail-Analyse und der CV-Auto-Filler wurden mit einem ausreichend großen Abort-Limit bzw. Timeout konfiguriert (bis zu `90 Sekunden`), um Abbrüche bei Auslastung zu verhindern.
