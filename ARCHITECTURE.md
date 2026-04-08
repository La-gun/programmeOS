# Architecture

**Version**: 1.0  
**Last Updated**: April 2026  
**Status**: 🔵 Design Phase

## 🏗️ System Architecture Overview

programmeOS is built with a layered, modular architecture that emphasizes separation of concerns, testability, and maintainability.

```
┌─────────────────────────────────────────────────┐
│         User Applications & Services             │
├─────────────────────────────────────────────────┤
│         Standard Library & System APIs           │
├─────────────────────────────────────────────────┤
│    Kernel (Process/Memory/IPC Management)       │
├─────────────────────────────────────────────────┤
│    Drivers (Storage/Network/Devices)           │
├─────────────────────────────────────────────────┤
│    Hardware Abstraction Layer                   │
├─────────────────────────────────────────────────┤
│         Boot Loader & Firmware Interface        │
└─────────────────────────────────────────────────┘
```

---

## 📚 Core Components

### 1. Bootloader & HAL (Hardware Abstraction Layer)
**Responsibility**: Initialize hardware and provide hardware-independent interface

- Boot sequence management
- CPU initialization
- Memory detection and setup
- Device enumeration
- Platform-specific code isolation

**Key Files**:
```
src/boot/
src/hal/
```

**Interfaces**:
```c
// HAL initialization
int hal_init(void);
void hal_enable_interrupts(void);
void hal_disable_interrupts(void);
```

---

### 2. Kernel Core
**Responsibility**: Process management, scheduling, memory management, IPC

#### 2.1 Process Management
- Process creation and termination (`fork()`, `exec()`, `exit()`)
- Process state management (ready, running, blocked, zombie)
- Process descriptor and process table
- Context switching

**Location**: `src/kernel/process/`

#### 2.2 Memory Management
- Virtual memory management
- Paging system
- Physical memory allocator
- Memory protection and isolation

**Location**: `src/kernel/memory/`

#### 2.3 Interrupt & Exception Handling
- Interrupt routing and dispatch
- Exception handlers
- Signal delivery mechanism
- Interrupt service routines (ISRs)

**Location**: `src/kernel/interrupts/`

#### 2.4 Inter-Process Communication (IPC)
- Message passing
- Pipes
- Sockets
- Shared memory management

**Location**: `src/kernel/ipc/`

---

### 3. File System
**Responsibility**: Persistent storage abstraction and file operations

- Virtual File System (VFS) layer
- File system implementations (ext4, FAT32, etc.)
- File descriptor management
- Directory operations
- File locking and synchronization

**Location**: `src/fs/`

**VFS Interface**:
```c
struct inode *vfs_open(const char *path, int flags);
int vfs_read(struct file *f, void *buf, size_t count);
int vfs_write(struct file *f, const void *buf, size_t count);
```

---

### 4. Device Drivers
**Responsibility**: Interface with hardware devices

- Block devices (storage)
- Character devices (terminals, random)
- Network devices
- Device manager and hot-plugging
- Driver abstraction framework

**Location**: `src/drivers/`

---

### 5. System Call Interface
**Responsibility**: User-to-kernel boundary

- All user application interactions go through syscalls
- Syscall dispatcher
- Argument validation and security checks
- Syscall number mapping

**Location**: `src/kernel/syscall/`

---

## 🔄 Data Flow

### Process Creation Flow
```
User Application
    │
    ├─→ fork() syscall
    │
    ├─→ Kernel: sys_fork()
    │   ├─→ Validate caller
    │   ├─→ Allocate process descriptor
    │   ├─→ Copy memory space
    │   ├─→ Add to process table
    │   └─→ Schedule new process
    │
    └─→ Returns: Parent gets PID, Child gets 0
```

### File Access Flow
```
User Application: read(fd, buf, count)
    │
    ├─→ sys_read() syscall
    │
    ├─→ Kernel: File Descriptor Table
    │   ├─→ Lookup fd → file structure
    │   ├─→ VFS: f_op->read()
    │   ├─→ File System: fs_read()
    │   ├─→ Drivers: block_read()
    │   └─→ HAL: hardware access
    │
    └─→ Returns: bytes_read or error
```

---

## 🧩 Module Interfaces

### Process Module API
```c
/**
 * Create a new process by forking current process
 * @return: Parent gets PID of child, child gets 0
 */
pid_t fork(void);

/**
 * Replace process image with new program
 * @name: Program name to execute
 * @argv: Argument vector
 * @return: Never returns on success, -1 on error
 */
int execv(const char *name, char *const argv[]);

/**
 * Terminate current process
 * @code: Exit code
 */
void exit(int code);
```

### Memory Module API
```c
/**
 * Allocate virtual memory region
 * @addr: Requested address (0 = kernel chooses)
 * @len: Size in bytes
 * @flags: MAP_SHARED, MAP_PRIVATE, etc.
 * @return: Starting address or NULL on error
 */
void *mmap(void *addr, size_t len, int flags);

/**
 * Free virtual memory region
 * @addr: Starting address
 * @len: Size in bytes
 * @return: 0 on success, -1 on error
 */
int munmap(void *addr, size_t len);
```

### File System API
```c
/**
 * Open a file
 * @path: File path
 * @flags: O_RDONLY, O_WRONLY, O_CREAT, etc.
 * @mode: File permissions (if creating)
 * @return: File descriptor or -1 on error
 */
int open(const char *path, int flags, int mode);

/**
 * Read from file
 * @fd: File descriptor
 * @buf: Buffer to read into
 * @count: Number of bytes to read
 * @return: Bytes read or -1 on error
 */
ssize_t read(int fd, void *buf, size_t count);
```

---

## 🔒 Security & Isolation

- **Privilege Levels**: User mode vs. Kernel mode separation
- **Memory Protection**: Virtual memory prevents cross-process access
- **Capability Model**: Minimum privilege enforcement
- **Input Validation**: All syscall arguments validated
- **Resource Limits**: Per-process quotas on memory, file handles, etc.

---

## ⚡ Performance Considerations

- **Scheduling**: Multi-level feedback queue scheduler
- **Memory**: Lazy allocation, copy-on-write, page replacement
- **I/O**: Asynchronous operations, buffering, caching
- **Locking**: Fine-grained locks, lock-free data structures where possible

---

## 🧪 Testing Strategy

- **Unit Tests**: Per-module functionality
- **Integration Tests**: Multi-component interaction
- **System Tests**: Full OS behavior
- **Performance Tests**: Benchmarking and profiling
- **Stress Tests**: Edge cases and resource exhaustion

---

## 📈 Scalability

- **Modular design** allows easy addition of new subsystems
- **Driver framework** enables support for new hardware
- **VFS abstraction** supports multiple file systems
- **Clean interfaces** between layers facilitate parallel development

---

## 🔗 Related Documents

- [Implementation Plan](IMPLEMENTATION_PLAN.md) - Timeline and milestones
- [Engineering Guardrails](ENGINEERING_GUARDRAILS.md) - Development practices
- [Copilot Tasks](COPILOT_TASKS.md) - Development guidelines
