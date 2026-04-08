# Engineering Guardrails

**Version**: 1.0  
**Last Updated**: April 2026

Comprehensive development standards, practices, and guidelines for all contributors to programmeOS.

---

## 📐 Code Quality Standards

### Language & Tools

- **Primary Language**: C (C11 standard)
- **Build System**: [Specify: Makefile / CMake / etc.]
- **Static Analysis**: [clang-analyzer, cppcheck]
- **Code Formatter**: [clang-format]
- **Compiler Flags**: `-Wall -Wextra -Werror -fanalyzer`

### Code Style Guidelines

#### Naming Conventions
```c
// Functions: snake_case
void process_init(void);
int memory_allocate(size_t size);

// Constants: UPPER_SNAKE_CASE
#define MAX_PROCESSES 1024
#define INIT_PRIORITY  10

// Type definitions: descriptive, suffix with _t
typedef struct {
    int pid;
    int state;
} process_t;

// Struct members: snake_case
struct file {
    int fd;
    char *path;
    size_t offset;
};

// Macros: UPPER_SNAKE_CASE, function-like with inline documentation
#define MIN(a, b) ((a) < (b) ? (a) : (b))
#define MAX(a, b) ((a) > (b) ? (a) : (b))
```

#### Formatting
- **Indentation**: 4 spaces (not tabs)
- **Line Length**: 100 characters maximum
- **Braces**: K&R style
  ```c
  if (condition) {
      // code
  } else {
      // code
  }
  ```
- **Comments**: Clear, concise; explain *why*, not *what*

#### Function Documentation
```c
/**
 * Brief description of what the function does.
 *
 * Detailed explanation if needed. Document assumptions,
 * side effects, and concurrency behavior.
 *
 * @param name: Description of parameter
 * @param size: Another parameter description
 * @return: Description of return value
 * @error: -EINVAL if arguments are invalid
 *         -ENOMEM if allocation fails
 */
int function_name(const char *name, size_t size);
```

---

## 🧪 Testing Requirements

### Test Coverage Targets
- **Overall**: 90%+ code coverage
- **Critical Paths**: 100% coverage (kernel, memory management)
- **New Features**: Must include tests before merge

### Test Organization
```
tests/
├── unit/              # Function-level tests
│   ├── process_test.c
│   └── memory_test.c
├── integration/       # Multi-component tests
│   └── kernel_test.c
├── system/           # Full OS behavior
│   └── system_test.c
└── fixtures/         # Test data and helpers
```

### Testing Best Practices
```c
// Use clear, descriptive test names
void test_process_fork_creates_child_process(void);
void test_memory_allocate_fails_with_invalid_size(void);

// Arrange-Act-Assert pattern
void test_file_open_succeeds(void) {
    // Arrange
    const char *path = "/tmp/test.txt";
    create_temp_file(path);
    
    // Act
    int fd = open(path, O_RDONLY);
    
    // Assert
    assert(fd >= 0);
    close(fd);
    remove(path);
}
```

---

## 📝 Documentation Requirements

### Always Provide
- [ ] **Function documentation**: Doxygen-compatible comments
- [ ] **Module overview**: README in each directory
- [ ] **Error codes**: Document all possible errors
- [ ] **Examples**: Usage examples for public APIs

### Documentation Standards
```
- Keep documentation close to code
- Update docs with every code change
- Use consistent terminology across codebase
- Include diagrams for complex concepts (ASCII art acceptable)
- Examples should be complete and compilable
```

---

## 🔄 Git Workflow & Commits

### Branch Naming
```
feature/description      # New features
bugfix/description       # Bug fixes
refactor/description     # Code refactoring
docs/description        # Documentation only
hotfix/description      # Urgent production fixes
```

### Commit Messages
```
<type>: <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example**:
```
feat: implement process fork syscall

Add fork() syscall implementation with proper memory
copying and process descriptor initialization.

- Copy parent address space to child
- Create and initialize process descriptor
- Add child to ready queue
- Return PID to parent, 0 to child

Fixes #123
Tested with fork_test suite: 45 tests passing
```

### Commit Best Practices
- **One logical change per commit**: Don't mix features and fixes
- **Descriptive messages**: Future you will thank you
- **Small commits**: Easier to review, debug, and revert
- **Test before commit**: Run full test suite

---

## 📋 Pull Request Standards

### PR Requirements
- [ ] All tests passing (100% coverage for new code)
- [ ] Code review approval from 1+ maintainers
- [ ] No merge conflicts
- [ ] Updated documentation
- [ ] Follows coding standards

### PR Template
```markdown
## Description
Brief description of changes

## Testing
Describe testing performed:
- [ ] Unit tests added
- [ ] Integration tests verified
- [ ] Manual testing performed

## Types of Changes
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No new compiler warnings
```

---

## 🔒 Security & Reliability

### Memory Safety
- [ ] **No buffer overflows**: Validate all buffer operations
- [ ] **Use size-bounded functions**: `strncpy` not `strcpy`
- [ ] **Check allocation results**: `if (ptr == NULL)`
- [ ] **Free all allocated memory**: Track allocations
- [ ] **Consider valgrind**: Regular memory leak testing

### Concurrency Safety
- [ ] **Identify shared data**: Document all shared variables
- [ ] **Use proper synchronization**: locks/atomic operations
- [ ] **Avoid deadlocks**: Consistent lock ordering
- [ ] **Test race conditions**: Thread sanitizers

### Error Handling
```c
// Good error handling pattern
int result = dangerous_operation();
if (result < 0) {
    log_error("Operation failed: %s", strerror(errno));
    cleanup_resources();
    return -EIOERROR; // Propagate error
}
```

---

## 📊 Code Review Checklist

**Reviewers should verify:**

- [ ] **Correctness**: Code does what it claims
- [ ] **Style**: Follows project guidelines
- [ ] **Tests**: Adequate coverage, test cases valid
- [ ] **Documentation**: Clear and complete
- [ ] **Performance**: No obvious inefficiencies
- [ ] **Security**: No vulnerabilities introduced
- [ ] **Compatibility**: Doesn't break existing code
- [ ] **Error handling**: All error paths handled
- [ ] **Comments**: Code is understandable

---

## 🚀 Performance Guidelines

### Profiling Requirements
- Profile critical paths before optimization
- Measure improvements with benchmarks
- Document performance characteristics

### Optimization Rules
1. **Profile first**: Don't guess where bottlenecks are
2. **Measure impact**: Verify optimization helps
3. **Document changes**: Explain why optimization was needed
4. **Balance trade-offs**: Performance vs. readability
5. **Test thoroughly**: Optimizations introduce bugs

---

## 📚 Module Structure

Each module should follow this structure:
```
src/kernel/module/
├── module.h           # Public interface
├── module.c           # Implementation
├── module_internal.h  # Private definitions
├── .gitignore        # If needed
└── README.md         # Module documentation
```

---

## ✅ Release Checklist

Before releasing a version:

- [ ] **All tests passing**: 100% green
- [ ] **Documentation updated**: CHANGELOG, API docs
- [ ] **Performance tested**: Benchmarks run
- [ ] **Security review**: No new CVEs
- [ ] **Code reviewed**: At least 2 approvals
- [ ] **Version bumped**: Follow semver
- [ ] **Release notes written**: Document changes
- [ ] **Tag created**: Git tag for version

---

## 📞 Getting Help

- **Code questions**: Open Discussion with label `question`
- **Bugs**: Report as GitHub Issue with reproduction steps
- **Documentation**: Submit docs PR or create Issue
- **Architecture**: Open RFC (Request for Comments)

---

## 🔗 References

- [Linux Kernel Coding Style](https://www.kernel.org/doc/html/latest/process/coding-style.html)
- [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html) (adapted for C)
- [Doxygen Documentation](https://www.doxygen.nl/)
- [Git Best Practices](https://git-scm.com/book/en/v2)

---

## 📝 Notes

- These guidelines evolve: Provide feedback via Issues
- Questions? Discuss in GitHub Discussions
- Exceptions must be approved by project maintainers
