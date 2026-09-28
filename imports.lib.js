export function findImportByName(p, base, symbolName) {
    try {
        const e_phoff = p.read8(base.add32(0x20));
        const e_phnum = p.read2(base.add32(0x38)).low;
        const e_phentsize = p.read2(base.add32(0x36)).low;
        let dynAddr = null;
        for (let i = 0; i < e_phnum; i++) {
            const ph = base.add32(0x40).add32(i * e_phentsize);
            if (p.read4(ph).low === 2) { dynAddr = p.read8(ph.add32(16)); break; }
        }
        if (!dynAddr) return null;
        let strtab = null, symtab = null, jmprel = null, pltrelsz = 0;
        for (let i = 0; i < 128; i++) {
            const d = dynAddr.add32(i * 16);
            const tag = p.read8(d).low >>> 0;
            const val = p.read8(d.add32(8));
            if (tag === 0) break;
            if (tag === 5)  strtab = val;
            if (tag === 6)  symtab = val;
            if (tag === 23) jmprel = val;
            if (tag === 2)  pltrelsz = val.low;
        }
        if (!strtab || !symtab || !jmprel) return null;
        const nRel = (pltrelsz / 24) | 0;
        for (let i = 0; i < nRel; i++) {
            const rela = jmprel.add32(i * 24);
            const r_offset = p.read8(rela);
            const r_info = p.read8(rela.add32(8));
            const symIdx = (r_info.low >>> 8) >>> 0;
            const sym = symtab.add32(symIdx * 24);
            const st_name = p.read4(sym).low;
            let name = "";
            for (let j = 0; j < 128; j++) {
                const c = p.read1(strtab.add32(st_name + j)).low & 0xff;
                if (c === 0) break;
                name += String.fromCharCode(c);
            }
            if (name === symbolName) {
                return { slot: r_offset, fn: p.read8(r_offset) };
            }
        }
        return null;
    } catch (e) { return null; }
}

export function listImports(p, base, filterSubstr) {
    try {
        const e_phoff = p.read8(base.add32(0x20));
        const e_phnum = p.read2(base.add32(0x38)).low;
        const e_phentsize = p.read2(base.add32(0x36)).low;
        let dynAddr = null;
        for (let i = 0; i < e_phnum; i++) {
            const ph = base.add32(0x40).add32(i * e_phentsize);
            if (p.read4(ph).low === 2) { dynAddr = p.read8(ph.add32(16)); break; }
        }
        if (!dynAddr) return [];
        let strtab = null, symtab = null, jmprel = null, pltrelsz = 0;
        for (let i = 0; i < 128; i++) {
            const d = dynAddr.add32(i * 16);
            const tag = p.read8(d).low >>> 0;
            const val = p.read8(d.add32(8));
            if (tag === 0) break;
            if (tag === 5)  strtab = val;
            if (tag === 6)  symtab = val;
            if (tag === 23) jmprel = val;
            if (tag === 2)  pltrelsz = val.low;
        }
        if (!strtab || !symtab || !jmprel) return [];
        const out = [];
        const nRel = (pltrelsz / 24) | 0;
        for (let i = 0; i < nRel; i++) {
            const rela = jmprel.add32(i * 24);
            const r_info = p.read8(rela.add32(8));
            const symIdx = (r_info.low >>> 8) >>> 0;
            const sym = symtab.add32(symIdx * 24);
            const st_name = p.read4(sym).low;
            let name = "";
            for (let j = 0; j < 128; j++) {
                const c = p.read1(strtab.add32(st_name + j)).low & 0xff;
                if (c === 0) break;
                name += String.fromCharCode(c);
            }
            if (!filterSubstr || name.indexOf(filterSubstr) >= 0) out.push(name);
        }
        return out;
    } catch (e) { return []; }
}
