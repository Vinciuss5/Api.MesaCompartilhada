# Mesa Compartilhada - Build Android (VS Code)

Esta pasta contem uma copia do projeto pronta para gerar um app Android com Capacitor.

## Estrutura

- `EstoqueAPI/` - backend (.NET)
- `sistema-ong-frontend/` - front-end web (React + Vite)
- `sistema-ong-frontend/android/` - projeto nativo Android (Gradle)

## Requisitos

1. Node.js (ja instalado)
2. Java JDK 17+ (configure JAVA_HOME)
3. Android SDK / Android Studio (configure ANDROID_HOME ou ANDROID_SDK_ROOT)
4. (Opcional no VS Code) extensoes: Java Extension Pack, Gradle for Java

## Fluxo no VS Code (como no Android Studio)

1. Abra a pasta `sistema-ong-frontend` no VS Code.
2. Instale dependencias (se necessario):
   ```bash
   npm install
   ```
3. Gere os assets web e sincronize com o Android:
   ```bash
   npm run build
   npx cap sync android
   ```
   Ou use o script:
   ```bash
   npm run android:sync
   ```
4. Gere o APK debug:
   ```bash
   npm run android:build
   ```
   Ou diretamente:
   ```bash
   cd android
   .\gradlew.bat assembleDebug
   ```
5. O APK sera gerado em:
   `android/app/build/outputs/apk/debug/app-debug.apk`

## Instalar no emulador/dispositivo

Se houver emulador/dispositivo conectado:
```bash
cd android
.\gradlew.bat installDebug
```
ou:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## API em Android

- Emulador: use `http://10.0.2.2:5235/api` (ja configurado automaticamente)
- Dispositivo fisico: defina `VITE_API_URL=http://SEU-IP:5235/api` antes do build
- Garanta que o backend (`EstoqueAPI`) esteja rodando e acessivel na rede

## HTTP (cleartext)

O AndroidManifest ja possui `android:usesCleartextTraffic="true"` para permitir chamadas HTTP ao backend local.

## Extensao VS Code "como Android Studio"

Arquivo `.vscode/tasks.json` contem tarefas para build/install para que o fluxo fique semelhante ao Android Studio.