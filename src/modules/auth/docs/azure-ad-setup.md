# Azure AD Setup Guide

This guide walks you through registering your API in Azure Active Directory and obtaining the required environment variables.

## Prerequisites

- Azure subscription with appropriate permissions
- Access to Azure Portal
- Your Azure Functions app deployed

## Step 1: Register Application in Azure AD

### 1.1 Navigate to Azure AD
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Azure Active Directory" or "Microsoft Entra ID"
3. Click on "App registrations" in the left menu

### 1.2 Create New Registration
1. Click "**+ New registration**"
2. Fill in the details:
   - **Name**: `Auto Force API` (or your preferred name)
   - **Supported account types**: Choose based on your needs:
     - **Single tenant**: Only your organization
     - **Multi-tenant**: Multiple organizations
   - **Redirect URI**: Leave blank for API-only apps

3. Click "**Register**"

### 1.3 Note Your Client ID and Tenant ID
After registration, you'll see the **Overview** page with:
- **Application (client) ID** → This is your `CLIENT_ID`
- **Directory (tenant) ID** → This is your `TENANT_ID`

## Step 2: Configure API Permissions (Optional)

If your API needs to call other Microsoft APIs:

1. Go to "**API permissions**" in the left menu
2. Click "**+ Add a permission**"
3. Choose the APIs you need (e.g., Microsoft Graph)
4. Select the required permissions
5. Click "**Grant admin consent**" if required

## Step 3: Expose Your API

### 3.1 Set Application ID URI
1. Go to "**Expose an API**" in the left menu
2. Click "**+ Set**" next to "Application ID URI"
3. Accept the default (`api://{client-id}`) or customize:
   - Format: `api://auto-force-api` or `https://yourdomain.com/auto-force-api`
4. Click "**Save**"

This value becomes your `APP_ID_URI`

### 3.2 Add Scopes (Optional)
If you want to define specific API scopes:
1. Click "**+ Add a scope**"
2. Fill in:
   - **Scope name**: `access_as_user`
   - **Display name**: `Access Auto Force API`
   - **Description**: `Allows the app to access Auto Force API on behalf of the signed-in user`
3. Click "**Add scope**"

## Step 4: Define App Roles

### 4.1 Create Application Roles
1. Go to "**App roles**" in the left menu
2. Click "**+ Create app role**" for each role you need:

#### Admin Role
- **Display name**: `Admin`
- **Allowed member types**: `Users/Groups`
- **Value**: `Admin`
- **Description**: `Full administrative access to Auto Force API`
- **Do you want to enable this app role?**: ✅ Yes

#### Approver Role
- **Display name**: `Approver`
- **Allowed member types**: `Users/Groups`
- **Value**: `Approver`
- **Description**: `Can approve invoices and line items`
- **Do you want to enable this app role?**: ✅ Yes

#### Manager Role
- **Display name**: `Manager`
- **Allowed member types**: `Users/Groups`
- **Value**: `Manager`
- **Description**: `Can manage team resources and view reports`
- **Do you want to enable this app role?**: ✅ Yes

#### User Role
- **Display name**: `User`
- **Allowed member types**: `Users/Groups`
- **Value**: `User`
- **Description**: `Basic user access to Auto Force API`
- **Do you want to enable this app role?**: ✅ Yes

3. Click "**Apply**" for each role

### 4.2 Your ALLOWED_ROLES Value
Based on the roles above, your environment variable would be:
```
ALLOWED_ROLES=Admin,Approver,Manager,User
```

## Step 5: Assign Users to Roles

### 5.1 Create Enterprise Application
1. Go to "**Enterprise applications**" in Azure AD
2. Find your app by name (`Auto Force API`)
3. Click on it

### 5.2 Assign Users
1. Go to "**Users and groups**"
2. Click "**+ Add user/group**"
3. Select users and assign them to roles
4. Click "**Assign**"

## Step 6: Configure Azure Function App

### 6.1 Enable Authentication
1. Go to your Azure Function App in the portal
2. Navigate to "**Authentication**" in the left menu
3. Click "**Add identity provider**"
4. Choose "**Microsoft**"
5. Configure:
   - **App registration type**: Provide the details of an existing app registration
   - **Client ID**: Your `CLIENT_ID` from Step 1.3
   - **Client secret**: Leave blank for Easy Auth
   - **Issuer URL**: `https://login.microsoftonline.com/{TENANT_ID}/v2.0`

6. Under **App service authentication settings**:
   - **Unauthenticated requests**: Choose based on your needs
   - **Token store**: ✅ Enabled (recommended)

7. Click "**Add**"

### 6.2 Configure Environment Variables
1. Go to "**Configuration**" in your Function App
2. Under "**Application settings**", add:

```
CLIENT_ID=12345678-1234-1234-1234-123456789012
TENANT_ID=87654321-4321-4321-4321-210987654321
APP_ID_URI=api://auto-force-api
ALLOWED_ROLES=Admin,Approver,Manager,User
```

3. Click "**Save**"

## Step 7: Test Your Configuration

### 7.1 Test Authentication
1. Navigate to your function app URL
2. You should be redirected to Microsoft login
3. After login, you should see the Azure Functions default page

### 7.2 Test API Endpoints
Use the auth module test endpoints:

```bash
# Get current user (requires authentication)
GET https://your-function-app.azurewebsites.net/api/v1/auth/me

# Check configuration
GET https://your-function-app.azurewebsites.net/api/v1/auth/context
```

## Environment Variables Summary

After completing the setup, you'll have these values:

```bash
# From Step 1.3 - App registration overview
CLIENT_ID=12345678-1234-1234-1234-123456789012
TENANT_ID=87654321-4321-4321-4321-210987654321

# From Step 3.1 - Expose an API
APP_ID_URI=api://auto-force-api

# From Step 4.2 - App roles you created
ALLOWED_ROLES=Admin,Approver,Manager,User
```

## Troubleshooting

### Common Issues

1. **"AADSTS700016: Application not found"**
   - Check CLIENT_ID is correct
   - Ensure app registration exists in the correct tenant

2. **"AADSTS50020: User account from identity provider does not exist"**
   - User needs to be assigned to the application
   - Check user assignment in Enterprise Applications

3. **"No roles found in token"**
   - Ensure users are assigned to app roles
   - Check that roles are properly configured in app registration

4. **"Invalid APP_ID_URI"**
   - Ensure the URI matches exactly what's in "Expose an API"
   - Check for typos or extra characters

### Useful Azure CLI Commands

```bash
# List app registrations
az ad app list --display-name "Auto Force API"

# Get app details
az ad app show --id {CLIENT_ID}

# List service principals (enterprise apps)
az ad sp list --display-name "Auto Force API"
```

## Security Best Practices

1. **Principle of Least Privilege**: Only assign necessary roles to users
2. **Regular Review**: Periodically review user assignments and permissions
3. **Monitoring**: Enable logging and monitoring for authentication events
4. **Token Validation**: The auth module automatically validates tokens
5. **HTTPS Only**: Ensure your Function App only accepts HTTPS requests

## Next Steps

After completing this setup:

1. Test the authentication endpoints
2. Integrate auth middleware into your existing controllers
3. Configure role-based access for your API endpoints
4. Set up monitoring and logging for security events

## Support

If you encounter issues:

1. Check Azure AD sign-in logs
2. Review Function App logs
3. Verify all environment variables are correctly set
4. Test with a simple user first before complex scenarios