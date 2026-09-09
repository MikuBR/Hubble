#!/usr/bin/env python3
"""
Fuzz harness for bypass_pdlite::pd_load using BYOL (Bring Your Own Load) approach.

Strategy:
  1. Construct a minimal PE in memory (byte array)
  2. Write it to a temp file
  3. Call pd_load(path) — the function under test
  4. Detect crashes (access violations, heap corruption, etc.)

This can be used with:
  - AFL++ (afl-clang-fast) if compiled with -fsanitize=fuzzer-no-link
  - libFuzzer if compiled as a standalone binary with -fsanitize=fuzzer
  - Standalone crash testing with winapi fault handling
"""

import os
import sys
import struct
import tempfile
import argparse
from pathlib import Path

# ---------------------------------------------------------------------------
# Minimal PE builder — builds a valid-ish PE in memory for pd_load to parse
# ---------------------------------------------------------------------------

def build_minimal_pe(payload_bytes=None, xorkey=b"\x00" * 4):
    """
    Build a minimal PE32 (.exe) in memory. The PE is structurally valid
    enough for pd_load's parser to traverse headers without immediate rejection.

    If payload_bytes is provided, it is placed in a .data section so that
    pd_load will map it into memory — this is the BYOL path.
    """
    # PE headers (simplified but valid)
    dos_header = bytearray(64)
    dos_header[0:2] = b"MZ"
    dos_header[24:28] = struct.pack("<I", 0x40)  # e_lfanew -> PE header at 0x40

    # PE Signature
    pe_sig = b"PE\x00\x00"

    # COFF File Header
    machine = 0x14c  # IMAGE_FILE_MACHINE_I386
    num_sections = 2 if payload_bytes else 1  # .text + .data
    timestamp = 0
    symbols = 0
    optional_header_size = 0xE0  # SIZE_OF_OPTIONAL_HEADER for PE32
    characteristics = 0x102  # IMAGE_FILE_EXECUTABLE_IMAGE | IMAGE_FILE_32BIT_MACHINE

    coff_header = struct.pack("<HHIIIHH",
        machine, num_sections, timestamp, symbols,
        optional_header_size, characteristics)

    # Optional Header (PE32)
    magic = 0x10b  # PE32
    major_linker = 0
    minor_linker = 0
    size_code = 0x1000  # aligned size of code
    size_init_data = 0x1000
    size_uninit_data = 0
    entry_point = 0  # no entry point for a loader target
    base_code = 0x00400000
    base_data = 0x00400000
    image_base = 0x00400000
    section_align = 0x1000
    file_align = 0x200
    os_version = 0
    image_version = 0
    sub_version = 0
    win32_version = 0
    size_image = 0x3000
    size_headers = 0x200
    checksum = 0
    subsystem = 3  # IMAGE_SUBSYSTEM_WINDOWS_CUI
    dll_characteristics = 0
    stack_reserve = 0x100000
    stack_commit = 0x1000
    heap_reserve = 0x100000
    heap_commit = 0x1000
    loader_flags = 0
    num_data_dirs = 16

    optional_header = struct.pack("<HBBIIIIIIIHHHHHHIIIIIHHHHIIQ",
        magic, major_linker, minor_linker,
        size_code, size_init_data, size_uninit_data,
        entry_point, base_code, base_data, image_base,
        section_align, file_align,
        os_version, image_version, sub_version, win32_version,
        size_image, size_headers, checksum,
        subsystem, dll_characteristics,
        stack_reserve, stack_commit,
        heap_reserve, heap_commit,
        loader_flags, num_data_dirs)

    # Data directories (16 entries, all zero for minimal PE)
    data_dirs = b"\x00" * (16 * 8)

    # Section headers
    sections = bytearray()

    # .text section (empty, just for valid structure)
    text_name = b".text\x00\x00\x00"
    text_virtual_size = 0x1000
    text_virtual_address = 0x1000
    text_raw_size = 0x200
    text_raw_pointer = 0x200  # after headers
    text_relocs = 0
    text_linenums = 0
    text_num_relocs = 0
    text_num_linenums = 0
    text_flags = 0x60000020  # IMAGE_SCN_CNT_CODE | IMAGE_SCN_MEM_EXECUTE | IMAGE_SCN_MEM_READ

    sections += struct.pack("<8sIIIIIIHHI",
        text_name, text_virtual_size, text_virtual_address,
        text_raw_size, text_raw_pointer,
        text_relocs, text_linenums,
        text_num_relocs, text_num_linenums, text_flags)

    # .data section (contains payload if provided)
    data_name = b".data\x00\x00\x00"
    data_virtual_size = 0x1000
    data_virtual_address = 0x2000
    data_raw_size = 0x200 if not payload_bytes else (len(payload_bytes) + 0x1FF) & ~0x1FF
    data_raw_pointer = 0x400  # after .text raw data
    data_relocs = 0
    data_linenums = 0
    data_num_relocs = 0
    data_num_linenums = 0
    data_flags = 0xC0000040  # IMAGE_SCN_CNT_INITIALIZED_DATA | IMAGE_SCN_MEM_READ | IMAGE_SCN_MEM_WRITE

    sections += struct.pack("<8sIIIIIIHHI",
        data_name, data_virtual_size, data_virtual_address,
        data_raw_size, data_raw_pointer,
        data_relocs, data_linenums,
        data_num_relocs, data_num_linenums, data_flags)

    # Build raw file
    raw_file = bytearray()
    raw_file += dos_header
    raw_file += b"\x00" * (0x40 - len(raw_file))  # pad to PE header offset
    raw_file += pe_sig
    raw_file += coff_header
    raw_file += optional_header
    raw_file += data_dirs
    raw_file += sections

    # Pad to file alignment
    while len(raw_file) < 0x200:
        raw_file += b"\x00"

    # .text raw data (zeros)
    raw_file += b"\x00" * 0x200

    # .data raw data
    if payload_bytes:
        raw_file += payload_bytes
        raw_file += b"\x00" * ((0x200 - (len(payload_bytes) % 0x200)) % 0x200)
    else:
        raw_file += b"\x00" * 0x200

    return bytes(raw_file)


def build_pe_with_payload(payload_bytes, description="BYOL payload"):
    """
    Construct a PE containing the given payload bytes in its .data section.
    Returns the PE as a byte string.
    """
    return build_minimal_pe(payload_bytes=payload_bytes)


# ---------------------------------------------------------------------------
# Fuzzer harness
# ---------------------------------------------------------------------------

def create_temp_pe(pe_bytes):
    """Write PE bytes to a temp file and return the path."""
    fd, path = tempfile.mkstemp(suffix=".exe", prefix="fuzz_pdload_")
    try:
        os.write(fd, pe_bytes)
        os.close(fd)
    except:
        os.close(fd)
        raise
    return path


def cleanup_temp(path):
    try:
        os.unlink(path)
    except:
        pass


def run_pd_load(path, timeout_ms=5000):
    """
    Call pd_load(path) via a small C shim that we expect to be compiled
    alongside this Python harness (for the actual FFI).

    In a pure-Python prototyping phase, this is a placeholder — the real
    harness would be a compiled C binary that links against bypass_pdlite.

    For now, we simulate the call by launching an external binary.
    """
    raise NotImplementedError(
        "This Python script is a companion to a C fuzz harness. "
        "Compile the C harness (see byp_async_fuzz.c) and invoke it here."
    )


# ---------------------------------------------------------------------------
# Main entry point for generating test cases
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate minimal PE test cases for pd_load fuzzing"
    )
    parser.add_argument(
        "--payload", type=Path, default=None,
        help="File containing payload bytes to embed in .data section (BYOL)"
    )
    parser.add_argument(
        "--output", type=Path, default=None,
        help="Output path for the generated PE (if omitted, prints hex to stdout)"
    )
    parser.add_argument(
        "--payload-name", type=str, default="default",
        help="Identifier for the payload (for logging / corpus naming)"
    )
    parser.add_argument(
        "--count", type=int, default=1,
        help="Number of variants to generate"
    )
    args = parser.parse_args()

    payload_bytes = b""
    if args.payload and args.payload.exists():
        payload_bytes = args.payload.read_bytes()
        print(f"[i] Loaded {len(payload_bytes)} bytes from {args.payload} "
              f"for payload '{args.payload_name}'", file=sys.stderr)

    for i in range(args.count):
        pe = build_pe_with_payload(payload_bytes)
        label = f"{args.payload_name}_var{i}" if args.count > 1 else args.payload_name

        if args.output:
            out_path = args.output.parent / f"{label}.exe"
            out_path.write_bytes(pe)
            print(f"[+] Wrote {len(pe)} bytes -> {out_path}", file=sys.stderr)
        else:
            # Print hex dump to stdout for piping into other tools
            print(pe.hex())

    print(f"[+] Generated {args.count} PE test case(s) for payload '{args.payload_name}'",
          file=sys.stderr)
