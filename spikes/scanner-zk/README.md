# BCAMS ZKTeco Scanner & Matching Spike Package (`spikes/scanner-zk`)

This package provides an isolated test harness, native binding diagnostic runner, and physical measurement framework for evaluating ZKTeco optical/capacitive fingerprint scanners (e.g. ZKTeco ZK9500, SLK20R, Live20R, ZK4500) and the ZKFinger 10.0 / 5.0 matching engine for the BCAMS attendance system.

This package is completely isolated from the main application codebase and does not couple with `src/`.

---

## 1. Prerequisites & Driver Installation

### 1.1 Windows (Target Workstation & Gate Kiosk Platform)
1. **ZKTeco USB Drivers:**
   - Install the official ZKTeco standalone driver package (`ZKTeco Fingerprint Sensor Driver v3.x+` for Windows 64-bit).
   - Verifies driver files: `C:\Windows\System32\drivers\zkusb.sys`, `zkusb.inf`.
2. **ZKFinger SDK Runtime Libraries:**
   - Copy 64-bit SDK DLLs to `C:\Windows\System32` or the application root:
     - `libzkfp.dll`
     - `libzkfperr.dll`
     - `libzkfptp.dll`
3. **Node.js Environment:**
   - Node.js v20.x or v22.x (64-bit architecture matching SDK bitness).

### 1.2 Linux (Target Backend & Kiosk Platform)
1. **Dependencies:**
   ```bash
   sudo apt-get update && sudo apt-get install -y libusb-1.0-0 libusb-1.0-0-dev build-essential
   ```
2. **SDK Libraries:**
   - Copy `libzkfp.so`, `libzkfperr.so`, and `libzkfptp.so` to `/usr/local/lib/` or `/usr/lib/`.
   - Run `sudo ldconfig`.
3. **Udev Rules (for non-root USB access):**
   - Create `/etc/udev/rules.d/99-zkteco.rules`:
     ```text
     SUBSYSTEM=="usb", ATTR{idVendor}=="1b55", MODE="0666", GROUP="plugdev"
     SUBSYSTEM=="usb", ATTR{idVendor}=="11b4", MODE="0666", GROUP="plugdev"
     ```
   - Reload udev: `sudo udevadm control --reload-rules && sudo udevadm trigger`.

### 1.3 macOS Note
ZKTeco does not officially distribute desktop optical scanner drivers for macOS. The harness will detect the platform and run automated contract diagnostics and in-memory scaling tests, reporting that physical hardware capture must be tested on Windows or Linux.

---

## 2. Running the Spike Harness

1. **Install dependencies and build TypeScript:**
   ```bash
   npm install
   npm run build
   ```

2. **Execute the diagnostic harness:**
   ```bash
   npm start
   ```

3. **Output:**
   - Evaluates OS platform and architecture.
   - Searches for native ZKTeco dynamic libraries (`libzkfp.dll` / `libzkfp.so`).
   - Runs a Worker Thread capture offload cycle to verify main thread event loop non-blocking behavior.
   - Executes in-memory 1:N matching scaling benchmarks ($N = 100, 500, 1000, 2500, 5000$).
   - Validates 3-sample enrollment merge and template serialization overhead.

---

## 3. Recording Physical Measurements

When physical ZKTeco hardware is connected to a Windows or Linux test machine:
1. Run the harness against the connected scanner.
2. Record observed empirical data in `results-template.md`.
3. Transfer recorded values into [`docs/programme/spikes/scanner-spike-report.md`](../../docs/programme/spikes/scanner-spike-report.md).
