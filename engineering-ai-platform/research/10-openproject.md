# OpenProject

OpenProject is an open-source project-management platform designed for classic, agile, and hybrid delivery. Its strongest fit is a team that needs one auditable system for plans, work items, dependencies, sprints, time/cost tracking, and project documentation, with either self-managed deployment or vendor-hosted cloud. It is not, on the evidence reviewed, a complete engineering system of record for source code, CI/CD, incident operations, or AI-assisted software development.

## Capabilities and workflows

The core object is the **work package**: a typed, uniquely identified item such as a task, feature, risk, user story, bug, phase, or milestone. Work packages support status, assignee, priority, dates, custom attributes, relations, hierarchies, comments/activity, CSV import, and export to tools such as Excel [1]. This provides a durable workflow from intake and decomposition through ownership, execution, review, and reporting.

For plan-driven work, OpenProject provides collaborative Gantt charts with drag-and-drop dates, parent/child structure, predecessor/follower dependencies, multi-project timelines, saved views, baseline comparison, and printing/export paths [2]. For agile delivery, the Backlogs module supports product and sprint backlogs, prioritization, story points, sprint boards, filters, and burndown charts; the documentation notes that the module is still being actively improved [3]. The broader product scope also includes Kanban/action boards, meetings, calendars, time tracking, costs, budgets, reports, wiki, documents, forums, permissions, and custom workflows [4]. This combination makes hybrid governance a meaningful differentiator: teams can connect portfolio-style milestones and dependencies to iterative sprint execution rather than choosing only waterfall or only Scrum.

## Interoperability and AI

Official integrations include basic GitHub, GitLab, Nextcloud, and (with plan restrictions) XWiki, OneDrive, and SharePoint. Community or unsupported integrations include Slack, Mattermost, time-tracking products, and others. OpenProject explicitly says it has no direct Jira integration; Jira migration is available through a beta migrator, while Excel synchronization, API-based migration, or partners are alternatives. Trello and Microsoft Project generally require export/import or Excel-based workarounds [5].

The API surface is useful but incomplete: API v3 is a general-purpose HATEOAS API, and OpenProject also documents SCIM, BCF v2.1 for BIM, and MCP. The project warns that not all resources/actions are accessible through APIs and that the specification is still evolving [6].

OpenProject’s AI strategy is deliberately provider-neutral. Its MCP Server lets compatible assistants query project context, summarize progress and risks, and create or update permitted project data under the authenticated user’s OAuth2 identity, existing roles, and administrator-selected tools. OpenProject says teams choose the AI client, model, infrastructure, and data-processing location. Current MCP support includes read/write access to project information and work packages, comments, and relations; deletion of work packages is not allowed, and support for additional objects such as time entries and meetings is in progress [7]. Native text assistance, semantic search, reporting, and broader AI project/portfolio workflows are described as ongoing development or roadmap work, not as fully available product capabilities [7].

For a unified AI-native engineering platform, the opportunity is therefore clear but bounded: preserve OpenProject’s open-source, permission-aware project graph and add first-class engineering connectors, semantic search across code/design/CI/incident evidence, dependable dependency and risk reasoning, and human-reviewed agent workflows. The existing MCP boundary is a credible foundation for agent interoperability, but the product would need deeper native engineering context and more complete API coverage to become the execution layer for software teams rather than the planning layer around them.

## Pricing approach

OpenProject has a free Community edition with no minimum users, community features, and community support; it is self-managed/on-premises. Hosted cloud is Enterprise-only. The pricing page currently lists paid Enterprise tiers with a 25-user minimum for Basic and Professional, a 100-user minimum for Premium, and a 250-user minimum for Corporate. The displayed EU monthly prices are €5.95/user for Basic, €10.95/user for Professional, and €15.95/user for Premium; Corporate is quote-based. Annual and multi-year commitments reduce the effective price, and BIM is listed as an additional €1/user. Enterprise tiers add progressively more add-ons and support, from email support through phone, remote hands, installation/upgrade assistance, dedicated support, training, and custom-plugin support. A 14-day Enterprise cloud trial and 14-day self-hosted Enterprise trial are offered [8]. Buyers should verify the live regional selector and feature matrix because plan entitlements and displayed currency are configurable on the pricing page.

## Weaknesses and user sentiment

The main structural weakness is breadth without full engineering depth. Officially, integrations are uneven: some are basic, some community-maintained, some Enterprise-only, and Jira/Trello/MS Project rely on migration or file-based workarounds [5]. The API documentation itself says coverage is incomplete [6]. The AI offering is promising but currently centered on MCP connectivity; several more ambitious AI functions remain in development [7]. Self-managed Community users also trade subscription cost for operational responsibility, while important enterprise add-ons and support sit behind paid tiers [8].

Independent Capterra reviews provide directional, not universal, evidence of user experience. The page reports 4.6/5 from 189 reviews and praises Gantt charts, Kanban/agile tools, configurability, self-hosting, data sovereignty, and the REST API. Reported drawbacks include no offline access, historical complaints about the lack of a mobile app, occasional server errors, difficulty duplicating assignments across subprojects, and burdensome scheduling/resource management. One reviewer said executive/resource views and resource-loading reports required other tools; another noted that some features are paywalled. These are reviewer observations rather than product-wide measurements, but they reinforce the documented integration, mobile/offline, and operational-complexity risks [9].

## Assessment for a unified AI-native engineering platform

OpenProject is a strong candidate as an open, governed project-context layer: it has a rich work-item graph, hybrid planning/agile workflows, self-hosting, data sovereignty, stable-ish APIs, and an MCP design that lets organizations choose their own model and infrastructure. Its weakness as a standalone AI-native engineering platform is that code, build, deployment, incident, and knowledge-system context are not first-class in the reviewed product surface; integration coverage is mixed; API coverage is incomplete; and several native AI features are still planned or being developed. The best product opportunity is to build on OpenProject’s permissioned project graph while supplying deep engineering-system ingestion, cross-artifact reasoning, and safe, reviewable automation rather than treating MCP connectivity alone as equivalent to native AI capability.

## References

[1]: https://www.openproject.org/docs/user-guide/work-packages/ "OpenProject work packages documentation"
[2]: https://www.openproject.org/docs/user-guide/gantt-chart/ "OpenProject Gantt charts documentation"
[3]: https://www.openproject.org/docs/user-guide/backlogs-scrum/ "OpenProject backlog and sprint documentation"
[4]: https://www.openproject.org/docs/glossary/ "OpenProject glossary"
[5]: https://www.openproject.org/docs/system-admin-guide/integrations/ "OpenProject integrations and community plugins"
[6]: https://www.openproject.org/docs/api/ "OpenProject API documentation"
[7]: https://www.openproject.org/ai "Responsible AI with OpenProject"
[8]: https://www.openproject.org/pricing/ "OpenProject pricing"
[9]: https://www.capterra.com/p/152761/OpenProject/reviews/ "Capterra OpenProject reviews"
