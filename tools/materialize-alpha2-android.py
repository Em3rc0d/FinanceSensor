from pathlib import Path
import re

PHYSICAL_PACKAGE = 'com.financesensor.lab.gmailconnection.r2'
GENERATED_PACKAGE = 'com.financesensor.lab.financesensor_mobile_shell'

kts = Path('android/app/build.gradle.kts')
groovy = Path('android/app/build.gradle')
settings = Path('android/settings.gradle.kts')
wrapper = Path('android/gradle/wrapper/gradle-wrapper.properties')

if kts.exists():
    text = kts.read_text()
    markers = (
        'compileSdk = flutter.compileSdkVersion',
        'minSdk = flutter.minSdkVersion',
        'targetSdk = flutter.targetSdkVersion',
        f'applicationId = "{GENERATED_PACKAGE}"',
    )
    if not all(marker in text for marker in markers):
        raise SystemExit('EXPECTED_FLUTTER_ANDROID_BASELINE_MARKER_NOT_FOUND')
    text = text.replace(markers[0], 'compileSdk = 37')
    text = text.replace(markers[1], 'minSdk = 31')
    text = text.replace(markers[2], 'targetSdk = 36')
    text = text.replace(markers[3], f'applicationId = "{PHYSICAL_PACKAGE}"')
    if 'sqlcipher-android:4.18.0' not in text:
        text += '\n\ndependencies {\n    implementation("com.google.android.gms:play-services-auth:21.6.0")\n    implementation("net.zetetic:sqlcipher-android:4.18.0")\n    implementation("androidx.sqlite:sqlite:2.7.0")\n}\n'
    kts.write_text(text)
elif groovy.exists():
    text = groovy.read_text()
    markers = (
        'compileSdkVersion flutter.compileSdkVersion',
        'minSdkVersion flutter.minSdkVersion',
        'targetSdkVersion flutter.targetSdkVersion',
        f'applicationId "{GENERATED_PACKAGE}"',
    )
    if not all(marker in text for marker in markers):
        raise SystemExit('EXPECTED_FLUTTER_ANDROID_BASELINE_MARKER_NOT_FOUND')
    text = text.replace(markers[0], 'compileSdkVersion 37')
    text = text.replace(markers[1], 'minSdkVersion 31')
    text = text.replace(markers[2], 'targetSdkVersion 36')
    text = text.replace(markers[3], f'applicationId "{PHYSICAL_PACKAGE}"')
    if 'sqlcipher-android:4.18.0' not in text:
        text += '\n\ndependencies {\n    implementation "com.google.android.gms:play-services-auth:21.6.0"\n    implementation "net.zetetic:sqlcipher-android:4.18.0"\n    implementation "androidx.sqlite:sqlite:2.7.0"\n}\n'
    groovy.write_text(text)
else:
    raise SystemExit('ANDROID_APP_GRADLE_FILE_NOT_FOUND')

if not settings.exists():
    raise SystemExit('ANDROID_SETTINGS_KTS_NOT_FOUND')
settings_text = settings.read_text()
old = 'id("com.android.application") version "9.0.1" apply false'
new = 'id("com.android.application") version "9.1.1" apply false'
if old not in settings_text:
    raise SystemExit('EXPECTED_FLUTTER_AGP_9_0_1_MARKER_NOT_FOUND')
settings.write_text(settings_text.replace(old, new, 1))

if not wrapper.exists():
    raise SystemExit('ANDROID_GRADLE_WRAPPER_NOT_FOUND')
wrapper_text = wrapper.read_text()
pattern = r'gradle-9\.1\.0-(all|bin)\.zip'
if not re.search(pattern, wrapper_text):
    raise SystemExit('EXPECTED_FLUTTER_GRADLE_9_1_0_MARKER_NOT_FOUND')
wrapper.write_text(re.sub(pattern, lambda m: f'gradle-9.3.1-{m.group(1)}.zip', wrapper_text, count=1))

target_dir = Path('android/app/src/main/kotlin/com/financesensor/lab/financesensor_mobile_shell')
target_dir.mkdir(parents=True, exist_ok=True)
for source_name, target_name in (
    ('Alpha2MainActivity.kt', 'MainActivity.kt'),
    ('Alpha2TransactionScanner.kt', 'Alpha2TransactionScanner.kt'),
    ('Alpha2StatementDiscoveryScanner.kt', 'Alpha2StatementDiscoveryScanner.kt'),
    ('Alpha2VaultBridge.kt', 'Alpha2VaultBridge.kt'),
):
    source = Path('native/android') / source_name
    if not source.exists():
        raise SystemExit(f'NATIVE_SOURCE_NOT_FOUND:{source}')
    (target_dir / target_name).write_text(source.read_text())

manifest = Path('android/app/src/main/AndroidManifest.xml')
text = manifest.read_text()
root = '<manifest xmlns:android="http://schemas.android.com/apk/res/android">'
permission = '<uses-permission android:name="android.permission.INTERNET" />'
if permission not in text:
    if root not in text:
        raise SystemExit('ANDROID_MANIFEST_ROOT_MARKER_NOT_FOUND')
    text = text.replace(root, root + '\n    ' + permission, 1)
if 'android:allowBackup=' not in text:
    text = text.replace('<application', '<application android:allowBackup="false"', 1)
manifest.write_text(text)

print('ALPHA2_ANDROID_MATERIALIZATION=PASS')
print(f'ANDROID_OAUTH_PACKAGE={PHYSICAL_PACKAGE}')
print('ANDROID_COMPILE_SDK=37')
print('ANDROID_MIN_SDK=31')
print('ANDROID_TARGET_SDK=36')
print('SQLCIPHER_VERSION=4.18.0')
