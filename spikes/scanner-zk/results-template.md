# ZKTeco Scanner Physical Measurement Results Template

This template is for recording empirical measurements obtained by a human engineer testing physical ZKTeco fingerprint hardware on a dedicated test machine.

---

## 1. Test Environment Details

- **Test Date:** `[YYYY-MM-DD]`
- **Engineer Name:** `[Human Tester Name]`
- **Test Machine Host OS:** `[e.g., Windows 11 Pro 64-bit / Ubuntu 22.04 LTS x86_64]`
- **CPU / RAM:** `[e.g., Intel Core i5-1135G7 @ 2.4GHz, 16 GB RAM]`
- **Node.js Version:** `[e.g., v20.14.0 x64]`
- **Electron Version:** `[e.g., v33.2.1 / v34.0.0]`
- **Scanner Model:** `[e.g., ZKTeco ZK9500 / SLK20R / Live20R / ZK4500]`
- **Scanner Serial Number:** `[e.g., ZK-SLK20R-2026-9901]`
- **Firmware Version:** `[e.g., v2.1.0]`
- **Driver Version:** `[e.g., ZKTeco USB Driver v3.0.1]`
- **SDK Version & Bitness:** `[e.g., ZKFinger SDK 10.0 x64]`

---

## 2. Empirical Measurement Form

| Question # | Measurement Dimension | Observed Value / Result | Notes & Observations | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Q1** | Driver installation on clean Windows 11 | `[Success / Issues encountered]` | `[Document if reboot required, unsigned driver prompt, etc.]` | `[measured]` |
| **Q2** | Device enumeration time (`ZKFPM_GetDeviceCount`) | `[_______ ms]` | `[Time to detect device upon SDK init]` | `[measured]` |
| **Q2** | Hot-plug arrival detection time | `[_______ ms]` | `[How quickly client detects USB insertion]` | `[measured]` |
| **Q2** | Behavior when USB disconnected mid-capture | `[Clean error code / Hang / Crash]` | `[Return code returned by AcquireFingerprint]` | `[measured]` |
| **Q3** | USB connection stability (100 rapid connects) | `[_______ % success]` | `[Number of successful opens/closes without driver fault]` | `[measured]` |
| **Q3** | Bluetooth SPP virtual COM connection latency | `[_______ ms / Not Applicable]` | `[If testing Bluetooth scanner model]` | `[measured / N/A]` |
| **Q4** | Image capture duration (dry finger) | `[_______ ms]` | `[Time from finger press to template generation]` | `[measured]` |
| **Q4** | Image quality value (dry finger) | `[_______ / 100]` | `[Reported quality score]` | `[measured]` |
| **Q4** | Image capture duration (moist finger) | `[_______ ms]` | `[Time from finger press to template generation]` | `[measured]` |
| **Q4** | Image quality value (moist finger) | `[_______ / 100]` | `[Reported quality score]` | `[measured]` |
| **Q4** | Capture timeout behavior when no finger presented | `[Blocks / Returns timeout at _____ ms]` | `[Does AcquireFingerprint respect timeout]` | `[measured]` |
| **Q4** | Live-Finger Detection (LFD) test (Silicone / Paper) | `[Rejected / Accepted / Not Supported]` | `[Result when fake fingerprint is presented]` | `[measured]` |
| **Q5** | 3-capture enrollment merge time (`GenRegTemplate`)| `[_______ ms]` | `[Time to fuse 3 minutiae samples]` | `[measured]` |
| **Q5** | Master registration template byte size | `[_______ bytes]` | `[Typical size in bytes]` | `[measured]` |
| **Q5** | Minimum / Maximum template size across 10 enrollments | `[Min: ___ B, Max: ___ B]` | `[Variability observed]` | `[measured]` |
| **Q6** | 1:N In-Memory Identification Time ($N = 100$) | `[_______ ms]` | `[Search time across 100 templates]` | `[measured]` |
| **Q6** | 1:N In-Memory Identification Time ($N = 500$) | `[_______ ms]` | `[Search time across 500 templates (classroom)]` | `[measured]` |
| **Q6** | 1:N In-Memory Identification Time ($N = 1,000$) | `[_______ ms]` | `[Search time across 1,000 templates]` | `[measured]` |
| **Q6** | 1:N In-Memory Identification Time ($N = 5,000$) | `[_______ ms]` | `[Search time across 5,000 templates]` | `[measured]` |
| **Q6** | Maximum DBCache capacity before degradation | `[_______ templates]` | `[Limit before memory error or slow search]` | `[measured]` |
| **Q6** | Match score for identical finger (same session) | `[Score: _______ / 100+]` | `[True positive score]` | `[measured]` |
| **Q6** | Match score for different finger (impostor) | `[Score: _______ / 100+]` | `[True negative score]` | `[measured]` |
| **Q7** | UI framerate during continuous 1:N matching | `[_______ FPS]` | `[Confirms main event loop does not stutter]` | `[measured]` |
| **Q7** | Electron rebuild (`@electron/rebuild`) result | `[Success / Failure with error logs]` | `[Does native C++ addon rebuild cleanly for Electron ABI]` | `[measured]` |
| **Q8** | Linux x86_64 server matching execution test | `[Success / Failed / Untested]` | `[Result of running ZKFinger 10.0 on Ubuntu/Debian x64]` | `[measured]` |
| **Q9** | Cross-platform score consistency (Win vs Android) | `[Consistent / Divergent by ____ points]`| `[Comparison of scores for same ISO 19794-2 template]` | `[measured]` |
| **Q10**| Android standalone GPS cold-start TTFF | `[_______ seconds]` | `[Time to first fix offline with no data/Wi-Fi]` | `[measured]` |
| **Q10**| Android standalone GPS accuracy observed | `[_______ meters radius]` | `[Accuracy radius reported by LocationManager]` | `[measured]` |
