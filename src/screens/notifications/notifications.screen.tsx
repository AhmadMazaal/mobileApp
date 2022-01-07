import React from 'react';
import { FlatList, Text, View, StyleSheet, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { constants, eventManager, globals } from '@globals';
import { EventType, Notification, NotificationType, Post, Profile } from '@types';
import { api, cache, getAnonymousProfile } from '@services';
import { themeStyles } from '@styles';
import { FollowNotificationComponent } from './components/followNotification.component';
import { BasicTransferNotificationComponent } from './components/basicTransferNotification.component';
import { LikeNotificationComponent } from './components/likeNotification.component';
import { CreatorCoinNotificationComponent } from './components/creatorCoinNotification.component';
import { CreatorCoinTransferNotificationComponent } from './components/creatorCoinTransferNotification.component';
import { PostReplyNotificationComponent } from './components/postReplyNotification.component';
import { PostMentionNotificationComponent } from './components/postMentionNotification.component';
import { PostRecloutNotificationComponent } from './components/postRecloutNotification.component';
import { ParamListBase } from '@react-navigation/native';
import { NotificationsFilter, NotificationsFilterComponent } from './components/notificationsFilter.component';
import { filterNotifications } from './notificaitonFilterHelper';
import * as SecureStore from 'expo-secure-store';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { StackNavigationProp } from '@react-navigation/stack';
import { NftBidNotificationComponent } from './components/nftBidNotification.component';
import { AcceptNftBidNotificationComponent } from './components/acceptNftBidNotification.component';

interface Props {
    standardPublicKey: string;
    nonStandardPublicKey?: string;
    back: () => void;
    selectAccount: (publicKey: string) => void;
    navigation: StackNavigationProp<ParamListBase>;
}

interface State {
    isLoading: boolean;
    notifications: Notification[];
    filteredNotifications: Notification[];
    profiles: { [key: string]: Profile };
    posts: { [key: string]: Post };
    refreshing: boolean;
    isLoadingMore: boolean;
    lastNotificationIndex: number;
    filter: NotificationsFilter | undefined;
    showFilter: boolean;
    filterSet: boolean;
    noMoreNotifications: boolean;
}

export class NotificationsScreen extends React.Component<Props, State> {

    private _flatListRef: React.RefObject<FlatList>;

    private _currentScrollPosition = 0;

    private _lastLoadMoreId = -1;

    private _isMounted = false;

    private _subscriptions: (() => void)[] = [];

    constructor(props: Props) {
        super(props);

        this.state = {
            isLoading: true,
            notifications: [],
            filteredNotifications: [],
            profiles: {},
            posts: {},
            refreshing: false,
            isLoadingMore: false,
            lastNotificationIndex: -999,
            filter: undefined,
            showFilter: false,
            filterSet: false,
            noMoreNotifications: false
        };

        this._subscriptions.push(
            eventManager.addEventListener(EventType.ToggleNotificationsFilter, this.toggleNotificationsFilter.bind(this))
        );

        this._flatListRef = React.createRef();
        this.initScreen();

        this.loadNotifications = this.loadNotifications.bind(this);
        this.loadMoreNotifications = this.loadMoreNotifications.bind(this);
        this.goToProfile = this.goToProfile.bind(this);
        this.goToPost = this.goToPost.bind(this);
        this.getProfile = this.getProfile.bind(this);
        this.renderSubmitPostNotification = this.renderSubmitPostNotification.bind(this);
        this.renderPostMentionNotification = this.renderPostMentionNotification.bind(this);
        this.renderNotification = this.renderNotification.bind(this);
        this.onFilterChanged = this.onFilterChanged.bind(this);
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        for (const unsubscribe of this._subscriptions) {
            unsubscribe();
        }

        this._isMounted = false;
    }

    private async initScreen(): Promise<void> {
        const showFilter = await SecureStore.getItemAsync(constants.localStorage_showNotificationsFilter).catch(() => 'false');
        const filterString = await SecureStore.getItemAsync(constants.localStorage_notificationsFilter).catch(() => undefined);

        let filter;
        if (filterString) {
            try {
                filter = JSON.parse(filterString);
            } catch { undefined; }
        }

        this.setState({ showFilter: showFilter === 'true', filter });
        this.loadNotifications();
    }

    private loadNotifications(showLoading = true): void {
        if (this._isMounted) {
            this.setState(
                {
                    isLoading: showLoading,
                    isLoadingMore: false,
                    noMoreNotifications: false,
                    refreshing: !showLoading
                }
            );
        }

        this._lastLoadMoreId = Math.floor(Math.random() * 1000);

        const filterSet = this.state.filter != null && this.getFilterSet(this.state.filter);

        api.getNotifications(globals.user.publicKey, -1, 50)
            .then(
                response => {
                    const newSeenNotificationIndex = response.Notifications[0].Index;
                    SecureStore.setItemAsync('lastNotificationIndex', String(newSeenNotificationIndex))
                        .then(
                            () => eventManager.dispatchEvent(EventType.RefreshNotifications, -1)
                        )
                        .catch(() => undefined);
                    cache.exchangeRate.getData().then(
                        () => {
                            if (this._isMounted) {
                                this.setState(
                                    {
                                        notifications: response.Notifications ? response.Notifications : [],
                                        profiles: response.ProfilesByPublicKey,
                                        isLoading: false,
                                        refreshing: false,
                                        posts: response.PostsByHash
                                    }
                                );

                                if (filterSet) {
                                    this.onFilterChanged(this.state.filter as NotificationsFilter);
                                }
                            }
                        }
                    );
                }
            ).catch(error => globals.defaultHandleError(error));
    }

    private toggleNotificationsFilter(): void {
        const newState = !this.state.showFilter;
        this.setState({ showFilter: newState });
        SecureStore.setItemAsync(constants.localStorage_showNotificationsFilter, String(newState)).catch(() => { return; });
    }

    private loadMoreNotifications(): void {
        if (this.state.isLoadingMore) {
            return;
        }

        if (this.state.notifications?.length > 0 && !this.state.noMoreNotifications) {
            const newLastNotificationIndex = this.state.notifications[this.state.notifications.length - 1].Index;

            if (newLastNotificationIndex !== 0) {
                if (this.state.filterSet) {
                    this.loadMoreFilteredNotifications(this.state.filter as NotificationsFilter, newLastNotificationIndex, 50);
                } else {

                    if (this._isMounted) {
                        this.setState({ isLoadingMore: true });
                    }

                    api.getNotifications(globals.user.publicKey, newLastNotificationIndex - 1, 50).then(
                        response => {
                            if (this._isMounted) {
                                const allNotifications = this.state.notifications.concat(response.Notifications);
                                this.setState(
                                    (previousValue) => (
                                        {
                                            notifications: allNotifications,
                                            lastNotificationIndex: newLastNotificationIndex,
                                            isLoading: false,
                                            refreshing: false,
                                            profiles: Object.assign(previousValue.profiles, response.ProfilesByPublicKey),
                                            posts: Object.assign(previousValue.posts, response.PostsByHash),
                                            noMoreNotifications: response.Notifications?.length === 0
                                        }
                                    )
                                );
                            }
                        }
                    ).catch(error => globals.defaultHandleError(error)).finally(
                        () => {
                            if (this._isMounted) {
                                this.setState({ isLoadingMore: false });
                            }
                        }
                    );
                }
            }
        }
    }

    private goToProfile(userKey: string, username: string): void {
        if (username !== 'anonymous') {
            try {
                this.props.navigation.navigate('UserProfile', {
                    publicKey: userKey,
                    username: username
                });
            } catch {
                alert('Something went wrong! Please try again.');
            }
        }
    }

    private goToPost(postHashHex: string, priorityComment?: string): void {
        try {
            this.props.navigation.navigate('Post', {
                postHashHex: postHashHex,
                priorityComment: priorityComment,
                showThread: true
            });
        } catch {
            alert('Something went wrong! Please try again.');
        }
    }

    private getProfile(notification: Notification): Profile {
        let profile = this.state.profiles[notification.Metadata.TransactorPublicKeyBase58Check];
        if (!profile) {
            profile = getAnonymousProfile(notification.Metadata.TransactorPublicKeyBase58Check);
        }

        return profile;
    }

    private renderSubmitPostNotification(notification: Notification): JSX.Element | undefined {
        const postHashHex = notification.Metadata.SubmitPostTxindexMetadata?.PostHashBeingModifiedHex as string;
        const profile = this.getProfile(notification);

        const post = this.state.posts[postHashHex];
        if (!post) {
            return undefined;
        }

        if (post?.IsHidden) {
            return <></>;
        }
        if (post.RepostedPostEntryResponse) {
            if (post.RepostedPostEntryResponse.ProfileEntryResponse?.PublicKeyBase58Check === globals.user.publicKey) {
                return <PostRecloutNotificationComponent
                    post={post}
                    notification={notification}
                    goToPost={this.goToPost}
                    navigation={this.props.navigation}
                    profile={profile}
                    postHashHex={postHashHex}
                />;
            } else {
                return this.renderPostMentionNotification(notification, false);
            }
        } else {
            const parentPostHashHex = notification.Metadata.SubmitPostTxindexMetadata?.ParentPostHashHex;
            if (parentPostHashHex) {
                const parentPost = this.state.posts[parentPostHashHex];
                if (parentPost?.IsHidden) {
                    return <></>;
                }
                if (parentPost && parentPost.ProfileEntryResponse.PublicKeyBase58Check === globals.user.publicKey) {
                    return <PostReplyNotificationComponent
                        notification={notification}
                        navigation={this.props.navigation}
                        profile={profile}
                        post={post}
                        goToPost={this.goToPost}
                        postHashHex={postHashHex}
                    />;
                } else {
                    return this.renderPostMentionNotification(notification, true);
                }
            } else {
                return this.renderPostMentionNotification(notification, false);
            }
        }
    }

    private renderPostMentionNotification(notification: Notification, withParentPost: boolean): JSX.Element {
        const profile = this.getProfile(notification);
        let parentPoshHashHex: string;
        let postHashHex: string;
        let post: Post;
        postHashHex = '';

        if (withParentPost) {
            parentPoshHashHex = notification.Metadata.SubmitPostTxindexMetadata?.ParentPostHashHex as string;
            postHashHex = notification.Metadata.SubmitPostTxindexMetadata?.PostHashBeingModifiedHex as string;
            post = this.state.posts[postHashHex];
        } else {
            parentPoshHashHex = notification.Metadata.SubmitPostTxindexMetadata?.PostHashBeingModifiedHex as string;
            post = this.state.posts[parentPoshHashHex];
        }
        return (
            <PostMentionNotificationComponent
                profile={profile}
                post={post}
                navigation={this.props.navigation}
                goToPost={this.goToPost}
                notification={notification}
                postHashHex={postHashHex}
                parentPoshHashHex={parentPoshHashHex}
            />
        );
    }

    private async onFilterChanged(filter: NotificationsFilter) {
        SecureStore.setItemAsync(constants.localStorage_notificationsFilter, JSON.stringify(filter)).catch(() => { return; });
        const filteredNotifications = filterNotifications(this.state.notifications, filter, this.state.posts);
        const filterSet = this.getFilterSet(filter);
        const missingNotificationsCount = 50 - filteredNotifications.length;
        const lastIndex: number = this.state.notifications.length === 0 ? 0 : this.state.notifications[this.state.notifications.length - 1].Index;

        this._lastLoadMoreId = Math.floor(Math.random() * 1000);
        this.setState(
            {
                filteredNotifications: filteredNotifications,
                lastNotificationIndex: lastIndex,
                filter: filter,
                filterSet: filterSet,
                isLoadingMore: false
            }
        );

        if (missingNotificationsCount > 0) {
            await this.loadMoreFilteredNotifications(filter, lastIndex, missingNotificationsCount);
        }
    }

    private getFilterSet(filter: NotificationsFilter) {
        const filterSet = filter != null && Object.keys(filter).some(filterKey => (filter as any)[filterKey]);
        return filterSet;
    }

    private async loadMoreFilteredNotifications(filter: NotificationsFilter, lastIndex: number, count: number) {
        let loadedCount = 0;

        if (this._isMounted) {
            this.setState({ isLoadingMore: true });
        } else {
            return;
        }
        this._lastLoadMoreId = Math.floor(Math.random() * 1000);
        const loadingId = this._lastLoadMoreId;

        let noMoreNotifications = false;

        while (loadedCount < count && lastIndex !== 0 && !noMoreNotifications) {
            const response = await api.getNotifications(globals.user.publicKey, lastIndex - 1, 100);
            if (loadingId !== this._lastLoadMoreId) {
                break;
            }

            noMoreNotifications = response.Notifications?.length === 0;

            const newFilteredNotifications = filterNotifications(response.Notifications, filter, response.PostsByHash);
            loadedCount += newFilteredNotifications.length;

            lastIndex = response.Notifications.length === 0 ? 0 : response.Notifications[response.Notifications.length - 1].Index;

            this.setState(previousValue => (
                {
                    notifications: this.state.notifications.concat(response.Notifications),
                    filteredNotifications: this.state.filteredNotifications.concat(newFilteredNotifications),
                    lastNotificationIndex: response.Notifications,
                    profiles: Object.assign(previousValue.profiles, response.ProfilesByPublicKey),
                    posts: Object.assign(previousValue.posts, response.PostsByHash)
                }
            ));
        }

        if (this._isMounted && loadingId === this._lastLoadMoreId) {
            this.setState({ isLoadingMore: false, isLoading: false, noMoreNotifications });
        }
    }

    private renderNotification(notification: Notification): any {
        if (notification?.Metadata) {
            const profile = this.getProfile(notification);
            switch (notification.Metadata.TxnType) {
                case NotificationType.Follow:
                    return <FollowNotificationComponent
                        navigation={this.props.navigation}
                        profile={profile}
                        goToProfile={this.goToProfile}
                        notification={notification}
                    />;
                case NotificationType.BasicTransfer:
                    if (this.state.posts[notification.Metadata.BasicTransferTxindexMetadata?.PostHashHex as string]?.IsHidden) {
                        return <></>;
                    }
                    return <BasicTransferNotificationComponent
                        navigation={this.props.navigation}
                        notification={notification}
                        goToProfile={this.goToProfile}
                        goToPost={this.goToPost}
                        profile={profile}
                        post={this.state.posts[notification.Metadata.BasicTransferTxindexMetadata?.PostHashHex as string]}
                    />;
                case NotificationType.Like: {
                    const postHashHex = notification.Metadata.LikeTxindexMetadata?.PostHashHex as string;
                    if (this.state.posts[postHashHex]?.IsHidden) {
                        return <></>;
                    }
                    return <LikeNotificationComponent
                        post={this.state.posts[postHashHex]}
                        navigation={this.props.navigation}
                        notification={notification}
                        goToPost={this.goToPost}
                        profile={profile}
                    />;
                }
                case NotificationType.CreatorCoin:
                    return <CreatorCoinNotificationComponent
                        notification={notification}
                        navigation={this.props.navigation}
                        goToProfile={this.goToProfile}
                        profile={profile} />;

                case NotificationType.CreatorCoinTransfer:
                    if (this.state.posts[notification.Metadata.CreatorCoinTransferTxindexMetadata?.PostHashHex as string]?.IsHidden) {
                        return <></>;
                    }
                    return <CreatorCoinTransferNotificationComponent
                        profile={profile}
                        navigation={this.props.navigation}
                        post={this.state.posts[notification.Metadata.CreatorCoinTransferTxindexMetadata?.PostHashHex as string]}
                        notification={notification}
                        goToProfile={this.goToProfile}
                        goToPost={this.goToPost}
                    />;
                case NotificationType.NftBid: {
                    const postHashHex = notification.Metadata.NFTBidTxindexMetadata?.NFTPostHashHex as string;
                    return <NftBidNotificationComponent
                        postHashHex={postHashHex}
                        navigation={this.props.navigation}
                        notification={notification}
                        goToPost={this.goToPost}
                        profile={profile}
                    />;
                }
                case NotificationType.AcceptNftBid: {
                    const postHashHex = notification.Metadata.AcceptNFTBidTxindexMetadata?.NFTPostHashHex as string;
                    return <AcceptNftBidNotificationComponent
                        postHashHex={postHashHex}
                        navigation={this.props.navigation}
                        notification={notification}
                        goToPost={this.goToPost}
                        profile={profile}
                    />;
                }
                case NotificationType.SubmitPost:
                    return this.renderSubmitPostNotification(notification);
                default:
                    return undefined;
            }
        }
        return undefined;
    }

    render(): JSX.Element {

        const keyExtractor = (item: Notification, index: number) => item.Index?.toString() + index.toString();
        const renderFooter = () => this.state.isLoadingMore ? <ActivityIndicator color={themeStyles.fontColorMain.color} /> : <View />;
        const renderRefresh = <RefreshControl
            tintColor={themeStyles.fontColorMain.color}
            titleColor={themeStyles.fontColorMain.color}
            refreshing={this.state.refreshing}
            onRefresh={() => this.loadNotifications(false)} />;

        return this.state.isLoading ?
            <CloutFeedLoader />
            :
            globals.readonly ?
                <View style={[{ alignItems: 'center', justifyContent: 'center' }, styles.listContainer, themeStyles.containerColorSub]}>
                    <Text style={[themeStyles.fontColorMain]}>Notifications are not available in the read-only mode.</Text>
                </View>
                :
                <View style={[styles.listContainer, themeStyles.containerColorMain]}>
                    {
                        this.state.showFilter ?
                            <NotificationsFilterComponent
                                filter={this.state.filter}
                                onFilterChange={this.onFilterChanged}></NotificationsFilterComponent>
                            :
                            undefined
                    }
                    <FlatList
                        ref={this._flatListRef}
                        onMomentumScrollEnd={(event: any) => this._currentScrollPosition = event.nativeEvent.contentOffset.y}
                        data={this.state.filterSet ? this.state.filteredNotifications : this.state.notifications}
                        keyExtractor={keyExtractor}
                        renderItem={({ item }) => this.renderNotification(item)}
                        onEndReached={this.loadMoreNotifications}
                        onEndReachedThreshold={4}
                        maxToRenderPerBatch={20}
                        windowSize={20}
                        refreshControl={renderRefresh}
                        ListFooterComponent={renderFooter}
                    />
                </View>;
    }
}

const styles = StyleSheet.create(
    {
        listContainer: {
            flex: 1,
            width: Dimensions.get('window').width
        },
    }
);
