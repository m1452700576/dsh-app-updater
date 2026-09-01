# Contributing to dsh-app-updater

Thank you for your interest in contributing to dsh-app-updater! This document provides guidelines and instructions for contributing.

## How to Contribute

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce (if applicable)
   - Expected vs actual behavior
   - Environment details (OS, DSH version, etc.)

### Suggesting Features

1. Open an issue with the "enhancement" label
2. Describe the feature and its use case
3. Explain why it would be beneficial

### Code Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Commit your changes: `git commit -m 'feat: add your feature'`
7. Push to the branch: `git push origin feature/your-feature`
8. Submit a pull request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/m1452700576/dsh-app-updater.git
cd dsh-app-updater

# Install dependencies (none currently)
npm install

# Test the plugin locally
dsh plugin --profile web add link:$PWD
```

## Code Style

- Use ES modules (import/export)
- Follow existing code patterns
- Add comments for complex logic
- Keep functions focused and small

## Testing

- Test on multiple platforms if possible
- Verify the update check functionality
- Test download progress display
- Check error handling

## Pull Request Guidelines

1. Keep PRs focused on a single feature/fix
2. Update documentation if needed
3. Add tests if applicable
4. Ensure all existing tests pass
5. Write clear commit messages

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
