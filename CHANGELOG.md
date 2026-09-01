# Changelog

All notable changes to the dsh-app-updater plugin will be documented in this file.

## [0.2.0] - 2026-08-26

### Added
- GitHub mirror support for faster downloads in mainland China
- SHA-256 checksum verification for downloaded installers
- Download security checks (confirm before download, private IP blocking)
- Minimizable panel during download progress
- Multiple update source support (GitHub, npm)

### Changed
- Improved error handling for network failures
- Enhanced progress bar with real-time updates
- Better UI for download status display

### Fixed
- Handle missing update sources gracefully
- Windows path separator issues
- Network timeout handling

## [0.1.0] - 2026-08-25

### Added
- Initial release
- Sidebar button for checking DSH updates
- Automatic download and installation of updates
- Support for macOS, Windows, and Linux installers
- Live download progress tracking
