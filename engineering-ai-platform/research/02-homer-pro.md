# HOMER Pro

HOMER Pro is UL Solutions’ engineering and techno-economic software for sizing and evaluating hybrid microgrids and distributed-energy systems. Its core value is a structured search over system configurations, operating simulation, and lifecycle-cost comparison. The product is powerful within that domain, but the evidence reviewed points to a specialist desktop workflow with modular licensing and a learning curve rather than a unified, AI-native engineering environment.

## Capabilities and workflow

The documented workflow is: define project inputs under **Design**; add components, resources, and loads through the library; click **Calculate**; then review feasible configurations sorted by net present cost. Users can inspect tables and graphs, export results for reports, and run sensitivity analyses over variables such as resource availability and component costs. [1] The simulation evaluates a full year at time steps from one minute to one hour and models energy balance, generator dispatch, battery charging/discharging, and lifecycle costs including capital, replacement, O&M, fuel, and interest. [1]

HOMER combines three functions in one product: simulation, optimization, and sensitivity analysis. Its optimization can use exhaustive grid search or the proprietary derivative-free HOMER Optimizer to find least-cost configurations. [1] The product page describes use cases spanning remote systems, island utilities, campuses, and military bases. [2]

The base product covers solar PV, wind, batteries, diesel generators, and simple grid connections. Optional modules extend the model to biomass, hydro, combined heat and power, advanced AC/DC and deferrable loads, advanced grid tariffs, hydrogen, advanced battery behavior, multi-year degradation/escalation, and MATLAB-defined dispatch algorithms. [2] Recent release notes add storage-degradation tables, battery augmentation modeling, improved battery wear-cost calculations, demand-charge improvements, and multi-year Excel export improvements. [3]

## Interoperability

The official documentation explicitly supports exporting tables and graphs for reports and presentations. [1] HOMER Pro also offers a MATLAB Link add-on: engineers can write a custom dispatch strategy in MATLAB and integrate it into the HOMER simulation. The MATLAB installation is separately licensed by MathWorks. [4] The reviewed official material does not document a broad, open REST/API or native BIM/PLM/CAE integration layer, so those capabilities should not be assumed.

The current workflow is therefore interoperable mainly through exported analysis artifacts and a specialized MATLAB bridge. A unified AI-native platform could improve this by adding governed connectors for weather, tariffs, asset catalogs, CAD/BIM, spreadsheets, optimization services, and controller/SCADA data, while preserving traceable model inputs and assumptions.

## Pricing approach

UL Solutions publishes single-user commercial pricing for HOMER Pro. The **Base** plan is $187.50 per month or $1,575 billed annually, with no modules included. **Professional** is $373.50 per month or $3,100 annually and includes any four modules plus six-hour instructor-led training. **Expert** is $568.50 per month or $4,650 annually and includes all modules, including MATLAB Link and Multi-Year. All plans include basic support, software updates, simulation, optimization, and sensitivity analysis. [5]

The pricing page also states that shared licenses, enterprise needs, and volume purchases (25% discount for four or more licenses) require contacting UL Solutions. [5] The EULA describes a non-exclusive, non-transferable, non-sublicensable license for internal business purposes and allows quotes to specify authorized-user quantities and installation limits. [6] This is a conventional commercial-license model, with capability segmentation by paid module rather than usage-based or team-collaborative pricing.

## Weaknesses and user sentiment

HOMER Pro’s main weakness is complexity relative to accessibility. On Capterra, the product has a 4.4/5 rating from nine reviews, with average ease of use and customer service ratings of 4.0/5. Reviewers praise its simulation, renewable-resource modeling, data library, exports, and technical/financial analysis. [7] The same review set repeatedly reports a steep learning curve or complex interface, says that regional data libraries may need manual updating, and characterizes the product as relatively pricey compared with alternatives. One reviewer specifically noted that data could be exported to MATLAB for further analysis, but also wanted more current automatically maintained regional data. [7]

The official release history also shows that important engineering details have required continuing fixes, including emissions calculations, battery replacement reporting, hydrogen dispatch behavior, export correctness, and stability issues. [3] These are not proof of current defects, but they indicate the kind of model-governance and regression-testing burden an engineering platform must manage.

## Product opportunity for a unified AI-native engineering platform

HOMER Pro demonstrates a valuable, defensible workflow: formal component libraries, time-series simulation, optimization, sensitivity analysis, and economic ranking. The clearest opportunity is not to replace that solver blindly, but to surround it with an AI-native engineering layer that can ingest messy project data, propose and explain model assumptions, identify missing or stale inputs, orchestrate scenario runs, compare trade-offs in plain language, and produce auditable reports.

A differentiated platform could reduce the interface learning curve through guided model construction and domain-aware copilots; maintain live, versioned data connectors instead of relying on manually refreshed libraries; make scenario provenance and sensitivity coverage explicit; and expose solver results through APIs and collaborative workspaces. It should also preserve deterministic calculations, cite every imported assumption, show uncertainty, and require human approval before changing engineering constraints. HOMER’s modular add-ons and MATLAB bridge suggest demand for extensibility, while its license segmentation and specialist workflow suggest room for more transparent team, integration, and automation economics.

## References

[1]: https://homerenergy.com/products/pro/docs/latest/index.html "HOMER Pro 3.16 documentation: Welcome and How HOMER Works"
[2]: https://homerenergy.com/homer-pro "UL Solutions HOMER Pro product page"
[3]: https://homerenergy.com/homer-pro/releases "UL Solutions HOMER Pro release notes"
[4]: https://homerenergy.com/homer-pro/matlab-link "UL Solutions HOMER Pro MATLAB Link module"
[5]: https://homerenergy.com/homer-pro/pricing "UL Solutions HOMER Pro pricing"
[6]: https://homerenergy.com/end-user-license-agreement "UL Solutions Renewable Energy End User License Agreement"
[7]: https://www.capterra.com/p/182590/HOMER-Pro/reviews/ "Capterra HOMER Pro reviews"
