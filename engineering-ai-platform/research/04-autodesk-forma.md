# Autodesk Revit and Forma

## Position and capabilities

Autodesk’s current offering is best understood as a connected product family rather than one unified application. Revit is the Windows-based BIM authoring and documentation system for architecture, structures, MEP, and construction. Its core strengths are parametric components, coordinated drawings and schedules, worksharing, and model-based documentation. Autodesk also lists IFC, 3DM, SKP, OBJ, and STEP interoperability, plus Dynamo, an API, and an App Store ecosystem for extensions. Revit includes Generative Design and Autodesk Assistant capabilities, but Autodesk labels the Assistant and direct Forma wind/carbon tools as technology previews on the overview page. [1]

Forma Site Design is Autodesk’s cloud product for pre-design and schematic site planning. It combines site/context setup, massing, environmental analysis, design review, and geolocation. Forma Building Design extends the early-phase workflow into building schematic design: teams can create/edit facades, floor plans, and units; track unit mix and areas; and test sun hours, daylight potential, and embodied carbon before moving the selected option into Revit as a geolocated native model. Autodesk describes these tools as complementary to Revit, not as a replacement for detailed BIM authoring. [2] [3]

## Workflow and interoperability

The intended workflow is iterative: explore site and building options in the browser-based Forma products, run early performance studies, then send a proposal into Revit for detailed design and documentation. Autodesk’s Revit add-in can transfer Forma buildings, site limits, terrain, and buildable areas into editable Revit elements. The documented mappings include terrain to Toposolids/Toposurfaces, basic buildings to walls/floors/roofs, 3D sketch buildings to mass families, and some context/vegetation to Generic Models or Direct Shapes. Revit changes can be sent back to Forma for further analysis, and view filters can limit the update. [4]

The loop is useful but not lossless. Autodesk’s own tutorial states that when edited buildings are sent back from Revit, those buildings become mesh objects in Forma and Forma cannot calculate their areas for them; the area numbers remain controlled in Revit. The same tutorial says buildings can be added or removed in Revit and reflected in Forma. This is a material boundary for an AI-native engineering system that would want one continuously authoritative model and consistent analysis semantics across phases. [5]

Revit’s broader open ecosystem and common-format support reduce lock-in at the file level, but the highest-fidelity workflow remains Autodesk-centered: Forma, Revit, Autodesk data management, and related Autodesk services. Forma Site Design also advertises connections to Dynamo, Rhino, IFC, and OBJ, with third-party extensions available through the Autodesk App Store. [1] [2]

## Pricing approach

Autodesk uses subscription and tokenized consumption pricing. The official Revit buy page lists US pricing of $251/month when paid annually ($3,005/year for one user), $380 for a monthly subscription, or Flex at $99 for 33 tokens with 10 tokens/day for Revit; terms, market, taxes, and promotional changes may affect checkout pricing. Autodesk also offers annual or three-year terms, monthly no-contract access, and shared Flex token pools. [6]

Forma Site Design’s product page currently shows a starting price of $59/month near the header, while its FAQ states $85/month, $700/year, or $2,100 for three years, and says it is also available through the AEC Collection. Because the same official page presents inconsistent figures, the report should treat the FAQ figures as a listed reference rather than a guaranteed quote and direct buyers to the live purchase page. Forma Building Design is included with Revit subscriptions and the AEC Collection, and is also offered through Forma for Buildings; Autodesk does not expose a standalone price on the page captured here. Construction-oriented Forma bundles use quote-based, user/project/account pricing. [2] [3] [7]

This structure creates a clear commercial strength—customers can assemble a bundle around project phase and usage—but also a complexity risk. A buyer may need to understand separate entitlements, named users, Flex tokens, bundles, and cloud services to determine the true cost of a continuous workflow.

## Weaknesses and user sentiment

The principal product weakness is phase and data fragmentation. Forma is optimized for fast early exploration and analysis; Revit is optimized for controlled, detailed BIM and documentation. The documented mesh conversion and lost/unsupported area calculations show that the handoff can change object semantics, not merely transfer presentation geometry. That creates opportunities for rework, duplicate authority, and inconsistent metrics.

The second weakness is operational weight. Independent Capterra reviews rate Revit 4.6/5 from 484 reviews, while individual verified reviewers mention performance issues on large models, a steep learning curve, weak native rendering that can require third-party plugins, and a higher price burden for smaller or startup firms. These are user reports, not independently measured benchmarks, but they provide useful sentiment alongside Autodesk’s feature claims. [8]

## Opportunity for a unified AI-native engineering platform

The strongest opportunity is not simply to add a chatbot to BIM. It is to unify the decision loop that Autodesk currently distributes across Forma and Revit: ingest context and constraints, generate alternatives, run multidisciplinary analyses, preserve a single semantic model, explain trade-offs, and promote an approved option into detailed engineering without mesh fallbacks or metric loss.

A differentiated platform could provide a versioned, phase-spanning model graph with explicit provenance for every AI-generated element and analysis result; natural-language constraint and requirements capture; multi-objective optimization across cost, carbon, constructability, code checks, daylight, wind, and schedule; and reversible synchronization between conceptual and detailed representations. It should also expose open APIs and robust IFC/industry-format exchange while keeping a canonical internal schema. Autodesk’s current ecosystem validates demand for connected early-to-detailed workflows, but its own conversion caveats and fragmented pricing leave room for a simpler, more transparent product with stronger semantic continuity and human-verifiable AI decisions.

## References

[1]: https://www.autodesk.com/products/revit/overview "Autodesk Revit overview"
[2]: https://www.autodesk.com/products/forma-site-design/overview "Autodesk Forma Site Design overview"
[3]: https://www.autodesk.com/products/forma-building-design/overview "Autodesk Forma Building Design overview"
[4]: https://blogs.autodesk.com/forma/2023/07/14/revit-hybrid-workflows/ "Interoperability workflow between Forma and Revit"
[5]: https://www.autodesk.com/learn/ondemand/curated/forma-revit-interoperability/68f0jmTsqSS0vz5iM8ztfT "Send a proposal from Revit back to Forma Site Design"
[6]: https://www.autodesk.com/products/revit/buy "Buy Revit"
[7]: https://construction.autodesk.com/pricing/ "Autodesk Forma pricing"
[8]: https://www.capterra.com/p/265023/Revit/reviews/ "Capterra Revit reviews"
