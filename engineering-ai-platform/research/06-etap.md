# ETAP: evidence-backed platform assessment

## Positioning and capabilities

ETAP is an electrical power-system engineering platform built around an electrical digital twin. Its current Power Simulator offering combines network modeling, physics-based simulation, reporting, and operational analysis. ETAP says the platform supports offline and real-time predictive simulation, with an AI-augmented digital twin and standards-based tools.[1]

The workflow spans design through operation: users create and edit intelligent single-line network models, run studies, compare scenarios, produce engineering deliverables, and use the same model for operational or maintenance context. The core subscription includes load flow, short circuit, transformer and cable sizing, network project management, reporting, a 3D network view, and an equipment/protection library that ETAP describes as containing more than 140,000 verified and validated models.[1]

The breadth is modular. Launch, Grow, and Scale bundles progressively add protection coordination and evaluation, motor studies, harmonics, flicker, and line studies. Optional packages cover arc flash, cable systems, DC networks, reliability and dynamic stability, controls, renewable/grid-interconnection studies, battery systems, switching and distribution optimization, transmission planning, railway traction, and GIS/CIM/MultiSpeak/ArcGIS exchange.[1] ETAP 2026 also advertises AI Autocomplete, AI-augmented intelligence, maintenance integrated into the digital twin, and expanded renewable, BESS, and inverter-based-system analysis.[1]

## Interoperability and automation

Interoperability is a meaningful strength. ETAP lists built-in exchange with Excel, AutoCAD, Revit, AVEVA Engineering, Caneco BT, ERACS, SKM, CIM, and GIS-related formats/tools, with additional industry converters and export options.[1] Its public etapAPI is a REST service exposed through DataHub. It can be consumed from any REST-compatible language or device, retrieve and modify project data, trigger studies such as load flow, interact with scenarios, and support remote, parallel, and batch studies across ETAP instances.[2] ETAP states that SOAP remains supported but is being migrated toward REST and is expected to be deprecated.[2]

This creates a useful automation path for an AI-native engineering platform: an assistant could orchestrate model queries, scenario generation, study execution, result comparison, and report preparation while leaving the engineering solver and validation workflow in ETAP. However, the evidence supports API-driven orchestration, not a claim that ETAP itself provides a general-purpose generative engineering copilot.

## Pricing approach

ETAP does not publish numeric list prices on the reviewed official pages. Its commercial model is subscription-based, with annual or multi-year options, selectable bundles, add-ons, license duration, license type, and user count. The official quote flow asks the buyer to select a product, bundle, optional add-ons, license choices, duration, and number of users before submitting a request.[1][3] The public form exposes three Power Simulator tiers—Launch, Grow, and Scale—and indicates 3- or 5-year duration choices and user bands, but not prices.[3] ETAP also advertises a 30-day cloud-based demo.[2]

## Weaknesses and opportunity

The main buyer-facing weakness is commercial opacity: customers must request a quote, and the modular bundle/add-on structure can make total cost and capability comparison difficult. This is an inference from the official quote-only flow, not a published price critique.[3]

Independent G2 evidence is positive overall but limited in sample size: ETAP is shown at 4.3/5 from 22 reviews. The same page includes complaints about difficult licensing and unresponsive or slow onboarding/sales support, plus individual reviewers describing the product as costly, not open source, and needing more equipment-library coverage. One reviewer also criticized payment, PLC tooling, and documentation.[4] These are user reports, not independently verified product defects, but they identify adoption friction that a unified AI-native alternative could address through transparent packaging, self-serve provisioning, guided onboarding, broader connectors and libraries, and stronger documentation.

For a unified AI-native engineering platform, ETAP’s opportunity gap is therefore less about missing electrical analysis depth and more about experience and coordination: make multi-domain model ingestion explainable, expose solver/API actions through a governed assistant, provide traceable assumptions and validation, unify design/operations/maintenance data, and reduce licensing and setup friction. ETAP’s existing digital twin and REST foundation make it a strong interoperability target or benchmark, while its quote-led commercial model and reported onboarding friction leave room for a simpler, more transparent platform experience.

## References

[1]: https://etap.com/power-simulator "ETAP Power Simulator"
[2]: https://etap.com/product/etap-rest-api "etapAPI – Connect to ETAP"
[3]: https://etap.com/request-pricing-subscription "ETAP Request Pricing: Now Available on Subscription"
[4]: https://www.g2.com/products/etap/reviews?qs=pros-and-cons "G2 ETAP Reviews: Pros and Cons"
