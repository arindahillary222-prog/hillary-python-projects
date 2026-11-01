# PVsyst

PVsyst is a specialist photovoltaic system design and simulation product. Its central value is a detailed, bankability-oriented performance model rather than an end-to-end project-delivery workspace. The official product page describes a workflow of **Define → Design → Simulate → Analyse**, with project variants, component selection, shading/loss definition, hourly simulation, and configurable reports.[1]

## Capabilities and workflow

PVsyst 8 supports grid-connected, standalone, and solar-pumping systems. It can model fixed planes and trackers, bifacial systems, battery storage, self-consumption, peak-shaving/energy-management scenarios, degradation/ageing, and economic metrics including NPV, LCOE, ROI, CAPEX, and OPEX.[1] The official grid-connected manual describes full-year hourly simulation and detailed gains/losses reporting; its contents cover orientations, multi-MPPT and power-sharing design, thermal/ohmic/mismatch/soiling/IAM/auxiliary/unavailability losses, storage, horizon and near-shading, P50–P90 estimation, and energy management.[2]

The workflow is project- and variant-based. Users select or import meteorological data, define orientation and system components, construct or import a 3D shading scene, validate parameter consistency, run the simulation, and inspect results. The measured-data workflow reuses the project and variant definitions while replacing the original weather file with measured data, enabling comparison of measured and simulated values.[3]

PVsyst includes mapping and multiple weather-data sources, including Meteonorm 9, NASA POWER, PVGIS-TMY, NLR/NSRDB TMY, Solcast TMY, SolarAnywhere TGY, and Solargis, plus manual import formats.[1] It maintains databases of modules, inverters, batteries, pumps, optimizers, sites, and weather data. The product page says the component database is verified and regularly updated, but this is a vendor claim rather than an independently audited quality measure.[1]

## Interoperability and automation

The desktop application can import and export projects, simulation variants, components, weather data, and shading files through its project-data structure; projects may include referenced files and can be packaged as ZIP exports.[4] The official product page says near-shading scenes can be imported from another CAD tool, but the cited page does not specify a universal CAD format or a broad open API.[1]

PVsystCLI is the main automation surface. It runs simulations, converts external meteorological files, supports batch configuration and multi-parameter simulations, emits CSV results, and generates conventional PVsyst reports in multiple languages.[5] It can also convert monitoring data into MET files for comparison with electrical measurements and create SIT files for comparative site simulations.[5] This is meaningful interoperability for engineering pipelines, but it remains a licensed Windows command-line product built around PVsyst project/variant inputs—not evidence of a cloud-native, collaborative data model or a general-purpose engineering API.

## Pricing approach

PVsyst uses annual, proprietary, per-computer licensing. The official shop lists PVsyst 8 Professional at **CHF 700 per year**, including updates and access to PVsyst 7; grouped purchases receive 5%, 15%, or 20% discounts for 2–4, 5–9, or 10+ licenses.[6] A one-month free trial is advertised.[1] Education, classroom, student, and training/research plans are discounted but carry report watermarks or eligibility requirements.[1] PVsystCLI is listed at **CHF 3,000 per year**, with server-side installation and remote access unlocked; its two-month trial is limited to 250 simulation runs.[5] The shop says the desktop license is required to set up a new CLI project and to open the project in the GUI after CLI simulation.[5]

## Weaknesses and limitations

The most concrete limitations are deployment and collaboration constraints. PVsyst’s official requirements state that the desktop application runs only on Windows, must be installed on the workstation where it is used, and does not support Windows Server; its workspace does not support shared or remotely synced folders such as OneDrive, Google Drive, or Dropbox.[7] The product page additionally lists unsupported remote/application-virtualization environments and requires one license per computer.[1] These constraints make centralized, browser-based collaboration, elastic compute, and single-source-of-truth project management harder than in a cloud-native product.

The product also has a specialist, input-sensitive workflow. An independent r/solar discussion includes a practitioner describing PVsyst as “the most accepted tool” and “the king in production modelling,” while also noting known limitations, including weaker accuracy for some multiple-MPPT/optimizer configurations and the importance of model and weather-file quality.[8] The same discussion characterizes PVsyst as more research-oriented and less usable than a practitioner-oriented web tool, while reporting that financiers may require a PVsyst report even when another tool is used for most of the design process.[8] These are anecdotal community opinions, not controlled benchmarks, but they indicate both strong market acceptance and usability/interoperability friction.

## Product opportunity for a unified AI-native engineering platform

PVsyst shows a valuable “trust anchor”: detailed physical/loss modelling, a large component and weather-data ecosystem, measured-vs-simulated validation, and financier-recognized reports. A unified AI-native platform should preserve those deterministic, reviewable calculations while adding a cloud project graph, versioned assumptions, role-based collaboration, browser access, and connectors for CAD, GIS, monitoring, finance, and procurement systems. AI could reduce the manual burden around importing and checking weather/component data, mapping design intent into simulation variants, detecting inconsistent assumptions, comparing scenarios, and explaining losses or report deltas in plain language.

The opportunity is not to replace PVsyst’s validated physics with opaque generation. It is to orchestrate PVsyst-class engines alongside layout, electrical, storage, commercial, and operational workflows, with provenance for every input and human approval before an investment-grade report is issued. PVsystCLI provides a precedent for batch and programmatic execution; the gap is a broader, collaborative control plane rather than evidence that PVsyst itself offers one.

## References

[1]: https://www.pvsyst.com/en/products/pvsyst "PVsyst 8 product page"
[2]: https://www.pvsyst.com/pdf/pdf-tutorials/pvsyst-8/pvsyst-tutorial-v8-grid-connected-en.pdf "PVsyst 8 Grid Connected Systems user manual"
[3]: https://www.pvsyst.com/help/measured-data/index.html "PVsyst measured data documentation"
[4]: https://www.pvsyst.com/help/getting-started/file-organisation/user-data/projects-and-pv-components/export-projects-and-components.html "PVsyst export projects and components documentation"
[5]: https://www.pvsyst.com/en/products/pvsyst-cli "PVsystCLI product page"
[6]: https://www.pvsyst.com/en/shop/ "PVsyst official shop and license pricing"
[7]: https://www.pvsyst.com/help/getting-started/requirements.html "PVsyst system requirements"
[8]: https://www.reddit.com/r/solar/comments/6k3d72/commercial_solar_professionals_pvsyst_vs/ "Independent r/solar discussion: PVSyst vs. Helioscope and others"
