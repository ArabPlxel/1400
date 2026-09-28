SDK    := $(HOME)/ps4-payload-sdk-dev-install
CC     := $(SDK)/bin/orbis-clang
STRIP  := $(SDK)/bin/orbis-strip
LDSCR  := $(SDK)/ldscripts
LIBDIR := $(SDK)/target/lib

CFLAGS := -O2 -nostdlib -ffreestanding -fno-stack-protector \
          -isystem $(SDK)/include -mcmodel=small -fPIE \
          -B$(LDSCR) -T$(LDSCR)/elf_x86_64.x

LDFLAGS := -L$(LIBDIR) -Wl,--allow-multiple-definition

all: payload.bin

payload.elf: payload.c
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS) -lc -lkernel

payload.bin: payload.elf
	$(STRIP) -o $@ $<

clean:
	rm -f payload.elf payload.bin

.PHONY: all clean
