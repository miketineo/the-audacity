---
title: "The Audacity of Helium"
description: "In 1908, a physicist liquefied helium from 25 balloons of gas. The lesson for AI engineers: build the instruments to see what your agents are doing."
date: 2026-11-05
author: Miguel Tineo
keywords:
  - AI agent observability
  - AI engineering governance
  - agent evaluation
  - agentic systems
  - AI operations
---

In 1908, the entire world's usable supply of purified helium amounted to roughly 25 party balloons.

There was no helium industry. No supplier to call, no catalog to order from. The element had been discovered spectroscopically in the Sun in 1868, found on Earth only in 1895, and by the early twentieth century it remained a laboratory curiosity: a noble gas that stubbornly refused to liquefy under any conditions physicists had tried.

Heike Kamerlingh Onnes, working at the University of Leiden, decided to liquefy it anyway. He extracted helium from monazite sand, where it accumulates as a byproduct of uranium and thorium decay. From that tiny global supply, his team produced about 60 milliliters of liquid helium: roughly a teacup.

That teacup opened the door to superconductivity, MRI machines, quantum computing, and modern cryogenics. Not because 60 mL was a lot. Because it proved the thing was possible, and because the instruments Onnes built to get there became the foundation for everything that followed.

This is a story about instruments. And about what happens when you see an anomaly but don't have the apparatus to understand it.

## The Discovery That Didn't Happen

Onnes did something else in 1908 that almost nobody talks about. He cooled his liquid helium below 2.17 Kelvin and observed something strange: the liquid stopped boiling. Just stopped. The surface went perfectly still.

He noted the observation and moved on.

Decades later, scientists discovered that what Onnes had witnessed was the onset of superfluidity, one of the most extraordinary states of matter in physics. Below 2.17 K, helium-4 becomes a superfluid: it flows with zero viscosity, forms a nanometer-thin film (called a Rollin film) that climbs the walls of its container, flows over the rim, and drips down the outside until the liquid levels equalize. It passes through molecular-scale cracks. It defies every intuition about how liquids behave.

Onnes saw the edge of this. He saw the boiling stop. But he did not have the experimental setup, the conceptual framework, or the measurement instruments to make the phenomenon visible for what it was. He was not lacking in brilliance or conviction. He was lacking a deliberate experiment designed to reveal the anomaly.

The lesson is precise: observation is not discovery. Discovery requires an instrument built to make the invisible visible.

## Twenty-Five Balloons and a Missing Market

Before we get to AI, stay with the helium for a moment, because the structural parallels are worth drawing carefully.

In 1908, Onnes faced three problems simultaneously:

**No supply chain.** Helium did not come in bottles. He had to build the extraction process from raw mineralogy. Every step of the pipeline, from sourcing monazite sand to purifying the gas, was custom infrastructure that did not exist before he needed it.

**No prior art at the target conditions.** Helium's boiling point (4.2 K) was far below anything previously liquefied. The cascading refrigeration technique Onnes used (precooling with liquid air, then liquid hydrogen, then expanding the helium through a Joule-Thomson valve) required engineering at temperatures where most materials become brittle and most seals fail.

**An anomaly with no theory.** When the liquid behaved strangely, there was no quantum mechanical framework to explain it. Bose-Einstein statistics would not be formulated for another sixteen years. Onnes could not have recognized superfluidity because the concept did not yet exist.

What Onnes *did* build was a world-class cryogenics laboratory: the instruments, the technique, the institutional knowledge to operate at temperatures nobody else could reach. That laboratory, not the 60 mL of liquid, was the real output. It became the platform on which superconductivity was discovered three years later, in 1911.

The scarcity, the missing infrastructure, and the unexplained anomalies were not obstacles. They were signals of a future platform.

## The AI Engineering Parallel

Now bring this forward a century.

Today's AI engineering sits in a structural position that rhymes with Onnes's Leiden lab. The core capability exists: large language models work, agents can execute multi-step tasks, and autonomous systems are writing code, managing infrastructure, and making decisions in production environments. The "helium" has been found.

But most teams are running their agent systems the way Onnes ran his first experiments: they can tell you whether the thing "works," but they cannot tell you what it is actually doing.

Ask a team deploying an AI agent: does it ever exceed its permissions? Does it leak data across context boundaries? When it loops, does anyone notice before the bill arrives? When it hallucinates confidently, what catches it? When it makes a decision that is technically correct but operationally dangerous, what boundary stops it?

Most honest answers sound like: "We watch the logs." Or: "We'd notice if something went really wrong." Or the most revealing: "It seems to work fine."

That is Onnes watching the boiling stop and writing "peculiar behavior" in his notebook.

## What the Instrument Gap Looks Like in Practice

The missed discoveries in AI engineering are not theoretical. They are happening now, in specific, concrete ways.

**Permission drift.** An agent that starts with read-only access gradually acquires broader permissions through tool-use chains, and nobody audits the effective permission surface after deployment. The agent "works," but its blast radius has expanded silently.

**Cost runaway.** An autonomous coding agent enters a retry loop on a failing test, burns through thousands of API calls, and the team discovers it on the monthly invoice. The agent "worked" (it kept trying) but there was no cost ceiling, no circuit breaker, no alert.

**Confident hallucination in tool use.** An agent calls an API with fabricated parameters that happen to return a 200 response (because the API is permissive), and the result propagates downstream. The output looks plausible. Without a validation gate, nobody catches it.

**Cross-boundary data flow.** A multi-agent system passes customer data from one context to another through shared memory or tool outputs, violating data residency or access control policies that were carefully designed for human workflows but never adapted for agent workflows.

These are not edge cases. They are the normal operating conditions of agentic systems deployed without instrumentation. They are the superfluid behaviors climbing the walls of the container while the team watches the surface and sees calm.

## Build the Laboratory, Not Just the Experiment

Onnes's lasting contribution was not liquid helium. It was the Leiden cryogenics laboratory: a platform of instruments, techniques, and institutional capability that produced discoveries for decades.

The equivalent in AI engineering is the agent operations control plane. Not another chatbot framework. Not another agent builder. The infrastructure that makes autonomous systems observable, governable, and safe:

**Identity and permissions.** Every agent action is attributable to a specific identity with explicit, auditable permissions. Not "the AI did it." Which agent, with which credentials, authorized by which policy, at which time.

**Sandboxing and blast radius control.** Agents operate within defined boundaries. When an agent exceeds its operational envelope, the system constrains it before damage propagates. This is not a feature request. This is the difference between a lab experiment and an uncontrolled reaction.

**Evaluation gates.** Before an agent's output reaches production, it passes through evaluation checkpoints designed to catch specific failure modes. Not "does it look right" but "does it satisfy these concrete correctness criteria." Deliberate experiments, designed to reveal anomalies.

**Observability and audit trails.** Every decision, every tool call, every data access is logged in a format that supports incident investigation and replay. When something goes wrong (and it will), the team can reconstruct exactly what happened, not guess from partial logs.

**Cost ceilings and circuit breakers.** Autonomous systems have hard budget limits and automatic shutoffs. An agent that enters a loop hits a wall before it hits a bill.

**Rollback.** When an agent makes a change to production state, that change is reversible. The system maintains the ability to undo what the agent did, not just stop it from doing more.

## The Thesis, Plainly Stated

The next breakthroughs in AI will come less from bigger models and more from better instruments.

We are in the era of 25 balloons. The raw capability is scarce, precious, and poorly understood. The teams that win will not be the ones with the most helium. They will be the ones who build the laboratory: the evaluation frameworks, the observability platforms, the governance systems, and the deliberate "cup experiments" that reveal what autonomous systems can and cannot safely do.

When your agent's output contradicts your expectations, that is not noise. That is the boiling stopping. Do not normalize the anomaly. Design the next experiment.
