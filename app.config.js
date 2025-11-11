
export default {
  expo: {
    name: "fittrack-mobile",
    slug: "fittrack-mobile",
    scheme: "fittrack",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#121212"
    },
    plugins: [
      "expo-calendar",
      ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#1DB954" }]
    ],
    ios: {
      bundleIdentifier: "com.seifsaleh.fittrack",
      supportsTablet: true,
      infoPlist: {
        NSCalendarsUsageDescription: "FitTrack needs access to your calendar to add sessions and reminders.",
        NSUserNotificationUsageDescription: "FitTrack sends reminders for your upcoming sessions."
      }
    },
    android: {
      package: "com.seifsaleh.fittrack",
      edgeToEdgeEnabled: true,
      adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#121212" },
      permissions: ["READ_CALENDAR","WRITE_CALENDAR","POST_NOTIFICATIONS","VIBRATE","android.permission.READ_CALENDAR","android.permission.WRITE_CALENDAR"]
    },
    androidStatusBar: { barStyle: "light-content", backgroundColor: "#121212", translucent: true },
    web: { favicon: "./assets/favicon.png" },
    extra: {
      eas: { projectId: "f9fdce0e-d870-437c-9f4c-9d53457f50b7" },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
  }
};
