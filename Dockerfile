FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive ANDROID_HOME=/opt/android-sdk HYPER_SDK=/opt/android-sdk
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk-headless nodejs npm python3 curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/android-sdk/cmdline-tools && curl -fL --retry 3 https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/tools.zip && unzip -q /tmp/tools.zip -d /opt/android-sdk/cmdline-tools && mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest && rm /tmp/tools.zip
RUN yes | /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=/opt/android-sdk --licenses >/dev/null || true
RUN /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=/opt/android-sdk 'platforms;android-35' 'build-tools;35.0.0'
WORKDIR /work
COPY security/package.json security/package-lock.json security/
RUN cd security && npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN python3 security/verify-android-sdk.py "$HYPER_SDK"
CMD ["bash", "security/build-in-container.sh"]
