# Business Central Time Tracker for Azure DevOps

An Azure DevOps work item extension for logging time directly to Microsoft Dynamics 365 Business Central.

## Features

- Adds a **Time Tracking** group to Azure DevOps work item forms.
- Logs date, hours, description, and optional job number to Business Central `timeRegistrationEntries`.
- Finds the Business Central employee from the Azure DevOps user email, with a manual Employee ID fallback.
- Uses Microsoft Entra ID OAuth 2.0 with PKCE, so no client secret is stored in the browser.
- Shows Business Central time entries linked to the current work item by a stable `ADO Work Item #<id>` marker.

## Setup

1. Create or reuse a Microsoft Entra ID public client application.
2. Add the extension URL as a redirect URI after the Azure DevOps extension is published.
3. Grant delegated Business Central API permissions that can read employees and create time registration entries.
4. Install the extension in Azure DevOps.
5. Open any work item, expand **Time Tracking**, and save:
   - Tenant ID
   - Entra App Client ID
   - Business Central environment, for example `production` or `sandbox`
   - Business Central company ID
   - optional Employee ID fallback
   - optional default job number
6. Connect to Business Central, then log time from the work item form.

## Development

```bash
npm install
npm run validate
npm run package
```

`npm run package` builds the extension and writes a VSIX package under `dist/vsix`.

## Implementation Notes

The extension is intentionally client-only because Azure DevOps work item form extensions run in an iframe. Tokens and settings are stored in browser local storage for the signed-in user. The OAuth flow uses PKCE and refresh tokens from Microsoft identity platform; a confidential client secret is not required.

Each created Business Central entry includes the Azure DevOps work item marker in its description so the extension can list entries for the current work item later.

## References

- [Azure DevOps extension SDK](https://github.com/microsoft/azure-devops-extension-sdk)
- [Business Central API v2.0](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/)
- [timeRegistrationEntry resource](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/resources/dynamics_timeregistrationentry)

## License

MIT License - see [LICENSE](LICENSE).
