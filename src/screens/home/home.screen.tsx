import React from 'react';
import { Platform, View } from 'react-native';
import { api, notificationsService } from '@services';
import { themeStyles } from '@styles';
import { constants, eventManager, globals } from '@globals';
import { EventType, HomeScreenTab, NavigationEvent, Post } from '@types';
import { TabConfig, TabsComponent } from '@components/tabs.component';
import { ParamListBase, RouteProp } from '@react-navigation/native';
import { PostListComponent } from './components/postList.component';
import * as SecureStore from 'expo-secure-store';
import { CloutCastFeedComponent } from './components/cloutCastFeed.component';
import { HotFeedComponent } from './components/hotFeed.component';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import { WelcomeFeedComponent } from './components/welcomeFeed.component';
import { LanguageFeedComponent } from './components/languageFeed.component';

type RouteParams = {
    Home: {
        newPost: Post;
        deletedPost: Post;
        blockedUser: string;
    }
};

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    route: RouteProp<RouteParams, 'Home'>;
}

interface State {
    selectedTab: HomeScreenTab;
    tabs: TabConfig[];
    api: (publicKey: string, count: number, lastPostHashHex: string) => Promise<any>;
}

export class HomeScreen extends React.Component<Props, State> {

    private _postListComponent = React.createRef<PostListComponent>();

    private _cloutCastFeedComponent = React.createRef<CloutCastFeedComponent>();

    private _welcomeFeedComponent = React.createRef<WelcomeFeedComponent>();

    private _languageFeedComponent = React.createRef<LanguageFeedComponent>();

    private _hotFeedComponent = React.createRef<HotFeedComponent>();

    private _lastLinkingListenerData: Date | undefined;

    private _unsubscribeNavigationEvent: () => void = () => undefined;

    private _unsubscribeCloutCastEvent: () => void = () => undefined;

    private _unsubscribeLinkingListener: (event: any) => void = () => undefined;

    constructor(props: Props) {

        super(props);
        this.state = {
            selectedTab: HomeScreenTab.Global,
            tabs: [],
            api: api.getGlobalPosts,
        };

        this.init();
        notificationsService.registerNotificationHandler();
        this.subscribeNavigationEvent();
        this.subscribeToggleCloutCastEvent();

        this.onTabClick = this.onTabClick.bind(this);

        if (Platform.OS === 'android') {
            this._unsubscribeLinkingListener = this.onLinkingUrl.bind(this);
            Linking.addEventListener('url', this._unsubscribeLinkingListener);
            this.checkInitialRoute();
        }
    }

    componentWillUnmount(): void {
        notificationsService.unregisterNotificationHandler();
        this._unsubscribeNavigationEvent();
        this._unsubscribeCloutCastEvent();

        if (Platform.OS === 'android') {
            Linking.removeEventListener('url', this._unsubscribeLinkingListener);
        }
    }

    private async init(): Promise<void> {
        const key = globals.user.publicKey + constants.localStorage_defaultFeed;
        const defaultFeed = await SecureStore.getItemAsync(key).catch(() => undefined);

        const selectedTab = defaultFeed ? defaultFeed as HomeScreenTab : HomeScreenTab.Global;
        this.setState({ selectedTab });
        this.configureTabs();
    }

    private async checkInitialRoute() {
        if (globals.checkedInitialRoute) {
            return;
        }

        globals.checkedInitialRoute = true;
        try {
            const initialRoute = await Linking.getInitialURL();

            if (initialRoute) {
                this.handleDeepLink(initialRoute);
            }
        } catch {
        }
    }

    private onLinkingUrl(event: any) {
        if (!this._lastLinkingListenerData || new Date().getTime() - this._lastLinkingListenerData.getTime() > 1000) {
            this._lastLinkingListenerData = new Date();

            try {
                const data = Linking.parse(event.url);

                if (data.path) {
                    this.handleDeepLink(data.path);
                }
            } catch {
            }
        }
    }

    private handleDeepLink(url: string) {
        let params;
        let key;
        let screenName = '';
        const targetQuery = url.split('/');
        const lastSegment = targetQuery[targetQuery.length - 1].split('?')[0];

        if (url.includes('posts/') || url.includes('nft/')) {
            screenName = 'Post';
            params = { postHashHex: lastSegment };
            key = 'Post_' + lastSegment;
        } else if (url.includes('u/')) {
            screenName = 'UserProfile';
            params = { username: lastSegment };
            key = 'Profile_' + lastSegment;
        }

        if (params && key) {
            this.props.navigation.navigate('HomeStack', { screen: 'Home' });
            this.props.navigation.push(
                screenName,
                params
            );
        }
    }

    private async configureTabs(): Promise<void> {
        const newTabs: TabConfig[] = [
            {
                name: HomeScreenTab.Hot
            },
            {
                name: HomeScreenTab.Global
            },
            {
                name: HomeScreenTab.Following
            },
            {
                name: HomeScreenTab.Recent
            },
            {
                name: HomeScreenTab.Welcome
            },
            {
                name: HomeScreenTab.Language
            }
        ];

        if (!globals.readonly) {
            const key = globals.user.publicKey + constants.localStorage_cloutCastFeedEnabled;
            const cloutCastFeedEnabled = await SecureStore.getItemAsync(key).catch(() => undefined);
            const addCloutCastFeed = cloutCastFeedEnabled === 'true';

            if (addCloutCastFeed) {
                newTabs.push(
                    {
                        name: HomeScreenTab.Cast
                    }
                );
            }
        }

        this.setState({ tabs: newTabs });
    }

    subscribeNavigationEvent(): void {
        this._unsubscribeNavigationEvent = eventManager.addEventListener(
            EventType.Navigation,
            (p_event: NavigationEvent) => {
                let params;
                let key;
                const publicKey = p_event.publicKey as string;
                switch (p_event.screen) {
                    case 'UserProfile':
                        params = {
                            publicKey: p_event.publicKey,
                            username: p_event.username
                        };
                        key = 'Profile_' + publicKey;
                        break;
                    case 'Post':
                        params = {
                            postHashHex: p_event.postHashHex,
                            priorityComment: p_event.priorityCommentHashHex
                        };
                        key = 'Post_' + publicKey;
                        break;
                }

                if (params && key) {
                    this.props.navigation.navigate('HomeStack', { screen: 'Home' });
                    this.props.navigation.push(
                        p_event.screen,
                        params
                    );
                }
            }
        );
    }

    private subscribeToggleCloutCastEvent(): void {
        this._unsubscribeCloutCastEvent = eventManager.addEventListener(
            EventType.ToggleCloutCastFeed,
            () => {
                this.init();
            }
        );
    }

    private onTabClick(p_tabName: string): void {
        let apiCallback: (publicKey: string, count: number, lastPostHashHex: string) => Promise<any>;
        if (p_tabName === HomeScreenTab.Global) {
            apiCallback = api.getGlobalPosts;
        } else if (p_tabName === HomeScreenTab.Following) {
            apiCallback = api.getFollowingPosts;
        } else {
            apiCallback = api.getRecentPosts;
        }
        this.setState({ api: apiCallback, selectedTab: p_tabName as HomeScreenTab });

        if (p_tabName === HomeScreenTab.Cast) {
            this._cloutCastFeedComponent?.current?.loadData();
        } else if (p_tabName === HomeScreenTab.Hot) {
            this._hotFeedComponent?.current?.refresh();
        } else if (p_tabName === HomeScreenTab.Welcome) {
            this._welcomeFeedComponent?.current?.refresh();
        } else if (p_tabName === HomeScreenTab.Language) {
            this._languageFeedComponent?.current?.refresh();
        } else {
            this._postListComponent?.current?.refresh();
        }
    }

    render(): JSX.Element {
        const renderTab = () => {
            switch (this.state.selectedTab) {
                case HomeScreenTab.Hot:
                    return <HotFeedComponent
                        route={this.props.route}
                        ref={this._hotFeedComponent}
                        navigation={this.props.navigation}
                    />;

                case HomeScreenTab.Global:
                    return <PostListComponent
                        route={this.props.route}
                        ref={this._postListComponent}
                        selectedTab={this.state.selectedTab}
                        navigation={this.props.navigation}
                        api={api.getGlobalPosts} />;

                case HomeScreenTab.Following:
                    return <PostListComponent
                        route={this.props.route}
                        ref={this._postListComponent}
                        selectedTab={this.state.selectedTab}
                        navigation={this.props.navigation}
                        api={api.getFollowingPosts} />;

                case HomeScreenTab.Recent:
                    return <PostListComponent
                        route={this.props.route}
                        ref={this._postListComponent}
                        selectedTab={this.state.selectedTab}
                        navigation={this.props.navigation}
                        api={api.getRecentPosts} />;

                case HomeScreenTab.Welcome:
                    return <WelcomeFeedComponent
                        ref={this._welcomeFeedComponent}
                        route={this.props.route}
                        navigation={this.props.navigation} />;

                case HomeScreenTab.Language:
                    return <LanguageFeedComponent
                        ref={this._languageFeedComponent}
                        route={this.props.route}
                        navigation={this.props.navigation} />;

                case HomeScreenTab.Cast:
                    return <CloutCastFeedComponent
                        ref={this._cloutCastFeedComponent}
                        route={this.props.route}
                        navigation={this.props.navigation}></CloutCastFeedComponent>;
            }
        };

        return (
            <View style={[{ flex: 1 }, themeStyles.containerColorMain]}>
                <View>
                    <TabsComponent
                        tabs={this.state.tabs}
                        selectedTab={this.state.selectedTab}
                        onTabClick={(tab) => this.onTabClick(tab)}
                    />
                </View>
                {
                    renderTab()
                }
            </View>
        );
    }
}
