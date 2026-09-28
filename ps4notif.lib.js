export function sendNotif(p, sc, callAddr, int64, webkitBase, findImportByName, listImports, msg, log) {
    try {
        const imports = listImports(p, webkitBase, "SysUtil");
        log("SysUtil imports: " + imports.length);
        imports.slice(0, 10).forEach(function(n){ log("  " + n); });

        const hit = findImportByName(p, webkitBase, "sceSysUtilSendSystemNotificationWithText");
        if (!hit) { log("notify NOT in Webkit imports"); return false; }

        log("notify fn=" + hit.fn + " slot=0x" + hit.slot.low.toString(16));

        const buf = sc(197, 0, 0x100, 3, 0x1002, -1, 0);
        const bufAddr = new int64(buf.lo, buf.hi);
        for (let i = 0; i < msg.length; i++) p.write1(bufAddr.add32(i), msg.charCodeAt(i));
        p.write1(bufAddr.add32(msg.length), 0);

        const rc = callAddr(hit.fn, [0, bufAddr]).i32;
        log("notify rc=" + rc);
        return rc === 0;
    } catch (e) {
        log("notify err: " + String(e));
        return false;
    }
}
