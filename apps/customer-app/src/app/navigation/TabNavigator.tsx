import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "../screens/home/HomeScreen";
import { CreditsScreen } from "../screens/credits/CreditsScreen";
import { ExploreScreen } from "../screens/explore/ExploreScreen";
import { FavoritesScreen } from "../screens/favorites/FavoritesScreen";
import { GlassTabBar } from "./GlassTabBar";

export type TabStackParamList = {
  Home: undefined;
  Credits: undefined;
  Explore: undefined;
  Favorites: undefined;
};

const Tab = createBottomTabNavigator<TabStackParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <GlassTabBar {...props} />}
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Credits" component={CreditsScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
    </Tab.Navigator>
  );
}