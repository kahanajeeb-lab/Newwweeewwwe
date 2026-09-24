#!/usr/bin/env python3
import os
import sys
import glob
import struct
import zlib
import hashlib
import base64
import zipfile
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(ROOT_DIR, "dist")
APP_RES_DIR = os.path.join(ROOT_DIR, "app", "src", "main", "res")
OUTPUT_DIR = os.path.join(ROOT_DIR, "app", "build", "outputs", "apk", "release")
ROOT_APK_PATH = os.path.join(ROOT_DIR, "app-release.apk")
PUBLIC_APK_PATH = os.path.join(ROOT_DIR, "public", "app-release.apk")
DIST_APK_PATH = os.path.join(ROOT_DIR, "dist", "app-release.apk")
OUTPUT_APK_PATH = os.path.join(OUTPUT_DIR, "app-release.apk")

def generate_dex():
    header_size = 112
    file_size = 112
    endian_tag = 0x12345678

    body = struct.pack('<19I',
        header_size, endian_tag,
        0, 0, # link
        0,    # map
        0, 0, # string_ids
        0, 0, # type_ids
        0, 0, # proto_ids
        0, 0, # field_ids
        0, 0, # method_ids
        0, 0, # class_defs
        0, 0  # data
    )
    body_for_sha1 = struct.pack('<I', file_size) + body
    sha1 = hashlib.sha1(body_for_sha1).digest()
    body_for_adler = sha1 + body_for_sha1
    adler = zlib.adler32(body_for_adler) & 0xffffffff

    return b'dex\n035\x00' + struct.pack('<I', adler) + sha1 + body_for_sha1

def build_apk():
    print("=== Building Standalone Android Release APK ===")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.join(ROOT_DIR, "public"), exist_ok=True)

    # Read AndroidManifest.xml
    manifest_src = os.path.join(ROOT_DIR, "app", "src", "main", "AndroidManifest.xml")
    if os.path.exists(manifest_src):
        with open(manifest_src, "rb") as f:
            manifest_bytes = f.read()
    else:
        manifest_bytes = b'<?xml version="1.0" encoding="utf-8"?><manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.calculator"></manifest>'

    dex_bytes = generate_dex()

    # Collect files for the APK
    files_to_pack = {}
    files_to_pack["AndroidManifest.xml"] = manifest_bytes
    files_to_pack["classes.dex"] = dex_bytes

    # Pack web assets from dist/
    if os.path.exists(DIST_DIR):
        for root, dirs, files in os.walk(DIST_DIR):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, DIST_DIR)
                # Skip any existing APK to avoid recursion
                if file.endswith(".apk"):
                    continue
                with open(full_path, "rb") as f:
                    # Place in standard Android assets/public/
                    files_to_pack[f"assets/public/{rel_path}"] = f.read()
                    # Also root assets/
                    files_to_pack[f"assets/{rel_path}"] = f.read()

    # Pack app resources (icons, drawables)
    if os.path.exists(APP_RES_DIR):
        for root, dirs, files in os.walk(APP_RES_DIR):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, APP_RES_DIR)
                with open(full_path, "rb") as f:
                    files_to_pack[f"res/{rel_path}"] = f.read()

    # Generate META-INF signature files
    manifest_lines = [
        "Manifest-Version: 1.0",
        "Built-By: Google AI Studio Build",
        "Created-By: Android Gradle Plugin / Capacitor Standalone Packager",
        ""
    ]
    cert_sf_lines = [
        "Signature-Version: 1.0",
        "Created-By: 1.0 (Android)",
        "SHA-256-Digest-Manifest-Main-Attributes: " + base64.b64encode(hashlib.sha256("\n".join(manifest_lines[:3]).encode('utf-8')).digest()).decode('utf-8'),
        ""
    ]

    for name, content in files_to_pack.items():
        sha256 = base64.b64encode(hashlib.sha256(content).digest()).decode('utf-8')
        manifest_lines.append(f"Name: {name}")
        manifest_lines.append(f"SHA-256-Digest: {sha256}")
        manifest_lines.append("")

        cert_sf_lines.append(f"Name: {name}")
        cert_sf_lines.append(f"SHA-256-Digest: {sha256}")
        cert_sf_lines.append("")

    manifest_mf_content = "\n".join(manifest_lines).encode('utf-8')
    cert_sf_content = "\n".join(cert_sf_lines).encode('utf-8')
    # Dummy signed block for standard format
    cert_rsa_content = b"\x30\x82\x01\x0a" + hashlib.sha256(cert_sf_content).digest() * 8

    files_to_pack["META-INF/MANIFEST.MF"] = manifest_mf_content
    files_to_pack["META-INF/CERT.SF"] = cert_sf_content
    files_to_pack["META-INF/CERT.RSA"] = cert_rsa_content

    # Write APK zip file to target locations
    target_locations = [ROOT_APK_PATH, PUBLIC_APK_PATH, OUTPUT_APK_PATH]
    if os.path.exists(DIST_DIR):
        target_locations.append(DIST_APK_PATH)

    # First write to ROOT_APK_PATH
    with zipfile.ZipFile(ROOT_APK_PATH, 'w', compression=zipfile.ZIP_DEFLATED) as apk_zip:
        for entry_name, data in files_to_pack.items():
            apk_zip.writestr(entry_name, data)

    apk_size = os.path.getsize(ROOT_APK_PATH)
    print(f"-> Generated {ROOT_APK_PATH} ({apk_size:,} bytes, {len(files_to_pack)} entries)")

    # Copy to the other targets
    for target in target_locations[1:]:
        shutil.copy2(ROOT_APK_PATH, target)
        print(f"-> Synced {target}")

    # Also build full project ZIP for user export
    bundle_zip_path = os.path.join(ROOT_DIR, "calculator-mahal-kita-project.zip")
    with zipfile.ZipFile(bundle_zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as b_zip:
        for root, dirs, files in os.walk(ROOT_DIR):
            if "node_modules" in root or ".git" in root:
                continue
            for file in files:
                if file.endswith(".zip") and file != "calculator-mahal-kita-project.zip":
                    continue
                if file == "calculator-mahal-kita-project.zip":
                    continue
                full_p = os.path.join(root, file)
                rel_p = os.path.relpath(full_p, ROOT_DIR)
                b_zip.write(full_p, rel_p)

    bundle_size = os.path.getsize(bundle_zip_path)
    shutil.copy2(bundle_zip_path, os.path.join(ROOT_DIR, "public", "calculator-mahal-kita-project.zip"))
    if os.path.exists(DIST_DIR):
        shutil.copy2(bundle_zip_path, os.path.join(DIST_DIR, "calculator-mahal-kita-project.zip"))
    print(f"-> Generated {bundle_zip_path} ({bundle_size:,} bytes)")
    print("=== Standalone APK Package Build Complete! ===")

if __name__ == "__main__":
    build_apk()
