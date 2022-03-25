import React from 'react';
import { StyleSheet, Image, View, TouchableOpacity, Text, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { ChangeFollowersEvent, EventType, OptionType, Profile, User } from '@types';
import { eventManager } from '@globals/injector';
import { ProfileCard } from '@screens/profile/profileCard.component';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/native';
import { api, cache, cloutFeedApi, checkIsFollowedBack } from '@services';
import { themeStyles } from '@styles/globalColors';
import { globals } from '@globals/globals';
import { constants } from '@globals/constants';
import { signing } from '@services/authorization/signing';
import Modal from 'react-native-modal';
import { settingsGlobals } from '@globals/settingsGlobals';
import { BlurView } from 'expo-blur';

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    profile: Profile;
    coinPrice: number;
}

interface State {
    isVisible: boolean;
    isLoading: boolean;
    isFollowed: boolean | undefined;
    isOptionWorking: boolean;
    followButtonColor: string;
    subscribedNotifications: OptionType[],
    isOptionLoading: boolean;
    pressedOption: string;
    isFollowingBack: boolean;
}

interface Option {
    title: string;
    onPress: () => void;
    subscription: OptionType;
    hasLoader: boolean;
}

export default class ProfileInfoModalComponent extends React.Component<Props, State> {

    private _isMounted = false;

    private _intensityLevel = 0;

    constructor(props: Props) {
        super(props);

        this.state = {
            isVisible: true,
            isLoading: true,
            isFollowed: undefined,
            isOptionWorking: false,
            followButtonColor: 'black',
            subscribedNotifications: [],
            isOptionLoading: true,
            pressedOption: '',
            isFollowingBack: false
        };

        const imageUri = api.getSingleProfileImage(this.props.profile?.PublicKeyBase58Check);

        this._intensityLevel = settingsGlobals.darkMode ? 120 : 100;

        this.goToChat = this.goToChat.bind(this);
        this.onFollowButtonClick = this.onFollowButtonClick.bind(this);
        this.getNotificationSubscriptions = this.getNotificationSubscriptions.bind(this);
        this.goToProfile = this.goToProfile.bind(this);
        this.close = this.close.bind(this);
        this.init(imageUri);
        if (!globals.readonly) {
            setTimeout(() => {
                this.getNotificationSubscriptions();
            }, 1000);
        }
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        this._isMounted = false;
    }

    private checkIsFollowed(user: User): void {
        const followedByUserPublicKeys = user.PublicKeysBase58CheckFollowedByUser;

        const followed = followedByUserPublicKeys?.indexOf(this.props.profile.PublicKeyBase58Check);
        if (this._isMounted) {
            this.setState({ isFollowed: followed !== -1 });
        }
    }

    private async init(imageUri: string): Promise<void> {
        try {
            const responses = await Promise.all(
                [
                    Image.prefetch(imageUri),
                    checkIsFollowedBack(this.props.profile.PublicKeyBase58Check),
                    cache.user.getData()
                ]
            );
            this.props.profile.ProfilePic = imageUri;
            if (this._isMounted) {
                this.setState({ isFollowingBack: responses[1] });
            }
            const response = responses[2];
            this.checkIsFollowed(response);
        } catch {
            this.props.profile.ProfilePic = 'https://i.imgur.com/vZ2mB1W.png';
        }
    }

    private async subscribeNotifications(notificationType: OptionType): Promise<void> {
        try {
            if (this._isMounted) {
                this.setState({ isOptionLoading: true });
            }

            const jwt = await signing.signJWT();
            await cloutFeedApi.subscribeNotifications(globals.user.publicKey, jwt, this.props.profile.PublicKeyBase58Check, notificationType);
            const subscribedNotifications = this.state.subscribedNotifications;
            subscribedNotifications.push(notificationType);

            if (this._isMounted) {
                this.setState(
                    {
                        subscribedNotifications,
                        isOptionLoading: false
                    }
                );
            }
        } catch (error) {
            globals.defaultHandleError(error);
        }
    }

    private async unSubscribeNotifications(notificationType: OptionType): Promise<void> {
        try {
            if (this._isMounted) {
                this.setState({ isOptionLoading: true });
            }

            const jwt = await signing.signJWT();
            await cloutFeedApi.unSubscribeNotifications(globals.user.publicKey, jwt, this.props.profile.PublicKeyBase58Check, notificationType);
            const subscribedNotifications = this.state.subscribedNotifications;
            const index = subscribedNotifications.findIndex((value) => value === notificationType);
            subscribedNotifications.splice(index, 1);

            if (this._isMounted) {
                this.setState({
                    subscribedNotifications,
                    isOptionLoading: false
                });
            }
        } catch (error) {
            globals.defaultHandleError(error);
        }
    }

    private onSubscribedNotificationChange(value: string): void {

        if (this._isMounted) {
            this.setState(
                {
                    isOptionWorking: true,
                    pressedOption: value
                }
            );
        }

        const shouldSubscribePostNotification = value === OptionType.Post && !this.state.subscribedNotifications.includes(OptionType.Post);
        const shouldUnSubscribePostNotification = value === OptionType.Post && this.state.subscribedNotifications.includes(OptionType.Post);
        const shouldSubscribeFRNotification = value === OptionType.FounderReward && !this.state.subscribedNotifications.includes(OptionType.FounderReward);
        const shouldUnSubscribeFRNotification = value === OptionType.FounderReward && this.state.subscribedNotifications.includes(OptionType.FounderReward);

        if (shouldSubscribePostNotification) {
            this.subscribeNotifications(OptionType.Post);
        } else if (shouldUnSubscribePostNotification) {
            this.unSubscribeNotifications(OptionType.Post);
        } else if (shouldSubscribeFRNotification) {
            this.subscribeNotifications(OptionType.FounderReward);
        } else if (shouldUnSubscribeFRNotification) {
            this.unSubscribeNotifications(OptionType.FounderReward);
        }
        if (this._isMounted) {
            this.setState({ isOptionWorking: false });
        }
    }

    private async getNotificationSubscriptions(): Promise<void> {

        try {
            const jwt = await signing.signJWT();
            const response = await cloutFeedApi.getNotificationSubscriptions(globals.user.publicKey, jwt, this.props.profile.PublicKeyBase58Check);
            const subscribedNotifications = [];
            if (response.post === true) {
                subscribedNotifications.push(OptionType.Post);
            }
            if (response.founderReward === true) {
                subscribedNotifications.push(OptionType.FounderReward);
            }

            if (this._isMounted) {
                this.setState(
                    {
                        subscribedNotifications,
                        isOptionLoading: false,
                        isLoading: false,
                    }
                );
            }
        } catch (error) {
            globals.defaultHandleError(error);
        }
    }

    private getProfileCopy(profile: Profile): Profile {
        const newProfile: Profile = {
            ProfilePic: profile.ProfilePic,
            Username: profile.Username,
            Description: profile.Description,
            PublicKeyBase58Check: profile.PublicKeyBase58Check,
            CoinPriceDeSoNanos: profile.CoinPriceDeSoNanos,
            CoinEntry: profile.CoinEntry,
            IsVerified: profile.IsVerified,
            Posts: []
        };

        return newProfile;
    }

    private close(): void {
        if (this._isMounted) {
            this.setState({ isVisible: false });
        }
        setTimeout(
            () => eventManager.dispatchEvent(EventType.ToggleProfileInfoModal,
                {
                    visible: false,
                    navigation: this.props.navigation,
                    profile: this.props.profile,
                    coinPrice: this.props.coinPrice
                }
            ), 300);
    }

    private goToChat(): void {
        if (this._isMounted) {
            const newProfile: Profile = this.getProfileCopy(this.props.profile);
            this.props.navigation.navigate(
                'MessageStack',
                {
                    screen: 'Chat',
                    params: {
                        contactWithMessages: {
                            Messages: [],
                            ProfileEntryResponse: newProfile,
                            NumMessagesRead: 0,
                            PublicKeyBase58Check: newProfile.PublicKeyBase58Check
                        },
                        loadMessages: true
                    }
                }
            );
        }
        this.close();
    }

    private async onFollowButtonClick(): Promise<void> {

        if (this.state.isFollowed === undefined) {
            return;
        }

        if (this._isMounted) {
            this.setState(
                {
                    isOptionLoading: true,
                    followButtonColor: themeStyles.buttonDisabledColor.backgroundColor,
                    isOptionWorking: true,
                    pressedOption: 'Follow',
                }
            );
        }

        const publicKey = this.props.profile?.PublicKeyBase58Check;
        try {
            const response = await api.createFollow(
                globals.user.publicKey,
                publicKey,
                this.state.isFollowed
            );
            const transactionHex = response.TransactionHex;

            if (publicKey === constants.cloutfeed_publicKey) {
                globals.followerFeatures = !this.state.isFollowed;
            }

            const signedTransactionHex = await signing.signTransaction(transactionHex);
            await api.submitTransaction(signedTransactionHex);

            if (this._isMounted) {
                const event: ChangeFollowersEvent = {
                    publicKey: publicKey
                };

                if (this.state.isFollowed) {
                    eventManager.dispatchEvent(EventType.DecreaseFollowers, event);
                } else {
                    eventManager.dispatchEvent(EventType.IncreaseFollowers, event);
                }
                this.setState({ isFollowed: !this.state.isFollowed });
            }

            if (this.state.isFollowed) {
                cache.removeFollower(publicKey);
            } else {
                cache.addFollower(publicKey);
            }
        }
        catch (error) {
            globals.defaultHandleError(error);
        } finally {
            this.setState(
                {
                    followButtonColor: 'black',
                    isOptionWorking: false,
                    isOptionLoading: false
                }
            );
        }
    }

    private goToProfile(): void {
        if (this.props.profile.Username !== 'anonymous') {
            eventManager.dispatchEvent(EventType.ToggleProfileInfoModal, { visible: false });
            this.props.navigation.push(
                'UserProfile',
                {
                    publicKey: this.props.profile.PublicKeyBase58Check,
                    username: this.props.profile.Username,
                    key: 'Profile_' + this.props.profile.PublicKeyBase58Check
                }
            );
        }
    }

    render(): JSX.Element {

        const followText = this.state.isFollowed ? 'Unfollow User' : this.state.isFollowingBack ? 'Follow Back' : 'Follow User';
        const notificationText = this.state.subscribedNotifications.includes(OptionType.Post) ? 'off' : 'on';
        const FRText = this.state.subscribedNotifications.includes(OptionType.FounderReward) ? 'off' : 'on';

        const options: Option[] = [
            {
                title: `${followText}`,
                onPress: this.onFollowButtonClick.bind(this),
                subscription: OptionType.Follow,
                hasLoader: true
            },
            {
                title: 'Send a Message',
                onPress: this.goToChat.bind(this),
                subscription: OptionType.None,
                hasLoader: false
            },
            {
                title: `Turn ${notificationText} Post Notifications`,
                onPress: this.onSubscribedNotificationChange.bind(this, 'Post'),
                subscription: OptionType.Post,
                hasLoader: true
            },
            {
                title: `Turn ${FRText} FR Notifications`,
                onPress: this.onSubscribedNotificationChange.bind(this, 'FounderReward'),
                subscription: OptionType.FounderReward,
                hasLoader: true
            }
        ];

        return <BlurView
            intensity={Platform.OS === 'ios' ? this._intensityLevel : 0}
            accessible={true}
            tint={'dark'}
            style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}
        >
            <Modal
                animationIn={'zoomIn'}
                animationOut={'zoomOut'}
                swipeDirection='down'
                animationInTiming={200}
                animationOutTiming={200}
                backdropOpacity={Platform.OS === 'ios' ? 0 : 0.7}
                onSwipeComplete={this.close}
                onBackdropPress={this.close}
                onBackButtonPress={this.close}
                isVisible={this.state.isVisible}
                style={{ marginVertical: 0, marginHorizontal: 15, }}
            >
                <TouchableOpacity
                    onPress={this.goToProfile}
                    activeOpacity={1}>
                    <ProfileCard
                        navigation={this.props.navigation}
                        profile={this.props.profile}
                        coinPrice={this.props.coinPrice}
                    />
                </TouchableOpacity>
                {
                    this.props.profile?.PublicKeyBase58Check !== globals.user.publicKey && !globals.readonly &&
                    <View style={[styles.buttonsContainer, themeStyles.peekOptionsContainer]}>
                        {
                            options.map(
                                (option: Option, index: number) => <TouchableOpacity
                                    key={index}
                                    activeOpacity={1}
                                    onPress={this.state.isOptionWorking ?
                                        undefined
                                        : option.onPress}
                                    style={
                                        [
                                            themeStyles.peekOptionsBorder,
                                            styles.optionContainer,
                                            index !== options.length - 1 && { borderBottomWidth: 1 }
                                        ]
                                    }
                                >
                                    <Text style={[styles.optionText, themeStyles.fontColorMain]}>
                                        {option.title}
                                    </Text>
                                    {
                                        this.state.isLoading && option.hasLoader ||
                                            option.hasLoader && this.state.isOptionLoading &&
                                            option.subscription === this.state.pressedOption ?
                                            <ActivityIndicator size='small' color={themeStyles.fontColorMain.color} /> :
                                            this.state.subscribedNotifications.includes(option.subscription) &&
                                            <View style={styles.subscribedCircle} />
                                    }
                                </TouchableOpacity>
                            )
                        }
                    </View>
                }
            </Modal >
        </BlurView>;
    }
}

const styles = StyleSheet.create(
    {
        buttonsContainer: {
            marginTop: 20,
            borderRadius: 10,
            width: Dimensions.get('screen').width * 0.65,
        },
        optionContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 10,
            height: 40,
        },
        optionText: {
            fontSize: 16
        },
        subscribedCircle: {
            width: 8,
            height: 8,
            borderRadius: 10,
            backgroundColor: '#007ef5',
            marginRight: 10,
        }
    }
);
