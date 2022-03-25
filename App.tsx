import { NavigationContainer, NavigationProp, ParamListBase, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { EventType, ToggleProfileManagerEvent, User, ToggleActionSheetEvent, ToggleBidFormEvent, BidEdition, ToggleProfileInfoModalEvent, Profile } from './src/types';
import { settingsGlobals } from './src/globals/settingsGlobals';
import { themeStyles, updateThemeStyles } from './styles/globalColors';
import { globals } from './src/globals/globals';
import { constants } from './src/globals/constants';
import { SnackbarComponent } from './src/components/snackbarComponent';
import { cache, initCache } from './src/services/dataCaching/cache';
import { notificationsService } from './src/services/notificationsService';
import { LoginNavigator } from './src/navigation/loginNavigator';
import { ActionSheet } from './src/components/actionSheet.component';
import { DiamondAnimationComponent } from '@components/diamondAnimation.component';
import { api, cloutFeedApi } from '@services';
import { enableScreens } from 'react-native-screens';
import { signing } from '@services/authorization/signing';
import { authentication } from '@services/authorization/authentication';
import { ProfileManagerComponent } from '@components/profileManager.component';
import { eventManager, hapticsManager } from '@globals/injector';
import { TabNavigator } from './src/navigation/tabNavigator';
import MessageStackScreen from './src/navigation/messageStackNavigator';
import { ActionSheetConfig } from '@services/actionSheet';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { stackConfig } from './src/navigation/stackNavigationConfig';
import CloutFeedIntroduction from '@screens/introduction/cloutFeedIntroduction.screen';
import TermsConditionsScreen from '@screens/login/termsAndConditions.screen';
import ProfileInfoModalComponent from '@components/profileInfo/profileInfoModal.component';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Alert, Appearance, Platform, StatusBar, View } from 'react-native';
import { AppState } from 'react-native';
import { messagesService } from './src/services/messagesServices';
import PlaceBidFormComponent from '@screens/nft/components/placeBidForm.component';
import { UserContext } from '@globals/userContext';
import { Post, HiddenNFTType } from '@types';
import { CloutFeedTheme } from '@types';
import { authenticateWithDeSoIdentity, isDerivedKeyValid, revokeDerivedKey } from './src/services/authorization/deSoAuthentication';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Device from 'expo-device';

enableScreens();

const Stack = createStackNavigator();

export default function App(): JSX.Element {

  const [isLoading, setLoading] = useState(true);
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [areTermsAccepted, setTermsAccepted] = useState(false);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showBiddingModal, setShowPlaceBiddingModal] = useState(false);
  const [profilePic, setProfilePic] = useState<string>('https://i.imgur.com/vZ2mB1W.png');
  const [actionSheetConfig, setActionSheetConfig] = useState<ActionSheetConfig>();
  const [navigation, setNavigation] = useState<NavigationProp<ParamListBase>>();
  const [bidEdition, setBidEdition] = useState<BidEdition>();
  const [bidPost, setBidPost] = useState<Post | any>();
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profile, setProfile] = useState<Profile>();
  const [coinPrice, setCoinPrice] = useState<number>();
  const [isThemeSet, setIsThemeSet] = useState<boolean>(false);
  const notificationsInterval = useRef(0);
  const messagesInterval = useRef(0);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef<boolean>(true);
  const intervalTiming = 60000;

  function handleAppStateChange(nextAppState: any) {
    if (globals.readonly) {
      return;
    }
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      notificationsInterval.current = window.setInterval(notificationListener, intervalTiming);
      messagesInterval.current = window.setInterval(globals.dispatchRefreshMessagesEvent, intervalTiming);
    } else {
      window.clearInterval(notificationsInterval.current);
      window.clearInterval(messagesInterval.current);
    }
    appState.current = nextAppState;
  }

  useEffect(
    () => {
      handleScreenOrientation();
      AppState.addEventListener('change', handleAppStateChange);

      const unsubscribeProfileManager = eventManager.addEventListener(
        EventType.ToggleProfileManager,
        (event: ToggleProfileManagerEvent) => {
          if (isMounted) {
            setShowProfileManager(event.visible);
            setNavigation(event.navigation);
          }
        }
      );
      const unsubscribeActionSheet = eventManager.addEventListener(
        EventType.ToggleActionSheet,
        (event: ToggleActionSheetEvent) => {
          if (isMounted) {
            setActionSheetConfig(event.config);
            setShowActionSheet(event.visible);
          }
        }
      );
      const unsubscribeBiddingForm = eventManager.addEventListener(
        EventType.ToggleBidForm,
        (event: ToggleBidFormEvent) => {
          if (isMounted) {
            setShowPlaceBiddingModal(event.visible);
            setBidEdition(event.bidEdition);
            setBidPost(event.post);
          }
        }
      );
      const unsubscribeProfileInfo = eventManager.addEventListener(
        EventType.ToggleProfileInfoModal,
        (event: ToggleProfileInfoModalEvent) => {
          if (isMounted) {
            setProfile(event.profile);
            setCoinPrice(event.coinPrice);
            setNavigation(event.navigation);
            setShowProfileInfo(event.visible);
          }
        }
      );

      checkAuthenticatedUser().catch(() => undefined);

      return () => {
        unsubscribeProfileManager();
        unsubscribeActionSheet();
        unsubscribeBiddingForm();
        unsubscribeProfileInfo();
        window.clearInterval(notificationsInterval.current);
        window.clearInterval(messagesInterval.current);
        isMounted.current = false;
      };
    },
    []
  );

  async function handleScreenOrientation() {
    const response = await Device.getDeviceTypeAsync();
    if (
      response === Device.DeviceType.TABLET ||
      response === Device.DeviceType.TV ||
      response === Device.DeviceType.DESKTOP
    ) {
      await ScreenOrientation.unlockAsync();
      globals.isDeviceTablet = true;
    }
  }

  function notificationListener() {
    api.getNotifications(globals.user.publicKey, -1, 1).then(
      (response: any) => {
        if (response.Notifications?.length > 0) {
          const newSeenNotificationIndex: number = response.Notifications[0].Index;
          SecureStore.getItemAsync('lastNotificationIndex').then(
            (prevStoredIndex: string | null) => {
              if (newSeenNotificationIndex > parseInt(prevStoredIndex as string)) {
                eventManager.dispatchEvent(
                  EventType.RefreshNotifications,
                  newSeenNotificationIndex
                );
              } else {
                eventManager.dispatchEvent(EventType.RefreshNotifications, -1);
              }
            }
          ).catch(() => undefined);
        }
      }
    ).catch(() => undefined);
  }

  async function checkAuthenticatedUser() {
    try {
      const publicKey = await SecureStore.getItemAsync(constants.localStorage_publicKey);
      if (publicKey) {
        const cloutFeedIdentity = await SecureStore.getItemAsync(constants.localStorage_cloutFeedIdentity);

        if (cloutFeedIdentity) {
          globals.user.publicKey = publicKey;
          await setTheme(true);
          setIsThemeSet(true);
          const readonlyValue = await SecureStore.getItemAsync(constants.localStorage_readonly);
          globals.readonly = readonlyValue !== 'false';
          globals.derived = await authentication.isAuthenticatedUserDerived(publicKey);

          if (globals.derived) {
            const isValid = await isDerivedKeyValid(publicKey);

            if (isValid) {
              globals.onLoginSuccess();
            } else {
              const title = 'Login Expired';
              const body = 'Your DeSo credentials have been expired. Please use DeSo Identity to login again into the account: ' + publicKey;
              Alert.alert(
                title,
                body,
                [
                  {
                    text: 'Ok',
                    onPress: () => authenticateWithDeSoIdentity(publicKey)
                  }
                ]
              );
            }
          } else {
            globals.onLoginSuccess();
          }
        } else {
          await SecureStore.deleteItemAsync(constants.localStorage_publicKey);
          await SecureStore.deleteItemAsync(constants.localStorage_readonly);

          if (isMounted) {
            setTermsAccepted(true);
            setLoading(false);
          }
        }
      } else {
        const termsAccepted = await SecureStore.getItemAsync(constants.localStorage_termsAccepted);

        if (isMounted) {
          setTermsAccepted(termsAccepted === 'true');
          setLoading(false);
        }
      }
    } catch {
      Alert.alert('Something went wrong. Please try again');
      return;
    }
  }

  globals.dispatchRefreshMessagesEvent = () => {
    messagesService.getUnreadMessages()
      .then(
        (response: number) => {
          eventManager.dispatchEvent(EventType.RefreshMessages, response);
        }
      ).catch(() => undefined);
  };

  globals.acceptTermsAndConditions = () => {
    if (isMounted) {
      setTermsAccepted(true);
    }
  };

  globals.onLoginSuccess = () => {
    cache.user.reset();
    if (isMounted) {
      setLoading(true);
    }
    initCache();
    const savedPostsCallback = globals.readonly ? ()=>undefined : cache.savedPosts.reloadData;
    Promise.all(
      [
        cache.user.getData(),
        savedPostsCallback(),
      ]
    ).then(
      async p_responses => {

        setInvestorFeatures(p_responses[0]);
        setFollowerFeatures(p_responses[0]);

        globals.user.username = p_responses[0].ProfileEntryResponse?.Username;
        const key = globals.user.publicKey + constants.localStorage_nftsHidden;
        const areNFTsHidden = await SecureStore.getItemAsync(key).catch(() => undefined);

        const typeKey = globals.user.publicKey + constants.localStorage_hiddenNFTType;
        const type = await SecureStore.getItemAsync(typeKey).catch(() => undefined) as HiddenNFTType;

        const coinPriceKey = globals.user.publicKey + constants.localStorage_coinPriceHidden;
        const isCoinPriceHidden = await SecureStore.getItemAsync(coinPriceKey).catch(() => undefined);

        const signatureKey = globals.user.publicKey + constants.localStorage_signatureEnabled;
        const isSignatureEnabled = await SecureStore.getItemAsync(signatureKey).catch(() => undefined);

        globals.isSignatureEnabled = isSignatureEnabled == null || isSignatureEnabled === 'true';
        globals.areNFTsHidden = areNFTsHidden === 'true';
        globals.hiddenNFTType = type;
        globals.isCoinPriceHidden = isCoinPriceHidden === 'true';

        if (globals.readonly === false) {
          if (isMounted) {
            setProfilePic(p_responses[0].ProfileEntryResponse?.ProfilePic + '?' + new Date().toISOString());
          }
          notificationsService.registerPushToken().catch(() => undefined);
          notificationListener();
          globals.dispatchRefreshMessagesEvent();
          window.clearInterval(notificationsInterval.current);
          window.clearInterval(messagesInterval.current);
          notificationsInterval.current = window.setInterval(notificationListener, intervalTiming);
          messagesInterval.current = window.setInterval(globals.dispatchRefreshMessagesEvent, intervalTiming);
        }
        await setTheme();
        await hapticsManager.init();
      }
    ).catch(() => undefined).finally(
      () => {
        if (isMounted) {
          setLoggedIn(true);
          setTermsAccepted(true);
          setLoading(false);
        }
      }
    );
  };

  globals.onLogout = async () => {
    if (isMounted) {
      setLoading(true);
    }

    await SecureStore.deleteItemAsync(constants.localStorage_publicKey);
    await SecureStore.deleteItemAsync(constants.localStorage_readonly);

    if (globals.readonly === false) {
      const jwt = await signing.signJWT();
      cloutFeedApi.unregisterNotificationsPushToken(globals.user.publicKey, jwt).catch(() => undefined);
      await revokeDerivedKey(globals.user.publicKey).catch(() => undefined);
      await authentication.removeAuthenticatedUser(globals.user.publicKey);
      window.clearInterval(notificationsInterval.current);
      window.clearInterval(messagesInterval.current);
      const loggedInPublicKeys = await authentication.getAuthenticatedUserPublicKeys();

      if (loggedInPublicKeys?.length > 0) {
        const publicKey = loggedInPublicKeys[0];
        await SecureStore.setItemAsync(constants.localStorage_publicKey, publicKey);
        await SecureStore.setItemAsync(constants.localStorage_readonly, 'false');
        globals.user = { publicKey, username: '' };
        globals.readonly = false;
        globals.derived = await authentication.isAuthenticatedUserDerived(publicKey);
        globals.onLoginSuccess();
        return;
      }
    }

    globals.user.publicKey = '';
    globals.investorFeatures = false;
    globals.followerFeatures = false;
    globals.readonly = true;

    if (isMounted) {
      setLoggedIn(false);
      setTermsAccepted(true);
      setLoading(false);
    }
    cache.user.reset();
  };

  function setInvestorFeatures(p_user: User) {
    globals.investorFeatures = true;

    const usersYouHODL = p_user.UsersYouHODL;

    const cloutFeedCoin = usersYouHODL?.find(p_user => p_user.CreatorPublicKeyBase58Check === constants.cloutfeed_publicKey);

    if ((cloutFeedCoin && cloutFeedCoin.BalanceNanos > 30000000) || p_user.PublicKeyBase58Check === constants.cloutfeed_publicKey) {
      globals.investorFeatures = true;
    }
  }

  function setFollowerFeatures(p_user: User) {
    globals.followerFeatures = globals.user.publicKey === constants.cloutfeed_publicKey;

    const followedByUserPublicKeys = p_user.PublicKeysBase58CheckFollowedByUser;

    if (followedByUserPublicKeys?.length > 0 && followedByUserPublicKeys.indexOf(constants.cloutfeed_publicKey) !== -1) {
      globals.followerFeatures = true;
    }
  }

  async function setTheme(p_force = false) {
    settingsGlobals.darkMode = false;
    const key = globals.user.publicKey + constants.localStorage_appearance;
    if (globals.followerFeatures || p_force) {
      const theme = await SecureStore.getItemAsync(key);
      if (theme === CloutFeedTheme.Automatic) {
        const systemTheme = Appearance.getColorScheme() as string;
        settingsGlobals.darkMode = systemTheme === 'dark';
      } else {
        settingsGlobals.darkMode = theme === 'dark';
      }
    } else {
      await SecureStore.setItemAsync(key, 'light');
    }

    updateThemeStyles();
  }

  const handleTheme = () => {
    if (!globals.user.publicKey || settingsGlobals.darkMode) {
      return DarkTheme;
    }
    return DefaultTheme;
  };

  return <UserContext.Provider value={{ profilePic, setProfilePic }}>
    <View style={[{ flex: 1 }, themeStyles.containerColorMain]}>
      {
        settingsGlobals.darkMode ?
          Platform.OS == 'ios' ? <ExpoStatusBar style='light' /> :
            <StatusBar barStyle={'light-content'} /> :
          <ExpoStatusBar style='dark' />
      }

      {
        isLoading ?
          isThemeSet ? <CloutFeedLoader /> : <></>
          :
          <NavigationContainer theme={handleTheme()}>
            <Stack.Navigator
              screenOptions={stackConfig}>
              {
                !isLoggedIn ?
                  areTermsAccepted ?
                    <Stack.Screen
                      options={{
                        headerShown: false,
                      }}
                      name="LoginNavigator" component={LoginNavigator} />
                    :
                    <>
                      <Stack.Screen options={{
                        headerStyle: { backgroundColor: 'white', elevation: 0, shadowRadius: 0, shadowOffset: { height: 0, width: 0 } },
                        headerTitleStyle: { alignSelf: 'center', fontSize: 20, color: 'black' }
                      }} name="Introduction" component={CloutFeedIntroduction} />
                      <Stack.Screen options={{ headerShown: false }} name="TermsConditions" component={TermsConditionsScreen} />
                    </>
                  :
                  <React.Fragment>
                    <Stack.Screen
                      name="TabNavigator"
                      component={TabNavigator}
                      options={{
                        headerShown: false,
                      }}
                    />

                    <Stack.Screen
                      name="MessageStack"
                      component={MessageStackScreen}
                      options={{
                        headerShown: false,
                      }}
                    />
                  </React.Fragment>
              }
            </Stack.Navigator >
            <DiamondAnimationComponent />
            {showActionSheet && actionSheetConfig && <ActionSheet config={actionSheetConfig} />}
            <SnackbarComponent />
            {
              showProfileManager ?
                <ProfileManagerComponent navigation={navigation as StackNavigationProp<ParamListBase>}></ProfileManagerComponent> : undefined
            }
            {
              showProfileInfo && <ProfileInfoModalComponent
                navigation={navigation as any}
                profile={profile as Profile}
                coinPrice={coinPrice as number}
              />
            }
            {showBiddingModal && <PlaceBidFormComponent bidEdition={bidEdition as BidEdition} post={bidPost} />}
          </NavigationContainer>
      }
    </View>
  </UserContext.Provider>;
}
