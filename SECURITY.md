# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within Spends Tracker, please report it by:

1. **Email**: Send details to **oss@mailite.com**
2. **GitHub**: Create a private security advisory via GitHub (preferred method)

All security vulnerabilities will be promptly addressed.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Possible impact
- Suggested fix (if any)

## Security Best Practices

### For Users

1. **Keep your instance updated** - Always run the latest version
2. **Use strong passwords** - If authentication is enabled
3. **Secure your database** - Don't expose PostgreSQL/SQLite to the internet
4. **HTTPS in production** - Use HTTPS when deploying to production
5. **Regular backups** - Backup your database and uploaded files

### For Deployments

- Run behind a reverse proxy (nginx/Apache)
- Use environment variables for sensitive configuration
- Enable CORS only for trusted origins
- Keep dependencies updated (`npm audit`, `pip list --outdated`)

## Known Limitations

- This is a personal finance tool - not designed for multi-user scenarios without additional authentication
- File uploads should be limited by size and type in production
- Rate limiting should be implemented for public deployments

## Acknowledgments

We appreciate responsible disclosure of security issues. Thank you for helping keep Spends Tracker secure!
