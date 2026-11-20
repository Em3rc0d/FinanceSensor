plugins {
    id("com.android.application")
}

android {
    namespace = "com.financesensor.lab.res001bdiagnostics"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.financesensor.lab.res001b.synthetic"
        minSdk = 31
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

}

dependencies {
    implementation("net.zetetic:sqlcipher-android:4.18.0")
    implementation("androidx.sqlite:sqlite:2.5.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
}

configurations.configureEach {
    resolutionStrategy.eachDependency {
        if (requested.group == "net.zetetic" && requested.name == "sqlcipher-android" && requested.version != "4.18.0") {
            throw GradleException("RES001B_SQLCIPHER_VERSION_DRIFT:${requested.version}")
        }
    }
}
