# Gitarren-Akkord-Trainer

Progressive Web App für E-Gitarren-Anfänger: zeigt Griffbrett-Diagramme für
**G, Cadd9, Em7, Dsus4 und A7sus4**, bewertet die gespielten Akkorde in Echtzeit über
Mikrofon oder USB-Gitarreninterface (z. B. Rocksmith USB Guitar Adapter), enthält
ein interaktives Stimmgerät, einen Pentatonik-Trainer und einen Song-Modus mit
automatischer Akkordprüfung.

Reines Vanilla-JS – kein Framework, kein Build-Schritt, keine externen Requests.
Das Audio wird ausschließlich lokal im Browser analysiert. Trefferstatistiken
werden lokal gespeichert und lassen sich als CSV exportieren.

## Schnellstart

```bash
docker compose up --build
```

Danach **http://localhost:8080** öffnen und „🎤 Mikrofon aktivieren“ antippen.

Die App ist eine PWA: Nach dem ersten Laden funktioniert sie offline und lässt
sich über das Browsermenü installieren (Chrome/Edge: „App installieren“,
iOS Safari: „Zum Home-Bildschirm“).

## Mikrofon & HTTPS

`getUserMedia` funktioniert nur in einem **secure context**: `localhost` oder
HTTPS. Der Docker-Port 8080 auf dem eigenen Rechner ist mit `localhost`
abgedeckt. Für Zugriff vom Handy im LAN braucht es einen TLS-Reverse-Proxy
(z. B. Caddy, Traefik oder nginx mit Let's-Encrypt-Zertifikat).

Nach dem Start fragt der Browser nach der Mikrofonfreigabe. Bei USB-Interfaces
den Adapter als Eingang wählen – er erscheint im Settings-Sheet automatisch
unter „Audio-Eingang“.

## Docker & Persistenz

Der nginx-Container ist zustandslos: **kein Docker-Volume nötig**. Statistik
und Einstellungen liegen im `localStorage` des Browsers, nicht im Container.
Rebuilds und `docker compose down/up` ändern daran nichts, solange dieselbe
Origin verwendet wird.

Ein Volume ist nur für die Entwicklung sinnvoll, z. B.:

```yaml
volumes:
  - ./app:/usr/share/nginx/html:ro
```

Damit werden Änderungen an `app/` ohne Rebuild sichtbar. Für den produktiven
Betrieb bleibt das Image unverändert.

## Funktionen

- **Griffbrett-Diagramme** als SVG: 5 Bünde, 6 Saiten (E–A–D–G–B–E),
  Fingernummern, offene (○) und gedämpfte (×) Saiten, Bundnummern, dünner
  werdende Saiten.
- **Echtzeit-Erkennung** per Web Audio API mit Chromagramm und
  Cosine-Similarity, inklusive Stille-Erkennung, Glättung und Hysterese.
- **Stimm-Modus** für E2, A2, D3, G3, B3 und E4: YIN-Pitch-Erkennung,
  Cent-Zeiger (±50 Cent), In-Tune-Anzeige innerhalb ±5 Cent, Saitenauswahl und
  Referenzton.
- **Pentatonik-Trainer** für alle zwölf Grundtöne in Moll und Dur:
  12-Bund-Griffbrett mit Grundton-Hervorhebung, wählbare Anschlagszahl,
  Wiederholungen pro Ton und automatische Kontrolle der gespielten Töne.
- **Song-Modus** mit Akkord-Führung, Klick und automatischer Prüfung:
  **Wonderwall** (Oasis) und **When I Come Around** (Green Day), jeweils als
  Acht-Takt-Strophen-Loop auf `Em7 – G – Dsus4 – A7sus4`, Tempo 50–120 BPM,
  ohne Capo.
- **Statistik** pro Akkord (Treffer/Versuche) in `localStorage`, mit
  Gesamtquote, Reset und **CSV-Export** im Settings-Sheet.
- **Persistente Einstellungen**: Modus, Metronom-BPM, Pentatonik-Auswahl,
  Anschläge/Wiederholungen, Audio-Gerät und Tuner-Zielsaite überleben Reload
  und Container-Neustarts.
- **Metronom** 40–180 BPM (Standard **50 BPM**), 4/4, Beat-Dots mit Akzent auf
  Beat 1, Lookahead-Scheduling.
- **Gerätewechsel** ohne Neustart: alter Stream wird gestoppt, der
  `AudioContext` bleibt erhalten.
- **PWA**: Manifest, Icons, Service Worker mit App-Shell-Cache.
- **Deutsch**, mobil-first, dunkles Theme, max. 540 px Inhaltsbreite.

## Bedienung

1. „🎤 Mikrofon aktivieren“ antippen und die Browser-Freigabe erteilen.
2. Im Tab **Trainer** einen Akkord wählen und spielen. Die Karte zeigt den
   Zielakkord, die Erkennung zeigt Treffer, Fehlgriffe und die Quote.
3. Im Tab **Stimmen** die gewünschte Saite antippen, die Saite einzeln
   anschlagen und am Wirbel drehen, bis der Zeiger grün in der Mitte steht.
   „Referenzton …“ spielt die Sollfrequenz vor.
4. Im Tab **Pentatonik** Grundton und Tongeschlecht wählen, Anschläge und
   Wiederholungen pro Ton einstellen und „Übung starten“ antippen. Die App
   erwartet die Töne in der angezeigten Reihenfolge und quittiert jeden
   richtigen Anschlag automatisch.
5. Im Tab **Songs** ein Lied wählen, das Tempo einstellen und „Mitspielen
   starten“ antippen. Die App zeigt den aktuellen und nächsten Akkord, spielt
   den Klick und prüft die gespielten Akkorde.
6. Im Settings-Sheet (Regler-Symbol) Audio-Eingang wählen, die Statistik
   einsehen, als CSV exportieren oder zurücksetzen.

## Projektstruktur

```
.
├── app/
│   ├── index.html          # UI
│   ├── css/styles.css      # Dark Theme, Cards, Bottom-Sheet, Animationen
│   ├── js/
│   │   ├── chords.js       # Akkorddaten, Pitch-Classes, Templates
│   │   ├── detection.js    # Chromagramm, Cosine-Similarity, Hysterese
│   │   ├── pitch.js        # YIN-Pitch-Erkennung für das Stimmgerät
│   │   ├── tuning.js       # Saitenfrequenzen, Cent-Berechnung, Formatierung
│   │   ├── pentatonic.js   # Skalen, Übungsfolgen und 12-Bund-Griffbrett
│   │   ├── songs.js        # Song-Bibliothek und Akkord-Timing
│   │   ├── stats.js        # Statistik-Persistenz, Migration, CSV-Export
│   │   ├── prefs.js        # UI-Einstellungen persistent speichern
│   │   ├── fretboard.js    # SVG-Griffbrett-Renderer
│   │   ├── audio.js        # getUserMedia, AnalyserNode, Analyse-Loop
│   │   ├── metronome.js    # Lookahead-Metronom
│   │   └── app.js          # UI-Zustand, Modi, Events, Geräte
│   ├── icons/              # generierte PNG-Icons + Favicon
│   ├── manifest.json
│   └── sw.js
├── tests/                  # DSP-, Pitch-, Statistik- und Metronom-Tests
├── tools/generate_icons.py # Icon-Generator (Pillow)
├── nginx.conf              # Security-Header, gzip, Caching
├── Dockerfile              # nginx:alpine
└── docker-compose.yml      # Port 8080
```

## Erkennungsalgorithmus

1. **Eingang**: `getUserMedia` mit deaktivierter Echo-Unterdrückung,
   Rauschunterdrückung und Auto-Verstärkung, mono. So bleibt das Gitarrensignal
   unverfälscht.
2. **Analyse**: `AnalyserNode` mit `fftSize = 8192`, `smoothingTimeConstant =
   0.4`. Bei 48 kHz ergibt das ~5,9-Hz-Bins – genug Auflösung für die tiefen
   Gitarrensaiten.
3. **Stille-Erkennung**: RMS aus dem Zeitbereich; unter **−55 dBFS** gilt der
   Frame als still. Stille leert den Glättungspuffer, damit der nächste
   Anschlag nicht mit dem Ausklang vermischt wird.
4. **Chromagramm**: Für alle FFT-Bins von **70–600 Hz** oberhalb von
   **−82 dBFS** wird die lineare Magnitude `10^(dB/20)` berechnet. Über
   `MIDI = 69 + 12·log2(f/440)` landet jeder Bin in einer von 12
   Pitch-Classes; der Vektor wird auf Länge 1 normalisiert. 70 Hz schneidet
   Netzbrummen und Raumpfeifen ab, 600 Hz deckt die Grundtöne und die
   wichtigsten Obertöne der fünf Akkorde ab.
5. **Glättung**: Die letzten **8 Chromagramme** werden gemittelt. Bei einem
   Analyse-Tick alle 50 ms entspricht das **~400 ms** – lang genug gegen
   Zittern, kurz genug für direktes Feedback.
6. **Matching**: Für jeden Akkord existiert ein binärer Template-Vektor aus
   seinen Pitch-Classes (`G = [G,B,D]`, `Cadd9 = [C,E,G,D]`,
   `Em7 = [E,G,B,D]`, `Dsus4 = [D,G,A]`). Die **Cosine-Similarity** zwischen
   geglättetem Chroma und Template liegt zwischen 0 und 1.
7. **Entscheidung**: Ein Treffer gilt als sicher, wenn der beste Score
   **> 0.82** liegt. Der beste Treffer wird live angezeigt („Gehört: Em7“,
   wenn er nicht dem Zielakkord entspricht).
8. **Hysterese**: Nach einem gewerteten Anschlag wird nicht erneut gezählt,
   solange der Akkord klingt. Erst wenn die beste Ähnlichkeit wieder
   **< 0.5** fällt – der Spieler also loslässt oder wechselt – ist der
   Detektor für den nächsten Versuch entschärft. Das verhindert
   Mehrfachzählung bei langem Ausklingen.
9. **Statistik**: Jeder gewertete Anschlag zählt als Versuch; ein Treffer nur,
   wenn der beste Akkord dem gewählten Ziel entspricht. Bei Erfolg pulsiert die
   Detection-Card und das Gerät vibriert (sofern unterstützt).

Die Schwellwerte stehen zentral in `app/js/detection.js` (`DEFAULTS`) und
lassen sich dort tunen. Für stabile Ergebnisse: Gitarre stimmen, Steg-Tonabnehmer
oder Mikrofon nah an den Saiten, Verzerrung/Effekte aus, im Raum leise
Umgebung.

## Stimm-Modus (YIN)

Der Stimm-Modus nutzt denselben Mikrofon-Stream, schaltet die Akkord-Erkennung
aber ab und analysiert den Zeitbereich:

1. **Fenster**: die letzten **4096 Samples** (~85 ms bei 48 kHz) aus dem
   `AnalyserNode`. Das reicht für mehrere Perioden der tiefen E-Saite.
2. **Stille-Erkennung**: derselbe RMS-Gate wie im Trainer (−55 dBFS).
3. **YIN**: Für Verzögerungen von **60–500 Hz** wird die Differenzfunktion
   berechnet und kumulativ normiert (CMND). Das erste Minimum unter **0.18**
   ist die Periodendauer; eine parabolische Interpolation um das Minimum
   liefert die Frequenz auf Cent-Genauigkeit. Die Konfidenz ist
   `1 − CMND`; unter 0.6 wird kein Ton angezeigt.
4. **Anzeige**: Die Frequenz wird über
   `MIDI = 69 + 12·log2(f/440)` der nächsten Note zugeordnet. Die Abweichung
   zum gewählten Saitenziel in Cent ist `1200·log2(f/f_target)`; geglättet
   wird mit 65 % altem und 35 % neuem Wert bei 10 Updates/s.
5. **Bewertung**: Ab **±5 Cent** gilt die Saite als gestimmt (grün). Der
   Zeiger deckt **±50 Cent** ab; außerhalb wird er am Rand begrenzt. Liegt die
   erkannte Note mehr als einen Ganzton vom Ziel entfernt, meldet die App
   „Erkannt: … · Ziel …“ statt einer irreführenden Cent-Zahl.
6. **Referenzton**: Ein kurzer Triangle-Oszillator (1,6 s) spielt die
   Sollfrequenz der gewählten Saite über denselben `AudioContext`.

## Persistente Einstellungen

Unter `guitarTrainer.prefs.v1` speichert die App die zuletzt verwendeten
Einstellungen im Browser:

```json
{
  "mode": "pentatonic",
  "bpm": 123,
  "tuningStringIndex": 1,
  "scale": { "rootPc": 4, "type": "major", "attacks": 7, "repeats": 3 },
  "deviceId": "..."
}
```

- **Modus** (`trainer`, `tuner`, `pentatonic`, `song`)
- **BPM** des Metronoms (40–180)
- **Pentatonik**: Grundton, Moll/Dur, Anschläge und Wiederholungen pro Ton
- **Audio-Gerät** (Device-ID; bei nicht mehr vorhandenem Gerät wird auf den
  Standardeingang zurückgefallen)
- **Tuner-Zielsaite** (E2 bis E4)

Ungültige oder manipulierte Werte werden beim Laden begrenzt bzw. durch
Defaults ersetzt. Die Daten bleiben im Browser und sind an die Origin gebunden
(`localhost:8080`, `127.0.0.1:8080` und LAN-IP sind getrennte Speicher).

## Statistik & Export

Die Statistik liegt unter `guitarTrainer.stats.v2` in `localStorage`:

```json
{
  "version": 2,
  "correct": 7,
  "total": 12,
  "byChord": {
    "G": { "correct": 3, "total": 5 },
    "Cadd9": { "correct": 2, "total": 4 }
  },
  "updatedAt": "2026-11-11T15:03:30.021Z"
}
```

- Jeder gewertete Anschlag zählt für den **gewählten Zielakkord**; ein Treffer
  nur, wenn der erkannte Akkord dem Ziel entspricht.
- Beim Laden werden alte `guitarTrainer.stats.v1`-Daten
  (`{correct,total}`) automatisch migriert. Deren nicht zuordenbare Summe
  erscheint im Export als Zeile **„Altbestand (v1)“**.
- Der CSV-Export nutzt Semikolon und UTF-8-BOM (deutsches Excel), enthält eine
  Zeile pro Akkord plus **Gesamt** und wird als
  `akkord-statistik-JJJJ-MM-TT.csv` heruntergeladen.
- „Statistik zurücksetzen“ entfernt v1 und v2; ein Neuladen kann alte Daten
  nicht wiederherstellen.

## Pentatonik-Trainer

- **Skalen**: Moll-Pentatonik `[0, 3, 5, 7, 10]` und Dur-Pentatonik
  `[0, 2, 4, 7, 9]`, transponierbar auf alle zwölf Grundtöne. Das Griffbrett
  zeigt alle Skalentöne über zwölf Bünde; Grundtöne sind rot markiert.
- **Übungsfolge**: Die fünf Skalenstufen werden aufsteigend gespielt. Jeder Ton
  wird `Wiederholungen pro Ton`-mal erwartet, bis die eingestellte
  Gesamtzahl an Anschlägen erreicht ist. Bei 6 Anschlägen und 2× pro Ton ist
  die Folge also `A A C C D D`.
- **Automatische Prüfung**: Der Stimm-Modus läuft im Übungsbetrieb mit
  20 Updates/s. Ein Treffer wird nur gewertet, wenn die erkannte Pitch-Class
  zweimal hintereinander (ca. 100 ms) zum Zielton passt. Ein Ziel wird
  unabhängig von der Oktave akzeptiert, sodass dieselbe Note auf verschiedenen
  Saitenlagen gespielt werden kann.
- **Anschlags-Tor**: Nach einem Treffer muss der Ton abklingen, neu
  angeschlagen werden oder zu einem anderen Ton wechseln. Dadurch zählt ein
  langer Ton nicht mehrfach. Der gerade gewertete Ton wird beim Nachklingen
  nicht sofort als Fehler für den nächsten Zielton gezählt.
- **Fehler**: Ein falscher Ton löst „Ton passt nicht“ aus und nennt den
  erwarteten und den gehörten Ton; der Fortschritt bleibt stehen, bis der
  richtige Ton gespielt wird. Die Übung endet mit Trefferquote und Fehlerzahl.

## Song-Modus

Der Song-Modus führt durch einen Akkord-Loop und prüft die gespielten Akkorde
mit derselben Chroma-Erkennung wie der Trainer.

- **Bibliothek**: `app/js/songs.js`, aktuell **Wonderwall (Oasis)** und
  **When I Come Around (Green Day)**. Beide nutzen den Acht-Takt-Strophen-Loop
  `Em7 – G – Dsus4 – A7sus4` (zweimal), ein Akkord pro 4/4-Takt. „When I Come
  Around“ ist auf diese Folge verschoben.
- **Tempo**: 50–120 BPM, Standard je Song 87 BPM (Wonderwall) bzw. 98 BPM
  (When I Come Around). Der Regler zeigt zusätzlich die Geschwindigkeit
  relativ zum Original (100 % = Song-BPM).
- **Akkorde**: Alle Song-Akkorde sind auch im Trainer verfügbar; `A7sus4` ist
  als fünfter Trainer-Akkord ergänzt.
- **Ablauf**: aktueller und nächster Akkord, Griffbrett-Diagramm, Takt-Leiste,
  Klick und Beat-Dots. Nach acht Takten beginnt der Loop von vorn.
- **Prüfung**: Bei jedem Taktwechsel wird der Zielakkord gesetzt und der
  Detektor zurückgesetzt. Ein Treffer zählt nur, wenn der erkannte Akkord dem
  Ziel entspricht; Treffer/Versuche werden separat von der Akkordstatistik
  geführt.
- **Capo**: Beide Übungsversionen nutzen offene Akkordformen **ohne Capo**,
  damit die Erkennung zu den angezeigten Griffen passt.
- **Inhalte**: Es werden keine Originalaufnahmen, Lyrics oder Melodien
  eingebunden – nur Akkordfolge, Timing und ein synthetischer Klick.

## Tests

Die DSP-Kette, YIN-Erkennung, Pentatonik-Logik, Statistik und das Metronom sind
ohne Browser testbar. Die Tests synthetisieren Gitarrenakkorde und Saitentöne
mit Obertönen, führen eine echte FFT aus und prüfen unter anderem:

- Erkennung aller fünf Akkorde und der sechs offenen Saiten,
- Cent-Genauigkeit, Oktavfehler-Stabilität und Stille,
- Hysterese und Akkorddaten,
- Pentatonik-Intervalle, Übungsfolgen, Griffbrettpositionen und SVG,
- Song-Bibliothek, beide Strophen-Loops und A7sus4-Griff,
- Einstellungs-Persistenz inkl. Validierung und Grenzwerten,
- Statistik-Migration, Persistenz, CSV-Inhalt und Reset,
- Metronom-Standard 50 BPM und BPM-Grenzen.

```bash
node --test tests/
```

## Entwicklung ohne Docker

```bash
python3 -m http.server 8080 --directory app
```

`http://localhost:8080` ist ein secure context, daher funktioniert das Mikrofon
auch ohne TLS. Der Service Worker wird ebenfalls auf localhost registriert.

## Betrieb & Wartung

- **Cache aktualisieren**: Nach Änderungen an Dateien in `app/` die
  `CACHE_VERSION` in `app/sw.js` erhöhen **und** die Versions-Query in
  `app/index.html` sowie in der Precache-Liste anpassen (z. B. `?v=1.3.1`).
  So können installierte Clients nicht neues HTML mit altem JavaScript
  mischen.
- **Icons neu generieren**: `python3 tools/generate_icons.py` (benötigt Pillow).
- **Healthcheck**: `GET /healthz` liefert `ok`; der Container hat einen
  Docker-Healthcheck.
- **Sicherheit**: nginx liefert CSP, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` (Mikrofon nur self) und
  `X-Frame-Options`. Der Container läuft mit `no-new-privileges` und dropped
  Capabilities.
- **Datenschutz**: Es gibt keinen Backend-Call. Audio und Einstellungen bleiben
  im Browser; Statistik und Preferences liegen in `localStorage` und lassen
  sich im Settings-Sheet bzw. über die Browserdaten löschen.

## Troubleshooting

- **„Mikrofonzugriff verweigert“**: Freigabe in den Browser-Einstellungen
  erteilen und Seite neu laden.
- **Kein Gerät in der Liste**: Erst Mikrofon aktivieren – vor der Freigabe
  liefern Browser oft leere Gerätenamen. Danach „Geräte neu laden“.
- **Erkennung reagiert nicht**: Eingang prüfen, Gitarren-Lautstärke erhöhen,
  Verzerrung reduzieren; Pegelanzeige sollte deutlich über „still“ liegen.
- **Stimmgerät zeigt „Ton unklar“**: Nur eine Saite anschlagen, Ton sauber und
  ohne Effekte spielen, Mikrofon näher positionieren. Der erlaubte Bereich ist
  60–500 Hz; bei starkem Brummen oder Nebengeräuschen lieber den Referenzton
  nutzen.
- **Stimmgerät zeigt die falsche Note**: Die Zielsaite über die sechs Buttons
  wählen. „Erkannt: A2 · Ziel E2“ bedeutet, dass die A-Saite klingt, aber E2
  als Ziel eingestellt ist.
- **CSV-Export startet nicht**: Browser-Downloads für die Seite erlauben. Die
  Datei wird lokal aus `localStorage` erzeugt; es gibt keinen Server-Upload.
- **USB-Adapter fehlt**: Adapter anschließen, Settings öffnen, „Geräte neu
  laden“. Bei Linux ggf. `arecord -l` prüfen.
- **Tabs reagieren nicht / alte Version**: Im Settings-Sheet muss **Version
  1.3.1** stehen. Nach einem Image-Update `docker compose build --no-cache &&
  docker compose up -d` ausführen, die PWA schließen und neu öffnen. HTML und
  JavaScript sind mit `?v=1.3.1` versioniert, damit kein altes JS aus dem
  Browser- oder Service-Worker-Cache geladen wird.
- **Pentatonik-Übung zählt nicht weiter**: Töne einzeln und mit kurzer Pause
  spielen; bei wiederholtem gleichem Ton kurz abdämpfen. Die App prüft die
  Pitch-Class, nicht die Oktave. Bei zu leiser Gitarre Pegel erhöhen oder
  Eingang prüfen.
- **Song-Modus erkennt keinen Akkord**: Wonderwall als Übungsversion **ohne
  Capo** mit den angezeigten offenen Griffen spielen; mit Capo 2 verschieben
  sich die klingenden Töne und passen nicht zu den Templates. Akkord sauber
  und lange genug klingen lassen.
- **PWA installiert alte Version**: App schließen und neu öffnen; der Service
  Worker lädt im Hintergrund. Bei Entwicklung `CACHE_VERSION`, die
  Versions-Query in `index.html` und die Precache-Liste gemeinsam erhöhen und
  Hard-Reload.
