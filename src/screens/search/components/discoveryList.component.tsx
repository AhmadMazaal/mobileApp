import { themeStyles } from '@styles/globalColors';
import React from 'react';
import { StyleSheet, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { FontAwesome, Octicons, Entypo, AntDesign, MaterialIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { api, cache, cloutFeedApi, getAnonymousProfile } from '@services';
import { CloutTag, DiscoveryType, EventType, HiddenNFTType, Profile, ToggleHideNFTsEvent } from '@types';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { ScrollView } from 'react-native-gesture-handler';
import { ProfileListCardComponent } from '@components/profileListCard.component';
import { cloutApi } from '@services/api/cloutApi';
import CloutTagListCardComponent from './cloutTagCard.component';
import { globals } from '@globals/globals';
import { eventManager } from '@globals/injector';

interface Props {
    navigation: StackNavigationProp<any>;
    route: StackNavigationProp<any>;
}

interface State {
    isLoading: boolean;
    refreshing: boolean;
    featuredProfiles: Profile[];
    trendingCloutTags: CloutTag[];
    hiddenNFTType: HiddenNFTType;
}

export default class DiscoveryListComponent extends React.Component<Props, State> {

    private _followedByUserMap: any;

    private _isMounted = false;

    private _unsubscribeHideNFTsEvent: () => void = () => undefined;

    constructor(props: Props) {
        super(props);

        this.state = {
            isLoading: true,
            refreshing: false,
            featuredProfiles: [],
            trendingCloutTags: [],
            hiddenNFTType: HiddenNFTType.None
        };

        this.init();

        this.init = this.init.bind(this);

        this.subscribeToggleHideNFTOptions();
    }

    componentDidMount() {
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;
        this._unsubscribeHideNFTsEvent();
    }

    shouldComponentUpdate(_prevProps: Props, prevState: State) {
        return prevState.isLoading !== this.state.isLoading ||
            this.state.hiddenNFTType !== prevState.hiddenNFTType;
    }

    private async init() {
        try {

            if (this._isMounted) {
                this.setState({ isLoading: true });
            }

            await Promise.all(
                [
                    this.fetchFeaturedCreators(),
                    this.setFollowedByUserMap(),
                    this.fetchTrendingTags()
                ]
            );
        } catch (e) {
        } finally {
            if (this._isMounted) {
                this.setState({ isLoading: false, refreshing: false });
            }
        }
    }

    private async fetchFeaturedCreators() {
        const publicKeys: string[] = await cloutFeedApi.getDiscoveryType(DiscoveryType.FeaturedCreator);

        if (publicKeys?.length > 0) {
            const requests = publicKeys?.map(publicKey => api.getSingleProfile('', publicKey).catch(() => ({ Profile: getAnonymousProfile(publicKey) })));
            const response = await Promise.all(requests);
            const featuredProfiles: Profile[] = response.map(response => response.Profile);

            if (this._isMounted) {
                this.setState({ featuredProfiles });
            }
        }
    }

    private async setFollowedByUserMap() {
        const user = await cache.user.getData();

        const followedByUserMap: any = {};

        const followedByUserPublicKeys = user.PublicKeysBase58CheckFollowedByUser;

        if (followedByUserPublicKeys?.length > 0) {
            for (let i = 0; i < followedByUserPublicKeys.length; i++) {
                followedByUserMap[followedByUserPublicKeys[i]] = true;
            }
        }

        this._followedByUserMap = followedByUserMap;
    }

    private async fetchTrendingTags() {
        const trendingCloutTags = await cloutApi.getTrendingClouts(3);
        if (this._isMounted) {
            this.setState({ trendingCloutTags });
        }
    }

    private subscribeToggleHideNFTOptions(): void {
        this._unsubscribeHideNFTsEvent = eventManager.addEventListener(
            EventType.ToggleHideNFTs,
            (event: ToggleHideNFTsEvent) => {
                if (this._isMounted) {
                    this.setState({ hiddenNFTType: event.type });
                }
            }
        );
    }

    private renderListItem(icon: any, text: string, discoveryType: DiscoveryType, screen = 'DiscoveryTypeCreator', newElement = false) {
        return <TouchableOpacity
            onPress={() => this.props.navigation.push(screen, { discoveryType })}
            activeOpacity={0.7}>
            <View style={[styles.listItemContainer, themeStyles.lightBorderColor]}>
                {icon}
                <Text style={[styles.listItemText, themeStyles.fontColorMain]}>{text}</Text>
                {newElement && <MaterialIcons name="new-releases" size={18} color={'#FFA500'} />}
            </View>
        </TouchableOpacity>;
    }

    render() {

        if (this.state.isLoading) {
            return <CloutFeedLoader />;
        }

        return <ScrollView
            style={[styles.container, themeStyles.containerColorMain]}
            refreshControl={
                <RefreshControl
                    refreshing={this.state.refreshing}
                    onRefresh={this.init}
                    tintColor={themeStyles.fontColorMain.color}
                    titleColor={themeStyles.fontColorMain.color}
                />
            }>

            {
                globals.areNFTsHidden && globals.hiddenNFTType === HiddenNFTType.Posts ?
                    <></> :
                    this.renderListItem(<AntDesign name="picture" size={24} color={themeStyles.fontColorMain.color} />, 'NFT Gallery', DiscoveryType.FeaturedNFT, 'DiscoveryTypePost', true)
            }
            {this.renderListItem(<Octicons name="project" size={24} color={themeStyles.fontColorMain.color} />, 'Community Projects', DiscoveryType.CommunityProject)}
            {this.renderListItem(<FontAwesome name="line-chart" size={21} color={themeStyles.fontColorMain.color} />, 'Value Creators', DiscoveryType.ValueCreator)}
            {this.renderListItem(<Entypo name="code" size={24} color={themeStyles.fontColorMain.color} />, 'Developers', DiscoveryType.Developer)}

            <Text style={[styles.featuredCreatorsText, themeStyles.fontColorSub]}>Featured Creators</Text>

            {
                this.state.featuredProfiles.map(
                    profile => <ProfileListCardComponent
                        key={profile.PublicKeyBase58Check}
                        profile={profile}
                        isFollowing={!!this._followedByUserMap[profile.PublicKeyBase58Check]}
                    />
                )
            }

            <Text style={[styles.featuredCreatorsText, themeStyles.fontColorSub]}>Trending CloutTags</Text>

            {
                this.state.trendingCloutTags.map(
                    cloutTag => <CloutTagListCardComponent
                        key={cloutTag.clouttag}
                        cloutTag={cloutTag}
                        navigation={this.props.navigation}
                    />
                )
            }

        </ScrollView>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            flex: 1,
        },
        listItemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 10,

            width: '100%',
            borderBottomWidth: 1
        },
        listItemText: {
            fontWeight: '600',
            marginLeft: 10,
            fontSize: 15,
            marginRight: 8
        },
        featuredCreatorsText: {
            marginTop: 12,
            paddingHorizontal: 10,
        }
    }
);
