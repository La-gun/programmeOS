# Copilot Tasks

**Version**: 1.0  
**Last Updated**: April 2026

Guidelines for using GitHub Copilot and AI-assisted development in the programmeOS project.

---

## 🎯 When to Use Copilot

### ✅ Good Use Cases

1. **Code Generation from Clear Specs**
   - When requirements are explicit and well-defined
   - Example: "Add a function to allocate memory with error handling"
   - Copilot can generate boilerplate quickly

2. **Implementation of Understood Algorithms**
   - Standard algorithms (sorting, searching, hashing)
   - Utility functions (string operations, math)
   - Common patterns (linked lists, hash tables)

3. **Test Code Generation**
   - Unit test boilerplate
   - Test fixtures and helpers
   - Example test cases

4. **Documentation Assistance**
   - Function comment templates
   - README structure
   - Error documentation

5. **Refactoring Suggestions**
   - Variable renaming
   - Function extraction
   - Code simplification

### ❌ Avoid Using Copilot For

1. **Security-Critical Code**
   - Cryptography implementations
   - Authentication/authorization
   - Access control logic
   - **Instead**: Review peer-tested implementations

2. **Core Kernel Logic**
   - Process scheduling decisions
   - Memory management algorithms
   - Interrupt handling
   - **Instead**: Algorithm review with maintainers

3. **Complex Architectural Decisions**
   - System design changes
   - API design
   - Module interfaces
   - **Instead**: RFC and community discussion

4. **Bug Fixes of Unknown Root Cause**
   - Random fixes without understanding
   - Complex debugging scenarios
   - Race condition handling
   - **Instead**: Analyze root cause first

5. **Performance-Critical Paths**
   - Without measurement showing benefit
   - Without performance testing
   - Premature optimization
   - **Instead**: Profile, measure, then optimize

---

## 🛠️ Effective Prompts

### Good Prompt Structure
```
[Context]: Brief background about the code/function
[Task]: Specific action you want Copilot to perform
[Constraints]: Style, size, performance requirements
[Example]: Show desired pattern if applicable

Example:
"We're implementing a process scheduler in C.
Write a function to add a process to the ready queue.
The queue uses a linked list and should maintain priority order.
Follow the coding style in process.c and include documentation comments.
Here's a similar function [example code]."
```

### Clear Requirements Checklist
- [ ] Function signature specified
- [ ] Input/output clearly defined
- [ ] Error conditions documented
- [ ] Performance requirements (if any)
- [ ] Example usage (if complex)
- [ ] Related functions referenced

---

## ✅ Validation Process

### Before Committing Copilot-Generated Code

1. **Understand Every Line**
   - [ ] I can explain what each line does
   - [ ] I understand why this approach was chosen
   - [ ] I see potential edge cases

2. **Security Review**
   - [ ] No unchecked array access
   - [ ] No buffer overflow vulnerabilities
   - [ ] Proper error handling
   - [ ] No unvalidated input usage

3. **Test Coverage**
   - [ ] All paths tested
   - [ ] Edge cases tested
   - [ ] Error conditions tested
   - [ ] Tests pass and meaningful

4. **Code Quality**
   - [ ] Follows project style guide
   - [ ] Clear variable names
   - [ ] Adequate comments
   - [ ] No dead code

5. **Performance**
   - [ ] No obvious inefficiencies
   - [ ] Appropriate algorithms
   - [ ] Acceptable memory usage

### Example Validation
```c
// Generated code - MUST VALIDATE
int queue_add(queue_t *q, process_t *p) {
    if (!q || !p) return -EINVAL;
    
    node_t *new_node = malloc(sizeof(node_t));
    if (!new_node) return -ENOMEM;
    
    new_node->data = p;
    new_node->next = NULL;
    
    if (q->tail) {
        q->tail->next = new_node;
    } else {
        q->head = new_node;
    }
    q->tail = new_node;
    return 0;
}

// Validation checklist:
// ✅ NULL pointer checks
// ✅ Memory allocation error handling
// ✅ Linked list logic is correct
// ✅ Handles empty queue case
// ✅ Returns appropriate error codes
// ✅ Follows project style
```

---

## 🧪 Testing Copilot Code

### Mandatory Tests for Generated Code
```c
// Test successful insertion
void test_queue_add_success(void) {
    queue_t q = {NULL, NULL};
    process_t p = {.pid = 42};
    
    int result = queue_add(&q, &p);
    
    assert(result == 0);
    assert(q.head != NULL);
    assert(q.tail != NULL);
}

// Test NULL inputs
void test_queue_add_null_queue(void) {
    process_t p = {.pid = 42};
    assert(queue_add(NULL, &p) == -EINVAL);
}

void test_queue_add_null_process(void) {
    queue_t q = {NULL, NULL};
    assert(queue_add(&q, NULL) == -EINVAL);
}

// Test memory allocation failure
void test_queue_add_malloc_failure(void) {
    // Mock malloc to fail
    mock_malloc_fail();
    queue_t q = {NULL, NULL};
    process_t p = {.pid = 42};
    
    assert(queue_add(&q, &p) == -ENOMEM);
}
```

---

## 📋 Code Review: Copilot Content

### Reviewer Responsibilities

When reviewing code that used Copilot:

- [ ] **Verify correctness**: Code is logically correct
- [ ] **Check security**: No vulnerabilities introduced
- [ ] **Validate tests**: Tests are comprehensive
- [ ] **Style review**: Follows project guidelines
- [ ] **Architecture**: Fits project design
- [ ] **Performance**: No obvious inefficiencies
- [ ] **Ask questions**: Reviewer should understand purpose

### Review Comment Template
```
This section appears to be AI-generated. I've verified:
- [x] Logic is correct
- [x] Tests are comprehensive
- [x] No security issues
- [x] Follows style guide

Good to merge!
```

---

## 🚫 Copilot Output You Must Rewrite

### Red Flags
1. **Hardcoded values**: AI often hardcodes instead of parameterizing
2. **Incomplete error handling**: Missing error cases
3. **Silent failures**: Operations that fail without indication
4. **Inefficient algorithms**: May not choose optimal approach
5. **Copy-paste patterns**: Repetitive code instead of abstraction
6. **Memory leaks**: Forgotten cleanup in error paths
7. **Race conditions**: No synchronization in concurrent code

### Example Rewrite
```c
// ❌ Generated code - needs rewriting
void process_init(int count) {
    for (int i = 0; i < 10; i++) {  // Hardcoded!
        processes[i].pid = i;
        processes[i].state = READY;
    }
}

// ✅ Rewritten
int process_init(int count) {
    if (count <= 0 || count > MAX_PROCESSES) {
        return -EINVAL;
    }
    
    for (int i = 0; i < count; i++) {
        processes[i].pid = allocate_pid();
        if (processes[i].pid < 0) {
            return -EAGAIN;
        }
        processes[i].state = READY;
    }
    return 0;
}
```

---

## 📊 Copilot Effectiveness Tracking

### Questions to Track ROI

- Did Copilot save significant time? ⏱️
- How much code required rewriting? 🔧
- Did it catch bugs? 🐛 (Good: Yes)
- Did it introduce bugs? 🐛 (Bad: Yes)
- Did review take longer due to unfamiliar code? 🔍

### Feedback Loop

Report findings to track:
- Helpful: [file/function]
- Required rewriting: [file/function]
- Bugs found in generated code: [issue]
- Time comparison: manual vs. Copilot

---

## 🎓 Learning & Development

### Using Copilot as a Learning Tool

**Good**: Learn new patterns and libraries  
**Bad**: Copy code without understanding

```
✅ GOOD:
- Ask Copilot how to use new APIs
- Request pattern examples
- Generate test templates
- Explain unfamiliar code

❌ BAD:
- Accept code without understanding
- Submit generated code unreviewed
- Use Copilot to skip learning
- Ignore security implications
```

---

## 📝 Documentation for AI-Generated Code

If you use Copilot, add a note:

```c
/**
 * Add a process to the scheduling queue.
 * 
 * Implementation note: This function was initially drafted
 * with Copilot assistance. Security and edge cases were
 * verified through manual review and comprehensive testing.
 * 
 * @param q: Ready queue
 * @param p: Process to add
 * @return: 0 on success, negative errno on failure
 */
int queue_add(queue_t *q, process_t *p);
```

---

## 🔗 Related Resources

- [Copilot Best Practices](https://github.com/github/copilot-docs)
- [Code Review Guidelines](ENGINEERING_GUARDRAILS.md)
- [Testing Standards](ENGINEERING_GUARDRAILS.md#-testing-requirements)

---

## 💡 Quick Reference

| Scenario | Use Copilot? | Validation Level |
|----------|-------------|------------------|
| Standard utility function | ✅ | Medium |
| Algorithm implementation | ✅ | High |
| Test case generation | ✅ | Low |
| Security code | ❌ | N/A |
| Kernel logic | ⚠️ | Very High |
| Documentation | ✅ | Low |
| Bug fix | ⚠️ | Very High |

---

## 📞 Questions?

- Unsure about appropriateness? Open a Discussion with label `copilot-question`
- Found issue in Copilot code? File Issue with label `copilot`
- Workflow feedback? Leave comment in this document via PR

