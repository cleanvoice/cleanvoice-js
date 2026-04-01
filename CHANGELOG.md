# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.2] - 2026-04-01

### Fixed
- Better error handling for failed edits.
- Safer retry behavior for edit creation.
- Safer file downloads on failure.

## [3.0.0] - 2026-03-12

### Added
- `Cleanvoice.fromEnv()` convenience constructor for Node/server runtimes.
- Local file upload support with `uploadFile()` and automatic upload in `process()` / `createEdit()`.
- Download helpers via `downloadFile()`, `result.audio.download(...)`, and `processAndDownload()`.
- Public polling/progress options for `process()`.
- Request options for `templateId` and `uploadType`.
- A minimal Node example in `examples/node-basic.js`.

### Changed
- `process()` result shaping now preserves more API metadata including video state, social content, timestamps, waveform data, and task IDs.
- Polling and transport behavior is more resilient to transient failures and delayed success payloads.
- README and example docs were refreshed to match the current SDK behavior.
- The Next.js example now references the local workspace SDK and includes `.env.local.example`.

### Changed (Breaking)
- `checkAuth()` now returns only the public `credit` payload and no longer exposes backend `meta` fields in the SDK response.

### Testing
- Expanded Jest coverage for config normalization, typed errors, upload/download helpers, progress callbacks, retries, and result transformations.

## [2.0.0] - 2025-10-03

### Changed (Breaking)
- **BREAKING**: Renamed `sound_studio` configuration option to `studio_sound` to match API expectations
- **BREAKING**: Extended `studio_sound` configuration option to support string values ("nightly") in addition to boolean
- Extended `breath` configuration option to support string values ("natural", "legacy", "muted") in addition to boolean

## [1.1.0] - 2024-06-01

### Added
- Support for AIFF audio format (.aiff)
- Support for Opus audio format (.opus)

### Changed
- Updated supported file format documentation
- Reordered audio formats list (WAV first, following API specification)

### Removed
- Support for WMA audio format (.wma)
- Support for WMV video format (.wmv)
- Support for FLV video format (.flv)

### Technical
- Updated file validation logic to match current API capabilities
- Updated test suites for new format specifications
- Improved format validation error messages

## [1.0.0] - 2024-01-XX

### Added
- Initial release of Cleanvoice SDK
- Core audio processing functionality
- TypeScript support with full type definitions
- Comprehensive error handling
- Automatic polling with exponential backoff
- Support for all Cleanvoice API features:
  - Audio enhancement (fillers, noise removal, normalization)
  - Video processing support
  - Transcription with word-level timing
  - AI-powered summarization
  - Social media content optimization
- Developer-friendly API design
- Complete test coverage
- Extensive documentation and examples

### Developer Experience
- Full TypeScript IntelliSense support
- JSDoc documentation on all public APIs
- Multiple usage examples
- Batch processing capabilities
- Proper error handling patterns
