# Business Central Time Tracker for Azure DevOps

Track time on Azure DevOps work items and sync seamlessly to Microsoft Dynamics 365 Business Central.

## Overview

This Azure DevOps extension adds time tracking capabilities directly within work items, allowing teams to log time and automatically sync entries to Business Central's timesheet system.

## Features

- **Manual Time Entry** - Add time entries with date, duration, and description directly from work items
- **Time History** - View all time entries logged for each work item
- **Business Central Integration** - Automatic synchronization with BC timeRegistrationEntry API
- **OAuth Authentication** - Secure authentication via Microsoft Entra ID

## Architecture

**Extension Type**: Work Item Form Extension
**Target Platform**: Azure DevOps Services & Server
**Integration**: Business Central API v2.0
**Authentication**: OAuth 2.0 (Microsoft Entra ID)

## Development Status

This project is currently in planning phase. See [Issue #1](https://github.com/knowall-ai/devops-bc-timetracker/issues/1) for complete implementation details and technical specifications.

## Reference Implementations

- [Harvest Time Tracking for Azure DevOps](https://marketplace.visualstudio.com/items?itemName=SaaSKit.HarvestTimeTrackingForAzureDevOps)
- [Zendesk BC TimeTracker](https://github.com/knowall-ai/zendesk-bc-timetracker)

## Documentation

- [Azure DevOps Extension Development](https://learn.microsoft.com/en-us/azure/devops/extend/)
- [Business Central API v2.0](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/)
- [timeRegistrationEntry Resource](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/resources/dynamics_timeregistrationentry)

## Contributing

Contributions are welcome! Please check [Issue #1](https://github.com/knowall-ai/devops-bc-timetracker/issues/1) for the complete development roadmap and technical specifications.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contact

**Organization**: KnowAll.ai
**Email**: ben.weeks@outlook.com
