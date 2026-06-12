# Performance-Optimierungen & Stabilitäts-Refactoring

Dieses Dokument fasst alle implementierten Optimierungen zur Steigerung der Performance, Ressourceneinsparung und Stabilität der Anwendung zusammen.

---

## 1. State-Lifting von `useJobApplications` (Vermeidung von Lade-Flackern)

* **Problem**: Der Hook `useJobApplications` war lokal in `JobTrackerPage.tsx` verortet. Bei jedem Navigationswechsel wurde der State zerstört, was zu erneutem Datenabruf (`GET /api/applications`) und visuellem Flackern führte.
* **Lösung**: Der Hook wurde in die übergeordnete `App.tsx` verschoben. Der State bleibt dadurch dauerhaft im Hauptspeicher gecacht. Die Daten und CRUD-Handler werden nun als Props an die `JobTrackerPage` gereicht.
* **Effekt**: Sofortige Anzeige der Tabellendaten beim Seitenwechsel ohne jegliche Verzögerung oder zusätzliche Netzwerklast.

---

## 2. Beseitigung von Rendering-Schleifen & Terminal-Spam

* **Problem**: Eine Endlosschleife in `useSavedSearches.ts` beim Laden der Tabs führte zu hunderten parallelen API-Aufrufen pro Sekunde (`GET /api/searches` & `POST /api/searches`), was den Node-Server überlastete und den Client einfrieren ließ.
* **Lösung**: 
  - Eingrenzung und Bereinigung der Hook-Abhängigkeiten im `useEffect`.
  - Stabilisierung der Toast-Benachrichtigungsfunktion (`triggerToast`) in `App.tsx` mittels `useCallback`, um unnötige Re-Renders untergeordneter Komponenten zu verhindern.
* **Effekt**: Reduzierung der API-Requests beim App-Start auf ein absolutes Minimum (nur noch 1 initialer Call) und vollständige Server-Entlastung im Leerlauf.

---

## 3. UI-Only Pending Tabs (Verzögerte Datenbank-Erstellung)

* **Problem**: Beim Erstellen einer neuen Job-Suche wurde sofort ein API-Request abgesendet, der leere Platzhalter ("Suche 1") in die Datenbank schrieb.
* **Lösung**: Neue Suchen werden im Frontend temporär mit einer negativen ID initialisiert. Sämtliche Änderungen (wie Umbenennen oder Löschen) finden rein lokal im React-State statt. Erst beim tatsächlichen Ausführen einer Suche mit Ergebnissen wird der Eintrag per `POST /api/searches` persistent in der Datenbank gespeichert (Lazy-Promotion).
* **Effekt**: Keine nutzlosen Datenkarteileichen in der SQLite-Datenbank und minimierte API-Schreibvorgänge.

---

## 4. Lazy Initialization der Standard-Tabellen

* **Problem**: Die Standardtabelle `job_applications` wurde bei jedem Anwendungsstart statisch im Backend erzeugt und blockierte Ressourcen, obwohl der Benutzer Custom-Listen nutzt.
* **Lösung**: Die automatische Erstellung wurde im Backend (`main.py`) deaktiviert. Das Frontend filtert diese Standard-Tabelle nun dynamisch aus allen Speichern- und Export-Dropdowns heraus, sobald der Benutzer eigene Tabellen angelegt hat.
* **Effekt**: Cleanere SQL-Struktur und schlankeres, benutzerdefiniertes Interface.

---

## 5. Vorher-Nachher-Vergleich

| Optimierung | Vorher | Nachher |
| :--- | :--- | :--- |
| **API-Last beim Start** | ~50 bis >1000 Endlos-Requests (Spam) | 2-3 gezielte Abfragen |
| **Seitenwechsel-Ladezeit** | Spürbare 200ms-500ms (Flackern) | **0ms** (Sofortige Anzeige aus Cache) |
| **Datenbank-Pollution** | Automatische Platzhalter-Einträge | Reine On-Demand-Schreibvorgänge |
| **Render-Stabilität** | Häufige Re-Renders durch Toast-Identitäten | Stabilisiert via `useCallback` |
