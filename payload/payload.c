#include <stdint.h>
#include <stddef.h>

/* The SDK doesn't ship a stub for this symbol. Declare it as an extern
 * function pointer that the PS4 loader will resolve at runtime, and
 * reference it through a NID lookup done by the exploit chain.
 * For a compile-only test, we stub it as a weak symbol. */
extern int sceSysUtilSendSystemNotificationWithText(unsigned int type, const char *text)
    __attribute__((weak));

/* The SDK's crt1.o expects main(). Our payload IS main. */
int main(void) {
    if (sceSysUtilSendSystemNotificationWithText) {
        sceSysUtilSendSystemNotificationWithText(0, "Userland OK on PS4");
    }
    return 0;
}
