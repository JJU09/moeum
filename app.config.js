export default {
  "expo": {
    "name": "moeum",
    "slug": "moeum",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "moeum",
    "userInterfaceStyle": "automatic",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.moeum.app",
      "googleServicesFile": "./GoogleService-Info.plist",
      "icon": "./assets/icon.png"
    },
    "android": {
      "package": "com.moeum.app",
      "googleServicesFile": process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      "adaptiveIcon": {
        "backgroundColor": "#6D28D9",
        "foregroundImage": "./assets/icon.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
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
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
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