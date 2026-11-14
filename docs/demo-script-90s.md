# Praman — 90-Second Demo Script

*Open `http://127.0.0.1:5173/demo`. Demo runs on sample data; live mode uses a free Etherscan key.*

## 0:00 – 0:15 | Hook
"Most crypto screening tools hand your compliance team a single score without explaining why. Praman returns the risk score alongside the exact reason weights and a draft case summary in one API call."

## 0:15 – 0:45 | High-risk wallet (`0x2222...2222`)
*(Click **Load high-risk address** (`0x2222222222222222222222222222222222222222`) and **Screen wallet**.)*

"Notice the **Demo data** badge — this score comes from deterministic rules over fixture data. We get **87**, band **severe**, and a **Sanctions hit** alert. Look at the reason breakdown: `SANCTIONS_MATCH` plus `60`, and `MIXER_EXPOSURE` plus `27`. Together they sum directly to `87`, alongside the fund-flow graph."

## 0:45 – 1:10 | Report & clean wallet (`0x1111...1111`)
*(Click **Download report**, then **Load clean address** (`0x1111111111111111111111111111111111111111`) and **Screen wallet**.)*

"One click generates a PDF report and displays its SHA-256 report data hash. Now here is a clean wallet, `0x1111`: score **12**, band **low**, no sanctions hit — just `NEW_WALLET` plus `12`."

## 1:10 – 1:30 | Close
"Analysts can record feedback, verify the audit log, or screen CSV batches. Praman is a screening and drafting tool; your compliance officer stays responsible for decisions. We are onboarding free design partners now."
