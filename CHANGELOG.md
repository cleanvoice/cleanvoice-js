# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features go here

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in future versions

### Removed
- Features removed in this version

### Fixed
- Bug fixes

### Security
- Security improvements

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