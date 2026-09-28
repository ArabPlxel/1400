#include <stdint.h>
#include <stddef.h>

typedef int (*notify_fn_t)(unsigned int, const char *);
typedef intptr_t (*syscall_t)(uint64_t, ...);
extern syscall_t syscall;

typedef struct {
    uint64_t size;
    uint8_t  raw[0x158];
} modinfo_t;

static void my_memset(void *p, int c, size_t n) {
    uint8_t *b = p;
    while (n--) *b++ = (uint8_t)c;
}

int main(void) {
    notify_fn_t notify = 0;
    uint64_t scratch = (uint64_t)syscall(477, 0, 0x8000, 3, 0x1002, -1, 0);
    if (scratch == (uint64_t)-1 || scratch == 0) return -1;

    uint32_t *handles  = (uint32_t *)scratch;
    uint32_t *countPtr = (uint32_t *)(scratch + 0x1000);
    modinfo_t *info    = (modinfo_t *)(scratch + 0x2000);

    syscall(592, handles, 256, countPtr);
    uint32_t n = *countPtr;
    if (n > 256) n = 256;

    for (uint32_t i = 0; i < n; i++) {
        my_memset(info, 0, sizeof(*info));
        info->size = sizeof(*info);
        if (syscall(593, handles[i], info) != 0) continue;

        char *name = (char *)((uint8_t *)info + 0x08);
        if (name[0] == 0) continue;

        int found = 0;
        for (int j = 0; j < 24 && name[j]; j++) {
            if (name[j]=='S' && name[j+1]=='c' && name[j+2]=='e' &&
                name[j+3]=='S' && name[j+4]=='y' && name[j+5]=='s' &&
                name[j+6]=='U' && name[j+7]=='t' && name[j+8]=='i' &&
                name[j+9]=='l') { found = 1; break; }
        }
        if (!found) continue;

        uint64_t base = *(uint64_t *)((uint8_t *)info + 0x108);

        for (uint32_t o = 0; o < 0x40000; o += 4) {
            uint32_t v = *(uint32_t *)(base + o);
            if (v != 0x2C68F1F8) continue;
            for (uint32_t d = 4; d < 0x100; d += 8) {
                uint64_t ptr = *(uint64_t *)(base + o + d);
                if (ptr > 0x8000000000ULL && (ptr & 0xfff) < 0x1000) {
                    notify = (notify_fn_t)ptr; break;
                }
            }
            if (notify) break;
        }
        if (notify) break;
    }

    if (notify) notify(0, "[14.00] USERLAND OK");
    return 0;
}
