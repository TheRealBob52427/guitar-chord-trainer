# Gitarren-Akkord-Trainer

Progressive Web App für E-Gitarren-Anfänger: zeigt Griffbrett-Diagramme für
**Em, Am, G, C, Cadd9, Em7, Dsus4, A7sus4, E7 und F**, bewertet die gespielten
Akkorde in Echtzeit über Mikrofon oder USB-Gitarreninterface (z. B. Rocksmith
USB Guitar Adapter), enthält ein interaktives Stimmgerät, einen
Pentatonik-Trainer mit fünf Pattern, das CAGED-System, einen Riff-Modus für
Einzelnoten und einen Song-Modus mit automatischer Akkordprüfung.

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
  werdende Saiten. Höhere Lagen (CAGED) werden mit absoluten Bundzahlen und
  ohne Sattel gezeichnet.
- **Grundakkorde Em und Am** als offene Voicings, dazu G, C, Cadd9, Em7,
  Dsus4, A7sus4, E7 und F. Jeder Akkord lässt sich mit einem Klick als
  E-Gitarren-Strum anhören.
- **CAGED-System** im Trainer: die fünf beweglichen Dur-Formen C, A, G, E und
  D für jeden Grundton, mit Grundton-Lage und Griffbrett-Diagramm.
- **Echtzeit-Erkennung** per Web Audio API mit Chromagramm und
  Cosine-Similarity, inklusive Stille-Erkennung, Glättung und Hysterese.
- **Stimm-Modus** für E2, A2, D3, G3, B3 und E4: YIN-Pitch-Erkennung,
  Cent-Zeiger (±50 Cent), In-Tune-Anzeige innerhalb ±5 Cent, Saitenauswahl,
  **Auto-Erkennung der angeschlagenen Saite** und Referenzton.
- **Pentatonik-Trainer** für alle zwölf Grundtöne in Moll und Dur: fünf
  Pattern pro Skala, **nur das ausgewählte Pattern** wird auf dem Griffbrett
  angezeigt, **zwölf Töne pro Tonfolge**, wählbare Wiederholungen pro Ton,
  optionale **absteigende Tonfolge (rückwärts)**, **Vorspielen des Pattern**
  und automatische Kontrolle der gespielten Töne.
- **Gitarrenklang** in allen Modi: gezupfte Saiten werden per
  Karplus-Strong-Synthese mit Anschlagskammfilter, Röhren-Sättigung und
  Cabinet-Filter erzeugt – Referenztöne, Skalen, Riffs und Akkorde klingen
  nach E-Gitarre statt nach Sinuston.
- **Riff-/Einzelnoten-Modus** mit automatischer Tonprüfung: **Seven Nation
  Army** (The White Stripes) und **Californication** (Red Hot Chili Peppers)
  als Einzelnoten-Folgen, Griffbrett mit Positionsmarkierung (5–12 Bünde je
  nach Lage), Vorspielen im Originaltempo und zuschaltbarem Klick.
- **Hilfe-Modus**, der die verwendeten Griffbrett-Notationen erklärt:
  Akkord-Diagramme, Pentatonik-Griffbrett, Stimmgerät und Übungsfolge.
- **Song-Modus** mit Akkord-Führung, Klick und automatischer Prüfung:
  **Wonderwall** (Oasis), **Don’t Look Back in Anger** (Oasis) und
  **When I Come Around** (Green Day), jeweils als Acht-Takt-Loop,
  Tempo 50–120 BPM, ohne Capo.
- **Play-Along (Real Instrument)**: Guitar-Pro-Import (`.gp`, `.gp3`,
  `.gp4`, `.gp5`, `.gpx`), Track-Auswahl, scrollender Noten-Highway,
  Trefferbewertung **im Takt** oder **Note für Note** (das Lied wartet),
  Tempo 50–100 %, Klick und Live-Statistik.
- **Statistik** pro Akkord (Treffer/Versuche) in `localStorage`, mit
  Gesamtquote, Reset und **CSV-Export** im Settings-Sheet.
- **Einstellungen** mit Versionsanzeige der PWA, Link zum
  [GitHub-Projekt](https://github.com/TheRealBob52427/guitar-chord-trainer)
  und Unterstützungs-Link zu
  [Ko-fi](https://ko-fi.com/therealbob33119).
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
3. Im Tab **Stimmen** die gewünschte Saite antippen oder **Auto-Erkennung**
   aktivieren, die Saite einzeln anschlagen und am Wirbel drehen, bis der
   Zeiger grün in der Mitte steht. „Referenzton …“ spielt die Sollfrequenz vor.
4. Im Tab **Pentatonik** Grundton, Tongeschlecht und eines der fünf Pattern
   wählen. Das Griffbrett zeigt nur die Töne dieser Lage; „Pattern anhören“
   spielt sie vor. „Übung starten“ beginnt **fünf Tonfolgen à zwölf Töne**;
   mit „Anschließend rückwärts“ folgt danach eine absteigende Tonfolge. Die
   App erwartet die Töne in der angezeigten Reihenfolge und quittiert jeden
   richtigen Anschlag automatisch.
5. Im Tab **Riffs** ein Riff wählen, optional „Klick starten“ und mit
   „Übung starten“ die Noten in der angezeigten Reihenfolge spielen. Die App
   prüft jeden Ton und zeigt Note, Saite und Bund an.
6. Im Tab **Songs** ein Lied wählen, das Tempo einstellen und mit
   „Song anhören“ die Akkordfolge als E-Gitarre abspielen. „Mitspielen
   starten“ startet danach den Klick und die Akkordprüfung; die App zeigt den
   aktuellen und nächsten Akkord und prüft die gespielten Akkorde.
7. Im Tab **Spielen** eine Guitar-Pro-Datei importieren oder das Demo nutzen.
   Track wählen, „Im Takt“ oder „Note für Note“ aktivieren und „Spiel starten“.
   Der Highway zeigt die Noten; die App prüft Pitch-Class bzw. Akkordtöne.
8. Im Tab **Hilfe** erklärt die App alle verwendeten Griffbrett-Notationen:
   offene und gedämpfte Saiten, Fingernummern, Bundnummern, Grundton-Markierung
   und Zielton-Hervorhebung.
9. Im Settings-Sheet (Regler-Symbol) Audio-Eingang wählen, die Statistik
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
│   │   ├── pentatonic.js   # Skalen, fünf Pattern, Übungsfolgen, Griffbrett-SVG
│   │   ├── caged.js        # CAGED-Formen und Transposition
│   │   ├── guitar-synth.js # Karplus-Strong-E-Gitarre als AudioBuffer
│   │   ├── playalong.js    # Charts, Guitar-Pro-Import, Spiel-/Scoring-Logik
│   │   ├── vendor/         # guitarpro-parser (Apache-2.0) + fflate (MIT)
│   │   ├── riffs.js        # Riff-Bibliothek für Einzelnoten + Griffbrett-SVG
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
   wichtigsten Obertöne der Trainer-Akkorde ab.
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
3. **YIN**: Für Verzögerungen von **60–1400 Hz** wird die Differenzfunktion
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
7. **Auto-Erkennung**: Ist der Schalter aktiv, wird die angeschlagene Saite
   über `nearestStringIndex()` aus der gemessenen Frequenz bestimmt. Erst wenn
   zwei Messungen hintereinander dieselbe Saite ergeben (~200 ms), wechselt
   das Ziel; so springt die Anzeige nicht zwischen benachbarten Saiten. Eine
   manuelle Saitenwahl schaltet die Auto-Erkennung wieder aus.

## Persistente Einstellungen

Unter `guitarTrainer.prefs.v1` speichert die App die zuletzt verwendeten
Einstellungen im Browser:

```json
{
  "mode": "pentatonic",
  "bpm": 123,
  "tuningStringIndex": 1,
  "tunerAuto": true,
  "scale": { "rootPc": 4, "type": "major", "repeats": 2, "backward": true },
  "riffId": "californication",
  "deviceId": "..."
}
```

- **Modus** (`trainer`, `tuner`, `pentatonic`, `riff`, `song`, `help`)
- **BPM** des Metronoms (40–180)
- **Pentatonik**: Grundton, Moll/Dur, Wiederholungen pro Ton (1–4) und
  Rückwärts-Option
- **Riff**: zuletzt gewähltes Riff im Einzelnoten-Modus
- **Play-Along**: Modus (Im Takt/Note für Note) und Tempo
- **Stimmgerät**: Zielsaite und Auto-Erkennung
- **Audio-Gerät** (Device-ID; bei nicht mehr vorhandenem Gerät wird auf den
  Standardeingang zurückgefallen)

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
  `[0, 2, 4, 7, 9]`, transponierbar auf alle zwölf Grundtöne.
- **Fünf Pattern**: Die A-Moll-Pentatonik ist in die fünf üblichen Lagen
  aufgeteilt (Pattern 1 ab dem 5. Bund, Pattern 5 in der offenen Lage). Jedes
  Pattern hat zwei Töne pro Saite, insgesamt zwölf Töne. Für andere Grundtöne
  werden die Formen chromatisch verschoben; Dur-Pentatonik nutzt dieselben
  Formen über ihren Moll-Grundton.
- **Nur ein Pattern**: Das Griffbrett zeigt ausschließlich die Töne des
  ausgewählten Pattern und die zugehörigen Bünde (absolute Bundzahlen). Alle
  anderen Skalentöne bleiben unsichtbar. Grundtöne sind rot markiert.
- **Tonfolgen**: Eine Übung besteht aus **fünf vollständigen Tonfolgen**.
  Jede Tonfolge spielt alle zwölf Töne des Pattern von der tiefsten zur
  höchsten Lage. Jeder Ton wird `Wiederholungen pro Ton`-mal erwartet. Die
  Anzeige nennt die aktuelle Tonfolge und das Pattern (`Tonfolge 2 / 5 ·
  Pattern 1`) und zeigt die Chips der laufenden und der nächsten Tonfolge.
- **Rückwärts**: Mit „Anschließend rückwärts“ folgt nach den fünf
  aufsteigenden Tonfolgen eine sechste, absteigende Tonfolge. Die
  Fortschrittsanzeige zählt dann `x / 6` Tonfolgen bzw. entsprechend viele
  Anschläge.
- **Vorspielen**: „Pattern anhören“ spielt die zwölf Töne des gewählten
  Pattern aufwärts als gezupfte E-Gitarre und markiert dabei die passenden
  Punkte auf dem Griffbrett.
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

## CAGED-System

Die Trainer-Karte **CAGED-System** zeigt die fünf beweglichen Dur-Formen
**C, A, G, E und D** für den gewählten Grundton:

- Jede Form wird über die Lage ihres Grundtons auf der Referenzsaite
  (tiefe E-, A- oder D-Saite) chromatisch verschoben.
- Liegt eine Form vor dem Sattel, wird sie automatisch eine Oktave höher
  gesetzt; über dem 24. Bund wird sie eine Oktave tiefer dargestellt.
- Die Diagramme nummerieren die Bünde absolut und zeichnen keinen Sattel,
  wenn die Form in einer höheren Lage liegt.
- Die Karte folgt dem in der Akkordliste gewählten Akkord (Grundton); der
  Grundton lässt sich zusätzlich direkt in der Karte umstellen.
- CAGED beschreibt die Dur-Formen. Moll-Akkorde wie Em und Am werden in
  denselben fünf Lagen gegriffen; die Terz liegt dabei einen Bund tiefer.

## Riff-/Einzelnoten-Modus

Der Tab **Riffs** übt einzelne Noten statt Akkorde. Jedes Riff ist eine
geordnete Folge von Positionen (Saite + Bund); die App erwartet die Töne in
dieser Reihenfolge und prüft sie mit derselben YIN-Pitch-Erkennung wie das
Stimmgerät. Das Timing wird nicht bewertet – der Klick ist eine optionale
Hilfe, um im Tempo des Originals zu bleiben.

- **Bibliothek**: `app/js/riffs.js`, aktuell:
  - **Seven Nation Army** (The White Stripes, 120 BPM): sieben Noten
    `E3 E3 G3 E3 D3 C3 B2` auf der A-Saite (`7–7–10–7–5–3–2`). Die Aufnahme
    nutzt ein Whammy-Pedal eine Oktave tiefer; das Vorspielen klingt deshalb
    eine Oktave unter den angezeigten Griffen.
  - **Californication** (Red Hot Chili Peppers, 96 BPM): das Am/F-Arpeggio aus
    Intro und Refrain, 32 Achtelnoten über vier Takte
    (`A2 E3 A3 C4 E4 C4 A3 E3` / `F2 C3 F3 A3 C4 A3 F3 C3`, zweimal).
- **Anzeige**: Note mit Oktave, Saite und Bund; Sequenz-Chips mit
  Positionsangabe (`E0` = tiefe E-Saite offen, `A3` = A-Saite 3. Bund);
  Griffbrett mit so vielen Bünden wie nötig (mindestens 5), Grundton- und
  Zielton-Markierung.
- **Prüfung**: Zwei aufeinanderfolgende Frames mit passender Pitch-Class zählen
  als Treffer. Gleiche Töne in Folge brauchen ein kurzes Abdämpfen
  (250 ms Gnadenfrist und Hysterese wie im Pentatonik-Trainer). Falsche Töne
  werden als Fehler gezählt, blockieren den Fortschritt aber nicht.
- **Vorspielen**: „Riff anhören“ spielt die Folge im Originaltempo und mit dem
  Rhythmus aus `note.beats` (Achtelnoten bzw. längere Haltetöne) und hebt dabei
  den jeweils klingenden Ton hervor.
- **Inhalte**: nur Notenpositionen – keine Aufnahmen, Lyrics oder Melodietexte.

## Song-Modus

Der Song-Modus führt durch einen Akkord-Loop und prüft die gespielten Akkorde
mit derselben Chroma-Erkennung wie der Trainer.

- **Bibliothek**: `app/js/songs.js`, aktuell **Wonderwall (Oasis)**,
  **Don’t Look Back in Anger (Oasis)** und **When I Come Around (Green Day)**.
  Wonderwall und When I Come Around nutzen den Acht-Takt-Strophen-Loop
  `Em7 – G – Dsus4 – A7sus4` (zweimal), ein Akkord pro 4/4-Takt. „When I Come
  Around“ ist auf diese Folge verschoben. „Don’t Look Back in Anger“ nutzt den
  Acht-Takt-Loop `C – G – Am – E7 – F – G – C – G` aus Strophe und Refrain.
- **Tempo**: 50–120 BPM, Standard je Song 87 BPM (Wonderwall), 82 BPM
  (Don’t Look Back in Anger) bzw. 98 BPM (When I Come Around). Der Regler zeigt
  zusätzlich die Geschwindigkeit relativ zum Original (100 % = Song-BPM).
- **Akkorde**: Alle Song-Akkorde sind auch im Trainer verfügbar; `C`, `Am`,
  `E7` und `F` sind als Trainer-Akkorde ergänzt. Der `E7`-Griff
  (`022130`) greift die Septime `D` mit, damit die Erkennung alle vier
  Akkordtöne im Chromagramm findet.
- **Ablauf**: aktueller und nächster Akkord, Griffbrett-Diagramm, Takt-Leiste,
  Klick und Beat-Dots. Nach acht Takten beginnt der Loop von vorn.
- **Anhören**: „Song anhören“ spielt die komplette Akkordfolge als
  E-Gitarren-Strum im eingestellten Tempo (Achtel-Muster mit betonten
  Zählzeiten), markiert den aktuellen Takt und die Beat-Dots und funktioniert
  ohne Mikrofon. Während der Wiedergabe sind Tempo und Songauswahl gesperrt.
- **Prüfung**: Bei jedem Taktwechsel wird der Zielakkord gesetzt und der
  Detektor zurückgesetzt. Ein Treffer zählt nur, wenn der erkannte Akkord dem
  Ziel entspricht; Treffer/Versuche werden separat von der Akkordstatistik
  geführt.
- **Capo**: Alle Übungsversionen nutzen offene Akkordformen **ohne Capo**,
  damit die Erkennung zu den angezeigten Griffen passt.
- **Inhalte**: Es werden keine Originalaufnahmen, Lyrics oder Melodien
  eingebunden – nur Akkordfolge, Timing und ein synthetischer Klick.

## Play-Along (Real Instrument)

Der Tab **Spielen** ist ein StringTheory-inspirierter Real-Instrument-Modus:
Noten laufen auf einem Highway auf die Trefferlinie zu, die App hört über
Mikrofon/USB-Interface zu und bewertet die gespielten Töne.

- **Import**: Guitar Pro (`.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`) über den
  Datei-Button. Der Parser liest Tracks, Stimmungen, Wiederholungen,
  Alternativ-Endings, Tempoänderungen und Taktarten; die Noten werden über
  `scheduleTrack` in absolute Zeitpositionen umgerechnet.
- **Tracks**: Alle Stringed-Tracks (Gitarre/Bass) stehen zur Auswahl; die App
  wählt bevorzugt Lead-/Rhythmusgitarren. Jeder Track kann eigene Stimmungen
  und Saitenzahlen (4–7) haben.
- **Highway**: Canvas mit einer Lane pro Saite, absoluten Saitennamen,
  Trefferlinie, Count-in und farbigen Notenblöcken. Akkorde werden als
  verbundene Blöcke über mehrere Saiten dargestellt.
- **Im Takt**: Die Uhr läuft; Treffer werden mit ±60 ms als „Perfekt“,
  ±130 ms als „Gut“ und ±180/220 ms als „Okay“ bzw. verpasst gewertet.
  Combo, Punkte, Genauigkeit und Fortschritt werden live angezeigt.
- **Note für Note**: Die Zeit steht am aktuellen Event. Das Lied wartet, bis
  die richtige Pitch-Class (bei Akkorden alle enthaltenen Töne) gespielt
  wurde, und springt dann zum nächsten Event. Es gibt keine Zeitfehler.
- **Erkennung**: Einzelnoten über YIN, Akkorde über das Chromagramm. Nach
  einem Treffer muss der Ton abklingen oder ein anderer Ton kommen, damit
  derselbe Anschlag nicht mehrfach zählt.
- **Tempo & Klick**: 50–100 % Geschwindigkeit; der Klick nutzt das Starttempo
  des Songs. Der Highway scrollt entsprechend langsamer.
- **Demo**: Ohne Import steht ein Seven-Nation-Army-Riff als Übungschart
  bereit.
- **Grenzen**: Die App spielt keine Originalaufnahmen und keine synthetische
  Backing-Spur ab – gespielt wird zum Klick/Highway. Importierte Charts leben
  nur im Speicher und müssen nach einem Reload erneut geladen werden.
- **Lizenz**: Der vendored Parser `guitarpro-parser` steht unter Apache-2.0,
  `fflate` unter MIT; die Lizenztexte liegen unter `app/js/vendor/`.

## Hilfe-Modus

Der Tab **Hilfe** erklärt die in der App verwendeten Griffbrett-Notationen und
zeigt dieselben Renderer wie die Übungsansichten als Beispiel:

- **Akkord-Diagramm**: Saiten von links (tiefe E) nach rechts (hohe E), dicke
  Linie oben = Sattel, Zahlen links = Bundnummern, gefüllte Punkte mit
  Fingernummern 1–4, ○ = offene Saite, × = gedämpfte Saite.
- **Pentatonik-Griffbrett**: zwölf Bünde, Notennamen in den Punkten, rote
  Punkte = Grundton, Punkte über dem Sattel = leere Saiten, weißer Ring =
  aktueller Zielton, Inlays bei 3/5/7/9/12.
- **Stimmgerät & Übungsfolge**: Cent-Zeiger (±5 Cent grün), Auto-Erkennung,
  Bedeutung der Sequenz-Chips und der Begriff „Tonfolge“.

Der Hilfe-Modus benötigt kein Mikrofon und lässt sich wie die anderen Tabs
über die Modus-Leiste öffnen; die Auswahl wird mitgespeichert.

## Tests

Die DSP-Kette, YIN-Erkennung, Pentatonik-Logik, CAGED-Formen, der
Gitarren-Synthesizer, Statistik und das Metronom sind ohne Browser testbar.
Die Tests synthetisieren Gitarrenakkorde und Saitentöne mit Obertönen, führen
eine echte FFT aus und prüfen unter anderem:

- Erkennung aller Trainer-Akkorde und der sechs offenen Saiten,
- Cent-Genauigkeit, Oktavfehler-Stabilität und Stille,
- **C5 auf der hohen E-Saite sowie den Bereich bis E6 (24. Bund)**,
- Hysterese und Akkorddaten inklusive Em und Am,
- **fünf Pentatonik-Pattern, Transposition, Übungsfolgen und die Beschränkung
  des Griffbretts auf das ausgewählte Pattern**,
- **CAGED-Formen für alle zwölf Grundtöne und absolute Bundzahlen**,
- **Karplus-Strong-Gitarre: Bufferlänge, Grundfrequenz, Determinismus**,
- **Play-Along: Guitar-Pro-Import (.gp4/.gp5/.gp/.gpx), Chart-Erzeugung,
  Timing-Fenster, Combo/Genauigkeit und der wartende Note-by-Note-Modus**,
- Riff-Bibliothek, Notenpositionen, Frequenzen und Griffbrett-SVG,
- Song-Bibliothek, alle Song-Loops und die neuen Griffe,
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
  `app/index.html` sowie in der Precache-Liste anpassen (z. B. `?v=1.9.0`).
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
  60–1400 Hz; bei starkem Brummen oder Nebengeräuschen lieber den Referenzton
  nutzen.
- **Stimmgerät zeigt die falsche Note**: Die Zielsaite über die sechs Buttons
  wählen. „Erkannt: A2 · Ziel E2“ bedeutet, dass die A-Saite klingt, aber E2
  als Ziel eingestellt ist.
- **CSV-Export startet nicht**: Browser-Downloads für die Seite erlauben. Die
  Datei wird lokal aus `localStorage` erzeugt; es gibt keinen Server-Upload.
- **USB-Adapter fehlt**: Adapter anschließen, Settings öffnen, „Geräte neu
  laden“. Bei Linux ggf. `arecord -l` prüfen.
- **Tabs reagieren nicht / alte Version**: Im Settings-Sheet muss **Version
  1.9.0** stehen. Nach einem Image-Update `docker compose build --no-cache &&
  docker compose up -d` ausführen, die PWA schließen und neu öffnen. HTML und
  JavaScript sind mit `?v=1.9.0` versioniert, damit kein altes JS aus dem
  Browser- oder Service-Worker-Cache geladen wird.
- **Pentatonik-Übung zählt nicht weiter**: Töne einzeln und mit kurzer Pause
  spielen; bei wiederholtem gleichem Ton kurz abdämpfen. Die App prüft die
  Pitch-Class, nicht die Oktave. Bei zu leiser Gitarre Pegel erhöhen oder
  Eingang prüfen.
- **Riff-Übung zählt nicht weiter**: Nur eine Saite anschlagen und den Ton
  ausklingen lassen. Bei zwei gleichen Noten hintereinander (Seven Nation
  Army: `E2 E2`) kurz abdämpfen – sonst erkennt die App keinen neuen Anschlag.
  Das Tempo wird nicht geprüft; der Klick ist nur eine Hilfe.
- **Song-Modus erkennt keinen Akkord**: Wonderwall als Übungsversion **ohne
  Capo** mit den angezeigten offenen Griffen spielen; mit Capo 2 verschieben
  sich die klingenden Töne und passen nicht zu den Templates. Akkord sauber
  und lange genug klingen lassen.
- **PWA installiert alte Version**: App schließen und neu öffnen; der Service
  Worker lädt im Hintergrund. Bei Entwicklung `CACHE_VERSION`, die
  Versions-Query in `index.html` und die Precache-Liste gemeinsam erhöhen und
  Hard-Reload.
