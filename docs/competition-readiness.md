# HeatSense competition readiness

Rules checked November 21, 2026. HeatSense is a school practice workflow for field WBGT readings, UIL activity limits, timed rechecks, and a record staff can hand off. The submitted Congressional App Challenge prototype is the baseline. For each new entry, date the work and point to the commits that changed it.

## Where to enter

| Opportunity | Deadline | Entry and prior-work rules | HeatSense angle |
| --- | --- | --- | --- |
| Samsung Solve for Tomorrow (U.S.) | Nov. 23, 2026 at **11 a.m. CT** | Eligible publicly funded U.S. schools serving grades 6–12. A full-time school educator age 21+ submits and the school approves participation. The rules accept prototypes through scaled projects. | Open Innovation: adapting outdoor school practice to extreme heat. Use the drill and propose a supervised, school-led pilot. [Eligibility](https://solve.mit.edu/samsungsolvefortomorrow/eligibility) · [Application preview and cutoff](https://info.solve.mit.edu/hubfs/Samsung%20Solve%20for%20Tomorrow/Solve%20for%20Tomorrow%20Application_1.pdf) |
| Global AI Builder’s Challenge | Nov. 28, 2026 at **5 p.m. CT** | Free online. Students 13+, solo or up to six, subject to Devpost eligibility and consent. Existing projects require a meaningful Nov. 21–28 improvement and disclosure. | Target **Best Demo & Presentation**, **Best Design & User Experience**, and **Originality**. Those awards accept products without built-in AI. Overall scoring heavily weights AI. [Rules](https://global-ai-builders-challenge.devpost.com/rules) · [Award descriptions](https://global-ai-builders-challenge.devpost.com/) |
| The Earth Prize | Register by **Jan. 10, 2027**. Blueprint due **Jan. 31**. | Secondary students ages 13–19 worldwide, solo or up to five. Minors need guardian consent. The rules explicitly accept existing student projects, with an exclusion for prior Earth Prize winners or runners-up. | Strongest fit for the climate adaptation work. Show the school need, test the workflow with adult staff, and put a cost and timeline on a pilot. [Rules](https://www.theearthprize.org/rules) · [Timeline and rubric](https://www.theearthprize.org/competition) |
| Ciena Solutions Challenge | **Mar. 8, 2027** | Free global challenge for middle and high school. An affiliated educator submits a student portfolio to the gallery before applying for the $3,000 organizational sustainability award. Ask the organizer how to disclose the existing prototype if reuse is unclear. | Document new school-led investigation and testing. Show how the proposed funding would sustain the work and reach more teams. [Digital Promise eligibility](https://digitalpromise.org/programs/ciena-solutions-challenge/) · [Submission rubric FAQ](https://www.cienachallenge.org/en/page/frequently-asked-questions-en) |
| BASIS AI for Human Impact | Registration Nov. 22–**Jan. 16, 2027**. Build Feb. 6–12. | Grades 9–12 worldwide, 2–4 students, official school email for each member, guardian permission under 18. AI must be central, a real user must contribute, and the project must be substantially built during build week. Disclose prior code and assets. | A possible future track for separately built staff training or accessibility work with a real user. The existing drill is the baseline and cannot supply the required build-week work. [Rules](https://basisglobalhackathon.devpost.com/rules) |

The Stanford Global Sustainability Challenge has a Heat Resilience theme and requires university enrollment. Space Center Houston’s Eco Innovation Challenge requires Greater Houston enrollment. Skip these unless the applicable eligibility changes. [Stanford guide](https://www.globalsustainabilitychallenge.org/challenge-details/) · [Space Center Houston eligibility](https://spacecenter.org/education-programs/eco-innovation-challenge/)

## Demo and evidence

```bash
npm ci
npm run test:logic
npm run typecheck
npx expo export --platform web
npx expo serve --port 8911
```

Open `/demo` in a signed-out browser. For a recording, use the same `dist` export and show the labels that identify synthetic readings.

1. Start at **88.4°F WBGT, Orange**. The proposed 90-minute plan with 18 minutes of work and three minutes of rest fails two timing checks. Apply the timing changes and show that the duration remains 90 minutes while the cycle changes to 11 minutes of work and four minutes of rest.
2. Advance to **90.4°F, Red**. The previous plan fails the tighter limits. Apply the revision to a 60-minute plan with 20 minutes of work and 10 minutes of rest per cycle.
3. Advance to **92.4°F, Black**. Outdoor practice stops in the scenario. The history shows the three readings and each recorded decision. Restart and show the initial plan returning.

Use “timing checks pass” for the code result. A school’s full heat and emergency plans govern practice. Simulated readings and sample history demonstrate the workflow. Live team telemetry, sensor validation, a completed school pilot, and measured reductions in heat illness are outside the current evidence. [UIL required plan](https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation)

| Verified in the production web build | Observed result | Evidence |
| --- | --- | --- |
| Open without an account at 88.4°F | Orange, with two failing timing checks. Keyboard activation applies the revision. | [Starting screen](screenshots/competition/drill-orange.png) |
| 90.4°F recheck | The Orange timing plan fails the Red limits. The revised timing passes and is recorded beside the Red reading. | [Reading history](screenshots/competition/drill-black.png) |
| 92.4°F stop case | The Black zone offers no outdoor timing revision. The history preserves both previous changes and records the stop. | [Stop screen](screenshots/competition/drill-black.png) |
| Repeat at 320, 390, and 1440 px in Chrome | Both revisions, stop, restart, and exit passed. The drill worked with external requests blocked. | Run the drill sequence above. |

## Devpost draft

**Users and need.** Coaches and athletic trainers need to turn changing field readings into decisions about outdoor practice. The UIL plan spells out the activity changes and recommends keeping a record of readings. HeatSense puts the reading, timing checks, and next recheck in one workflow. [UIL required plan](https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation)

**Event contribution.** The existing CAC prototype included the staff workflow, athlete and team views, weather context, and simulated band telemetry. The event work adds an interactive drill, the public entry point, and clearer onboarding copy about simulated telemetry. The drill reuses HeatSense’s WBGT classifier, plan checker, and recheck calculations in a new Expo Router screen. The shared Git baseline is `14dc838`. Cite the final commit and have teammates verify their contribution descriptions before posting.

**AI disclosure.** Codex assisted development, rule research, and QA scripting. The app’s decision logic is deterministic TypeScript grounded in the published rule chart. Before posting, have a team member repeat the drill and document one specific AI-assisted change they inspected and kept, edited, or rejected.

**Access and results.** Launch the production web export and open `/demo` with a browser. The drill runs without an account or sensor, and its state is local to the screen. A successful run shows an Orange timing change, a stricter Red revision, and a Black stop with all three decisions visible. See the verification table above.

**Limits and stop case.** All readings, times, and decisions in the drill are synthetic. The app’s band pairing and telemetry are also a simulation. Real practice requires the school’s complete policy, heat data from an approved method, and trained staff. When the example reaches Black, applying timing changes is unavailable and the history records the stop.

**Recording plan, about 2 minutes 20 seconds.** Spend 20 seconds on the school problem. Spend 25 seconds on Orange and the first timing change, 30 seconds on Red and the second change, and 25 seconds on Black and the history. Use the remaining 40 seconds for what changed during the event, how it was verified, and the limits. Show the actual current build. Put the public repository, roster, disclosures, and the required contact form for each participant in the submission checklist. [Devpost requirements](https://global-ai-builders-challenge.devpost.com/rules)

## School pilot evidence for Samsung, Earth Prize, and Ciena

Ask a coach and athletic trainer to check the workflow with simulated cases. Start with the official chart and the school’s current recording process. Repeat the same tasks in HeatSense with fresh cases of equivalent difficulty, alternating the order between participants. Check whether the user identifies the right zone, chooses the timing action, recognizes the stop case, and finds the next recheck. Record task time, errors, and confusing text. Get consent before quoting feedback. Use anonymized adult-staff responses and synthetic data. [Earth Prize evaluation criteria](https://www.theearthprize.org/competition) · [Samsung judging](https://solve.mit.edu/samsungsolvefortomorrow/judging)

For the Samsung application, confirm the school and educator eligibility immediately. Fill in the school’s real team count, how staff currently record readings, one observed decision or handoff problem, and a school-approved pilot owner. The first deliverable is a short educator application. The video is for teams advancing to the next phase. [Timeline](https://solve.mit.edu/samsungsolvefortomorrow)

### Samsung educator starter

Review and personalize this text with the submitting educator and student team. Add private school-admin details in the application form.

- **Title and summary.** HeatSense. We help school staff translate on-field heat readings into updated practice plans and a record they can share.
- **Local problem.** UIL schools monitor outdoor practice conditions and change activity when WBGT rises. At [school], [confirm which teams and staff are affected]. The staff currently use [confirm their workflow]. Explain one specific point where a recheck, plan update, or record is hard to share.
- **Solution and progress.** Our mobile prototype converts a staff-entered heat reading into the school’s UIL zone, checks the planned duration and breaks, and tracks when the next measurement is due. The web drill lets a coach practice these decisions, including ending an outdoor practice at the highest zone. The students built and tested the prototype in software. Select the user-testing stage after confirming what the team has actually done. Choose **Software and Mobile Applications** as the implemented technology.
- **Who benefits and what we learned.** Coaches and athletic trainers use the workflow. Student-athletes benefit from consistent implementation of the school’s heat plan. Add a documented observation or a comment from a consenting staff member here.
- **Activities.** With [school pilot owner], review district protocols, test scripted scenarios with a coach and trainer, refine instructions from their feedback, and then plan a supervised pilot using the school’s approved measurement method.
- **Success measures.** Compare time and accuracy for choosing an action and finding the recheck time, and compare how often staff can reconstruct the decision from its record. Report observed results alongside the number of staff and scenarios tested.

[Official application preview and word limits](https://info.solve.mit.edu/hubfs/Samsung%20Solve%20for%20Tomorrow/Solve%20for%20Tomorrow%20Application_1.pdf)

For the Earth Prize Blueprint, use the pilot to substantiate the problem, proof of concept, and next steps. Build a budget using local instrument or calibration quotes, teacher training time, and documented hosting costs. Track proposed metrics separately from observed results. [Blueprint guidelines](https://www.theearthprize.org/participant-submission-package)

For each new event, confirm rules on prior work, age, location, team membership, consent, and the build window before putting time into an entry. Record the baseline, what changed, and the evidence link. Reuse the same problem explanation and approved evidence while tailoring each submission to its rubric.
