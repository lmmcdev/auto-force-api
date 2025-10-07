# Code Formatting Configuration

This project uses **Prettier** for code formatting and **ESLint** for code linting to ensure consistent code style across the team.

## 📋 Configuration Overview

### Tools Configured
- **Prettier** - Code formatter for TypeScript, JavaScript, JSON, and Markdown
- **ESLint** - Linter for TypeScript and JavaScript with TypeScript rules
- **Husky** - Git hooks for pre-commit formatting
- **lint-staged** - Run formatters only on staged files

### File Extensions Covered
- `.ts` - TypeScript files
- `.js` - JavaScript files
- `.json` - JSON configuration files
- `.md` - Markdown documentation

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install all dev dependencies including Prettier, ESLint, and related tools.

### 2. Set up Git Hooks (Optional)

```bash
npm run prepare
```

This sets up Husky git hooks that will automatically format code before commits.

## 🎯 Available Scripts

### Formatting Commands

```bash
# Format all files
npm run format

# Check if files are properly formatted (doesn't modify files)
npm run format:check

# Fix linting and formatting issues
npm run lint:fix

# Run linting only
npm run lint
npm run eslint

# Fix ESLint issues only
npm run eslint:fix
```

### Manual Usage

```bash
# Format specific files
npx prettier --write src/modules/auth/services/auth.service.ts

# Check specific files
npx prettier --check "src/**/*.ts"

# Lint specific files
npx eslint src/modules/auth/services/auth.service.ts --fix
```

## ⚙️ Configuration Files

### `.prettierrc`
Main Prettier configuration with these key settings:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### `.eslintrc.json`
ESLint configuration with TypeScript support:

```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### Key Rules
- **Line width**: 100 characters max
- **Quotes**: Single quotes for strings, double quotes for JSON
- **Semicolons**: Always required
- **Trailing commas**: ES5 style (objects/arrays)
- **Indentation**: 2 spaces (no tabs)

## 📁 File Structure

```
.
├── .prettierrc              # Prettier configuration
├── .prettierignore          # Files to ignore from formatting
├── .eslintrc.json          # ESLint configuration
├── .vscode/
│   ├── settings.json       # VS Code format-on-save settings
│   └── extensions.json     # Recommended extensions
├── .github/workflows/
│   └── ci.yml             # GitHub Actions with format checks
└── package.json           # Scripts and dependencies
```

## 🔧 IDE Integration

### VS Code (Recommended)

1. **Install Extensions** (auto-suggested when opening project):
   - Prettier - Code formatter
   - ESLint
   - TypeScript and JavaScript Language Features

2. **Auto-formatting** is already configured:
   - Format on save: ✅ Enabled
   - Auto-fix ESLint on save: ✅ Enabled

### Other IDEs

Most modern IDEs support Prettier and ESLint:

- **WebStorm/IntelliJ**: Built-in support, enable in Settings > Tools > File Watchers
- **Vim/Neovim**: Use plugins like `vim-prettier` and `ale`
- **Emacs**: Use `prettier-js` package

## 🚀 Git Hooks

### Pre-commit Hook
Automatically runs when you commit:

```bash
git add .
git commit -m "feat: add new feature"
# → Automatically formats staged files
# → Runs ESLint checks
# → Commits only if checks pass
```

### What Gets Checked
- **TypeScript/JavaScript**: ESLint + Prettier
- **JSON files**: Prettier formatting
- **Markdown**: Prettier formatting

## 🔍 CI/CD Integration

### GitHub Actions
The project includes a CI workflow (`.github/workflows/ci.yml`) that:

1. ✅ Checks TypeScript compilation
2. ✅ Runs ESLint
3. ✅ Verifies Prettier formatting
4. ✅ Runs tests
5. ✅ Builds the project

### Branch Protection
Consider enabling branch protection rules that require:
- CI checks to pass
- Code review approval
- Up-to-date branches

## 📖 Formatting Rules Examples

### Before/After Examples

**Before** (inconsistent formatting):
```typescript
export class AuthService{
private config:AuthConfig|null=null
async getUser(request:HttpRequest):Promise<AuthenticatedUser>{
if(!request)throw new Error("Request required")
const principal=getClientPrincipal(request)
return extractUser(principal)
}
}
```

**After** (properly formatted):
```typescript
export class AuthService {
  private config: AuthConfig | null = null;

  async getUser(request: HttpRequest): Promise<AuthenticatedUser> {
    if (!request) throw new Error('Request required');
    const principal = getClientPrincipal(request);
    return extractUser(principal);
  }
}
```

### Import/Export Formatting
```typescript
// Before
import {HttpRequest,HttpResponseInit,InvocationContext} from "@azure/functions"
import {authService,AuthMiddleware,AuthenticatedUser} from "../index"

// After
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authService, AuthMiddleware, AuthenticatedUser } from '../index';
```

## 🚨 Troubleshooting

### Common Issues

1. **"Prettier not formatting on save"**
   - Check VS Code settings: File > Preferences > Settings
   - Search "format on save" and ensure it's enabled
   - Verify Prettier is set as default formatter

2. **"ESLint errors not auto-fixing"**
   - Check `.vscode/settings.json` has correct configuration
   - Restart VS Code
   - Run `npm run eslint:fix` manually

3. **"Git hooks not working"**
   - Run `npm run prepare` to reinstall hooks
   - Check if Husky is properly installed
   - Verify `.husky/` directory exists

4. **"Format check failing in CI"**
   - Run `npm run format:check` locally
   - Fix issues with `npm run format`
   - Commit the formatted files

### Manual Fix Commands

```bash
# Fix all formatting issues
npm run lint:fix

# Check what would be formatted (dry run)
npm run format:check

# Format everything
npm run format

# Reset and reformat entire project
git add . && npm run lint:fix && git add .
```

## 🔄 Migration from Existing Code

If adding this to an existing project:

1. **Install dependencies**:
   ```bash
   npm install --save-dev prettier eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier eslint-plugin-prettier husky lint-staged
   ```

2. **Format existing code**:
   ```bash
   npm run format
   ```

3. **Fix linting issues**:
   ```bash
   npm run eslint:fix
   ```

4. **Commit formatted code**:
   ```bash
   git add .
   git commit -m "style: apply prettier and eslint formatting"
   ```

## 📚 Additional Resources

- [Prettier Documentation](https://prettier.io/docs/en/)
- [ESLint TypeScript Rules](https://typescript-eslint.io/rules/)
- [VS Code Prettier Extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Husky Documentation](https://typicode.github.io/husky/)

## 🤝 Team Guidelines

1. **Always run formatting** before committing code
2. **Don't disable formatting rules** without team discussion
3. **Use provided scripts** rather than manual formatting
4. **Keep configuration consistent** across all environments
5. **Update this doc** when making configuration changes

## 🔧 Customization

To modify formatting rules:

1. Edit `.prettierrc` for Prettier rules
2. Edit `.eslintrc.json` for linting rules
3. Test changes with `npm run format:check`
4. Update this documentation
5. Notify the team of changes

Remember: Consistency is more important than personal preferences! 🎯