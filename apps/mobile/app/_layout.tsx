import { NAV_THEME } from "@/lib/theme";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TransactionsProvider } from "../context/TransactionsContext";
import { useFonts } from "expo-font";
import "../lib/nativewind-icons";
import "../global.css";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    'HankenGrotesk-Regular': 'https://fonts.gstatic.com/s/hankengrotesk/v4/ieVj2YZXw726V74m46c24177a6gky8L7qQ.ttf',
    'HankenGrotesk-Medium': 'https://fonts.gstatic.com/s/hankengrotesk/v4/ieVi2YZXw726V74m46c24177a6gky5r3pg.ttf',
    'HankenGrotesk-Bold': 'https://fonts.gstatic.com/s/hankengrotesk/v4/ieVi2YZXw726V74m46c24177a6gky8L3pg.ttf',
    'Manrope-Regular': 'https://fonts.gstatic.com/s/manrope/v15/xn7gTGY33_wV3t42475yILWv.ttf',
    'Manrope-Medium': 'https://fonts.gstatic.com/s/manrope/v15/xn7gTGY33_wV3t42475yILWv.ttf',
    'Manrope-Bold': 'https://fonts.gstatic.com/s/manrope/v15/xn7gTGY33_wV3t42475yILWv.ttf',
  });

  return (
    <ThemeProvider value={NAV_THEME[colorScheme === 'dark' ? 'dark' : 'light']}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <SafeAreaProvider>
        <TransactionsProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </TransactionsProvider>
      </SafeAreaProvider>
      <PortalHost />
    </ThemeProvider>
  );
}
