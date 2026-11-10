# Bengaluru Tech Summit (BTS) — Conversation Guide

**Goal of every conversation:** Listen first, understand how they handle wallet screening today, and see if a free design-partner pilot makes sense.

---

## 1. Discovery Questions (Ask These First)

1. **"How do you screen crypto wallets today?"**
   - *Follow-ups:*
     - Is it automated via an API during onboarding/deposits, or manual checks on a block explorer?
     - When a wallet gets flagged, how does the analyst figure out *why*?
     - How many wallets or cases does your team review in a typical week?

2. **"What does it cost you right now?"**
   - *Follow-ups:*
     - Not just software fees — how much analyst or engineering time goes into investigating unclear alerts or maintaining internal blocklists?
     - What happened the last time you looked at enterprise screening tools (pricing, minimum commits, integration timeline)?

3. **"What would make a screening tool immediately useful to your team?"**
   - Listen for: faster case write-ups, clearer reasons for non-technical reviewers, batch CSV checks, or simple REST integration.

---

## 2. Objection Script: "This already exists"

**Prospect:** *"There are already big blockchain analytics and screening companies doing this."*

**Response:**
> "Totally fair — enterprise vendors have been around for years, and they're built for Tier-1 banks with large compliance departments and big annual contracts.  
> When we talk to smaller crypto and fintech teams, we hear two things: either those enterprise tools are too expensive and slow to integrate, or the score comes back as a black box and the analyst still has to spend significant time investigating why.  
> Praman is built specifically for lean teams: one REST call, transparent rule weights that add up to the score, and a draft case summary alongside the result. We're not trying to replace a bank's full compliance suite — we're giving growing teams explainable screening they can integrate in an afternoon."

---

## 3. The FIU / Regulatory Question

**Prospect:** *"Does this handle FIU compliance, or file reports for us?"*

**Response (strictly stick to this):**
> "No — Praman is a **screening and case-drafting tool**. It surfaces on-chain risk signals and drafts structured summaries for human review.  
> Your **compliance officer stays fully responsible** for reviewing the evidence, making the final risk decision, and handling any regulatory filings. Praman is not legal advice and is not affiliated with any government body or regulator."

---

## 4. Closing Ask (If There Is a Fit)
- Offer a **free design partner pilot** (API key, `/demo` access, batch CSV screening, and direct feedback channel).
- Capture: Name, role, company, email, and the single biggest bottleneck they mentioned.
- Follow-up contact: `design-partners@example.com`
