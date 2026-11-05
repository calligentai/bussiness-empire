# De Koffiefabriek: Technische Specificatie & Communicatieprotocol
*Hardware-architectuur, edge-functionaliteit en beveiligde cloud-synchronisatie*

---

## 1. Doelstelling van het Document
Dit document beschrijft de technische specificaties van de hardware-eenheden (voor zowel thuis als onbemande locaties) en het communicatieprotocol dat de communicatie, telemetrie en de server-side receptuur-engine (`The Black Box`) aanstuurt. Het systeem is ontworpen volgens het *zero-trust* principe: de fysieke machine bevat geen gevoelige IP of receptuur, maar fungeert uitsluitend als een veilige uitvoerder van cloud-berekende parameters.

---

## 2. Hardware Benodigdheden (Edge Devices)

De hardware is modulair opgebouwd op basis van robuuste OEM/ODM-prosumer componenten, opgedeeld in twee deployment-varianten:

### A. Fysieke Componenten per Eenheid
* **Zetgroep & Hydrauliek:**
  * Rvs roterende of trillingspomp met variabele drukprofilering (0 tot 12 bar).
  * Dubbel thermoblok of boiler systeem voor simultane extractie en stoomproductie (indien van toepassing).
  * Precisie-molen met stappenmotor voor automatische maalgraad- en doseringsaanpassingen.
* **Smaak-Injectie Systeem:**
  * 5 micro-doseringspompen (peristaltische pompen of solenoïde-gestuurde injectoren) gekoppeld aan interne reservoirs voor de gepatenteerde smaakversterkers.
  * Milligram-nauwkeurige debietmeters per injector om exact volume te garanderen tijdens de extractiefase.
* **User Interface & Sensoriek (Headless Design):**
  * **Geen fysieke knoppen of visuele touchscreens** om slijtage en complexiteit te minimaliseren.
  * **NFC-module** (bijv. NXP PN532 of vergelijkbaar RFID/NFC lezer) voor snelle gebruikersidentificatie via smartphone of token.
  * **Microfoon- en luidsprekermodule** met lokale ruisonderductie voor Speech-to-Text (STT) en Text-to-Speech (TTS) interactie.
  * **Omgevings- en naderingssensor** (Time-of-Flight / PIR) voor de contextuele ontwaking van de assistent.
* **Embedded Controller (Edge Board):**
  * Industrieële microcontroller of single-board computer (bijv. Linux-based embedded SoC zoals Raspberry Pi Compute Module 4 industrial of NXP i.MX reeks) met hardwarematige encryptie (Secure Element / TPM 2.0).

---

## 3. Communicatie- en Dataprotocol

Om te garanderen dat het intellectueel eigendom (de AI-receptuur) versleuteld blijft op de cloud-servers en niet op het apparaat kan worden uitgelezen, wordt een strikt, beveiligd protocol gehanteerd.

### A. Transportlaag & Beveiliging
* **MQTT over TLS 1.3 (Message Queuing Telemetry Transport):** Het primaire protocol voor real-time machine-to-cloud communicatie. MQTT is lichtgewicht, optimaal voor IoT en ondersteunt bidirectionele communicatie met minimale latency.
* **Mutual TLS (mTLS) Authenticatie:** Zowel de cloud-server als het hardware-apparaat verifiëren elkaars cryptografische certificaten (X.509). Dit voorkomt dat ongeautoriseerde hardware communiceert met het ecosysteem of dat man-in-the-middle aanvallen mogelijk zijn.
* **End-to-End Payload Encryptie (AES-256):** Gevoelige instructies (zoals de exacte milligram-dosering van de smaak-injectoren) worden aanvullend versleuteld in de payload.

### B. Communicatieflow (Typische Brouwcyclus)
1. **Identificatie:** Gebruiker houdt NFC-token tegen de machine $\rightarrow$ Apparaat stuurt unieke `user_id` + `device_id` via mTLS/MQTT naar de cloud.
2. **Interactie (STT):** Gebruiker spreekt wens uit $\rightarrow$ Audio of getranscribeerde tekst (STT) wordt naar de cloud gestuurd $\rightarrow$ De LLM/intent-parser op de server bepaalt de context (bijv. "snelle, krachtige koffie").
3. **Receptuur Berekening (The Black Box):** De cloud-server raadpleegt het AI-receptuurmodel, combineert dit met de telemetrie-historie van de gebruiker en berekent de optimale parameters.
4. **Uitvoering (Command Payload):** De cloud stuurt een versleuteld JSON-commando naar het apparaat:
   ```json
   {
     "command_id": "cmd_9823471",
     "action": "brew",
     "parameters": {
       "grind_size_microns": 420,
       "water_temp_celsius": 92.5,
       "pressure_profile": [
         {"second": 0, "bar": 2.0},
         {"second": 5, "bar": 9.0},
         {"second": 25, "bar": 6.0}
       ],
       "injectors": {
         "injector_1_mg": 120,
         "injector_3_mg": 45
       }
     }
   }
   ```
5. **Telemetrie Feedback:** Tijdens en direct na de berekening stuurt de machine operationele telemetrie terug naar de cloud (`extraction_time_ms`, `actual_pressure`, `flow_rate`, `error_codes`) voor predictive maintenance en verdere optimalisatie.

---

## 4. Conclusie
Deze architectuur scheidt hardware-uitvoering strikt van server-side intelligentie. Hierdoor is het fysieke apparaat een 'domme' maar hoogwaardige uitvoerder, blijft het IP volledig beschermd in de cloud, en wordt een stabiele, schaalbare CaaS-infrastructuur geborgd voor zowel huishoudelijke als onbemande professionele locaties.