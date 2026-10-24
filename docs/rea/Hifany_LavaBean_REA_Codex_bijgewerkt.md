# Hifany / LavaBean — REA-onderzoeksworkflow voor Codex

## Doel

Gebruik REA om bestaande software en gebruikersstromen gericht te onderzoeken. Kies per vraag de minst ingrijpende passende methode. Ghidra is een optionele, afzonderlijke analysetrap voor geautoriseerde lokale gecompileerde binaries. Gebruik Ghidra niet voor gewone websites.

## Rollen

- **REA (Reverse Engineer Anything):** orkestreert het onderzoek en biedt passende analysemogelijkheden voor browserpagina's, broncode, lokale artifacts en runtimes. REA is geen toestemming om een doelwit te onderzoeken.
- **Browser en documentatie:** geschikt voor publiek beschikbare websites, zichtbare gebruikersstromen, officiële handleidingen en openbare productinformatie. Onderzoek websitegedrag via normale browserinteractie en documentatie.
- **Broncodeanalyse:** geschikt wanneer geautoriseerde broncode beschikbaar is en de vraag gaat over implementatie, interfaces, configuratie of programmastromen. Volg verwijzingen en relevante tests; vermijd onnodige wijzigingen.
- **NSA Ghidra:** gespecialiseerd hulpmiddel voor statische/dynamische analyse van lokale gecompileerde binaries, zoals uitvoerbare programma's en firmware, als de gebruiker bevoegd is die te analyseren. Ghidra is optioneel en staat los van de gewone browser- en broncodepaden.
- **Codex:** bepaalt met de beslisboom de onderzoeksmethode, controleert autorisatie en grenzen, gebruikt REA voor de gekozen stap, beoordeelt de bevindingen en rapporteert bewijs en onzekerheid. Codex verandert geen software of omgeving zonder expliciete toestemming.
- **Hermes:** mag de workflow ondersteunen of doorgeven, maar mag REA, Ghidra en Codex niet als onderling verwisselbare tools presenteren. Hermes leidt nooit toestemming af uit toolbeschikbaarheid of uit een verzoek om een website te onderzoeken.

## Beslisboom

1. **Gaat de vraag over een website of zichtbare gebruikersstroom?**
   - Ja: gebruik browseronderzoek en, waar nodig, officiële documentatie.
   - Onderzoek een gewone website niet met Ghidra. Een website is geen lokale gecompileerde binary.
2. **Is de vraag hoe beschikbare, geautoriseerde broncode werkt?**
   - Ja: analyseer de broncode en relevante configuratie/documentatie. Gebruik Ghidra niet als vervanging voor leesbare broncode.
3. **Gaat de vraag over een lokale gecompileerde binary zonder bruikbare broncode?**
   - Ja: controleer eerst of het doelbestand lokaal aanwezig is en of de gebruiker bevoegd is het te analyseren. Als beide voorwaarden kloppen, kan Codex Ghidra als aparte, optionele REA-stap voorstellen.
   - Nee of onzeker: stop; vraag om het lokale bestand of verduidelijking van de bevoegdheid. Haal geen binary van een externe dienst op en begin geen analyse.
4. **Past geen route duidelijk?**
   - Verzamel alleen de minimale context die nodig is om het doeltype en de bevoegdheid vast te stellen. Kies daarna opnieuw.

## Ghidra-stap: voorwaarden en uitvoering

Voer deze stap alleen uit wanneer alle voorwaarden gelden:

1. De gebruiker heeft expliciet toestemming gegeven voor de concrete analyse en beschikt over de benodigde rechten.
2. Het doel is een lokaal aanwezige gecompileerde binary, niet een gewone website.
3. Codex inventariseert eerst of de repository of binary al lokaal is gekloond of aanwezig. Controleer het bestaande pad en de inhoud zonder bestanden te wijzigen.
4. Codex meldt wat is aangetroffen en vraagt afzonderlijke toestemming voordat Ghidra wordt geïnstalleerd, een repository wordt gekloond, configuratie verandert of bestanden worden aangepast.
5. Na toestemming blijft de actie beperkt tot het genoemde lokale doel en de goedgekeurde analysemethode.

Zonder expliciete toestemming: niet installeren, klonen, updaten, configureren, uitvoeren of wijzigen. Geen ongeautoriseerde reverse engineering, beveiligingsomzeiling, credentialextractie of analyse van software van derden waarvoor geen bevoegdheid is aangetoond. Bij twijfel stopt de Ghidra-stap.

Bronproject: [NationalSecurityAgency/ghidra](https://github.com/NationalSecurityAgency/ghidra). Een openbare repositorylink is geen toestemming om software te klonen of te installeren.

## Interpretatieregels voor Hermes

- Behoud het onderscheid: **REA = onderzoeksworkflow/tools**, **Ghidra = optionele binary-analysetool**, **Codex = methodekeuze, uitvoering binnen toestemming en bewijsrapportage**.
- Websiteonderzoek loopt via browser en documentatie. Verwijs niet naar Ghidra voor het analyseren van gewone websites.
- De aanwezigheid van Ghidra op de machine, in REA of op GitHub is geen toestemming om het te starten of te installeren.
- Inventariseer lokale aanwezigheid vóór voorstellen voor klonen of installatie.
- Als doeltype, lokale beschikbaarheid of bevoegdheid niet vaststaat, markeer dat als onbekend en vraag gericht om de ontbrekende informatie. Verzin geen status.

## Resultaat van een onderzoek

Rapporteer kort:

- de onderzoeksvraag en gekozen methode;
- welk lokaal doel of welke openbare bron is onderzocht;
- de waargenomen bevindingen met paden of bronverwijzingen;
- beperkingen en onbeantwoorde vragen;
- eventuele wijzigingen of installatie alleen als die vooraf expliciet zijn goedgekeurd.

Een ingestelde tool, gevonden repository of geslaagde start bewijst op zichzelf niet dat de onderzoeksvraag is beantwoord.
