# Contributing to Spends Tracker

Thank you for your interest in contributing to Spends Tracker! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Your environment (OS, browser, versions)

### Suggesting Features

We welcome feature suggestions! Please open an issue with:
- A clear description of the feature
- Why it would be useful
- Any implementation ideas you have

### Code Contributions

1. **Fork the repository**
2. **Create a branch** for your feature (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Test your changes** thoroughly
5. **Commit** with clear messages (`git commit -m 'Add amazing feature'`)
6. **Push** to your fork (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/spends.git
cd spends

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Run migrations
cd backend
alembic upgrade head
cd ..
```

### Running Locally

**Terminal 1 - Frontend:**
```bash
npm run dev -- --host 0.0.0.0
```

**Terminal 2 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 3031
```

### Code Style

- **Python**: Follow PEP 8
- **JavaScript**: Use existing patterns in the codebase
- **Commits**: Write clear, concise commit messages

### Testing

- Test your changes locally before submitting
- Ensure the application builds without errors: `npm run build`
- Run backend tests: `cd backend && pytest`

### Pull Request Guidelines

- Keep changes focused and atomic
- Update documentation if needed
- Ensure your PR description clearly explains the changes
- Link to any related issues

## Questions?

Feel free to open an issue for any questions or join discussions.

Thank you for contributing!
