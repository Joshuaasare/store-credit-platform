import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../shared/store/useAuthStore";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { OtpVerifyScreen } from "../screens/auth/OtpVerifyScreen";
import { NewUserScreen } from "../screens/auth/NewUserScreen";
import { TabNavigator } from "./TabNavigator";
import { useThemeTokens } from "../shared/theme/ThemeContext";
import { buildNavTheme } from "../shared/theme/navTheme";

export type AuthStackParamList = {
  Login: undefined;
  OtpVerify: { phone: string };
  NewUser: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <AuthStack.Screen name="NewUser" component={NewUserScreen} />
    </AuthStack.Navigator>
  );
}

function AppStackNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={TabNavigator} />
    </AppStack.Navigator>
  );
}

/**
 * Conditional root — renders <AuthStack/> or <AppStack/> based on the auth
 * store's status. When the session flips (login completes, refresh fails,
 * logout), the whole subtree unmounts/mounts so auth screens never linger
 * in the post-auth back stack.
 */
export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const theme = useThemeTokens();
  return (
    <NavigationContainer theme={buildNavTheme(theme)}>
      {status === "authenticated" ? (
        <AppStackNavigator />
      ) : (
        <AuthStackNavigator />
      )}
    </NavigationContainer>
  );
}
