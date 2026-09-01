# dsh-app-updater

A DSH web plugin: a sidebar button (icon only) that checks whether DSH has a newer
release and, when one exists, auto-downloads the installer and opens it - with a live
progress bar and a minimizable panel.

## Features
- Sidebar icon-only button (tooltip "Check DSH update"), red dot when new version found.
- Probes known desktop-packaging repos (or your own githubRepo) for a newer release that
  ships a macOS installer (.dmg/.pkg/.zip).
- Auto-downloads the installer to ~/Downloads (or downloadsDir) and runs open.
- Live download progress (streaming bytes + percent), indeterminate bar when unknown.
- Panel can be minimized to a floating bubble while downloading.
- Supports multiple update sources (GitHub, npm).
- Security checks: confirm before download, private IP blocking, SHA-256 checksum.
- GitHub mirror support for fast downloads in mainland China.

## Installation

### Method 1: Direct Install (Recommended)
```bash
dsh plugin --profile web add github:m1452700576/dsh-app-updater
```

### Method 2: Local Development
```bash
# Clone the repository
git clone https://github.com/m1452700576/dsh-app-updater.git
cd dsh-app-updater

# Install in your DSH profile
dsh plugin --profile web add link:$PWD
```

### Method 3: Manual Installation
1. Clone or download this repository
2. Copy the folder to your DSH profile:
   ```bash
   cp -r . ~/.dsh/profiles/web/node_modules/@local/dsh-app-updater
   ```
3. Add to your profile's package.json:
   ```json
   {
     "dependencies": {
       "@local/dsh-app-updater": "link:./dsh-app-updater"
     },
     "dsh": {
       "profile": {
         "bundles": ["@local/dsh-app-updater"]
       }
     }
   }
   ```
4. Restart DSH completely

## Configuration

Configure in `cordis.patch.yml`:

```yaml
- insert:
    - id: dsh-app-updater
      name: '@local/dsh-app-updater'
      config:
        sourceType: github
        githubRepo: m1452700576/dsh-app-updater
        downloadsDir: ''
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sourceType` | string | `github` | Update source type (`github` or `npm`) |
| `githubRepo` | string | `steven-kid/deepseek-harness-desktop` | GitHub repository to check for updates |
| `downloadsDir` | string | `~/Downloads` | Directory to save downloaded installers |
| `mirrors` | array | `[]` | GitHub mirror URLs for faster downloads in China |

## Usage

1. After installation, look for the update icon in the DSH sidebar
2. Click the icon to check for updates
3. If an update is available, click "Download" to start the download
4. The download progress will be shown in real-time
5. Once downloaded, the installer will open automatically

## API Routes (Loopback Only)

- `GET /api/dsh-update/status` - Check current version and available updates
- `POST /api/dsh-update/download` - Download the latest update
- `GET /api/dsh-update/progress` - Get download progress

## Troubleshooting

### Plugin not appearing
- Ensure DSH is completely restarted after installation
- Check that the plugin is listed in your profile's package.json

### Update check fails
- Verify your internet connection
- Check if the GitHub repository is accessible
- Try using a mirror if you're in mainland China

### Download fails
- Ensure you have enough disk space
- Check if the download directory is writable
- Verify the installer URL is accessible

## Development

```bash
# Clone the repository
git clone https://github.com/m1452700576/dsh-app-updater.git
cd dsh-app-updater

# Install dependencies (none currently)
npm install

# Test the plugin locally
dsh plugin --profile web add link:$PWD
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Apache-2.0

## Support

- GitHub Issues: https://github.com/m1452700576/dsh-app-updater/issues
- Documentation: This README
