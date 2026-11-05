---
title: "The Audacity of Helium"
description: "In 1908 a Leiden laboratory turned 25 balloons of helium into a teacup of liquid. The thirty years that followed show why AI agents need instruments."
date: 2026-11-05
---

In 1908 the purified helium in Heike Kamerlingh Onnes's laboratory in Leiden would have filled about 25 party balloons. No company sold helium. The element had been seen in the spectrum of the Sun in 1868 and found on Earth in 1895, and thirteen years later it was still the one gas nobody had turned into a liquid.

Onnes made his own supply. He extracted the gas from monazite sand, a mineral in which helium collects as uranium and thorium decay, and purified it in his own laboratory. On 10 July 1908 his team cooled that gas with liquid air, then with liquid hydrogen, and then expanded it through a valve until it condensed. The yield was about 60 milliliters of liquid helium, roughly a teacup.

That teacup led to superconductivity, which the same laboratory discovered three years later, and from there to MRI magnets and the refrigerators that cool quantum computers. The liquid was the smaller result. The larger one was a laboratory that could reach temperatures nobody else could, and measure what happened there.

This essay is about that second result, and about what the laboratory still could not see.

## The superfluid sat in the cryostat for thirty years

Soon after the first run, Onnes pumped vapor off the liquid and brought it down to about 1.5 K. That is below 2.17 K, the temperature at which helium becomes a superfluid. From then on, one of the strangest states of matter in physics was sitting in his apparatus.

The signs arrived one at a time. In 1911 his measurements showed the density of the liquid peaking near 2.2 K. In 1922 he recorded that two volumes of liquid helium in his apparatus adjusted themselves to the same level. Both results were recorded. Nobody yet read them as signs of a new state of matter.

Onnes died in 1926. In 1932 John McLennan in Toronto reported that helium stops boiling as it cools through 2.2 K, and the surface goes still. In January 1938 Pyotr Kapitza in Moscow, and John Allen and Don Misener in Cambridge, published measurements of helium flowing through narrow channels with almost no viscosity. Kapitza gave the state its name, superfluidity. Over the next year, experiments with small beakers showed how the levels had equalized in 1922. The liquid climbs the wall of its container as a film about 30 nanometers thick, crosses the rim, and runs down the other side.

Onnes had the liquid, the temperature and the anomalies. He lacked a theory that predicted the behavior (the quantum statistics behind it date from 1924) and an experiment built to expose it. The beaker experiments were that kind of experiment. They asked one narrow question, where the liquid goes, and arranged the apparatus so the answer was visible.

## Scarcity and missing tools marked the next platform

The conditions in Leiden had three parts, and each one recurs whenever a new capability arrives.

First, there was no supply chain. Every step from sand to purified gas was infrastructure the laboratory built for itself.

Second, there was no prior practice at the target conditions. Helium boils at 4.2 K, far below hydrogen at 20 K, and at those temperatures seals fail and materials turn brittle. The engineering had to be worked out as it went.

Third, the liquid showed behavior that no theory covered.

A field with those three conditions is early. Onnes answered them with instruments, technique and trained people. For fifteen years Leiden was the only laboratory in the world that could make liquid helium, and it kept producing discoveries for decades.

## AI agents are in the same position today

Large language models work. Agents built on them write code, operate infrastructure and make decisions inside production systems. The capability is real and the practice around it is young.

Most teams can say whether an agent completed its task. Fewer can say what it did on the way: which permissions it used, which data it read, how many attempts it made and what they cost. The usual evidence is a log that someone reads after a problem.

That is the position of a laboratory with a density curve and no beaker experiment. The behavior is present. The instrument that would show it has yet to be built.

## Four behaviors go unseen without instruments

Four are worth looking for first.

**Permission drift.** An agent starts with read access and gains wider reach through chains of tool calls. Nobody reviews the effective permissions after deployment, so the blast radius grows without a record.

**Cost runaway.** A coding agent retries a failing test in a loop and makes thousands of model calls. With no budget ceiling and no alert, the first signal is the invoice.

**Plausible errors in tool use.** An agent calls an API with parameters it made up. A permissive API returns success, and the result flows downstream looking correct. Only a validation step at that boundary catches it.

**Data crossing boundaries.** A multi-agent system passes customer data between contexts through shared memory or tool output. Access rules written for human workflows leave that path uncovered.

Each of these is the film on the wall of the container. The surface looks calm from above while the liquid leaves over the rim.

## Build the laboratory before you scale the agent

The Leiden equivalent for agents is an operations control plane, the layer that makes autonomous software observable and governable. It has six parts.

- **Identity and permissions.** Every action traces to a named agent, its credentials and the policy that allowed it.
- **Sandboxing.** Agents run inside defined limits, and the system stops an agent that leaves them before the damage spreads.
- **Evaluation gates.** Output passes tests written for specific failure modes before it reaches production. Each test is a beaker experiment, built to make one behavior visible.
- **Observability and audit trails.** Decisions, tool calls and data access are recorded in a form that supports incident replay.
- **Cost ceilings.** Hard budgets and automatic shutoffs end a loop before it becomes a bill.
- **Rollback.** Changes an agent makes to production state can be undone.

Treat the agent as production infrastructure and these become ordinary engineering requirements, the same ones a database or a deploy pipeline already meets.

## Better instruments will matter more than bigger models

The next breakthroughs in AI will come less from bigger models and more from better instruments: evaluations, observability, governance and safety boundaries. Model capability will keep growing. The teams that get the most from it will be the ones that can see what their agents do, because they built the instruments first.

The Leiden laboratory held a superfluid for thirty years before anyone designed the experiment that showed it. When an agent's behavior contradicts your model of it, record the anomaly, then build the experiment that explains it.
