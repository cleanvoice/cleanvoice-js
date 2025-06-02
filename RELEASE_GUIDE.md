# 🚀 Release Guide

This guide explains how to properly version and release updates to the Cleanvoice SDK.

## 📋 **Pre-Release Checklist**

Before releasing any version:

1. ✅ **Tests Pass**: `npm test`
2. ✅ **Build Works**: `npm run build`
3. ✅ **Linting Clean**: `npm run lint`
4. ✅ **Update CHANGELOG.md**: Document all changes
5. ✅ **Update README.md**: If API changed
6. ✅ **Review Breaking Changes**: Ensure proper versioning

## 🔢 **Version Types & When to Use**

### 🩹 **PATCH Release** (`1.0.0` → `1.0.1`)
**When**: Bug fixes, security patches, internal improvements

```bash
npm run release:patch
```

**Examples:**
- Fixed polling timeout issue
- Corrected error message typos
- Security vulnerability patches
- Performance improvements (no API changes)

### ✨ **MINOR Release** (`1.0.1` → `1.1.0`)
**When**: New features that don't break existing code

```bash
npm run release:minor
```

**Examples:**
- Added new optional parameters to `ProcessingConfig`
- New utility functions exported
- Additional file format support
- New convenience methods

### 💥 **MAJOR Release** (`1.1.0` → `2.0.0`)
**When**: Breaking changes that require user code updates

```bash
npm run release:major
```

**Examples:**
- Renamed methods or interfaces
- Removed deprecated features
- Changed required parameters
- Modified return value structures

## 🧪 **Pre-Release Versions**

For testing new features before stable release:

### Beta Releases
```bash
npm run release:beta
# Creates: 1.1.0-beta.0, 1.1.0-beta.1, etc.
```

### Alpha Releases
```bash
npm run release:alpha  
# Creates: 1.1.0-alpha.0, 1.1.0-alpha.1, etc.
```

Users install with:
```bash
npm install cleanvoice-sdk@beta
npm install cleanvoice-sdk@alpha
```

## 📝 **Release Process**

### 1. Update CHANGELOG.md
```markdown
## [1.2.0] - 2024-01-15

### Added
- New `batchProcess()` method for multiple files
- Support for .aac audio format

### Fixed
- Polling timeout issue with long audio files
```

### 2. Run Release Command
```bash
# This will:
# 1. Update version in package.json
# 2. Create a git tag
# 3. Build the project
# 4. Publish to npm
npm run release:minor
```

### 3. Create GitHub Release
- Go to GitHub releases
- Create release from the new tag
- Copy changelog content
- Upload any additional assets

## 🏷️ **Version Strategy Examples**

### Scenario 1: Bug Fix
```typescript
// Before (1.0.0): Had a bug
const result = await cv.process(file, { timeout: 30000 }); // timeout ignored

// After (1.0.1): Fixed bug
const result = await cv.process(file, { timeout: 30000 }); // timeout works
```
**Release**: `npm run release:patch`

### Scenario 2: New Feature
```typescript
// Before (1.0.1): Basic config
const result = await cv.process(file, { 
  fillers: true, 
  normalize: true 
});

// After (1.1.0): Added new optional feature
const result = await cv.process(file, { 
  fillers: true, 
  normalize: true,
  enhancedAI: true  // NEW optional parameter
});
```
**Release**: `npm run release:minor`

### Scenario 3: Breaking Change
```typescript
// Before (1.1.0): Returns simple object
const result = await cv.process(file, config);
console.log(result.audioUrl); // OLD property

// After (2.0.0): Returns restructured object
const result = await cv.process(file, config);
console.log(result.audio.url); // NEW structure
```
**Release**: `npm run release:major`

## 🔄 **Backward Compatibility**

### ✅ **Safe Changes (Minor/Patch):**
- Adding optional parameters
- Adding new methods
- Adding new properties to response objects
- Improving error messages
- Performance improvements

### ❌ **Breaking Changes (Major):**
- Removing methods or properties
- Changing method signatures
- Changing return value structures
- Making optional parameters required
- Changing error handling behavior

## 📊 **Version Management Commands**

```bash
# Check current version
npm version

# Manual version bump (without publishing)
npm version patch --no-git-tag-version
npm version minor --no-git-tag-version
npm version major --no-git-tag-version

# View published versions
npm view cleanvoice-sdk versions --json

# Install specific version
npm install cleanvoice-sdk@1.0.0
```

## 🔒 **Security Considerations**

- Never commit `.env` files or API keys
- Review dependencies for vulnerabilities: `npm audit`
- Use `npm publish --dry-run` to test before actual publish
- Consider using `--tag` for pre-releases to avoid accidental installs

## 📈 **Post-Release**

1. **Monitor**: Check npm download stats
2. **Support**: Watch for issues on GitHub
3. **Communicate**: Announce major releases
4. **Document**: Update examples if needed 