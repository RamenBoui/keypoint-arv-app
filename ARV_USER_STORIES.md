# Keypoint ARV — User Story Backlog

Who picks this app up, why they'd choose it over what they use today, and
what each of them needs from it. Grounded in the engines that exist
(band/breakeven/tiers, live permits, comp studies, market scope/trends,
listing diagnostic) — a story that needs new engine work says so (APPS.md
rule 3: engine first, then face).

**The hook, in one sentence:** every free tool answers *"what is this house
worth as-is"* — the gap between as-is and after-the-work IS the entire
margin, and this is the only free, no-account tool that answers the second
question with evidence attached.

Status legend: ✅ built · ◐ engine live, UI pending · ⏸ needs engine/decision
· ○ open idea

---

## Why each persona shows up (the acquisition story)

- **Realtor / listing agent** — walks into a listing appointment where every
  competitor quotes the same Zestimate. A one-page *after-renovation* band
  with named comps and permit evidence is a pitch nobody else in the room
  has. Uses it again at the kitchen table to talk a seller into a defensible
  price. It's the Realtor slice (ARV · bid-gap) from the distribution model.
- **Flipper / small investor** — standing in a driveway 20 minutes before an
  offer deadline. Needs the stress number (P20) and the red line before the
  emotion of the auction takes over. Chooses this because it *refuses to
  flatter*: unflagged comps degrade confidence out loud.
- **Homeowner** — deciding between remodel, addition, or selling as-is.
  Every contractor gives a cost; nobody gives the value side. The tier
  matrix is the missing half of their decision.
- **Contractor / GC** — pitching a remodel and needs market proof that the
  work pays: "S3 work here earned $464/SF, cosmetic earned $387."
- **Wholesaler** — buyers discount every wholesaler ARV on sight. An
  evidence-flagged band (with the honesty label visible!) reads credible
  precisely because it admits what it doesn't know.
- **The curious neighbor** — "what did they do to that house and what's it
  worth now?" Permit history + band is the zero-cost viral loop; no account
  means no friction between curiosity and the answer.

---

## Realtor / listing agent

| # | Story | Why it wins them | Status |
|---|---|---|---|
| RA-01 | Walk into a listing appointment with a one-page PDF: band, comps with sold/renovated flags, permits cited | The only agent in the room with after-work value, not a Zestimate | ✅ |
| RA-02 | Price a fixer against the *demonstrated* market — flag which comps actually closed renovated, show the seller why their number is P80, not P50 | Wins the listing at a price that survives escrow | ✅ |
| RA-03 | Run a stuck listing through the diagnostic: price vs demonstrated ceiling, DOM vs sold median, "two cuts and unsold = not a price problem" | Turns the hardest seller conversation into the engine's words, not the agent's | ◐ listing_diagnostic tab |
| RA-04 | Show a pre-list seller the table stakes for their price point ("at this price the market delivers kitchen+bath+flooring — do these or list as-is") | A concrete prep list backed by the sold set, not taste | ◐ market_scope tab |
| RA-05 | Pull the subject's own permit record before listing — surface the unpermitted-looking addition *before* the buyer's inspector does | Disclosure surprises kill escrows; this is a 15-second insurance policy | ✅ |
| RA-06 | Talk a buyer-client off a bad flip: enter their numbers, show P50 under breakeven in red | Saving a client from a loss is worth ten closed deals of loyalty | ✅ |
| RA-07 | Send the analysis as a link, not just a PDF | Links get forwarded; needs saved runs (AV-16 persistence decision) | ⏸ |

## Flipper / small investor

| # | Story | Why it wins them | Status |
|---|---|---|---|
| FL-01 | The driveway test: address → band in under a minute, on a phone, before the offer deadline | Speed at the moment of decision; no login wall in a driveway | ✅ |
| FL-02 | Know the red line before bidding: the exit $/SF the bid discipline demands, next to what the market has actually paid | The discipline number, held up against the auction adrenaline | ✅ |
| FL-03 | "What if I add 400 SF?" — size-once-built reprices the band; the tier matrix shows S4/S5 honestly (every added foot earns less than the comps' foot) | The β-decay honesty most flippers learn by losing money once | ✅ |
| FL-04 | Mark which comps really closed vs sit active — and watch confidence change | "A price nobody paid is not evidence" as a UI interaction | ✅ |
| FL-05 | Study the winning comp: what did THEY do for that price (tier, finish, drivers — permits ride along) | Copies the trade that already worked on this street | ◐ comp_study sheet |
| FL-06 | Is this block renovating? Permit trends: what work, what volume, what direction | Momentum evidence no listing portal shows | ◐ market_trends tab |
| FL-07 | Compare two candidate properties side by side from recents | Choosing between deals is the real Saturday morning question | ○ client-only |

## Homeowner

| # | Story | Why it wins them | Status |
|---|---|---|---|
| HO-01 | Remodel or move? See what S1 vs S3 vs S6 makes the house worth, next to the as-is AVM | The value half of a decision where they only ever hear the cost half | ✅ (as-is anchor row ○) |
| HO-02 | Is the addition worth it? Enter size-once-built, watch the marginal value — not the naive $/SF × new-SF math | Prevents the classic over-build; the honesty is the service | ✅ |
| HO-03 | Reality-check a contractor's quote: $250k build → what exit does that require? | Turns "trust me" into a breakeven number | ✅ |
| HO-04 | See what the neighbors' remodels actually did (their permits, what those homes resold for) | The curiosity hook — and the referral loop | ✅ |
| HO-05 | Check my own home's permit record before selling | Finds the water-heater permit that never got closed out, in seconds | ✅ |

## Contractor / GC

| # | Story | Why it wins them | Status |
|---|---|---|---|
| GC-01 | Pitch with market proof: tier matrix shows what each scope level EARNS here — attach it to the bid | Reframes the bid from cost to return; closes bigger scopes honestly | ✅ |
| GC-02 | Scope the bid to the price point's table stakes — don't gold-plate past what the street pays for | Bids that match the market win more often | ◐ market_scope tab |

## Wholesaler

| # | Story | Why it wins them | Status |
|---|---|---|---|
| WS-01 | Dispo packet in 5 minutes: band + flagged comp table + permits as PDF | Faster than their spreadsheet, and it looks like underwriting | ✅ |
| WS-02 | Credibility through visible honesty: the confidence label and "NONE SOLD" scream stay on the page and in the PDF | Buyers trust the tool BECAUSE it can say no — a flattering tool would be ignored | ✅ |

## Cross-cutting

| # | Story | Why | Status |
|---|---|---|---|
| X-01 | No account, ever, for the core question (settled 2026-08-03) | Zero friction between curiosity and answer — the whole funnel | ✅ |
| X-02 | Works on the phone browser from a shared link — no install | The app spreads by URL | ✅ |
| X-03 | Address autocomplete / typo tolerance | The one input everything hangs on deserves forgiveness | ○ |
| X-04 | Spanish (es) localization | House pattern (Field is en/es/zh); LA market reality | ○ |
| X-05 | As-is anchor row: render enrich's AVM beside the band ("as-is $2.63M → after S3 $2.32M") so the *delta* is the headline | The margin is the product; show it explicitly | ○ client-only |
| X-06 | Buy-and-hold angle: surface enrich's market rent next to the band | Widens the investor persona without new engine work | ○ client-only |
| X-07 | A saved run survives reinstall / reaches Records | The AV-16 decision: on-device now; `save-arv-record` later | ⏸ |

---

## Reading order for the build

RA-03/RA-04/FL-05/FL-06 are the same work item family (the context tabs +
comp-study sheet — engines already live). X-05 and X-06 are cheap client
wins that sharpen the homeowner/investor hooks. RA-07/X-07 wait on the
persistence decision. X-03/X-04 are polish before any public push.
