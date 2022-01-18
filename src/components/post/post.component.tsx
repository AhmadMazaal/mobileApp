import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import { EventType, HiddenNFTType, Post, ToggleHideCoinPriceEvent, ToggleHideNFTsEvent } from '@types';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { ParamListBase, RouteProp } from '@react-navigation/native';
import { ImageGalleryComponent } from '../imageGallery.component';
import { TextWithLinks } from '../textWithLinks.component';
import { eventManager, globals, hapticsManager } from '@globals';
import { calculateAndFormatDeSoInUsd, calculateDurationUntilNow } from '@services';
import { themeStyles } from '@styles';
import { PostOptionsComponent } from './postOptions.components';
import { PostActionsRow } from './postActionsRow.component';
import CloutFeedVideoComponent from '@components/post/cloutFeedVideo.component';
import { StackNavigationProp } from '@react-navigation/stack';
import ProfileInfoImageComponent from '@components/profileInfo/profileInfoImage.component';
import ProfileInfoUsernameComponent from '@components/profileInfo/profileInfoUsername.component';

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    route: RouteProp<ParamListBase, string>;
    post: Post,
    disablePostNavigate?: boolean,
    disableProfileNavigation?: boolean,
    actionsDisabled?: boolean,
    hideBottomBorder?: boolean,
    recloutedPostIndex?: number,
    isParentPost?: boolean;
    isPinned?: boolean;
    isPostScreen?: boolean;
    isDraftPost?: boolean;
    showThread?: boolean;
}

interface State {
    coinPrice: string;
    durationUntilNow: string;
    actionsDisabled: boolean;
    isHeartShowed: boolean;
    hiddenNFTType: HiddenNFTType;
    areNFTsHidden: boolean;
    isCoinPriceHidden: boolean;
}

export class PostComponent extends React.Component<Props, State> {

    private _animation = new Animated.Value(0);

    private _inputRange = [0, 1.3];

    private _outputRange = [0, 1.3];

    private _unsubscribeHideNFTsEvent: () => void = () => undefined;

    private _unsubscribeHideCoinPriceEvent: () => void = () => undefined;

    private _scale = this._animation.interpolate({
        inputRange: this._inputRange,
        outputRange: this._outputRange
    });

    constructor(p_props: Props) {
        super(p_props);

        const coinPrice = calculateAndFormatDeSoInUsd(this.props.post.ProfileEntryResponse?.CoinPriceDeSoNanos);

        const durationUntilNow = calculateDurationUntilNow(this.props.post?.TimestampNanos);

        this.state = {
            coinPrice,
            durationUntilNow,
            actionsDisabled: this.props.actionsDisabled || globals.readonly,
            isHeartShowed: false,
            hiddenNFTType: HiddenNFTType.None,
            areNFTsHidden: false,
            isCoinPriceHidden: globals.isCoinPriceHidden
        };

        if (this.props.post.ImageURLs?.length > 0 && !this.props.isDraftPost) {
            const imageUrls: string[] = [];

            for (const imageUrl of this.props.post.ImageURLs) {
                if (imageUrl.startsWith('https://images.bitclout.com/') ||
                    imageUrl.startsWith('https://arweave.net/') ||
                    imageUrl.startsWith('https://images.deso.org/') ||
                    /^https:\/\/[\w-]+\.arweave\.net\//.test(imageUrl) ||
                    imageUrl.startsWith('https://cloudflare-ipfs.com/ipfs/')) {
                    imageUrls.push(imageUrl);
                } else if (imageUrl.startsWith('https://i.imgur.com')) {
                    const mappedImage = imageUrl.replace('https://i.imgur.com', 'https://images.bitclout.com/i.imgur.com');
                    imageUrls.push(mappedImage);
                }
            }
            this.props.post.ImageURLs = imageUrls;
        }

        if (this.props.post.VideoURLs?.length > 0 && !this.props.isDraftPost) {
            const videoUrls: string[] = [];

            for (const videoUrl of this.props.post.VideoURLs) {
                const regExp = /^https:\/\/iframe\.videodelivery\.net\/[A-Za-z0-9]+$/;
                const match = videoUrl.match(regExp);
                if (match && match[0]) {
                    videoUrls.push(videoUrl);
                }
            }
            this.props.post.VideoURLs = videoUrls;
        }

        this.goToStats = this.goToStats.bind(this);
        this.goToPost = this.goToPost.bind(this);
        this.goToRecloutedPost = this.goToRecloutedPost.bind(this);
        this.goToNFT = this.goToNFT.bind(this);
        this.getEmbeddedVideoLink = this.getEmbeddedVideoLink.bind(this);
        this.toggleHeartIcon = this.toggleHeartIcon.bind(this);

        this.subscribeToggleHideNFTOptions();
        this.subscribeToggleHideCoinPrice();
    }

    componentWillUnmount(): void {
        this._unsubscribeHideNFTsEvent();
        this._unsubscribeHideCoinPriceEvent();
    }

    private goToStats(): void {
        if (this.props.isDraftPost) {
            return;
        }
        this.props.navigation.push(
            'PostStatsTabNavigator',
            {
                postHashHex: this.props.post.PostHashHex
            }
        );

        hapticsManager.customizedImpact();
    }

    private goToPost(): void {
        if (this.props.isDraftPost) {
            return;
        }
        if (this.props.disablePostNavigate !== true) {
            this.props.navigation.push(
                'Post',
                {
                    postHashHex: this.props.post.PostHashHex,
                    key: 'Post_' + this.props.post.PostHashHex,
                    showThread: this.props.showThread
                }
            );
        }
    }

    private goToRecloutedPost(): void {
        if (this.props.disablePostNavigate !== true) {
            this.props.navigation.push(
                'Post',
                {
                    postHashHex: this.props.post.RepostedPostEntryResponse.PostHashHex,
                    key: 'Post_' + this.props.post.RepostedPostEntryResponse.PostHashHex,
                    showThread: this.props.showThread
                }
            );
        }
    }

    public getEmbeddedVideoLink(p_videoLink: string): string {
        const youtubeRegExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const youtubeMatch = p_videoLink.match(youtubeRegExp);
        if (youtubeMatch && youtubeMatch[7].length == 11) {
            const videoId = youtubeMatch[7];
            const videoLink = 'https://www.youtube.com/embed/' + videoId;
            return videoLink;
        }

        return p_videoLink;
    }

    private scaleIn(): void {
        this.setState({ isHeartShowed: true });
        Animated.spring(this._animation, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    }

    private scaleOut(): void {
        Animated.spring(this._animation, {
            toValue: 0,
            useNativeDriver: true,
        }).start(() => this.setState({ isHeartShowed: false }));
    }

    private toggleHeartIcon(): void {
        this.scaleIn();
        setTimeout(
            () => {
                this.scaleOut();
            },
            750
        );
    }

    private goToNFT() {
        this.props.navigation.push('NFTTabNavigator',
            {
                post: this.props.post,
                username: this.props.post.ProfileEntryResponse?.Username
            }
        );
    }

    private subscribeToggleHideNFTOptions(): void {
        this._unsubscribeHideNFTsEvent = eventManager.addEventListener(
            EventType.ToggleHideNFTs,
            (event: ToggleHideNFTsEvent) => {
                this.setState(
                    {
                        hiddenNFTType: event.type,
                        areNFTsHidden: event.hidden
                    }
                );
            }
        );
    }

    private subscribeToggleHideCoinPrice(): void {
        this._unsubscribeHideCoinPriceEvent = eventManager.addEventListener(
            EventType.ToggleHideCoinPrice,
            (event: ToggleHideCoinPriceEvent) => {
                this.setState(
                    {
                        isCoinPriceHidden: event.hidden
                    }
                );
            }
        );
    }

    render(): JSX.Element {

        const bodyText = this.props.post.Body?.trimEnd();

        if (
            (
                this.props.post?.IsNFT ||
                this.props.post.RepostedPostEntryResponse?.IsNFT ||
                this.props.post.RepostedPostEntryResponse?.RepostedPostEntryResponse?.IsNFT ||
                this.props.post.RepostedPostEntryResponse?.RepostedPostEntryResponse?.RepostedPostEntryResponse?.IsNFT
            ) &&
            globals.areNFTsHidden &&
            globals.hiddenNFTType === HiddenNFTType.Posts &&
            !this.props.isPostScreen
        ) {
            return <View style={{ height: 0.1, width: 0.1 }} />;
        }

        const nftBurned = this.props.post?.IsNFT && this.props.post.NumNFTCopiesBurned === this.props.post.NumNFTCopies;

        if (nftBurned) {
            return <View style={{ height: 0.1, width: 0.1 }} />;
        }

        return (
            <View style=
                {
                    this.props.isParentPost ? [
                        styles.parentPostContainer,
                        styles.containerVerticalPaddings,
                        themeStyles.containerColorMain,
                        themeStyles.borderColor] : [
                        themeStyles.containerColorMain,
                        themeStyles.borderColor
                    ]
                }>
                {
                    this.props.isParentPost &&
                    <View style={styles.parentPostSubContainer}>
                        <ProfileInfoImageComponent
                            imageSize={35}
                            profile={this.props.post.ProfileEntryResponse}
                            navigation={this.props.navigation}
                        />
                        <View style={[styles.parentConnector, themeStyles.recloutBorderColor]} />
                    </View>
                }
                <View style={this.props.isParentPost ? styles.isParentPostContainer : {}}>
                    <View
                        style={[
                            styles.contentContainer,
                            !this.props.isParentPost ? styles.containerVerticalPaddings : {},
                            { borderBottomWidth: this.props.hideBottomBorder ? 0 : 1 },
                            themeStyles.borderColor
                        ]}>
                        <TouchableOpacity onPress={() => this.goToPost()} onLongPress={() => this.goToStats()} activeOpacity={1}>
                            <View style={styles.headerContainer} >
                                {
                                    !this.props.isParentPost && (
                                        <ProfileInfoImageComponent
                                            imageSize={35}
                                            profile={this.props.post.ProfileEntryResponse}
                                            navigation={this.props.navigation}
                                        />
                                    )
                                }
                                <View>
                                    <ProfileInfoUsernameComponent
                                        profile={this.props.post.ProfileEntryResponse}
                                        navigation={this.props.navigation}
                                    />

                                    <TouchableOpacity style={styles.actionButton} activeOpacity={1}>
                                        <Ionicons name="ios-time-outline" size={14} color="#a1a1a1" />
                                        <Text style={styles.actionText}>{this.state.durationUntilNow}</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.headerRightContainer}>
                                    {
                                        this.props.isPinned &&
                                        <Entypo style={styles.pinIcon} name="pin" size={16} color={themeStyles.fontColorMain.color} />
                                    }

                                    {
                                        !this.state.isCoinPriceHidden &&
                                        <View style={[styles.coinPriceContainer, themeStyles.chipColor]}>
                                            <Text style={[styles.coinPriceText, themeStyles.fontColorMain]}>
                                                ${this.state.coinPrice}
                                            </Text>
                                        </View>
                                    }

                                    {
                                        !this.state.actionsDisabled &&
                                        <PostOptionsComponent navigation={this.props.navigation} route={this.props.route} post={this.props.post} />
                                    }
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => this.goToPost()} onLongPress={() => this.goToStats()} activeOpacity={1}>
                            <TextWithLinks
                                navigation={this.props.navigation}
                                numberOfLines={bodyText?.length > 280 ? 9 : 16}
                                style={[styles.bodyText, themeStyles.fontColorMain]}
                                text={bodyText}
                            />
                        </TouchableOpacity>

                        {
                            this.props.post.ImageURLs?.length > 0 &&
                            <ImageGalleryComponent
                                removable={false}
                                onRemove={() => undefined}
                                imageUrls={this.props.post.ImageURLs}
                                goToStats={() => this.goToStats()}
                            />
                        }

                        {
                            this.props.post.VideoURLs?.length > 0 &&
                            <CloutFeedVideoComponent embeddedVideoLink={this.props.post.VideoURLs[0]} />
                        }

                        {
                            !!this.props.post.PostExtraData?.EmbedVideoURL &&
                            <CloutFeedVideoComponent embeddedVideoLink={this.props.post.PostExtraData?.EmbedVideoURL} />
                        }

                        {
                            (this.props.post.RepostedPostEntryResponse && (this.props.recloutedPostIndex == null || this.props.recloutedPostIndex < 2)) &&
                            <View style={[styles.recloutedPostContainer, themeStyles.recloutBorderColor]}>
                                <TouchableOpacity onPress={() => this.goToRecloutedPost()} activeOpacity={1}>
                                    <PostComponent
                                        isPostScreen={this.props.isPostScreen}
                                        showThread={true}
                                        navigation={this.props.navigation}
                                        route={this.props.route}
                                        post={this.props.post.RepostedPostEntryResponse}
                                        hideBottomBorder={true}
                                        recloutedPostIndex={this.props.recloutedPostIndex == null ? 1 : this.props.recloutedPostIndex + 1}
                                    />
                                </TouchableOpacity>
                            </View>
                        }
                        {
                            !this.props.isDraftPost && (this.props.post.Body || this.props.post.ImageURLs?.length > 0) ?
                                <PostActionsRow
                                    toggleHeartIcon={() => this.toggleHeartIcon()}
                                    navigation={this.props.navigation}
                                    post={this.props.post}
                                    actionsDisabled={this.props.actionsDisabled} />
                                : undefined
                        }
                        {
                            this.props.post?.IsNFT &&
                            (
                                !globals.areNFTsHidden &&
                                globals.hiddenNFTType !== HiddenNFTType.Posts
                            ) &&
                            <TouchableOpacity
                                onPress={this.goToNFT}
                                activeOpacity={1}
                                style={[styles.nftButton, themeStyles.verificationBadgeBackgroundColor]}>
                                <Text style={styles.nftText}>Check NFT</Text>
                            </TouchableOpacity>
                        }
                    </View >
                </View>

                {
                    this.state.isHeartShowed &&
                    <Animated.View style={[styles.floatingHeart, { transform: [{ scale: this._scale }] }]} >
                        <Ionicons
                            name={'ios-heart-sharp'}
                            size={75}
                            color={'#eb1b0c'}
                        />
                    </Animated.View>
                }
            </View>
        );
    }
}

const styles = StyleSheet.create(
    {
        containerVerticalPaddings: {
            paddingTop: 24,
            paddingBottom: 10
        },
        parentPostContainer: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center'
        },
        parentPostSubContainer: {
            flex: 1,
            paddingLeft: 10
        },
        isParentPostContainer: {
            flex: 11
        },
        parentConnector: {
            borderRightWidth: 2,
            borderStyle: 'solid',
            width: '55%',
            height: '100%'
        },
        contentContainer: {
            flex: 1,
            width: '100%'
        },

        headerContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingHorizontal: 10
        },
        headerRightContainer: {
            flexDirection: 'row',
            marginLeft: 'auto'
        },
        bodyText: {
            fontSize: 15,
            paddingHorizontal: 10,
            marginBottom: 10
        },
        actionButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 10,
            marginTop: 2,
        },
        actionText: {
            marginLeft: 4,
            color: '#a1a1a1',
            fontSize: 12
        },
        coinPriceContainer: {
            borderRadius: 12,
            paddingHorizontal: 10,
            marginBottom: 6,
            justifyContent: 'center',
            height: 20,
            marginRight: 12
        },
        coinPriceText: {
            fontSize: 10,
            fontWeight: '600'
        },
        recloutedPostContainer: {
            marginHorizontal: 10,
            borderWidth: 1,
            padding: 10,
            paddingBottom: 4,
            borderRadius: 8,
            marginTop: 10
        },
        floatingHeart: {
            position: 'absolute',
            top: 0,
            right: 0,
            left: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center'
        },
        pinIcon: {
            marginRight: 6
        },
        nftButton: {
            padding: 10,
            margin: 15,
            borderRadius: 4,
        },
        nftText: {
            fontWeight: '600',
            color: 'white',
            textAlign: 'center'
        }
    }
);
