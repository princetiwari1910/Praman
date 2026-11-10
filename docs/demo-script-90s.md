# Praman — 90-Second Live Demo Script

**Setup before starting:**
- Backend running on `http://127.0.0.1:8000`
- Frontend open at `http://127.0.0.1:5173/demo`
- Note: All addresses shown use synthetic fixture data (`Demo data` badge visible).

---

## 0:00 – 0:15 | Hook & Problem
> "When a crypto or fintech team screens a wallet today, most tools give them a single number — say, 87 — without telling the compliance analyst *why*. So the analyst spends significant time digging through a block explorer before they can approve or escalate. Praman gives you the score **and** the proof in one API call."

*(Point to the `/demo` screen.)*

---

## 0:15 – 0:45 | High-Risk Wallet (`0x2222...2222`)
1. Click **"Load high-risk address (0x2222…2222 · FAKE)"** to populate `0x2222222222222222222222222222222222222222`.
2. Click **"Screen wallet"**.

> "Notice the **Demo data** badge — this is synthetic test data. We get a score of **87**, band **severe**, and a **Sanctions hit** alert.  
> Look at the **Proof** panel: two explicit reasons — `SANCTIONS_MATCH` with weight **+60**, and `MIXER_EXPOSURE` with weight **+27** from the mixer exposure rule. `60 + 27 = 87` — the weights visibly add up to the score. Next to it is the fund-flow graph showing the flagged cluster."

---

## 0:45 – 1:10 | Report, Attestation & Clean Wallet (`0x1111...1111`)
1. Click **"Download report"** (generates the PDF via `POST /v1/reports` and displays the SHA-256 hash in the **Testnet demo** attestation panel).
2. Click **"Load clean address (0x1111…1111)"** to populate `0x1111111111111111111111111111111111111111`, then click **"Screen wallet"**.

> "For audit trails, one click generates a PDF case summary with its SHA-256 hash ready for optional testnet attestation.  
> Now let's screen a low-risk wallet, `0x1111...1111`: score **12**, band **low**, no sanctions hit — just `+12` for a recently created wallet (`NEW_WALLET`). Analysts can also mark feedback as true positive, false positive, or unsure, or switch to **Batch CSV** to screen a whole list at once."

---

## 1:10 – 1:30 | Close & Call to Action
*(Point briefly to the `API quota usage` meter `checks_used / 100` and footer disclaimer.)*

> "Everything is metered per API key, and Praman stays strictly a screening and drafting tool — your compliance officer remains in control and responsible for final decisions. We are onboarding a small group of design partners for a free pilot. Let's talk after this."
