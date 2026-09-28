/*
 * ps4notif.lib.js
 * Userland notification helper for the raw13g chain.
 * Expects the caller to provide:
 *   - p       : arbitrary read/write object (read1/2/4/8, write1/2/4/8)
 *   - sc      : syscall wrapper
 *   - callAddr: function-call primitive returning int64
 *   - int64   : the chain's int64 class
 *   - libkernelBase : (unused for now, kept for future module lookup)
 */

export const PS4Notif = (function () {
    const SYS_mmap            = 197;  // placeholder; chain overrides
    const SYS_getLoadedModules = 592;
    const SYS_getModuleInfo    = 593;

    const NOTIFY_NID = 0x2C68F1F8;   // sceSysUtilSendSystemNotificationWithText
    const NOTIFY_NID_ALT = 0x2C68F1F8; // same NID, kept for clarity

    const MODNAME_OFF   = 0x08;   // offset of name[] in SceKernelModuleInfo
    const MODBASE_OFF   = 0x108;  // offset of segment base
    const MODINFO_SIZE  = 0x160;

    function cstring(p, addr, max) {
        let s = "";
        for (let i = 0; i < max; i++) {
            const c = p.read1(addr.add32(i)).low & 0xff;
            if (c === 0) break;
            s += String.fromCharCode(c);
        }
        return s;
    }

    function writeString(p, addr, str) {
        for (let i = 0; i < str.length; i++) {
            p.write1(addr.add32(i), str.charCodeAt(i));
        }
        p.write1(addr.add32(str.length), 0);
    }

    function findSysutilBase(p, sc, int64, scratch, log) {
        const countAddr = scratch.add32(0x1000);
        sc(SYS_getLoadedModules, 0, 0, 0);
        const rc0 = sc(SYS_getLoadedModules, scratch, 512, countAddr);
        const n = p.read4(countAddr).low | 0;
        log("module count=" + n + " rc=" + rc0);

        const infoAddr = scratch.add32(0x800);
        for (let i = 0; i < n && i < 256; i++) {
            const h = p.read4(scratch.add32(i * 4)).low | 0;
            if (h === 0) continue;
            p.write8(infoAddr, new int64(MODINFO_SIZE, 0));
            const rc1 = sc(SYS_getModuleInfo, h, infoAddr);
            if (rc1 !== 0) continue;

            const name = cstring(p, infoAddr.add32(MODNAME_OFF), 32);
            if (name.indexOf("SysUtil") >= 0) {
                const base = p.read8(infoAddr.add32(MODBASE_OFF));
                log("found " + name + " base=" + base);
                return base;
            }
        }
        return null;
    }

    function scanExportNid(p, modBase, nid, log) {
        // Brute-force: scan first 0x20000 bytes for the NID as u32,
        // then look for a plausible code pointer within 0x100 bytes.
        for (let o = 0; o < 0x20000; o += 4) {
            const v = p.read4(modBase.add32(o)).low >>> 0;
            if (v === (nid >>> 0)) {
                log("NID found at +0x" + o.toString(16));
                for (let d = 4; d < 0x100; d += 4) {
                    const ptr = p.read8(modBase.add32(o + d));
                    if (ptr.hi >>> 0 > 0 && (ptr.low & 0xfff) < 0x1000) {
                        return ptr;
                    }
                }
            }
        }
        return null;
    }

    function send(p, sc, callAddr, int64, scratch, message, log) {
        try {
            const base = findSysutilBase(p, sc, int64, scratch, log);
            if (!base) { log("libSceSysUtil not found"); return false; }

            const fn = scanExportNid(p, base, NOTIFY_NID, log);
            if (!fn) { log("notify NID not found"); return false; }
            log("notify fn=" + fn);

            const msgAddr = scratch.add32(0x1800);
            writeString(p, msgAddr, message);

            const rc = callAddr(fn, [0, msgAddr]).i32;
            log("notify rc=" + rc);
            return rc === 0;
        } catch (e) {
            log("notify exception: " + String(e));
            return false;
        }
    }

    return { send };
})();
