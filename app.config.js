export default {
  "expo": {
    "name": "moeum",
    "slug": "moeum",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "moeum",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#6D28D9"
    },
    "userInterfaceStyle": "automatic",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.moeum.app",
      "googleServicesFile": "./GoogleService-Info.plist",
      "icon": "./assets/icon.png"
    },
    "android": {
      "package": "com.moeum.app",
      "softwareKeyboardLayoutMode": "pan",
      "googleServicesFile": process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      "adaptiveIcon": {
        "backgroundColor": "#6D28D9",
        "foregroundImage": "./assets/icon.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false,
      "splash": {
        "backgroundColor": "#6D28D9",
        "image": "./assets/splash.png",
        "resizeMode": "contain"
      }
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      "@react-native-google-signin/google-signin",
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 24,
            "compileSdkVersion": 36,
            "targetSdkVersion": 36
          }
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "be0b3f43-f85d-4873-a193-128b9858d5f4"
      }
    }
  }
};